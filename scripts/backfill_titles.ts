
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function generateTitles(trip: any): Promise<any> {
    const flights = trip.flights || [];
    const destination = trip.destination;

    const prompt = `
    You are a helpful travel assistant. Your goal is to summarize flight itineraries into natural, human-readable language suitable for a notification or a voice assistant, AND provide specific dashboard formatting.

    Please analyze the itinerary and output a JSON object.

    ### NATURAL LANGUAGE RULES:
    1.  **Use City Names Only:**
        - Always convert airport codes to their primary City Name (e.g., "LAX" becomes "Los Angeles", "LHR" becomes "London").
        - If the city is obscure, include the country.

    2.  **human_title (The Headline):**
        - **Round Trip:** "Trip to [Destination City]"
        - **One Way:** "Flight to [Destination City]"
        - **Open Jaw:** "Trip to [Dest 1], returning from [Origin 2]"
        - **Multi-City:** "Multi-city journey to [List main cities]"

    3.  **verbose_description (The Details):**
        - Write a complete, grammatically correct sentence summarizing the flow.
        - Mention the dates and connection cities naturally.
        - **Structure:** "Departing [Origin] on [Date] for [Dest], connecting in [Stop City]."

    4.  **layover_text:**
        - Instead of "1 stop via EWR", use: "Layover in [City Name]".
        
    5. **dashboard_title (Visual Route):**
       - Direct (A->B): "A <-> B"
       - 1 Stop (A->S1->B): "A to B (connecting in S1)"
       - 2 Stops (A->S1->S2->B): "A to B (connecting in S1 and S2)"
       - 3+ Stops: "A to B (multiple stops)"
       - Use Airport Codes if City names are not clear. A = Origin, B = Final Destination.
       
    6. **No Flights**:
       - If there are no flights, "dashboard_title" MUST be the Destination City Name only (e.g. "Bahamas").
       - "human_title" should be "Trip to [City]".
       - "verbose_description" should be "Trip to [City]".

    ### OUTPUT FORMAT (JSON):
    {
      "dashboard_title": "String",
      "page_title": "String (Main City Name)",
      "topology": "Round Trip" | "One Way" | "Open Jaw" | "Multi-City",
      "human_title": "String",
      "verbose_description": "String",
      "layover_text": "String"
    }

    ### INPUT FLIGHTS:
    ${JSON.stringify(flights, null, 2)}
    
    ### CONTEXT:
    Destination: "${destination}"
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
            dashboard: sanitize(data.dashboard_title) || trip.destination,
            page: sanitize(data.page_title) || trip.destination,
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
            ai_summary: {
                topology: "",
                human_title: "",
                verbose_description: "",
                layover_text: ""
            }
        };
    }
}

async function run() {
    console.log("Fetching trips...");
    const { db } = await import("../src/lib/firebase");
    const snapshot = await db.collection("trips").get();

    console.log(`Found ${snapshot.size} trips.`);

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
        const trip = { id: doc.id, ...doc.data() } as any;

        // Force update now to apply new schema
        console.log(`Generating AI Summary for ${trip.id} (${trip.destination})...`);

        const result = await generateTitles(trip);

        try {
            await db.collection("trips").doc(trip.id).update({
                trip_title_dashboard: result.dashboard,
                trip_title_page: result.page,
                ai_summary: result.ai_summary
            });
            console.log(`Updated: ${result.dashboard}`);
            updatedCount++;
        } catch (err) {
            console.error(`Failed to update ${trip.id}:`, err);
        }
    }

    console.log(`Done. Updated ${updatedCount} trips.`);
}

run();
