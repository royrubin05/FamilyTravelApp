"use server";

import { db, auth } from "@/lib/firebase";
import { getCurrentUser } from "@/lib/auth-context";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/lib/ai-config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type GenerationResult = {
    success: boolean;
    count?: number;
    error?: string;
    logs?: string[];
    generatedIds?: string[];
};

// 1. Prepare Resources (User, Seed Trip)
export async function prepareGeneratorResources() {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') {
            return { success: false, error: "Unauthorized" };
        }

        // Identify Test Account
        let testUserUid = "";
        try {
            const userRecord = await auth.getUserByEmail("test_family@travelroots.internal");
            testUserUid = userRecord.uid;
        } catch (e) {
            const snap = await db.collection("users").where("username", "==", "test_family").limit(1).get();
            if (!snap.empty) {
                testUserUid = snap.docs[0].id;
            } else {
                return { success: false, error: "Test Family account not found. Run setup script." };
            }
        }

        // Fetch Family Members
        const settingsSnap = await db.collection("users").doc(testUserUid).collection("settings").doc("config").get();
        const familyMembers = settingsSnap.exists ? (settingsSnap.data()?.familyMembers || []) : [];
        const memberNames = familyMembers.length > 0
            ? familyMembers.map((m: any) => m.name).join(", ")
            : "ORI RUBIN, ROY RUBIN, YOYO RUBIN";

        // Fetch Seed Data (Latest AI Trip)
        let seedTripDoc = null;
        const listUsersResult = await auth.listUsers(20);

        for (const u of listUsersResult.users) {
            const tripSnap = await db.collection("users").doc(u.uid).collection("trips")
                .orderBy("uploadedAt", "desc")
                .limit(1)
                .get();

            if (!tripSnap.empty) {
                const data = tripSnap.docs[0].data();
                if (data.destination && data.flights && data.flights.length > 0 && data.status !== 'cancelled') {
                    seedTripDoc = tripSnap.docs[0];
                    break;
                }
            }
        }

        if (!seedTripDoc) {
            return { success: false, error: "No valid seed trip found." };
        }

        const seedJson = JSON.stringify(seedTripDoc.data(), null, 2);

        return {
            success: true,
            data: {
                testUserUid,
                memberNames,
                seedJson
            }
        };

    } catch (error: any) {
        console.error("Prepare Generator Error:", error);
        return { success: false, error: error.message };
    }
}

// 2. Generate and Save a Single Trip
export async function generateAndSaveTrip(
    seedJson: string,
    memberNames: string,
    testUserUid: string,
    month: string,
    year: string,
    index: number
): Promise<{ success: boolean; log: string; tripId?: string }> {
    try {
        // Double check auth
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') return { success: false, log: "Unauthorized" };

        const newTrip = await generateSingleTrip(seedJson, month, year, memberNames);

        if (!newTrip) {
            return { success: false, log: `AI Generation failed for #${index}` };
        }

        // Save to Firestore
        const tripId = `test-gen-${Date.now()}-${index}`;
        await db.collection("users").doc(testUserUid).collection("trips").doc(tripId).set({
            ...newTrip,
            id: tripId,
            status: 'active',
            isTest: true,
            uploadedAt: new Date().toISOString(),
            sourceDocument: "AI Generator",
            debugPrompt: "Generator",
            debugResponse: "Generator"
        });

        return { success: true, log: `Generated: ${newTrip.destination}`, tripId };

    } catch (e: any) {
        console.error("Single Trip Gen Error:", e);
        return { success: false, log: `Error #${index}: ${e.message}` };
    }
}

// Deprecated wrapper (kept for backward compat if needed, but UI uses granular)
export async function generateFakeTrips(quantity: number, month: string, year: string): Promise<GenerationResult> {
    const prep = await prepareGeneratorResources();
    if (!prep.success || !prep.data) return { success: false, error: prep.error };

    const { seedJson, memberNames, testUserUid } = prep.data;
    const logs = [];
    const successIds = [];

    for (let i = 0; i < quantity; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 1000));
        const res = await generateAndSaveTrip(seedJson, memberNames, testUserUid, month, year, i);
        logs.push(res.log);
        if (res.success && res.tripId) {
            successIds.push(res.tripId);
        }
    }

    return { success: true, count: successIds.length, logs, generatedIds: successIds };
}

