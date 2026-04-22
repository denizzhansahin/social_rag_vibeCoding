import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { sendChatMessage, checkOllamaHealth } from '../../lib/api_client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const QUICK_PROMPTS = [
  { emoji: '📊', text: 'Bugün nasıl performans gösterdim?' },
  { emoji: '💪', text: 'Güçlü yanlarım neler?' },
  { emoji: '🎯', text: 'Hangi alanlarda gelişmeliyim?' },
  { emoji: '🤝', text: 'Kiminle iyi anlaşabilirim?' },
  { emoji: '🔥', text: 'Motivasyonumu nasıl artırabilirim?' },
];

const STORAGE_KEY = 'vrag_chat_history';

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState<boolean | null>(null);
  const [typingText, setTypingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  // Check Ollama health on mount
  useEffect(() => {
    checkOllamaHealth().then(setOllamaOnline);
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Typewriter effect
  const typewriterEffect = useCallback((fullText: string) => {
    setIsTyping(true);
    setTypingText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setTypingText(prev => prev + fullText.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setTypingText('');
        setMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: fullText,
          timestamp: Date.now(),
        }]);
      }
    }, 15);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build user context
      const userContext = user ? [
        `Ad: ${user.cognitiveProfile?.name || user.name}`,
        `Rol: ${user.role}`,
        user.cognitiveProfile?.trait ? `Özellik: ${user.cognitiveProfile.trait}` : '',
        user.performanceMetrics ? `Katılım: %${user.performanceMetrics.engagement}` : '',
      ].filter(Boolean).join(', ') : undefined;

      const response = await sendChatMessage(msg, userContext);
      typewriterEffect(response);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Ollama\'ya bağlanılamadı. Sunucunun çalıştığından emin ol (`ollama serve`).',
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-5 z-[60] w-14 h-14 rounded-full bg-gradient-to-br from-[#238636] to-[#58a6ff] text-white shadow-2xl shadow-[#238636]/30 flex items-center justify-center hover:scale-110 transition-transform"
        whileTap={{ scale: 0.9 }}
        animate={!isOpen ? {
          boxShadow: ['0 0 0 0 rgba(35,134,54,0.4)', '0 0 0 15px rgba(35,134,54,0)', '0 0 0 0 rgba(35,134,54,0.4)'],
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-40 right-5 z-[59] w-[360px] max-h-[500px] bg-[#0d1117] border border-[#30363d] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#238636] to-[#58a6ff] rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Vizyon AI</h3>
                  <div className="flex items-center space-x-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${ollamaOnline ? 'bg-[#238636]' : ollamaOnline === false ? 'bg-[#f85149]' : 'bg-[#d29922]'}`} />
                    <span className="text-[10px] text-[#8b949e]">
                      {ollamaOnline ? 'Çevrimiçi' : ollamaOnline === false ? 'Çevrimdışı' : 'Kontrol ediliyor...'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={clearHistory} className="text-[#8b949e] hover:text-[#f85149] transition-colors p-1" title="Geçmişi temizle">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[320px]">
              {messages.length === 0 && !isTyping && (
                <div className="text-center py-4">
                  <Bot className="w-10 h-10 text-[#30363d] mx-auto mb-2" />
                  <p className="text-sm text-[#8b949e]">Merhaba! Sana nasıl yardımcı olabilirim?</p>

                  {/* Quick Prompts */}
                  <div className="mt-3 space-y-1.5">
                    {QUICK_PROMPTS.map((qp, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(qp.text)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/30 transition-colors text-xs text-[#c9d1d9] flex items-center space-x-2"
                      >
                        <span>{qp.emoji}</span>
                        <span>{qp.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#238636] text-white rounded-br-sm'
                      : 'bg-[#161b22] border border-[#30363d] text-[#c9d1d9] rounded-bl-sm'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}

              {/* Typewriter animation */}
              {isTyping && typingText && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-bl-sm text-sm bg-[#161b22] border border-[#30363d] text-[#c9d1d9] leading-relaxed">
                    <div className="whitespace-pre-wrap">{typingText}<span className="animate-pulse text-[#58a6ff]">▌</span></div>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isLoading && !isTyping && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-xl rounded-bl-sm bg-[#161b22] border border-[#30363d] flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 text-[#58a6ff] animate-spin" />
                    <span className="text-xs text-[#8b949e]">Düşünüyorum...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[#30363d] bg-[#161b22] flex-shrink-0">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ollamaOnline === false ? 'Ollama çevrimdışı...' : 'Mesajını yaz...'}
                  disabled={isLoading || ollamaOnline === false}
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-full px-4 py-2 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] disabled:opacity-50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading || ollamaOnline === false}
                  className="p-2 rounded-full bg-[#238636] text-white disabled:opacity-30 hover:bg-[#2ea043] transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
