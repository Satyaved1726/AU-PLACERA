import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/useAuth';

const DISMISSAL_KEY = 'au_rb_popup_dismissed';

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
  const prevUserRef = useRef<any>(null);

  // Sync prevUserRef as user changes
  useEffect(() => {
    if (user && !loading) {
      prevUserRef.current = user;
    }
  }, [user, loading]);

  useEffect(() => {
    // Wait until initial auth loading is complete to prevent flashing
    if (loading) return;

    // Detect explicit logout: transition from logged-in to logged-out
    if (prevUserRef.current && !user) {
      sessionStorage.removeItem(DISMISSAL_KEY);
      prevUserRef.current = null;
      setShouldShow(false);
      return;
    }

    // If no user is authenticated, do not show the popup
    if (!user) {
      setShouldShow(false);
      return;
    }

    const checkStatus = () => {
      // 1. Check if campaign is active
      const active = isCampaignActive();
      if (!active) {
        setShouldShow(false);
        return;
      }

      // 2. Check if user already dismissed it in this session
      const dismissed = sessionStorage.getItem(DISMISSAL_KEY) === 'true';
      if (dismissed) {
        setShouldShow(false);
        return;
      }

      // 3. Prevent duplicate modals by checking if the modal element already exists in DOM
      // (This serves as a safety check if multiple components mount/render)
      const alreadyExists = document.getElementById('raksha-bandhan-popup') !== null;
      if (alreadyExists && !shouldShow) {
        setShouldShow(false);
        return;
      }

      setShouldShow(true);
    };

    checkStatus();

    // Check periodically to auto-expire at exactly 11:00 PM IST
    const interval = setInterval(checkStatus, 15000);

    return () => clearInterval(interval);
  }, [user, loading, shouldShow]);

  const dismissPopup = () => {
    sessionStorage.setItem(DISMISSAL_KEY, 'true');
    setShouldShow(false);
  };

  return {
    shouldShow,
    dismissPopup,
  };
};
