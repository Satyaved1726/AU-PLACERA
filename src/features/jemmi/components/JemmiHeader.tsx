import React from 'react';
import type { JemmiLanguage } from '../types/jemmi.types';
import { Bot, X, RotateCcw, VolumeX } from 'lucide-react';

interface JemmiHeaderProps {
  language: JemmiLanguage;
  onLanguageChange: (lang: JemmiLanguage) => void;
  onClear: () => void;
  onClose: () => void;
  isSpeaking?: boolean;
  onStopSpeech?: () => void;
}

export const JemmiHeader: React.FC<JemmiHeaderProps> = ({
  language,
  onLanguageChange,
  onClear,
  onClose,
  isSpeaking,
  onStopSpeech
}) => {
  return (
    <div className="bg-gradient-to-r from-[#0B3C5D] via-[#114B75] to-[#FF6A00] p-3 sm:p-4 text-white rounded-t-2xl shadow-md flex items-center justify-between gap-2 select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white ring-1 ring-white/30 flex-shrink-0 shadow-inner">
          <Bot className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white truncate">
              Jemmi AI
            </h3>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 leading-none">
              AU Placera
            </span>
          </div>
          <p className="text-[11px] text-white/80 leading-none truncate mt-0.5">
            Your Multilingual Assistant
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Speaking indicator and stop button */}
        {isSpeaking && onStopSpeech && (
          <button
            onClick={onStopSpeech}
            className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-600 text-white transition-all text-xs flex items-center gap-1 animate-pulse"
            title="Stop Speaking"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Language selector toggle */}
        <div className="flex bg-black/25 backdrop-blur-sm p-0.5 rounded-lg text-xs font-medium border border-white/10">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-2 py-0.5 rounded transition-all ${
              language === 'en'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('te')}
            className={`px-2 py-0.5 rounded transition-all ${
              language === 'te'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            తెలుగు
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('hi')}
            className={`px-2 py-0.5 rounded transition-all ${
              language === 'hi'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-sm'
                : 'text-white/80 hover:text-white'
            }`}
          >
            हिन्दी
          </button>
        </div>

        {/* Clear chat history */}
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Reset Conversation"
          aria-label="Reset Conversation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Close Jemmi"
          aria-label="Close Jemmi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
