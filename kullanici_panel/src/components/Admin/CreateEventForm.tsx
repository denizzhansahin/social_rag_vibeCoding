import React, { useState } from 'react';
import { useData } from '../../context/DataContext';

export function CreateEventForm() {
  const { addEvent } = useData();
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    groupId: 'group-a'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEvent({
      id: `evt-${Date.now()}`,
      ...formData,
      participants: []
    });
    alert('Etkinlik başarıyla oluşturuldu!');
    setFormData({ name: '', date: '', description: '', groupId: 'group-a' });
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Yeni Etkinlik Oluştur</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Etkinlik Adı</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Tarih ve Saat</label>
          <input
            type="datetime-local"
            required
            value={formData.date}
            onChange={e => setFormData({...formData, date: e.target.value})}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Açıklama</label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff] resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8b949e] mb-1">Hedef Grup</label>
          <select
            value={formData.groupId}
            onChange={e => setFormData({...formData, groupId: e.target.value})}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2 text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="group-a">Grup A (Yazılım)</option>
            <option value="group-b">Grup B (Tasarım)</option>
            <option value="">Tüm Gruplar</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-[#238636] hover:bg-[#2ea043] text-white font-medium py-2.5 rounded-lg transition-colors mt-4">
          Etkinliği Yayınla
        </button>
      </form>
    </div>
  );
}
