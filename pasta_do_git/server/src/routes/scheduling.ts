import express from 'express';
import { supabase } from '../database/supabase.js';

export const createSchedulingRoutes = () => {
    const router = express.Router();

    // Listar agendamentos
    router.get('/messages', async (req, res) => {
        try {
            const { botId, status } = req.query;

            let query = supabase.getClient()
                .from('scheduled_messages')
                .select('*')
                .order('scheduled_for', { ascending: true });

            if (botId) {
                query = query.eq('bot_instance_id', botId);
            }

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error('Error fetching scheduled messages:', error);
            res.status(500).json({ error: 'Failed to fetch scheduled messages' });
        }
    });

    // Criar agendamento
    router.post('/messages', async (req, res) => {
        try {
            const {
                bot_instance_id,
                recipient_phone,
                recipient_name,
                message_text,
                attachment_url,
                scheduled_for,
                recurrence_type,
                recurrence_day,
                recurrence_weekday
            } = req.body;

            // Validações
            if (!bot_instance_id || !recipient_phone || !message_text || !scheduled_for) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const { data, error } = await supabase.getClient()
                .from('scheduled_messages')
                .insert({
                    bot_instance_id,
                    recipient_phone,
                    recipient_name,
                    message_text,
                    attachment_url,
                    scheduled_for,
                    recurrence_type: recurrence_type || 'once',
                    recurrence_day,
                    recurrence_weekday,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json(data);
        } catch (error) {
            console.error('Error creating scheduled message:', error);
            res.status(500).json({ error: 'Failed to create scheduled message' });
        }
    });

    // Editar agendamento
    router.put('/messages/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Não permitir editar mensagens já enviadas
            const { data: existing } = await supabase.getClient()
                .from('scheduled_messages')
                .select('status')
                .eq('id', id)
                .single();

            if (existing?.status !== 'pending') {
                return res.status(400).json({ error: 'Cannot edit non-pending messages' });
            }

            const { data, error } = await supabase.getClient()
                .from('scheduled_messages')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error('Error updating scheduled message:', error);
            res.status(500).json({ error: 'Failed to update scheduled message' });
        }
    });

    // Cancelar agendamento
    router.delete('/messages/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase.getClient()
                .from('scheduled_messages')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (error) throw error;

            res.json({ message: 'Scheduled message cancelled' });
        } catch (error) {
            console.error('Error cancelling scheduled message:', error);
            res.status(500).json({ error: 'Failed to cancel scheduled message' });
        }
    });

    // Listar templates
    router.get('/templates', async (req, res) => {
        try {
            const { botId } = req.query;

            let query = supabase.getClient()
                .from('message_templates')
                .select('*')
                .order('created_at', { ascending: false });

            if (botId) {
                query = query.eq('bot_instance_id', botId);
            }

            const { data, error } = await query;

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ error: 'Failed to fetch templates' });
        }
    });

    // Criar template
    router.post('/templates', async (req, res) => {
        try {
            const { bot_instance_id, name, category, message_text, variables } = req.body;

            if (!bot_instance_id || !name || !message_text) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const { data, error } = await supabase.getClient()
                .from('message_templates')
                .insert({
                    bot_instance_id,
                    name,
                    category,
                    message_text,
                    variables
                })
                .select()
                .single();

            if (error) throw error;

            res.status(201).json(data);
        } catch (error) {
            console.error('Error creating template:', error);
            res.status(500).json({ error: 'Failed to create template' });
        }
    });

    // Editar template
    router.put('/templates/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const { data, error } = await supabase.getClient()
                .from('message_templates')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            res.json(data);
        } catch (error) {
            console.error('Error updating template:', error);
            res.status(500).json({ error: 'Failed to update template' });
        }
    });

    // Deletar template
    router.delete('/templates/:id', async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = await supabase.getClient()
                .from('message_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;

            res.json({ message: 'Template deleted' });
        } catch (error) {
            console.error('Error deleting template:', error);
            res.status(500).json({ error: 'Failed to delete template' });
        }
    });

    return router;
};
