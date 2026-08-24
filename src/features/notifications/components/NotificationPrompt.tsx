import React, { useEffect } from 'react';
import { Bell, AlertTriangle } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';

export const NotificationPrompt: React.FC = () => {
  const { permission, requestPermission } = useNotifications();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[FCM UI] NotificationPrompt mounted');
      console.log('[FCM UI] Current permission = ' + permission);
    }
  }, [permission]);

  // Hide the banner if permission is already granted
  if (permission === 'granted') {
    return null;
  }

  // Gracefully hide if notifications are unsupported by the browser
  if (permission === 'unsupported') {
    return (
      <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 text-center select-none">
        <p className="text-xs text-slate-505 font-bold uppercase tracking-wider">
          Browser notifications are not supported on this browser.
        </p>
      </div>
    );
  }

  // Handle case where permission is blocked/denied
  if (permission === 'denied') {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-100/50 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none z-50">
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
      </div>
    );
  }

  // Handle case where permission is default
  const handleEnable = async () => {
    if (import.meta.env.DEV) {
      console.log('[FCM UI] Enable Notifications clicked');
    }
    const result = await requestPermission();
    if (import.meta.env.DEV) {
      console.log('[FCM UI] Permission result =', result);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-100/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden select-none z-50">
      <div className="flex items-center gap-3.5 z-10">
        <div className="p-2.5 bg-[#0B3C5D] text-white rounded-xl shadow-md shadow-blue-900/10 shrink-0">
          <Bell className="h-4.5 w-4.5 animate-bounce" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
            Enable Notifications
          </h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
            Get instant alerts for placements, notices and important AU updates.
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 z-10 w-full sm:w-auto justify-end">
        <button
          onClick={handleEnable}
          className="px-6 py-2.5 bg-[#0B3C5D] hover:bg-[#0B3C5D]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md transition-all active:scale-[0.97]"
        >
          Enable Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationPrompt;
