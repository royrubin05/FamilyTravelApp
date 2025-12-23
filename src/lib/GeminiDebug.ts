
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const PROMPT_SYSTEM_INSTRUCTION = `
You are an intelligent travel assistant. Your task is to extract structured travel itinerary data from the provided document (PDF or Email).

Return ONLY a JSON object with the following schema:
{
  "destination": "City, Country",
  "dates": "MMM DD, YYYY - MMM DD, YYYY",
  "image_keyword": "City Name",
  "travelers": [
    { "name": "Name", "role": "Adult/Child/Traveler", "age": "Adult" }
  ],
  "flights": [
    {
      "airline": "Airline Name",
      "flightNumber": "XX123",
      "departure": "Date Time (Airport Code)",
      "arrival": "Date Time (Airport Code)",
      "confirmation": "ABC1234",
      "travelers": ["Name 1", "Name 2"]
    }
  ],
  "hotels": [
    {
      "name": "Hotel Name",
      "address": "Full Address",
      "checkIn": "Date Time",
      "checkOut": "Date Time"
    }
  ],
  "activities": [],
  "trip_title_dashboard": "Origin <-> Destination",
  "trip_title_page": "City Name",
  "ai_summary": {
    "topology": "Round Trip | One Way | Open Jaw | Multi-City",
    "human_title": "Trip to City",
    "verbose_description": "Natural language summary.",
    "layover_text": "Layover description."
  }
}

Rules:
1. Extract ALL travelers found in the document.
2. Format dates as "MMM DD, YYYY - MMM DD, YYYY" (e.g. "Jan 04, 2026 - May 27, 2026"). Do NOT use parentheses for the year.
3. CRITICAL: You MUST populate "destination". If it is not explicitly written at the top, INFER it from the arrival airport of the first inbound flight or the location of the hotel.
   - Clean the name: Remove airport codes (e.g. convert "City (CODE)" to "City").
4. If "dates" are missing, INFER them from the first flight departure.
5. Do NOT include markdown formatting (\`\`\`json). Just the raw JSON.
6. Generate Titles (AI Summary):
   - "trip_title_dashboard": Visual Route (e.g. "LAX <-> LHR" or "A to B (connecting in X)").
   - "trip_title_page": Main City Name (e.g. "London").
   - "ai_summary":
     - Use natural language rules:
     - Use City Names Only (convert codes).
     - human_title: "Trip to [City]" / "Flight to [City]".
     - verbose_description: Complete, grammatical sentence: "Departing [Origin] on [Date] for [Dest], connecting in [Stop]."
     - layover_text: "Layover in [Stop]" (instead of "1 stop via...").
     - IF NO FLIGHTS: "dashboard_title" = City Name. "human_title" = "Trip to [City]".
`;

export async function parseTripWithGemini(fileBuffer: Buffer, mimeType: string) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: PROMPT_SYSTEM_INSTRUCTION
    });

    const prompt = "Extract trip details from this document.";

    // Convert Buffer to Base64
    const filePart = {
      inlineData: {
        data: fileBuffer.toString("base64"),
        mimeType: mimeType
      },
    };

    const result = await model.generateContent([prompt, filePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown if present
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const tripData = JSON.parse(jsonStr);

    return {
      success: true,
      tripData,
      debugPrompt: `System: ${PROMPT_SYSTEM_INSTRUCTION}\n\nUser: ${prompt}\n\n[Attached File: ${mimeType} (${fileBuffer.length} bytes)]`,
      debugResponse: text
    };

  } catch (error) {
    console.error("Gemini Local Parse Error:", error);
    return {
      success: false,
      error: (error as Error).message,
      debugPrompt: "Error during generation",
      debugResponse: (error as Error).message
    };
  }
}
