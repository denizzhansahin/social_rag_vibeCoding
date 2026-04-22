import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Fingerprint, Lock, Mail } from 'lucide-react';

// GraphQL login mutation - Fixed to match NestJS @Args('input') structure
const LOGIN_MUTATION = `
  mutation Login($email: String!, $password: String!) {
    login(input: { email: $email, password: $password }) {
      token
      user {
        id
        email
        role
        cognitiveProfile
      }
    }
  }
`;

const GRAPHQL_URL = import.meta.env.VITE_GRAPHQL_URL || '/api/graphql';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: LOGIN_MUTATION,
          variables: { email, password },
        }),
      });

      if (!response.ok) {
        throw new Error(`Sunucu hatası: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error('[API] GraphQL errors:', result.errors);
        const errorMsg = result.errors[0]?.message || 'Giriş başarısız';
        throw new Error(errorMsg);
      }

      if (!result.data || !result.data.login) {
        throw new Error('Kullanıcı verisi alınamadı.');
      }

      const { token, user } = result.data.login;
      const { role } = user;

      // Store JWT and extended user info
      localStorage.setItem('vrag_admin_jwt', token);
      localStorage.setItem('vrag_admin_role', role);
      localStorage.setItem('vrag_admin_user', JSON.stringify(user));

      // Redirect based on role
      if (['admin', 'mentor', 'teacher'].includes(role)) {
        navigate('/admin/dashboard');
      } else {
        setError('Bu hesap için admin panel yetkiniz yok.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Giriş sırasında hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-electric-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-mint/10 rounded-full blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-dark-surface border border-dark-border mb-6 shadow-[0_0_30px_rgba(0,242,254,0.15)]">
            <Fingerprint className="w-8 h-8 text-electric-blue" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">V-RAG Terminal</h1>
          <p className="text-gray-400 text-sm">Gelişmiş Palantir İstihbarat Ağına Giriş</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 p-4 bg-coral-red/10 border border-coral-red/30 rounded-xl text-coral-red text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue transition-all"
                placeholder="Operatör E-posta"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-11 pr-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue transition-all"
                placeholder="Erişim Şifresi"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-electric-blue hover:bg-electric-blue/90 text-[#0d1117] font-semibold rounded-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-[#0d1117]/30 border-t-[#0d1117] rounded-full"
              />
            ) : (
              <span>Sisteme Bağlan</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-600 font-mono">
          SECURE CONNECTION ESTABLISHED // V-RAG v2.4.1
        </div>
      </motion.div>
    </div>
  );
}
