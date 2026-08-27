import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationPrompt: React.FC = () => {
  const { permission, requestPermission } = useNotifications();
  const [showBlockedReminder, setShowBlockedReminder] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[FCM UI] NotificationPrompt mounted');
      console.log('[FCM UI] Current permission = ' + permission);
    }
  }, [permission]);

  // Handle 3-day reminder cooldown when permission is denied
  useEffect(() => {
    if (permission === 'denied') {
      const reminderAtStr = localStorage.getItem('au_placera_notification_reminder_at');
      const now = Date.now();
      const cooldown = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

      if (!reminderAtStr) {
        // FIRST DENIAL: show blocked helper and record reminder timestamp
        localStorage.setItem('au_placera_notification_reminder_at', now.toString());
        setShowBlockedReminder(true);
      } else {
        const reminderAt = parseInt(reminderAtStr, 10);
        if (now - reminderAt > cooldown) {
          // AFTER 3 DAYS: show the compact reminder again and update the reminder timestamp
          localStorage.setItem('au_placera_notification_reminder_at', now.toString());
          setShowBlockedReminder(true);
        } else {
          // WITHIN COOLDOWN: do not show reminder
          setShowBlockedReminder(false);
        }
      }
    } else {
      setShowBlockedReminder(false);
    }
  }, [permission]);

  // Hide the banner if permission is already granted
  if (permission === 'granted') {
    return null;
  }

  // Gracefully hide if notifications are unsupported by the browser
  if (permission === 'unsupported') {
    return null;
  }

  // Handle case where permission is blocked/denied
  if (permission === 'denied') {
    if (!showBlockedReminder) {
      return null;
    }

    return (
      <>
        <div className="bg-gradient-to-r from-amber-50/70 to-orange-50/70 border border-amber-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none">
          <div className="flex items-center gap-3.5 z-10">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md shrink-0">
              <Bell className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">
                Notifications are blocked
              </h4>
              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide leading-relaxed">
                Allow notifications to receive placement and announcement alerts.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowHelpModal(true)}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.97] whitespace-nowrap w-full sm:w-auto text-center"
            >
              How to enable
            </button>
          </div>
        </div>

        {/* Small Instruction Modal for blocked permission */}
        {showHelpModal && (
          <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
            {/* Modal Backdrop overlay - lower than z-50 to sit behind navigation drawer */}
            <div 
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" 
              onClick={() => setShowHelpModal(false)}
            />
            {/* Modal Content */}
            <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 shadow-xl relative z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex justify-between items-start">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-600 animate-pulse" /> Notifications are blocked
                </h3>
                <button 
                  onClick={() => setShowHelpModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2.5">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  To receive AU Placera alerts:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-slate-650 font-semibold space-y-1.5 pl-1 leading-relaxed">
                  <li>Open browser Site Settings for AU Placera.</li>
                  <li>Change Notifications to Allow.</li>
                  <li>Return to AU Placera.</li>
                  <li>Reload the page.</li>
                </ol>
              </div>

              <div className="flex gap-2.5 justify-end mt-2">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-amber-650 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Handle case where permission is default
  const handleEnable = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('[FCM UI] Enable Notifications clicked');
      }
      const result = await requestPermission();
      if (import.meta.env.DEV) {
        console.log('[FCM UI] Permission result =', result);
      }
    } catch (err) {
      console.error('[FCM UI] handleEnable failed:', err);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-100/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none">
      <div className="flex items-center gap-3.5 z-10">
        <div className="p-2.5 bg-[#0B3C5D] text-white rounded-xl shadow-md shrink-0">
          <Bell className="h-4.5 w-4.5 animate-bounce" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Enable Notifications
          </h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
            Get instant alerts for placements, opportunities and important announcements.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto justify-end">
        <button
          onClick={handleEnable}
          className="px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.97] w-full sm:w-auto text-center"
        >
          Enable Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