// 3. Delete All Test Trips
export async function deleteAllTestTrips(): Promise<{ success: boolean; message: string }> {
    try {
        const user = await getCurrentUser();
        if (!user || user.role !== 'admin') return { success: false, message: "Unauthorized" };

        // Identify Test Account
        let testUserUid = "";
        try {
            const userRecord = await auth.getUserByEmail("test_family@travelroots.internal");
            testUserUid = userRecord.uid;
        } catch (e) {
            const snap = await db.collection("users").where("username", "==", "test_family").limit(1).get();
            if (!snap.empty) testUserUid = snap.docs[0].id;
            else return { success: false, message: "Test Family not found" };
        }

        const tripsRef = db.collection('users').doc(testUserUid).collection('trips');
        const tripsSnap = await tripsRef.get();

        if (tripsSnap.empty) return { success: true, message: "No trips to delete." };

        const batch = db.batch();
        tripsSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        return { success: true, message: `Deleted ${tripsSnap.size} trips.` };

    } catch (e: any) {
        console.error("Delete Error:", e);
        return { success: false, message: e.message };
    }
}

// 4. Seed Admin User (Temporary Helper)
export async function seedAdminUser(): Promise<{ success: boolean; message: string }> {
    try {
        // Allow anyone to run this ONCE if admin doesn't exist, or restrict to existing admin
        // Since we are bootstrapping, we might need to relax checks or check for hardcoded "roy" logic first?
        // Actually, let's just use the current user check. If they can access the generator (likely via existing hardcoded login), they can run this.
        const user = await getCurrentUser();
        // Allow "roy.rubin@gmail.com" (hardcoded backdoor) or existing admin
        if (!user || (user.email !== "roy.rubin@gmail.com" && user.role !== 'admin')) {
            return { success: false, message: "Unauthorized: Must be logged in as original admin." };
        }

        const ADMIN_EMAIL = "admin@travelroots.internal";
        const ADMIN_PASS = "password123!";

        let uid = "";

        // 1. Create/Get Auth User
        try {
            const userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
            uid = userRecord.uid;
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                const newUser = await auth.createUser({
                    email: ADMIN_EMAIL,
                    password: ADMIN_PASS,
                    displayName: "Platform Admin"
                });
                uid = newUser.uid;
            } else throw e;
        }

        // 2. Set Claims
        await auth.setCustomUserClaims(uid, { role: 'admin' });

        // 3. Create Firestore Profile
        await db.collection("users").doc(uid).set({
            username: "admin",
            displayName: "Platform Admin",
            email: ADMIN_EMAIL,
            role: "admin",
            createdAt: new Date().toISOString(),
            isSystemAdmin: true
        }, { merge: true });

        return { success: true, message: `Admin Seeded! Email: ${ADMIN_EMAIL}, Pass: ${ADMIN_PASS}` };

    } catch (e: any) {
        console.error("Seed Admin Error:", e);
        return { success: false, message: e.message };
    }
}

// ... (previous code)



// Helper to fully anonymize structure
function anonymizeTripData(data: any): any {
    if (Array.isArray(data)) {
        return data.length > 0 ? [anonymizeTripData(data[0])] : [];
    }
    if (typeof data === 'object' && data !== null) {
        const clean: any = {};
        for (const key in data) {
            // Keep IDs for structural realism but randomize content
            if (key === 'id') clean[key] = "string (UUID)";
            else clean[key] = anonymizeTripData(data[key]);
        }
        return clean;
    }
    if (typeof data === 'string') return "string";
    if (typeof data === 'number') return 0;
    if (typeof data === 'boolean') return true;
    return null;
}

