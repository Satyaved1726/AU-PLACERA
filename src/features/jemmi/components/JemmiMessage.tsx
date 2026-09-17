import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { JemmiMessage as MessageType, JemmiLanguage } from '../types/jemmi.types';
import { Bot, User, Volume2, VolumeX, ArrowRight } from 'lucide-react';

interface JemmiMessageProps {
  message: MessageType;
  isSpeaking: boolean;
  onSpeak: (text: string, id: string, lang: JemmiLanguage) => void;
  onStopSpeech: () => void;
  onActionClick?: () => void;
}

// Simple markdown formatter helper for clean bolding, bullet points, and newlines
function formatMessageContent(content: string) {
  const lines = content.split('\n');
  return lines.map((line, idx) => {
    // Process bold text
    const parts = line.split(/(\*\*.*?\*\*)/g);
    const parsedLine = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (line.trim().startsWith('- ')) {
      return (
        <li key={idx} className="ml-4 list-disc text-sm my-0.5 leading-relaxed">
          {parsedLine.slice(1)}
        </li>
      );
    }

    if (/^\d+\.\s/.test(line.trim())) {
      return (
        <div key={idx} className="ml-1 text-sm my-1 leading-relaxed">
          {parsedLine}
        </div>
      );
    }

    if (!line.trim()) {
      return <div key={idx} className="h-1.5" />;
    }

    return (
      <p key={idx} className="text-sm my-0.5 leading-relaxed">
        {parsedLine}
      </p>
    );
  });
}

export const JemmiMessage: React.FC<JemmiMessageProps> = ({
  message,
  isSpeaking,
  onSpeak,
  onStopSpeech,
  onActionClick
}) => {
  const navigate = useNavigate();
  const isUser = message.sender === 'user';

  const handleActionClick = (url: string) => {
    if (onActionClick) {
      onActionClick();
    }
    navigate(url);
  };

  const handleSpeechToggle = () => {
    if (isSpeaking) {
      onStopSpeech();
    } else {
      onSpeak(message.text, message.id, message.language || 'en');
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-3.5 group">
        <div className="flex items-end gap-1.5 max-w-[85%]">
          <div className="bg-gradient-to-r from-[#0B3C5D] to-[#164E7A] text-white px-3.5 py-2.5 rounded-2xl rounded-tr-xs shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
          </div>
          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 flex-shrink-0 text-xs">
            <User className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4 group">
      <div className="flex items-start gap-2 max-w-[92%]">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#FF6A00] to-[#E55D00] flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5 ring-1 ring-orange-300/30">
          <Bot className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 px-3.5 py-3 rounded-2xl rounded-tl-xs shadow-sm text-slate-800 dark:text-slate-200">
            {/* Formatted body */}
            <div className="space-y-0.5">{formatMessageContent(message.text)}</div>

            {/* Action buttons if available */}
            {message.actions && message.actions.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex flex-wrap gap-1.5">
                {message.actions.map((act, i) => (
                  <button
                    key={i}
                    onClick={() => handleActionClick(act.url)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0B3C5D]/10 hover:bg-[#0B3C5D] text-[#0B3C5D] hover:text-white dark:bg-amber-400/10 dark:hover:bg-amber-400 dark:text-amber-300 dark:hover:text-slate-900 transition-all shadow-xs active:scale-95"
                  >
                    <span>{act.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bottom metadata / TTS readout */}
          <div className="flex items-center justify-between mt-1 px-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            <button
              onClick={handleSpeechToggle}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                isSpeaking ? 'text-orange-600 dark:text-orange-400 font-semibold' : ''
              }`}
              title={isSpeaking ? 'Stop voice readout' : 'Read aloud with voice'}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-3 h-3 text-red-500" />
                  <span className="text-[10px] text-red-500">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3 h-3" />
                  <span className="text-[10px]">Listen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
