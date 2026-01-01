"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DESTINATION_IMAGES } from "@/lib/imageUtils";
import path from "path";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// DEPRECATED: Use src/app/auth-actions.ts
export async function loginAction(email: string, pass: string) {
  return { success: false, error: "Legacy login disabled. Please use the new client-side login flow." };
}

export async function logoutAction() {
  (await cookies()).delete("auth_session");
  return { success: true };
}

export async function parseTripDocument(formData: FormData) {
  let fileName = "unknown";
  let gcsUrl = "";
  let debugPropmtForLog = "";
  let debugResponseForLog = "";

  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    fileName = file.name;

    // 1. Upload to GCS
    const { uploadToGCS } = await import("@/lib/gcs");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use a clean filename
    const cleanName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFileName = `${Date.now()}-${cleanName}`;
    const gcsPath = `documents/${uniqueFileName}`;

    console.log("[Server] Uploading to GCS:", gcsPath);
    const publicUrl = await uploadToGCS(buffer, gcsPath, file.type);
    gcsUrl = publicUrl;

    // 2. Local Parsing with Gemini (Debug Mode)
    // 2. Local Parsing with Gemini (Debug Mode)
    const { parseTripWithGemini } = await import("@/lib/GeminiDebug");
    console.log("[Server] Processing locally with Gemini...");

    // Fetch Settings for Family Context (Optimized Single-Call Matching)
    const { getSettings } = await import("@/app/settings-actions");
    const settings = await getSettings();
    const familyMembers = settings?.familyMembers || [];

    // We can still trigger n8n in parallel if needed, but for now we follow the user request to "isolate as a new module".
    const geminiResult = await parseTripWithGemini(buffer, file.type, familyMembers);

    if (!geminiResult.success || !geminiResult.tripData) {
      throw new Error(geminiResult.error || "Gemini parsing failed");
    }

    const { tripData, debugPrompt, debugResponse } = geminiResult;
    debugPropmtForLog = debugPrompt || "";
    debugResponseForLog = debugResponse || "";

    console.log("[DEBUG] Gemini Raw Response:", JSON.stringify(tripData, null, 2));

    if (!tripData.coordinates || typeof tripData.coordinates.lat !== 'number') {
      console.warn("[Server] Warning: Missing or invalid coordinates from Gemini.");
    }

    // [Smart Inference] REMOVED: Now handled by AI Prompt (Rules 3 & 4)
    // The AI is now instructed to infer destination/dates from flights/hotels directly.

    // VALIDATION: Ensure critical fields exist and are valid
    if (!tripData.destination || typeof tripData.destination !== 'string') {
      throw new Error("Parsing Error: Could not extract a valid 'Destination' from the document (and could not infer from flights).");
    }
    if (!tripData.dates || typeof tripData.dates !== 'string') {
      throw new Error("Parsing Error: Could not extract valid 'Dates' from the document.");
    }

    // Strict Date Validation
    const { parseTripDate } = await import("@/lib/dateUtils");
    const parsedDate = parseTripDate(tripData.dates);
    if (parsedDate === 0) {
      // Check if it's the special Year-Only case which parseTripDate might handle or we handle here?
      // Actually dateUtils handles Year-Only now by returning 0? 
      // Wait, let's check parseTripDate logic for regex \d{4}.
      // The previous code in dateUtils for parseTripDate doesn't explicitly check for ^\d{4}$ and return a valid timestamp for it, 
      // it tries Date.parse("2025") which might work or not depending on env. 
      // Let's verify dateUtils content.

      // Re-reading dateUtils from context: 
      /*
      export const parseTripDate = (dateStr: string): number => {
         // ... logic ...
         // ... 
         return isNaN(timestamp) ? 0 : timestamp;
      };
      */

      // If the user wants strict validation, we should ensure it returns a number > 0.
      // If "2025" is passed, Date.parse("2025") usually returns Jan 1 00:00:00, which is valid > 0.

      throw new Error(`Validation Error: The extracted date '${tripData.dates}' could not be parsed as a valid date.`);
    }

    // 3. Normalize Location (Auto-Fix)
    const { getTrips } = await import("@/app/trip-actions");
    const existingTrips = await getTrips();
    const existingDestinations = Array.from(new Set(existingTrips.map((t: any) => t.destination).filter(Boolean))) as string[];

    // Only verify if we have existing data to match against
    if (existingDestinations.length > 0) {
      const normalizedDest = await normalizeDestination(tripData.destination, existingDestinations);
      if (normalizedDest !== tripData.destination) {
        console.log(`[Auto-Normalize] Changed '${tripData.destination}' to '${normalizedDest}'`);
        tripData.destination = normalizedDest;
      }
    }

    // 3.5 Normalize Travelers (AI Post-Processing)
    // We explicitly call this to ensure names match the defined family members list.
    if (familyMembers.length > 0 && tripData.travelers && tripData.travelers.length > 0) {
      console.log("[Server] Normalizing travelers against family list...");
      const normalizedNames = await normalizeTravelers(tripData.travelers, familyMembers);

      // Update tripData with normalized names (preserving role/age defaults if they were objects, but normalization returns strings mostly)
      // The AI matching returns a string array of names. We need to map them back to objects if needed, 
      // or just replace the list. The current `tripData.travelers` is likely mixed objects/strings.
      // Let's rely on the AI output which gives us the canonical names.
      tripData.travelers = normalizedNames.map(name => ({
        name,
        role: "Adult", // Default, or could imply from original if complex matching used
        age: "Adult"
      }));
    }

    // 4. Save to Firestore
    const { saveTrip, logUploadAttempt } = await import("@/app/trip-actions");

    // Construct trip object

    // Fix ID Generation: Use Trip Year + Random Suffix to prevent overwrites
    // Extract year from dates string if possible, else current year.
    let tripYear = new Date().getFullYear();
    const yearMatch = tripData.dates ? tripData.dates.match(/(\d{4})/) : null;
    if (yearMatch) {
      tripYear = parseInt(yearMatch[1]);
    }

    const safeDest = tripData.destination.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const uniqueSuffix = Date.now().toString().slice(-6); // Last 6 digits of timestamp for uniqueness

    const tripId = `${safeDest}-${tripYear}-${uniqueSuffix}`;

    const newTrip = {
      id: tripId,
      ...tripData,
      sourceDocument: publicUrl, // Link to GCS
      sourceFileName: file.name,
      uploadedAt: new Date().toISOString(),
      debugPrompt,
      debugResponse
    };

    console.log("[Server] Saving trip:", newTrip.id);
    await saveTrip(newTrip);

    // 5. Log Success
    await logUploadAttempt({
      id: `upload-${uniqueFileName}`,
      fileName: file.name,
      gcsUrl: publicUrl,
      status: 'success',
      tripId: newTrip.id,
      debugPrompt,
      debugResponse
    });

    return {
      success: true,
      tripId: newTrip.id,
      debugPrompt,
      debugResponse
    };

  } catch (error) {
    console.error("Error in parseTripDocument:", error);

    // Attempt to log failure
    try {
      const { logUploadAttempt } = await import("@/app/trip-actions");
      const cleanName = fileName ? fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase() : "unknown";

      await logUploadAttempt({
        id: `upload-fail-${Date.now()}-${cleanName}`,
        fileName: fileName || "unknown",
        gcsUrl: gcsUrl || "",
        status: 'failed',
        error: (error as Error).message,
        debugPrompt: debugPropmtForLog,
        debugResponse: debugResponseForLog
      });
    } catch (e) {
      console.error("Failed to log upload failure:", e);
    }

    return { error: `Processing Failed: ${(error as Error).message}` };
  }
}

