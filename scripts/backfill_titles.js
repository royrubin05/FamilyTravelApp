"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const generative_ai_1 = require("@google/generative-ai");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
async function generateTitles(trip) {
    const flights = trip.flights || [];
    const destination = trip.destination;
    const prompt = `
    You are a helpful travel assistant. Your goal is to summarize flight itineraries into natural, human-readable language suitable for a notification or a voice assistant.

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

    ### OUTPUT FORMAT (JSON):
    {
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
        const sanitize = (val) => (val === undefined || val === null) ? "" : val;
        return {
            dashboard: sanitize(data.human_title) || trip.destination, // Mapped to human_title as requested main title
            page: sanitize(data.human_title) || trip.destination,
            ai_summary: {
                topology: sanitize(data.topology),
                human_title: sanitize(data.human_title),
                verbose_description: sanitize(data.verbose_description),
                layover_text: sanitize(data.layover_text)
            }
        };
    }
    catch (e) {
        console.error("AI Error:", e);
        // Fallback
        return {
            dashboard: trip.destination || "Unknown Route",
            page: trip.destination || "Unknown Destination",
            ai_summary: {
                topology: "",
                human_title: trip.destination ? `Trip to ${trip.destination}` : "Trip Setup",
                verbose_description: "",
                layover_text: ""
            }
        };
    }
}
const admin = __importStar(require("firebase-admin"));
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
        const trip = { id: doc.id, ...doc.data() };
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
        }
        catch (err) {
            console.error(`Failed to update ${trip.id}:`, err);
        }
    }
    console.log(`Done. Updated ${updatedCount} trips.`);
}
run();
