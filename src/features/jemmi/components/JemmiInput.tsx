import React, { useRef, useEffect } from 'react';
import type { JemmiLanguage } from '../types/jemmi.types';
import { Mic, MicOff, SendHorizontal, Loader2 } from 'lucide-react';

interface JemmiInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  language: JemmiLanguage;
  isListening: boolean;
  onToggleVoice: () => void;
  voiceSupported: boolean;
  isLoading: boolean;
}

const PLACEHOLDERS: Record<JemmiLanguage, string> = {
  en: 'Ask Jemmi about opportunities, polls, or notices...',
  te: 'అవకాశాలు, పోల్స్ లేదా నోటీసుల గురించి అడగండి...',
  hi: 'अवसरों, पोल या नोटिस के बारे में पूछें...'
};

export const JemmiInput: React.FC<JemmiInputProps> = ({
  value,
  onChange,
  onSend,
  language,
  isListening,
  onToggleVoice,
  voiceSupported,
  isLoading
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  useEffect(() => {
    if (!isListening) {
      inputRef.current?.focus();
    }
  }, [isListening]);

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 rounded-b-2xl">
      {/* Listening Status Bar */}
      {isListening && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-between text-xs text-red-600 dark:text-red-400 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-medium">Listening ({language.toUpperCase()})... Speak now</span>
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            className="text-[11px] underline font-semibold hover:text-red-700"
          >
            Done
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-700/80 focus-within:border-[#0B3C5D] dark:focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-[#0B3C5D]/10 dark:focus-within:ring-amber-400/10 transition-all">
        {/* Voice Input Button */}
        {voiceSupported && (
          <button
            type="button"
            onClick={onToggleVoice}
            disabled={isLoading}
            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
              isListening
                ? 'bg-red-500 text-white shadow-md shadow-red-500/30 animate-bounce'
                : 'text-slate-500 dark:text-slate-400 hover:text-[#FF6A00] dark:hover:text-amber-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
            title={isListening ? 'Stop Listening' : 'Speak with Voice'}
            aria-label="Toggle Voice Input"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : PLACEHOLDERS[language]}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden px-1 py-1 min-w-0"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className={`p-2 rounded-lg flex-shrink-0 transition-all ${
            value.trim() && !isLoading
              ? 'bg-gradient-to-r from-[#FF6A00] to-[#E55D00] text-white shadow-sm hover:opacity-90 active:scale-95'
              : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
          }`}
          title="Send Message"
          aria-label="Send Message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
          ) : (
            <SendHorizontal className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
