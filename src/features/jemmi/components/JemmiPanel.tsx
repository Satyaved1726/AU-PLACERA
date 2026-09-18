import React, { useRef, useEffect } from 'react';
import { JemmiHeader } from './JemmiHeader';
import { JemmiMessage } from './JemmiMessage';
import { JemmiQuickActions } from './JemmiQuickActions';
import { JemmiInput } from './JemmiInput';
import { useJemmi } from '../hooks/useJemmi';

interface JemmiPanelProps {
  jemmi: ReturnType<typeof useJemmi>;
}

export const JemmiPanel: React.FC<JemmiPanelProps> = ({ jemmi }) => {
  const {
    isOpen,
    closeJemmi,
    language,
    setLanguage,
    inputText,
    setInputText,
    isProcessing,
    messages,
    sendMessage,
    clearMessages,
    voice,
    speech,
    quickActions
  } = jemmi;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 sm:hidden transition-opacity"
        onClick={closeJemmi}
      />

      {/* Main Floating Panel — Responsive & Strictly Contained */}
      <div className="fixed inset-x-3 bottom-20 top-16 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[540px] sm:max-h-[80vh] z-50 flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <JemmiHeader
          language={language}
          onLanguageChange={setLanguage}
          onClear={clearMessages}
          onClose={closeJemmi}
          isSpeaking={speech.isSpeaking}
          onStopSpeech={speech.stop}
        />

        {/* Message Scroll View */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-1 bg-[#F8FAFC]/60">
          {messages.map((msg) => (
            <JemmiMessage
              key={msg.id}
              message={msg}
              isSpeaking={speech.isSpeaking && speech.currentMessageId === msg.id}
              onSpeak={speech.speak}
              onStopSpeech={speech.stop}
              onActionClick={closeJemmi}
            />
          ))}

          {/* Processing / Thinking indicator */}
          {isProcessing && (
            <div className="flex justify-start mb-3">
              <div className="bg-white rounded-2xl px-3.5 py-2 flex items-center gap-1.5 border border-slate-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] font-semibold text-slate-500 ml-1">Jemmi is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Chips */}
        <JemmiQuickActions
          quickActions={quickActions}
          language={language}
          onSelectAction={(prompt) => sendMessage(prompt)}
          disabled={isProcessing}
        />

        {/* Input Field with Voice and Send */}
        <JemmiInput
          value={inputText}
          onChange={setInputText}
          onSend={() => sendMessage()}
          language={language}
          isListening={voice.isListening}
          onToggleVoice={voice.toggleListening}
          voiceSupported={voice.isSupported}
          isLoading={isProcessing}
        />
      </div>
    </>
  );
};
