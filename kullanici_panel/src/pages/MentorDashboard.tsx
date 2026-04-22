import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation } from '../components/Shared/Navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import {
  Users, Plus, Calendar, ClipboardCheck, Megaphone,
  UserPlus, UserMinus, MapPin, Clock, CheckCircle2,
  Circle, Send, Pin, X, BarChart3, Smile, Trash2, Globe
} from 'lucide-react';
import { useTelemetryTracker } from '../hooks/useTelemetryTracker';

type Tab = 'group' | 'events' | 'attendance' | 'content';

const MOOD_OPTIONS = [
  { emoji: '😄', label: 'Harika' },
  { emoji: '🙂', label: 'İyi' },
  { emoji: '😐', label: 'Normal' },
  { emoji: '😟', label: 'Zor' },
  { emoji: '😔', label: 'Yorgun' },
];

export default function MentorDashboard() {
  const { user } = useAuth();
  useTelemetryTracker('MentorDashboard', 'mentor_dashboard');
  const {
    groups, users, events, posts,
    createGroup, addMemberToGroup, removeMemberFromGroup,
    createGroupEvent, takeAttendance, createSystemPost, addPost,
  } = useData();
  const [activeTab, setActiveTab] = useState<Tab>('group');

  // Mentörün grupları
  const myGroups = groups.filter(g => g.mentors.some(m => m.id === user?.id));
  const [selectedGroupId, setSelectedGroupId] = useState<string>(myGroups[0]?.id || '');
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Mentörün etkinlikleri: etkinlik atamalarına göre (DataContext artık getEventsForUser çekiyor)
  const myEvents = events.filter(e =>
    (selectedGroupId && e.groupId === selectedGroupId) ||
    e.participants?.some(p => p.id === user?.id) ||
    e.groupId === 'global' || !e.groupId
  );
  const groupEvents = events.filter(e => e.groupId === selectedGroupId);

  // --- States ---
  const [newGroupName, setNewGroupName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);

  // Event form
  const [evtName, setEvtName] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [evtDate, setEvtDate] = useState('');
  const [evtEndDate, setEvtEndDate] = useState('');
  const [evtLocation, setEvtLocation] = useState('');
  const [showEventForm, setShowEventForm] = useState(false);

  // Attendance
  const [attendanceEventId, setAttendanceEventId] = useState('');
  const [checkedUsers, setCheckedUsers] = useState<Set<string>>(new Set());

  // Content
  const [systemText, setSystemText] = useState('');
  const [postScope, setPostScope] = useState<'group' | 'global'>('group');
  const [pinPost, setPinPost] = useState(true);
  const [contentMode, setContentMode] = useState<'text' | 'poll' | 'mood'>('text');
  const [isPostingContent, setIsPostingContent] = useState(false);

  // Poll builder
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  // Mood question
  const [moodQuestion, setMoodQuestion] = useState('Bugün nasıl hissediyorsunuz?');

  // Handlers
  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !user) return;
    createGroup(newGroupName.trim(), user.id);
    setNewGroupName('');
    setShowGroupForm(false);
  };

  const handleAddMember = () => {
    if (!memberEmail.trim() || !selectedGroupId) return;
    const found = users.find(u => u.email.toLowerCase() === memberEmail.toLowerCase());
    if (found) {
      addMemberToGroup(selectedGroupId, found.id);
      setMemberEmail('');
    } else {
      alert('Kullanıcı bulunamadı!');
    }
  };

  const handleCreateEvent = () => {
    if (!evtName.trim() || !evtDate || !user) return;
    createGroupEvent({
      name: evtName.trim(),
      description: evtDesc.trim(),
      date: new Date(evtDate).toISOString(),
      location: evtLocation.trim() || undefined,
    }, selectedGroupId, user.id);
    setEvtName(''); setEvtDesc(''); setEvtDate(''); setEvtEndDate(''); setEvtLocation('');
    setShowEventForm(false);
  };

  const handleTakeAttendance = async () => {
    if (!attendanceEventId || checkedUsers.size === 0) return;
    await takeAttendance(attendanceEventId, Array.from(checkedUsers));
    setCheckedUsers(new Set());
    alert(`✅ ${checkedUsers.size} kişi yoklamaya eklendi!`);
  };

  const toggleCheck = (userId: string) => {
    setCheckedUsers(prev => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSystemPost = async () => {
    if (!user) return;
    setIsPostingContent(true);
    try {
      const targetGroupId = postScope === 'group' ? selectedGroupId : null;
      
      if (contentMode === 'text') {
        if (!systemText.trim()) return;
        await createSystemPost(
          targetGroupId,
          {
            objectType: 'text_post',
            createdBy: user.id,
            authorName: user.name,
            groupId: postScope === 'group' ? selectedGroupId : undefined,
            scope: postScope,
            reactions: {},
            uiPayload: { text: systemText.trim(), allowComments: true },
          },
          pinPost
        );
        setSystemText('');
      } else if (contentMode === 'poll') {
        if (!pollQuestion.trim()) return;
        const validOptions = pollOptions.filter(o => o.trim());
        if (validOptions.length < 2) { alert('En az 2 seçenek giriniz.'); return; }
        await createSystemPost(
          targetGroupId,
          {
            objectType: 'multiple_choice',
            createdBy: user.id,
            authorName: user.name,
            groupId: postScope === 'group' ? selectedGroupId : undefined,
            scope: postScope,
            reactions: {},
            uiPayload: {
              question: pollQuestion.trim(),
              options: validOptions,
              allowMultiple: false,
              text: pollQuestion.trim(),
              allowComments: false,
            },
          },
          pinPost
        );
        setPollQuestion(''); setPollOptions(['', '']);
      } else if (contentMode === 'mood') {
        await createSystemPost(
          targetGroupId,
          {
            objectType: 'mood_checkin',
            createdBy: user.id,
            authorName: user.name,
            groupId: postScope === 'group' ? selectedGroupId : undefined,
            scope: postScope,
            reactions: {},
            uiPayload: {
              question: moodQuestion.trim() || 'Bugün nasıl hissediyorsunuz?',
              options: MOOD_OPTIONS,
              text: moodQuestion.trim() || 'Bugün nasıl hissediyorsunuz?',
              allowComments: false,
            },
          },
          pinPost
        );
        setMoodQuestion('Bugün nasıl hissediyorsunuz?');
      }
      alert('✅ İçerik başarıyla yayınlandı!');
    } catch (err) {
      alert('❌ İçerik yayınlanamadı. Tekrar deneyin.');
    } finally {
      setIsPostingContent(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'group', label: 'Grubum', icon: Users },
    { key: 'events', label: 'Etkinlikler', icon: Calendar },
    { key: 'attendance', label: 'Yoklama', icon: ClipboardCheck },
    { key: 'content', label: 'İçerik', icon: Megaphone },
  ];

  // --- Attendance: Tüm grubu listele + sistem genelindeki etkinlikler ---
  const attendanceEvent = events.find(e => e.id === attendanceEventId);
  const attendanceMembers = selectedGroup?.members || [];

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0d1117]/80 backdrop-blur-xl border-b border-[#30363d] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#d29922] to-[#f0883e] rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Mentör Paneli</h1>
              <p className="text-[10px] text-[#8b949e]">{myGroups.length} grup yönetiyorsun</p>
            </div>
          </div>
          {myGroups.length > 0 && (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#d29922]"
            >
              {myGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex space-x-1 bg-[#161b22] p-1 rounded-lg border border-[#30363d] mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 flex items-center justify-center space-x-1.5 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === t.key ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4">
        {/* ==================== GRUBUM TAB ==================== */}
        {activeTab === 'group' && (
          <div className="space-y-4">
            {selectedGroup && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-[#161b22] border border-[#30363d] rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-white font-bold text-lg">{selectedGroup.name}</h2>
                    <p className="text-xs text-[#8b949e]">{selectedGroup.memberCount} üye • {selectedGroup.mentors.length} mentör</p>
                  </div>
                  <button onClick={() => setShowGroupForm(true)} className="p-2 bg-[#d29922]/15 border border-[#d29922]/30 rounded-lg text-[#d29922] hover:bg-[#d29922]/25 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3 text-center">
                  <p className="text-sm font-bold text-white">{selectedGroup.avgEngagement}%</p>
                  <p className="text-[9px] text-[#8b949e]">Grup Katılım Skoru</p>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {showGroupForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-[#161b22] border border-[#d29922]/30 rounded-xl p-4 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-[#d29922]">Yeni Grup Oluştur</h3>
                    <button onClick={() => setShowGroupForm(false)} className="text-[#8b949e]"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="flex space-x-2">
                    <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Grup adı"
                      className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922]"
                    />
                    <button onClick={handleCreateGroup} className="px-4 py-2 bg-[#d29922] text-white rounded-lg text-sm font-medium hover:bg-[#f0883e] transition-colors">Oluştur</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Add Member */}
            {selectedGroup && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-[#238636]" />
                  <span>Üye Ekle</span>
                </h3>
                <div className="flex space-x-2">
                  <input value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} placeholder="kullanici@vizyon.com"
                    className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
                  />
                  <button onClick={handleAddMember} className="px-4 py-2 bg-[#238636] text-white rounded-lg text-sm font-medium hover:bg-[#2ea043] transition-colors">Ekle</button>
                </div>
              </div>
            )}

            {/* Members */}
            {selectedGroup && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">Üyeler ({selectedGroup.members.length})</h3>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {selectedGroup.members.map(m => (
                    <div key={m.id} className="flex items-center space-x-3 p-2 bg-[#0d1117] rounded-lg border border-[#30363d] group">
                      <div className="w-8 h-8 rounded-full bg-[#30363d] flex items-center justify-center text-white text-sm font-bold">{m.name.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{m.name}</p>
                        <p className="text-[10px] text-[#8b949e]">{m.cognitiveProfile?.trait || 'Katılımcı'}</p>
                      </div>
                      <button onClick={() => removeMemberFromGroup(selectedGroupId, m.id)} className="opacity-0 group-hover:opacity-100 text-[#f85149] transition-opacity p-1" title="Çıkar">
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {selectedGroup.members.length === 0 && <p className="text-sm text-[#8b949e] text-center py-4">Henüz üye yok.</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== ETKİNLİKLER TAB ==================== */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            <button onClick={() => setShowEventForm(!showEventForm)}
              className="w-full py-3 bg-[#161b22] border border-dashed border-[#d29922]/40 rounded-xl text-sm text-[#d29922] hover:bg-[#d29922]/10 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" /><span>Yeni Etkinlik Oluştur</span>
            </button>

            <AnimatePresence>
              {showEventForm && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="bg-[#161b22] border border-[#d29922]/30 rounded-xl p-4 space-y-3 overflow-hidden"
                >
                  <input value={evtName} onChange={e => setEvtName(e.target.value)} placeholder="Etkinlik adı"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922]"
                  />
                  <textarea value={evtDesc} onChange={e => setEvtDesc(e.target.value)} placeholder="Açıklama" rows={2}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922] resize-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b949e]" />
                      <input type="datetime-local" value={evtDate} onChange={e => setEvtDate(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922]"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#8b949e]" />
                      <input value={evtLocation} onChange={e => setEvtLocation(e.target.value)} placeholder="Konum"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922]"
                      />
                    </div>
                  </div>
                  <button onClick={handleCreateEvent} disabled={!evtName.trim() || !evtDate}
                    className="w-full py-2.5 bg-[#d29922] text-white rounded-lg text-sm font-bold hover:bg-[#f0883e] disabled:opacity-30 transition-colors"
                  >Etkinlik Oluştur</button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Existing Events */}
            {myEvents.length > 0 ? myEvents.map(evt => (
              <div key={evt.id} className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{evt.name}</h3>
                    <p className="text-xs text-[#8b949e] mt-0.5">{evt.description}</p>
                  </div>
                  <span className="text-[10px] bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded text-[#8b949e]">
                    {new Date(evt.date).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="flex items-center space-x-3 mt-3 text-[10px] text-[#8b949e]">
                  {evt.location && <span className="flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>{evt.location}</span></span>}
                  <span>{evt.participants?.length || 0} katılımcı</span>
                  <span className="text-[#238636]">{evt.attendedParticipants?.length || 0} yoklama</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-[#8b949e]">
                <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Henüz etkinlik yok.</p>
                <p className="text-[10px] mt-1">Yukarıdan yeni bir etkinlik oluşturabilirsiniz.</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== YOKLAMA TAB ==================== */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                <ClipboardCheck className="w-4 h-4 text-[#238636]" />
                <span>Yoklama Al</span>
              </h3>

              {/* Event selector — tüm mentörün etkinlikleri */}
              <select value={attendanceEventId} onChange={e => { setAttendanceEventId(e.target.value); setCheckedUsers(new Set()); }}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#238636] mb-3"
              >
                <option value="">Etkinlik seçin...</option>
                {myEvents.map(e => <option key={e.id} value={e.id}>{e.name} — {new Date(e.date).toLocaleDateString('tr-TR')}</option>)}
              </select>

              {myEvents.length === 0 && (
                <p className="text-[11px] text-[#8b949e] mb-3">Henüz atanmış etkinlik yok. Önce "Etkinlikler" sekmesinden etkinlik oluşturun.</p>
              )}

              {/* Member checklist */}
              {attendanceEventId && attendanceMembers.length > 0 && (
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                  {attendanceMembers.map(m => {
                    const alreadyAttended = attendanceEvent?.attendedParticipants?.includes(m.id);
                    const isChecked = checkedUsers.has(m.id);

                    return (
                      <button key={m.id} onClick={() => !alreadyAttended && toggleCheck(m.id)}
                        className={`w-full flex items-center space-x-3 p-2.5 rounded-lg border transition-colors text-left ${
                          alreadyAttended ? 'bg-[#238636]/10 border-[#238636]/30' :
                          isChecked ? 'bg-[#58a6ff]/10 border-[#58a6ff]/30' :
                          'bg-[#0d1117] border-[#30363d] hover:border-[#58a6ff]/20'
                        }`}
                        disabled={alreadyAttended}
                      >
                        {alreadyAttended ? <CheckCircle2 className="w-4 h-4 text-[#238636]" /> :
                         isChecked ? <CheckCircle2 className="w-4 h-4 text-[#58a6ff]" /> :
                         <Circle className="w-4 h-4 text-[#30363d]" />}
                        <span className="text-sm text-[#c9d1d9] flex-1">{m.name}</span>
                        {alreadyAttended && <span className="text-[10px] text-[#238636]">Geldi ✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {attendanceEventId && attendanceMembers.length === 0 && (
                <p className="text-sm text-[#8b949e] text-center py-4">Bu gruba üye atanmamış.</p>
              )}

              {attendanceEventId && checkedUsers.size > 0 && (
                <button onClick={handleTakeAttendance}
                  className="w-full mt-3 py-2.5 bg-[#238636] text-white rounded-lg text-sm font-bold hover:bg-[#2ea043] transition-colors flex items-center justify-center space-x-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>{checkedUsers.size} Kişiyi İşaretle</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ==================== İÇERİK TAB ==================== */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
                <Megaphone className="w-4 h-4 text-[#d29922]" />
                <span>İçerik Paylaş</span>
              </h3>

              {/* Content mode selector */}
              <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] mb-4 gap-0.5">
                <button onClick={() => setContentMode('text')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${contentMode === 'text' ? 'bg-[#30363d] text-white' : 'text-[#8b949e]'}`}
                >📝 Metin</button>
                <button onClick={() => setContentMode('poll')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${contentMode === 'poll' ? 'bg-[#d29922] text-white' : 'text-[#8b949e]'}`}
                >🗳️ Anket</button>
                <button onClick={() => setContentMode('mood')}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-medium transition-all ${contentMode === 'mood' ? 'bg-[#8957e5] text-white' : 'text-[#8b949e]'}`}
                >🎭 Duygu</button>
              </div>

              {/* TEXT mode */}
              {contentMode === 'text' && (
                <textarea value={systemText} onChange={e => setSystemText(e.target.value)} placeholder="Duyurunuzu yazın..."
                  rows={3}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922] resize-none mb-3"
                />
              )}

              {/* POLL mode */}
              {contentMode === 'poll' && (
                <div className="space-y-3 mb-3">
                  <textarea value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Sorunuzu yazın..."
                    rows={2}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#d29922] resize-none"
                  />
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#8b949e] w-5 text-center">{i + 1}.</span>
                      <input value={opt} onChange={e => setPollOptions(prev => prev.map((o, idx) => idx === i ? e.target.value : o))}
                        placeholder={`Seçenek ${i + 1}`}
                        className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:border-[#d29922]"
                      />
                      {pollOptions.length > 2 && (
                        <button onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))} className="text-[#8b949e] hover:text-[#f85149] p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button onClick={() => setPollOptions(prev => [...prev, ''])} className="flex items-center gap-1.5 text-xs text-[#d29922]">
                      <Plus className="w-3 h-3" />Seçenek Ekle
                    </button>
                  )}
                </div>
              )}

              {/* MOOD mode */}
              {contentMode === 'mood' && (
                <div className="space-y-3 mb-3">
                  <input value={moodQuestion} onChange={e => setMoodQuestion(e.target.value)} placeholder="Duygu sorusu..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:border-[#8957e5]"
                  />
                  <div className="flex gap-2">
                    {MOOD_OPTIONS.map(m => (
                      <div key={m.emoji} className="flex flex-col items-center gap-1 bg-[#0d1117] rounded-lg p-2 border border-[#30363d] flex-1">
                        <span className="text-lg">{m.emoji}</span>
                        <span className="text-[9px] text-[#8b949e]">{m.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[#8b949e]">Katılımcılar yukarıdaki emojilerden birine tıklayarak yanıtlar.</p>
                </div>
              )}

              {/* Scope & Pin */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] gap-0.5">
                  <button onClick={() => setPostScope('group')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] transition-all ${postScope === 'group' ? 'bg-[#30363d] text-white' : 'text-[#8b949e]'}`}
                  ><Users className="w-3 h-3" />Grubum</button>
                  <button onClick={() => setPostScope('global')}
                    className={`flex items-center gap-1 px-3 py-1 rounded-md text-[10px] transition-all ${postScope === 'global' ? 'bg-[#30363d] text-white' : 'text-[#8b949e]'}`}
                  ><Globe className="w-3 h-3" />Genel</button>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer">
                  <Pin className={`w-3.5 h-3.5 ${pinPost ? 'text-[#d29922]' : 'text-[#8b949e]'}`} />
                  <input type="checkbox" checked={pinPost} onChange={e => setPinPost(e.target.checked)} className="accent-[#d29922]" />
                  <span className="text-xs text-[#8b949e]">Sabitle</span>
                </label>
              </div>

              <button onClick={handleSystemPost} disabled={isPostingContent || 
                (contentMode === 'text' && !systemText.trim()) ||
                (contentMode === 'poll' && !pollQuestion.trim())
              }
                className="w-full py-2.5 bg-[#d29922] text-white rounded-lg text-sm font-bold hover:bg-[#f0883e] disabled:opacity-30 transition-colors flex items-center justify-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>{isPostingContent ? 'Yayınlanıyor...' : 'Yayınla'}</span>
              </button>
            </div>
          </div>
        )}
      </main>

      <Navigation />
    </div>
  );
}
