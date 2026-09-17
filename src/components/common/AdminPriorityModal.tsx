import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, Clock, Calendar, AlertCircle } from 'lucide-react';
import type { PriorityDuration } from '../../features/posts/post.types';

interface AdminPriorityModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isCurrentlyPriority: boolean;
  currentDuration?: string | null;
  currentExpiresAt?: string | null;
  onSavePriority: (
    isPriority: boolean,
    duration?: PriorityDuration,
    customExpiresAt?: string | null
  ) => Promise<void>;
}

export const AdminPriorityModal: React.FC<AdminPriorityModalProps> = ({
  isOpen,
  onClose,
  title,
  isCurrentlyPriority,
  currentExpiresAt,
  onSavePriority
}) => {
  const [duration, setDuration] = useState<PriorityDuration>('24_hours');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const handleTurnOff = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onSavePriority(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to turn off priority.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnableOrUpdate = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (duration === 'custom') {
        if (!customExpiresAt) {
          setError('Please select a custom expiration date and time.');
          setIsSubmitting(false);
          return;
        }
        if (new Date(customExpiresAt).getTime() <= Date.now()) {
          setError('Custom expiration date must be in the future.');
          setIsSubmitting(false);
          return;
        }
      }
      await onSavePriority(
        true,
        duration,
        duration === 'custom' ? new Date(customExpiresAt).toISOString() : null
      );
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update priority.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
                <Star className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                  Priority Settings
                </h3>
                <p className="text-[11px] font-medium text-slate-500 truncate max-w-[260px]">
                  {title}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current Status Info */}
          {isCurrentlyPriority && currentExpiresAt && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-medium">
              ⭐ <strong>Currently Priority:</strong> Active until{' '}
              {new Date(currentExpiresAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}

          {isCurrentlyPriority && !currentExpiresAt && (
            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-medium">
              ⭐ <strong>Currently Priority:</strong> Active until manually turned off.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Duration Selector */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Select Priority Duration</span>
            </label>

            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value as PriorityDuration)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20 focus:border-[#0B3C5D]"
            >
              <option value="24_hours">24 Hours (Recommended)</option>
              <option value="3_days">3 Days</option>
              <option value="7_days">7 Days</option>
              <option value="custom">Custom Date & Time</option>
              <option value="manual">Until manually turned off</option>
            </select>

            {duration === 'custom' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-[#0B3C5D]" />
                  <span>Priority Until</span>
                </label>
                <input
                  type="datetime-local"
                  min={getMinDateTime()}
                  value={customExpiresAt}
                  onChange={(e) => setCustomExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D]/20"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {isCurrentlyPriority && (
              <button
                type="button"
                onClick={handleTurnOff}
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50"
              >
                Turn Priority Off
              </button>
            )}

            <button
              type="button"
              onClick={handleEnableOrUpdate}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#0B3C5D] hover:bg-[#082d47] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-blue-900/10 transition-all disabled:opacity-50"
            >
              {isSubmitting
                ? 'Updating...'
                : isCurrentlyPriority
                ? 'Update Duration'
                : 'Mark as Priority'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdminPriorityModal;
