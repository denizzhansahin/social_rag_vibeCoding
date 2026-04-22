import React, { useState, useRef } from 'react';
import { Image, Send, Sparkles, Globe, Users, BarChart3, Plus, Trash2, Smile, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { uploadMediaAPI } from '../../lib/api_client';

type PostMode = 'text_post' | 'multiple_choice' | 'mood_checkin';

const MOOD_OPTIONS = [
  { emoji: '😄', label: 'Harika' },
  { emoji: '🙂', label: 'İyi' },
  { emoji: '😐', label: 'Normal' },
  { emoji: '😟', label: 'Zor' },
  { emoji: '😔', label: 'Yorgun' },
];

export function CreatePost({ groupId: initialGroupId, isSystem: initialIsSystem = false }: { groupId?: string, isSystem?: boolean }) {
  const [text, setText] = useState('');
  const [postMode, setPostMode] = useState<PostMode>('text_post');
  const [scope, setScope] = useState<'global' | 'group'>(initialGroupId ? 'group' : 'global');
  
  // Poll options state
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollQuestion, setPollQuestion] = useState('');

  // Mood checkin state
  const [moodQuestion, setMoodQuestion] = useState('Bugün nasıl hissediyorsunuz?');
  
  // Image Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ url: string, base64: string, type: string }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { addPost } = useData();

  const isMentor = user && ['mentor', 'teacher', 'admin'].includes(user.role!);

  const addPollOption = () => {
    if (pollOptions.length < 6) setPollOptions(prev => [...prev, '']);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    setPollOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  };

  const resetForm = () => {
    setText('');
    setPollQuestion('');
    setPollOptions(['', '']);
    setMoodQuestion('Bugün nasıl hissediyorsunuz?');
    setAttachments([]);
    setError(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Sistem sınırlaması (Admin P. ayarlanabilir denilmişti, şimdilik UI limit 2)
    if (attachments.length + files.length > 2) {
      setError('Bir gönderiye en fazla 2 fotoğraf ekleyebilirsiniz.');
      return;
    }

    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          // Resize and compress via Canvas
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1080;
          const MAX_HEIGHT = 1080;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress 500KB hedeflendiği için kalite 0.7 
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          setAttachments(prev => [...prev, { url: URL.createObjectURL(file), base64: dataUrl, type: 'image/jpeg' }]);
          setIsUploading(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePost = async () => {
    if (!user) return;
    setError(null);
    
    const resolvedGroupId = initialGroupId || (scope === 'group' ? user.groupId : undefined);
    if (scope === 'group' && !resolvedGroupId) {
      setError('Grup gönderisi için grup bulunamadı.');
      return;
    }

    let uiPayload: any;
    let objectType: any;
    let contentText = '';

    if (postMode === 'text_post') {
      if (!text.trim()) return;
      contentText = text.trim();
      objectType = 'text_post';
      uiPayload = { text: contentText, allowComments: true };
    } else if (postMode === 'multiple_choice') {
      if (!pollQuestion.trim()) { setError("Lütfen soru giriniz."); return; }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) { setError("En az 2 seçenek giriniz."); return; }
      contentText = pollQuestion.trim();
      objectType = 'multiple_choice';
      uiPayload = {
        question: pollQuestion.trim(),
        options: validOptions,
        allowMultiple: false,
        text: pollQuestion.trim(),
        allowComments: false,
      };
    } else if (postMode === 'mood_checkin') {
      contentText = moodQuestion.trim() || 'Bugün nasıl hissediyorsunuz?';
      objectType = 'mood_checkin';
      uiPayload = {
        question: contentText,
        options: MOOD_OPTIONS,
        text: contentText,
        allowComments: false,
      };
    }
    
    // Eğer metin girilmediyse bile resim varsa text mode da geçerli say
    if (postMode === 'text_post' && attachments.length > 0 && !text.trim()) {
      contentText = '📷 Fotoğraf paylaştı';
      objectType = 'text_post';
      uiPayload = { text: '', allowComments: true };
    }

    if (!contentText && attachments.length === 0) {
      setError("Gönderi boş olamaz.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Önce yüklenen resimleri backend'e gönder
      const uploadedUrls: string[] = [];
      for (const att of attachments) {
        if (att.base64) {
           const res = await uploadMediaAPI(att.base64, att.type);
           if (res && res.url) uploadedUrls.push(res.url);
        }
      }
      
      // 2. URL'leri payload'a ekle
      if (uploadedUrls.length > 0) {
        uiPayload.attachments = uploadedUrls;
      }

      console.log(`[CreatePost] Submitting post. Author: ${user.id}, Scope: ${scope}, Path: ${resolvedGroupId || 'global'}`);

      await addPost({
        id: `post-${Date.now()}`,
        objectType,
        createdBy: user.id,
        authorName: user.cognitiveProfile?.name || user.name,
        createdAt: new Date().toISOString(),
        groupId: scope === 'group' ? resolvedGroupId : undefined,
        scope: scope,
        // Mentor'ın kendi gönderileri isSystem:false, sadece duyurular/sistem mesajları isSystem:true
        isSystem: initialIsSystem,
        uiPayload,
      });
      resetForm();
    } catch (err) {
      console.error('[CreatePost] Gönderi oluşturulamadı:', err);
      setError('Gönderi kaydedilemedi. Tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 mb-6 shadow-sm">
      {/* Mode selector (mentor only) */}
      {isMentor && (
        <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] mb-3 gap-0.5">
          <button
            onClick={() => { setPostMode('text_post'); resetForm(); }}
            className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${postMode === 'text_post' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >Metin</button>
          <button
            onClick={() => { setPostMode('multiple_choice'); resetForm(); }}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${postMode === 'multiple_choice' ? 'bg-[#d29922] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            <BarChart3 className="w-3 h-3" />Anket
          </button>
          <button
            onClick={() => { setPostMode('mood_checkin'); resetForm(); }}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${postMode === 'mood_checkin' ? 'bg-[#8957e5] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
          >
            <Smile className="w-3 h-3" />Duygu
          </button>
        </div>
      )}

      <div className="flex space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#238636] to-[#58a6ff] flex-shrink-0 flex items-center justify-center text-white font-bold">
          {user?.cognitiveProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1">

          {/* TEXT POST MODE */}
          {postMode === 'text_post' && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={initialIsSystem ? "Duyuru paylaş..." : "Neler düşünüyorsun?"}
              className="w-full bg-transparent border-none outline-none text-[#c9d1d9] placeholder-[#8b949e] resize-none min-h-[80px]"
            />
          )}

          {/* MULTIPLE CHOICE POLL MODE */}
          {postMode === 'multiple_choice' && (
            <div className="space-y-3 py-1">
              <textarea
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Sorunuzu yazın... (ör: Hangi konuyu daha fazla işlemeli?)"
                className="w-full bg-transparent border-none outline-none text-[#c9d1d9] placeholder-[#8b949e] resize-none min-h-[60px]"
              />
              <div className="space-y-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#8b949e] w-5 text-center">{i + 1}.</span>
                    <input
                      value={opt}
                      onChange={(e) => updatePollOption(i, e.target.value)}
                      placeholder={`Seçenek ${i + 1}`}
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#d29922]"
                    />
                    {pollOptions.length > 2 && (
                      <button onClick={() => removePollOption(i)} className="text-[#8b949e] hover:text-[#f85149] p-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {pollOptions.length < 6 && (
                <button onClick={addPollOption} className="flex items-center gap-1.5 text-xs text-[#d29922] hover:text-[#f0883e] transition-colors">
                  <Plus className="w-3.5 h-3.5" />Seçenek Ekle
                </button>
              )}
            </div>
          )}

          {/* MOOD CHECKIN MODE */}
          {postMode === 'mood_checkin' && (
            <div className="space-y-3 py-1">
              <input
                value={moodQuestion}
                onChange={(e) => setMoodQuestion(e.target.value)}
                placeholder="Duygu sorusunu yazın..."
                className="w-full bg-transparent border-none outline-none text-[#c9d1d9] placeholder-[#8b949e] text-sm min-h-[40px]"
              />
              <div className="flex gap-2">
                {MOOD_OPTIONS.map((m) => (
                  <div key={m.emoji} className="flex flex-col items-center gap-1 bg-[#0d1117] rounded-lg p-2 border border-[#30363d] flex-1">
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[9px] text-[#8b949e]">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#8b949e]">Katılımcılar bu emojilerden birini seçerek yanıtlar.</p>
            </div>
          )}

          {/* Scope selector (mentor only) */}
          {isMentor && (
            <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] w-fit mt-2">
              <button
                onClick={() => setScope('global')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[10px] transition-all ${scope === 'global' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <Globe className="w-3 h-3" /><span>Genel</span>
              </button>
              <button
                onClick={() => setScope('group')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[10px] transition-all ${scope === 'group' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <Users className="w-3 h-3" /><span>Grubum</span>
              </button>
            </div>
          )}

          {error && <p className="text-xs text-[#f85149] mt-2">{error}</p>}
          
          {/* Image Previews */}
          {attachments.length > 0 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {attachments.map((att, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[#30363d] flex-shrink-0 group">
                  <img src={att.url || att.base64} alt="Upload preview" className="w-full h-full object-cover" />
                  <button onClick={() => removeAttachment(i)} className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-[#30363d] mt-3">
            <div className="flex space-x-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                multiple 
                onChange={handleImageSelect} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || attachments.length >= 2}
                className="p-2 text-[#8b949e] hover:text-[#58a6ff] hover:bg-[#58a6ff]/10 rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Fotoğraf Ekle"
              >
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin text-[#58a6ff]" /> : <Image className="w-5 h-5" />}
              </button>
              <button className="p-2 text-[#8b949e] hover:text-[#d29922] hover:bg-[#d29922]/10 rounded-full transition-colors" title="AI ile Üret">
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handlePost}
              disabled={isSubmitting || isUploading || ((postMode === 'text_post' && !text.trim() && attachments.length === 0) || (postMode === 'multiple_choice' && !pollQuestion.trim()))}
              className="flex items-center space-x-2 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-full font-medium transition-colors"
            >
              <span>{isSubmitting ? 'Kaydediliyor...' : (isMentor ? 'Yayınla' : 'Paylaş')}</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
