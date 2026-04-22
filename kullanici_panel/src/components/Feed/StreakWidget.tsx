import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Zap, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function StreakWidget() {
  const { user } = useAuth();
  if (!user) return null;

  const xpProgress = (user.xp % 100) / 100; // Progress to next level
  const level = Math.floor(user.xp / 100) + 1;
  const weekDays = ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'];
  const activity = user.weeklyActivity || [0, 0, 0, 0, 0, 0, 0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4"
    >
      {/* Top Row — Streak + Level */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#f85149]/20 to-[#d29922]/20 border border-[#f85149]/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-[#f85149]" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{user.streak} Günlük Seri</p>
            <p className="text-[#8b949e] text-[10px]">Harika gidiyorsun!</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-[#0d1117] border border-[#30363d] px-2.5 py-1 rounded-full">
          <Trophy className="w-3.5 h-3.5 text-[#d29922]" />
          <span className="text-xs font-bold text-[#d29922]">Lv.{level}</span>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3 text-[#58a6ff]" />
            <span className="text-[10px] text-[#8b949e] font-medium">{user.xp} XP</span>
          </div>
          <span className="text-[10px] text-[#8b949e]">{Math.round(xpProgress * 100)}%</span>
        </div>
        <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${xpProgress * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className="h-full bg-gradient-to-r from-[#238636] to-[#58a6ff] rounded-full"
          />
        </div>
      </div>

      {/* Weekly Activity Heatmap */}
      <div className="flex items-center justify-between">
        {weekDays.map((day, i) => {
          const intensity = activity[i];
          const opacity = intensity === 0 ? 0.1 : Math.min(intensity / 10, 1);
          return (
            <div key={i} className="flex flex-col items-center space-y-1">
              <span className="text-[9px] text-[#8b949e] font-medium">{day}</span>
              <div
                className="w-5 h-5 rounded heatmap-cell"
                style={{
                  backgroundColor: `rgba(35, 134, 54, ${opacity})`,
                  border: intensity > 0 ? '1px solid rgba(35, 134, 54, 0.3)' : '1px solid #30363d',
                }}
                title={`${intensity} etkileşim`}
              />
            </div>
          );
        })}
      </div>

      {/* Badges Row */}
      {user.badges && user.badges.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#30363d] flex items-center space-x-2">
          <span className="text-[10px] text-[#8b949e] mr-1">Rozetler:</span>
          {user.badges.map((badge) => (
            <div
              key={badge.id}
              className="w-7 h-7 rounded-md bg-[#0d1117] border border-[#30363d] flex items-center justify-center text-sm badge-shine cursor-default"
              title={badge.name}
            >
              {badge.icon}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
