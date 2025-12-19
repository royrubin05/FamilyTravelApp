"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { DESTINATION_IMAGES } from "@/lib/imageUtils";
import fs from "fs";
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

    // Convert File to Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // SAVE FILE FIRST to ensure we have the path for the AI
    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFileName = `${Date.now()}-${fileName}`;
    const publicDocPath = path.join(process.cwd(), 'public', 'documents', uniqueFileName);
    const webPath = `/documents/${uniqueFileName}`;

    // Ensure directory exists
    const publicDirPath = path.dirname(publicDocPath);
    if (!fs.existsSync(publicDirPath)) {
      fs.mkdirSync(publicDirPath, { recursive: true });
    }
    fs.writeFileSync(publicDocPath, buffer);

    // First pass: Extract raw text
    const extractionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const extractionPrompt = `
      Extract all readable text content from this document. Do not summarize or interpret, just provide the raw text.
    `;
    const extractionResult = await extractionModel.generateContent([
      extractionPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || "application/octet-stream"
        }
      }
    ]);
    const extractionResponse = await extractionResult.response;
    const text = extractionResponse.text();

    console.log("[Server] Gemini Raw Text Extraction Length:", text.length);

    // Load existing trips
    const tripsPath = path.join(process.cwd(), "src/data/trips.json");
    let existingTrips = [];
    if (fs.existsSync(tripsPath)) {
      existingTrips = JSON.parse(fs.readFileSync(tripsPath, "utf-8"));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const prompt = `
    You are an expert Travel Assistant for the "Rubin" family (Roy, Adi, Ori, Jonathan).
    Your task is to update the master list of trips based on a new travel document.

    **Current Trips Database**:
    ${JSON.stringify(existingTrips, null, 2)}

    **New Document Content**:
    "${text}"

    **New Document Metadata**:
    - Filename: "${file.name}"
    - Storage Path: "${webPath}"

      **Instructions**:
    0.  **CRITICAL**: Return **ONLY VALID JSON**. No Markdown, no comments.
      1.  Analyze the **New Document** to identify flights, hotels, or activities.
    2. **Check** the **Current Trips** to see if this belongs to an existing trip (same Destination and roughly same Dates).
        - If YES: **Merge** the new details into that trip.
            - Add new travelers (only if named in text).
            - Add new flights/hotels (Deduplicate).
            - **SOURCE DOCUMENTS**: APPEND the new document to the "sourceDocuments" list. Do NOT overwrite. Keep existing.
    -   If NO: **Create** a new trip entry.
            - **SOURCE DOCUMENTS**: Initialize "sourceDocuments" list with this new document.
    3. **Deduplicate Travelers**: 'dad'(Roy), 'mom'(Adi), 'ori', 'jonathan'.
    4. **Formatting Rules**:
       - **DATES**: Use "YYYY-MM-DD" for startDateISO.
       - **QUOTES**: Do NOT use double quotes " inside strings. Use single quotes ' instead.
      - **NO COMMENTS**.
    6. **Assign Travelers to Items**.

    **Trip Schema**:
    {
      "id": "slug-id",
        "destination": "CITY, COUNTRY",
          "matched_city_key": "lowercase_city_key_for_images",
            "dates": "Start - End Date Year",
              "startDateISO": "YYYY-MM-DD",
                "image_keyword": "Search term",
                  "travelers": [{ "id": "dad", "name": "Roy", "role": "Traveler" }],
                    "flights": [],
                      "hotels": [],
                        "activities": [],
                          "sourceDocuments": [
                            { "url": "${webPath}", "name": "${file.name}" }
                          ]
    }
    `;

    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const responseText = response.text();
    console.log("[Server] Gemini Merge Response Length:", responseText.length);

    // DEBUG: Write to file
    const debugPath = path.join(process.cwd(), "public", "debug_ai_response.txt");
    fs.writeFileSync(debugPath, responseText);

    // Cleaner JSON extraction
    let cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Find the array bounds
    let startIndex = cleanText.search(/\[\s*\{/);
    if (startIndex === -1) {
      startIndex = cleanText.indexOf("[");
    }

    const endIndex = cleanText.lastIndexOf("]");

    if (startIndex === -1 || endIndex === -1) {
      console.error("[Server] JSON Extraction Failed. No Array found. Raw:", responseText);
      throw new Error("AI did not return a JSON Array");
    }

    let jsonString = cleanText.substring(startIndex, endIndex + 1);

    // Remove comments
    jsonString = jsonString.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove trailing commas
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

    let updatedTrips;
    try {
      updatedTrips = JSON.parse(jsonString);
    } catch (e) {
      console.error("[Server] JSON Parse Error Details:", e);
      console.error("[Server] Invalid JSON String Full:", jsonString);
      throw new Error("AI returned invalid JSON structure");
    }

    // Programmatic Sort
    updatedTrips.sort((a: any, b: any) => {
      const dateA = a.startDateISO || "9999-99-99";
      const dateB = b.startDateISO || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    // Enforce Unique IDs (Slug-Date) wrapper
    updatedTrips = updatedTrips.map((trip: any) => {
      const dest = trip.destination || "unknown";
      const date = trip.startDateISO || "9999-99-99";
      const slug = dest.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const newId = `${slug}-${date}`;
      return { ...trip, id: newId };
    });

    // Persist to Disk (we already saved the file)
    fs.writeFileSync(tripsPath, JSON.stringify(updatedTrips, null, 2));

    revalidatePath("/");
    return { success: true, trips: updatedTrips };

  } catch (error) {
    console.error("Error parsing document:", error);
    return { error: `Failed to process document: ${(error as Error).message}` };
  }
}
