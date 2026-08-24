import { useState, useEffect, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// Module-level globals to act as stable guards across re-renders/unmounts
let globalToken: string | null = null;
let isInitializing = false;
let initializationPromise: Promise<string | null> | null = null;

export const useNotifications = () => {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [token, setToken] = useState<string | null>(globalToken);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[FCM] Service worker not supported in this browser context');
      return null;
    }

    try {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
      const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      const appId = import.meta.env.VITE_FIREBASE_APP_ID;

      if (!apiKey || !messagingSenderId || !projectId) {
        console.warn('FCM SW registration aborted: Missing Firebase environment configuration.');
        return null;
      }

      const queryParams = new URLSearchParams({
        apiKey,
        authDomain: authDomain || '',
        projectId,
        storageBucket: storageBucket || '',
        messagingSenderId,
        appId: appId || '',
        v: '1.0.2' // Cache buster query param
      }).toString();

      console.log('[FCM] Registering service worker...');
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`,
        { scope: '/' }
      );
      console.log('[FCM] Service worker registration = success');
      
      console.log('[FCM] Waiting for service worker...');
      await navigator.serviceWorker.ready;
      console.log('[FCM] Service worker ready = yes');
      return registration;
    } catch (err) {
      console.error('Service Worker registration for FCM failed:', err);
      return null;
    }
  }, []);

  const registerTokenToBackend = useCallback(async (fcmToken: string) => {
    try {
      console.log('[FCM] Fetching authenticated user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.log('[FCM] Authenticated user = NO');
        return;
      }
      
      console.log('[FCM] Authenticated user = YES');
      console.log('[FCM] Supabase upsert started');

      const { data: upsertData, error: upsertError } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: user.id,
            token: fcmToken,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'token' }
        )
        .select();

      if (upsertError) {
        console.log('[FCM] Supabase upsert = error');
        console.error('[FCM] Supabase upsert failed', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint
        });
        throw upsertError;
      }

      console.log('[FCM] Supabase upsert success = YES');
      console.log(`[FCM] Database row returned = ${upsertData && upsertData.length > 0 ? 'YES' : 'NO'}`);
      console.log('[FCM] Token saved successfully');

      localStorage.setItem('au_fcm_token', fcmToken);
      globalToken = fcmToken;
      setToken(fcmToken);
    } catch (err) {
      console.error('[FCM] Failed to register FCM token with database:', err);
    }
  }, []);

  const fetchAndRegisterToken = useCallback(async () => {
    if (globalToken) {
      setToken(globalToken);
      return globalToken;
    }

    // Reuse existing initialization promise if already in flight
    if (isInitializing && initializationPromise) {
      return initializationPromise;
    }

    isInitializing = true;
    initializationPromise = (async () => {
      try {
        console.log(`[FCM] Firebase initialized = ${!!messaging}`);
        console.log(`[FCM] Messaging instance exists = ${messaging ? 'YES' : 'NO'}`);
        
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        console.log(`[FCM] VAPID key configured = ${vapidKey ? 'YES' : 'NO'}`);

        if (!messaging || !profile?.id) {
          return null;
        }

        const registration = await registerServiceWorker();
        if (!registration) {
          return null;
        }

        console.log('[FCM] Calling getToken()');
        const currentToken = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: vapidKey,
        });

        console.log(`[FCM] Token received = ${currentToken ? 'YES' : 'NO'}`);
        if (currentToken) {
          // Print safe masked token representation
          console.log(`[FCM] Token preview = ${currentToken.substring(0, 6)}...${currentToken.substring(currentToken.length - 6)}`);
          await registerTokenToBackend(currentToken);
          console.log('[FCM] FCM initialization COMPLETE');
          return currentToken;
        }
        return null;
      } catch (err) {
        console.error('[FCM] getToken failed:', err);
        return null;
      } finally {
        isInitializing = false;
        initializationPromise = null;
      }
    })();

    return initializationPromise;
  }, [profile?.id, registerServiceWorker, registerTokenToBackend]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !profile?.id) {
      return false;
    }

    setLoading(true);
    try {
      console.log('[FCM] Requesting notification permission...');
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      console.log(`[FCM] Permission result = ${result}`);
      
      if (result === 'granted') {
        const generatedToken = await fetchAndRegisterToken();
        return !!generatedToken;
      }
      return false;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile?.id, fetchAndRegisterToken]);

  const initPushNotifications = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !profile?.id) {
        return;
      }

      console.log('[FCM] Initialization started');
      const currentPermission = Notification.permission as NotificationPermissionState;
      setPermission(currentPermission);
      console.log(`[FCM] Notification permission = ${currentPermission}`);
      
      if (currentPermission === 'granted') {
        await fetchAndRegisterToken();
      }
    } catch (err) {
      console.error('[FCM] initPushNotifications failed:', err);
    }
  }, [profile?.id, fetchAndRegisterToken]);

  return {
    permission,
    token,
    loading,
    requestPermission,
    initPushNotifications,
  };
};

export default useNotifications;
