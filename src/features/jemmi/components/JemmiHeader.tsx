import React from 'react';
import type { JemmiLanguage } from '../types/jemmi.types';
import { Sparkles, X, RotateCcw, VolumeX } from 'lucide-react';

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
    <div className="bg-[#0B3C5D] px-3.5 py-2.5 text-white rounded-t-2xl shadow-sm flex items-center justify-between gap-2 select-none border-b border-white/10 flex-shrink-0">
      {/* Brand & Identity */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6A00] to-[#E55D00] flex items-center justify-center text-white flex-shrink-0 shadow-sm ring-1 ring-white/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm leading-tight text-white truncate">
              Jemmi AI
            </h3>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400 text-slate-900 leading-none">
              AU
            </span>
          </div>
          <p className="text-[10px] text-slate-200 leading-none truncate mt-0.5">
            Your Placement Assistant
          </p>
        </div>
      </div>

      {/* Controls & Compact Language Switcher */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Speaking indicator and stop button */}
        {isSpeaking && onStopSpeech && (
          <button
            type="button"
            onClick={onStopSpeech}
            className="p-1 rounded bg-red-500 hover:bg-red-600 text-white transition-all text-xs flex items-center gap-1 animate-pulse"
            title="Stop Speaking"
          >
            <VolumeX className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Compact Micro Language Selector */}
        <div className="flex bg-slate-900/40 p-0.5 rounded-lg text-[11px] font-semibold border border-white/15">
          <button
            type="button"
            onClick={() => onLanguageChange('en')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              language === 'en'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
            title="English"
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('te')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              language === 'te'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
            title="తెలుగు (Telugu)"
          >
            తె
          </button>
          <button
            type="button"
            onClick={() => onLanguageChange('hi')}
            className={`px-1.5 py-0.5 rounded transition-all ${
              language === 'hi'
                ? 'bg-white text-[#0B3C5D] font-bold shadow-xs'
                : 'text-white/70 hover:text-white'
            }`}
            title="हिन्दी (Hindi)"
          >
            हि
          </button>
        </div>

        {/* Reset Chat */}
        <button
          type="button"
          onClick={onClear}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          title="Reset Conversation"
          aria-label="Reset Conversation"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          title="Close Jemmi"
          aria-label="Close Jemmi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
