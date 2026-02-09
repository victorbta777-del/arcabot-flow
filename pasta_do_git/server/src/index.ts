import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BaileysManager } from './baileys/BaileysManager.js';
import { createBotRoutes } from './routes/bots.js';
import { createConfigRoutes } from './routes/config.js';
import { createAiRoutes } from './routes/ai.js';
import { createSchedulingRoutes } from './routes/scheduling.js';
import { createUploadRoutes } from './routes/upload.js';
import { supabase } from './database/supabase.js';
import { SchedulerService } from './services/scheduler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static('uploads'));

// Initialize Baileys Manager
const baileysManager = new BaileysManager(io);

// Initialize Scheduler
const scheduler = new SchedulerService(baileysManager);
scheduler.start();

// Routes
app.use('/api/bots', createBotRoutes(baileysManager));
app.use('/api/config', createConfigRoutes());
app.use('/api/ai', createAiRoutes());
app.use('/api/scheduling', createSchedulingRoutes());
app.use('/api/upload', createUploadRoutes());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO events
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('request-qr', async ({ botId }) => {
        console.log('QR requested for bot:', botId);
        const connection = baileysManager.getConnection(botId);

        if (connection?.qr) {
            console.log('Sending existing QR for bot:', botId);
            io.emit('qr-code', { botId, qr: connection.qr });
        } else if (!connection) {
            console.log('No connection found, creating new one for bot:', botId);
            // Create connection if it doesn't exist
            try {
                await baileysManager.createConnection(botId);
                console.log('Connection created, QR will be emitted via event');
            } catch (error) {
                console.error('Error creating connection:', error);
            }
        } else {
            console.log('Connection exists but no QR code yet for bot:', botId);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);

    // Restore existing bot connections
    try {
        const bots = await supabase.getAllBots();
        const onlineBots = bots.filter(b => b.status === 'ONLINE' || b.status === 'PAUSED');

        console.log(`🔄 Restoring ${onlineBots.length} bot connection(s)...`);

        for (const bot of onlineBots) {
            try {
                await baileysManager.createConnection(bot.id);
                console.log(`✅ Bot ${bot.name} (${bot.id}) connection restored`);
            } catch (error) {
                console.error(`❌ Failed to restore bot ${bot.name}:`, error);
            }
        }
    } catch (error) {
        console.error('Error restoring connections:', error);
    }
});
