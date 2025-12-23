import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateTripTitles(trip: any) {
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
           *   (Note: A trip with connections/layovers is STILL a Round Trip if the ultimate destination is the same. Do NOT classify as Multi-City just because there is a stopover.)
        - **One Way:** "Flight to [Destination City]"
        - **Open Jaw:** "Trip to [Dest 1], returning from [Origin 2]"
        - **Multi-City:** "Multi-city journey to [List main cities]"
            *   (Note: ONLY use Multi-City if the traveler spends significant time (>24h) in multiple distinct cities acting as destinations. A 2-hour stop in Frankfurt on the way to Tel Aviv is merely a connection, NOT a multi-city trip.)
        - **No Flights:** "Trip to [Destination]"

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
        // console.log(`[AI Params] ${text}`);

        let data = JSON.parse(text);

        // Handle Array response
        if (Array.isArray(data)) {
            data = data[0] || {};
        }

        // Sanitize
        const sanitize = (val: any) => (val === undefined || val === null) ? "" : val;

        return {
            dashboard: sanitize(data.human_title) || trip.destination,
            page: sanitize(data.human_title) || trip.destination,
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
                human_title: trip.destination ? `Trip to ${trip.destination}` : "Trip Setup",
                verbose_description: "",
                layover_text: ""
            }
        };
    }
}
