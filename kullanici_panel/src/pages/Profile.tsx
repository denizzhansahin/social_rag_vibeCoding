import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Shared/Navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { fetchMyMatches, triggerMatchingSync, getDiscoveryRecommendationsAPI } from '../lib/api_client';
import { User as UserIcon, Award, MessageSquare, Heart, Calendar, Linkedin, Twitter, Github, Zap, Activity, Clock, Users, Flame, Trophy, Target, Settings, Instagram, Facebook, RefreshCcw, Network } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { posts, events, users } = useData();
  const [matches, setMatches] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isMe = !id || id === 'me' || id === currentUser?.id;
  const user = isMe ? currentUser : users.find(u => u.id === id);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Kullanıcı Bulunamadı</h2>
          <p className="text-[#8b949e]">Aradığınız profil mevcut değil veya silinmiş.</p>
        </div>
        <Navigation />
      </div>
    );
  }

  const userPosts = posts.filter(p => p.createdBy === user.id || (user.email && p.authorName === (user.cognitiveProfile?.name || user.name)));
  const attendedEvents = events.filter(e => 
    e.participants?.some(p => p.id === user.id) ||
    e.attendedParticipants?.includes(user.id)
  );
  const pm = user.performanceMetrics || {};
  const ts = user.telemetrySummary;
  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const activity = user.weeklyActivity || [0, 0, 0, 0, 0, 0, 0];
  const metricBars = pm ? [
    { label: 'Katılım', value: pm.engagement || 0, color: '#238636', icon: Activity },
    { label: 'Dakiklik', value: pm.punctuality || 0, color: '#58a6ff', icon: Clock },
    { label: 'Takım Uyumu', value: pm.teamwork || 0, color: '#d29922', icon: Users },
    { label: 'Uyum & Adaptasyon', value: pm.adaptation || 0, color: '#f85149', icon: Target },
  ] : [];

  useEffect(() => {
    if (user?.id && isMe) {
       loadMatchingData();
    }
  }, [user?.id, isMe]);

  const loadMatchingData = async () => {
    if (!user?.id) return;
    const [myMatches, recommendations] = await Promise.all([
      fetchMyMatches(user.id),
      getDiscoveryRecommendationsAPI(user.id)
    ]);
    
    // Combine and deduplicate
    const combined = [...myMatches];
    recommendations.forEach((rec: any) => {
      // Check if already in matches (based on other user id)
      const exists = combined.some(m => m.userAId === rec.id || m.userBId === rec.id);
      if (!exists) {
        combined.push({
          id: `rec-${rec.id}`,
          userAId: user.id,
          userBId: rec.id,
          userAName: user.name,
          userBName: rec.name,
          similarityScore: rec.similarityScore,
          matchedAt: new Date().toISOString(),
          role: rec.role,
          trait: rec.trait
        });
      }
    });
    setMatches(combined);
  };

  const handleSyncMatches = async () => {
    setIsSyncing(true);
    await triggerMatchingSync();
    setTimeout(() => {
      loadMatchingData();
      setIsSyncing(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24">
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-[#8957e5]" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">{isMe ? 'Profilim' : 'Profil'}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto pt-6 px-4">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 mb-6 text-center relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-[#238636]/20 via-[#58a6ff]/15 to-[#8957e5]/20" />
          
          <div className="w-20 h-20 mx-auto bg-[#0d1117] border-4 border-[#161b22] rounded-full flex items-center justify-center text-3xl font-bold text-white relative z-10 shadow-xl mb-3">
            {user.name.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-xl font-bold text-white">{user.name}</h2>
          <p className="text-[#8b949e] text-sm mb-3">@{user.email.split('@')[0]}</p>
          
          <div className="flex items-center justify-center space-x-2 mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              user.role === 'admin' ? 'bg-[#f85149]/10 text-[#f85149] border border-[#f85149]/20' :
              user.role === 'mentor' ? 'bg-[#d29922]/10 text-[#d29922] border border-[#d29922]/20' :
              user.role === 'teacher' ? 'bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20' :
              'bg-[#30363d] text-[#c9d1d9] border border-[#30363d]'
            }`}>
              {user.role === 'admin' ? 'Yönetici' : user.role === 'mentor' ? 'Mentör' : user.role === 'teacher' ? 'Eğitmen' : 'Katılımcı'}
            </span>
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-[#238636]/10 text-[#238636] border border-[#238636]/20">
              {user.groupId}
            </span>
          </div>

          {user.socialLinks && (
            <div className="flex justify-center space-x-2 mb-3">
              {user.socialLinks.linkedin && (
                <a href={user.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-[#0a66c2] transition-colors" title="LinkedIn">
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
              )}
              {(user.socialLinks.twitter || user.socialLinks.x) && (
                <a href={user.socialLinks.twitter || user.socialLinks.x} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white transition-colors" title="X (Twitter)">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
              )}
              {user.socialLinks.github && (
                <a href={user.socialLinks.github} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-white transition-colors" title="GitHub">
                  <Github className="w-3.5 h-3.5" />
                </a>
              )}
              {user.socialLinks.instagram && (
                <a href={user.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-[#e1306c] transition-colors" title="Instagram">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
              )}
              {user.socialLinks.facebook && (
                <a href={user.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-[#1877f2] transition-colors" title="Facebook">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            <div className="inline-flex items-center space-x-2 bg-[#238636]/10 border border-[#238636]/20 text-[#238636] px-3 py-1 rounded-full text-sm font-medium">
              <Award className="w-4 h-4" />
              <span>{user.cognitiveProfile?.trait || 'Katılımcı'}</span>
            </div>
            
            <button
              onClick={() => navigate('/onboarding', { state: { editMode: true } })}
              className="inline-flex items-center space-x-1.5 bg-[#1f6feb]/10 hover:bg-[#1f6feb]/20 border border-[#1f6feb]/20 transition-colors text-[#58a6ff] px-3 py-1 rounded-full text-sm font-medium"
              title="Tanışma Sorularını Düzenle"
            >
              <Settings className="w-4 h-4" />
              <span>Yanıtları Düzenle</span>
            </button>
          </div>
        </motion.div>

        {/* Behavioral Analytics Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center"
          >
            <Activity className="w-5 h-5 text-[#238636] mx-auto mb-1" />
            <div className="text-lg font-bold text-white">%{pm?.engagement || 0}</div>
            <div className="text-[10px] text-[#8b949e]">Katılım</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center"
          >
            <Clock className="w-5 h-5 text-[#58a6ff] mx-auto mb-1" />
            <div className="text-lg font-bold text-white">%{pm?.punctuality || 0}</div>
            <div className="text-[10px] text-[#8b949e]">Dakiklik</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center"
          >
            <Users className="w-5 h-5 text-[#d29922] mx-auto mb-1" />
            <div className="text-lg font-bold text-white">%{pm?.teamwork || 0}</div>
            <div className="text-[10px] text-[#8b949e]">Takım Uyumu</div>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center flex items-center justify-center space-x-3">
            <MessageSquare className="w-4 h-4 text-[#58a6ff]" />
            <div>
              <span className="text-lg font-bold text-white">{userPosts.length}</span>
              <span className="text-[10px] text-[#8b949e] ml-1">Gönderi</span>
            </div>
          </div>
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-3 text-center flex items-center justify-center space-x-3">
            <Calendar className="w-4 h-4 text-[#d29922]" />
            <div>
              <span className="text-lg font-bold text-white">{attendedEvents.length}</span>
              <span className="text-[10px] text-[#8b949e] ml-1">Etkinlik</span>
            </div>
          </div>
        </div>

        {/* Performance Trends */}
        {pm && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6"
          >
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#d29922]" />
              <span>Gelişim Analizi</span>
            </h3>
            <div className="space-y-3">
              {metricBars.map((metric) => (
                <div key={metric.label}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1.5">
                      <metric.icon className="w-3 h-3" style={{ color: metric.color }} />
                      <span className="text-xs text-[#8b949e]">{metric.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: metric.color }}>{metric.value}%</span>
                  </div>
                  <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${metric.value}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Events */}
        <h3 className="text-sm font-bold text-white mb-3">Katıldığı Etkinlikler</h3>
        <div className="space-y-2 mb-6">
          {attendedEvents.map(event => (
            <div key={event.id} className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#0d1117] rounded-md flex items-center justify-center border border-[#30363d]">
                <Calendar className="w-5 h-5 text-[#8b949e]" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#c9d1d9]">{event.name || event.title}</h4>
                <p className="text-xs text-[#8b949e]">{event.date ? new Date(event.date).toLocaleDateString('tr-TR') : ''} · {event.location || ''}</p>
              </div>
            </div>
          ))}
          {attendedEvents.length === 0 && (
            <p className="text-sm text-[#8b949e]">Henüz bir etkinliğe katılmadı.</p>
          )}
        </div>

        {/* Social Radar (AI Matches) */}
        {isMe && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Network className="w-4 h-4 text-[#8957e5]" />
                <span>Birlikte Öğrenme (AI Eşleşmeleri)</span>
              </h3>
              <button 
                onClick={handleSyncMatches}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-xs bg-[#238636]/10 text-[#238636] border border-[#238636]/20 px-2 py-1 rounded hover:bg-[#238636]/20 transition-all disabled:opacity-50"
              >
                <RefreshCcw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Analiz ediliyor...' : 'Yenile'}</span>
              </button>
            </div>
            
            <div className="space-y-3">
               {matches.length > 0 ? matches.map((match, i) => {
                 const otherName = match.userAId === user.id ? match.userBName : match.userAName;
                 const score = Math.round(match.similarityScore * 100);
                 return (
                   <div key={match.id || i} className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[#8957e5]/20 text-[#8957e5] flex items-center justify-center font-bold text-sm border border-[#8957e5]/30">
                         {otherName.charAt(0).toUpperCase()}
                       </div>
                       <div className="text-sm text-[#c9d1d9] font-medium">{otherName}</div>
                     </div>
                     <div className="text-xs font-bold text-[#8957e5] bg-[#8957e5]/10 px-2 py-1 rounded">
                       %{score} Uyum
                     </div>
                   </div>
                 )
               }) : (
                 <div className="text-center py-4">
                   <p className="text-xs text-[#8b949e]">Henüz senin için bir eşleşme bulunamadı. AI uyum analizini başlatmak için <b>Yenile</b> butonuna tıkla.</p>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </main>
      <Navigation />
    </div>
  );
}
