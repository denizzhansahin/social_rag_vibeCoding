import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOnboardingQuestionsAPI, submitOnboardingAPI, getUsersAPI, getOnboardingResponsesAPI, getDiscoveryRecommendationsAPI } from '../lib/api_client';
import { motion } from 'framer-motion';
import { Users, ArrowRight, Check, Sparkles, Save } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'questions' | 'recommendations'>('questions');
  const [friendSuggestions, setFriendSuggestions] = useState<any[]>([]);

  const location = useLocation();
  const isEditMode = location.state?.editMode;

  useEffect(() => {
    async function loadQuestions() {
      const q = await getOnboardingQuestionsAPI();
      if (q.length > 0) {
        setQuestions(q);
      }
      
      // Load previous answers if in edit mode
      if (isEditMode && user) {
        try {
          const resp = await getOnboardingResponsesAPI(user.id);
          const answerMap: Record<string, string> = {};
          resp.forEach((r: any) => {
            answerMap[r.questionId] = r.responseData;
          });
          setAnswers(answerMap);
        } catch (e) {
          console.error("Failed to load existing responses", e);
        }
      }
      setLoading(false);
    }
    loadQuestions();
  }, [user, isEditMode]);

  // Redirect to feed if already completed onboarding and NOT in edit mode
  useEffect(() => {
    if (user?.hasCompletedOnboarding && !isEditMode && !loading) {
      navigate('/feed', { replace: true });
    }
  }, [user, navigate, isEditMode, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] to-[#161b22] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-10 h-10 border-2 border-[#58a6ff]/30 border-t-[#58a6ff] rounded-full mx-auto mb-4"
          />
          <p className="text-gray-400">Sorular yükleniyor...</p>
        </div>
      </div>
    );
  }

  const handleSkip = async () => {
    if (!user) return;
    setSubmitting(true);
    const success = await submitOnboardingAPI(user.id, []);
    if (success) {
      login({ ...user, hasCompletedOnboarding: true } as any);
      navigate('/feed', { replace: true });
    } else {
      alert('Süreç tamamlanırken bir hata oluştu.');
    }
    setSubmitting(false);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] to-[#161b22] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h2 className="text-xl font-bold text-white mb-4">Hoş Geldin!</h2>
          <p className="text-gray-400 mb-6">Şu anda aktif tanışma sorusu bulunmuyor. Akışı keşfedebilirsin.</p>
          <button
            onClick={handleSkip}
            disabled={submitting}
            className="px-6 py-3 bg-[#58a6ff] text-white rounded-xl font-medium hover:bg-[#1f6feb] transition-colors flex items-center justify-center space-x-2 mx-auto"
          >
            {submitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
            ) : null}
            <span>Akışa Git</span>
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!user || Object.keys(answers).length < questions.length) return;

    setSubmitting(true);

    // Convert answers to array format
    const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
      questionId: qId,
      responseData: String(ans)
    }));

    const success = await submitOnboardingAPI(user.id, formattedAnswers);

    if (success) {
      // Update user state
      login({ ...user, hasCompletedOnboarding: true } as any);

      // Get friend suggestions
      try {
        const recommendations = await getDiscoveryRecommendationsAPI(user.id);
        setFriendSuggestions(recommendations);
        setStep('recommendations');
      } catch (err) {
        console.error("Discovery error:", err);
        navigate('/feed', { replace: true });
      }
    } else {
      alert('Bir hata oluştu, lütfen tekrar deneyin.');
    }
    setSubmitting(false);
  };

  // Friend Recommendations Step
  if (step === 'recommendations') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d1117] to-[#161b22] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-8 shadow-2xl"
        >
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 mx-auto mb-4 bg-[#238636]/20 rounded-full flex items-center justify-center"
            >
              <Check className="w-8 h-8 text-[#238636]" />
            </motion.div>
            <h1 className="text-2xl font-bold text-white mb-2">Teşekkürler! 🎉</h1>
            <p className="text-gray-400">Yanıtların analiz edildi. İşte seninle benzer ilgi alanlarına sahip olabilecek kişiler:</p>
          </div>

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {friendSuggestions.length > 0 ? friendSuggestions.map((friend, idx) => (
              <motion.div
                key={friend.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="flex items-center justify-between p-4 bg-[#0d1117] border border-[#30363d] rounded-xl hover:border-[#58a6ff]/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg",
                    friend.role === 'mentor' ? "bg-gradient-to-br from-[#8957e5] to-[#c678dd]" : 
                    friend.role === 'teacher' ? "bg-gradient-to-br from-[#d19a66] to-[#e06c75]" :
                    "bg-gradient-to-br from-[#58a6ff] to-[#8957e5]"
                  )}>
                    {friend.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <h3 className="text-sm font-medium text-white">{friend.name}</h3>
                       <span className={cn(
                         "text-[9px] px-1.5 py-0.5 rounded-full border",
                         friend.role === 'mentor' ? "bg-[#8957e5]/10 text-[#c678dd] border-[#8957e5]/20" :
                         friend.role === 'teacher' ? "bg-[#d19a66]/10 text-[#d19a66] border-[#d19a66]/20" :
                         "bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20"
                       )}>
                         {friend.role === 'mentor' ? 'Mentör' : friend.role === 'teacher' ? 'Eğitmen' : 'Katılımcı'}
                       </span>
                    </div>
                    {friend.similarityScore > 0 ? (
                      <p className="text-[10px] text-[#238636] font-mono">%{Math.round(friend.similarityScore * 100)} Uyum</p>
                    ) : (
                      <p className="text-[10px] text-gray-500">{friend.trait || 'Kamp Üyesi'}</p>
                    ) }
                  </div>
                </div>
                <button className="px-3 py-1.5 bg-[#58a6ff]/10 text-[#58a6ff] text-xs font-medium rounded-lg hover:bg-[#58a6ff]/20 transition-colors">
                  Profil
                </button>
              </motion.div>
            )) : (
              <p className="text-center text-gray-500 py-4">Şu anda önerilecek kullanıcı bulunmuyor.</p>
            )}
          </div>

          <button
            onClick={() => navigate('/feed', { replace: true })}
            className="w-full py-3 bg-[#238636] hover:bg-[#2ea043] text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
          >
            <span>Keşfetmeye Başla</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  // Questions Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d1117] to-[#161b22] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-[#161b22] border border-[#30363d] rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#58a6ff]/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#58a6ff]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Seni Tanıyalım</h1>
            <p className="text-sm text-gray-400">5 kısa soru ile sana en uygun deneyimi oluşturacağız</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Soru {Object.keys(answers).length} / {questions.length}</span>
            <span>{Math.round((Object.keys(answers).length / questions.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-[#0d1117] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#58a6ff] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl"
            >
              <h3 className="text-sm font-medium text-white mb-3">
                <span className="text-[#58a6ff] mr-2">{idx + 1}.</span>
                {q.questionText}
              </h3>

              {q.questionType === 'multiple_choice' && q.options && (
                <div className="space-y-2">
                  {q.options.map((opt: string, optIdx: number) => (
                    <button
                      key={optIdx}
                      onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${answers[q.id] === opt
                          ? 'bg-[#58a6ff]/20 border-2 border-[#58a6ff] text-white'
                          : 'bg-[#161b22] border border-[#30363d] text-gray-300 hover:border-[#58a6ff]/50'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.questionType === 'scale' && (
                <div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={answers[q.id] || 5}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full h-2 bg-[#161b22] rounded-full appearance-none cursor-pointer accent-[#58a6ff]"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 - Düşük</span>
                    <span className="text-[#58a6ff] font-bold">{answers[q.id] || 5}</span>
                    <span>10 - Yüksek</span>
                  </div>
                </div>
              )}

              {q.questionType === 'text' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Yanıtınız..."
                  rows={3}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-white focus:border-[#58a6ff] outline-none resize-none"
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < questions.length || submitting}
          className="w-full mt-6 py-3 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center space-x-2"
        >
          {submitting ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
              />
              <span>Yanıtlar Gönderiliyor...</span>
            </>
          ) : isEditMode ? (
            <>
              <span>Değişiklikleri Kaydet</span>
              <Save className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>Yanıtları Gönder</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </motion.div>
    </div>
  );
}
