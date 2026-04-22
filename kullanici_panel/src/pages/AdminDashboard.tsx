import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, CalendarPlus, FileQuestion, LayoutDashboard, BarChart2 } from 'lucide-react';
import { CreateEventForm } from '../components/Admin/CreateEventForm';
import { CreateSurveyForm } from '../components/Admin/CreateSurveyForm';
import { SliderSurveyComponent } from '../components/Feed/SliderSurveyComponent';
import { FreeTextPostComponent } from '../components/Feed/FreeTextPostComponent';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { posts } = useData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'feed' | 'event' | 'survey'>('feed');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabels = {
    admin: 'Yönetici Paneli',
    mentor: 'Mentör Paneli',
    teacher: 'Eğitmen Paneli',
    participant: 'Katılımcı'
  };

  const roleLabel = roleLabels[user?.role || 'participant'];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24">
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-md border-b border-[#30363d] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-[#238636] to-[#58a6ff] rounded-lg flex items-center justify-center font-bold text-white shadow-[0_0_20px_rgba(35,134,54,0.3)]">
            V
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">{roleLabel}</h1>
            <p className="text-[10px] text-[#8b949e]">Yönetim Modu</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout} 
          className="flex items-center space-x-2 text-[#8b949e] hover:text-[#f85149] transition-colors bg-[#161b22] border border-[#30363d] px-3 py-1.5 rounded-lg"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium hidden sm:inline">Çıkış</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto pt-6 px-4">
        <div className="flex space-x-2 mb-6 bg-[#161b22] p-1 rounded-lg border border-[#30363d] overflow-x-auto">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'feed' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Akış & Analiz</span>
          </button>
          <button 
            onClick={() => setActiveTab('survey')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'survey' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            <FileQuestion className="w-4 h-4" />
            <span>Form / Anket</span>
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('event')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'event' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              <CalendarPlus className="w-4 h-4" />
              <span>Etkinlik</span>
            </button>
          )}
        </div>

        {activeTab === 'feed' && (
          <div className="space-y-6">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-[#8b949e]">Sistem Durumu</p>
                <p className="text-lg font-bold text-white flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#238636] animate-pulse"></span>
                  <span>Aktif Veri Toplanıyor</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#58a6ff]">{posts.length}</p>
                <p className="text-xs text-[#8b949e]">Toplam Gönderi</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white mb-2">Tüm Gönderiler & Anketler</h2>
              {posts.map((post) => {
                return (
                  <div key={post.id} className="relative group">
                    {/* Admin Overlay for Analytics */}
                    <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="bg-[#0d1117]/80 backdrop-blur border border-[#30363d] text-[#58a6ff] hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1">
                        <BarChart2 className="w-3 h-3" />
                        <span>Yanıtları Gör</span>
                      </button>
                    </div>
                    
                    {post.objectType === 'slider_survey' && <SliderSurveyComponent post={post as any} />}
                    {post.objectType === 'text_post' && <FreeTextPostComponent post={post as any} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'event' && user?.role === 'admin' && <CreateEventForm />}
        {activeTab === 'survey' && <CreateSurveyForm />}
      </main>
    </div>
  );
}
