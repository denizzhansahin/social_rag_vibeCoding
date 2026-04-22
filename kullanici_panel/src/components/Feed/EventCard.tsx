import React, { useState } from 'react';
import { AppEvent, useData, EventSurvey } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Calendar, MapPin, Users, CheckCircle, ChevronDown, ChevronUp, Clock, User as UserIcon, MessageSquare, HelpCircle, Send, ThumbsUp, ThumbsDown, FileQuestion, Plus, Linkedin, Twitter, Github, QrCode, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export interface EventCardProps {
  event: AppEvent;
  isExpanded: boolean;
  toggleExpand: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, isExpanded, toggleExpand }) => {
  const { registerForEvent, addEventComment, addEventQuestion, addEventSurvey, voteQuestion, submitSurveyResponse, markAttendance } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'questions' | 'participants' | 'surveys' | 'attendance'>('details');
  const [inputText, setInputText] = useState('');
  const [showSurveyForm, setShowSurveyForm] = useState(false);
  const [surveyQuestion, setSurveyQuestion] = useState('');
  const [surveyType, setSurveyType] = useState<'multiple_choice' | 'ranked' | 'text'>('multiple_choice');
  const [surveyOptions, setSurveyOptions] = useState<string[]>(['', '']);
  const [isScanning, setIsScanning] = useState(false);

  const isRegistered = event.participants.some(p => p.id === user?.id);
  const hasAttended = event.attendedParticipants?.includes(user?.id || '');
  const eventDate = new Date(event.date);
  const isPrivileged = user && ['admin', 'mentor', 'teacher'].includes(user.role);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    if (activeTab === 'comments') {
      addEventComment(event.id, inputText, user.name);
    } else if (activeTab === 'questions') {
      addEventQuestion(event.id, inputText, user.name);
    }
    setInputText('');
  };

  const handleCreateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surveyQuestion.trim() || !user) return;

    const validOptions = surveyOptions.filter(o => o.trim() !== '');
    
    addEventSurvey(event.id, {
      question: surveyQuestion,
      type: surveyType,
      options: surveyType !== 'text' ? validOptions : undefined,
      createdBy: user.name
    });

    setSurveyQuestion('');
    setSurveyOptions(['', '']);
    setShowSurveyForm(false);
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 shadow-sm transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">{event.name}</h2>
          <p className="text-sm text-[#8b949e]">{event.description}</p>
        </div>
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-center min-w-[60px] ml-4">
          <div className="text-xs text-[#f85149] font-bold uppercase">{eventDate.toLocaleString('tr-TR', { month: 'short' })}</div>
          <div className="text-xl font-bold text-white">{eventDate.getDate()}</div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4 text-sm text-[#8b949e] mb-4">
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>{eventDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{event.participants.length} Katılımcı</span>
        </div>
      </div>

      <div className="flex space-x-2 mb-2">
        {isRegistered ? (
          <button disabled className="flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg bg-[#238636]/10 text-[#238636] border border-[#238636]/20 font-medium text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Kayıtlısın</span>
          </button>
        ) : (
          <button 
            onClick={() => user && registerForEvent(event.id, user)}
            className="flex-1 py-2 rounded-lg bg-[#58a6ff] hover:bg-[#1f6feb] text-white font-medium transition-colors text-sm"
          >
            Kayıt Ol
          </button>
        )}
        <button 
          onClick={toggleExpand}
          className="px-3 py-2 rounded-lg bg-[#0d1117] border border-[#30363d] text-[#8b949e] hover:text-[#c9d1d9] transition-colors flex items-center justify-center space-x-1"
        >
          <span className="text-sm font-medium hidden sm:inline">Detaylar</span>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[#30363d] pt-4 mt-4"
          >
            {/* Tabs */}
            <div className="flex space-x-2 mb-4 bg-[#0d1117] p-1 rounded-lg border border-[#30363d] overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 min-w-[60px] py-1.5 text-xs font-medium rounded-md transition-colors ${activeTab === 'details' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                Bilgi
              </button>
              <button 
                onClick={() => setActiveTab('comments')}
                className={`flex-1 min-w-[80px] py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'comments' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Yorumlar</span>
              </button>
              <button 
                onClick={() => setActiveTab('questions')}
                className={`flex-1 min-w-[80px] py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'questions' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Sorular</span>
              </button>
              <button 
                onClick={() => setActiveTab('surveys')}
                className={`flex-1 min-w-[80px] py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'surveys' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <FileQuestion className="w-3.5 h-3.5" />
                <span>Anketler</span>
              </button>
              <button 
                onClick={() => setActiveTab('participants')}
                className={`flex-1 min-w-[90px] py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'participants' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Katılımcılar</span>
              </button>
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 min-w-[80px] py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center space-x-1 ${activeTab === 'attendance' ? 'bg-[#30363d] text-white' : 'text-[#8b949e] hover:text-[#c9d1d9]'}`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Yoklama</span>
              </button>
            </div>

            {/* Tab Content: Details */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                {event.groupId && (
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-[#58a6ff]" />
                      <span className="text-sm font-medium text-[#c9d1d9]">Hedef Grup</span>
                    </div>
                    <span className="text-sm font-bold text-white bg-[#161b22] px-2 py-1 rounded border border-[#30363d] uppercase">
                      {event.groupId}
                    </span>
                  </div>
                )}

                {event.location && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#f85149]" />
                      <span>Konum</span>
                    </h3>
                    <div className="relative h-32 rounded-lg overflow-hidden border border-[#30363d] bg-[#0d1117]">
                      <img src={`https://picsum.photos/seed/${event.id}/600/200`} alt="Map" className="w-full h-full object-cover opacity-60" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-white font-medium text-sm">{event.location}</span>
                      </div>
                    </div>
                  </div>
                )}

                {event.speakers && event.speakers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                      <UserIcon className="w-4 h-4 text-[#58a6ff]" />
                      <span>Eğitmenler / Konuşmacılar</span>
                    </h3>
                    <div className="space-y-3">
                      {event.speakers.map((speaker, idx) => (
                        <div key={idx} className="flex items-start space-x-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                          <img src={speaker.avatar} alt={speaker.name} className="w-10 h-10 rounded-full object-cover border border-[#30363d]" />
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-[#c9d1d9]">{speaker.name}</h4>
                            <p className="text-xs text-[#8b949e] mt-1">{speaker.bio}</p>
                            {speaker.socialLinks && (
                              <div className="flex space-x-2 mt-2">
                                {speaker.socialLinks.linkedin && (
                                  <a href={speaker.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                                    <Linkedin className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                {speaker.socialLinks.twitter && (
                                  <a href={speaker.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                                    <Twitter className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {event.agenda && event.agenda.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-[#d29922]" />
                      <span>Program Akışı</span>
                    </h3>
                    <div className="space-y-0 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#30363d] before:to-transparent">
                      {event.agenda.map((item, idx) => (
                        <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-[#30363d] bg-[#161b22] text-[#8b949e] shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className="w-2 h-2 bg-[#58a6ff] rounded-full"></div>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-[#0d1117] p-3 rounded-lg border border-[#30363d] shadow">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-bold text-[#c9d1d9] text-sm">{item.title}</div>
                              <div className="text-xs text-[#8b949e] font-mono">{item.time}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Comments & Questions */}
            {(activeTab === 'comments' || activeTab === 'questions') && (
              <div className="space-y-4">
                {/* Input Area */}
                <form onSubmit={handleSubmit} className="flex space-x-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                  <div className="w-8 h-8 rounded-full bg-[#30363d] flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">
                    {user?.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 flex items-center space-x-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={activeTab === 'comments' ? "Etkinlik hakkında ne düşünüyorsun?" : "Organizasyon ekibine sor..."}
                      className="flex-1 bg-transparent border-none outline-none text-sm text-[#c9d1d9] placeholder-[#8b949e]"
                    />
                    <button 
                      type="submit"
                      disabled={!inputText.trim()}
                      className="p-1.5 rounded-full bg-[#238636] text-white disabled:opacity-50 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>

                {/* List Area */}
                <div className="space-y-3">
                  {activeTab === 'comments' && event.comments?.map(comment => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#30363d] flex-shrink-0 flex items-center justify-center text-[#c9d1d9] font-bold text-xs">
                        {comment.authorName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-[#c9d1d9]">{comment.authorName}</span>
                          <span className="text-xs text-[#8b949e]">Az önce</span>
                        </div>
                        <p className="text-sm text-[#c9d1d9]">{comment.text}</p>
                      </div>
                    </div>
                  ))}

                  {activeTab === 'questions' && event.questions?.map(question => {
                    const hasUpvoted = question.upvotes.includes(user?.id || '');
                    const hasDownvoted = question.downvotes.includes(user?.id || '');
                    const score = question.upvotes.length - question.downvotes.length;

                    return (
                      <div key={question.id} className="flex space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#30363d] flex-shrink-0 flex items-center justify-center text-[#c9d1d9] font-bold text-xs">
                          {question.authorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-[#c9d1d9]">{question.authorName}</span>
                            <span className="text-xs text-[#8b949e]">Soru</span>
                          </div>
                          <p className="text-sm text-[#c9d1d9] mb-2">{question.text}</p>
                          <div className="flex items-center space-x-3 text-[#8b949e] w-fit">
                            <button 
                              onClick={() => user && voteQuestion(event.id, question.id, user.id, 'up')}
                              className={`flex items-center space-x-1 hover:text-[#238636] transition-colors ${hasUpvoted ? 'text-[#238636]' : ''}`}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-medium text-[#c9d1d9]">{score}</span>
                            <button 
                              onClick={() => user && voteQuestion(event.id, question.id, user.id, 'down')}
                              className={`flex items-center space-x-1 hover:text-[#f85149] transition-colors ${hasDownvoted ? 'text-[#f85149]' : ''}`}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {((activeTab === 'comments' && (!event.comments || event.comments.length === 0)) ||
                    (activeTab === 'questions' && (!event.questions || event.questions.length === 0))) && (
                    <div className="text-center py-6 text-[#8b949e] text-sm">
                      {activeTab === 'comments' ? 'İlk yorumu sen yap!' : 'Henüz soru sorulmamış.'}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Content: Participants */}
            {activeTab === 'participants' && (
              <div className="space-y-3">
                {event.participants.length > 0 ? (
                  event.participants.map((participant, idx) => (
                    <Link to={`/profile/${participant.id}`} key={idx} className="flex items-center space-x-3 bg-[#0d1117] p-3 rounded-lg border border-[#30363d] hover:border-[#58a6ff] transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#30363d] to-[#161b22] flex items-center justify-center text-[#c9d1d9] font-bold">
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-[#c9d1d9]">{participant.name}</h4>
                          {participant.role === 'mentor' && <span className="text-[10px] bg-[#d29922]/20 text-[#d29922] px-2 py-0.5 rounded border border-[#d29922]/30">Mentör</span>}
                          {participant.role === 'teacher' && <span className="text-[10px] bg-[#58a6ff]/20 text-[#58a6ff] px-2 py-0.5 rounded border border-[#58a6ff]/30">Eğitmen</span>}
                        </div>
                        <p className="text-xs text-[#8b949e]">{participant.cognitiveProfile.trait}</p>
                      </div>
                      {participant.socialLinks && (
                        <div className="flex space-x-2">
                          {participant.socialLinks.linkedin && (
                            <div className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                              <Linkedin className="w-4 h-4" />
                            </div>
                          )}
                          {participant.socialLinks.twitter && (
                            <div className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                              <Twitter className="w-4 h-4" />
                            </div>
                          )}
                          {participant.socialLinks.github && (
                            <div className="text-[#8b949e] hover:text-[#58a6ff] transition-colors">
                              <Github className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-6 text-[#8b949e] text-sm">
                    Henüz kayıtlı katılımcı yok.
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Surveys */}
            {activeTab === 'surveys' && (
              <div className="space-y-4">
                {isPrivileged && !showSurveyForm && (
                  <button 
                    onClick={() => setShowSurveyForm(true)}
                    className="w-full py-3 rounded-lg border border-dashed border-[#30363d] text-[#58a6ff] hover:bg-[#58a6ff]/10 transition-colors flex items-center justify-center space-x-2 text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Yeni Anket Oluştur</span>
                  </button>
                )}

                {showSurveyForm && (
                  <form onSubmit={handleCreateSurvey} className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] space-y-4">
                    <h3 className="text-sm font-bold text-white">Yeni Anket</h3>
                    
                    <div>
                      <label className="block text-xs text-[#8b949e] mb-1">Soru</label>
                      <input 
                        type="text" 
                        value={surveyQuestion}
                        onChange={(e) => setSurveyQuestion(e.target.value)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-[#58a6ff] outline-none"
                        placeholder="Örn: Eğitimin hızı nasıldı?"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-[#8b949e] mb-1">Anket Tipi</label>
                      <select 
                        value={surveyType}
                        onChange={(e) => setSurveyType(e.target.value as any)}
                        className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-[#58a6ff] outline-none"
                      >
                        <option value="multiple_choice">Çoktan Seçmeli</option>
                        <option value="ranked">Sıralamalı</option>
                        <option value="text">Açık Uçlu (Metin)</option>
                      </select>
                    </div>

                    {surveyType !== 'text' && (
                      <div className="space-y-2">
                        <label className="block text-xs text-[#8b949e]">Seçenekler</label>
                        {surveyOptions.map((opt, idx) => (
                          <input 
                            key={idx}
                            type="text" 
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...surveyOptions];
                              newOpts[idx] = e.target.value;
                              setSurveyOptions(newOpts);
                            }}
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-[#58a6ff] outline-none"
                            placeholder={`Seçenek ${idx + 1}`}
                          />
                        ))}
                        <button 
                          type="button"
                          onClick={() => setSurveyOptions([...surveyOptions, ''])}
                          className="text-xs text-[#58a6ff] hover:underline"
                        >
                          + Seçenek Ekle
                        </button>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <button 
                        type="button"
                        onClick={() => setShowSurveyForm(false)}
                        className="flex-1 py-2 rounded-lg bg-[#161b22] text-[#c9d1d9] border border-[#30363d] text-sm font-medium"
                      >
                        İptal
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2 rounded-lg bg-[#238636] text-white text-sm font-medium"
                      >
                        Oluştur
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-4">
                  {event.surveys?.map(survey => {
                    const userResponse = survey.responses?.find(r => r.userId === user?.id);
                    const totalResponses = survey.responses?.length || 0;
                    const showResults = userResponse || isPrivileged;

                    return (
                      <div key={survey.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-[#58a6ff] bg-[#58a6ff]/10 px-2 py-1 rounded">
                            {survey.type === 'multiple_choice' ? 'Çoktan Seçmeli' : survey.type === 'ranked' ? 'Sıralamalı' : 'Açık Uçlu'}
                          </span>
                          <span className="text-xs text-[#8b949e]">Oluşturan: {survey.createdBy}</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-3">{survey.question}</h4>
                        
                        {showResults ? (
                          <div className="space-y-3">
                            {survey.type !== 'text' && survey.options?.map(opt => {
                              const count = survey.responses?.filter(r => r.answer === opt).length || 0;
                              const percent = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
                              return (
                                <div key={opt} className="mb-2">
                                  <div className="flex justify-between text-xs mb-1">
                                    <span className="text-[#c9d1d9]">{opt}</span>
                                    <span className="text-[#8b949e]">{percent}% ({count})</span>
                                  </div>
                                  <div className="w-full bg-[#161b22] rounded-full h-2">
                                    <div className="bg-[#58a6ff] h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                            {survey.type === 'text' && (
                              <div className="space-y-2">
                                {survey.responses?.map((r, i) => (
                                  <div key={i} className="bg-[#161b22] p-2 rounded border border-[#30363d] text-sm text-[#c9d1d9]">
                                    {r.answer}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-[#8b949e] mt-2 text-right">Toplam Yanıt: {totalResponses}</div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {survey.type !== 'text' && survey.options?.map((opt, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => user && submitSurveyResponse(event.id, survey.id, user.id, opt)}
                                className="w-full text-left px-3 py-2 rounded-lg border border-[#30363d] bg-[#161b22] hover:bg-[#30363d] transition-colors text-sm text-[#c9d1d9]"
                              >
                                {opt}
                              </button>
                            ))}
                            {survey.type === 'text' && (
                              <div className="space-y-2">
                                <textarea 
                                  id={`survey-text-${survey.id}`}
                                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-[#58a6ff] outline-none min-h-[80px]"
                                  placeholder="Yanıtınızı buraya yazın..."
                                />
                                <button 
                                  onClick={() => {
                                    const el = document.getElementById(`survey-text-${survey.id}`) as HTMLTextAreaElement;
                                    if (el && el.value.trim() && user) {
                                      submitSurveyResponse(event.id, survey.id, user.id, el.value.trim());
                                    }
                                  }}
                                  className="w-full py-2 bg-[#238636] text-white rounded-lg text-sm font-medium"
                                >
                                  Gönder
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(!event.surveys || event.surveys.length === 0) && !showSurveyForm && (
                    <div className="text-center py-6 text-[#8b949e] text-sm">
                      Bu etkinlik için henüz anket oluşturulmamış.
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Tab Content: Attendance */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                {isPrivileged ? (
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 text-center">
                    <h3 className="text-sm font-bold text-white mb-2">Yoklama QR Kodu</h3>
                    <p className="text-xs text-[#8b949e] mb-4">Katılımcıların yoklamaya katılmak için bu QR kodu okutması gerekmektedir.</p>
                    <div className="bg-white p-4 rounded-xl inline-block mb-4">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${event.id}`} alt="Event QR Code" className="w-48 h-48" />
                    </div>
                    <div className="text-sm text-[#c9d1d9]">
                      <span className="font-bold text-[#58a6ff]">{event.attendedParticipants?.length || 0}</span> / {event.participants.length} Katılımcı Yoklamada
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-6 text-center">
                    {hasAttended ? (
                      <div className="flex flex-col items-center space-y-3">
                        <div className="w-16 h-16 bg-[#238636]/20 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-[#238636]" />
                        </div>
                        <h3 className="text-lg font-bold text-white">Yoklamanız Alındı!</h3>
                        <p className="text-sm text-[#8b949e]">Bu etkinliğe katılımınız başarıyla kaydedildi.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-[#30363d] rounded-full flex items-center justify-center">
                          <QrCode className="w-8 h-8 text-[#c9d1d9]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white mb-1">Yoklamaya Katıl</h3>
                          <p className="text-xs text-[#8b949e]">Eğitmenin ekrana yansıttığı QR kodu okutarak yoklamaya katılın.</p>
                        </div>
                        <button 
                          onClick={() => {
                            setIsScanning(true);
                            setTimeout(() => {
                              setIsScanning(false);
                              if (user) markAttendance(event.id, user.id);
                            }, 1500);
                          }}
                          disabled={isScanning || !isRegistered}
                          className="w-full max-w-xs py-3 rounded-lg bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white font-medium flex items-center justify-center space-x-2 transition-colors"
                        >
                          {isScanning ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-5 h-5" />
                              <span>{isRegistered ? 'QR Kodu Okut' : 'Önce Kayıt Olmalısınız'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
