
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Init Firebase
if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: 'travelapp05'
    });
}
const db = getFirestore(admin.app(), 'travelapp05'); // Use specific DB ID if needed, or default

// Init Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function normalizeTravelers(scrapedTravelers: any[], familyMembers: any[]): Promise<any[]> {
    try {
        const familyNames = familyMembers.map((m: any) => m.name);

        const prompt = `
        I have a list of Scraped Travelers from a document:
        ${JSON.stringify(scrapedTravelers)}

        I have a list of Official Family Members:
        ${JSON.stringify(familyNames)}

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

        return Array.isArray(normalized) ? normalized : scrapedTravelers;

    } catch (e) {
        console.error("Traveler validation failed", e);
        return scrapedTravelers;
    }
}

async function run() {
    console.log("Starting Manual Normalization...");

    // 1. Get Settings
    const settingsDoc = await db.collection("settings").doc("global").get();
    const settings = settingsDoc.data() || {};

    if (!settings.familyMembers || settings.familyMembers.length === 0) {
        console.error("No family members found in settings.");
        return;
    }

    console.log("Family Members:", settings.familyMembers.map((m: any) => m.name).join(", "));

    // 2. Get Trips
    const tripsSnap = await db.collection("trips").get();
    const trips = tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Found ${trips.length} trips.`);

    let updateCount = 0;

    for (const trip of trips) {
        const t = trip as any;
        if (t.travelers && t.travelers.length > 0) {

            const oldJson = JSON.stringify(t.travelers);
            console.log(`Checking trip ${t.destination} (${t.id})...`);

            const normalized = await normalizeTravelers(t.travelers, settings.familyMembers);
            const newJson = JSON.stringify(normalized);

            if (oldJson !== newJson) {
                console.log(`   -> Updating: ${oldJson} => ${newJson}`);
                await db.collection("trips").doc(t.id).update({ travelers: normalized });
                updateCount++;
            } else {
                console.log("   -> No change.");
            }
        }
    }

    console.log(`Done. Updated ${updateCount} trips.`);
}

run().catch(console.error);
