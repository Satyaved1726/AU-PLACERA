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

      {/* Main Floating Panel / Mobile Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 sm:bottom-6 sm:right-6 sm:left-auto z-50 sm:w-[420px] max-h-[85vh] sm:max-h-[640px] h-[85vh] sm:h-[600px] flex flex-col bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-200 overflow-hidden">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-950/40 dark:to-slate-900">
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
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2.5 flex items-center gap-1.5 border border-slate-200/60 dark:border-slate-700/60">
                <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#FF6A00] animate-bounce" style={{ animationDelay: '300ms' }} />
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
