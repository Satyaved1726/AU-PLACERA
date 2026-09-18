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

  // Start listening safely
  const startListening = useCallback(async () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost') {
      setState((prev) => ({
        ...prev,
        error: 'Voice recognition requires a secure HTTPS connection or localhost.'
      }));
      return;
    }

    const SpeechRecognitionClass = getSpeechRecognitionConstructor();

    if (!SpeechRecognitionClass) {
      setState((prev) => ({
        ...prev,
        isSupported: false,
        error: "Voice input isn't supported in this browser. Please use Chrome or Edge."
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

    // Optional warmup: request mic stream to prompt OS permission if not yet established
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        if (import.meta.env?.DEV) {
          console.warn('[Jemmi Voice] getUserMedia warmup error:', mediaErr);
        }
      }
    }

    // Initialize SpeechRecognition
    try {
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
              "Microphone access blocked by Windows or browser. In Windows Settings ➜ Privacy & Security ➜ Microphone, turn ON 'Let desktop apps access your microphone'.";
            break;
          case 'no-speech':
            friendlyError = 'No speech detected. Tap the microphone and speak again.';
            break;
          case 'network':
            friendlyError =
              'Speech recognition service is temporarily unreachable. You can type your question instead.';
            break;
          case 'audio-capture':
            friendlyError = 'No microphone detected on your device. Please plug in a microphone.';
            break;
          case 'aborted':
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
          "Microphone is blocked by Windows. Open Windows Settings ➜ Privacy & Security ➜ Microphone ➜ Turn ON 'Let desktop apps access your microphone'."
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
