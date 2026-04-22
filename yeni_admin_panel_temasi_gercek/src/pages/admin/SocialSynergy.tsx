import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  Users, 
  Sparkles, 
  RefreshCcw, 
  Search, 
  Filter, 
  ChevronRight, 
  Heart,
  UserPlus,
  MessageSquare,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { GET_PERSISTENT_MATCHES } from '../../api/graphql';
import { gql } from '@apollo/client';

const TRIGGER_FULL_SYNC = gql`
  mutation TriggerFullSync {
    triggerFullSync
  }
`;

export default function SocialSynergy() {
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0.25);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { data, loading, error, refetch } = useQuery(GET_PERSISTENT_MATCHES, {
    pollInterval: 10000,
    fetchPolicy: 'network-only'
  }) as any;

  console.log("DEBUG_MATCHES_RAW:", { data, loading, error, searchTerm, minScore });
  console.log("MATCHES_COUNT:", data?.getPersistentMatches?.length);
  if (data?.getPersistentMatches?.length > 0) {
    console.log("FIRST_MATCH_SAMPLE:", data.getPersistentMatches[0]);
  }

  const [triggerSync] = useMutation(TRIGGER_FULL_SYNC);

  const handleSync = async () => {
    if (!confirm('Tüm katılımcı verilerini analiz edip yeni eşleşmeler oluşturmak istiyor musunuz?')) return;
    setIsSyncing(true);
    try {
      await triggerSync();
      alert('AI Analiz görevi başlatıldı. Birkaç dakika içinde sonuçlar güncellenecektir.');
    } catch (err) {
      alert('Senkronizasyon başlatılamadı.');
    } finally {
      setTimeout(() => setIsSyncing(false), 3000);
    }
  };

  const matches = data?.getPersistentMatches || [];
  const filteredMatches = matches.filter((m: any) => {
    const nameMatch = (m.userAName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (m.userBName || '').toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch && m.similarityScore >= minScore;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-200 text-sm font-mono">
          [GRAPHQL ERROR]: {error.message}
          <div className="mt-2 text-[10px] opacity-70">Lütfen API Gateway'in (Port 4000) çalışıp çalışmadığını ve şemanın güncel olduğunu kontrol edin.</div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <motion.h1 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="text-3xl font-bold text-white flex items-center gap-3"
          >
            <Users className="w-8 h-8 text-pink-500" />
            Sosyal Sinerji Radarı
          </motion.h1>
          <p className="text-gray-500 mt-2 font-mono text-sm">
            AI TABANLI KATILIMCI EŞLEŞTİRME VE KOMÜNİTE ANALİZİ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            className="p-2.5 bg-dark-surface border border-dark-border rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Yenile"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-pink-500/10 hover:shadow-pink-500/25 transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {isSyncing ? 'ANALİZ EDİLİYOR...' : 'YENİ ANALİZ BAŞLAT'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'TOPLAM EŞLEŞME', value: matches.length, icon: Users, color: 'text-indigo-400' },
          { label: 'ORTALAMA UYUM', value: `%${Math.round(matches.reduce((acc: number, curr: any) => acc + curr.similarityScore, 0) / (matches.length || 1) * 100)}`, icon: Heart, color: 'text-pink-400' },
          { label: 'AKTİF KANALLAR', value: Math.ceil(matches.length * 0.4), icon: Zap, color: 'text-yellow-400' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-dark-surface border border-dark-border p-6 rounded-2xl relative overflow-hidden"
          >
            <div className={`absolute -right-4 -top-4 w-16 h-16 ${stat.color.replace('text', 'bg')}/10 rounded-full blur-2xl`} />
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl bg-gray-900 border border-dark-border ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-gray-500 font-mono tracking-widest">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-dark-surface border border-dark-border rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text"
            placeholder="Katılımcı ismi ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0d1117] border border-dark-border rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-pink-500/50 transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-400 whitespace-nowrap">Min Uyum: %{Math.round(minScore * 100)}</span>
            <input 
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={minScore}
              onChange={(e) => setMinScore(parseFloat(e.target.value))}
              className="flex-1 accent-pink-500 h-1.5 rounded-full bg-gray-800"
            />
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMatches.length === 0 ? (
            <motion.div 
               colSpan={4}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="col-span-full py-20 text-center bg-dark-surface/30 border border-dashed border-dark-border rounded-2xl"
            >
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-500 font-mono text-sm uppercase tracking-widest">
                Kriterlere uygun veya kaydedilmiş eşleşme bulunamadı.
              </p>
              <button 
                onClick={handleSync}
                className="mt-6 text-pink-500 hover:text-pink-400 text-xs font-bold underline"
              >
                Yeni Analiz Başlatmayı Deneyin
              </button>
            </motion.div>
          ) : filteredMatches.map((match: any, idx: number) => (
            <motion.div
              layout
              key={match.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -5 }}
              className="bg-dark-surface border border-dark-border rounded-2xl p-6 group relative overflow-hidden"
            >
              {/* Similarity Score Circle Background */}
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-pink-500/5 rounded-full border border-pink-500/10 flex items-center justify-center">
                 <span className="text-[10px] font-bold text-pink-500/50 rotate-[-45deg]">MATCH</span>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center -space-x-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-600 border-2 border-dark-surface flex items-center justify-center text-xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                    {(match.userAName || '?').charAt(0)}
                  </div>
                  <div className="w-14 h-14 rounded-full bg-pink-600 border-2 border-dark-surface flex items-center justify-center text-xl font-bold text-white shadow-xl group-hover:scale-110 transition-transform">
                    {(match.userBName || '?').charAt(0)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-black text-white leading-none">
                    %{Math.round(match.similarityScore * 100)}
                  </div>
                  <div className="text-[9px] text-pink-400 font-mono font-bold mt-1 uppercase">Similarity</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-bold text-white truncate">{match.userAName || 'Bilinmeyen'}</div>
                  <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent" />
                    <Sparkles className="w-3 h-3 text-pink-500/50" />
                    <div className="h-px flex-1 bg-gradient-to-l from-pink-500/50 to-transparent" />
                  </div>
                  <div className="text-sm font-bold text-white text-right truncate">{match.userBName || 'Bilinmeyen'}</div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-dark-border/40">
                   <button className="flex-1 p-2 bg-[#0d1117] border border-dark-border rounded-lg text-gray-500 hover:text-white hover:border-gray-600 transition-all">
                      <MessageSquare className="w-3.5 h-3.5 mx-auto" />
                   </button>
                   <button className="flex-1 p-2 bg-[#0d1117] border border-dark-border rounded-lg text-gray-500 hover:text-white hover:border-gray-600 transition-all">
                      <UserPlus className="w-3.5 h-3.5 mx-auto" />
                   </button>
                   <button className="flex-1 p-2 bg-pink-900/20 border border-pink-500/30 rounded-lg text-pink-400 hover:bg-pink-900/40 transition-all">
                      <ChevronRight className="w-3.5 h-3.5 mx-auto" />
                   </button>
                </div>
              </div>

              {/* Tagging */}
              <div className="mt-4 flex flex-wrap gap-2">
                 <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">Semantik</span>
                 <span className="text-[10px] px-2 py-0.5 bg-pink-500/10 text-pink-400 rounded-full border border-pink-500/20">Onboarding</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
