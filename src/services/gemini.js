import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

let aiInstance = null;
const getAI = () => {
    if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key in .env");
    if (!aiInstance) aiInstance = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    return aiInstance;
};

// VisionSession wraps history to simulate an AI Memory so users can
// refer back to objects seen previously.
export class VisionSession {
    constructor() {
        this.history = [];
        this.ai = getAI();
        // Added initial system instruction piece for personality context
        this.systemInstruction = "You are SightAI, a premium real-time visual assistant. Describe what you see, answer questions clearly, and speak conversationally as if you are a friendly AI companion.";
    }

    // 1. Silent Background Vision Analysis (JSON Builder)
    async analyzeFrameSilent(imageDataUrl) {
        if (!imageDataUrl) return null;
        const base64Data = imageDataUrl.split(',')[1];

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    {
                        role: 'user',
                        parts: [
                            {
                                text: `You are a real-time visual observer running silently in the background. Analyze this image and extract important objects, food items, tools, and scene context. Keep the description very brief. Return strictly JSON matching this structure:
                            {
                                "objects": ["list", "of", "general", "objects"],
                                "food_items": ["list", "of", "food"],
                                "tools": ["list", "of", "tools"],
                                "important_items": ["key focal points"],
                                "scene_description": "short string describing the scene"
                            }` },
                            {
                                inlineData: {
                                    data: base64Data,
                                    mimeType: 'image/jpeg'
                                }
                            }
                        ]
                    }
                ],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const replyText = response.text;
            return JSON.parse(replyText);

        } catch (error) {
            console.error("SightAI JSON Silent Vision Error:", error);
            // Ignore strict parsing failures silently in background
            return null;
        }
    }

    // 2. Foreground Conversational Memory Query
    async askWithMemory(imageDataUrl, textQuery, visualMemoryContext) {
        const parts = [];

        // Inject the memory context directly into the prompt text before user query
        let fullPrompt = visualMemoryContext ? `${visualMemoryContext}\n\nUser Question:\n` : "";
        fullPrompt += textQuery ? textQuery : "What do you see right now in this frame?";

        parts.push({ text: fullPrompt });

        if (imageDataUrl) {
            const base64Data = imageDataUrl.split(',')[1];
            parts.push({
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            });
        }

        const userMessage = { role: 'user', parts };

        // Build the current prompt content
        const currentContents = [...this.history, userMessage];

        try {
            const response = await this.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: currentContents,
                config: {
                    systemInstruction: this.systemInstruction
                }
            });

            const replyText = response.text;

            // On success, save to memory (Note: we store the raw query without the giant context block to save payload size)
            this.history.push({ role: 'user', parts: [{ text: textQuery || "What do you see?" }] });
            this.history.push({ role: 'model', parts: [{ text: replyText }] });

            // Keep history lean (last ~6 pairs) to prevent payload bloat
            if (this.history.length > 12) {
                this.history = this.history.slice(this.history.length - 12);
            }

            return replyText;
        } catch (error) {
            console.error("SightAI Vision Error:", error);
            throw error;
        }
    }

    clearMemory() {
        this.history = [];
    }
}

// Ensure the old method still somewhat works for backward compat if needed
export const analyzeImageWithAudio = async (imageDataUrl, textQuery) => {
    const session = new VisionSession();
    return session.askWithMemory(imageDataUrl, textQuery, "");
};
