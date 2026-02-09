import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    WASocket,
    BaileysEventMap,
    proto,
    fetchLatestBaileysVersion,
    isJidUser,
    Browsers,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import { useSupabaseAuthState } from './useSupabaseAuthState.js';
import { generateResponse } from '../services/gemini.js';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import { supabase } from '../database/supabase.js';
import path from 'path';
import fs from 'fs/promises';

interface BotConnection {
    socket: WASocket;
    qr: string | null;
    status: 'CONNECTING' | 'ONLINE' | 'OFFLINE';
}

export class BaileysManager {
    private connections: Map<string, BotConnection> = new Map();
    private io: SocketIOServer;

    constructor(io: SocketIOServer) {
        this.io = io;
    }

    async createConnection(botId: string): Promise<void> {
        if (this.connections.has(botId)) {
            console.log(`Bot ${botId} already has an active connection`);
            return;
        }

        // Use Supabase Auth State
        const { state, saveCreds } = await useSupabaseAuthState(botId);

        // Fetch latest version to avoid 405 errors
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`);

        const logger = pino({ level: 'info' }); // Enable logs for debugging

        // Simple in-memory msg retry counter
        const msgRetryCounterCache: any = {};

        const socket = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger),
            },
            logger,
            printQRInTerminal: false,
            browser: Browsers.macOS('Chrome'), // Try macOS for stability
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 60000, // Add query timeout
            retryRequestDelayMs: 5000, // Slower retries
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: true,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            msgRetryCounterCache,
            getMessage: async (_) => {
                return { conversation: 'hello' };
            },
        });

        const connection: BotConnection = {
            socket,
            qr: null,
            status: 'CONNECTING',
        };

        this.connections.set(botId, connection);

        // Event: QR Code
        socket.ev.on('connection.update', async (update) => {
            console.log(`[Baileys] Connection update for ${botId}:`, JSON.stringify(update, null, 2));
            const { connection: connStatus, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr);
                    connection.qr = qrDataUrl;
                    this.io.emit('qr-code', { botId, qr: qrDataUrl });
                    console.log(`QR Code generated for bot ${botId}`);
                } catch (error) {
                    console.error('Error generating QR code:', error);
                }
            }

            if (connStatus === 'close') {
                const shouldReconnect =
                    (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;

                console.log('Connection closed. Reconnect?', shouldReconnect);

                // Remove existing connection from map to allow reconnection
                this.connections.delete(botId);

                if (shouldReconnect) {
                    // Small delay to prevent tight loops
                    setTimeout(() => this.createConnection(botId), 1000);
                } else {
                    await supabase.updateBot(botId, { status: 'OFFLINE' });
                    this.io.emit('bot-status-change', { botId, status: 'OFFLINE' });
                }
            } else if (connStatus === 'open') {
                console.log(`Bot ${botId} connected successfully!`);
                connection.status = 'ONLINE';
                connection.qr = null;

                // Update database
                const phoneNumber = socket.user?.id.split(':')[0] || null;
                await supabase.updateBot(botId, {
                    status: 'ONLINE',
                    phone_number: phoneNumber,
                    last_sync: new Date().toISOString(),
                });

                this.io.emit('bot-status-change', { botId, status: 'ONLINE' });
            }
        });

        // Event: Credentials update
        socket.ev.on('creds.update', saveCreds);

        // Event: Messages
        socket.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            if (!message.message || message.key.fromMe) return;

            console.log('New message received:', message);

            // Process message
            await this.handleIncomingMessage(botId, message);
        });
    }

    private async handleIncomingMessage(botId: string, message: proto.IWebMessageInfo) {
        try {
            const { config } = await supabase.getBotWithConfig(botId);

            if (!config || !config.auto_reply_enabled) {
                console.log(`Auto-reply disabled for bot ${botId}`);
                return;
            }

            const connection = this.connections.get(botId);
            if (!connection) return;

            const remoteJid = message.key.remoteJid;
            if (!remoteJid) return;

            // Check if message is from a group and if groups should be ignored
            const isGroup = remoteJid.endsWith('@g.us');
            if (isGroup && config.ignore_groups) {
                console.log(`Ignoring group message from ${remoteJid} (ignore_groups enabled)`);
                return;
            }

            // Extract message text
            const messageText =
                message.message?.conversation ||
                message.message?.extendedTextMessage?.text ||
                '';

            if (!messageText) return;

            let response: string;

            if (config.gemini_integration_enabled) {
                // Determine system context
                const systemContext = config.system_instruction || 'Você é um assistente útil.';

                // 1. Save User Message
                await supabase.addMessageHistory(botId, remoteJid, 'user', messageText);

                // 2. Fetch Conversation History (last 10 messages within 4 hours)
                const dbHistory = await supabase.getConversationHistory(botId, remoteJid, 10, 4);

                // Map to Gemini format
                const history = dbHistory.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.content }]
                }));

                // 3. Generate AI response with history
                console.log(`Generating AI response for bot ${botId} with ${history.length} history items...`);
                response = await generateResponse(messageText, systemContext, history);

                // 4. Save Bot Response
                await supabase.addMessageHistory(botId, remoteJid, 'model', response);
            } else {
                // Fallback to simple logic
                response = config.fallback_message || 'Desculpe, não entendi.';

                // Check if it's first message (welcome) - Simple logic, can be improved
                if (config.welcome_message && messageText.toLowerCase().includes('oi')) {
                    response = config.welcome_message;
                }
            }

            // Send response
            await connection.socket.sendMessage(remoteJid, { text: response });
            console.log(`Bot ${botId} replied to ${remoteJid}`);
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    async destroyConnection(botId: string): Promise<void> {
        const connection = this.connections.get(botId);
        if (connection) {
            try {
                await connection.socket.logout();
            } catch (error) {
                console.error(`Error logging out bot ${botId}:`, error);
            } finally {
                connection.socket.end(undefined);
                this.connections.delete(botId);
                console.log(`Bot ${botId} disconnected`);
            }
        }
        // No need to delete files manually, Supabase keeps state or we can add method to clear db
    }

    getConnection(botId: string): BotConnection | undefined {
        return this.connections.get(botId);
    }

    getAllConnections(): Map<string, BotConnection> {
        return this.connections;
    }
}
