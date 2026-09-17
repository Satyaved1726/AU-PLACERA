import React from 'react';
import { Star, Clock, Calendar } from 'lucide-react';
import type { PriorityDuration } from '../../features/posts/post.types';

interface PrioritySelectorProps {
  isPriority: boolean;
  onTogglePriority: (enabled: boolean) => void;
  duration: PriorityDuration;
  onDurationChange: (duration: PriorityDuration) => void;
  customExpiresAt?: string;
  onCustomExpiresAtChange?: (val: string) => void;
  label?: string;
  description?: string;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  isPriority,
  onTogglePriority,
  duration,
  onDurationChange,
  customExpiresAt,
  onCustomExpiresAtChange,
  label = 'Priority',
  description = 'Make this update appear above normal updates.'
}) => {
  // Compute minimum datetime string for custom picker (current time in local ISO format YYYY-MM-DDTHH:mm)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // at least 5 mins in future
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isPriority
          ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/30'
          : 'bg-slate-50/70 border-slate-200/70 hover:bg-slate-100/60'
      }`}
    >
      {/* Top row: Label & Toggle Switch */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wider">
            <Star className={`w-3.5 h-3.5 ${isPriority ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
            <span>{label}</span>
            {isPriority && (
              <span className="ml-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
                ON
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">
            {description}
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={isPriority}
          onClick={() => onTogglePriority(!isPriority)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
            isPriority ? 'bg-amber-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isPriority ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Expanded Duration Options when Priority is ON */}
      {isPriority && (
        <div className="mt-3.5 pt-3 border-t border-amber-200/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-amber-600" />
              <span>Priority Duration</span>
            </label>

            <select
              value={duration}
              onChange={(e) => onDurationChange(e.target.value as PriorityDuration)}
              className="px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
            >
              <option value="24_hours">24 Hours (Recommended)</option>
              <option value="3_days">3 Days</option>
              <option value="7_days">7 Days</option>
              <option value="custom">Custom Date & Time</option>
              <option value="manual">Until manually turned off</option>
            </select>
          </div>

          {/* Custom Date & Time Input */}
          {duration === 'custom' && (
            <div className="p-3 bg-white border border-amber-300/80 rounded-xl space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-600" />
                <span>Priority Until</span>
              </label>
              <input
                type="datetime-local"
                min={getMinDateTime()}
                value={customExpiresAt || ''}
                onChange={(e) => onCustomExpiresAtChange && onCustomExpiresAtChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                required
              />
              <p className="text-[9px] text-slate-400 font-medium">
                Priority will automatically expire after this date/time.
              </p>
            </div>
          )}

          {duration === 'manual' && (
            <p className="text-[10px] text-amber-800 font-semibold bg-amber-100/50 p-2 rounded-lg border border-amber-200/60">
              📌 Remains priority indefinitely until an admin manually disables it.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default PrioritySelector;
