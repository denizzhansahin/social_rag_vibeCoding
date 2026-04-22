import React from 'react';
import { Heart, MessageCircle, Share2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface EngagementButtonsProps {
  onAction: (action: string) => void;
  liked?: boolean;
  likeCount?: number;
}

export function EngagementButtons({ onAction, liked = false, likeCount = 0 }: EngagementButtonsProps) {
  const handleLike = () => {
    onAction(liked ? 'unliked' : 'liked');
  };

  return (
    <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-4">
      <div className="flex space-x-6">
        <button 
          onClick={handleLike}
          className="flex items-center space-x-2 text-[#8b949e] hover:text-[#f85149] transition-colors group"
        >
          <motion.div whileTap={{ scale: 0.8 }}>
            <Heart className={cn("w-5 h-5", liked && "fill-[#f85149] text-[#f85149]")} />
          </motion.div>
          <span className="text-sm">{likeCount}</span>
        </button>
        
        <button 
          onClick={() => onAction('comment_intent')}
          className="flex items-center space-x-2 text-[#8b949e] hover:text-[#58a6ff] transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm">Yorum</span>
        </button>

        <button 
          onClick={() => onAction('ignored')}
          className="flex items-center space-x-2 text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
          title="İlgilenmiyorum"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <button 
        onClick={() => onAction('shared')}
        className="text-[#8b949e] hover:text-[#238636] transition-colors"
      >
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}
