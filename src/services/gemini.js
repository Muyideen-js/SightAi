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

    async ask(imageDataUrl, textQuery) {
        const parts = [];
        if (textQuery) {
            parts.push({ text: textQuery });
        } else {
            parts.push({ text: "What do you see?" });
        }

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

            // On success, save to memory
            this.history.push(userMessage);
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

// Keep the previous solitary ask method for quick non-memory one-offs if needed
export const analyzeImageWithAudio = async (imageDataUrl, textQuery) => {
    const session = new VisionSession();
    return session.ask(imageDataUrl, textQuery);
};
