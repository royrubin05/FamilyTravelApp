"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

export async function matchTravelersWithAI(rawNames: string[], candidates: { name: string, nicknames?: string[], id?: string }[]): Promise<string[]> {
    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY for AI Matching");
        return rawNames;
    }

    if (!rawNames.length || !candidates.length) return rawNames;

    console.log(`[AI Match] Starting for ${rawNames.length} names:`, rawNames);

    const model = genAI.getGenerativeModel({
        model: "gemini-pro", // Fallback to stable pro model
        generationConfig: { responseMimeType: "application/json" }
    });

    const candidateList = candidates.map(c => `${c.name} (Nicknames: ${c.nicknames?.join(', ') || 'none'})`).join('\n');
    const inputList = rawNames.join('\n');

    const prompt = `
You are a data normalization expert.
I have a list of traveler names extracted from travel documents (airlines, hotels). They may be in "LAST/FIRST" format, have titles (MR, MS), or be partial names.
I also have a list of known family members.

Your task:
For each extracted traveler name, find the BEST match from the candidate family members.
If a match is found (even fuzzy, e.g. "GOLDMAN/NIV" -> "Niv Goldman"), return the candidate's canonical name.
If NO match is found, return the original extracted string.

IMPORTANT: Return valid JSON ONLY. A simple Array of strings. Do not include markdown formatting like \`\`\`json.

### Candidates:
${candidateList}

### Extracted Travelers:
${inputList}

Output JSON Array:
`;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log(`[AI Match] Raw Response:`, text);

        // Sanitize markdown if present
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const json = JSON.parse(jsonStr);

        if (Array.isArray(json) && json.length === rawNames.length) {
            console.log(`[AI Match] Success! Mapped to:`, json);
            return json.map(item => String(item));
        }

        console.warn("[AI Match] Unexpected format:", text);
        return rawNames;
    } catch (e) {
        console.error("[AI Match] Failed:", e);
        return rawNames;
    }
}
