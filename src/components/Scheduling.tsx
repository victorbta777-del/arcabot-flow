import { useState, useEffect } from 'react';
import { Calendar, Clock, Send, Trash2, Plus, Edit2, X, Check } from 'lucide-react';
import { api } from '../services/api';
import type { ScheduledMessage, MessageTemplate, BotInstance } from '../types';

interface SchedulingProps {
    bots: BotInstance[];
}

export function Scheduling({ bots }: SchedulingProps) {
    const [messages, setMessages] = useState<ScheduledMessage[]>([]);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [selectedBot, setSelectedBot] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('pending');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        recipient_phone: '',
        recipient_name: '',
        message_text: '',
        attachment_url: '',
        scheduled_for: '',
        recurrence_type: 'once' as 'once' | 'daily' | 'weekly' | 'monthly',
        recurrence_day: null as number | null,
    });

    useEffect(() => {
        if (bots.length > 0 && !selectedBot) {
            setSelectedBot(bots[0].id);
        }
    }, [bots]);

    useEffect(() => {
        if (selectedBot) {
            loadMessages();
            loadTemplates();
        }
    }, [selectedBot, statusFilter]);

    const loadMessages = async () => {
        try {
            setLoading(true);
            const data = await api.getScheduledMessages(selectedBot, statusFilter);
            setMessages(data);
        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        try {
            const data = await api.getTemplates(selectedBot);
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBot) return;

        try {
            await api.createScheduledMessage({
                bot_instance_id: selectedBot,
                ...formData,
            });
            setShowForm(false);
            setFormData({
                recipient_phone: '',
                recipient_name: '',
                message_text: '',
                attachment_url: '',
                scheduled_for: '',
                recurrence_type: 'once',
                recurrence_day: null,
            });
            loadMessages();
        } catch (error) {
            console.error('Error creating scheduled message:', error);
            alert('Erro ao criar agendamento');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancelar este agendamento?')) return;

        try {
            await api.cancelScheduledMessage(id);
            loadMessages();
        } catch (error) {
            console.error('Error cancelling message:', error);
            alert('Erro ao cancelar agendamento');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('pt-BR');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'sent': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendente';
            case 'sent': return 'Enviado';
            case 'failed': return 'Falhou';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    const stats = {
        pending: messages.filter(m => m.status === 'pending').length,
        sent: messages.filter(m => m.status === 'sent').length,
        failed: messages.filter(m => m.status === 'failed').length,
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Agendamentos</h2>
                    <p className="text-gray-600">Gerencie envios programados de mensagens</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    {showForm ? <X size={20} /> : <Plus size={20} />}
                    {showForm ? 'Cancelar' : 'Novo Agendamento'}
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-yellow-600">Pendentes</p>
                            <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
                        </div>
                        <Clock className="text-yellow-600" size={32} />
                    </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-green-600">Enviados</p>
                            <p className="text-2xl font-bold text-green-900">{stats.sent}</p>
                        </div>
                        <Check className="text-green-600" size={32} />
                    </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-red-600">Falhas</p>
                            <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
                        </div>
                        <X className="text-red-600" size={32} />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <select
                    value={selectedBot}
                    onChange={(e) => setSelectedBot(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    {bots.map((bot) => (
                        <option key={bot.id} value={bot.id}>
                            {bot.name}
                        </option>
                    ))}
                </select>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="">Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="sent">Enviados</option>
                    <option value="failed">Falhas</option>
                    <option value="cancelled">Cancelados</option>
                </select>
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h3 className="text-lg font-semibold mb-4">Novo Agendamento</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Telefone *
                                </label>
                                <input
                                    type="text"
                                    value={formData.recipient_phone}
                                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                                    placeholder="5511999999999"
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    value={formData.recipient_name}
                                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                                    placeholder="João Silva"
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mensagem *
                            </label>
                            <textarea
                                value={formData.message_text}
                                onChange={(e) => setFormData({ ...formData, message_text: e.target.value })}
                                placeholder="Digite a mensagem..."
                                rows={4}
                                className="w-full px-3 py-2 border rounded-lg"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Anexo (Opcional)
                            </label>
                            <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        if (file.size > 10 * 1024 * 1024) {
                                            alert('Arquivo muito grande! Máximo 10MB');
                                            e.target.value = '';
                                            return;
                                        }

                                        try {
                                            const formDataUpload = new FormData();
                                            formDataUpload.append('file', file);

                                            const response = await fetch('http://localhost:3001/api/upload/file', {
                                                method: 'POST',
                                                body: formDataUpload,
                                            });

                                            if (!response.ok) throw new Error('Falha no upload');

                                            const data = await response.json();
                                            setFormData({ ...formData, attachment_url: data.url });
                                            alert('Arquivo enviado com sucesso!');
                                        } catch (error) {
                                            console.error('Error uploading file:', error);
                                            alert('Erro ao fazer upload do arquivo');
                                            e.target.value = '';
                                        }
                                    }
                                }}
                                className="w-full px-3 py-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                PDF, Imagens, Documentos - Máximo 10MB
                            </p>
                            {formData.attachment_url && (
                                <div className="flex items-center gap-2 mt-2">
                                    <p className="text-xs text-green-600">
                                        ✓ Arquivo anexado: {formData.attachment_url.split('/').pop()}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, attachment_url: '' });
                                            // Limpar o input file
                                            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
                                            if (fileInput) fileInput.value = '';
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800 underline"
                                    >
                                        Remover
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Data e Hora *
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduled_for}
                                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Recorrência
                                </label>
                                <select
                                    value={formData.recurrence_type}
                                    onChange={(e) => setFormData({ ...formData, recurrence_type: e.target.value as any })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="once">Apenas uma vez</option>
                                    <option value="daily">Diário</option>
                                    <option value="weekly">Semanal</option>
                                    <option value="monthly">Mensal</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Agendar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Messages List */}
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="p-4 border-b">
                    <h3 className="font-semibold">Agendamentos</h3>
                </div>
                <div className="divide-y">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Carregando...</div>
                    ) : messages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Nenhum agendamento encontrado
                        </div>
                    ) : (
                        messages.map((message) => (
                            <div key={message.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="font-medium">{message.recipient_name || message.recipient_phone}</span>
                                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(message.status)}`}>
                                                {getStatusLabel(message.status)}
                                            </span>
                                            {message.recurrence_type !== 'once' && (
                                                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                                    {message.recurrence_type === 'daily' && 'Diário'}
                                                    {message.recurrence_type === 'weekly' && 'Semanal'}
                                                    {message.recurrence_type === 'monthly' && 'Mensal'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">{message.message_text}</p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {formatDate(message.scheduled_for)}
                                            </span>
                                            {message.sent_at && (
                                                <span className="flex items-center gap-1">
                                                    <Send size={14} />
                                                    Enviado: {formatDate(message.sent_at)}
                                                </span>
                                            )}
                                        </div>
                                        {message.error_message && (
                                            <p className="text-xs text-red-600 mt-2">Erro: {message.error_message}</p>
                                        )}
                                    </div>
                                    {message.status === 'pending' && (
                                        <button
                                            onClick={() => handleCancel(message.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            title="Cancelar"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
