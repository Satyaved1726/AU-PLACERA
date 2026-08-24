import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = 
  !!firebaseConfig.apiKey && 
  !!firebaseConfig.projectId && 
  !!firebaseConfig.messagingSenderId && 
  !!firebaseConfig.appId;

let appInstance: any = null;
let messagingInstance: Messaging | null = null;

export const getFirebaseApp = () => {
  if (appInstance) return appInstance;
  if (!hasFirebaseConfig) return null;

  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    return appInstance;
  } catch (error) {
    console.error('Failed to initialize Firebase App SDK:', error);
    return null;
  }
};

export const getMessagingInstance = (): Messaging | null => {
  if (messagingInstance) return messagingInstance;
  if (typeof window === 'undefined') return null;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    if ('serviceWorker' in navigator) {
      messagingInstance = getMessaging(app);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging SDK:', error);
  }
  
  return messagingInstance;
};
