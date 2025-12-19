"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
const pdf = require("pdf-parse");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function parseTripDocument(formData: FormData) {
    try {
        const file = formData.get("file") as File;
        if (!file) {
            throw new Error("No file uploaded");
        }

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // key step: Parse PDF Text
        const pdfData = await pdf(buffer);
        const textContent = pdfData.text;

        // Call Google Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are a travel assistant parser. Extract the following trip details from the text below and return ONLY valid JSON.
      Do not include markdown code blocks (like \`\`\`json). Just the raw JSON object.

      Structure:
      {
        "destination": "City or Region Name (Uppercase)",
        "dates": "e.g., Oct 12 - Oct 27 or Spring 2025",
        "image_keyword": "A generic keyword for an unsplash image search, e.g., 'Paris' or 'Skiing'",
        "travelers": [
           { 
             "id": "generate_unique_id", 
             "name": "Suggest a role-based name like 'Organizer' or 'Traveler' if not found", 
             "role": "e.g., Flight, Hotel, or generic role" 
           }
        ]
      }

      Document Text:
      ${textContent.substring(0, 10000)} // Limit context if needed
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up response if it contains markdown
        const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(jsonString);

    } catch (error) {
        console.error("Error parsing document:", error);
        return { error: "Failed to parse document. Ensure GEMINI_API_KEY is set." };
    }
}