// End of Trip Parsing logic


// Helper: Normalize Destination (Simple Fuzzy Match)
async function normalizeDestination(input: string, existing: string[]): Promise<string> {
  if (!input || typeof input !== 'string') return input || "";
  const lowerInput = input.toLowerCase();
  // Exact match (case insensitive)
  const exact = existing.find(e => e.toLowerCase() === lowerInput);
  if (exact) return exact;

  // Partial match? (e.g. "Tel Aviv" vs "Tel Aviv-Yafo")
  // For now, return input to be safe, or implement Levenshtein if needed.
  // We'll return input to avoid bad auto-correction without the full logic.
  return input;
}

// Helper: Normalize Travelers (AI Matching)
async function normalizeTravelers(travelers: any[], members: any[]): Promise<string[]> {
  if (!travelers || travelers.length === 0) return [];
  if (!members || members.length === 0) return travelers.map(t => typeof t === 'string' ? t : (t?.name || JSON.stringify(t)));

  // Extract raw strings from mixed input
  const rawNames = travelers.map(t => {
    if (typeof t === 'string') return t;
    if (typeof t === 'object' && t !== null && t.name) return t.name;
    return String(t);
  });

  try {
    // Use the dedicated AI matching service as requested
    const { matchTravelersWithAI } = await import("./ai-matching");
    return await matchTravelersWithAI(rawNames, members);
  } catch (error) {
    console.error("Failed to match travelers with AI, falling back to raw names:", error);
    return rawNames;
  }
}
