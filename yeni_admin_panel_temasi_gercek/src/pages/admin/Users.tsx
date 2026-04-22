import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation } from '@apollo/client/react';
import { UsersRound, Search, X, Plus, Loader2, Trash2, UserPlus, UserCheck, Edit2, Check, Key, AlertCircle, Activity, BarChart2, Target, Clock, Zap } from 'lucide-react';
import { GET_USERS_WITH_STATUS, CREATE_USER, UPDATE_USER, DELETE_USER } from '../../api/graphql';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'participant', password: '', bio: '' });
  const [editData, setEditData] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);

  // GraphQL Data
  const { data: usersData, loading: usersLoading, error: usersError, refetch } = useQuery(GET_USERS_WITH_STATUS) as any;
  
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, { 
    onCompleted: () => { refetch(); showToast('Kullanıcı oluşturuldu'); } 
  });
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, { 
    onCompleted: () => { refetch(); showToast('Kullanıcı güncellendi'); } 
  });
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER, { 
    onCompleted: () => { refetch(); showToast('Kullanıcı silindi'); } 
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const users = usersData?.getUsersWithStatus?.map((u: any) => ({
    id: u.id,
    name: u.cognitiveProfile?.name || u.email.split('@')[0],
    email: u.email,
    role: u.role,
    status: u.status,
    presenceStatus: u.presenceStatus || 'offline',
    bio: u.cognitiveProfile?.bio || '',
    performanceMetrics: u.performanceMetrics || {}
  })) || [];

  const handleEdit = (user: any) => {
    setEditData({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      bio: user.bio,
      password: ''
    });
    setShowEditModal(true);
  };

  const onUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updates: any = {};
    if (editData.role) updates.role = editData.role;
    if (editData.status) updates.status = editData.status;
    updates.cognitiveProfile = { name: editData.name || '', bio: editData.bio || '' };
    
    if (editData.password && editData.password.trim() !== '') {
      updates.password = editData.password;
    }

    console.log('[Users] Updating user:', { userId: editData.id, updates });
    try {
      await updateUser({ variables: { userId: editData.id, updates } });
      setShowEditModal(false);
      showToast('Kullanıcı güncellendi');
    } catch (err: any) {
      console.error('[Users] Update Error Details:', err);
      const graphQLError = err.graphQLErrors?.[0]?.message || err.message;
      alert(`Güncelleme Hatası (400): ${graphQLError}`);
    }
  };

  const onCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createUser({ 
        variables: { 
          email: newUser.email,
          role: newUser.role,
          password: newUser.password,
          cognitiveProfile: { name: newUser.name, bio: newUser.bio }
        } 
      });
      setShowAddModal(false);
      setNewUser({ name: '', email: '', role: 'participant', password: '', bio: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filteredUsers = users.filter((u: any) => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-dark-bg min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersRound className="text-electric-blue" />
            Kullanıcı Yönetimi
          </h1>
          <p className="text-gray-400 text-sm">Sistem kullanıcılarını ve rollerini yönetin</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-electric-blue hover:bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
        >
          <Plus size={18} /> Yeni Kullanıcı
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
        <input 
          type="text" 
          placeholder="İsim veya e-posta ile ara..."
          className="w-full bg-dark-surface border border-dark-border rounded-xl pl-10 pr-4 py-2 focus:border-electric-blue outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* User Table */}
      <div className="bg-dark-surface border border-dark-border rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-white/5 text-gray-400 text-xs font-mono uppercase">
            <tr>
              <th className="px-6 py-4 text-left">Kullanıcı</th>
              <th className="px-6 py-4 text-left">Rol</th>
              <th className="px-6 py-4 text-left">Durum</th>
              <th className="px-6 py-4 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {usersLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="w-8 h-8 text-electric-blue animate-spin mb-4" />
          <div className="text-gray-500 font-mono text-xs animate-pulse">Veriler senkronize ediliyor...</div>
        </div>
      ) : usersError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="w-12 h-12 text-coral-red mb-4 opacity-50" />
          <div className="text-coral-red font-bold mb-2">Veri Çekme Hatası</div>
          <div className="text-gray-500 text-sm max-w-md">{usersError.message}</div>
          <button onClick={() => refetch()} className="mt-6 text-electric-blue hover:underline text-sm font-medium">Tekrar Dene</button>
        </div>
      ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={4} className="p-10 text-center text-gray-500 font-mono italic">Kullanıcı bulunamadı.</td></tr>
            ) : filteredUsers.map((user: any) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center text-electric-blue font-bold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    user.role === 'admin' ? 'bg-coral-red/20 text-coral-red' :
                    user.role === 'mentor' ? 'bg-amber-500/20 text-amber-500' :
                    user.role === 'teacher' ? 'bg-neon-mint/20 text-neon-mint' :
                    'bg-blue-500/20 text-blue-500'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${user.presenceStatus === 'online' ? 'bg-neon-mint shadow-[0_0_8px_rgba(46,213,115,0.5)]' : 'bg-gray-600'}`} />
                    <span className="text-xs capitalize text-gray-400">{user.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => { setEditData(user); setShowAnalyticsModal(true); }} className="p-2 hover:bg-neon-mint/10 rounded-lg text-gray-400 hover:text-neon-mint transition-all" title="Gelişim Analizi"><Activity size={16} /></button>
                  <button onClick={() => handleEdit(user)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"><Edit2 size={16} /></button>
                  <button onClick={() => { if(confirm('Emin misiniz?')) deleteUser({ variables: { userId: user.id } }) }} className="p-2 hover:bg-coral-red/10 rounded-lg text-gray-400 hover:text-coral-red transition-all"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-dark-surface border border-dark-border w-full max-w-md rounded-2xl p-6 relative z-10 shadow-2xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                {showAddModal ? <UserPlus className="text-electric-blue" /> : <Edit2 className="text-electric-blue" />}
                {showAddModal ? 'Yeni Kullanıcı Oluştur' : 'Kullanıcıyı Düzenle'}
              </h2>
              <form onSubmit={showAddModal ? onCreateSubmit : onUpdateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">İsim</label>
                    <input 
                      required type="text"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:border-electric-blue outline-none"
                      value={showAddModal ? newUser.name : editData.name}
                      onChange={(e) => showAddModal ? setNewUser({...newUser, name: e.target.value}) : setEditData({...editData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">E-Posta</label>
                    <input 
                      required type="email"
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:border-electric-blue outline-none"
                      value={showAddModal ? newUser.email : editData.email}
                      onChange={(e) => showAddModal ? setNewUser({...newUser, email: e.target.value}) : setEditData({...editData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Rol</label>
                    <select 
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 outline-none"
                      value={showAddModal ? newUser.role : editData.role}
                      onChange={(e) => showAddModal ? setNewUser({...newUser, role: e.target.value}) : setEditData({...editData, role: e.target.value})}
                    >
                      <option value="participant">Katılımcı</option>
                      <option value="mentor">Mentör</option>
                      <option value="teacher">Hoca / Eğitmen</option>
                      <option value="admin">Yönetici</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Durum</label>
                    <select 
                      className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 outline-none"
                      value={showAddModal ? 'active' : editData.status}
                      disabled={showAddModal}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                    >
                      <option value="active">Aktif</option>
                      <option value="inactive">Pasif</option>
                      <option value="suspended">Askıya Alındı</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Key size={10} /> {showAddModal ? 'Şifre' : 'Yeni Şifre (Değiştirmeyecekseniz boş bırakın)'}
                  </label>
                  <input 
                    type="password"
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:border-electric-blue outline-none"
                    value={showAddModal ? newUser.password : editData.password}
                    onChange={(e) => showAddModal ? setNewUser({...newUser, password: e.target.value}) : setEditData({...editData, password: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">Biyografi</label>
                  <textarea 
                    className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2 focus:border-electric-blue outline-none h-20 resize-none"
                    value={showAddModal ? newUser.bio : editData.bio}
                    onChange={(e) => showAddModal ? setNewUser({...newUser, bio: e.target.value}) : setEditData({...editData, bio: e.target.value})}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => { setShowAddModal(false); setShowEditModal(false); }} className="flex-1 bg-dark-border py-3 rounded-xl font-bold hover:bg-white/10 transition-all">İptal</button>
                  <button type="submit" className="flex-1 bg-electric-blue py-3 rounded-xl font-bold hover:bg-blue-600 transition-all flex items-center justify-center gap-2">
                    {(creating || updating) && <Loader2 className="animate-spin" size={16} />}
                    {showAddModal ? 'Oluştur' : 'Kaydet'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Analytics Modal */}
      <AnimatePresence>
        {showAnalyticsModal && editData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnalyticsModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-dark-surface border border-dark-border w-full max-w-lg rounded-2xl p-6 relative z-10 shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2 text-white">
                    <Activity className="text-neon-mint" />
                    Gelişim Analizi
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">{editData.name} ({editData.email})</p>
                </div>
                <button onClick={() => setShowAnalyticsModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Katılım', value: editData.performanceMetrics?.engagement || 0, color: '#238636', icon: Activity },
                    { label: 'Gelişim Skoru', value: editData.performanceMetrics?.growth_score || 0, color: '#f59e0b', icon: Zap },
                    { label: 'Dakiklik', value: editData.performanceMetrics?.punctuality || 0, color: '#58a6ff', icon: Clock },
                    { label: 'Takım Uyumu', value: editData.performanceMetrics?.teamwork || 0, color: '#d29922', icon: UsersRound },
                  ].map((metric) => (
                    <div key={metric.label} className="bg-white/5 border border-dark-border rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <metric.icon className="w-4 h-4" style={{ color: metric.color }} />
                          <span className="text-[11px] font-medium text-gray-400">{metric.label}</span>
                        </div>
                        <span className="text-xs font-bold" style={{ color: metric.color }}>%{metric.value}</span>
                      </div>
                      <div className="h-1.5 bg-dark-bg rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${metric.value}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: metric.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Behavioral Traits & AI Summary */}
                <div className="bg-[#0d1117] border border-dark-border rounded-xl p-4 space-y-3">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-bold text-gray-500 uppercase">AI GELİŞİM ANALİZİ (GROWTH PATH)</span>
                     <span className="text-[10px] text-neon-mint bg-neon-mint/10 px-2 py-0.5 rounded">RAG ANALİZİ AKTİF</span>
                   </div>
                   <div className="pt-2 border-t border-dark-border">
                      <p className="text-[12px] text-gray-300 leading-relaxed font-mono">
                        {editData.performanceMetrics?.growth_path ? (
                          <>
                            <span className="text-electric-blue mr-2">▶</span>
                            {editData.performanceMetrics.growth_path}
                          </>
                        ) : (
                          <span className="text-gray-500 italic">"Henüz detaylı gelişim analizi oluşturulmadı. Senkronizasyon sonrası veriler burada belirecektir."</span>
                        )}
                      </p>
                   </div>
                </div>

                {(!editData.performanceMetrics || Object.keys(editData.performanceMetrics).length === 0) && (
                  <div className="p-6 text-center text-gray-500 italic border border-dashed border-dark-border rounded-xl">
                    Bu kullanıcı için henüz gelişim verisi toplanmamış veya hesaplanmamış. İlerleyen günlerde tekrar kontrol edin veya Neo4j Senkronizasyonu yapın.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-6 right-6 bg-neon-mint text-dark-bg px-6 py-3 rounded-xl font-bold shadow-2xl z-[100]">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
