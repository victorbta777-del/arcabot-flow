import express from 'express';
import { generateResponse } from '../services/gemini.js';

export const createAiRoutes = () => {
    const router = express.Router();

    router.post('/generate', async (req, res) => {
        try {
            const { context } = req.body;

            if (!context) {
                return res.status(400).json({ error: 'Context is required' });
            }

            // Create a specific prompt for suggestions
            const systemInstruction = `
            Você é um especialista em Copywriting para chatbots de WhatsApp.
            Sua tarefa é criar textos curtos, engajadores e humanos.
            Evite linguagem robótica. Use emojis com moderação.
            `;

            const prompt = `
            Crie uma sugestão de texto para o seguinte contexto: "${context}".
            Retorne APENAS o texto sugerido, sem aspas ou explicações adicionais.
            `;

            const suggestion = await generateResponse(prompt, systemInstruction);
            res.json({ suggestion });
        } catch (error) {
            console.error('Error generating AI suggestion:', error);
            res.status(500).json({ error: 'Failed to generate suggestion' });
        }
    });

    return router;
};
