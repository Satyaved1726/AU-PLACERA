import { useState, useEffect, useRef, useCallback } from 'react';
import type { JemmiLanguage, JemmiVoiceState } from '../types/jemmi.types';
import { LANGUAGE_CONFIG } from '../utils/jemmiLanguage';

interface UseJemmiVoiceOptions {
  language: JemmiLanguage;
  onTranscript: (text: string) => void;
}

export function useJemmiVoice({ language, onTranscript }: UseJemmiVoiceOptions) {
  const [state, setState] = useState<JemmiVoiceState>({
    isListening: false,
    transcript: '',
    isSupported: false,
    error: null
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setState((prev) => ({ ...prev, isSupported: true }));
    } else {
      setState((prev) => ({ ...prev, isSupported: false }));
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error: 'Voice recognition is not supported in this browser.'
      }));
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = LANGUAGE_CONFIG[language].locale;

      recognition.onstart = () => {
        setState({
          isListening: true,
          transcript: '',
          isSupported: true,
          error: null
        });
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        setState((prev) => ({ ...prev, transcript: currentText }));
        if (currentText) {
          onTranscript(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Jemmi Voice] Recognition error:', event.error);
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: event.error === 'not-allowed' ? 'Microphone permission denied.' : 'Voice recognition failed.'
        }));
      };

      recognition.onend = () => {
        setState((prev) => ({ ...prev, isListening: false }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('[Jemmi Voice] Start failed:', err);
      setState((prev) => ({
        ...prev,
        isListening: false,
        error: err.message || 'Failed to start microphone.'
      }));
    }
  }, [language, onTranscript]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening: state.isListening ? stopListening : startListening
  };
}
