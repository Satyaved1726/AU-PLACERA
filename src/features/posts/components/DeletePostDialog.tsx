import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface DeletePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export const DeletePostDialog: React.FC<DeletePostDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}) => {
  const shouldReduceMotion = useReducedMotion();
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
        />

        {/* Dialog Panel */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 10 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
          className="w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200 p-6 relative z-10 space-y-4"
        >
          {/* Warning Header */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800 tracking-tight">Delete Notice?</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">This action cannot be undone.</p>
            </div>
          </div>

          {/* Prompt */}
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Are you sure you want to permanently delete this placement notice? It will remove all records from the student notice board instantly.
          </p>

          {/* Action Buttons (h-11 targets for accessibility) */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="h-11 px-4 text-xs font-bold text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 rounded-md active:scale-95 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className="h-11 px-5 inline-flex items-center justify-center text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete Notice'}
            </button>
          </div>
        </motion.div>

      </div>
    </AnimatePresence>
  );
};
export default DeletePostDialog;
