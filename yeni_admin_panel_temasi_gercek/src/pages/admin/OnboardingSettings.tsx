import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, Trash2, Save, GripVertical, ToggleLeft, ToggleRight, Eye, EyeOff, Users, ChevronDown, ChevronUp, RefreshCcw, Activity, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_GRAPHQL_URL;

async function gql(query: string, variables?: any) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  return json.data;
}

interface OnboardingQuestion {
  id: string;
  questionText: string;
  questionType: string;
  options: any;
  orderIndex: number;
  isActive: boolean;
}

interface OnboardingResponseItem {
  id: string;
  userId: string;
  questionId: string;
  responseData: string;
}

export default function OnboardingSettings() {
  const [questions, setQuestions] = useState<OnboardingQuestion[]>([]);
  const [responses, setResponses] = useState<OnboardingResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState('');
  const [newType, setNewType] = useState('text');
  const [newOptions, setNewOptions] = useState('');
  const [saving, setSaving] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  
  // Edit Question State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState<any>(null); // For canceling
  
  // Response Pagination & Accordion
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());
  const [responsePage, setResponsePage] = useState(1);
  const itemsPerPage = 8;

  // Potential Matches
  const [matches, setMatches] = useState<any[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    const data = await gql(`
      query {
        getAllOnboardingQuestions {
          id questionText questionType options orderIndex isActive
        }
      }
    `);
    setQuestions(data?.getAllOnboardingQuestions || []);
    setLoading(false);
  };

  const loadResponses = async () => {
    const [respData, userData] = await Promise.all([
      gql(`query { getAllOnboardingResponses { id userId questionId responseData } }`),
      gql(`query { getUsersWithStatus { id email role cognitiveProfile } }`),
    ]);
    setResponses(respData?.getAllOnboardingResponses || []);
    setUsers(userData?.getUsersWithStatus || []);
  };

  useEffect(() => { loadQuestions(); }, []);

  const addQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSaving(true);
    const options = (newType === 'multiple_choice' || newType === 'multiple_select') 
      ? newOptions.split(',').map((s: string) => s.trim()).filter(Boolean) 
      : [];
    
    await gql(`
      mutation CreateQ($input: CreateQuestionInput!) {
        createOnboardingQuestion(input: $input) { id }
      }
    `, {
      input: {
        questionText: newQuestion,
        questionType: newType,
        options,
        orderIndex: questions.length,
      }
    });
    setNewQuestion('');
    setNewOptions('');
    setSaving(false);
    loadQuestions();
  };

  const startEdit = (q: OnboardingQuestion) => {
    setEditingId(q.id);
    setNewQuestion(q.questionText);
    setNewType(q.questionType);
    setNewOptions(Array.isArray(q.options) ? q.options.join(', ') : '');
    setEditSource(q);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewQuestion('');
    setNewType('text');
    setNewOptions('');
    setEditSource(null);
  };

  const updateQuestionAction = async () => {
    if (!editingId || !newQuestion.trim()) return;
    setSaving(true);
    const options = (newType === 'multiple_choice' || newType === 'multiple_select') 
      ? newOptions.split(',').map((s: string) => s.trim()).filter(Boolean) 
      : [];

    await gql(`
      mutation UpdateQ($input: UpdateQuestionInput!) {
        updateOnboardingQuestion(input: $input) { id }
      }
    `, {
      input: {
        id: editingId,
        questionText: newQuestion,
        questionType: newType,
        options,
      }
    });
    
    cancelEdit();
    setSaving(false);
    loadQuestions();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    await gql(`mutation { deleteOnboardingQuestion(id: "${id}") }`);
    loadQuestions();
  };

  const toggleQuestion = async (id: string, currentActive: boolean) => {
    await gql(`
      mutation ToggleQ($id: String!, $isActive: Boolean!) {
        toggleOnboardingQuestion(id: $id, isActive: $isActive) { id isActive }
      }
    `, { id, isActive: !currentActive });
    loadQuestions();
  };

  const toggleUserExpansion = (userId: string) => {
    const next = new Set(expandedUserIds);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setExpandedUserIds(next);
  };

  const loadMatches = async () => {
    const data = await gql(`
      query { 
        getPersistentMatches { 
          id 
          userAId 
          userBId 
          userAName 
          userBName 
          similarityScore 
        } 
      }
    `);
    setMatches(data?.getPersistentMatches || []);
  };

  const triggerSync = async () => {
    if (!confirm('Tüm sistemi yeniden senkronize etmek ve AI eşleşmelerini güncellemek istiyor musunuz? (Bu biraz zaman alabilir)')) return;
    setIsSyncing(true);
    await gql(`mutation { triggerFullSync }`);
    setTimeout(() => {
      setIsSyncing(false);
      alert('Senkronizasyon görevi AI Worker\'a gönderildi. Birkaç dakika sonra eşleşmeler güncellenecektir.');
    }, 2000);
  };

  const handleShowMatches = async () => {
    if (!showMatches) await loadMatches();
    setShowMatches(!showMatches);
  };

  const handleShowResponses = async () => {
    if (!showResponses) {
      await loadResponses();
    }
    setShowResponses(!showResponses);
  };

  // Group responses by userId
  const responsesByUser = responses.reduce((acc, r) => {
    if (!acc[r.userId]) acc[r.userId] = [];
    acc[r.userId].push(r);
    return acc;
  }, {} as Record<string, OnboardingResponseItem[]>);

  const getUserName = (userId: string) => {
    const u = users.find(user => user.id === userId);
    if (u) return u.cognitiveProfile?.name || u.email?.split('@')[0] || userId.substring(0, 8);
    return userId.substring(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-purple-500/20">
            <ClipboardList className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Onboarding Soruları</h1>
            <p className="text-xs text-gray-400">Yeni katılımcılara gösterilecek tanışma soruları</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg text-sm transition-colors border border-emerald-500/20"
          >
            <RefreshCcw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>AI Senkronize Et</span>
          </button>
          <button
            onClick={handleShowMatches}
            className="flex items-center space-x-1.5 bg-pink-600/20 hover:bg-pink-600/30 text-pink-400 px-3 py-1.5 rounded-lg text-sm transition-colors border border-pink-500/20"
          >
            <Activity className="w-4 h-4" />
            <span>AI Eşleşmeleri</span>
            {showMatches ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={handleShowResponses}
            className="flex items-center space-x-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 px-3 py-1.5 rounded-lg text-sm transition-colors border border-indigo-500/20"
          >
            <Users className="w-4 h-4" />
            <span>Yanıtlar</span>
            {showResponses ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* User Responses Panel */}
      {showResponses && (
        <div className="bg-[#161b22] border border-indigo-500/20 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-300 flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Kullanıcı Yanıtları ({Object.keys(responsesByUser).length} kullanıcı)</span>
            </h3>
            {/* Pagination Controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setResponsePage(Math.max(1, responsePage - 1))}
                disabled={responsePage === 1}
                className="p-1 hover:bg-white/5 rounded text-gray-400 disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              </button>
              <span className="text-xs text-gray-500">Sayfa {responsePage} / {Math.ceil(Object.keys(responsesByUser).length / itemsPerPage) || 1}</span>
              <button 
                onClick={() => setResponsePage(Math.min(Math.ceil(Object.keys(responsesByUser).length / itemsPerPage), responsePage + 1))}
                disabled={responsePage >= Math.ceil(Object.keys(responsesByUser).length / itemsPerPage)}
                className="p-1 hover:bg-white/5 rounded text-gray-400 disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4 rotate-[90deg]" />
              </button>
            </div>
          </div>

          {Object.keys(responsesByUser).length === 0 ? (
            <div className="text-center py-6 text-gray-500 text-sm">Henüz yanıt yok.</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(responsesByUser)
                .slice((responsePage - 1) * itemsPerPage, responsePage * itemsPerPage)
                .map(([userId, userResponses]) => {
                  const isExpanded = expandedUserIds.has(userId);
                  return (
                    <div key={userId} className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden transition-all">
                      <button 
                        onClick={() => toggleUserExpansion(userId)}
                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold">
                            {getUserName(userId).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-white">{getUserName(userId)}</span>
                          <span className="text-[10px] text-gray-500 font-mono hidden md:inline">{userId}</span>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-[#30363d] space-y-2 bg-indigo-500/5 animate-in slide-in-from-top-1 duration-200">
                          {userResponses.map(resp => {
                            const question = questions.find(q => q.id === resp.questionId);
                            return (
                              <div key={resp.id} className="flex items-start space-x-3 text-xs p-2 rounded bg-[#0d1117] border border-[#30363d]/50">
                                <div className="text-gray-500 font-mono mt-0.5">Q{question ? questions.indexOf(question) + 1 : '?'}:</div>
                                <div>
                                  <p className="text-gray-400 font-medium">{question?.questionText || 'Bilinmeyen soru'}</p>
                                  <p className="text-emerald-400 mt-0.5 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded inline-block">{resp.responseData}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Question */}
      <div className={`border rounded-xl p-5 transition-all duration-300 ${editingId ? 'bg-indigo-600/5 border-indigo-500/40 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-[#161b22] border-[#30363d]'}`}>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {editingId ? <Save className="w-4 h-4 text-indigo-400" /> : <Plus className="w-4 h-4 text-green-400" />}
            <span>{editingId ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</span>
          </div>
          {editingId && (
            <button onClick={cancelEdit} className="text-xs text-gray-500 hover:text-white flex items-center space-x-1 border border-white/10 px-2 py-0.5 rounded">
              <X className="w-3 h-3" />
              <span>Vazgeç</span>
            </button>
          )}
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Soru metni yazın..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="text">Açık Uçlu (Text)</option>
              <option value="multiple_choice">Çoktan Seçmeli (Single Choice)</option>
              <option value="multiple_select">Çoklu Seçenekli (Multiple Selection)</option>
              <option value="scale">Ölçek (1-10)</option>
            </select>
            
            {(newType === 'multiple_choice' || newType === 'multiple_select') && (
              <div className="relative flex-1">
                <input
                  type="text"
                  value={newOptions}
                  onChange={(e) => setNewOptions(e.target.value)}
                  placeholder="Seçenekler (ör: Elma, Armut, Muz)"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-gray-500 mt-1">Virgülle ayırarak birden fazla seçenek ekleyebilirsiniz.</p>
              </div>
            )}
            
            <button
              onClick={editingId ? updateQuestionAction : addQuestion}
              disabled={saving || !newQuestion.trim()}
              className={`${editingId ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-green-600 hover:bg-green-500'} text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg disabled:opacity-50 flex items-center justify-center space-x-1.5`}
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Kaydediliyor...' : (editingId ? 'Güncelle' : 'Ekle')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Henüz onboarding sorusu eklenmemiş.</p>
            <p className="text-xs mt-1">Yukarıdan yeni sorular ekleyebilirsiniz.</p>
          </div>
        ) : (
          questions.map((q, i) => (
            <div
              key={q.id}
              className={`bg-[#161b22] border rounded-xl p-4 flex items-start space-x-3 transition-all ${
                q.isActive ? 'border-[#30363d]' : 'border-[#30363d]/50 opacity-60'
              }`}
            >
              <div className="text-gray-500 mt-1">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-mono">#{i + 1}</span>
                    <p className="text-sm text-white font-medium mt-0.5">{q.questionText}</p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded border ${
                      q.questionType === 'text' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      q.questionType === 'multiple_choice' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      q.questionType === 'multiple_select' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                      'bg-orange-500/10 text-orange-400 border-orange-500/20'
                    }`}>
                      {q.questionType === 'text' ? 'Açık Uçlu' : 
                       q.questionType === 'multiple_choice' ? 'Çoktan Seçmeli' : 
                       q.questionType === 'multiple_select' ? 'Çoklu Seçim' : 'Ölçek'}
                    </span>
                    <button
                      onClick={() => startEdit(q)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Düzenle"
                    >
                      <Save className="w-3.5 h-3.5 rotate-180" />
                    </button>
                    <button
                      onClick={() => toggleQuestion(q.id, q.isActive)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        q.isActive 
                          ? 'text-green-400 hover:bg-green-500/10' 
                          : 'text-gray-500 hover:bg-gray-500/10'
                      }`}
                      title={q.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                      {q.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteQuestion(q.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {(q.questionType === 'multiple_choice' || q.questionType === 'multiple_select') && q.options && q.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.map((opt: string, oi: number) => (
                      <span key={oi} className="text-[10px] bg-[#0d1117] border border-[#30363d] px-2 py-0.5 rounded text-gray-400">
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-4 text-sm text-gray-400">
        <p className="font-medium text-purple-300 mb-1">💡 Nasıl Çalışır?</p>
        <ul className="space-y-1 text-xs">
          <li>• Katılımcılar sisteme ilk giriş yaptığında bu soruları görür.</li>
          <li>• Yanıtlar AI tarafından analiz edilir ve benzer profiller eşleştirilir.</li>
          <li>• Eşleşen katılımcılar "Kafa Dengi" önerisi olarak gösterilir.</li>
          <li>• Soruları aktif/pasif yaparak görünürlüğü kontrol edebilirsiniz.</li>
          <li>• "Yanıtları Görüntüle" ile tüm kullanıcı cevaplarını inceleyebilirsiniz.</li>
        </ul>
      </div>
    </div>
  );
}
