import { useState, useEffect, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export const useNotifications = () => {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [token, setToken] = useState<string | null>(null);
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

      // Check config existence
      if (!apiKey || !messagingSenderId || !projectId) {
        console.warn('FCM registration aborted: Missing configuration variables.');
        return null;
      }

      // Encode variables in registration URL query so service worker initializes dynamically
      const queryParams = new URLSearchParams({
        apiKey,
        authDomain: authDomain || '',
        projectId,
        storageBucket: storageBucket || '',
        messagingSenderId,
        appId: appId || '',
        v: '1.0.1' // Cache buster to bypass old Vercel CDN hits
      }).toString();

      console.log('[FCM] Registering service worker...');
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`,
        { scope: '/' }
      );
      console.log(`[FCM] Service worker registration = ${registration ? 'success' : 'failed'}`);

      // Wait until the service worker is ready and active
      const swReady = await navigator.serviceWorker.ready;
      console.log(`[FCM] Service worker ready = ${swReady ? 'yes' : 'no'}`);
      return registration;
    } catch (err) {
      console.error('Service Worker registration for FCM failed:', err);
      return null;
    }
  }, []);

  const registerTokenToBackend = useCallback(async (fcmToken: string) => {
    try {
      console.log('[FCM] Fetching authenticated user session...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log(`[FCM] Authenticated user ID = ${user?.id || 'none'}`);
      
      if (authError || !user) {
        console.error('[FCM] No authenticated user session found, aborting token registration.');
        return;
      }
      
      console.log(`[FCM] Notification permission = ${Notification.permission}`);
      console.log(`[FCM] Upserting fcm_tokens with token: ${fcmToken.substring(0, 12)}...`);

      // Save/upsert token to fcm_tokens table
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

      console.log(`[FCM] Supabase upsert result = ${upsertData ? 'success' : 'none'}`);
      if (upsertError) {
        console.error(`[FCM] Supabase upsert error = message: ${upsertError.message}, code: ${upsertError.code}, details: ${upsertError.details}, hint: ${upsertError.hint}`);
        throw upsertError;
      }

      // Store in localStorage for cleanup during logout
      localStorage.setItem('au_fcm_token', fcmToken);
      setToken(fcmToken);
      console.log('[FCM] Token saved successfully');
    } catch (err) {
      console.error('[FCM] Failed to register FCM token with database:', err);
    }
  }, []);

  const fetchAndRegisterToken = useCallback(async () => {
    console.log(`[FCM] Firebase initialized = ${!!messaging}`);
    console.log(`[FCM] Messaging instance exists = ${messaging ? 'YES' : 'NO'}`);
    
    if (!messaging || !profile?.id) {
      console.log(`[FCM] Aborting token fetch: messaging exists = ${!!messaging}, profile ID exists = ${!!profile?.id}`);
      return null;
    }
    
    try {
      const registration = await registerServiceWorker();
      if (!registration) {
        console.log('[FCM] No service worker registration returned, aborting token fetch.');
        return null;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not configured. Falling back to default keys.');
      }

      console.log('[FCM] Calling getToken()');
      const currentToken = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: vapidKey,
      });

      console.log(`[FCM] Token received = ${currentToken ? 'YES' : 'NO'}`);
      if (currentToken) {
        await registerTokenToBackend(currentToken);
        return currentToken;
      } else {
        console.warn('No FCM token generated. Browser might have blocked permission.');
        return null;
      }
    } catch (err: any) {
      console.error('[FCM] getToken failed:', err);
      return null;
    }
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
      console.log(`[FCM] Permission request result: ${result}`);
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
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !profile?.id) {
      return;
    }

    console.log('[FCM] Initializing...');
    const currentPermission = Notification.permission as NotificationPermissionState;
    setPermission(currentPermission);
    console.log(`[FCM] Notification permission = ${currentPermission}`);
    
    if (currentPermission === 'granted') {
      await fetchAndRegisterToken();
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
