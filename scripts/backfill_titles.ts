
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateTitles(trip: any): Promise<any> {
    const flights = trip.flights || [];
    const hotels = trip.hotels || [];
    const destination = trip.destination;
    const currentDates = trip.dates;

    const prompt = `
    You are a helpful travel assistant. Your goal is to summarize flight itineraries into natural, human-readable language suitable for a notification or a voice assistant.
    
    You also need to VERIFY and FIX the Trip Dates based on the flights and hotels provided.

    Please analyze the itinerary and output a JSON object using the following Natural Language Rules:

    ### NATURAL LANGUAGE RULES:

    1.  **Use City Names Only:**
        - Always convert airport codes to their primary City Name (e.g., "LAX" becomes "Los Angeles", "LHR" becomes "London").
        - If the city is obscure, include the country.

    2.  **\`human_title\` (The Headline):**
        - **Round Trip:** "Trip to [Destination City]"
        - **One Way:** "Flight to [Destination City]"
        - **Open Jaw:** "Trip to [Dest 1], returning from [Origin 2]"
        - **Multi-City:** "Multi-city journey to [List main cities]"

    3.  **\`verbose_description\` (The Details):**
        - Write a complete, grammatically correct sentence summarizing the flow.
        - Mention the dates and connection cities naturally.
        - **Structure:** "Departing [Origin] on [Date] for [Dest], connecting in [Stop City]."

    4.  **\`layover_text\`:**
        - Instead of "1 stop via EWR", use: "Layover in [City Name]".
        
    5. **No Flights**:
       - "human_title": "Trip to [Destination]"
       - "verbose_description": "Trip to [Destination] from [Dates]"
       
    6. **Date Verification**:
       - Scan all Flights and Hotels to find the Earliest Start Date and Latest End Date.
       - Format: "MMM DD, YYYY - MMM DD, YYYY" (e.g. "Jan 08, 2026 - Jan 09, 2026").
       - If 'Current Dates' is valid and matches the data, keep it. If 'Current Dates' is "Unknown" or missing, generate it.

    ### OUTPUT FORMAT (JSON):
    {
      "topology": "Round Trip" | "One Way" | "Open Jaw" | "Multi-City",
      "human_title": "String",
      "verbose_description": "String",
      "layover_text": "String",
      "dates": "String"
    }

    ### INPUT FLIGHTS:
    ${JSON.stringify(flights, null, 2)}
    
    ### INPUT HOTELS:
    ${JSON.stringify(hotels, null, 2)}
    
    ### CONTEXT:
    Destination: "${destination}"
    Current Dates: "${currentDates}"
    `;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log(`[AI Params] ${text}`);

        let data = JSON.parse(text);

        // Handle Array response
        if (Array.isArray(data)) {
            data = data[0] || {};
        }

        // Sanitize
        const sanitize = (val: any) => (val === undefined || val === null) ? "" : val;

        return {
            dashboard: sanitize(data.human_title) || trip.destination, // Mapped to human_title as requested main title
            page: sanitize(data.human_title) || trip.destination,
            dates: sanitize(data.dates) || trip.dates,
            ai_summary: {
                topology: sanitize(data.topology),
                human_title: sanitize(data.human_title),
                verbose_description: sanitize(data.verbose_description),
                layover_text: sanitize(data.layover_text)
            }
        };
    } catch (e) {
        console.error("AI Error:", e);
        // Fallback
        return {
            dashboard: trip.destination || "Unknown Route",
            page: trip.destination || "Unknown Destination",
            dates: trip.dates || "Unknown Dates",
            ai_summary: {
                topology: "",
                human_title: trip.destination ? `Trip to ${trip.destination}` : "Trip Setup",
                verbose_description: "",
                layover_text: ""
            }
        };
    }
}

import admin from "firebase-admin";

async function run() {
    console.log("Fetching trips...");

    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            projectId: 'travelapp05'
        });
    }

    const db = admin.firestore();
    const snapshot = await db.collection("trips").get();

    console.log(`Found ${snapshot.size} trips.`);

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const trip = { id: doc.id, ...doc.data() } as any;

        // Force update now to apply new schema
        console.log(`Generating AI Summary (+ Dates) for ${trip.id} (${trip.destination})...`);

        const result = await generateTitles(trip);

        try {
            await db.collection("trips").doc(trip.id).update({
                trip_title_dashboard: result.dashboard,
                trip_title_page: result.page,
                dates: result.dates,
                ai_summary: result.ai_summary
            });
            console.log(`Updated: ${result.dashboard} [${result.dates}]`);
            updatedCount++;
        } catch (err) {
            console.error(`Failed to update ${trip.id}:`, err);
        }
    }

    console.log(`Done. Updated ${updatedCount} trips.`);
}

run();
