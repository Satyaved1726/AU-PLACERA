// Robust Browser Speech Recognition Hook for Jemmi Voice Input
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
  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionConstructor() !== null;

  const [state, setState] = useState<JemmiVoiceState>({
    isListening: false,
    transcript: '',
    isSupported,
    error: null
  });

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const languageRef = useRef<JemmiLanguage>(language);
  const onTranscriptRef = useRef<(text: string) => void>(onTranscript);

  // Keep refs synchronized
  languageRef.current = language;
  onTranscriptRef.current = onTranscript;

  // Clear error helper
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Stop listening safely
  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore if already stopped
      }
    }
    setState((prev) => ({ ...prev, isListening: false }));
  }, []);

  // When language changes while actively listening, stop current session to allow clean restart
  useEffect(() => {
    if (isListeningRef.current) {
      stopListening();
    }
  }, [language, stopListening]);

  // Start listening safely with all error cases handled
  const startListening = useCallback(() => {
    const SpeechRecognitionClass = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionClass) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        error: "Voice input isn't supported in this browser. Please use a supported browser or type your question."
      }));
      return;
    }

    // Prevent double-start
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
      return;
    }

    isStartingRef.current = true;
    clearError();

    try {
      // Abort any lingering instance
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      const currentLang = languageRef.current;
      const locale = LANGUAGE_CONFIG[currentLang]?.locale || 'en-IN';

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = locale;

      if (import.meta.env?.DEV) {
        console.log(`[Jemmi Voice] Initializing recognition (lang: ${locale})`);
      }

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setState({
          isListening: true,
          transcript: '',
          isSupported: true,
          error: null
        });
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Recognition started');
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const combined = (finalTranscript || interimTranscript).trim();

        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Transcript chunk:', combined);
        }

        setState((prev) => ({ ...prev, transcript: combined }));

        if (combined && onTranscriptRef.current) {
          onTranscriptRef.current(combined);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        isStartingRef.current = false;
        isListeningRef.current = false;

        let friendlyError: string | null = null;

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            friendlyError =
              'Microphone access was denied. Please allow microphone permission in your browser settings.';
            break;
          case 'no-speech':
            friendlyError = 'No speech detected. Tap the microphone and try again.';
            break;
          case 'network':
            friendlyError =
              'Voice recognition is temporarily unavailable. You can type your question instead.';
            break;
          case 'audio-capture':
            friendlyError = 'No microphone detected on your device.';
            break;
          case 'aborted':
            // Clean user stop — do not show scary error
            friendlyError = null;
            break;
          default:
            friendlyError = 'Voice recognition encountered an issue. Please try again.';
            break;
        }

        if (import.meta.env?.DEV) {
          console.warn('[Jemmi Voice] Error:', event.error);
        }

        setState((prev) => ({
          ...prev,
          isListening: false,
          error: friendlyError
        }));
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isListeningRef.current = false;
        setState((prev) => ({ ...prev, isListening: false }));
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Recognition ended');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      isListeningRef.current = false;
      console.warn('[Jemmi Voice] Start failed:', err);
      setState((prev) => ({
        ...prev,
        isListening: false,
        error:
          err.name === 'NotAllowedError'
            ? 'Microphone access was denied. Please allow microphone permission in your browser settings.'
            : 'Could not start microphone. Please check your browser permissions.'
      }));
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

  // Unmount cleanup
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
