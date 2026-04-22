import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, ChevronRight, RefreshCw, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { sendChatMessage, checkOllamaHealth } from '../../lib/api_client';

interface SummaryData {
  text: string;
  generatedAt: number;
  source: 'backend' | 'ollama' | 'local';
}

const STORAGE_KEY = 'vrag_daily_summary';
const ONE_DAY = 24 * 60 * 60 * 1000;
const today = new Date().toISOString().split('T')[0];

export function DailySummaryCard() {
  const { user } = useAuth();
  const { posts } = useData();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [ollamaOnline, setOllamaOnline] = useState(false);

  useEffect(() => {
    checkOllamaHealth().then(setOllamaOnline);

    // 1. Önce backend'den gelen günlük özet postuna bak
    const backendSummaryPost = posts.find(p =>
      p.isSystem &&
      p.uiPayload?.type === 'daily_summary' &&
      p.uiPayload?.date === today
    );
    if (backendSummaryPost) {
      setSummary({ text: backendSummaryPost.uiPayload.text || backendSummaryPost.uiPayload.question || '', generatedAt: new Date(backendSummaryPost.createdAt).getTime(), source: 'backend' });
      return;
    }

    // 2. LocalStorage cache'e bak
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data: SummaryData = JSON.parse(cached);
        if (Date.now() - data.generatedAt < ONE_DAY) {
          setSummary(data);
          return;
        }
      }
    } catch {}
  }, [posts]);

  const generateSummary = async () => {
    if (!user || isLoading) return;
    setIsLoading(true);

    try {
      const context = [
        `Ad: ${user.cognitiveProfile?.name || user.name}`,
        user.cognitiveProfile?.trait ? `Özellik: ${user.cognitiveProfile.trait}` : '',
        user.performanceMetrics ? `Katılım: %${user.performanceMetrics.engagement}, Dakiklik: %${user.performanceMetrics.punctuality}` : '',
      ].filter(Boolean).join(', ');

      const prompt = `Bu kamp katılımcısı için kısa, motive edici bir günlük özet yaz (max 100 kelime). 
Bağlam: ${context}. 
Doğrudan konuşarak yaz (2. tekil şahıs). Başarıları öv, gelişim alanlarını yapıcı belirt. Emoji kullan.`;

      const response = await sendChatMessage(prompt);
      const data: SummaryData = { text: response, generatedAt: Date.now(), source: 'ollama' };
      setSummary(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setSummary({ text: '⚠️ Günlük özet şu anda oluşturulamıyor. Ollama bağlantısını kontrol edin.', generatedAt: Date.now(), source: 'local' });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate on first mount if no cached summary
  useEffect(() => {
    if (!summary && ollamaOnline && user) {
      generateSummary();
    }
  }, [ollamaOnline, user]);

  if (!summary && !isLoading && !ollamaOnline) return null;


  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#161b22] to-[#0d1117] border border-[#30363d] rounded-xl p-4 mb-4 relative overflow-hidden"
    >
      {/* Gradient accent */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8957e5] via-[#58a6ff] to-[#238636]" />

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-[#8957e5]/20 rounded-lg flex items-center justify-center border border-[#8957e5]/30">
            <Sparkles className="w-4 h-4 text-[#8957e5]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Günlük AI Özeti</h3>
            <p className="text-[10px] text-[#8b949e]">Vizyon AI tarafından</p>
          </div>
        </div>
        <button
          onClick={generateSummary}
          disabled={isLoading || !ollamaOnline}
          className="p-1.5 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-[#58a6ff] disabled:opacity-30 transition-colors"
          title="Yenile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && !summary ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-[#30363d] rounded w-full" />
          <div className="h-3 bg-[#30363d] rounded w-4/5" />
          <div className="h-3 bg-[#30363d] rounded w-3/5" />
        </div>
      ) : summary ? (
        <div>
          <p className={`text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
            {summary.text}
          </p>
          {summary.text.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 mt-2 text-xs text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
            >
              <span>{isExpanded ? 'Daha az göster' : 'Devamını oku'}</span>
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
        </div>
      ) : null}

      {/* Engagement indicator */}
      {user && user.performanceMetrics && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-[#30363d]">
          <TrendingUp className="w-3.5 h-3.5 text-[#238636]" />
          <span className="text-xs text-[#8b949e]">
            Katılım Skoru: <span className="text-[#238636] font-bold">%{user.performanceMetrics.engagement}</span>
          </span>
        </div>
      )}
    </motion.div>
  );
}
