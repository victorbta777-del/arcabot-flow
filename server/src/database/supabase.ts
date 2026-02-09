import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export interface BotInstance {
    id: string;
    name: string;
    phone_number: string | null;
    status: 'ONLINE' | 'OFFLINE' | 'PAUSED' | 'SYNCING';
    battery_level: number;
    last_sync: string | null;
    auth_state: any;
    created_at: string;
    updated_at: string;
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

class SupabaseService {
    private client: SupabaseClient;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials');
        }

        this.client = createClient(supabaseUrl, supabaseKey);
    }

    // Public getter for client (needed by scheduler and routes)
    getClient(): SupabaseClient {
        return this.client;
    }

    // Bot Instances
    async getAllBots(): Promise<BotInstance[]> {
        const { data, error } = await this.client
            .from('bot_instances')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async getBotById(id: string): Promise<BotInstance | null> {
        const { data, error } = await this.client
            .from('bot_instances')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    async createBot(bot: Partial<BotInstance>): Promise<BotInstance> {
        const { data, error } = await this.client
            .from('bot_instances')
            .insert([bot])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBot(id: string, updates: Partial<BotInstance>): Promise<BotInstance> {
        const { data, error } = await this.client
            .from('bot_instances')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteBot(id: string): Promise<void> {
        const { error } = await this.client
            .from('bot_instances')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    // Bot Configs
    async getBotConfig(botInstanceId: string): Promise<BotConfig | null> {
        const { data, error } = await this.client
            .from('bot_configs')
            .select('*')
            .eq('bot_instance_id', botInstanceId)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        return data;
    }

    async createBotConfig(config: Partial<BotConfig>): Promise<BotConfig> {
        const { data, error } = await this.client
            .from('bot_configs')
            .insert([config])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async updateBotConfig(botInstanceId: string, updates: Partial<BotConfig>): Promise<BotConfig> {
        const { data, error } = await this.client
            .from('bot_configs')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('bot_instance_id', botInstanceId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    // Helper: Get bot with config
    async getBotWithConfig(id: string): Promise<{ bot: BotInstance; config: BotConfig | null }> {
        const bot = await this.getBotById(id);
        if (!bot) throw new Error('Bot not found');

        const config = await this.getBotConfig(id);
        return { bot, config };
    }

    // Conversation History
    async addMessageHistory(
        botId: string,
        jid: string,
        role: 'user' | 'model',
        content: string
    ): Promise<void> {
        const { error } = await this.client
            .from('conversation_history')
            .insert([{
                bot_instance_id: botId,
                remote_jid: jid,
                role,
                content
            }]);

        if (error) console.error('Error saving message history:', error);
    }

    async getConversationHistory(
        botId: string,
        jid: string,
        limit: number = 10,
        hours: number = 4
    ): Promise<ConversationMessage[]> {
        // Calculate cutoff time (NOW - X hours)
        const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        const { data, error } = await this.client
            .from('conversation_history')
            .select('*')
            .eq('bot_instance_id', botId)
            .eq('remote_jid', jid)
            .gt('timestamp', cutoffTime) // Only recent messages
            .order('timestamp', { ascending: false }) // Get latest first
            .limit(limit);

        if (error) {
            console.error('Error fetching history:', error);
            return [];
        }

        // Return in chronological order (oldest to newest) for Gemini
        return (data || []).reverse();
    }
}

export interface ConversationMessage {
    id: string;
    bot_instance_id: string;
    remote_jid: string;
    role: 'user' | 'model';
    content: string;
    timestamp: string;
}

export const supabase = new SupabaseService();
