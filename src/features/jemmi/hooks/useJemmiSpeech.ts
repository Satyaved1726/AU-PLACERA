import { useState, useEffect, useCallback, useRef } from 'react';
import type { JemmiLanguage, JemmiSpeechState } from '../types/jemmi.types';
import { LANGUAGE_CONFIG } from '../utils/jemmiLanguage';

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
    .replace(/#{1,6}\s?/g, '') // headers
    .replace(/`{1,3}.*?`{1,3}/g, '') // inline code
    .replace(/[-*+]\s+/g, '') // list bullets
    .replace(/\n+/g, ' ') // newlines
    .trim();
}

export function useJemmiSpeech() {
  const [state, setState] = useState<JemmiSpeechState>({
    isSpeaking: false,
    currentMessageId: null,
    isSupported: typeof window !== 'undefined' && 'speechSynthesis' in window
  });

  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, messageId: string, language: JemmiLanguage) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();

      const cleanText = stripMarkdown(text);
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const config = LANGUAGE_CONFIG[language];

      // Find matching voice by prefixes
      const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
      let matchedVoice = voices.find((v) =>
        config.speechVoicePrefixes.some((p) => v.lang.toLowerCase().startsWith(p.toLowerCase()))
      );

      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
      utterance.lang = config.locale;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setState({
          isSpeaking: true,
          currentMessageId: messageId,
          isSupported: true
        });
      };

      utterance.onend = () => {
        setState({
          isSpeaking: false,
          currentMessageId: null,
          isSupported: true
        });
      };

      utterance.onerror = (e) => {
        console.warn('[Jemmi Speech] Utterance error:', e);
        setState({
          isSpeaking: false,
          currentMessageId: null,
          isSupported: true
        });
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setState((prev) => ({ ...prev, isSpeaking: false, currentMessageId: null }));
    }
  }, []);

  return {
    ...state,
    speak,
    stop
  };
}
