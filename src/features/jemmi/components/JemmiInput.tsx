import React, { useRef, useEffect } from 'react';
import type { JemmiLanguage } from '../types/jemmi.types';
import { Mic, MicOff, SendHorizontal, Loader2, AlertCircle, X } from 'lucide-react';

interface JemmiInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  language: JemmiLanguage;
  isListening: boolean;
  onToggleVoice: () => void;
  voiceSupported: boolean;
  voiceError: string | null;
  onClearVoiceError: () => void;
  isLoading: boolean;
}

const PLACEHOLDERS: Record<JemmiLanguage, string> = {
  en: 'Ask about opportunities, polls, notices...',
  te: 'అవకాశాలు, పోల్స్ గురించి అడగండి...',
  hi: 'अवसरों, पोल के बारे में पूछें...'
};

export const JemmiInput: React.FC<JemmiInputProps> = ({
  value,
  onChange,
  onSend,
  language,
  isListening,
  onToggleVoice,
  voiceSupported,
  voiceError,
  onClearVoiceError,
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
    <div className="p-2.5 sm:p-3 bg-white border-t border-slate-100 rounded-b-2xl flex-shrink-0">
      {/* Voice Error Banner */}
      {voiceError && (
        <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start justify-between gap-2 text-xs text-amber-800 animate-in fade-in duration-150">
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="leading-snug text-[11px] font-medium">{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={onClearVoiceError}
            className="text-amber-600 hover:text-amber-900 p-0.5 rounded cursor-pointer"
            title="Dismiss error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Listening Status Bar */}
      {isListening && (
        <div className="mb-2 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-600 animate-pulse">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-[11px]">
              Listening in {language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}... Speak now
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            className="text-[11px] font-bold text-red-700 hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-xl px-2 py-1 border border-slate-200 focus-within:border-[#0B3C5D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B3C5D]/10 transition-all">
        {/* Voice Input Button */}
        <button
          type="button"
          onClick={onToggleVoice}
          disabled={isLoading}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
            isListening
              ? 'bg-red-500 text-white shadow-xs animate-pulse'
              : 'text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100'
          }`}
          title={
            !voiceSupported
              ? "Voice input isn't supported in this browser"
              : isListening
              ? 'Stop Listening'
              : 'Speak with Voice'
          }
          aria-label="Toggle Voice Input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? 'Listening...' : PLACEHOLDERS[language]}
          disabled={isLoading}
          className="flex-1 bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden px-1 py-1 min-w-0"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className={`p-1.5 rounded-lg flex-shrink-0 transition-all cursor-pointer ${
            value.trim() && !isLoading
              ? 'bg-[#0B3C5D] hover:bg-[#082a42] text-white shadow-xs active:scale-95'
              : 'text-slate-300 cursor-not-allowed'
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
