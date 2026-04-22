import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

export function CreateSurveyForm() {
  const { addPost } = useData();
  const { user } = useAuth();
  const [type, setType] = useState<'slider_survey' | 'text_post'>('slider_survey');
  const [question, setQuestion] = useState('');
  const [groupId, setGroupId] = useState('group-a');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addPost({
      id: `obj-${Date.now()}`,
      objectType: type,
      createdBy: user?.id || 'admin',
      authorName: 'Sistem/Mentor',
      createdAt: new Date().toISOString(),
      groupId: groupId || undefined,
      isSystem: true,
      uiPayload: type === 'slider_survey' ? {
        question,
        sliderMin: 0,
        sliderMax: 100,
        labels: ["Düşük", "Yüksek"]
      } : {
        text: question,
        allowComments: true
      }
    });
    
    alert('Gönderi/Anket başarıyla yayınlandı!');
    setQuestion('');
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Sistem Gönderisi / Anket Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Gönderi Tipi</label>
          <select
            value={type}
            onChange={e => setType(e.target.value as any)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="slider_survey">Slider Anket (1-100)</option>
            <option value="text_post">Serbest Metin / Duyuru</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">
            {type === 'slider_survey' ? 'Soru' : 'Duyuru Metni'}
          </label>
          <textarea
            required
            rows={3}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Hedef Grup</label>
          <select
            value={groupId}
            onChange={e => setGroupId(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="group-a">Grup A (Yazılım)</option>
            <option value="group-b">Grup B (Tasarım)</option>
            <option value="">Tüm Gruplar (Genel Akış)</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-[#8957e5] hover:bg-[#7a4cdb] text-white font-medium py-2.5 rounded-lg transition-colors mt-4">
          Hemen Yayınla
        </button>
      </form>
    </div>
  );
}
