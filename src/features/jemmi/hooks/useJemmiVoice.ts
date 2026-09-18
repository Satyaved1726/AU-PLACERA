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
  const hadHardwareAccessRef = useRef<boolean>(false);

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

  // Start listening safely with two-stage permission validation
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
        error: "Voice input isn't supported in this browser. Please use Chrome/Edge or type your question."
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

    // Stage 1: Explicitly verify microphone hardware permission via getUserMedia
    hadHardwareAccessRef.current = false;
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        hadHardwareAccessRef.current = true;
        // Release hardware stream immediately so SpeechRecognition can bind to it
        stream.getTracks().forEach((track) => track.stop());
      } catch (mediaErr: any) {
        isStartingRef.current = false;
        isListeningRef.current = false;
        console.warn('[Jemmi Voice] getUserMedia failed:', mediaErr);

        let msg = 'Microphone access was denied. Please allow microphone permission in your browser & Windows settings.';
        if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          msg = 'No microphone detected on your device. Please plug in a microphone.';
        }
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: msg
        }));
        return;
      }
    }

    // Stage 2: Initialize SpeechRecognition
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
            if (hadHardwareAccessRef.current) {
              friendlyError =
                'Browser speech service is unavailable or blocked (common in Brave/Firefox). Please enable Google Speech in browser settings or type your question.';
            } else {
              friendlyError =
                'Microphone access was denied. Please allow microphone permission in browser settings and Windows Privacy settings.';
            }
            break;
          case 'no-speech':
            friendlyError = 'No speech detected. Tap the microphone and speak again.';
            break;
          case 'network':
            friendlyError =
              'Speech recognition service is temporarily unreachable. You can type your question instead.';
            break;
          case 'audio-capture':
            friendlyError = 'No microphone detected on your device.';
            break;
          case 'aborted':
            // Clean user stop — do not show error
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
        error: 'Could not start microphone. Please check your browser permissions.'
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
