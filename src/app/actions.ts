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

    // 3. Save to Firestore
    const { saveTrip } = await import("@/app/trip-actions");

    // Construct trip object
    // Ensure we have an ID
    const tripId = tripData.destination
      ? `${tripData.destination.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${new Date().getFullYear()}`
      : `trip-${Date.now()}`;

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