async function generateSingleTrip(seedJson: string, targetMonth: string, targetYear: string, memberNames: string) {
    if (!process.env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

    // BLOCK_NONE for max creativity and to avoid false positives
    const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ];

    const model = genAI.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        safetySettings,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 1.0 // High temp for max randomness
        }
    });

    const randomSeed = Math.random().toString(36).substring(7);

    // 1. NEUTRALIZE BIAS: Convert specific seed values into generic type descriptions
    // This removes "Kyoto", "United Airlines", etc. entirely from the prompt context.
    const rawSeed = JSON.parse(seedJson);
    const schemaTemplate = anonymizeTripData(rawSeed);

    // Explicitly set key fields to type descriptions to guide the AI
    schemaTemplate.destination = "string (City, Country)";
    schemaTemplate.dates = "string (MMM DD, YYYY - MMM DD, YYYY)";
    schemaTemplate.trip_title_dashboard = "string (Trip to [City])";

    const schemaString = JSON.stringify(schemaTemplate, null, 2);

    // 2. FORCED DIVERSITY: Programmatically pick a target region
    const regions = ["Europe", "South America", "North America", "Asia", "Africa", "Oceania"];
    const targetRegion = regions[Math.floor(Math.random() * regions.length)];

    console.log(`[${randomSeed}] Generating trip using Neutral Schema Template (Structure Only)...`);
    console.log(`[${randomSeed}] Forced Target Region: ${targetRegion}`);

    const prompt = `
    Request ID: ${randomSeed}
    
    You are an expert travel agent. Your goal is to generate a completely random trip for a user.
    
    INSTRUCTIONS - FOLLOW THIS PROCESS STEP-BY-STEP:
    1.  **CONSTRAINT**: You have been assigned the region: **${targetRegion}**.
    2.  **BRAINSTORM**: Thinking to yourself, list 3 totally different potential destinations specifically in **${targetRegion}** (e.g., if Europe: Paris, Rome, Berlin).
    3.  **SELECT**: Pick one of your brainstormed destinations at random. This is your TARGET DESTINATION.
    4.  **GENERATE:** Create a JSON object representing a trip to your TARGET DESTINATION, using the exact structure of the "Schema Template" below.
    
    *** SCHEMA TEMPLATE (USE THIS STRUCTURE) ***
    ${schemaString}
    *** END TEMPLATE ***

    REQUIREMENTS:
    -   **Destination:** Must be the one you selected in Step 3, located in **${targetRegion}**.
    -   **Dates:** Generate a valid round-trip (5-14 days) strictly within ${targetMonth} ${targetYear}.
    -   **Image:** Set to \`null\`.
    -   **Titles:** Set \`trip_title_dashboard\` and \`human_title\` to "Trip to [City Name]".
    -   **Travelers:** Randomly pick 1-4 names from: [${memberNames}].
    -   **Flights/Hotels:** Invent realistic details for your selected destination.
        
    5.  **OUTPUT:** Return ONLY the valid JSON object for the single trip you generated. Do NOT return the brainstorm list.
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log(`[${randomSeed}] Raw Gemini Response (First 1000 chars):`, text.substring(0, 1000));

        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        let json = JSON.parse(cleanText);

        // Handle Array wrapping (Common AI behavior)
        if (Array.isArray(json)) {
            console.log(`[${randomSeed}] Response was an array, extracting first item.`);
            json = json.length > 0 ? json[0] : {};
        }

        // Validation & Auto-Correction
        if (!json.destination) {
            // Check for common nesting issues
            const values = Object.values(json);
            const nested = values.find((v: any) => v && v.destination && v.status);
            if (nested) json = nested;
        }

        if (!json.destination) {
            throw new Error(`Generated JSON invalid. Keys: ${Object.keys(json).join(", ")}`);
        }

        return json;
    } catch (e: any) {
        console.error("Gemini Generation Error:", e);
        throw new Error(`Gemini Error: ${e.message}`);
    }
}

