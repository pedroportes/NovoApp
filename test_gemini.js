
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyCta5S0hwjIz7ayw_DWx5WiVQsuioBnxrc";

async function testref() {
    console.log("Testing Gemini API with key: " + API_KEY.substring(0, 10) + "...");
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = "Explain how AI works in one sentence.";
        console.log("Sending prompt: " + prompt);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("SUCCESS! Response: " + text);
    } catch (error) {
        console.error("FAILURE! Error details:");
        console.error(error);
    }
}

testref();
