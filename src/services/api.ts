const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface BotInstance {
    id: string;
    name: string;
    phone_number: string | null;
    status: 'ONLINE' | 'OFFLINE' | 'PAUSED' | 'SYNCING';
    battery_level: number;
    last_sync: string | null;
    created_at: string;
    updated_at: string;
    config?: BotConfig;
}

export interface BotConfig {
    id: string;
    bot_instance_id: string;
    welcome_message: string | null;
    fallback_message: string;
    inactivity_timer_minutes: number;
    auto_reply_enabled: boolean;
    gemini_integration_enabled: boolean;
    ignore_groups: boolean;
    system_instruction: string | null;
    created_at: string;
    updated_at: string;
}

class ApiService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = API_URL;
    }

    // Bot Management
    async getAllBots(): Promise<BotInstance[]> {
        const response = await fetch(`${this.baseUrl}/api/bots`);
        if (!response.ok) throw new Error('Failed to fetch bots');
        return response.json();
    }

    async createBot(name: string): Promise<BotInstance> {
        const response = await fetch(`${this.baseUrl}/api/bots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create bot');
        return response.json();
    }

    async deleteBot(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/bots/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete bot');
    }

    async toggleBot(id: string): Promise<BotInstance> {
        const response = await fetch(`${this.baseUrl}/api/bots/${id}/toggle`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to toggle bot');
        return response.json();
    }

    async resetQR(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/bots/${id}/reset-qr`, {
            method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to reset QR');
    }



    // AI Generation
    async generateSuggestion(context: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/api/ai/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context }),
        });
        if (!response.ok) throw new Error('Failed to generate suggestion');
        const data = await response.json();
        return data.suggestion;
    }

    // Config Management
    async getBotConfig(botId: string): Promise<BotConfig> {
        const response = await fetch(`${this.baseUrl}/api/config/${botId}`);
        if (!response.ok) throw new Error('Failed to fetch config');
        return response.json();
    }

    async updateBotConfig(botId: string, config: Partial<BotConfig>): Promise<BotConfig> {
        const response = await fetch(`${this.baseUrl}/api/config/${botId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config),
        });
        if (!response.ok) throw new Error('Failed to update config');
        return response.json();
    }

    // Scheduling Management
    async getScheduledMessages(botId?: string, status?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (botId) params.append('botId', botId);
        if (status) params.append('status', status);

        const response = await fetch(`${this.baseUrl}/api/scheduling/messages?${params}`);
        if (!response.ok) throw new Error('Failed to fetch scheduled messages');
        return response.json();
    }

    async createScheduledMessage(data: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create scheduled message');
        return response.json();
    }

    async updateScheduledMessage(id: string, data: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/messages/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update scheduled message');
        return response.json();
    }

    async cancelScheduledMessage(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/messages/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to cancel scheduled message');
    }

    async getTemplates(botId?: string): Promise<any[]> {
        const params = new URLSearchParams();
        if (botId) params.append('botId', botId);

        const response = await fetch(`${this.baseUrl}/api/scheduling/templates?${params}`);
        if (!response.ok) throw new Error('Failed to fetch templates');
        return response.json();
    }

    async createTemplate(data: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/templates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create template');
        return response.json();
    }

    async updateTemplate(id: string, data: any): Promise<any> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/templates/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update template');
        return response.json();
    }

    async deleteTemplate(id: string): Promise<void> {
        const response = await fetch(`${this.baseUrl}/api/scheduling/templates/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete template');
    }
}

export const api = new ApiService();
