import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { authService } from './authService';
import type { AuthContextType } from './auth.types';
import type { UserProfile } from '../../types';
import { GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const profileRef = React.useRef<UserProfile | null>(null);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Load profile details from database
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('[AUTH] fetchProfile query failed:', error);
        setProfile(null);
      } else if (data) {
        setProfile(data);
      } else {
        if (import.meta.env.DEV) {
          console.warn('[AUTH] fetchProfile returned empty (no profile row found for user id):', userId);
        }
        setProfile(null);
      }
    } catch (err) {
      console.error('[AUTH] fetchProfile exception caught:', err);
      setProfile(null);
    }
  };

  // Diagnostic logging for currently authenticated profile
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[OIA] Current authenticated profile:', profile);
    }
  }, [profile]);



  // Auth State change listener
  useEffect(() => {
    let mounted = true;

    // Load initial session on start
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Failed to resolve initial session:', err);
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    }
    initSession();

    // Subscribe to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (import.meta.env.DEV) {
        console.log('🔔 [Auth State Event]:', event);
      }

      if (session) {
        setUser(session.user);
        if (!profileRef.current || profileRef.current.id !== session.user.id) {
          setLoading(true);
          await fetchProfile(session.user.id);
          setLoading(false);
        }
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }

      if (event === 'SIGNED_OUT') {
        // Clear all queries cached in React Query to prevent cross-user leak
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    const res = await authService.signIn(email, pass);
    if (!res.error && res.user && res.profile) {
      setUser(res.user);
      setProfile(res.profile);
    }
    setLoading(false);
    return { error: res.error, user: res.user, profile: res.profile };
  };

  const signOut = async () => {
    setLoading(true);
    // Clean up local/db FCM token before actual sign out while the session is still active
    try {
      const token = localStorage.getItem('au_fcm_token');
      if (token) {
        await supabase.from('fcm_tokens').delete().eq('token', token);
        localStorage.removeItem('au_fcm_token');
      }
    } catch (err) {
      console.error('Failed to clean up FCM token on signout:', err);
    }
    await authService.signOut();
    setUser(null);
    setProfile(null);
    queryClient.clear();
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading: initialLoading || loading,
        signIn,
        signOut,
        supabaseEnabled: true,
        refreshProfile
      }}
    >
      <AnimatePresence>
        {initialLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#0B3C5D] flex flex-col justify-center items-center select-none"
          >
            <div className="relative flex flex-col items-center">
              <div className="absolute -inset-10 bg-secondary/20 rounded-full blur-2xl animate-pulse" />
              
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-20 w-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-6 backdrop-blur-sm"
              >
                <GraduationCap className="h-12 w-12 text-[#D9B310] animate-bounce" style={{ animationDuration: '3s' }} />
              </motion.div>

              <motion.h2
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-2xl font-bold text-white tracking-wider"
              >
                AU Placera
              </motion.h2>
              
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-[10px] text-slate-300 font-semibold tracking-widest uppercase mt-2"
              >
                Anurag University Placement Portal
              </motion.p>

              <div className="mt-8 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!initialLoading && children}
    </AuthContext.Provider>
  );
};
