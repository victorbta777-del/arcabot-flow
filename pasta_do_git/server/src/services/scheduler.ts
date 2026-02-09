import * as cron from 'node-cron';
import { supabase } from '../database/supabase.js';
import { BaileysManager } from '../baileys/BaileysManager.js';

interface ScheduledMessage {
    id: string;
    bot_instance_id: string;
    recipient_phone: string;
    recipient_name: string;
    message_text: string;
    attachment_url: string | null;
    scheduled_for: string;
    recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly';
    recurrence_day: number | null;
    recurrence_weekday: number | null;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export class SchedulerService {
    private baileysManager: BaileysManager;
    private cronJob: cron.ScheduledTask | null = null;

    constructor(baileysManager: BaileysManager) {
        this.baileysManager = baileysManager;
    }

    start() {
        console.log('📅 Scheduler service started');

        // Executa a cada minuto
        this.cronJob = cron.schedule('* * * * *', async () => {
            await this.processScheduledMessages();
        });
    }

    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            console.log('📅 Scheduler service stopped');
        }
    }

    private async processScheduledMessages() {
        try {
            const now = new Date();

            // Buscar mensagens pendentes que devem ser enviadas agora
            const { data: messages, error } = await supabase.getClient()
                .from('scheduled_messages')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_for', now.toISOString())
                .order('scheduled_for', { ascending: true });

            if (error) {
                console.error('Error fetching scheduled messages:', error);
                return;
            }

            if (!messages || messages.length === 0) {
                return;
            }

            console.log(`📨 Processing ${messages.length} scheduled message(s)`);

            for (const message of messages as ScheduledMessage[]) {
                await this.sendScheduledMessage(message);
            }
        } catch (error) {
            console.error('Error in scheduler:', error);
        }
    }

    private async sendScheduledMessage(message: ScheduledMessage) {
        try {
            const connection = this.baileysManager.getConnection(message.bot_instance_id);

            if (!connection) {
                throw new Error(`Bot ${message.bot_instance_id} not connected`);
            }

            // Formatar número para JID do WhatsApp
            const jid = message.recipient_phone.includes('@')
                ? message.recipient_phone
                : `${message.recipient_phone.replace(/\D/g, '')}@s.whatsapp.net`;

            // Enviar mensagem com ou sem anexo
            if (message.attachment_url) {
                // Enviar arquivo
                const fs = await import('fs');
                const path = await import('path');
                const { fileURLToPath } = await import('url');
                const { dirname } = await import('path');

                const __filename = fileURLToPath(import.meta.url);
                const __dirname = dirname(__filename);

                const filePath = path.join(__dirname, '../../', message.attachment_url);

                if (fs.existsSync(filePath)) {
                    // Detectar mimetype baseado na extensão
                    const ext = path.extname(filePath).toLowerCase();
                    let mimetype = 'application/octet-stream';
                    if (ext === '.pdf') mimetype = 'application/pdf';
                    else if (['.jpg', '.jpeg'].includes(ext)) mimetype = 'image/jpeg';
                    else if (ext === '.png') mimetype = 'image/png';
                    else if (ext === '.doc') mimetype = 'application/msword';
                    else if (ext === '.docx') mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                    else if (ext === '.xls') mimetype = 'application/vnd.ms-excel';
                    else if (ext === '.xlsx') mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

                    await connection.socket.sendMessage(jid, {
                        document: fs.readFileSync(filePath),
                        mimetype,
                        fileName: path.basename(filePath),
                        caption: message.message_text
                    });
                } else {
                    throw new Error('Arquivo anexo não encontrado');
                }
            } else {
                // Enviar apenas texto
                await connection.socket.sendMessage(jid, { text: message.message_text });
            }

            console.log(`✅ Sent scheduled message to ${message.recipient_name || message.recipient_phone}`);

            // Atualizar status para 'sent'
            await supabase.getClient()
                .from('scheduled_messages')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                .eq('id', message.id);

            // Processar recorrência
            if (message.recurrence_type !== 'once') {
                await this.createRecurringMessage(message);
            }
        } catch (error) {
            console.error(`❌ Failed to send message ${message.id}:`, error);

            // Atualizar status para 'failed'
            await supabase.getClient()
                .from('scheduled_messages')
                .update({
                    status: 'failed',
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                })
                .eq('id', message.id);
        }
    }

    private async createRecurringMessage(originalMessage: ScheduledMessage) {
        try {
            const scheduledFor = new Date(originalMessage.scheduled_for);
            let nextScheduledFor: Date;

            switch (originalMessage.recurrence_type) {
                case 'daily':
                    nextScheduledFor = new Date(scheduledFor);
                    nextScheduledFor.setDate(nextScheduledFor.getDate() + 1);
                    break;

                case 'weekly':
                    nextScheduledFor = new Date(scheduledFor);
                    nextScheduledFor.setDate(nextScheduledFor.getDate() + 7);
                    break;

                case 'monthly':
                    nextScheduledFor = new Date(scheduledFor);
                    nextScheduledFor.setMonth(nextScheduledFor.getMonth() + 1);

                    // Se o dia especificado não existe no próximo mês, usar último dia
                    if (originalMessage.recurrence_day) {
                        const lastDayOfMonth = new Date(
                            nextScheduledFor.getFullYear(),
                            nextScheduledFor.getMonth() + 1,
                            0
                        ).getDate();

                        nextScheduledFor.setDate(
                            Math.min(originalMessage.recurrence_day, lastDayOfMonth)
                        );
                    }
                    break;

                default:
                    return;
            }

            // Criar novo agendamento
            await supabase.getClient()
                .from('scheduled_messages')
                .insert({
                    bot_instance_id: originalMessage.bot_instance_id,
                    recipient_phone: originalMessage.recipient_phone,
                    recipient_name: originalMessage.recipient_name,
                    message_text: originalMessage.message_text,
                    attachment_url: originalMessage.attachment_url,
                    scheduled_for: nextScheduledFor.toISOString(),
                    recurrence_type: originalMessage.recurrence_type,
                    recurrence_day: originalMessage.recurrence_day,
                    recurrence_weekday: originalMessage.recurrence_weekday,
                    status: 'pending'
                });

            console.log(`🔄 Created recurring message for ${nextScheduledFor.toISOString()}`);
        } catch (error) {
            console.error('Error creating recurring message:', error);
        }
    }
}
