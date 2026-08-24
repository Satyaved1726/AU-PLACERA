import { useState, useEffect } from 'react';
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

  const registerServiceWorker = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
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

      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`,
        { scope: '/' }
      );
      return registration;
    } catch (err) {
      console.error('Service Worker registration for FCM failed:', err);
      return null;
    }
  };

  const registerTokenToBackend = async (fcmToken: string) => {
    if (!profile?.id) return;
    try {
      // Save/upsert token to fcm_tokens table
      const { error: upsertError } = await supabase
        .from('fcm_tokens')
        .upsert(
          {
            user_id: profile.id,
            token: fcmToken,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'token' }
        );

      if (upsertError) throw upsertError;

      // Store in localStorage for cleanup during logout
      localStorage.setItem('au_fcm_token', fcmToken);
      setToken(fcmToken);
    } catch (err) {
      console.error('Failed to register FCM token with database:', err);
    }
  };

  const fetchAndRegisterToken = async () => {
    if (!messaging || !profile?.id) return null;
    try {
      const registration = await registerServiceWorker();
      if (!registration) return null;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn('VITE_FIREBASE_VAPID_KEY is not configured. Falling back to default keys.');
      }

      const currentToken = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        vapidKey: vapidKey,
      });

      if (currentToken) {
        await registerTokenToBackend(currentToken);
        return currentToken;
      } else {
        console.warn('No FCM token generated. Browser might have blocked permission.');
        return null;
      }
    } catch (err) {
      console.error('Error fetching FCM device token:', err);
      return null;
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !profile?.id) {
      return false;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
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
  };

  const initPushNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !messaging || !profile?.id) {
      return;
    }

    const currentPermission = Notification.permission as NotificationPermissionState;
    setPermission(currentPermission);
    
    if (currentPermission === 'granted') {
      await fetchAndRegisterToken();
    }
  };

  return {
    permission,
    token,
    loading,
    requestPermission,
    initPushNotifications,
  };
};

export default useNotifications;
