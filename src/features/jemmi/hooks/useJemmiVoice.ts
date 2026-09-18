// Direct Native SpeechRecognition Hook for Jemmi AI
import { useState, useEffect, useRef, useCallback } from 'react';
import type { JemmiLanguage, JemmiVoiceState } from '../types/jemmi.types';
import type {
  ISpeechRecognition,
  ISpeechRecognitionConstructor,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent
} from '../types/speech.types';
import { LANGUAGE_CONFIG } from '../utils/jemmiLanguage';

function getSpeechRecognitionConstructor(): ISpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

interface UseJemmiVoiceOptions {
  language: JemmiLanguage;
  onTranscript: (text: string) => void;
}

export function useJemmiVoice({ language, onTranscript }: UseJemmiVoiceOptions) {
  const SpeechRecognitionClass = getSpeechRecognitionConstructor();
  const isSupported = Boolean(SpeechRecognitionClass);

  const [state, setState] = useState<JemmiVoiceState>({
    isListening: false,
    phase: 'IDLE',
    transcript: '',
    isSupported,
    error: null,
    audioLevel: 0,
    availableDevices: []
  });

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const languageRef = useRef<JemmiLanguage>(language);
  const onTranscriptRef = useRef<(text: string) => void>(onTranscript);

  // Synchronize dynamic refs
  languageRef.current = language;
  onTranscriptRef.current = onTranscript;

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, phase: 'IDLE' }));
  }, []);

  // Stop listening safely
  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setState((prev) => ({ ...prev, isListening: false, phase: 'IDLE' }));
  }, []);

  // Language switch safety: Stop active recognition if language changes while running
  useEffect(() => {
    if (isListeningRef.current) {
      stopListening();
    }
  }, [language, stopListening]);

  // Direct SpeechRecognition start
  const startListening = useCallback(() => {
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
      return;
    }

    clearError();

    const RecognitionClass = getSpeechRecognitionConstructor();
    if (!RecognitionClass) {
      setState((prev) => ({
        ...prev,
        isListening: false,
        phase: 'ERROR',
        error: {
          type: 'UNSUPPORTED_BROWSER',
          message: 'Voice input is not supported in this browser.',
          canRetry: false
        }
      }));
      return;
    }

    try {
      isStartingRef.current = true;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }

      const recognition = new RecognitionClass();
      const currentLang = languageRef.current;
      const locale = LANGUAGE_CONFIG[currentLang]?.locale || 'en-IN';

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = locale;

      if (import.meta.env?.DEV) {
        console.log('[Jemmi Voice] Initializing recognition with language:', locale);
      }

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Recognition started successfully');
        }
        setState((prev) => ({
          ...prev,
          isListening: true,
          phase: 'LISTENING',
          transcript: '',
          error: null
        }));
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const cleanTranscript = transcript.trim();
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Captured transcript:', cleanTranscript);
        }

        if (cleanTranscript) {
          setState((prev) => ({ ...prev, transcript: cleanTranscript }));
          onTranscriptRef.current?.(cleanTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (import.meta.env?.DEV) {
          console.warn('[Jemmi Voice] Recognition error event:', event.error);
        }

        isStartingRef.current = false;
        isListeningRef.current = false;

        if (event.error === 'aborted') {
          stopListening();
          return;
        }

        if (event.error === 'no-speech') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'NO_SPEECH',
              message: "Didn't hear anything. Try again.",
              canRetry: true
            }
          }));
          return;
        }

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'PERMISSION_DENIED',
              message: 'Voice input could not start. Check your browser microphone access.',
              canRetry: true
            }
          }));
          return;
        }

        if (event.error === 'audio-capture') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'DEVICE_BUSY',
              message: 'No microphone was detected.',
              canRetry: true
            }
          }));
          return;
        }

        if (event.error === 'network') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'NETWORK_ERROR',
              message: 'Voice recognition is temporarily unavailable.',
              canRetry: true
            }
          }));
          return;
        }

        stopListening();
        setState((prev) => ({
          ...prev,
          phase: 'ERROR',
          error: {
            type: 'GENERIC_ERROR',
            message: 'Voice recognition stopped. Please try again.',
            canRetry: true
          }
        }));
      };

      recognition.onend = () => {
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Recognition ended');
        }
        isStartingRef.current = false;
        isListeningRef.current = false;
        setState((prev) => ({ ...prev, isListening: false, phase: 'IDLE' }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.error('[Jemmi Voice] Exception during recognition.start():', err);
      }
      isStartingRef.current = false;
      isListeningRef.current = false;
      stopListening();
    }
  }, [clearError, stopListening]);

  // Toggle listener
  const toggleListening = useCallback(() => {
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isStartingRef.current = false;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearError
  };
}
