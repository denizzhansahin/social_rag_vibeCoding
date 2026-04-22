import React, { useState } from 'react';
import { useTelemetryTracker } from '../../hooks/useTelemetryTracker';
import { EngagementButtons } from '../Shared/EngagementButtons';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';

interface MoodCheckinCardProps {
  post: {
    id: string;
    authorName?: string;
    isSystem?: boolean;
    createdAt?: string;
    uiPayload: {
      question: string;
      options?: { emoji: string, label: string }[];
      emojis?: string[];
      labels?: string[];
    };
  };
}

export const MoodCheckinCard: React.FC<MoodCheckinCardProps> = ({ post }) => {
  const { uiPayload, authorName, isSystem, myEngagement } = post;
  
  // Restore state from previous engagement
  const prevIndex = myEngagement?.action === 'answered' ? myEngagement.responseData?.mood_index : null;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(prevIndex);
  const [showConfetti, setShowConfetti] = useState(false);

  const { submitPostEngagement } = useData();
  const authUser = (() => { try { return JSON.parse(localStorage.getItem('v_rag_user') || '{}'); } catch { return {}; } })();
  
  // Like control
  const postReactions: any = (post as any)?.reactions?.['👍'] || [];
  const isLiked = !!authUser?.id && postReactions.includes(authUser.id);

  const {
    containerRef,
    onMouseEnter,
    onMouseLeave,
    trackChangeMind,
    trackInteraction,
    submitTelemetry,
  } = useTelemetryTracker(post.id, 'mood_checkin');

  const handleAction = async (action: string) => {
    if (action === 'liked' || action === 'unliked') {
      await submitPostEngagement(post.id, action);
      return;
    }
    if (action === 'shared' || action === 'ignored') {
      submitTelemetry(action, {});
    }
  };

  const handleSelect = (index: number) => {
    if (selectedIndex !== null && selectedIndex !== index) {
      trackChangeMind();
    }

    setSelectedIndex(index);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);

    trackInteraction(post.id);

    const emojis_list = uiPayload.options ? uiPayload.options.map((o: any) => o.emoji) : (uiPayload.emojis || ['🤩', '😊', '😐', '😔', '😫']);
    const labels_list = uiPayload.options ? uiPayload.options.map((o: any) => o.label) : (uiPayload.labels || ['Harika', 'İyi', 'Normal', 'Kötü', 'Berbat']);

    submitTelemetry('answered', {
      selected_emoji: emojis_list[index],
      selected_label: labels_list[index],
      mood_index: index,
      total_options: emojis_list.length,
      question: uiPayload.question,
    });
  };

  const displayName = authorName || 'Anket';

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Az önce';
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    return `${Math.floor(hours / 24)}g önce`;
  };

  const defaultEmojis = ['🤩', '😊', '😐', '😔', '😫'];
  const defaultLabels = ['Harika', 'İyi', 'Normal', 'Kötü', 'Berbat'];
  
  const emojis = uiPayload.options ? uiPayload.options.map((o: any) => o.emoji) : (uiPayload.emojis || defaultEmojis);
  const labels = uiPayload.options ? uiPayload.options.map((o: any) => o.label) : (uiPayload.labels || defaultLabels);

  return (
    <motion.div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 shadow-sm relative overflow-hidden"
    >
      {/* Confetti Animation */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: '50%',
                  y: '50%',
                  scale: 0,
                  rotate: 0,
                }}
                animate={{
                  x: `${Math.random() * 200}%`,
                  y: `${Math.random() * 200 - 100}%`,
                  scale: [0, 1, 0],
                  rotate: Math.random() * 720,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: ['#58a6ff', '#238636', '#d29922', '#f85149', '#8957e5'][i % 5],
                }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-[#238636] to-[#58a6ff]">
          {isSystem ? 'V' : displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-[#c9d1d9] font-semibold text-sm">{displayName}</h3>
          <p className="text-[#8b949e] text-xs">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      <p className="text-[#c9d1d9] font-medium text-[15px] mb-6">{uiPayload.question}</p>

      {/* Emoji Options */}
      <div className="flex justify-between items-center mb-4">
        {emojis.map((emoji: string, idx: number) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            disabled={selectedIndex !== null}
            onClick={() => handleSelect(idx)}
            className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all ${selectedIndex === idx
                ? 'bg-[#58a6ff]/20 border-2 border-[#58a6ff] scale-110'
                : 'hover:bg-[#30363d] border-2 border-transparent disabled:opacity-40'
              }`}
          >
            <span className="text-2xl">{emoji}</span>
            {labels[idx] && (
              <span className="text-[9px] text-[#8b949e]">{labels[idx]}</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Confirmation */}
      {selectedIndex !== null && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-2 text-sm text-[#238636] font-medium"
        >
          {showConfetti ? '🎉 ' : '✅ '}Ruh halin kaydedildi!
        </motion.div>
      )}

      <EngagementButtons 
        onAction={handleAction} 
        liked={isLiked} 
        likeCount={postReactions.length} 
      />
    </motion.div>
  );
};
