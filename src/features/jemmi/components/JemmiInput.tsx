import React, { useRef, useEffect } from 'react';
import type { JemmiLanguage, JemmiVoicePhase, JemmiVoiceErrorDetails } from '../types/jemmi.types';
import { Mic, MicOff, SendHorizontal, Loader2, AlertCircle, X, RotateCcw } from 'lucide-react';

interface JemmiInputProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  language: JemmiLanguage;
  isListening: boolean;
  phase?: JemmiVoicePhase;
  audioLevel?: number;
  onToggleVoice: () => void;
  voiceError: JemmiVoiceErrorDetails | null;
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
      {/* Clear Inline Voice Error Notification with Full Instructions */}
      {voiceError && (
        <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/90 text-amber-900 animate-in fade-in duration-150 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <p className="font-semibold text-amber-950">{voiceError.message}</p>
                <p className="text-[10px] text-amber-800/90 mt-0.5">
                  Click the <strong>lock icon (🔒)</strong> in your browser address bar → set <strong>Microphone to "Allow"</strong> → click <strong>Retry</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
              {voiceError.canRetry && (
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-200/90 hover:bg-amber-300 text-amber-950 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs active:scale-95"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClearVoiceError}
                className="text-amber-600 hover:text-amber-900 p-1 rounded-lg hover:bg-amber-100 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Listening Indicator */}
      {isListening && (
        <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between text-xs text-red-600 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping flex-shrink-0" />
            <span className="font-bold text-[11px] leading-tight">
              Listening ({language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'})... Speak now
            </span>
          </div>
          <button
            type="button"
            onClick={onToggleVoice}
            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold shadow-2xs hover:bg-red-700 cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      )}

      <div className="flex items-center gap-1.5 bg-[#F8FAFC] rounded-xl px-2 py-1 border border-slate-200 focus-within:border-[#0B3C5D] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0B3C5D]/10 transition-all">
        {/* Direct Voice Input Button */}
        <button
          type="button"
          onClick={onToggleVoice}
          disabled={isLoading}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
            isListening
              ? 'bg-red-500 text-white shadow-xs animate-pulse'
              : 'text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100'
          }`}
          title={isListening ? 'Stop Listening' : 'Speak with Voice'}
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
          placeholder={isListening ? 'Listening to your voice...' : PLACEHOLDERS[language]}
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
