import express, { Request, Response } from 'express';
import { supabase } from '../database/supabase.js';

export function createConfigRoutes() {
    const router = express.Router();

    // GET /api/bots/:botId/config - Get bot configuration
    router.get('/:botId', async (req: Request, res: Response) => {
        try {
            const botId = req.params.botId as string;
            const config = await supabase.getBotConfig(botId);

            if (!config) {
                return res.status(404).json({ error: 'Config not found' });
            }

            res.json(config);
        } catch (error: any) {
            console.error('Error fetching config:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // PUT /api/bots/:botId/config - Update bot configuration
    router.put('/:botId', async (req: Request, res: Response) => {
        try {
            const botId = req.params.botId as string;
            const updates = req.body;

            // Check if config exists
            const existingConfig = await supabase.getBotConfig(botId);

            if (!existingConfig) {
                // Create if doesn't exist
                const newConfig = await supabase.createBotConfig({
                    bot_instance_id: botId,
                    ...updates,
                });
                return res.json(newConfig);
            }

            // Update existing
            const updatedConfig = await supabase.updateBotConfig(botId, updates);
            res.json(updatedConfig);
        } catch (error: any) {
            console.error('Error updating config:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
