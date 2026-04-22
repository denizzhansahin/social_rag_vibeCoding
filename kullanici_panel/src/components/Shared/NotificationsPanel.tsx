import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, CheckCheck } from 'lucide-react';
import { useTelemetryContext, AppNotification } from '../../context/TelemetryContext';

export function NotificationsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, markNotificationRead, unreadCount } = useTelemetryContext();

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
  };

  const handleMarkAllRead = () => {
    notifications.forEach(n => {
      if (!n.read) markNotificationRead(n.id);
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Şimdi';
    if (minutes < 60) return `${minutes}dk`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}sa`;
    return `${Math.floor(hours / 24)}g`;
  };

  const typeColors: Record<AppNotification['type'], string> = {
    like: 'text-[#f85149]',
    streak: 'text-[#f85149]',
    badge: 'text-[#d29922]',
    event: 'text-[#58a6ff]',
    system: 'text-[#238636]',
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-[#f85149] rounded-full flex items-center justify-center"
          >
            <span className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>
          </motion.div>
        )}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40"
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-3 border-b border-[#30363d]">
                <h3 className="text-sm font-bold text-white">Bildirimler</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] text-[#58a6ff] hover:text-[#79c0ff] transition-colors flex items-center space-x-1"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Tümünü Oku</span>
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-[#8b949e] hover:text-[#c9d1d9]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-72 overflow-y-auto hide-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-[#8b949e] text-sm">
                    Bildirim yok
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <motion.div
                      key={notif.id}
                      layout
                      className={`flex items-start space-x-3 p-3 border-b border-[#30363d]/50 transition-colors cursor-pointer ${
                        notif.read ? 'opacity-60' : 'bg-[#0d1117]/50 hover:bg-[#0d1117]'
                      }`}
                      onClick={() => handleMarkRead(notif.id)}
                    >
                      <span className="text-lg mt-0.5">{notif.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#c9d1d9] truncate">{notif.title}</p>
                        <p className="text-[10px] text-[#8b949e] mt-0.5 line-clamp-2">{notif.message}</p>
                        <p className={`text-[9px] mt-1 ${typeColors[notif.type]}`}>{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-[#58a6ff] mt-1.5 flex-shrink-0" />
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
