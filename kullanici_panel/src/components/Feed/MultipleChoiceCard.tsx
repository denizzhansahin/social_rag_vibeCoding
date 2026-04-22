import React, { useState } from 'react';
import { useTelemetryTracker } from '../../hooks/useTelemetryTracker';
import { EngagementButtons } from '../Shared/EngagementButtons';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';

interface MultipleChoiceCardProps {
  post: {
    id: string;
    authorName?: string;
    isSystem?: boolean;
    createdAt?: string;
    uiPayload: {
      question: string;
      options: string[];
      votes?: Record<string, number>;
      totalVotes?: number;
      allowMultiple?: boolean;
    };
  };
}

export const MultipleChoiceCard: React.FC<MultipleChoiceCardProps> = ({ post }) => {
  const { uiPayload, authorName, isSystem, myEngagement } = post;
  
  // Restore state from previous engagement
  const prevVote = myEngagement?.action === 'answered' ? myEngagement.responseData?.selected_option : null;

  const [selectedOption, setSelectedOption] = useState<string | null>(prevVote);
  const [hasVoted, setHasVoted] = useState(!!prevVote);
  const [localVotes, setLocalVotes] = useState<Record<string, number>>(uiPayload.votes || {});
  const [localTotal, setLocalTotal] = useState(uiPayload.totalVotes || 0);

  const { submitPostEngagement } = useData();
  const authUser = (() => { try { return JSON.parse(localStorage.getItem('v_rag_user') || '{}'); } catch { return {}; } })();
  
  // Like control
  const postReactions: any = (post as any)?.reactions?.['👍'] || [];
  const isLiked = !!authUser?.id && postReactions.includes(authUser.id);

  const {
    containerRef,
    onMouseEnter,
    onMouseLeave,
    onKeyDown,
    trackChangeMind,
    trackInteraction,
    submitTelemetry,
  } = useTelemetryTracker(post.id, 'multiple_choice');

  const handleAction = async (action: string) => {
    if (action === 'liked' || action === 'unliked') {
      await submitPostEngagement(post.id, action);
      return;
    }
    if (action === 'shared' || action === 'ignored') {
      submitTelemetry(action, {});
    }
  };

  const handleVote = (option: string) => {
    if (hasVoted && !uiPayload.allowMultiple) return;

    if (hasVoted && selectedOption !== option) {
      trackChangeMind();
    }

    setSelectedOption(option);
    setHasVoted(true);

    // Update local display immediately (optimistic)
    setLocalVotes(prev => ({
      ...prev,
      [option]: (prev[option] || 0) + 1,
    }));
    setLocalTotal(prev => prev + 1);

    trackInteraction(post.id);

    // Submit to backend
    submitTelemetry('answered', {
      selected_option: option,
      question: uiPayload.question,
      total_options: uiPayload.options.length,
      was_default_position: false,
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

  return (
    <motion.div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 shadow-sm"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br from-[#58a6ff] to-[#8957e5]">
          {isSystem ? 'V' : displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-[#c9d1d9] font-semibold text-sm flex items-center space-x-2">
            <span>{displayName}</span>
            {isSystem && (
              <span className="bg-[#238636]/20 text-[#238636] text-[10px] px-2 py-0.5 rounded-full border border-[#238636]/30">
                Sistem
              </span>
            )}
          </h3>
          <p className="text-[#8b949e] text-xs">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      <p className="text-[#c9d1d9] font-medium text-[15px] mb-4">{uiPayload.question}</p>

      {/* Options */}
      <div className="space-y-2 mb-4" onKeyDown={onKeyDown}>
        {!hasVoted ? (
          uiPayload.options.map((option, idx) => (
            <motion.button
              key={idx}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              disabled={hasVoted}
              onClick={() => handleVote(option)}
              className="w-full text-left px-4 py-3 rounded-lg border border-[#30363d] bg-[#0d1117] hover:bg-[#30363d] hover:border-[#58a6ff]/50 transition-all text-sm text-[#c9d1d9] font-medium disabled:opacity-50"
            >
              {option}
            </motion.button>
          ))
        ) : (
          <div className="space-y-3">
            {uiPayload.options.map((option, idx) => {
              const votes = localVotes[option] || 0;
              const percent = localTotal > 0 ? Math.round((votes / localTotal) * 100) : 0;
              const isSelected = selectedOption === option;

              return (
                <div key={idx} className="relative">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`font-medium ${isSelected ? 'text-[#58a6ff]' : 'text-[#c9d1d9]'}`}>
                      {option}
                      {isSelected && <span className="ml-2 text-[10px]">✓ Senin cevabın</span>}
                    </span>
                    <span className="text-[#8b949e]">{percent}% ({votes})</span>
                  </div>
                  <div className="w-full bg-[#0d1117] rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${isSelected ? 'bg-[#58a6ff]' : 'bg-[#30363d]'}`}
                    />
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-[#8b949e] text-right mt-2 flex justify-between items-center">
              <button 
                onClick={() => setHasVoted(false)} 
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
                title="Sadece test/demo amaçlı geri dönme imkanı"
              >
                Cevabı Değiştir (Test Modu)
              </button>
              <span>Toplam {localTotal} oy</span>
            </div>
          </div>
        )}
      </div>

      <EngagementButtons 
        onAction={handleAction} 
        liked={isLiked} 
        likeCount={postReactions.length} 
      />
    </motion.div>
  );
};
