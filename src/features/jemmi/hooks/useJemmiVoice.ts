// Multi-Layered Voice Recognition & Audio Stream Hook for Jemmi AI
import { useState, useEffect, useRef, useCallback } from 'react';
import type { JemmiLanguage, JemmiVoiceState, JemmiVoiceErrorDetails } from '../types/jemmi.types';
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
  const isSupported =
    typeof window !== 'undefined' &&
    (getSpeechRecognitionConstructor() !== null || Boolean(navigator?.mediaDevices?.getUserMedia));

  const [state, setState] = useState<JemmiVoiceState>({
    isListening: false,
    phase: 'IDLE',
    transcript: '',
    isSupported,
    error: null,
    audioLevel: 0,
    selectedDeviceId: localStorage.getItem('au_jemmi_mic_device') || undefined,
    availableDevices: []
  });

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isListeningRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const languageRef = useRef<JemmiLanguage>(language);
  const onTranscriptRef = useRef<(text: string) => void>(onTranscript);
  const activeDeviceIdRef = useRef<string | undefined>(state.selectedDeviceId);

  // Synchronize refs
  languageRef.current = language;
  onTranscriptRef.current = onTranscript;
  activeDeviceIdRef.current = state.selectedDeviceId;

  // Enumerate microphones
  const refreshDevices = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`
        }));
      setState((prev) => ({ ...prev, availableDevices: audioInputs }));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // Set active microphone device
  const setDevice = useCallback(
    (deviceId: string) => {
      localStorage.setItem('au_jemmi_mic_device', deviceId);
      activeDeviceIdRef.current = deviceId;
      setState((prev) => ({ ...prev, selectedDeviceId: deviceId }));
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, phase: 'IDLE' }));
  }, []);

  // Teardown audio analysis and stream tracks
  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setState((prev) => ({ ...prev, audioLevel: 0 }));
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

    stopAudioAnalysis();
    setState((prev) => ({ ...prev, isListening: false, phase: 'IDLE' }));
  }, [stopAudioAnalysis]);

  // Start listening with multi-layer fallback
  const startListening = useCallback(async () => {
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
      return;
    }

    isStartingRef.current = true;
    clearError();
    setState((prev) => ({ ...prev, phase: 'CHECKING_MICROPHONE' }));

    // Layer 1: Hardware Access & Audio Monitor Verification
    let stream: MediaStream | null = null;
    if (navigator?.mediaDevices?.getUserMedia) {
      try {
        setState((prev) => ({ ...prev, phase: 'REQUESTING_PERMISSION' }));
        const constraints: MediaStreamConstraints = {
          audio: activeDeviceIdRef.current ? { deviceId: { exact: activeDeviceIdRef.current } } : true
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;

        // Refresh device list now that permissions are confirmed
        refreshDevices();

        // Attach live audio level analyzer
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!isListeningRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const level = Math.min(100, Math.round((average / 128) * 100));
            setState((prev) => ({ ...prev, audioLevel: level }));
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          animationFrameRef.current = requestAnimationFrame(checkVolume);
        }
      } catch (mediaErr: any) {
        isStartingRef.current = false;
        isListeningRef.current = false;
        stopAudioAnalysis();

        let errorDetails: JemmiVoiceErrorDetails;
        if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
          errorDetails = {
            type: 'PERMISSION_DENIED',
            message: 'Microphone permission was denied.',
            actionHint: 'Click the padlock/site settings icon in your browser URL bar and allow Microphone access.',
            canRetry: true
          };
        } else if (mediaErr.name === 'NotFoundError' || mediaErr.name === 'DevicesNotFoundError') {
          errorDetails = {
            type: 'DEVICE_NOT_FOUND',
            message: 'No microphone was found.',
            actionHint: 'Please connect a microphone or headset and try again.',
            canRetry: true
          };
        } else if (mediaErr.name === 'NotReadableError' || mediaErr.name === 'TrackStartError') {
          errorDetails = {
            type: 'DEVICE_BUSY',
            message: 'Microphone is in use by another app.',
            actionHint: 'Close any active video/call apps (Zoom, Teams, Meet) and retry.',
            canRetry: true
          };
        } else {
          errorDetails = {
            type: 'GENERIC_ERROR',
            message: 'Could not access microphone.',
            actionHint: 'Please check your microphone permissions and try again.',
            canRetry: true
          };
        }

        setState((prev) => ({
          ...prev,
          isListening: false,
          phase: 'ERROR',
          error: errorDetails
        }));
        return;
      }
    }

    // Layer 2: Browser Speech Recognition
    const SpeechRecognitionClass = getSpeechRecognitionConstructor();

    if (SpeechRecognitionClass) {
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

        recognition.onstart = () => {
          isStartingRef.current = false;
          isListeningRef.current = true;
          setState((prev) => ({
            ...prev,
            isListening: true,
            phase: 'LISTENING',
            transcript: '',
            error: null
          }));
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
          setState((prev) => ({ ...prev, transcript: combined }));

          if (combined && onTranscriptRef.current) {
            onTranscriptRef.current(combined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (import.meta.env?.DEV) {
            console.warn('[Jemmi Voice] SpeechRecognition error:', event.error);
          }

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
                message: 'No speech was detected.',
                actionHint: 'Tap the microphone again and speak clearly into your mic.',
                canRetry: true
              }
            }));
            return;
          }

          // If speech recognition cloud service failed but hardware mic was verified
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'network') {
            setState((prev) => ({
              ...prev,
              isListening: true,
              phase: 'LISTENING',
              error: {
                type: 'SPEECH_SERVICE_UNAVAILABLE',
                message: 'Browser cloud speech service is restricted.',
                actionHint: 'Your microphone is working. You can speak or type your question.',
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
              message: 'Voice recognition stopped unexpectedly.',
              actionHint: 'Please tap the microphone and try again.',
              canRetry: true
            }
          }));
        };

        recognition.onend = () => {
          isStartingRef.current = false;
          isListeningRef.current = false;
          stopAudioAnalysis();
          setState((prev) => ({ ...prev, isListening: false, phase: 'IDLE' }));
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (speechErr) {
        if (import.meta.env?.DEV) {
          console.warn('[Jemmi Voice] SpeechRecognition.start() error:', speechErr);
        }
      }
    }

    // Fallback: If SpeechRecognition is completely unavailable but getUserMedia stream is active
    isStartingRef.current = false;
    isListeningRef.current = true;
    setState((prev) => ({
      ...prev,
      isListening: true,
      phase: 'LISTENING',
      error: {
        type: 'SPEECH_SERVICE_UNAVAILABLE',
        message: 'Browser Speech API unavailable. Microphone input active.',
        actionHint: 'Please speak into your microphone or type your question.',
        canRetry: true
      }
    }));
  }, [clearError, refreshDevices, stopAudioAnalysis, stopListening]);

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
      stopAudioAnalysis();
    };
  }, [stopAudioAnalysis]);

  return {
    ...state,
    startListening,
    stopListening,
    toggleListening,
    clearError,
    setDevice,
    refreshDevices
  };
}
