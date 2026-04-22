import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser as apiLoginUser, clearAuthToken, setAuthToken, initApiClient } from '../lib/api_client';

export type Role = 'admin' | 'mentor' | 'teacher' | 'participant' | null;

export interface Badge {
  id: string;
  name: string;
  icon: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  groupId: string;
  cognitiveProfile: {
    name: string;
    age: number;
    trait: string;
    stressIndex?: number;
    engagementScore?: number;
    leadershipScore?: number;
    group?: string;
  };
  xp?: number;
  streak?: number;
  weeklyActivity?: number[];
  badges?: Badge[];
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
    x?: string;
  };
  hasCompletedOnboarding?: boolean;
  telemetrySummary?: {
    emojiSentiment: 'positive' | 'neutral' | 'critical';
    wordComplexity: number;
    nightActivityRatio: number;
    locationPrecision: number;
  };
  performanceMetrics?: {
    engagement: number;
    stressIndex: number;
    punctuality: number;
    peerRating: number;
  };
}

interface AuthContextType {
  user: User | null;
  login: (emailOrUser: string | User, role?: Role) => void;
  logout: () => void;
  isApiMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isApiMode, setIsApiMode] = useState(false);

  useEffect(() => {
    initApiClient();
    const storedUser = localStorage.getItem('v_rag_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (emailOrUser: string | User, password?: string) => {
    // If a full User object is passed (e.g. from onboarding completion), just set it
    if (typeof emailOrUser !== 'string') {
      setUser(emailOrUser);
      localStorage.setItem('v_rag_user', JSON.stringify(emailOrUser));
      return;
    }

    const email = emailOrUser;

    // Production: API login (Strictly enforced)
    try {
      const result = await apiLoginUser(email, password || '');
      if (result) {
        setIsApiMode(true);
        const apiUser: User = {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role as Role,
          groupId: result.user.groupId || result.user.cognitiveProfile?.group || '',
          name: result.user.cognitiveProfile?.name || email.split('@')[0],
          cognitiveProfile: result.user.cognitiveProfile || { name: email.split('@')[0], age: 0, trait: 'Katılımcı' },
          socialLinks: result.user.socialLinks || {},
          hasCompletedOnboarding: result.user.hasCompletedOnboarding || false,
          telemetrySummary: result.user.telemetrySummary,
          performanceMetrics: result.user.performanceMetrics,
        };
        setUser(apiUser);
        localStorage.setItem('v_rag_user', JSON.stringify(apiUser));
        console.log('[Auth] ✅ API login başarılı');
        return;
      } else {
        throw new Error('Geçersiz e-posta veya şifre.');
      }
    } catch (err: any) {
      console.error('[Auth] ❌ Giriş hatası:', err);
      throw err; // Re-throw to be caught by Login.tsx
    }
  };

  const logout = () => {
    setUser(null);
    setIsApiMode(false);
    localStorage.removeItem('v_rag_user');
    clearAuthToken();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isApiMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
