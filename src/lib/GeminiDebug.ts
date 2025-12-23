
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
  "trip_title_dashboard": "Human Title (Headline)",
  "trip_title_page": "Human Title (Headline)",
  "ai_summary": {
    "topology": "Round Trip | One Way | Open Jaw | Multi-City",
    "human_title": "String",
    "verbose_description": "String",
    "layover_text": "String"
  }
}

Rules:
1. Extract ALL travelers found in the document.
2. Format dates as "MMM DD, YYYY - MMM DD, YYYY" (e.g. "Jan 04, 2026 - May 27, 2026"). Do NOT use parentheses for the year.
3. CRITICAL: You MUST populate "destination". If it is not explicitly written at the top, INFER it from the arrival airport of the first inbound flight or the location of the hotel.
   - Clean the name: Remove airport codes (e.g. convert "City (CODE)" to "City").
4. If "dates" are missing, INFER them from the first flight departure.
5. Do NOT include markdown formatting (\`\`\`json). Just the raw JSON.
6. Generate Titles (AI Summary) using these NATURAL LANGUAGE RULES:
   
   A. **Use City Names Only:**
      - Always convert airport codes to their primary City Name (e.g., "LAX" becomes "Los Angeles").
      - If the city is obscure, include the country.

   B. **\`human_title\` (The Headline):**
      - **Round Trip:** "Trip to [Destination City]"
          *   (Ignore connections/layovers. A stop in Frankfurt en route to Tel Aviv is a Round Trip to Tel Aviv.)
      - **One Way:** "Flight to [Destination City]"
      - **Open Jaw:** "Trip to [Dest 1], returning from [Origin 2]"
      - **Multi-City:** "Multi-city journey to [List main cities]"
          *   (Strictly for trips with multiple distinct STAYS > 24h. Do not count layovers.)
      - **No Flights:** "Trip to [Destination]"

   C. **\`verbose_description\` (The Details):**
      - Write a complete, grammatically correct sentence summarizing the flow.
      - Mention the dates and connection cities naturally.
      - **Structure:** "Departing [Origin] on [Date] for [Dest], connecting in [Stop City]."

   D. **\`layover_text\`:**
      - Instead of "1 stop via EWR", use: "Layover in [City Name]".

   E. Mappings:
      - Map "human_title" to both "trip_title_dashboard" and "trip_title_page".
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
