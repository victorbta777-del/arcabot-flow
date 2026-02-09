import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  QrCode,
  Bot,
  Smartphone,
  CheckCircle2,
  Menu,
  X,
  Power,
  Battery,
  Signal,
  Trash2,
  Plus,
  Loader2,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { api, BotInstance, BotConfig } from './services/api';
import { ViewState } from './types';
import { socketService, QRCodeEvent, BotStatusEvent } from './services/socketService';
import { Scheduling } from './components/Scheduling';

const MOCK_STATS = [
  { name: 'Seg', messages: 400, active: 240 },
  { name: 'Ter', messages: 300, active: 139 },
  { name: 'Qua', messages: 200, active: 980 },
  { name: 'Qui', messages: 278, active: 390 },
  { name: 'Sex', messages: 189, active: 480 },
];

// --- COMPONENTS ---

// Sidebar Component
const Sidebar = ({ currentView, setView, isMobileOpen, setIsMobileOpen }: {
  currentView: ViewState,
  setView: (v: ViewState) => void,
  isMobileOpen: boolean,
  setIsMobileOpen: (v: boolean) => void
}) => {
  const menuItems = [
    { id: ViewState.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
    { id: ViewState.BOTS, icon: Bot, label: 'Meus Bots' },
    { id: ViewState.CONFIG, icon: Settings, label: 'Configuração' },
    { id: ViewState.QRCODE, icon: QrCode, label: 'Conexão' },
    { id: ViewState.SCHEDULING, icon: Calendar, label: 'Agendamentos' },
  ];

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-obsidian-900/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`
        bg-obsidian-900 text-sand-50 shadow-xl w-64 h-full
        ${isMobileOpen ? 'fixed top-0 left-0 z-50 translate-x-0' : 'hidden md:block'}
      `}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-wider">ARCA<span className="text-blue-400">BOT</span></h1>
            <p className="text-xs text-gray-400">Automation Flow</p>
          </div>
          <button onClick={() => setIsMobileOpen(false)} className="md:hidden text-gray-400">
            <X size={24} />
          </button>
        </div>
        <nav className="mt-8 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                console.log('Clicked:', item.label);
                setView(item.id);
                setIsMobileOpen(false);
              }}
              className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 cursor-pointer ${currentView === item.id
                ? 'bg-deepBlue-800 text-white shadow-lg border-l-4 border-blue-400'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
            >
              <item.icon className="mr-3" size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 text-gray-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Sistema Online
          </div>
        </div>
      </aside>
    </>
  );
};

