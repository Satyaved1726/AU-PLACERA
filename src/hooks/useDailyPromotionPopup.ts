import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth/useAuth';
import { supabase } from '../lib/supabase';

const DISMISSAL_PREFIX = 'au_rb_popup_dismissed_';

/**
 * Checks if the Raksha Bandhan promotional campaign is currently active.
 * Target window: 28-August-2026, 12:00 AM until 11:00 PM IST (Asia/Kolkata).
 * Time window: 2026-08-28 00:00:00 to 2026-08-28 23:00:00 IST (strictly less than 23:00).
 */
export const isCampaignActive = (): boolean => {
  try {
    const now = new Date();
    
    // Format the current time strictly in Asia/Kolkata timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getVal = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

    const year = getVal('year');
    const month = getVal('month'); // 1-12
    const day = getVal('day');
    const hour = getVal('hour');

    // Campaign: 28-August-2026
    if (year !== 2026 || month !== 8 || day !== 28) {
      return false;
    }

    // Active from 12:00 AM (00:00) to 11:00 PM (23:00) IST
    return hour >= 0 && hour < 23;
  } catch (e) {
    console.error('[Promotion] TimeZone formatting error, falling back to UTC epoch values:', e);
    
    // Fallback UTC comparison:
    // Start: 2026-08-27 18:30:00 UTC (equivalent to 2026-08-28 00:00:00 IST)
    // End: 2026-08-28 17:30:00 UTC (equivalent to 2026-08-28 23:00:00 IST)
    const nowMs = Date.now();
    const startMs = Date.UTC(2026, 7, 27, 18, 30, 0); // Month is 0-indexed (August = 7)
    const endMs = Date.UTC(2026, 7, 28, 17, 30, 0);
    
    return nowMs >= startMs && nowMs < endMs;
  }
};

export const useDailyPromotionPopup = () => {
  const { user, loading } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);

  // Helper to generate a unique key for the current login session
  const getDismissalKey = (u: any): string => {
    if (!u) return '';
    // Use last_sign_in_at timestamp to uniquely identify the current login session
    const sessionTime = u.last_sign_in_at 
      ? new Date(u.last_sign_in_at).getTime() 
      : (u.updated_at ? new Date(u.updated_at).getTime() : 'session');
    return `${DISMISSAL_PREFIX}${u.id}_${sessionTime}`;
  };

  // 1. Listen to Supabase SIGNED_OUT auth events to clear the dismissal state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Clear all keys matching the prefix from both storage types
        const keysToRemove: string[] = [];
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(DISMISSAL_PREFIX)) {
            keysToRemove.push(key);
          }
        }
        
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(DISMISSAL_PREFIX)) {
            keysToRemove.push(key);
          }
        }

        keysToRemove.forEach(k => {
          localStorage.removeItem(k);
          sessionStorage.removeItem(k);
        });

        setShouldShow(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Manage the popup state based on auth status and timing window
  useEffect(() => {
    if (loading) return;

    if (!user) {
      setShouldShow(false);
      return;
    }

    const checkStatus = () => {
      // Check timing window eligibility
      const active = isCampaignActive();
      if (!active) {
        setShouldShow(false);
        return;
      }

      // Check session dismissal state
      const key = getDismissalKey(user);
      const dismissed = localStorage.getItem(key) === 'true' || sessionStorage.getItem(key) === 'true';
      if (dismissed) {
        setShouldShow(false);
        return;
      }

      // Prevent duplicate modals by checking if the modal element already exists in DOM
      const alreadyExists = document.getElementById('raksha-bandhan-popup') !== null;
      if (alreadyExists && !shouldShow) {
        setShouldShow(false);
        return;
      }

      setShouldShow(true);
    };

    checkStatus();

    // Check periodically to automatically close at exactly 11:00 PM IST
    const interval = setInterval(checkStatus, 15000);

    return () => clearInterval(interval);
  }, [user, loading, shouldShow]);

  const dismissPopup = () => {
    if (user) {
      const key = getDismissalKey(user);
      localStorage.setItem(key, 'true');
      sessionStorage.setItem(key, 'true');
    }
    setShouldShow(false);
  };

  return {
    shouldShow,
    dismissPopup,
  };
};
