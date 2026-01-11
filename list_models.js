
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "YOUR_API_KEY";

async function listModels() {
    console.log("Listing models...");
    try {
        // There isn't a direct listModels on the SDK top level in all versions, 
        // but we can try to hit the REST endpoint or use the manager if available.
        // Actually, in the official SDK:
        // const genAI = new GoogleGenerativeAI(API_KEY);
        // But listModels is not on genAI instance directly in v0.1.

        // Let's use a raw fetch to be 100% sure what the API returns.
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log("ERROR LISTING MODELS:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("FAILURE:", error);
    }
}

listModels();
