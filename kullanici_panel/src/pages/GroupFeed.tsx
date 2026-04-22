import React, { useState, useCallback } from 'react';
import { Navigation } from '../components/Shared/Navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTelemetryContext } from '../context/TelemetryContext';
import { CreatePost } from '../components/Feed/CreatePost';
import { FreeTextPostComponent } from '../components/Feed/FreeTextPostComponent';
import { SliderSurveyComponent } from '../components/Feed/SliderSurveyComponent';
import { MoodCheckinCard } from '../components/Feed/MoodCheckinCard';
import { MultipleChoiceCard } from '../components/Feed/MultipleChoiceCard';
import { Users, Linkedin, Twitter, Github, Award, TrendingUp, Zap, Flame, Pin, Crown, Plus, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTelemetryTracker } from '../hooks/useTelemetryTracker';

export default function GroupFeed() {
  const { user } = useAuth();
  useTelemetryTracker('GroupFeed', 'group_feed');
  const { posts, groups, users } = useData();
  const { trackScroll } = useTelemetryContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'system' | 'members'>('feed');

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    trackScroll(e.currentTarget.scrollTop);
  }, [trackScroll]);

  // Kullanıcının grubu - Daha esnek eşleştirme
  const myGroup = groups.find(g =>
    (user?.groupId && g.id === user.groupId) || 
    g.members.some(m => m.id === user?.id) || 
    g.mentors.some(m => m.id === user?.id)
  );

  const isMentor = user && ['mentor', 'teacher', 'admin'].includes(user.role!);
  // groupId önceliği: bulunan grup -> kullanıcının profilindeki grup id -> null
  const groupId = myGroup?.id || user?.groupId || user?.cognitiveProfile?.group;

  // Grup gönderileri (scope === 'group')
  const groupPosts = posts.filter(p => (p.groupId === groupId && p.scope === 'group'));
  // Tüm grup postları feed'de görüntülenir (mentor postları dahil)
  // Sadece gerçek sistem/duyuru postları (postType=announcement veya isPinned=true) sistem sekmesinde
  const systemPosts = groupPosts.filter(p => p.isSystem && p.isPinned);
  const feedPosts = groupPosts.filter(p => !p.isPinned || !p.isSystem);
  const pinnedPosts = systemPosts.filter(p => p.isPinned);
  const unpinnedSystem = systemPosts.filter(p => !p.isPinned);

  // Grup üyeleri
  const groupMembers = myGroup ? [...myGroup.mentors, ...myGroup.members] : users.filter(u => u.groupId === groupId);
  const sortedMembers = [...groupMembers].sort((a, b) => {
    const w: Record<string, number> = { admin: 0, teacher: 1, mentor: 2, participant: 3 };
    const wa = w[a.role || 'participant'] ?? 3;
    const wb = w[b.role || 'participant'] ?? 3;
    if (wa !== wb) return wa - wb;
    return (b.performanceMetrics?.engagement || 0) - (a.performanceMetrics?.engagement || 0);
  });

  // Stats - Real data from backend if available
  const avgEngagement = myGroup?.avgEngagement || 0;

  const renderPost = (post: any) => {
    switch (post.objectType) {
      case 'mood_checkin': return <MoodCheckinCard key={post.id} post={post} />;
      case 'multiple_choice': return <MultipleChoiceCard key={post.id} post={post} />;
      case 'slider_survey': return <SliderSurveyComponent key={post.id} post={post} />;
      case 'text_post': return <FreeTextPostComponent key={post.id} post={post} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24 overflow-y-auto" onScroll={handleScroll}>
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#161b22] border border-[#30363d] rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-[#58a6ff]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Grubum</h1>
              <p className="text-[10px] text-[#8b949e]">{myGroup?.name || 'Yükleniyor...'}</p>
            </div>
          </div>
          {isMentor && (
            <button onClick={() => navigate('/mentor-dashboard')}
              className="flex items-center space-x-1.5 bg-[#d29922]/15 border border-[#d29922]/30 px-3 py-1.5 rounded-full text-xs text-[#d29922] hover:bg-[#d29922]/25 transition-colors"
            >
              <Crown className="w-3.5 h-3.5" /><span>Yönet</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-xl mx-auto pt-4 px-4">
        {/* Group Performance Summary */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-bold">{myGroup?.name || groupId || 'Grubum'}</h2>
              <p className="text-xs text-[#8b949e]">{groupMembers.length} üye</p>
            </div>
            {/* Mentör avatarları */}
            <div className="flex -space-x-2">
              {(myGroup?.mentors || []).map(m => (
                <div key={m.id} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d29922] to-[#f0883e] flex items-center justify-center text-white text-xs font-bold border-2 border-[#161b22]" title={m.name}>
                  {m.name.charAt(0)}
                </div>
              ))}
            </div>
          </div>

          {/* Mentor names */}
          {myGroup?.mentors && myGroup.mentors.length > 0 && (
            <div className="flex items-center space-x-1 mb-3">
              <Crown className="w-3 h-3 text-[#d29922]" />
              <span className="text-[10px] text-[#d29922]">
                {myGroup.mentors.map(m => m.cognitiveProfile?.name || m.name).join(', ')}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0d1117] rounded-lg p-2 text-center">
              <TrendingUp className="w-3.5 h-3.5 text-[#238636] mx-auto mb-1" />
              <p className="text-sm font-bold text-white">{avgEngagement}%</p>
              <p className="text-[9px] text-[#8b949e]">Grup Katılımı</p>
            </div>
            <div className="bg-[#0d1117] rounded-lg p-2 text-center">
              <Users className="w-3.5 h-3.5 text-[#58a6ff] mx-auto mb-1" />
              <p className="text-sm font-bold text-white">{groupMembers.length}</p>
              <p className="text-[9px] text-[#8b949e]">Üye Sayısı</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 bg-[#161b22] p-1 rounded-lg border border-[#30363d] overflow-x-auto hide-scrollbar">
          <button onClick={() => setActiveTab('feed')}
            className={`flex-1 min-w-[80px] py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'feed' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >Grup Akışı</button>
          <button onClick={() => setActiveTab('system')}
            className={`flex-1 min-w-[90px] py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'system' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >Mentör & Sistem</button>
          <button onClick={() => setActiveTab('members')}
            className={`flex-1 min-w-[80px] py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'members' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >Üyeler</button>
        </div>

        {activeTab === 'feed' && <CreatePost groupId={groupId} />}

        {activeTab === 'feed' && (
          <div className="space-y-4">
            {feedPosts.map(renderPost)}
            {feedPosts.length === 0 && (
              <div className="text-center py-10 text-[#8b949e]">Henüz grup gönderisi yok.</div>
            )}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4">
            {/* Pinned on top */}
            {pinnedPosts.length > 0 && (
              <div>
                <div className="flex items-center space-x-1.5 mb-2">
                  <Pin className="w-3 h-3 text-[#d29922]" />
                  <span className="text-[10px] font-medium text-[#d29922]">Sabitlenmiş</span>
                </div>
                {pinnedPosts.map(renderPost)}
              </div>
            )}
            {/* Unpinned system */}
            {unpinnedSystem.map(renderPost)}
            {systemPosts.length === 0 && (
              <div className="text-center py-10 text-[#8b949e]">Henüz mentör/sistem gönderisi yok.</div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-2">
            {sortedMembers.map((member, index) => (
              <Link to={`/profile/${member.id}`} key={member.id}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center space-x-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d] hover:border-[#58a6ff]/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base border ${
                    member.role === 'mentor' || member.role === 'teacher' ? 'bg-gradient-to-br from-[#d29922] to-[#f0883e] border-[#d29922]/30' :
                    'bg-gradient-to-br from-[#30363d] to-[#161b22] border-[#30363d]'
                  }`}>
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-[#c9d1d9] truncate">
                        {member.name}
                        {member.id === user?.id && <span className="text-xs font-normal text-[#8b949e] ml-1">(Sen)</span>}
                      </h3>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {member.socialLinks && (
                          <div className="flex space-x-1">
                            {member.socialLinks.linkedin && <Linkedin className="w-3 h-3 text-[#8b949e]" />}
                            {member.socialLinks.twitter && <Twitter className="w-3 h-3 text-[#8b949e]" />}
                            {member.socialLinks.github && <Github className="w-3 h-3 text-[#8b949e]" />}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded border ${
                        member.role === 'admin' ? 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/20' :
                        member.role === 'mentor' || member.role === 'teacher' ? 'bg-[#d29922]/10 text-[#d29922] border-[#d29922]/20' :
                        'bg-[#30363d] text-[#c9d1d9] border-[#30363d]'
                      }`}>
                        {member.role === 'admin' ? 'Yönetici' : member.role === 'mentor' ? 'Mentör' : member.role === 'teacher' ? 'Eğitmen' : 'Katılımcı'}
                      </span>
                      <span className="text-[10px] text-[#8b949e] flex items-center">
                        <Award className="w-3 h-3 mr-0.5 text-[#d29922]" />
                        {member.cognitiveProfile?.trait || 'Katılımcı'}
                      </span>
                      <span className="text-[10px] text-[#238636] flex items-center">
                        <Activity className="w-3 h-3 mr-0.5" />
                        %{member.performanceMetrics?.engagement || 0}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Navigation />
    </div>
  );
}
