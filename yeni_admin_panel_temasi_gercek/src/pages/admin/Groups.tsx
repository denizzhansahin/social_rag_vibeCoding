import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useLazyQuery, useMutation } from '@apollo/client/react';
import { UsersRound, Search, X, Plus, Loader2, Trash2, UserPlus, UserCheck, Edit2, Check, AlertCircle } from 'lucide-react';
import { 
  GET_GROUPS, 
  GET_GROUP_MEMBERS_DETAILED, 
  CREATE_GROUP, 
  UPDATE_GROUP, 
  DELETE_GROUP, 
  REMOVE_USER_FROM_GROUP, 
  ASSIGN_USER_TO_GROUP, 
  ADD_MENTOR_TO_GROUP, 
  REMOVE_MENTOR_FROM_GROUP,
  GET_USERS_WITH_STATUS
} from '../../api/graphql';

export default function Groups() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [gName, setGName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddMentorModal, setShowAddMentorModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // GraphQL
  const { data: groupsData, loading: groupsLoading, error: listError, refetch: refetchGroups } = useQuery(GET_GROUPS) as any;
  console.log('[Groups_Final_Fix] Component Rendered');
  const { data: usersData } = useQuery(GET_USERS_WITH_STATUS) as any;
  const [loadMembers, { data: membersData, loading: membersLoading, refetch: refetchMembers }] = useLazyQuery(GET_GROUP_MEMBERS_DETAILED) as any;

  // Use refetchQueries for more robust synchronization
  const refetchQueries = [{ query: GET_GROUPS }];

  const [createGroup, { loading: creating }] = useMutation(CREATE_GROUP, { 
    refetchQueries, 
    onCompleted: () => { setShowAddModal(false); setGName(''); showToast('Grup oluşturuldu'); },
    onError: (err) => { console.error('[Groups] Create Error:', err); alert(`Grup Oluşturma Hatası: ${err.message}`); }
  });
  const [deleteGroup] = useMutation(DELETE_GROUP, { 
    refetchQueries, 
    onCompleted: () => { setSelectedGroup(null); showToast('Grup silindi'); },
    onError: (err) => alert(`Silme Hatası: ${err.message}`)
  });
  const [updateGroup] = useMutation(UPDATE_GROUP, { 
    refetchQueries, 
    onCompleted: () => { setIsEditingName(false); showToast('Grup güncellendi'); },
    onError: (err) => alert(`Güncelleme Hatası: ${err.message}`)
  });
  
  const [assignUser] = useMutation(ASSIGN_USER_TO_GROUP, { 
    refetchQueries, 
    onCompleted: () => { refetchMembers(); setShowAddMemberModal(false); showToast('Üye eklendi'); },
    onError: (err) => { console.error('[Groups] Assign Error:', err); alert(`Üye Ekleme Hatası: ${err.message}`); }
  });
  const [removeUser] = useMutation(REMOVE_USER_FROM_GROUP, { 
    refetchQueries, 
    onCompleted: () => { refetchMembers(); showToast('Üye çıkarıldı'); },
    onError: (err) => alert(`Üye Çıkarma Hatası: ${err.message}`)
  });
  
  const [addMentor] = useMutation(ADD_MENTOR_TO_GROUP, { 
    refetchQueries, 
    onCompleted: () => { setShowAddMentorModal(false); showToast('Mentör atandı'); },
    onError: (err) => { console.error('[Groups] Mentor Error:', err); alert(`Mentör Atama Hatası: ${err.message}`); }
  });
  const [removeMentor] = useMutation(REMOVE_MENTOR_FROM_GROUP, { refetchQueries, onCompleted: () => { showToast('Mentör çıkarıldı'); } });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setEditedName(group.name);
    loadMembers({ variables: { groupId: group.id } });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = gName.trim();
    console.log('[Groups_DEBUG] Starting Create Flow. gName state:', gName);
    console.log('[Groups_DEBUG] finalName to send:', finalName);

    if (!finalName) {
      alert('Lütfen bir grup adı girin.');
      return;
    }

    try {
      console.log('[Groups_DEBUG] Calling mutation with variables:', { input: { name: finalName } });
      const result = await createGroup({ 
        variables: { 
          input: { 
            name: finalName 
          } 
        } 
      });
      console.log('[Groups_DEBUG] Mutation call successful. Result:', result);
    } catch (err: any) {
      console.error('[Groups_DEBUG] Caught error during mutation call:', err);
    }
  };

  // Map mentors/members from GQL safely
  const groups = (groupsData?.getGroups || []).map((g: any) => ({
    ...g,
    mentorIds: g.mentors || [],
    memberIds: g.members || []
  }));

  const filteredGroups = groups.filter((g: any) => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Auto-update selectedGroup when groups data changes to keep members/mentors lists in sync
  const currentGroup = groups.find((g: any) => g.id === selectedGroup?.id);
  const activeGroup = currentGroup || selectedGroup;

  const allUsers = usersData?.getUsersWithStatus || [];
  const participants = allUsers.filter((u: any) => u.role === 'participant');
  const mentors = allUsers.filter((u: any) => u.role === 'mentor' || u.role === 'teacher');

  return (
    <div className="p-6 space-y-6 bg-dark-bg min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="text-electric-blue" />
            Grup Yönetimi
          </h1>
          <p className="text-gray-400 text-sm">Grup oluşturun, mentör ve üye atayın</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-electric-blue hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
        >
          <Plus size={18} /> Yeni Grup
        </button>
      </div>

      <div className="flex gap-6 h-[calc(100vh-180px)]">
        {/* Group List */}
        <div className="w-1/3 bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input 
                type="text" 
                placeholder="Grup ara..."
                className="w-full bg-dark-bg border border-dark-border rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-electric-blue transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {groupsLoading ? (
              <div className="p-10 text-center text-gray-500 font-mono text-xs">Yükleniyor...</div>
            ) : listError ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-coral-red mx-auto mb-2 opacity-50" />
                <div className="text-coral-red text-xs font-bold">Veri Hatası</div>
                <div className="text-[10px] text-gray-500 mt-1">{listError.message}</div>
                <button onClick={() => refetchGroups()} className="mt-3 text-[10px] text-electric-blue hover:underline">Yenile</button>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-10 text-center text-gray-500 font-mono text-xs">Grup bulunamadı.</div>
            ) : filteredGroups.map((group: any) => (
              <button
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedGroup?.id === group.id 
                    ? 'bg-electric-blue/10 border-electric-blue shadow-[0_0_15px_rgba(37,99,235,0.1)]' 
                    : 'bg-white/5 border-transparent hover:bg-white/10'
                }`}
              >
                <div className="font-bold">{group.name}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[10px] text-gray-500 uppercase font-mono">ID: {group.id.slice(0,8)}</span>
                  <span className="text-[10px] bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded-full font-bold">
                    {group.memberIds?.length || 0} Üye
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Group Detail */}
        <div className="flex-1 bg-dark-surface border border-dark-border rounded-2xl flex flex-col overflow-hidden">
          {selectedGroup ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-dark-border flex justify-between items-start bg-white/5">
                <div className="space-y-1 flex-1">
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input 
                        className="bg-dark-bg border border-electric-blue rounded px-3 py-1 font-bold text-xl outline-none"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        autoFocus
                      />
                      <button onClick={() => updateGroup({ variables: { id: activeGroup.id, input: { name: editedName } } })} className="p-2 bg-neon-mint text-dark-bg rounded-lg hover:bg-neon-mint/80"><Check size={20} /></button>
                      <button onClick={() => setIsEditingName(false)} className="p-2 bg-dark-bg border border-dark-border rounded-lg"><X size={20} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold">{activeGroup.name}</h2>
                      <button onClick={() => setIsEditingName(true)} className="text-gray-500 hover:text-white transition-colors"><Edit2 size={16} /></button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 font-mono tracking-widest uppercase mt-1">Grup Detayları ve Yönetimi</p>
                </div>
                <button 
                  onClick={() => { if(confirm('Grubu silmek istediğinize emin misiniz?')) deleteGroup({ variables: { id: activeGroup.id } }) }}
                  className="p-3 text-gray-500 hover:text-coral-red hover:bg-coral-red/10 rounded-xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                {/* Mentors Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <UserCheck size={16} className="text-neon-mint" /> Mentörler
                    </h3>
                    <button 
                      onClick={() => setShowAddMentorModal(true)}
                      className="text-[10px] font-bold uppercase tracking-widest text-neon-mint hover:underline"
                    >
                      Mentör Ekle
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {activeGroup.mentorIds?.length > 0 ? activeGroup.mentorIds.map((mid: string) => {
                      const mentor = mentors.find((u: any) => u.id === mid);
                      const mentorName = mentor?.cognitiveProfile?.name || mentor?.email?.split('@')[0] || 'Bilinmeyen Mentör';
                      return (
                        <div key={mid} className="bg-white/5 border border-dark-border p-3 rounded-xl flex justify-between items-center hover:border-neon-mint/30 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-neon-mint/10 flex items-center justify-center text-neon-mint font-bold text-xs">
                              {mentorName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-bold group-hover:text-neon-mint transition-colors">{mentorName}</div>
                              <div className="text-[10px] text-gray-500">{mentor?.email || mid}</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeMentor({ variables: { groupId: activeGroup.id, mentorId: mid } })}
                            className="text-gray-600 hover:text-coral-red p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    }) : (
                      <div className="col-span-2 text-center py-6 border border-dashed border-dark-border rounded-xl text-gray-600 italic text-xs">Mentör atanmamış.</div>
                    )}
                  </div>
                </div>

                {/* Members Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                      <UserPlus size={16} className="text-electric-blue" /> Üyeler
                    </h3>
                    <button 
                      onClick={() => setShowAddMemberModal(true)}
                      className="text-[10px] font-bold uppercase tracking-widest text-electric-blue hover:underline font-mono"
                    >
                      Üye Ekle
                    </button>
                  </div>
                  <div className="bg-white/5 border border-dark-border rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-white/5 text-gray-500 uppercase font-mono">
                        <tr>
                          <th className="px-4 py-3">Üye</th>
                          <th className="px-4 py-3">E-posta</th>
                          <th className="px-4 py-3 text-right">İşlem</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-border">
                        {membersLoading ? (
                          <tr><td colSpan={3} className="p-10 text-center text-gray-600 italic">Veriler senkronize ediliyor...</td></tr>
                        ) : membersData?.getGroupMembersDetailed?.length > 0 ? membersData.getGroupMembersDetailed.map((member: any) => {
                          const memberName = member.cognitiveProfile?.name || member.email.split('@')[0];
                          return (
                            <tr key={member.id} className="hover:bg-white/5 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-electric-blue/10 flex items-center justify-center text-[10px] text-electric-blue font-bold">
                                    {memberName.charAt(0)}
                                  </div>
                                  <span className="font-bold group-hover:text-electric-blue transition-colors">{memberName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 font-mono text-[10px]">{member.email}</td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => removeUser({ variables: { groupId: activeGroup.id, userId: member.id } })}
                                  className="text-gray-500 hover:text-coral-red p-1 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={3} className="p-10 text-center text-gray-600 italic">Grupta üye bulunmuyor.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white/2 space-y-4">
              <UsersRound size={64} className="opacity-10" />
              <div className="text-center">
                <p className="font-mono text-sm uppercase tracking-widest">Yönetim Paneli</p>
                <p className="text-xs mt-1">Lütfen detaylarını görmek için bir grup seçin.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Group Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h2 className="text-xl font-bold mb-6">Yeni Grup Oluştur</h2>
              <form 
                onSubmit={handleCreateGroup} 
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Grup Adı</label>
                  <input 
                    required 
                    placeholder="Örn: A Takımı"
                    className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 focus:border-electric-blue outline-none"
                    value={gName}
                    onChange={(e) => setGName(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-dark-border py-3 rounded-xl font-bold hover:bg-white/10 transition-all">İptal</button>
                  <button type="submit" disabled={creating} className="flex-1 bg-electric-blue py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                    {creating && <Loader2 className="animate-spin" size={16} />}
                    Oluştur
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Member Modal */}
      <AnimatePresence>
        {showAddMemberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMemberModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h2 className="text-xl font-bold mb-6">Üye Ekle</h2>
              <div className="space-y-4">
                <select 
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 outline-none focus:border-electric-blue"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Katılımcı Seçin...</option>
                  {participants.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddMemberModal(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-[10px]">İptal</button>
                  <button 
                    onClick={() => {
                      console.log('[Groups] Assigning user:', { groupId: activeGroup.id, userId: selectedUserId });
                      assignUser({ variables: { input: { groupId: activeGroup.id, userId: selectedUserId } } });
                    }}
                    disabled={!selectedUserId} 
                    className="flex-1 bg-electric-blue py-3 rounded-xl font-bold hover:bg-blue-600 transition-all text-[10px] uppercase"
                  >
                    Ekle
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Mentor Modal */}
      <AnimatePresence>
        {showAddMentorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddMentorModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-sm rounded-2xl p-6 relative z-10">
              <h2 className="text-xl font-bold mb-6">Mentör Ata</h2>
              <div className="space-y-4">
                <select 
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-3 outline-none focus:border-neon-mint"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Mentör/Hoca Seçin...</option>
                  {mentors.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowAddMentorModal(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-[10px]">İptal</button>
                  <button 
                    onClick={() => {
                      console.log('[Groups] Adding mentor:', { groupId: activeGroup.id, mentorId: selectedUserId, isPrimary: false });
                      addMentor({ variables: { groupId: activeGroup.id, mentorId: selectedUserId, isPrimary: false } });
                    }}
                    disabled={!selectedUserId} 
                    className="flex-1 bg-neon-mint text-dark-bg py-3 rounded-xl font-bold hover:bg-neon-mint/80 transition-all text-[10px] uppercase"
                  >
                    Ata
                  </button>
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
