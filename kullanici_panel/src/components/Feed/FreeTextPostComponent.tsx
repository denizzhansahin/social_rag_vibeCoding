import React, { useState } from 'react';
import { useTelemetryTracker } from '../../hooks/useTelemetryTracker';
import { EngagementButtons } from '../Shared/EngagementButtons';
import { Send } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../../context/DataContext';
import { ImageLightbox } from '../Shared/ImageLightbox';

interface FreeTextPostProps {
  post: {
    id: string;
    authorName?: string;
    isSystem?: boolean;
    createdAt?: string;
    reactions?: Record<string, string[]>;
    uiPayload: {
      text: string;
      author?: string;
      allowComments: boolean;
      attachments?: string[];
      comments?: { id: string, text: string, authorName: string, createdAt: string }[];
    };
  };
}

export const FreeTextPostComponent: React.FC<FreeTextPostProps> = ({ post }) => {
  const { uiPayload, authorName, isSystem } = post;
  const [comment, setComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const authUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('v_rag_user') || '{}');
    } catch {
      return {};
    }
  })();
  const likedUsers = post.reactions?.['👍'] || [];
  const isLiked = !!authUser?.id && likedUsers.includes(authUser.id);
  
  const { addPostComment, submitPostEngagement } = useData();
  
  const { 
    containerRef, 
    onMouseEnter, 
    onMouseLeave, 
    onKeyDown,
    submitTelemetry,
    metrics
  } = useTelemetryTracker(post.id, 'text_post');

  const handleAction = async (action: string) => {
    if (action === 'comment_intent') {
      setShowInput(!showInput);
      return;
    }

    if (action === 'liked' || action === 'unliked') {
      await submitPostEngagement(post.id, action);
      return;
    }

    if (action === 'shared' || action === 'ignored') {
      submitTelemetry(action, {});
    }
  };

  const handleCommentSubmit = async () => {
    if (!comment.trim()) return;
    
    const responsePayload = {
      text: comment,
      backspace_ratio: metrics.totalKeystrokes > 0 
        ? (metrics.backspaceCount / metrics.totalKeystrokes).toFixed(2)
        : '0'
    };

    // Persist to backend
    await addPostComment(post.id, comment);
    await submitPostEngagement(post.id, 'answered', responsePayload);
    
    setComment('');
    setShowInput(false);
  };

  const displayName = authorName || uiPayload.author || 'U';

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
    <>
      <motion.div 
        ref={containerRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 shadow-sm"
      >
        <div className="flex items-center space-x-3 mb-3">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-white font-bold", isSystem ? "bg-gradient-to-br from-[#238636] to-[#58a6ff] shadow-lg shadow-[#238636]/20" : "bg-[#30363d]")}>
            {isSystem ? 'V' : displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-[#c9d1d9] font-semibold text-sm flex items-center space-x-2">
              <span>{displayName}</span>
              {isSystem && <span className="bg-[#238636]/20 text-[#238636] text-[10px] px-2 py-0.5 rounded-full border border-[#238636]/30">Sistem</span>}
            </h3>
            <p className="text-[#8b949e] text-xs">{timeAgo(post.createdAt)}</p>
          </div>
        </div>

        <p className="text-[#c9d1d9] text-[15px] leading-relaxed mb-4 whitespace-pre-wrap">{uiPayload.text}</p>

        <EngagementButtons
          onAction={handleAction}
          liked={isLiked}
          likeCount={likedUsers.length}
        />

        {/* Attachments (Photos) */}
        {post.uiPayload.attachments && post.uiPayload.attachments.length > 0 && (
          <div className={`mt-4 grid gap-2 ${post.uiPayload.attachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.uiPayload.attachments.map((url: string, index: number) => (
              <div 
                key={index} 
                className="relative rounded-lg overflow-hidden border border-[#30363d] bg-black/20 group cursor-zoom-in"
                onClick={() => setSelectedImage(url)}
              >
                <img 
                  src={url} 
                  alt="Post attachment" 
                  className="w-full h-auto max-h-[400px] object-cover transition-transform duration-500 group-hover:scale-105" 
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Existing comments */}
        {uiPayload.comments && uiPayload.comments.length > 0 && (
          <div className="mt-4 space-y-2">
            {uiPayload.comments.map((c, i) => (
              <div key={c.id || i} className="flex items-start space-x-2 pl-2 border-l-2 border-[#30363d]">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-[#58a6ff]">{c.authorName}</span>
                  <span className="text-[10px] text-[#8b949e] ml-2">{timeAgo(c.createdAt)}</span>
                  <p className="text-xs text-[#c9d1d9] mt-0.5">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showInput && uiPayload.allowComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 flex items-center space-x-2"
          >
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                onKeyDown(e);
                if (e.key === 'Enter') handleCommentSubmit();
              }}
              placeholder="Fikrini paylaş..."
              className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-full px-4 py-2 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#58a6ff] transition-colors"
              autoFocus
            />
            <button 
              onClick={handleCommentSubmit}
              disabled={!comment.trim()}
              className="p-2 rounded-full bg-[#238636] text-white hover:bg-[#2ea043] disabled:opacity-40 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </motion.div>

      <ImageLightbox 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </>
  );
}
