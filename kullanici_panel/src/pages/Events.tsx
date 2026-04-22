import React, { useState } from 'react';
import { Navigation } from '../components/Shared/Navigation';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { EventCard } from '../components/Feed/EventCard';
import { motion } from 'framer-motion';

export default function Events() {
  const { events } = useData();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | 'mine' | 'upcoming' | 'past'>('upcoming');

  const userGroupId = user?.groupId || user?.cognitiveProfile?.group;
  const isMentor = user && ['mentor', 'teacher', 'admin'].includes(user.role!);

  // Kullanıcının etkinlikleri: kendi grubu + atandığı etkinlikler (hem assignment hem group üyeliği)
  const userEvents = events.filter(e => {
    // Herkesin görmesi gereken: kendi grubunun etkinlikleri
    if (userGroupId && e.groupId === userGroupId) return true;
    // Global etkinlikler
    if (e.groupId === 'Tüm Gruplar' || e.groupId === 'global' || !e.groupId) return true;
    // Mentor: assignment ile atandığı etkinlikler (DataContext zaten getEventsForUser çekiyor)
    if (isMentor) return true;
    return false;
  });

  const now = new Date();
  const upcomingEvents = userEvents.filter(e => new Date(e.date) >= now);
  const pastEvents = userEvents.filter(e => new Date(e.date) < now);
  const myEvents = isMentor ? events.filter(e => 
    e.participants?.some(p => p.id === user?.id) ||
    (userGroupId && e.groupId === userGroupId)
  ) : upcomingEvents;

  const displayedEvents = activeFilter === 'all' ? userEvents
    : activeFilter === 'mine' ? myEvents
    : activeFilter === 'upcoming' ? upcomingEvents
    : pastEvents;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filters = [
    { key: 'upcoming', label: 'Yaklaşan', count: upcomingEvents.length },
    { key: 'past', label: 'Geçmiş', count: pastEvents.length },
    { key: 'all', label: 'Tümü', count: userEvents.length },
  ] as const;

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24">
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#d29922]" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Etkinlikler</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto pt-4 px-4">
        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-[#d29922]/15 rounded-full flex items-center justify-center border border-[#d29922]/20">
              <Calendar className="w-5 h-5 text-[#d29922]" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{upcomingEvents.length} Yaklaşan</p>
              <p className="text-[10px] text-[#8b949e]">{userEvents.length} toplam etkinlik</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-[#238636]">{events.reduce((a, e) => a + (e.attendedParticipants?.length || 0), 0)}</p>
            <p className="text-[10px] text-[#8b949e]">Toplam Katılım</p>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-[#161b22] p-1 rounded-lg border border-[#30363d] mb-4">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${activeFilter === f.key ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              {f.label} {f.count > 0 && <span className="text-[10px] opacity-70">({f.count})</span>}
            </button>
          ))}
        </div>

        {/* Events list */}
        <div className="space-y-4">
          {displayedEvents.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={activeFilter === 'past' ? 'opacity-70' : ''}
            >
              <EventCard
                event={event}
                isExpanded={expandedId === event.id}
                toggleExpand={() => toggleExpand(event.id)}
              />
            </motion.div>
          ))}
        </div>

        {displayedEvents.length === 0 && (
          <div className="text-center py-16 text-[#8b949e]">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {activeFilter === 'upcoming' ? 'Yaklaşan etkinlik bulunmuyor.' :
               activeFilter === 'past' ? 'Geçmiş etkinlik bulunmuyor.' :
               'Henüz etkinlik yok.'}
            </p>
          </div>
        )}
      </main>
      <Navigation />
    </div>
  );
}
