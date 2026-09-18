// Resilient SpeechRecognition Hook for Jemmi AI — Direct Student Voice Experience
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

  // Start SpeechRecognition with resilient fallback
  const startListening = useCallback(async () => {
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
          message: "Voice input isn't supported in this browser. You can still type your question.",
          canRetry: false
        }
      }));
      return;
    }

    isStartingRef.current = true;

    // Optional: Pre-warm microphone permission context without blocking on errors
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      } catch (mediaErr: any) {
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] getUserMedia pre-check status:', mediaErr?.name);
        }
        // Do not abort on getUserMedia pre-check — continue directly to SpeechRecognition
      }
    }

    // Direct SpeechRecognition invocation
    try {
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

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = locale;

      if (import.meta.env?.DEV) {
        console.log('[Jemmi Voice] Starting SpeechRecognition with locale:', locale);
      }

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] SpeechRecognition started successfully');
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
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }

        const cleanTranscript = transcript.trim();
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Transcript update:', cleanTranscript);
        }

        if (cleanTranscript) {
          setState((prev) => ({ ...prev, transcript: cleanTranscript }));
          onTranscriptRef.current?.(cleanTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (import.meta.env?.DEV) {
          console.warn('[Jemmi Voice] SpeechRecognition error event:', event.error);
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
              message: 'No speech detected. Please tap the microphone and speak.',
              canRetry: true
            }
          }));
          return;
        }

        if (event.error === 'not-allowed') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'PERMISSION_DENIED',
              message: 'Microphone access is blocked in your browser settings. Please allow microphone access for AU Placera and try again.',
              canRetry: true
            }
          }));
          return;
        }

        if (event.error === 'service-not-allowed') {
          stopListening();
          setState((prev) => ({
            ...prev,
            phase: 'ERROR',
            error: {
              type: 'SPEECH_SERVICE_UNAVAILABLE',
              message: 'Browser speech recognition service is unavailable right now. You can type your question.',
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
              message: 'Your microphone could not be accessed. Please ensure no other application is using it.',
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
              message: 'Speech recognition network error. Please check your internet connection.',
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
            message: 'Voice recognition stopped. Please tap the microphone to try again.',
            canRetry: true
          }
        }));
      };

      recognition.onend = () => {
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] SpeechRecognition onend');
        }
        isStartingRef.current = false;
        isListeningRef.current = false;
        setState((prev) => ({ ...prev, isListening: false, phase: 'IDLE' }));
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      if (import.meta.env?.DEV) {
        console.error('[Jemmi Voice] exception on recognition.start():', err);
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
