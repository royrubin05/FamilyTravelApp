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

    // First pass: Extract raw text from the document using Gemini's multimodal capabilities
    const extractionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const extractionPrompt = `
      Extract all readable text content from this document.Do not summarize or interpret, just provide the raw text.
    `;
    const extractionResult = await extractionModel.generateContent([
      extractionPrompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type || "application/octet-stream" // Use file.type or a generic fallback
        }
      }
    ]);
    const extractionResponse = await extractionResult.response;
    const text = extractionResponse.text();

    console.log("[Server] Gemini Raw Text Extraction Length:", text.length);

    // Load existing trips for context
    const tripsPath = path.join(process.cwd(), "src/data/trips.json");
    let existingTrips = [];
    if (fs.existsSync(tripsPath)) {
      existingTrips = JSON.parse(fs.readFileSync(tripsPath, "utf-8"));
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const prompt = `
    You are an expert Travel Assistant for the "Rubin" family(Roy, Adi, Ori, Jonathan).
    Your task is to update the master list of trips based on a new travel document.

    ** Current Trips Database **:
    ${JSON.stringify(existingTrips, null, 2)}

    ** New Document Content **:
    "${text}"

      ** Instructions **:
    0.  **CRITICAL**: Return **ONLY VALID JSON**. No Markdown (no code blocks), no comments (//), no conversational text.
      1.  Analyze the ** New Document ** to identify flights, hotels, or activities.
    2. ** Check ** the ** Current Trips ** to see if this belongs to an existing trip(same Destination and roughly same Dates).
        - If YES: ** Merge ** the new details into that trip.
            - Add new travelers. ** CRITICAL **: Only add 'dad', 'mom', 'ori', 'jonathan' IF AND ONLY IF their name appears in the document text.Do NOT assume the whole family is travelling.
            - Add new flights / hotels(Deduplicate: if flight number + date matches, ignore.If different, add it).
    -   If NO: ** Create ** a new trip entry.
    3. ** Deduplicate Travelers **: A trip should list each person only once.
        - 'dad'(Roy, Roee)
      - 'mom'(Adi)
      - 'ori'(Ori)
      - 'jonathan'(Jonathan, Yoni)
      - Ignore anyone else.
    4. ** Formatting Rules **:
       - ** DATES **: Use "YYYY-MM-DD" for startDateISO.
       - ** QUOTES **: Do NOT use double quotes " inside strings. Use single quotes ' instead. (e.g. "evidence": "Found 'Roy' on page 1")
      - ** NO COMMENTS **: Do not add // or /* */ comments.
    6. ** Assign Travelers to Items **: For each flight, hotel, or activity, explicit list WHICH travelers are participating.
       - Example: If a flight is only for Roy, add "travelers": ["Roy"].
       - If for everyone, list["Roy", "Adi", ...].

    ** Trip Schema **:
    {
      "id": "slug-id",
        "destination": "CITY, COUNTRY",
          "matched_city_key": "lowercase_city_key_for_images",
            "dates": "Start - End Date Year",
              "startDateISO": "YYYY-MM-DD (Start date for sorting)",
                "image_keyword": "Search term for image",
                  "travelers": [{ "id": "dad", "name": "Roy", "role": "Traveler", "evidence": "Found 'Roy' in flight confirmation" }],
                    "flights": [{
                      "airline": "...",
                      "flightNumber": "...",
                      "departure": "...",
                      "arrival": "...",
                      "confirmation": "...",
                      "travelers": ["Name 1", "Name 2"]
                    }],
                      "hotels": [],
                        "activities": [],
                          "sourceDocument": "Path to last uploaded doc",
                            "sourceFileName": "Name of last uploaded doc"
    }
    `;

    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const responseText = response.text();
    console.log("[Server] Gemini Merge Response Length:", responseText.length);

    // DEBUG: Write to file to inspect invalid JSON
    const debugPath = path.join(process.cwd(), "public", "debug_ai_response.txt");
    fs.writeFileSync(debugPath, responseText);

    // Cleaner JSON extraction: specific fix for trailing commas which is a common AI error
    let cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    // Find the array bounds
    // Robust Logic: Look for `[` followed by `{` (Array of Objects) to avoid picking up text like "I found [Roy]..."
    let startIndex = cleanText.search(/\[\s*\{/);
    if (startIndex === -1) {
      // Fallback: Just look for first `[`, maybe it's an empty array `[]`
      startIndex = cleanText.indexOf("[");
    }

    const endIndex = cleanText.lastIndexOf("]");

    if (startIndex === -1 || endIndex === -1) {
      console.error("[Server] JSON Extraction Failed. No Array found. Raw:", responseText);
      throw new Error("AI did not return a JSON Array");
    }

    let jsonString = cleanText.substring(startIndex, endIndex + 1);

    // Remove comments (Only full line comments //... and /*...*/)
    // modification: Only strip // if it's the start of a line to avoid breaking URLs (https://)
    jsonString = jsonString.replace(/^[ \t]*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

    // Remove trailing commas (e.g. "item", ] -> "item" ])
    jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');

    let updatedTrips;
    try {
      updatedTrips = JSON.parse(jsonString);
    } catch (e) {
      console.error("[Server] JSON Parse Error Details:", e);
      // Log the full string to debug (captured in server logs)
      console.error("[Server] Invalid JSON String Full:", jsonString);
      throw new Error("AI returned invalid JSON structure");
    }

    // Programmatic Sort: Ensure chronological order using the new ISO field
    updatedTrips.sort((a: any, b: any) => {
      const dateA = a.startDateISO || "9999-99-99";
      const dateB = b.startDateISO || "9999-99-99";
      return dateA.localeCompare(dateB);
    });

    // Enforce Unique IDs (Slug-Date) e.g. "miami-2026-01-14"
    updatedTrips = updatedTrips.map((trip: any) => {
      // Protect against missing fields
      const dest = trip.destination || "unknown";
      const date = trip.startDateISO || "9999-99-99";

      // Simple Slugify
      const slug = dest.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '') // remove non-word chars
        .replace(/[\s_-]+/g, '-') // replace spaces with dash
        .replace(/^-+|-+$/g, ''); // trim dashes

      // Only overwrite if it looks like a generic/AI ID or we want to enforce structure
      // Actually, let's enforce it for consistency on all parsed trips.
      // But what if it changes existing IDs? 
      // If we are merging, we might want to keep the OLD ID?
      // The logic above says "Check Current Trips... Merge".
      // If we merged, the AI might have kept the old ID or made a new one.
      // Let's rely on the fact that if we change the ID of an existing trip, we effectively "move" it.
      // Ideally we should check if this ID already exists in the "existingTrips" (pre-merge) map?
      // But "updatedTrips" is the new master list.
      // Let's just enforce the format. It's cleaner. 
      // It might break local storage history or bookmarks if ID changes, but user asked for "unique link... based on loc/date".

      const newId = `${slug}-${date}`;
      return { ...trip, id: newId };
    });

    // Save PDF (for the record, though AI might overwrite sourceDocument field, that's okay for now)
    const fileName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const uniqueFileName = `${Date.now()} -${fileName} `;
    const publicDocPath = path.join(process.cwd(), 'public', 'documents', uniqueFileName);

    // Ensure directory exists
    const publicDirPath = path.dirname(publicDocPath);
    if (!fs.existsSync(publicDirPath)) {
      fs.mkdirSync(publicDirPath, { recursive: true });
    }
    fs.writeFileSync(publicDocPath, buffer);

    // Persist to Disk
    fs.writeFileSync(tripsPath, JSON.stringify(updatedTrips, null, 2));

    revalidatePath("/");
    return { success: true, trips: updatedTrips };

  } catch (error) {
    console.error("Error parsing document:", error);
    return { error: `Failed to process document: ${(error as Error).message} ` };
  }
}
