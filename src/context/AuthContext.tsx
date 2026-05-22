import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, callEdgeFunction } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'customer' | 'admin' | 'developer';
  company_name: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  loading: boolean;
}

interface AuthContextType {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  sendOTP: (email: string, purpose: string) => Promise<void>;
  verifyOTP: (email: string, otp: string, purpose: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

interface RegisterData {
  full_name: string;
  email: string;
  password: string;
  role: string;
  company_name?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    profile: null,
    isAuthenticated: false,
    loading: true,
  });

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return profile as Profile | null;
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setAuth({
            user: session.user,
            profile,
            isAuthenticated: true,
            loading: false,
          });
        } else {
          setAuth({ user: null, profile: null, isAuthenticated: false, loading: false });
        }
      })();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      (async () => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setAuth({ user: session.user, profile, isAuthenticated: true, loading: false });
        } else {
          setAuth(prev => ({ ...prev, loading: false }));
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (data: RegisterData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          role: data.role,
          company_name: data.company_name || '',
        },
      },
    });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const sendOTP = async (email: string, purpose: string) => {
    await callEdgeFunction('send-otp', { email, purpose });
  };

  const verifyOTP = async (email: string, otp: string, purpose: string): Promise<boolean> => {
    const result = await callEdgeFunction('verify-otp', { email, otp, purpose });
    return result.success === true;
  };

  const resetPassword = async (email: string, newPassword: string) => {
    await callEdgeFunction('reset-password', { email, new_password: newPassword });
  };

  const refreshProfile = async () => {
    if (auth.user) {
      const profile = await fetchProfile(auth.user.id);
      setAuth(prev => ({ ...prev, profile }));
    }
  };

  return (
    <AuthContext.Provider value={{ auth, login, register, logout, sendOTP, verifyOTP, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
