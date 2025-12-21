const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }

    console.log("Using API Key:", apiKey.substring(0, 10) + "...");

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // There isn't a direct listModels on the SDK client usually exposed simply in node without admin, 
        // but let's try a simple generation to check connectivity with a fallback model.
        // Actually, checking the docs or error message is better.
        // The previous error said: "Call ListModels to see the list of available models"

        // Attempting to generate with 'gemini-pro' as a baseline test
        console.log("Testing gemini-1.5-flash...");
        const result = await model.generateContent("Test");
        console.log("Success with gemini-1.5-flash response:", result.response.text());
    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);
    }

    try {
        console.log("Testing gemini-pro...");
        const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result2 = await model2.generateContent("Test");
        console.log("Success with gemini-pro:", result2.response.text());
    } catch (error) {
        console.error("Error with gemini-pro:", error.message);
    }
}

listModels();
