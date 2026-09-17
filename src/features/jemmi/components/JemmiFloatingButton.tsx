import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface JemmiFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const JemmiFloatingButton: React.FC<JemmiFloatingButtonProps> = ({
  onClick,
  isOpen
}) => {
  if (isOpen) return null;

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none">
      <button
        onClick={onClick}
        className="group relative flex items-center gap-2.5 px-3.5 py-3 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-[#0B3C5D] via-[#114B75] to-[#FF6A00] text-white shadow-xl hover:shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-white/20"
        title="Chat with Jemmi AI"
        aria-label="Open Jemmi AI Assistant"
      >
        {/* Glow pulse animation */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-[#0B3C5D] to-[#FF6A00] opacity-40 blur-sm group-hover:opacity-75 transition duration-500 -z-10 group-hover:animate-pulse" />

        {/* Icon Container */}
        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 shadow-inner">
          <Bot className="w-5 h-5 text-amber-300 transform group-hover:rotate-12 transition-transform duration-300" />
        </div>

        {/* Text for desktop / larger screens */}
        <div className="hidden sm:flex flex-col items-start pr-1 text-left">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm leading-none text-white tracking-tight">
              Ask Jemmi
            </span>
            <Sparkles className="w-3 h-3 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <span className="text-[10px] text-white/80 leading-none mt-1">
            AU Placera AI
          </span>
        </div>

        {/* Badge on mobile */}
        <span className="sm:hidden text-xs font-bold tracking-tight">Jemmi</span>
      </button>
    </div>
  );
};
