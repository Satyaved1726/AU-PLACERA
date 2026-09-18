import React from 'react';
import { Sparkles } from 'lucide-react';

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
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
      <button
        onClick={onClick}
        className="group relative flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0B3C5D] hover:bg-[#082a42] text-white shadow-lg hover:shadow-xl hover:shadow-blue-950/20 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 border-2 border-white ring-2 ring-[#0B3C5D]/20 cursor-pointer"
        title="Ask Jemmi AI"
        aria-label="Open Jemmi AI Assistant"
      >
        {/* Subtle orange sparkle ring */}
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#0B3C5D] opacity-40 blur-xs group-hover:opacity-75 transition duration-300 -z-10" />

        {/* Small AI Symbol Icon */}
        <div className="flex items-center justify-center relative">
          <Sparkles className="w-5 h-5 text-amber-300 transform group-hover:rotate-12 transition-transform duration-200" />
          <span className="absolute -bottom-1 -right-1 text-[8px] font-black tracking-tighter text-white bg-[#FF6A00] px-1 rounded-full leading-none scale-85">
            AI
          </span>
        </div>
      </button>
    </div>
  );
};
