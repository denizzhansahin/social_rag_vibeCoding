import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { CalendarDays, Search, MapPin, Clock, X, Plus, Check, Loader2, Trash2, UserPlus, Users, Edit2, AlertCircle } from 'lucide-react';
import { 
  GET_EVENTS, 
  GET_EVENT_DETAIL, 
  CREATE_EVENT, 
  UPDATE_EVENT, 
  DELETE_EVENT, 
  ASSIGN_GROUP_TO_EVENT, 
  UNASSIGN_GROUP_FROM_EVENT, 
  ASSIGN_TO_EVENT, 
  UNASSIGN_USER_FROM_EVENT,
  GET_GROUPS_MINIMAL,
  GET_USERS_WITH_STATUS
} from '../../api/graphql';

export default function Events() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showAssignGroupModal, setShowAssignGroupModal] = useState(false);
  const [showAssignUserModal, setShowAssignUserModal] = useState(false);
  
  const [eventForm, setEventForm] = useState({ title: '', description: '', eventType: 'workshop', location: '', startTime: '' });
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [assignmentRole, setAssignmentRole] = useState('TEACHER');
  const [toast, setToast] = useState<string | null>(null);

  // GraphQL
  const { data: eventsData, loading: eventsLoading, error: eventsError, refetch: refetchEvents } = useQuery(GET_EVENTS) as any;
  const [loadDetail, { data: detailData, loading: detailLoading, refetch: refetchDetail }] = useLazyQuery(GET_EVENT_DETAIL) as any;
  const { data: groupsData } = useQuery(GET_GROUPS_MINIMAL) as any;
  const { data: usersData } = useQuery(GET_USERS_WITH_STATUS) as any;

  // Use refetchQueries for better sync
  const refetchQueries = [{ query: GET_EVENTS }];

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const [createEvent, { loading: creating }] = useMutation(CREATE_EVENT, { 
    refetchQueries, 
    onCompleted: () => { setIsModalOpen(false); showToast('Etkinlik oluşturuldu'); },
    onError: (err) => alert(`Etkinlik Oluşturma Hatası: ${err.message}`)
  });
  const [updateEvent] = useMutation(UPDATE_EVENT, { 
    refetchQueries, 
    onCompleted: () => { setIsEditModalOpen(false); showToast('Etkinlik güncellendi'); },
    onError: (err) => alert(`Güncelleme Hatası: ${err.message}`)
  });
  const [deleteEvent] = useMutation(DELETE_EVENT, { 
    refetchQueries, 
    onCompleted: () => { setSelectedEvent(null); showToast('Etkinlik silindi'); },
    onError: (err) => alert(`Silme Hatası: ${err.message}`)
  });

  const [assignGroup] = useMutation(ASSIGN_GROUP_TO_EVENT, { 
    onCompleted: () => { refetchDetail(); showToast('Grup atandı'); },
    onError: (err) => alert(`Grup Atama Hatası: ${err.message}`)
  });
  const [unassignGroup] = useMutation(UNASSIGN_GROUP_FROM_EVENT, { 
    onCompleted: () => { refetchDetail(); showToast('Grup çıkarıldı'); },
    onError: (err) => alert(`Çıkarma Hatası: ${err.message}`)
  });
  
  const [assignUser] = useMutation(ASSIGN_TO_EVENT, { 
    onCompleted: () => { refetchDetail(); showToast('Görevli atandı'); },
    onError: (err) => alert(`Görevli Atama Hatası: ${err.message}`)
  });
  const [unassignUser] = useMutation(UNASSIGN_USER_FROM_EVENT, { 
    onCompleted: () => { refetchDetail(); showToast('Görevli çıkarıldı'); },
    onError: (err) => alert(`Görevli Çıkarma Hatası: ${err.message}`)
  });

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    loadDetail({ variables: { eventId: event.id } });
  };

  const events = (eventsData?.getEvents || []).map((e: any) => ({
    ...e,
    assignments: e.assignments || []
  }));

  const filteredEvents = events.filter((e: any) => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Keep detail fresh
  const activeEvent = events.find((e: any) => e.id === selectedEvent?.id) || selectedEvent;
  
  const staff = (usersData?.getUsersWithStatus || []).filter((u: any) => u.role === 'teacher' || u.role === 'mentor' || u.role === 'admin');

  return (
    <div className="p-6 space-y-6 bg-dark-bg min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="text-electric-blue" />
            Etkinlik Yönetimi
          </h1>
          <p className="text-gray-400 text-sm">Etkinlik planlayın, hoca ve grup atayın</p>
        </div>
        <button 
          onClick={() => { setEventForm({ title: '', description: '', eventType: 'workshop', location: '', startTime: '' }); setIsModalOpen(true); }}
          className="bg-electric-blue hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
        >
          <Plus size={18} /> Yeni Etkinlik
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Event List */}
        <div className="w-1/3 bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Etkinlik ara..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-electric-blue transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {eventsLoading ? (
              <div className="p-10 text-center text-gray-500 font-mono text-xs italic">Veriler senkronize ediliyor...</div>
            ) : eventsError ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-coral-red mx-auto mb-2 opacity-50" />
                <div className="text-coral-red text-xs font-bold">Veri Hatası</div>
                <div className="text-[10px] text-gray-500 mt-1">{eventsError.message}</div>
                <button onClick={() => refetchEvents()} className="mt-3 text-[10px] text-electric-blue hover:underline">Yenile</button>
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="p-10 text-center text-gray-500 font-mono text-xs italic">Etkinlik bulunamadı.</div>
            ) : filteredEvents.map((event: any) => (
              <button
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedEvent?.id === event.id 
                    ? 'bg-electric-blue/10 border-electric-blue shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className="font-bold">{event.title}</div>
                <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500 font-mono uppercase">
                  <span className="flex items-center gap-1"><Clock size={10} /> {new Date(event.startTime).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} /> {event.location || 'Konum Yok'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Event Detail */}
        <div className="flex-1 bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden">
          {activeEvent ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-dark-border flex justify-between items-start bg-white/5">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{activeEvent.title}</h2>
                    <button 
                      onClick={() => { 
                        setEventForm({
                          title: activeEvent.title,
                          description: activeEvent.description || '',
                          eventType: activeEvent.eventType || 'workshop',
                          location: activeEvent.location || '',
                          startTime: activeEvent.startTime ? new Date(activeEvent.startTime).toISOString().slice(0,16) : ''
                        });
                        setIsEditModalOpen(true);
                      }} 
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
                    <span className="bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded uppercase">{activeEvent.eventType}</span>
                    <span>{new Date(activeEvent.startTime).toLocaleString()}</span>
                  </div>
                </div>
                <button 
                  onClick={() => { if(confirm('Silsin mi?')) deleteEvent({ variables: { id: activeEvent.id } }) }}
                  className="p-3 text-gray-500 hover:text-coral-red hover:bg-coral-red/10 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                 <div className="bg-white/5 p-4 rounded-xl border border-dark-border">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">AÇIKLAMA</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">{activeEvent.description || 'Açıklama girilmemiş.'}</p>
                 </div>

                {/* Groups Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                       <Users size={16} className="text-neon-mint" /> Katılımcı Gruplar
                    </h3>
                    <button onClick={() => setShowAssignGroupModal(true)} className="text-[10px] font-bold text-neon-mint hover:underline font-mono uppercase">Grup Ekle</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {detailData?.getEventDetail?.assignedGroups?.length > 0 ? detailData.getEventDetail.assignedGroups.map((group: any) => (
                      <div key={group.id} className="bg-white/5 border border-dark-border p-3 rounded-xl flex justify-between items-center">
                        <span className="text-sm font-bold">{group.name}</span>
                        <button onClick={() => unassignGroup({ variables: { eventId: activeEvent.id, groupId: group.id } })} className="text-gray-600 hover:text-coral-red"><X size={14} /></button>
                      </div>
                    )) : <div className="col-span-2 text-center py-6 border border-dashed border-dark-border rounded-xl text-gray-600 italic text-xs">Atanmış grup yok.</div>}
                  </div>
                </div>

                {/* Staff/Teachers Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                       <UserPlus size={16} className="text-electric-blue" /> Görevli ve Eğitmenler
                    </h3>
                    <button onClick={() => setShowAssignUserModal(true)} className="text-[10px] font-bold text-electric-blue hover:underline font-mono uppercase">Kişi Ekle</button>
                  </div>
                  <div className="bg-white/5 border border-dark-border rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-gray-500 uppercase font-mono">
                        <tr>
                          <th className="px-4 py-3">İsim</th>
                          <th className="px-4 py-3">Rol</th>
                          <th className="px-4 py-3 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {activeEvent.assignments?.length > 0 ? activeEvent.assignments.map((as: any) => {
                          const user = staff.find((u: any) => u.id === as.userId);
                          const userName = user?.cognitiveProfile?.name || user?.email?.split('@')[0] || as.userId.slice(0,8);
                          return (
                            <tr key={as.id} className="hover:bg-white/5 group transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center text-[10px] text-electric-blue font-bold">
                                    {userName.charAt(0)}
                                  </div>
                                  <span className="font-bold group-hover:text-electric-blue transition-colors">{userName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-electric-blue uppercase text-[10px]">{as.role}</td>
                              <td className="px-4 py-3 text-right">
                                <button onClick={() => unassignUser({ variables: { eventId: activeEvent.id, userId: as.userId } })} className="text-gray-500 hover:text-coral-red p-1 transition-colors"><X size={14} /></button>
                              </td>
                            </tr>
                          );
                        }) : <tr><td colSpan={3} className="p-10 text-center text-gray-600 italic">Görevli atanmamış.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white/2 space-y-4">
              <CalendarDays size={64} className="opacity-10" />
              <div className="text-center">
                <p className="font-mono text-sm uppercase tracking-widest">Etkinlik Yönetimi</p>
                <p className="text-xs mt-1">Lütfen detaylarını görmek için bir etkinlik seçin.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-md rounded-2xl p-6 relative z-10 shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Yeni Etkinlik Oluştur</h2>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                createEvent({ 
                  variables: { 
                    input: { ...eventForm, startTime: new Date(eventForm.startTime).toISOString(), createdBy: "00000000-0000-0000-0000-000000000000" } 
                  } 
                }); 
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Başlık</label>
                  <input required className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tip</label>
                    <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.eventType} onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}>
                      <option value="workshop">Atölye</option>
                      <option value="seminar">Seminer</option>
                      <option value="social">Sosyal</option>
                      <option value="competition">Yarışma</option>
                    </select>
                   </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Konum</label>
                    <input className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Zaman</label>
                  <input required type="datetime-local" className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.startTime} onChange={(e) => setEventForm({...eventForm, startTime: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Açıklama</label>
                  <textarea className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 h-20 resize-none" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-dark-border py-3 rounded-xl font-bold">İptal</button>
                  <button type="submit" disabled={creating} className="flex-1 bg-electric-blue py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    {creating && <Loader2 className="animate-spin" size={16} />} Oluştur
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-md rounded-2xl p-6 relative z-10 shadow-2xl">
              <h2 className="text-xl font-bold mb-6">Etkinliği Düzenle</h2>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                updateEvent({ 
                  variables: { 
                    id: activeEvent.id,
                    input: { ...eventForm, startTime: new Date(eventForm.startTime).toISOString() } 
                  } 
                }); 
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Başlık</label>
                  <input required className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.title} onChange={(e) => setEventForm({...eventForm, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tip</label>
                    <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.eventType} onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}>
                      <option value="workshop">Atölye</option>
                      <option value="seminar">Seminer</option>
                      <option value="social">Sosyal</option>
                      <option value="competition">Yarışma</option>
                    </select>
                   </div>
                   <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Konum</label>
                    <input className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.location} onChange={(e) => setEventForm({...eventForm, location: e.target.value})} />
                   </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Zaman</label>
                  <input required type="datetime-local" className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2" value={eventForm.startTime} onChange={(e) => setEventForm({...eventForm, startTime: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Açıklama</label>
                  <textarea className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2 h-20 resize-none" value={eventForm.description} onChange={(e) => setEventForm({...eventForm, description: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-dark-border py-3 rounded-xl font-bold">İptal</button>
                  <button type="submit" className="flex-1 bg-electric-blue py-3 rounded-xl font-bold">Güncelle</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Group Modal */}
      <AnimatePresence>
        {showAssignGroupModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignGroupModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h2 className="text-xl font-bold mb-6">Grup Ata</h2>
              <div className="space-y-4">
                <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 outline-none" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                  <option value="">Grup Seçin...</option>
                  {groupsData?.getGroups?.map((g: any) => (<option key={g.id} value={g.id}>{g.name}</option>))}
                </select>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAssignGroupModal(false)} className="flex-1 text-[10px] font-bold uppercase text-gray-500">İptal</button>
                  <button onClick={() => assignGroup({ variables: { eventId: activeEvent.id, groupId: selectedGroupId } })} disabled={!selectedGroupId} className="flex-1 bg-neon-mint text-dark-bg py-3 rounded-xl font-bold text-[10px] uppercase">Ata</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign User Modal */}
      <AnimatePresence>
        {showAssignUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignUserModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h2 className="text-xl font-bold mb-6">Kişi Ata</h2>
              <div className="space-y-4">
                <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 outline-none mb-2" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Hoca/Mentör Seçin...</option>
                  {staff.map((u: any) => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}
                </select>
                <select className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 outline-none" value={assignmentRole} onChange={(e) => setAssignmentRole(e.target.value)}>
                  <option value="TEACHER">Eğitmen</option>
                  <option value="MENTOR">Mentör</option>
                </select>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAssignUserModal(false)} className="flex-1 text-[10px] font-bold uppercase text-gray-500">İptal</button>
                  <button onClick={() => assignUser({ variables: { eventId: activeEvent.id, userId: selectedUserId, role: assignmentRole } })} disabled={!selectedUserId} className="flex-1 bg-electric-blue py-3 rounded-xl font-bold text-[10px] uppercase">Ata</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 right-6 bg-neon-mint text-dark-bg px-6 py-3 rounded-xl font-bold shadow-2xl z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