// Dashboard Component
const Dashboard = ({ bots }: { bots: BotInstance[] }) => {
  const onlineBots = bots.filter(b => b.status === 'ONLINE').length;
  const totalBots = bots.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-deepBlue-900">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Instâncias Ativas</h3>
            <Bot className="text-deepBlue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-deepBlue-900">{onlineBots}</p>
          <p className="text-gray-400 text-xs mt-2">de {totalBots} total</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Status</h3>
            <CheckCircle2 className="text-green-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-deepBlue-900">OK</p>
          <p className="text-green-600 text-xs mt-2">Todos operacionais</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Conexões</h3>
            <Signal className="text-blue-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-deepBlue-900">{totalBots}</p>
          <p className="text-gray-400 text-xs mt-2">WhatsApp conectados</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 text-sm font-medium">Tempo Resposta</h3>
            <Settings className="text-purple-500" size={24} />
          </div>
          <p className="text-3xl font-bold text-deepBlue-900">1.2s</p>
          <p className="text-gray-400 text-xs mt-2">Média (Bot)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <h3 className="text-lg font-semibold text-deepBlue-800 mb-4">Volume de Mensagens</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_STATS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="messages" fill="#1e3a8a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <h3 className="text-lg font-semibold text-deepBlue-800 mb-4">Bots Ativos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_STATS}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Line type="monotone" dataKey="active" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Bot Manager Component
const BotManager = ({
  bots,
  onCreateBot,
  onDeleteBot,
  onToggleBot,
  isCreating
}: {
  bots: BotInstance[],
  onCreateBot: (name: string) => void,
  onDeleteBot: (id: string) => void,
  onToggleBot: (id: string) => void,
  isCreating: boolean
}) => {
  const [newBotName, setNewBotName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = () => {
    if (newBotName.trim()) {
      onCreateBot(newBotName);
      setNewBotName('');
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-deepBlue-900">Gerenciamento de Bots</h2>
          <p className="text-gray-500">Controle suas instâncias do WhatsApp (Multi-Device).</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-deepBlue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-deepBlue-700 transition"
        >
          <Plus size={18} />
          Nova Instância
        </button>
      </div>

      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
          <h3 className="font-semibold text-deepBlue-800 mb-4">Criar Nova Instância</h3>
          <div className="flex gap-4">
            <input
              type="text"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              placeholder="Nome da instância (ex: Atendimento Principal)"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newBotName.trim()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar'
              )}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map(bot => (
          <div key={bot.id} className="bg-white rounded-xl shadow-sm border border-sand-200 overflow-hidden relative">
            <div className={`h-2 w-full ${bot.status === 'ONLINE' ? 'bg-green-500' :
              bot.status === 'PAUSED' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center text-deepBlue-900">
                  <Bot size={24} />
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${bot.status === 'ONLINE' ? 'bg-green-100 text-green-700' :
                    bot.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {bot.status}
                  </span>
                </div>
              </div>

              <h3 className="font-bold text-lg text-deepBlue-900">{bot.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{bot.phone_number || 'Aguardando conexão...'}</p>

              <div className="flex items-center gap-4 text-xs text-gray-400 mb-6">
                <div className="flex items-center gap-1">
                  <Battery size={14} className={bot.battery_level < 20 ? 'text-red-500' : 'text-green-500'} />
                  {bot.battery_level}%
                </div>
                <div className="flex items-center gap-1">
                  <Signal size={14} className="text-deepBlue-500" />
                  Bom
                </div>
                {bot.last_sync && (
                  <div>
                    Sync: {new Date(bot.last_sync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-sand-100">
                <button
                  onClick={() => onToggleBot(bot.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${bot.status === 'ONLINE'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                >
                  <Power size={16} />
                  {bot.status === 'ONLINE' ? 'Pausar' : 'Iniciar'}
                </button>
                <button
                  onClick={() => onDeleteBot(bot.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {bots.length === 0 && !showCreateForm && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-sand-200 text-center">
          <Bot size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nenhum bot criado ainda</h3>
          <p className="text-gray-500 mb-6">Crie sua primeira instância para começar</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-deepBlue-800 text-white px-6 py-3 rounded-lg hover:bg-deepBlue-700 transition inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Criar Primeira Instância
          </button>
        </div>
      )}
    </div>
  );
};

// Configuration Component (simplified)
const Configuration = ({
  selectedBotId,
  bots,
  onUpdateConfig
}: {
  selectedBotId: string | null,
  bots: BotInstance[],
  onUpdateConfig: (botId: string, config: Partial<BotConfig>) => void
}) => {
  const [config, setConfig] = useState<Partial<BotConfig>>({
    welcome_message: '',
    fallback_message: 'Desculpe, não entendi. Um humano irá atendê-lo em breve.',
    inactivity_timer_minutes: 30,
    auto_reply_enabled: true,
    gemini_integration_enabled: false,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedBot, setSelectedBot] = useState(selectedBotId);

  useEffect(() => {
    if (selectedBot && bots.length > 0) {
      const bot = bots.find(b => b.id === selectedBot);
      if (bot?.config) {
        setConfig(bot.config);
      }
    }
  }, [selectedBot, bots]);

  const handleGenerateAI = async (field: 'welcome' | 'fallback') => {
    setIsGenerating(true);
    const context = field === 'welcome'
      ? "mensagem de boas vindas para uma empresa de engenharia e software chamada Arca"
      : "mensagem de fallback quando o bot não entende a intenção do usuário";

    try {
      const suggestion = await api.generateSuggestion(context);

      if (field === 'welcome') {
        setConfig(prev => ({ ...prev, welcome_message: suggestion }));
      } else {
        setConfig(prev => ({ ...prev, fallback_message: suggestion }));
      }
    } catch (error) {
      console.error('Error generating AI suggestion:', error);
      alert('Erro ao gerar sugestão. Verifique a chave de API no backend.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (selectedBot) {
      onUpdateConfig(selectedBot, config);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-deepBlue-900">Parametrização do Bot</h2>
          <p className="text-gray-500">Configure como seu assistente responde e se comporta.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={!selectedBot}
          className="bg-deepBlue-800 text-white px-6 py-2 rounded-lg hover:bg-deepBlue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Settings size={18} />
          Salvar Alterações
        </button>
      </div>

      {/* Bot Selector */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-sand-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Selecionar Bot
        </label>
        <select
          value={selectedBot || ''}
          onChange={(e) => setSelectedBot(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent"
        >
          <option value="">Selecione um bot...</option>
          {bots.map(bot => (
            <option key={bot.id} value={bot.id}>{bot.name}</option>
          ))}
        </select>
      </div>

      {selectedBot && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-sand-200 overflow-hidden">
            <div className="p-6 border-b border-sand-100 bg-sand-50">
              <h3 className="font-semibold text-deepBlue-800 flex items-center gap-2">
                <Bot size={20} />
                Mensagens Automáticas
              </h3>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personalidade / Contexto do Bot (Instrução do Sistema)
                </label>
                <textarea
                  value={config.system_instruction || ''}
                  onChange={(e) => setConfig({ ...config, system_instruction: e.target.value })}
                  className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent bg-white text-gray-800 resize-none mb-1"
                  placeholder="Ex: Você é um assistente virtual da ArcaPizza. Seja amigável e use emojis. O cardápio é..."
                />
                <p className="text-xs text-gray-400">Define como a IA deve se comportar e o que ela deve saber.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Boas-vindas
                </label>
                <div className="relative">
                  <textarea
                    value={config.welcome_message || ''}
                    onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent bg-white text-gray-800 resize-none"
                    placeholder="Ex: Olá! Bem-vindo à Arca..."
                  />
                  <button
                    onClick={() => handleGenerateAI('welcome')}
                    disabled={isGenerating}
                    className="absolute bottom-4 right-4 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition"
                  >
                    {isGenerating ? 'Gerando...' : (
                      <>✨ Gerar com IA</>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Enviada na primeira interação do dia.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Fallback (Não entendido)
                </label>
                <div className="relative">
                  <textarea
                    value={config.fallback_message || ''}
                    onChange={(e) => setConfig({ ...config, fallback_message: e.target.value })}
                    className="w-full h-24 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent bg-white text-gray-800 resize-none"
                  />
                  <button
                    onClick={() => handleGenerateAI('fallback')}
                    disabled={isGenerating}
                    className="absolute bottom-4 right-4 text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition"
                  >
                    {isGenerating ? 'Gerando...' : (
                      <>✨ Gerar com IA</>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-sand-50 rounded-lg border border-sand-200">
                <div>
                  <span className="font-medium text-gray-800">Resposta Automática</span>
                  <p className="text-sm text-gray-500">Ativar bot para responder automaticamente</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.auto_reply_enabled || false}
                  onChange={e => setConfig({ ...config, auto_reply_enabled: e.target.checked })}
                  className="w-5 h-5 text-deepBlue-600 rounded border-gray-300 focus:ring-deepBlue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-sand-50 rounded-lg border border-sand-200">
                <div>
                  <span className="font-medium text-gray-800">Integração Gemini AI</span>
                  <p className="text-sm text-gray-500">Usar IA para respostas mais inteligentes</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.gemini_integration_enabled || false}
                  onChange={e => setConfig({ ...config, gemini_integration_enabled: e.target.checked })}
                  className="w-5 h-5 text-deepBlue-600 rounded border-gray-300 focus:ring-deepBlue-500"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-sand-50 rounded-lg border border-sand-200">
                <div>
                  <span className="font-medium text-gray-800">Ignorar Grupos</span>
                  <p className="text-sm text-gray-500">Quando ativado, o bot responderá apenas em conversas individuais</p>
                </div>
                <input
                  type="checkbox"
                  checked={config.ignore_groups || false}
                  onChange={e => setConfig({ ...config, ignore_groups: e.target.checked })}
                  className="w-5 h-5 text-deepBlue-600 rounded border-gray-300 focus:ring-deepBlue-500"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedBot && (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-sand-200 text-center">
          <Settings size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Selecione um bot</h3>
          <p className="text-gray-500">Escolha um bot acima para configurar</p>
        </div>
      )}
    </div>
  );
};

// Connection Component
const Connection = ({
  bots,
  qrCodes
}: {
  bots: BotInstance[],
  qrCodes: Map<string, string>
}) => {
  const [selectedBotId, setSelectedBotId] = useState<string>('');

  const selectedBot = bots.find(b => b.id === selectedBotId);
  const qrCode = selectedBotId ? qrCodes.get(selectedBotId) : null;

  // Request QR code when bot is selected
  useEffect(() => {
    if (selectedBotId && !qrCode) {
      console.log('Requesting QR code for bot:', selectedBotId);
      socketService.requestQR(selectedBotId);
    }
  }, [selectedBotId, qrCode]);

  const handleRequestQR = async () => {
    if (selectedBotId) {
      console.log('Manually requesting QR code (RESET) for bot:', selectedBotId);
      try {
        await api.resetQR(selectedBotId);
        // Also emit socket event just in case
        socketService.requestQR(selectedBotId);
      } catch (error) {
        console.error('Error requesting QR reset:', error);
        alert('Erro ao solicitar novo QR Code');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-sand-200 max-w-md w-full text-center">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecionar Bot para Conectar
          </label>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-deepBlue-500 focus:border-transparent"
          >
            <option value="">Selecione um bot...</option>
            {bots.map(bot => (
              <option key={bot.id} value={bot.id}>
                {bot.name} - {bot.status}
              </option>
            ))}
          </select>
        </div>

        {selectedBot && (
          <>
            <div className="mb-6 flex justify-center">
              <div className={`p-4 rounded-full ${selectedBot.status === 'ONLINE' ? 'bg-green-100' : 'bg-sand-100'}`}>
                {selectedBot.status === 'ONLINE' ?
                  <CheckCircle2 className="text-green-600" size={48} /> :
                  <QrCode className="text-deepBlue-900" size={48} />
                }
              </div>
            </div>

            <h2 className="text-2xl font-bold text-deepBlue-900 mb-2">
              {selectedBot.status === 'ONLINE' ? 'Conectado com Sucesso!' : 'Conectar WhatsApp'}
            </h2>

            <p className="text-gray-500 mb-8">
              {selectedBot.status === 'ONLINE'
                ? 'Seu bot está ativo e escutando mensagens. O Baileys está sincronizado.'
                : 'Abra o WhatsApp no seu celular, vá em Menu > Aparelhos Conectados e escaneie o código.'}
            </p>

            {selectedBot.status !== 'ONLINE' && qrCode && (
              <div className="bg-white p-4 border-2 border-deepBlue-900 rounded-xl inline-block mb-6">
                <img src={qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
            )}

            {selectedBot.status !== 'ONLINE' && !qrCode && (
              <div className="space-y-4">
                <div className="bg-white p-4 border-2 border-gray-300 rounded-xl inline-block mb-6">
                  <div className="w-64 h-64 flex items-center justify-center">
                    <Loader2 className="animate-spin text-deepBlue-900" size={48} />
                  </div>
                </div>
                <button
                  onClick={handleRequestQR}
                  className="bg-deepBlue-800 text-white px-6 py-2 rounded-lg hover:bg-deepBlue-700 transition"
                >
                  Solicitar QR Code
                </button>
                <p className="text-xs text-gray-400">Aguardando QR code do servidor...</p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Smartphone size={14} />
              <span>Versão Baileys Multi-Device (MD)</span>
            </div>
          </>
        )}

        {!selectedBot && (
          <div className="py-12">
            <QrCode size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Selecione um bot acima para ver o QR code</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- APP SHELL ---
export default function App() {
  const [currentView, setView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());

  // Load bots on mount
  useEffect(() => {
    loadBots();

    // Connect WebSocket
    socketService.connect();

    // Listen for QR codes
    socketService.on('qr-code', (data: QRCodeEvent) => {
      console.log('QR Code received for bot:', data.botId);
      setQrCodes(prev => new Map(prev).set(data.botId, data.qr));
    });

    // Listen for status changes
    socketService.on('bot-status-change', (data: BotStatusEvent) => {
      console.log('Bot status changed:', data);
      setBots(prev => prev.map(bot =>
        bot.id === data.botId ? { ...bot, status: data.status } : bot
      ));
    });

    return () => {
      socketService.disconnect();
    };
  }, []);

  const loadBots = async () => {
    try {
      const data = await api.getAllBots();
      setBots(data);
    } catch (error) {
      console.error('Error loading bots:', error);
    }
  };

  const handleCreateBot = async (name: string) => {
    setIsCreating(true);
    try {
      const newBot = await api.createBot(name);
      setBots(prev => [...prev, newBot]);
      console.log('Bot created:', newBot);
    } catch (error) {
      console.error('Error creating bot:', error);
      alert('Erro ao criar bot. Verifique o console.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBot = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este bot?')) {
      try {
        await api.deleteBot(id);
        setBots(prev => prev.filter(b => b.id !== id));
        setQrCodes(prev => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      } catch (error) {
        console.error('Error deleting bot:', error);
        alert('Erro ao deletar bot. Verifique o console.');
      }
    }
  };

  const handleToggleBot = async (id: string) => {
    try {
      const updatedBot = await api.toggleBot(id);
      setBots(prev => prev.map(b => b.id === id ? updatedBot : b));
    } catch (error) {
      console.error('Error toggling bot:', error);
      alert('Erro ao alternar status do bot. Verifique o console.');
    }
  };

  const handleUpdateConfig = async (botId: string, config: Partial<BotConfig>) => {
    try {
      const updatedConfig = await api.updateBotConfig(botId, config);
      setBots(prev => prev.map(b =>
        b.id === botId ? { ...b, config: updatedConfig } : b
      ));
      alert('Configuração salva com sucesso!');
    } catch (error) {
      console.error('Error updating config:', error);
      alert('Erro ao salvar configuração. Verifique o console.');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f7f7f5] text-obsidian-900 font-sans">
      <Sidebar
        currentView={currentView}
        setView={setView}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-obsidian-900 text-white p-4 flex justify-between items-center shadow-md z-30">
          <span className="font-bold">ARCA<span className="text-blue-400">BOT</span></span>
          <button onClick={() => setIsMobileOpen(true)}>
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          {currentView === ViewState.DASHBOARD && <Dashboard bots={bots} />}
          {currentView === ViewState.BOTS && (
            <BotManager
              bots={bots}
              onCreateBot={handleCreateBot}
              onDeleteBot={handleDeleteBot}
              onToggleBot={handleToggleBot}
              isCreating={isCreating}
            />
          )}
          {currentView === ViewState.CONFIG && (
            <Configuration
              selectedBotId={bots[0]?.id || null}
              bots={bots}
              onUpdateConfig={handleUpdateConfig}
            />
          )}
          {currentView === ViewState.QRCODE && (
            <Connection
              bots={bots}
              qrCodes={qrCodes}
            />
          )}

          {currentView === ViewState.SCHEDULING && (
            <Scheduling bots={bots} />
          )}
        </main>
      </div>
    </div>
  );
}