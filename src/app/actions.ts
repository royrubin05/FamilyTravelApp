"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DESTINATION_IMAGES } from "@/lib/imageUtils";
import path from "path";
import { revalidatePath } from "next/cache";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseTripDocument(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file uploaded");
    }

    // Convert File to Base64 (for Gemini inline)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // SAVE FILE TO GCS
    const { uploadToGCS } = await import("@/lib/gcs");
    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const gcsPath = `documents/${uniqueFileName}`;

    // Upload returns public URL (https://storage.googleapis.com/...)
    const publicUrl = await uploadToGCS(buffer, gcsPath, file.type);

    // We use the path relative to bucket root for our system sometimes, or just the URL.
    // The previous system used "/documents/..." relative paths.
    // Let's stick to storing the relative GCS path for consistency if our UI expects it,
    // OR switch to storing the full URL.
    // Given our `getStorageUrl` utility handles "/documents/", let's store the relative path "documents/..."
    // BUT `getStorageUrl` expects exactly what we store.
    // If we store `documents/xyz.pdf`, `getStorageUrl` might need adjustment.
    // The previous code stored `/documents/xyz`.
    // Let's store `/documents/${uniqueFileName}` to match the convention the app expects for now (legacy compatible),
    // merging it with our new Cloud reality.

    const webPath = `/documents/${uniqueFileName}`;

    // 1. Fetch Context (Existing Trips + Settings)
    const { getTrips } = await import("./trip-actions");
    const { getSettings } = await import("./settings-actions");

    // Parallel Fetch
    const [existingTrips, settings] = await Promise.all([
      getTrips(),
      getSettings()
    ]);

    const familyMembers = (settings as any).familyMembers || [];
    const validMemberNames = familyMembers.map((m: any) => m.name).join(", ");

    // Simplify existing trips for the prompt (save tokens)
    const tripsSummary = existingTrips.map((t: any) => ({
      id: t.id,
      destination: t.destination,
      dates: t.dates,
      startDateISO: t.startDateISO
    }));

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const prompt = `
    You are an expert Travel Assistant.
    Your task is to analyze a travel document and either **UPDATE** an existing trip or **CREATE** a new one.

    **Context**:
    - **Existing Trips**: ${JSON.stringify(tripsSummary)}
    - **Approved Family Members**: ${validMemberNames}.

    **Document Metadata**:
    - Filename: "${file.name}"
    - Storage Path: "${webPath}"

    **Instructions**:
    1. **Analyze** the document to find Destination, Dates, Flights, Hotels.
    2. **Merge Decision**:
       - Compare with "Existing Trips".
       - If Destination matches AND Dates overlap (approx same week):
         - Use the **Existing Trip ID**.
       - If Dates are significantly different (e.g. diff month): **CREATE NEW TRIP** (New ID).
       - If no match: **CREATE NEW TRIP**.

    3. **Travelers**:
       - **STRICTLY** only include travelers EXPLICITLY named in the document.
       - **NO INFERENCE**: If only "Roy" is named, do NOT add the whole family.
       - **VALIDATION**: Ignore any names not in the Approved Family Members list.
       - Map found names to their correct Family IDs from the validated list.

    4. **Output Format**:
       - Return a **Single JSON Object**.
       - **ID**: Existing ID or New ID ("slug-date").
       - **sourceDocuments**: Include the new document.
    
    **Trip Schema**:
    {
      "id": "slug-date",
      "destination": "CITY, COUNTRY",
      "matched_city_key": "lowercase_city_key",
      "dates": "Start - End Date Year",
      "startDateISO": "YYYY-MM-DD",
      "image_keyword": "Arrival City Name",
      "travelers": [{ "id": "adi", "name": "Adi", "role": "Traveler" }],
      "flights": [],
      "hotels": [],
      "activities": [],
      "sourceDocuments": [ { "url": "${webPath}", "name": "${file.name}" } ]
    }
    `;

    // Single Call with File + Context
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || "application/octet-stream"
        }
      }
    ]);
    const response = await result.response;
    const responseText = response.text();
    console.log("[Server] Gemini Extraction Response:", responseText.length);

    // Cleaner JSON extraction
    let cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Find JSON object bounds
    const startIndex = cleanText.indexOf("{");
    const endIndex = cleanText.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("AI did not return a valid JSON object");
    }

    let jsonString = cleanText.substring(startIndex, endIndex + 1);
    // Remove comments
    jsonString = jsonString.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

    let newTrip;
    try {
      newTrip = JSON.parse(jsonString);
      console.log("Parsed Trip Travelers (Raw):", newTrip.travelers);

      // Strict Enforcement: Only allow approved family members
      if (newTrip.travelers && Array.isArray(newTrip.travelers)) {
        newTrip.travelers = newTrip.travelers.filter((t: any) => {
          const nameLower = t.name?.toLowerCase();
          // Check against validMemberNames (from settings)
          const match = familyMembers.find((m: any) =>
            m.name.toLowerCase() === nameLower ||
            (m.nicknames && m.nicknames.some((n: string) => n.toLowerCase() === nameLower))
          );
          return !!match;
        }).map((t: any) => {
          // Normalized Data
          const match = familyMembers.find((m: any) =>
            m.name.toLowerCase() === t.name.toLowerCase() ||
            (m.nicknames && m.nicknames.some((n: string) => n.toLowerCase() === t.name.toLowerCase()))
          );
          return match ? { id: match.id || match.name.toLowerCase(), name: match.name, role: "Traveler" } : t;
        });
      }
      console.log("Parsed Trip Travelers (Filtered):", newTrip.travelers);

    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("AI returned invalid JSON");
    }

    // Save/Merge via Firestore Action
    const { saveTrip } = await import("./trip-actions");
    const saveResult = await saveTrip(newTrip);

    if (saveResult.success) {
      return { success: true, tripId: saveResult.id };
    } else {
      return { error: saveResult.error || "Failed to save trip" };
    }

  } catch (error) {
    console.error("Error parsing document:", error);
    return { error: `Failed to process document: ${(error as Error).message}` };
  }
}
