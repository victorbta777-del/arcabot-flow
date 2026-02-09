import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateResponse = async (
    userMessage: string,
    systemInstruction: string = 'Você é um assistente útil.',
    history: { role: 'user' | 'model'; parts: { text: string }[] }[] = []
): Promise<string> => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('Gemini API Key not found');
        return 'Desculpe, minha inteligência artificial não está configurada corretamente.';
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            systemInstruction
        });

        const chat = model.startChat({
            history: history,
            generationConfig: {
                maxOutputTokens: 1000,
            },
        });

        const result = await chat.sendMessage(userMessage);
        const response = result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating AI response:', error);
        return 'Desculpe, estou com dificuldades para pensar agora.';
    }
};
