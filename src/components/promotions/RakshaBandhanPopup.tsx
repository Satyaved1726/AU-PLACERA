import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDailyPromotionPopup } from '../../hooks/useDailyPromotionPopup';

export const RakshaBandhanPopup: React.FC = () => {
  const { shouldShow, dismissPopup } = useDailyPromotionPopup();

  useEffect(() => {
    if (shouldShow) {
      // Small timeout to ensure the DOM element is rendered before focusing
      const timer = setTimeout(() => {
        document.getElementById('rb-close-btn')?.focus();
      }, 100);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          dismissPopup();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      
      // Temporarily lock body scroll to keep focus on the modal
      document.body.style.overflow = 'hidden';

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [shouldShow, dismissPopup]);

  return (
    <AnimatePresence>
      {shouldShow && (
        <div 
          id="raksha-bandhan-popup"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rb-popup-title"
        >
          {/* Backdrop (Dimmed & Blurred) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 260 }}
            className="relative w-full max-w-[420px] max-h-[85vh] bg-[#F8FAFC] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center"
          >
            {/* Screen reader only title for accessibility */}
            <h2 id="rb-popup-title" className="sr-only">
              Happy Raksha Bandhan from AU Placera
            </h2>

            {/* Premium, High-Contrast Close Button */}
            <button
              id="rb-close-btn"
              onClick={dismissPopup}
              className="absolute top-3 right-3 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#D9B310] focus:ring-offset-2 focus:ring-offset-black/40"
              aria-label="Close promotional popup"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Poster content wrapper */}
            <div className="w-full flex-grow overflow-hidden flex items-center justify-center bg-slate-900">
              <img
                src="/assets/raksha_bandhan.jpg"
                alt="Happy Raksha Bandhan from AU Placera! A sibling is often just a call away, and AU Placera is just a tap away. Explore Opportunities."
                className="w-full h-auto max-h-[80vh] object-contain select-none pointer-events-none"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
