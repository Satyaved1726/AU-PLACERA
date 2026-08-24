import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationPrompt: React.FC = () => {
  const { permission, requestPermission } = useNotifications();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('au_notifications_prompt_dismissed') === 'true';
    }
    return false;
  });

  const [blockedDismissed, setBlockedDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('au_notifications_blocked_dismissed') === 'true';
    }
    return false;
  });

  useEffect(() => {
    console.log('[FCM UI] NotificationPrompt mounted = true');
  }, []);

  // Handle case where permission is already granted
  if (permission === 'granted') {
    return null;
  }

  // Handle case where notifications are unsupported
  if (permission === 'unsupported') {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center select-none">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
          Browser notifications are not supported on this browser.
        </p>
      </div>
    );
  }

  // Handle case where permission is blocked/denied
  if (permission === 'denied') {
    if (blockedDismissed) {
      return null;
    }

    const handleDismissBlocked = () => {
      localStorage.setItem('au_notifications_blocked_dismissed', 'true');
      setBlockedDismissed(true);
    };

    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-100/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none">
        <div className="flex items-center gap-3.5 z-10">
          <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md shrink-0">
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">
              Notifications Blocked
            </h4>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
              Allow notifications for AU Placera from your browser's site settings, then reload the page.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto justify-end">
          <button
            onClick={handleDismissBlocked}
            className="px-4.5 py-2 bg-amber-700 hover:bg-amber-850 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-[0.97]"
          >
            Got it
          </button>
        </div>
        
        <button
          onClick={handleDismissBlocked}
          className="absolute top-2.5 right-2.5 text-amber-500 hover:text-amber-700 p-0.5 rounded-lg transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Handle case where permission is default
  if (dismissed) {
    return null;
  }

  const handleEnable = async () => {
    console.log('[FCM UI] Enable button clicked');
    const success = await requestPermission();
    if (success) {
      localStorage.setItem('au_notifications_prompt_dismissed', 'true');
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('au_notifications_prompt_dismissed', 'true');
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-100/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none">
      <div className="flex items-center gap-3.5 z-10">
        <div className="p-2.5 bg-[#0B3C5D] text-white rounded-xl shadow-md shadow-blue-900/10 shrink-0">
          <Bell className="h-4.5 w-4.5 animate-bounce" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Enable Notifications
          </h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
            Get instant alerts for new placements, notices and important updates.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto justify-end">
        <button
          onClick={handleDismiss}
          className="px-3.5 py-2 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-650 transition-colors"
        >
          Maybe Later
        </button>
        <button
          onClick={handleEnable}
          className="px-4.5 py-2 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-[0.97]"
        >
          Enable Notifications
        </button>
      </div>
      
      <button
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-650 p-0.5 rounded-lg transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default NotificationPrompt;
