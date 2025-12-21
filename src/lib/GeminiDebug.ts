
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const PROMPT_SYSTEM_INSTRUCTION = `
You are an intelligent travel assistant. Your task is to extract structured travel itinerary data from the provided document (PDF or Email).

Return ONLY a JSON object with the following schema:
{
  "destination": "City, Country",
  "dates": "Mon, MMM DD - Mon, MMM DD (Year)",
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
  "activities": []
}

Rules:
1. Extract ALL travelers found in the document.
2. Format dates clearly.
3. If data is missing, use empty arrays or null.
4. Do NOT include markdown formatting (\`\`\`json). Just the raw JSON.
`;

export async function parseTripWithGemini(fileBuffer: Buffer, mimeType: string) {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
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
