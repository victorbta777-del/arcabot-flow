import express, { Request, Response } from 'express';
import { supabase } from '../database/supabase.js';
import { BaileysManager } from '../baileys/BaileysManager.js';

export function createBotRoutes(baileysManager: BaileysManager) {
    const router = express.Router();

    // GET /api/bots - List all bots with configs
    router.get('/', async (req: Request, res: Response) => {
        try {
            const bots = await supabase.getAllBots();

            // Fetch configs for all bots
            const botsWithConfigs = await Promise.all(
                bots.map(async (bot) => {
                    const config = await supabase.getBotConfig(bot.id);
                    return { ...bot, config };
                })
            );

            res.json(botsWithConfigs);
        } catch (error: any) {
            console.error('Error fetching bots:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/bots - Create new bot instance
    router.post('/', async (req: Request, res: Response) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

            // Create bot instance
            const bot = await supabase.createBot({
                name,
                status: 'OFFLINE',
                battery_level: 0,
            });

            // Create default config
            const config = await supabase.createBotConfig({
                bot_instance_id: bot.id,
                fallback_message: 'Desculpe, não entendi. Um humano irá atendê-lo em breve.',
                inactivity_timer_minutes: 30,
                auto_reply_enabled: true,
                gemini_integration_enabled: false,
            });

            // Start connection
            await baileysManager.createConnection(bot.id);

            res.status(201).json({ ...bot, config });
        } catch (error: any) {
            console.error('Error creating bot:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // GET /api/bots/:id - Get bot details
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { bot, config } = await supabase.getBotWithConfig(id as string);
            res.json({ ...bot, config });
        } catch (error: any) {
            console.error('Error fetching bot:', error);
            res.status(404).json({ error: 'Bot not found' });
        }
    });

    // DELETE /api/bots/:id - Delete bot
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Destroy connection first
            await baileysManager.destroyConnection(id as string);

            // Delete from database (cascade will delete config)
            await supabase.deleteBot(id as string);

            res.status(204).send();
        } catch (error: any) {
            console.error('Error deleting bot:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/bots/:id/reset-qr - Force reset connection to get new QR
    router.post('/:id/reset-qr', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            console.log(`Force resetting connection for bot ${id}...`);

            // Destroy existing connection
            await baileysManager.destroyConnection(id as string);

            // Create new connection
            await baileysManager.createConnection(id as string);

            res.json({ message: 'Connection reset initiated' });
        } catch (error: any) {
            console.error('Error resetting connection:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // POST /api/bots/:id/toggle - Toggle bot status (pause/resume)
    router.post('/:id/toggle', async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const bot = await supabase.getBotById(id as string);

            if (!bot) {
                return res.status(404).json({ error: 'Bot not found' });
            }

            const newStatus = bot.status === 'ONLINE' ? 'PAUSED' : 'ONLINE';

            if (newStatus === 'PAUSED') {
                // Just update status, keep connection alive
                await supabase.updateBot(id as string, { status: 'PAUSED' });
            } else {
                // Resume
                await supabase.updateBot(id as string, { status: 'ONLINE' });
            }

            const updatedBot = await supabase.getBotById(id as string);
            res.json(updatedBot);
        } catch (error: any) {
            console.error('Error toggling bot:', error);
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
