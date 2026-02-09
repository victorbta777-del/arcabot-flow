import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

export interface QRCodeEvent {
    botId: string;
    qr: string;
}

export interface BotStatusEvent {
    botId: string;
    status: 'ONLINE' | 'OFFLINE' | 'PAUSED' | 'SYNCING';
}

export interface BatteryUpdateEvent {
    botId: string;
    batteryLevel: number;
}

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Set<Function>> = new Map();

    connect() {
        if (this.socket?.connected) return;

        this.socket = io(WS_URL, {
            transports: ['websocket', 'polling'],
        });

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ WebSocket disconnected');
        });

        // Setup event listeners
        this.socket.on('qr-code', (data: QRCodeEvent) => {
            this.emit('qr-code', data);
        });

        this.socket.on('bot-status-change', (data: BotStatusEvent) => {
            this.emit('bot-status-change', data);
        });

        this.socket.on('battery-update', (data: BatteryUpdateEvent) => {
            this.emit('battery-update', data);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // Event emitter pattern
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }

    private emit(event: string, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    // Actions
    requestQR(botId: string) {
        if (this.socket?.connected) {
            this.socket.emit('request-qr', { botId });
        }
    }
}

export const socketService = new SocketService();
