import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Hexagon, Lock, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      
      // Get user from localStorage (set by login)
      const storedUser = localStorage.getItem('v_rag_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);

        // Admin → admin panel
        if (userData.role === 'admin') {
          navigate('/admin');
          return;
        }

        // Participant who hasn't completed onboarding → onboarding
        if (userData.role === 'participant' && !userData.hasCompletedOnboarding) {
          navigate('/onboarding');
          return;
        }
      }
      
      // Default → feed
      navigate('/feed');
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Lütfen bilgilerinizi kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#238636] rounded-full blur-[120px] opacity-10" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#58a6ff] rounded-full blur-[120px] opacity-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-[#161b22] border border-[#30363d] p-8 rounded-2xl w-full max-w-md relative z-10 shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-[#0d1117] border border-[#30363d] rounded-xl flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(88,166,255,0.2)]">
            <Hexagon className="w-8 h-8 text-[#58a6ff]" />
          </div>
          <h1 className="text-2xl font-bold text-[#c9d1d9]">V-RAG Giriş</h1>
          <p className="text-[#8b949e] text-sm mt-2">Vizyon Analitik Ağına Bağlanın</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg text-sm text-[#f85149]">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-[#8b949e]">E-Posta</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[#8b949e]" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-[#30363d] rounded-lg leading-5 bg-[#0d1117] text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] sm:text-sm transition-colors"
                placeholder="denizhan@vizyon.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-[#8b949e]">Şifre</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#8b949e]" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-[#30363d] rounded-lg leading-5 bg-[#0d1117] text-[#c9d1d9] placeholder-[#8b949e] focus:outline-none focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff] sm:text-sm transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#238636] hover:bg-[#2ea043] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#238636] focus:ring-offset-[#0d1117] transition-colors mt-6 disabled:opacity-50"
          >
            {isLoading ? 'Bağlanıyor...' : 'Ağa Bağlan'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
