import React, { useCallback, useRef } from 'react';
import { SliderSurveyComponent } from '../components/Feed/SliderSurveyComponent';
import { FreeTextPostComponent } from '../components/Feed/FreeTextPostComponent';
import { MoodCheckinCard } from '../components/Feed/MoodCheckinCard';
import { MultipleChoiceCard } from '../components/Feed/MultipleChoiceCard';
import { DailySummaryCard } from '../components/Feed/DailySummaryCard';
import { QrCode, LogOut, Pin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTelemetryContext } from '../context/TelemetryContext';
import { useNavigate } from 'react-router-dom';
import { CreatePost } from '../components/Feed/CreatePost';
import { Navigation } from '../components/Shared/Navigation';
import { NotificationsPanel } from '../components/Shared/NotificationsPanel';

export default function HomeFeed() {
  const { user, logout } = useAuth();
  const { posts } = useData();
  const { trackScroll } = useTelemetryContext();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQRScan = () => {
    alert("QR Yoklama tarayıcı açılıyor...");
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    trackScroll(e.currentTarget.scrollTop);
  }, [trackScroll]);

  // Global feed: scope === 'global' veya groupId yoksa (eski verilerle uyum)
  const globalPosts = posts.filter(p => p.scope === 'global' || (!p.groupId && !p.scope));

  // Pinned posts üstte, diğerleri tarih sırasına göre
  const pinnedPosts = globalPosts.filter(p => p.isPinned);
  const regularPosts = globalPosts.filter(p => !p.isPinned);

  const renderPost = (post: any) => {
    switch (post.objectType) {
      case 'mood_checkin':
        return <MoodCheckinCard key={post.id} post={post} />;
      case 'multiple_choice':
        return <MultipleChoiceCard key={post.id} post={post} />;
      case 'slider_survey':
        return <SliderSurveyComponent key={post.id} post={post} />;
      case 'text_post':
        return <FreeTextPostComponent key={post.id} post={post} />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24"
      onScroll={handleScroll}
    >
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#238636] to-[#58a6ff] rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-[#238636]/20">
            V
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Akış</h1>
            <p className="text-[9px] text-[#8b949e]">Tüm grupların ortak alanı</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleQRScan}
            className="flex items-center space-x-2 bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-full hover:bg-[#30363d] transition-colors text-sm font-medium"
          >
            <QrCode className="w-4 h-4 text-[#58a6ff]" />
            <span>Yoklama</span>
          </button>
          <NotificationsPanel />
          <button onClick={handleLogout} className="text-[#8b949e] hover:text-[#f85149] transition-colors p-1">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto pt-4 px-4" ref={scrollRef}>
        {/* Welcome + Stats */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-[#8b949e]">Hoş geldin, <span className="text-[#c9d1d9] font-semibold">{user?.cognitiveProfile?.name || user?.name}</span></p>
          </div>
        </div>



        {/* AI Daily Summary */}
        <DailySummaryCard />

        {/* Create Post (global scope) */}
        <CreatePost />

        {/* Pinned System Posts */}
        {pinnedPosts.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center space-x-1.5 mb-2">
              <Pin className="w-3 h-3 text-[#d29922]" />
              <span className="text-[10px] font-medium text-[#d29922]">Sabit Gönderiler</span>
            </div>
            <div className="space-y-1">
              {pinnedPosts.map(renderPost)}
            </div>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-1">
          {regularPosts.map(renderPost)}
        </div>

        {/* Skeleton Loaders */}
        <div className="space-y-4 mt-4">
          {[1, 2].map((i) => (
            <div key={`skeleton-${i}`} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full skeleton" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-24 skeleton" />
                  <div className="h-2 w-16 skeleton" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full skeleton" />
                <div className="h-3 w-3/4 skeleton" />
              </div>
            </div>
          ))}
        </div>


      </main>
      
      <Navigation />
    </div>
  );
}
