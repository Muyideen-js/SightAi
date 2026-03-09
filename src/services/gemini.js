import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const analyzeImageWithAudio = async (imageDataUrl, textQuery) => {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing Gemini API Key in .env");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    try {
        const base64Data = imageDataUrl.split(',')[1];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: textQuery || "What do you see?" },
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: 'image/jpeg'
                            }
                        }
                    ]
                }
            ]
        });

        return response.text;
    } catch (error) {
        console.error(error);
        throw error;
    }
};
