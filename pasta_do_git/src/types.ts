export type MediaType = 'text' | 'image' | 'video' | 'document' | 'audio';

export interface Message {
  id: string;
  text: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  fileName?: string;
  fromMe: boolean; // True = Humano (dono do bot), False = Cliente
  timestamp: Date;
}

export interface Chat {
  id: string; // JID do WhatsApp
  name: string;
  avatarUrl: string;
  messages: Message[];
  isPaused: boolean; // O "Fluxo de Atendimento" controlado pelo banco
  lastInteraction: Date;
  unreadCount: number;
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

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  BOTS = 'BOTS',
  CONFIG = 'CONFIG',
  QRCODE = 'QRCODE',
  SCHEDULING = 'SCHEDULING'
}

export interface ScheduledMessage {
  id: string;
  bot_instance_id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_text: string;
  attachment_url: string | null;
  scheduled_for: string;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly';
  recurrence_day: number | null;
  recurrence_weekday: number | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  bot_instance_id: string;
  name: string;
  category: string | null;
  message_text: string;
  variables: string[] | null;
  created_at: string;
  updated_at: string;
}