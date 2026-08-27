import { useState, useEffect, useCallback } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../../../lib/firebase';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/useAuth';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

// Module-level globals to act as stable guards across re-renders/unmounts
let globalToken: string | null = null;
let registeredUserId: string | null = null;
let isInitializing = false;
let initializationPromise: Promise<string | null> | null = null;

// Developer-only logging helper
const logDev = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

export const useNotifications = () => {
  const { profile } = useAuth();
  const [permission, setPermission] = useState<NotificationPermissionState>('default');
  const [token, setToken] = useState<string | null>(globalToken);
  const [loading, setLoading] = useState(false);

  // Set initial permission on client mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as NotificationPermissionState);
  }, []);

  // Reset token and registration states if the user logs out
  useEffect(() => {
    if (!profile?.id) {
      globalToken = null;
      registeredUserId = null;
      setToken(null);
    }
  }, [profile?.id]);

  // Listen to foreground notifications
  useEffect(() => {
    if (permission !== 'granted') {
      return;
    }

    const messaging = getMessagingInstance();
    if (!messaging) {
      return;
    }

    logDev('[FCM] Registering foreground message handler...');
    const unsubscribe = onMessage(messaging, (payload) => {
      logDev('[FCM] Foreground message received:', payload);
      
      const title = payload.notification?.title || '🔔 New Notification';
      const body = payload.notification?.body || 'Check the portal for updates.';
      
      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(async (registration) => {
            const activeNotifications = await registration.getNotifications();
            const isDuplicate = activeNotifications.some(
              n => n.title === title && n.body === body
            );
            if (isDuplicate) {
              logDev('[FCM] Service worker already displayed this notification, skipping foreground duplicate.');
              return;
            }
            try {
              new Notification(title, {
                body,
                icon: '/app_icon.png',
              });
            } catch (e) {
              console.error('[FCM] Failed to display native foreground notification:', e);
            }
          }).catch((err) => {
            console.error('[FCM] Error checking active notifications in SW, falling back to show:', err);
            try {
              new Notification(title, {
                body,
                icon: '/app_icon.png',
              });
            } catch (e) {
              console.error('[FCM] Failed to display native foreground notification:', e);
            }
          });
        } else {
          try {
            new Notification(title, {
              body,
              icon: '/app_icon.png',
            });
          } catch (e) {
            console.error('[FCM] Failed to display native foreground notification:', e);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [permission]);

  const registerServiceWorker = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logDev('[FCM] Service worker not supported in this browser context');
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
        return null;
      }

      const queryParams = new URLSearchParams({
        apiKey,
        authDomain: authDomain || '',
        projectId,
        storageBucket: storageBucket || '',
        messagingSenderId,
        appId: appId || '',
        v: '1.0.4' // Cache buster query param
      }).toString();

      logDev('[FCM] Registering service worker...');
      const registration = await navigator.serviceWorker.register(
        `/firebase-messaging-sw.js?${queryParams}`,
        { scope: '/' }
      );
      logDev('[FCM] Service worker registered = success');
      
      logDev('[FCM] Waiting for service worker...');
      await navigator.serviceWorker.ready;
      logDev('[FCM] Service worker ready = yes');
      return registration;
    } catch (err) {
      console.error('[FCM] Service Worker registration failed:', err);
      return null;
    }
  }, []);

  const registerTokenToBackend = useCallback(async (fcmToken: string) => {
    try {
      logDev('[FCM] Fetching authenticated user...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        logDev('[FCM] Authenticated user = NO');
        return;
      }
      
      logDev('[FCM] Authenticated user = YES');
      logDev('[FCM] Supabase upsert started');

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
        console.error('[FCM] Supabase token upsert failed:', {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint
        });
        throw upsertError;
      }

      logDev('[FCM] Supabase upsert success = YES');
      logDev(`[FCM] Database row returned = ${upsertData && upsertData.length > 0 ? 'YES' : 'NO'}`);
      logDev('[FCM] Token saved successfully');

      localStorage.setItem('au_fcm_token', fcmToken);
      globalToken = fcmToken;
      registeredUserId = user.id;
      setToken(fcmToken);
    } catch (err) {
      console.error('[FCM] Failed to register FCM token with database:', err);
    }
  }, []);

  const fetchAndRegisterToken = useCallback(async () => {
    if (globalToken && registeredUserId === profile?.id) {
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
        logDev('[FCM] Firebase initialization started');
        const messaging = getMessagingInstance();
        logDev(`[FCM] Firebase initialized = ${!!messaging}`);
        logDev(`[FCM] Messaging instance exists = ${messaging ? 'YES' : 'NO'}`);
        
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        logDev(`[FCM] VAPID key configured = ${vapidKey ? 'YES' : 'NO'}`);

        if (!messaging || !profile?.id) {
          return null;
        }

        const registration = await registerServiceWorker();
        if (!registration) {
          return null;
        }

        logDev('[FCM] getToken started');
        const currentToken = await getToken(messaging, {
          serviceWorkerRegistration: registration,
          vapidKey: vapidKey,
        });

        logDev(`[FCM] Token received = ${currentToken ? 'YES' : 'NO'}`);
        if (currentToken) {
          logDev(`[FCM] Token preview = ${currentToken.substring(0, 6)}...${currentToken.substring(currentToken.length - 6)}`);
          await registerTokenToBackend(currentToken);
          logDev('[FCM] FCM initialization COMPLETE');
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
    if (typeof window === 'undefined' || !('Notification' in window) || !profile?.id) {
      return false;
    }

    setLoading(true);
    try {
      logDev('[FCM UI] Permission request started');
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      logDev(`[FCM UI] Permission result = ${result}`);
      
      if (result === 'granted') {
        const messaging = getMessagingInstance();
        if (messaging) {
          const generatedToken = await fetchAndRegisterToken();
          return !!generatedToken;
        }
      }
      return false;
    } catch (err) {
      console.error('[FCM UI] Error requesting notification permission:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [profile?.id, fetchAndRegisterToken]);

  const checkPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    const currentPermission = Notification.permission as NotificationPermissionState;
    setPermission(currentPermission);

    if (currentPermission === 'granted') {
      const messaging = getMessagingInstance();
      if (messaging && profile?.id) {
        await fetchAndRegisterToken();
      }
    }
  }, [profile?.id, fetchAndRegisterToken]);

  const initPushNotifications = useCallback(async () => {
    try {
      if (profile?.id) {
        await checkPermission();
      }
    } catch (err) {
      console.error('[FCM] initPushNotifications failed:', err);
    }
  }, [profile?.id, checkPermission]);

  // Listen to window focus and document visibilitychange to re-check permission
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !profile?.id) {
      return;
    }

    // Run initial check
    checkPermission().catch((err) => {
      console.error('[FCM] checkPermission failed on mount:', err);
    });

    const handleFocus = () => {
      logDev('[FCM] Window focused, re-checking permission...');
      checkPermission().catch((err) => {
        console.error('[FCM] checkPermission failed on focus:', err);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        logDev('[FCM] Visibility changed to visible, re-checking permission...');
        checkPermission().catch((err) => {
          console.error('[FCM] checkPermission failed on visibility change:', err);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [profile?.id, checkPermission]);

  return {
    permission,
    token,
    loading,
    requestPermission,
    initPushNotifications,
  };
};

export default useNotifications;
