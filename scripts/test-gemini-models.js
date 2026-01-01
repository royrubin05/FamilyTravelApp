
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const dotenv = require('dotenv');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ No GEMINI_API_KEY found in .env.local");
        process.exit(1);
    }

    console.log("Checking models with API Key ending in:", apiKey.slice(-4));

    try {
        // There isn't a direct "listModels" on the standard client instance in some versions,
        // but let's try to just perform a generation with a few known candidates to see which one succeeds if listModels isn't easily accessible via this SDK wrapper simplified.
        // Actually the error message said "Call ListModels". In the Node SDK, this is often on the ModelManager or similar, but the simple SDK might not expose it easily.
        // Let's try to just run a probe on the most likely candidates.

        const genAI = new GoogleGenerativeAI(apiKey);

        const candidates = [
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-1.0-pro",
            "gemini-pro",
            "gemini-2.0-flash-exp",
        ];

        console.log("\nProbing models...");

        for (const modelName of candidates) {
            try {
                process.stdout.write(`Testing ${modelName}... `);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello, are you there?");
                const response = await result.response;
                console.log(`✅ SUCCESS!`);
            } catch (e) {
                console.log(`❌ FAILED (${e.message.split('[')[0].trim()})`); // concise error
            }
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

listModels();
