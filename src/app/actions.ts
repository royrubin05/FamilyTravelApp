"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DESTINATION_IMAGES } from "@/lib/imageUtils";
import path from "path";
import { revalidatePath } from "next/cache";

import { cookies } from "next/headers";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function loginAction(email: string, pass: string) {
  if (email === "roy.rubin@gmail.com" && pass === "123123") {
    (await cookies()).set("auth_session", "valid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });
    return { success: true };
  }
  return { success: false, error: "Invalid credentials" };
}

export async function parseTripDocument(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");

    // 1. Upload to GCS
    const { uploadToGCS } = await import("@/lib/gcs");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use a clean filename
    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const gcsPath = `documents/${uniqueFileName}`;

    console.log("[Server] Uploading to GCS:", gcsPath);
    const publicUrl = await uploadToGCS(buffer, gcsPath, file.type);

    // 2. Local Parsing with Gemini (Debug Mode)
    const { parseTripWithGemini } = await import("@/lib/GeminiDebug");
    console.log("[Server] Processing locally with Gemini...");

    // We can still trigger n8n in parallel if needed, but for now we follow the user request to "isolate as a new module".
    const geminiResult = await parseTripWithGemini(buffer, file.type);

    if (!geminiResult.success || !geminiResult.tripData) {
      throw new Error(geminiResult.error || "Gemini parsing failed");
    }

    const { tripData, debugPrompt, debugResponse } = geminiResult;
    console.log("[DEBUG] Gemini Raw Response:", JSON.stringify(tripData, null, 2));

    // [Smart Inference] If top-level fields are missing, try to infer from flights/hotels
    if (!tripData.destination && tripData.flights && tripData.flights.length > 0) {
      // Use the arrival of the first flight, or simple logic. 
      // Better: Use the arrival of the LAST flight in the first requested segment? 
      // Simplest: First flight arrival.
      const firstFlight = tripData.flights[0];
      // Clean up airport code if needed (e.g. "LAX")
      tripData.destination = firstFlight.arrival.split("(")[1]?.replace(")", "") || firstFlight.arrival;
    }

    if (!tripData.dates && tripData.flights && tripData.flights.length > 0) {
      // Use the departure of the first flight
      tripData.dates = tripData.flights[0].departure;
    }

    // VALIDATION: Ensure critical fields exist
    if (!tripData.destination || typeof tripData.destination !== 'string') {
      throw new Error("Parsing Error: Could not extract a valid 'Destination' from the document (and could not infer from flights).");
    }
    if (!tripData.dates || typeof tripData.dates !== 'string') {
      throw new Error("Parsing Error: Could not extract valid 'Dates' from the document.");
    }

    // 3. Save to Firestore
    const { saveTrip } = await import("@/app/trip-actions");

    // Construct trip object
    // Ensure we have an ID
    const tripId = `${tripData.destination.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${new Date().getFullYear()}`;

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

    return {
      success: true,
      tripId: newTrip.id,
      debugPrompt,
      debugResponse
    };

  } catch (error) {
    console.error("Error in parseTripDocument:", error);
    return { error: `Processing Failed: ${(error as Error).message}` };
  }
}
