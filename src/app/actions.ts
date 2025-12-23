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

export async function logoutAction() {
  (await cookies()).delete("auth_session");
  return { success: true };
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

    // 3.5 Normalize Travelers (AI Matching)
    const { getSettings } = await import("@/app/settings-actions");
    const settings = await getSettings();
    if (settings.familyMembers && settings.familyMembers.length > 0) {
      console.log("[Server] Normalizing travelers with AI...");

      // Top Level
      if (tripData.travelers && tripData.travelers.length > 0) {
        tripData.travelers = await normalizeTravelers(tripData.travelers, settings.familyMembers);
      }

      // Flights
      if (tripData.flights && tripData.flights.length > 0) {
        for (let i = 0; i < tripData.flights.length; i++) {
          if (tripData.flights[i].travelers?.length > 0) {
            tripData.flights[i].travelers = await normalizeTravelers(tripData.flights[i].travelers, settings.familyMembers);
          }
        }
      }

      // Hotels (if they have travelers)
      if (tripData.hotels && tripData.hotels.length > 0) {
        for (let i = 0; i < tripData.hotels.length; i++) {
          if (tripData.hotels[i].travelers?.length > 0) {
            tripData.hotels[i].travelers = await normalizeTravelers(tripData.hotels[i].travelers, settings.familyMembers);
          }
        }
      }
    }

    // 4. Save to Firestore
    const { saveTrip } = await import("@/app/trip-actions");

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

// Helper: AI Traveler Matching
async function normalizeTravelers(scrapedTravelers: any[], familyMembers: any[]): Promise<any[]> {
  try {
    // Simplify family members for the prompt (name + nicknames)
    const knownMembers = familyMembers.map(m => ({
      name: m.name,
      nicknames: m.nicknames || []
    }));

    const prompt = `
        I have a list of Scraped Travelers from a document:
        ${JSON.stringify(scrapedTravelers)}

        I have a list of Official Family Members (with known nicknames):
        ${JSON.stringify(knownMembers)}

        Task: Filter and Normalize the scraped travelers.
        
        Rules:
        1.  **Strict Filtering**: The output list must ONLY contain names that correspond to an Official Family Member.
        2.  **Match & Rename**: If a scraped name matches a family member (e.g. "Roy R.", "Ori Rubin", "Baby Leo") -> Use the **Official Name** (e.g. "Roy", "Ori", "Leo").
        3.  **Exclude Others**: If a scraped name (e.g. "John Doe", "Unknown Guest") does NOT match any family member -> **OMIT IT** from the output entirely.
        
        Output:
        - Return a JSON Array of objects, preserving the original structure but with the "name" field normalized.
        - If the input was just strings, return strings. 
        - ERROR: If input is objects, return objects with 'name' property updated.
        
        Return JSON Array ONLY.
        `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const normalized = JSON.parse(result.response.text());

    console.log("[AI Matching] Normalized Travelers:", normalized);
    return Array.isArray(normalized) ? normalized : scrapedTravelers;

  } catch (e) {
    console.error("Traveler validation failed", e);
    return scrapedTravelers; // Fallback to original
  }
}

export async function normalizeAllTravelersAction() {
  try {
    const { getTrips, saveTrip } = await import("@/app/trip-actions");
    const { getSettings } = await import("@/app/settings-actions");

    const trips = await getTrips();
    const settings = await getSettings();

    if (!settings.familyMembers || settings.familyMembers.length === 0) {
      return { success: false, error: "No family members configured in settings." };
    }

    let updateCount = 0;
    const updates: string[] = [];

    console.log(`[Admin] Normalizing travelers for ${trips.length} trips...`);

    for (const trip of trips) {
      if (trip.travelers && trip.travelers.length > 0) {
        let tripUpdated = false;

        // 1. Normalize Trip-Level Travelers
        const oldTravelersJson = JSON.stringify(trip.travelers);
        const normalized = await normalizeTravelers(trip.travelers, settings.familyMembers);
        const newTravelersJson = JSON.stringify(normalized);

        if (oldTravelersJson !== newTravelersJson) {
          trip.travelers = normalized;
          tripUpdated = true;
          updates.push(`Updated Top-Level Travelers ${trip.destination} (${trip.id})`);
        }

        // 2. Normalize Flight Travelers
        if (trip.flights && trip.flights.length > 0) {
          for (let i = 0; i < trip.flights.length; i++) {
            const flight = trip.flights[i];
            if (flight.travelers && flight.travelers.length > 0) {
              const oldFlightTravelers = JSON.stringify(flight.travelers);
              const normalizedFlightTravelers = await normalizeTravelers(flight.travelers, settings.familyMembers);

              if (oldFlightTravelers !== JSON.stringify(normalizedFlightTravelers)) {
                trip.flights[i].travelers = normalizedFlightTravelers;
                tripUpdated = true;
                updates.push(`Updated Flight ${flight.flightNumber} Travelers`);
              }
            }
          }
        }

        // 3. Normalize Hotel Travelers
        if (trip.hotels && trip.hotels.length > 0) {
          for (let i = 0; i < trip.hotels.length; i++) {
            const hotel = trip.hotels[i];
            // Hotels usually don't have travelers list in my schema, but if they do:
            if (hotel.travelers && hotel.travelers.length > 0) {
              const oldHotelTravelers = JSON.stringify(hotel.travelers);
              const normalizedHotelTravelers = await normalizeTravelers(hotel.travelers, settings.familyMembers);

              if (oldHotelTravelers !== JSON.stringify(normalizedHotelTravelers)) {
                trip.hotels[i].travelers = normalizedHotelTravelers;
                tripUpdated = true;
                updates.push(`Updated Hotel ${hotel.name} Travelers`);
              }
            }
          }
        }

        if (tripUpdated) {
          console.log(`[Admin] Saving updates for trip: ${trip.id}`);
          await saveTrip(trip);
          updateCount++;
        }
      }
    }

    return {
      success: true,
      report: `Normalized travelers for ${updateCount} trips.\n\nUpdated:\n${updates.join("\n")}`
    };

  } catch (error) {
    console.error("Bulk normalization failed:", error);
    return { success: false, error: (error as Error).message };
  }
}

// Helper for single-string validation
async function normalizeDestination(newDest: string, existingList: string[]): Promise<string> {
  try {
    const prompt = `
        I have a new travel destination: "${newDest}".
        I have a list of EXISTING normalized cities in my database: ${JSON.stringify(existingList)}.
        
        Task:
        1. If the new destination is effectively the same as one of the existing ones (ignoring state codes, case, or "City vs City, Country"), return the EXISTING canonical name.
        2. If it is a new location, return a clean "City" name (remove State/Country).
        3. Example: If DB has "Miami", and input is "Miami, FL", return "Miami".
        
        Return ONLY the string of the canonical city name. No JSON.
        `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error("Auto-normalize failed, keeping original:", e);
    return newDest;
  }
}

export async function normalizeLocationsAction() {
  try {
    const { getTrips } = await import("@/app/trip-actions");
    const { db } = await import("@/lib/firebase");

    const trips = await getTrips();
    if (trips.length === 0) return { success: true, report: "No trips found to normalize." };

    // 1. Identify Unique Locations
    const locations = Array.from(new Set(trips.map((t: any) => t.destination).filter(Boolean)));

    if (locations.length === 0) return { success: true, report: "No locations found." };

    // 2. Ask Gemini to Normalize
    // We map original -> trimmed to track them, but sending trimmed list to Gemini
    const originalToTrimmed: Record<string, string> = {};
    trips.forEach((t: any) => {
      if (t.destination) {
        originalToTrimmed[t.destination] = t.destination.trim();
      }
    });

    // ALSO: Include existing Image Keys from Settings
    const settingsDoc = await db.collection("settings").doc("global").get();
    let currentImages: Record<string, string> = {};
    if (settingsDoc.exists) {
      currentImages = settingsDoc.data()?.cityImages || {};
      Object.keys(currentImages).forEach(k => {
        // Add to our list for Gemini
        originalToTrimmed[k] = k.trim();
      });
    }

    const uniqueTrimmedLocations = Array.from(new Set(Object.values(originalToTrimmed)));

    if (uniqueTrimmedLocations.length === 0) return { success: true, report: "No locations found." };

    const prompt = `
        I have a list of travel destinations strings. I need you to standardize them into simple, canonical City names.

        Goal: Consolidate variations of the same place into a single "City Name".

        Rules:
        1. Strip Administrative Regions: Remove state codes, country names, or region identifiers.
           - Example: "Miami, FL" -> "Miami"
           - Example: "Paris, France" -> "Paris"
           - Example: "London, UK" -> "London"
        2. Merge Variations: Map typos, alternative spellings, or extended names to the most common, simple city name.
           - Example: "Tel Aviv-Yafo" -> "Tel Aviv"
        3. Normalize Formatting: Fix capitalization and trim whitespace.
        4. Deduplicate: If multiple input strings refer to the same physical city, map them all to the same simple output string.

        Input List:
        ${JSON.stringify(uniqueTrimmedLocations)}
        
        Output JSON Format:
        {
            "mappings": {
                "Input String": "Canonical City Name"
            },
            "changes": [
               "Renamed 'Original String' to 'New String'"
            ]
        }
        
        IMPORTANT: Return a mapping for EVERY input string that differs from its canonical form.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
    const result = await model.generateContent(prompt);
    const responseData = JSON.parse(result.response.text());

    const mappings = responseData.mappings || {};
    const changesLog = responseData.changes || [];

    let updateCount = 0;
    const updates: string[] = [];

    // 3. Apply Updates to Firestore
    const batch = db.batch();
    let batchCount = 0;

    for (const trip of trips) {
      const originalDest = (trip as any).destination;
      if (!originalDest) continue;

      const trimmedDest = originalDest.trim();
      const canonicalDest = mappings[trimmedDest];

      // Update if:
      // 1. The canonical name is different from the original (e.g. "Miami, FL" -> "Miami")
      // 2. OR the original had whitespace that we cleaned up ("Miami " -> "Miami")

      let newDest = originalDest;
      let changeReason = "";

      if (canonicalDest && canonicalDest !== originalDest) {
        newDest = canonicalDest;
        changeReason = "AI Normalized";
      } else if (trimmedDest !== originalDest) {
        newDest = trimmedDest;
        changeReason = "Trimmed Whitespace";
      }

      if (newDest !== originalDest) {
        const tripRef = db.collection("trips").doc(trip.id);
        batch.update(tripRef, { destination: newDest });
        updates.push(`Trip ${trip.id}: '${originalDest}' -> '${newDest}' (${changeReason})`);
        updateCount++;
        batchCount++;
      }
    }

    // --- NEW: Normalize Image Keys in Settings ---
    if (settingsDoc.exists) {
      const newImages: Record<string, string> = {};
      let imagesUpdated = false;

      // Rebuild the images map using canonical keys
      for (const [key, url] of Object.entries(currentImages)) {
        // Trim the key
        const trimmedKey = key.trim();
        const canonicalKey = mappings[trimmedKey] || trimmedKey; // Default to self/trimmed if no map

        // If canonical key is different, we are "moving" the image
        if (canonicalKey !== key) {
          updates.push(`Image Key: '${key}' -> '${canonicalKey}'`);
          imagesUpdated = true;
        }

        // Assign to new map. 
        // If conflict (two old keys mapping to one new key), the last one wins. 
        // Ideally we'd prefer the one that isn't generic, but here we just take the URL.
        newImages[canonicalKey] = url as string;
      }

      if (imagesUpdated) {
        const settingsRef = db.collection("settings").doc("global");
        batch.update(settingsRef, { cityImages: newImages });
        updates.push("Updated cityImages settings with normalized keys.");
        batchCount++;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    revalidatePath("/");

    const report = `Normalization Complete.\nUpdated ${updateCount} trips.\n\nAI Reasoning:\n${changesLog.join("\n")}\n\nApplied Updates:\n${updates.join("\n")}`;

    return { success: true, report };

  } catch (error) {
    console.error("Normalization failed:", error);
    return { success: false, error: (error as Error).message };
  }
}

export async function regenerateCityImagesAction() {
  try {
    const { getTrips } = await import("@/app/trip-actions");
    const { db } = await import("@/lib/firebase");

    const trips = await getTrips();
    if (trips.length === 0) return { success: true, report: "No trips found." };

    // 1. Collect Valid Destinations from Trips
    const validDestinations = new Set<string>();
    trips.forEach((t: any) => {
      if (t.destination) validDestinations.add(t.destination.trim());
    });

    if (validDestinations.size === 0) return { success: true, report: "No destinations found." };

    // 2. Fetch Existing Settings to preserve mostly images
    const settingsRef = db.collection("settings").doc("global");
    const settingsDoc = await settingsRef.get();
    const currentImages = settingsDoc.exists ? (settingsDoc.data()?.cityImages || {}) : {};

    // 3. Rebuild the Image Map
    const newImageMap: Record<string, string> = {};
    const destinations = Array.from(validDestinations);

    for (const dest of destinations) {
      // Try strict match
      if (currentImages[dest]) {
        newImageMap[dest] = currentImages[dest];
        continue;
      }

      // Try case-insensitive match
      const lowerDest = dest.toLowerCase();
      const foundKey = Object.keys(currentImages).find(k => k.toLowerCase() === lowerDest);
      if (foundKey) {
        newImageMap[dest] = currentImages[foundKey];
      }
    }

    // 4. Overwrite Settings
    await settingsRef.update({ cityImages: newImageMap });
    revalidatePath("/");

    return {
      success: true,
      report: `Regenerated Image List.\nKept ${Object.keys(newImageMap).length} images for ${destinations.length} active destinations.\nRemoved orphan keys.`
    };

  } catch (error) {
    console.error("Regeneration failed:", error);
    return { success: false, error: (error as Error).message };
  }
}
