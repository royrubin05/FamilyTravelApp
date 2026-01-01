"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_MODEL_NAME } from "@/lib/ai-config";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

interface InsightStats {
    totalMiles: number;
    totalHours: number;
    hotelCount: number;
    countryCount: number;
    topAirline: { name: string; count: number };
    topDestination: { name: string; count: number };
    visitedCities: string[];
}

interface InsightContext {
    name: string;
    year: string;
}

export async function generateInsightAction(stats: InsightStats, context: InsightContext): Promise<string> {
    const { totalMiles, totalHours, hotelCount, countryCount, topAirline, topDestination, visitedCities } = stats;
    const { name, year } = context;

    // Safety check for empty data
    if (totalMiles === 0 && hotelCount === 0) {
        return "No travel data available for this selection yet.";
    }

    const isFamily = name === "the family" || name === "all" || name === "All Travelers";
    const subject = isFamily ? "the family" : name;
    const yearText = year === "all" ? "across all accumulated trips" : `in ${year}`;

    const prompt = `
    You are a witty and insightful travel chronicler.
    
    Generative a single, engaging paragraph (approx. 2-3 sentences) summarizing these travel statistics for ${subject} ${yearText}.

    Statistics:
    - Miles Traveled: ${totalMiles.toLocaleString()}
    - Time in Air: ${totalHours} hours
    - Hotel Stays: ${hotelCount}
    - Countries/Places Visited: ${countryCount} (implied from distinct destinations)
    - Top Airline: ${topAirline.name} (${topAirline.count} flights)
    - Top Destination: ${topDestination.name} (${topDestination.count} visits)
    - Key Cities Visited: ${visitedCities.join(", ")}

    Tone Guidelines:
    - If Subject is "the family": Use inclusive language like "we", "the family", "shared adventures". Focus on bonding and collective movement.
    - If Subject is an Individual (e.g., "${subject}"): Use specific pronouns (he/she/they) or their name. Focus on their personal journey or contribution to the chaos.
    - Be slightly whimsical but informative.
    - Do NOT list the stats as a bulleted list. Weave them into the narrative naturally.
    - Mention 1-2 specific cities from the "Key Cities Visited" list to add flavor, especially if "Top Destination" has a low visit count (e.g. 1).
    - CAUTION: If "Top Destination" visited count is 1, do NOT claim it "stole our hearts" or implies a strong recurring preference. Just mention it was a highlight.
    - Verify your numbers match the input.

    Example Output (Family):
    "In 2024, the family logged an impressive 12,000 miles, spending 30 hours in the sky on United Airlines. From 5 hotel stays to exploring cities like London and San Francisco, we certainly made the most of our shared adventures."

    Example Output (Individual):
    "Roy was quite the globetrotter this year, racking up 12,000 miles and practically living on United Airlines flights. With stops in London and San Francisco, he clearly has a penchant for city breaks."
    `;

    try {
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL_NAME });
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        return response.trim();
    } catch (e) {
        console.error("Error generating insight:", e);
        // Fallback to a simple template if AI fails
        return `${year === 'all' ? 'In total' : `In ${year}`}, ${subject} traveled ${totalMiles.toLocaleString()} miles and spent ${totalHours} hours flying, mostly on ${topAirline.name}.`;
    }
}
