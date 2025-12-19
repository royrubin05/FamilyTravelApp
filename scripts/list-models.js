const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

async function listModels() {
    // Read .env.local manually
    let apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        try {
            const envPath = path.join(__dirname, "..", ".env.local");
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, "utf-8");
                const match = content.match(/GEMINI_API_KEY=(.*)/);
                if (match && match[1]) {
                    apiKey = match[1].trim().replace(/^["']|["']$/g, ""); // Remove quotes if present
                }
            }
        } catch (err) {
            console.error("Error reading .env.local", err);
        }
    }

    if (!apiKey) {
        console.log("No GEMINI_API_KEY found");
        return;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("API Error:", JSON.stringify(data.error, null, 2));
        } else {
            console.log("Available Models:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        }
    } catch (e) {
        console.error(e);
    }
}

listModels();
