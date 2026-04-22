import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Send, Cpu, Database, Loader2, Zap, Trash2, BookOpen } from 'lucide-react';
import { useMutation, useQuery, useApolloClient } from '@apollo/client/react';
import { ASK_PALANTIR, GET_ADMIN_CHAT_LOGS, GET_CHAT_LOG } from '../../api/graphql';

interface Message {
  id: string;
  type: 'user' | 'system';
  content: string;
  status?: 'pending' | 'completed' | 'failed';
  timestamp?: number;
}

interface AdminChatLog {
  id: string;
  queryText: string;
  aiResponseText?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminChatLogsData {
  adminChatLogs: AdminChatLog[];
}

const ADMIN_ID = "00000000-0000-0000-0000-000000000000";
const OLLAMA_URL = 'http://localhost:11434';
const CHAT_STORAGE_KEY = 'palantir_chat_history';

const QUICK_COMMANDS = [
  { label: 'Anomali Tespiti', cmd: 'Son 6 saatte hiçbir aktivite göstermeyen katılımcıları bul ve nedenlerini analiz et.' },
  { label: 'Stres Raporu', cmd: 'Bugün stres endeksi en yüksek olan 5 katılımcıyı listele ve backspace oranlarını analiz et.' },
  { label: 'Grup Dinamiği', cmd: 'Tüm grupların uyum skorlarını karşılaştır ve çatışma riski olan grupları belirle.' },
  { label: 'İzolasyon Kontrolü', cmd: 'Neo4j ağında kimseyle bağlantı kurmamış izole düğümleri tespit et.' },
  { label: 'Etkinlik Raporu', cmd: 'Bugünkü tüm etkinliklerin katılım oranlarını ve duygu analizini özetle.' },
];

export default function PalantirChat() {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: '1', type: 'system', content: 'V-RAG Terminal v3.0.0 — Production Mode\n\nÜçlü veri bağlamı aktif: Qdrant (Semantik) + Neo4j (Graph) + PostgreSQL (Relational)\nOllama Model: gemma3:4b | Analiz için komut giriniz.', timestamp: Date.now() }
    ];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const client = useApolloClient();

  // Check Ollama health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
        setOllamaOnline(res.ok);
      } catch {
        setOllamaOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100)));
  }, [messages]);

  // GraphQL Hooks (try backend first)
  const { refetch: refetchLogs } = useQuery<AdminChatLogsData>(GET_ADMIN_CHAT_LOGS, {
    variables: { adminId: ADMIN_ID },
    pollInterval: 5000,
    errorPolicy: 'ignore', // Silently ignore backend errors
  });

  const [askPalantir] = useMutation(ASK_PALANTIR, {
    errorPolicy: 'ignore',
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  // Typewriter effect
  const typewriterEffect = useCallback((fullText: string) => {
    setIsTyping(true);
    setTypingText('');
    let i = 0;
    const speed = Math.max(8, Math.min(20, 2000 / fullText.length)); // Adaptive speed
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypingText(prev => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setTypingText('');
        setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          type: 'system',
          content: fullText,
          timestamp: Date.now(),
        }]);
      }
    }, speed);
    return () => clearInterval(interval);
  }, []);

  // Direct Ollama fallback
  const directOllamaQuery = async (query: string): Promise<string> => {
    const systemPrompt = `Sen 'Palantir V-RAG' adlı gelişmiş bir istihbarat ajanısın. 
Gamifiye edilmiş bir gençlik etkinliğinin yapay zeka analiz terminalisin.
Yöneticinin sorularını profesyonel, analitik ve Türkçe olarak yanıtla.
Madde işaretleri kullan. Veri yetersizse bunu belirt.
Her zaman kapsamlı ama özlü ol.`;

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: query,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json();
    return data.response || 'Yanıt alınamadı.';
  };

  const handleSend = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    // Add user message
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: Date.now(),
    }]);
    setInput('');
    setShowCommands(false);
    setIsLoading(true);

    try {
      // 1. Send to Backend (Triggers Redis Task for Worker)
      const result = await askPalantir({
        variables: { input: { query, adminId: ADMIN_ID } }
      });

      const chatId = result.data?.askPalantirAgent?.id;

      if (chatId) {
        // 2. Poll for AI Response (Neo4j + Qdrant RAG mode)
        let attempts = 0;
        const maxAttempts = 120; // 120 seconds max for heavy LLM generation
        let aiResponse = null;

        while (attempts < maxAttempts && !aiResponse) {
          attempts++;
          await new Promise(r => setTimeout(r, 1000)); // Wait 1s
          
          const { data } = await client.query({
            query: GET_CHAT_LOG,
            variables: { id: chatId },
            fetchPolicy: 'network-only'
          });

          if (data?.getChatLog?.aiResponseText) {
            aiResponse = data.getChatLog.aiResponseText;
          }
        }

        if (aiResponse) {
          typewriterEffect(aiResponse);
        } else {
          throw new Error('AI Worker yanıt süresi doldu (Timeout).');
        }
      } else {
        throw new Error('İstihbarat motoru başlatılamadı.');
      }
    } catch (error) {
      console.error('[Palantir] Backend error, falling back to direct:', error);
      // Fallback: Try direct Ollama if backend fails
      if (ollamaOnline) {
        try {
          const directRes = await directOllamaQuery(query);
          typewriterEffect(directRes);
        } catch (ollamaErr) {
          setMessages(prev => [...prev, {
            id: `err-${Date.now()}`,
            type: 'system',
            content: `❌ KRİTİK HATA: İstihbarat motoruna erişilemiyor ve doğrudan analiz başarısız oldu.`,
            timestamp: Date.now(),
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'system',
          content: `❌ SİSTEM HATASI: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
          timestamp: Date.now(),
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([
      { id: '1', type: 'system', content: 'V-RAG Terminal v3.0.0 — Oturum sıfırlandı.\nAnaliz için komut giriniz.', timestamp: Date.now() }
    ]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  return (
    <div className="h-full flex flex-col max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
            <Terminal className="w-6 h-6 text-electric-blue" />
            V-RAG Terminal
            <span className="text-xs font-mono bg-neon-mint/10 text-neon-mint px-2 py-0.5 rounded border border-neon-mint/20">v3.0</span>
          </h1>
          <p className="text-gray-400 text-sm">Yapay Zeka Destekli İstihbarat ve Kök Neden Analizi</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCommands(!showCommands)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-mono bg-dark-surface border border-dark-border rounded-lg text-gray-400 hover:text-electric-blue hover:border-electric-blue/30 transition-all"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Komutlar
          </button>
          <button
            onClick={clearHistory}
            className="p-2 text-gray-500 hover:text-coral-red transition-colors"
            title="Oturumu sıfırla"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Commands */}
      <AnimatePresence>
        {showCommands && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {QUICK_COMMANDS.map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(cmd.cmd)}
                  className="text-left p-3 rounded-lg bg-dark-surface border border-dark-border hover:border-electric-blue/30 hover:bg-electric-blue/5 transition-all text-xs group"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-electric-blue group-hover:text-neon-mint transition-colors" />
                    <span className="text-gray-300 font-medium">{cmd.label}</span>
                  </div>
                  <p className="text-gray-600 line-clamp-1">{cmd.cmd}</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 bg-dark-surface border border-dark-border rounded-xl flex flex-col overflow-hidden shadow-2xl">
        {/* Status Bar */}
        <div className="h-10 bg-[#0d1117] border-b border-dark-border flex items-center px-4 justify-between text-xs font-mono text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <Cpu className={`w-3.5 h-3.5 ${ollamaOnline ? 'text-neon-mint' : ollamaOnline === false ? 'text-coral-red' : 'text-yellow-500'}`} />
              OLLAMA: {ollamaOnline ? 'ONLINE' : ollamaOnline === false ? 'OFFLINE' : 'CHECKING'}
            </span>
            <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-electric-blue" /> TRI-DB: READY</span>
          </div>
          <div className="flex items-center gap-2">
            {(isLoading || isTyping) && <Loader2 className="w-3 h-3 animate-spin text-electric-blue" />}
            MODE: {ollamaOnline ? 'INTELLIGENCE ENGINE (Neo4j + Qdrant)' : 'OFFLINE'}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-sm custom-scrollbar">
          {messages.map((msg) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] ${msg.type === 'user' ? 'bg-electric-blue/10 border border-electric-blue/30 text-electric-blue' : 'bg-[#0d1117] border border-dark-border text-neon-mint'} p-4 rounded-lg leading-relaxed shadow-sm relative group`}>
                {msg.type === 'system' && <span className="text-gray-500 mr-2">&gt;</span>}
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.timestamp && (
                  <div className="text-[9px] text-gray-600 mt-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR')}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Typewriter animation */}
          {isTyping && typingText && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="max-w-[85%] bg-[#0d1117] border border-dark-border text-neon-mint p-4 rounded-lg leading-relaxed shadow-sm border-l-4 border-l-electric-blue">
                <span className="text-gray-500 mr-2">&gt;</span>
                <span className="whitespace-pre-wrap">{typingText}</span>
                <span className="animate-pulse text-electric-blue">▌</span>
              </div>
            </motion.div>
          )}
          
          {/* Loading indicator */}
          {isLoading && !isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
              <div className="bg-[#0d1117] border border-dark-border text-neon-mint p-4 rounded-lg flex items-center gap-2 overflow-hidden shadow-lg border-l-4 border-l-electric-blue">
                <span className="text-gray-500">&gt;</span>
                <span className="flex gap-1 items-center">
                  <span className="w-2 h-4 bg-neon-mint animate-[pulse_1s_infinite]"></span>
                  <span className="text-xs text-gray-400 ml-2 animate-pulse font-bold tracking-widest">RAG CONTEXT TOPLANYOR...</span>
                </span>
                <div className="ml-4 flex gap-1">
                   <div className="w-1 h-3 bg-electric-blue/40 animate-[bounce_1s_infinite_100ms]"></div>
                   <div className="w-1 h-3 bg-electric-blue/60 animate-[bounce_1s_infinite_200ms]"></div>
                   <div className="w-1 h-3 bg-electric-blue/80 animate-[bounce_1s_infinite_300ms]"></div>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#0d1117] border-t border-dark-border shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center">
            <span className="absolute left-4 text-electric-blue font-mono font-bold">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={ollamaOnline === false ? "⚠️ Ollama çevrimdışı — 'ollama serve' çalıştırın" : "Sisteme sor: Bugün anket katılımı neden düşüktü?"}
              className="w-full bg-dark-surface border border-dark-border rounded-lg py-4 pl-10 pr-14 text-gray-200 font-mono text-sm focus:outline-none focus:border-electric-blue focus:ring-1 focus:ring-electric-blue transition-all placeholder:text-gray-600 shadow-inner"
              disabled={isLoading || isTyping}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isLoading || isTyping}
              className="absolute right-3 p-2.5 text-gray-400 hover:text-electric-blue disabled:opacity-30 transition-all hover:scale-110 active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
