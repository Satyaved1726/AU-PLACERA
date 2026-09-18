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
import { isSecureContextEnvironment } from '../services/jemmiVoiceDiagnostic';

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
  const availableDevicesRef = useRef<Array<{ deviceId: string; label: string }>>([]);

  // Synchronize refs
  languageRef.current = language;
  onTranscriptRef.current = onTranscript;
  activeDeviceIdRef.current = state.selectedDeviceId;
  availableDevicesRef.current = state.availableDevices;

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
      availableDevicesRef.current = audioInputs;
      setState((prev) => ({ ...prev, availableDevices: audioInputs }));
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[Jemmi Voice] enumerateDevices error:', e);
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
      mediaStreamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {
          // ignore
        }
      });
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

  // Start listening with clean two-layer verification
  const startListening = useCallback(async () => {
    if (isListeningRef.current || isStartingRef.current) {
      stopListening();
      return;
    }

    isStartingRef.current = true;
    clearError();
    setState((prev) => ({ ...prev, phase: 'CHECKING_MICROPHONE' }));

    const isSecure = isSecureContextEnvironment();
    const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
    const SpeechRecognitionClass = getSpeechRecognitionConstructor();

    if (import.meta.env?.DEV) {
      console.log('[Jemmi Voice] Protocol:', typeof window !== 'undefined' ? window.location.protocol : '');
      console.log('[Jemmi Voice] Host:', typeof window !== 'undefined' ? window.location.host : '');
      console.log('[Jemmi Voice] Secure context:', isSecure);
      console.log('[Jemmi Voice] getUserMedia support:', hasMediaDevices);
      console.log('[Jemmi Voice] SpeechRecognition support:', Boolean(SpeechRecognitionClass));
    }

    // 0. Check Secure Context
    if (!isSecure) {
      isStartingRef.current = false;
      isListeningRef.current = false;
      setState((prev) => ({
        ...prev,
        isListening: false,
        phase: 'ERROR',
        error: {
          type: 'INSECURE_CONTEXT',
          message: 'Voice input requires a secure connection.',
          actionHint: 'Open AU Placera using HTTPS or localhost to enable microphone access.',
          canRetry: false
        }
      }));
      return;
    }

    // 1. Check Browser Permission state if query API is supported
    let permState: PermissionState | 'unknown' = 'unknown';
    if (navigator?.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as any });
        permState = perm.state;
      } catch {
        permState = 'unknown';
      }
    }

    if (import.meta.env?.DEV) {
      console.log('[Jemmi Voice] Permission:', permState);
    }

    // If permanently denied at browser site level
    if (permState === 'denied') {
      isStartingRef.current = false;
      isListeningRef.current = false;
      setState((prev) => ({
        ...prev,
        isListening: false,
        phase: 'ERROR',
        error: {
          type: 'PERMISSION_DENIED',
          message: '🎙 Microphone access is blocked for AU Placera.',
          actionHint: 'Allow microphone access for this site in your browser\'s site settings, then click Try Again.',
          canRetry: true
        }
      }));
      return;
    }

    // LAYER A: Physical Hardware & Browser Site Permission (getUserMedia)
    let stream: MediaStream | null = null;
    let micAccessGranted = false;

    if (hasMediaDevices) {
      try {
        setState((prev) => ({ ...prev, phase: 'REQUESTING_PERMISSION' }));

        // Check if saved device exists in current list to prevent OverconstrainedError
        const requestedDeviceId = activeDeviceIdRef.current;
        const deviceExists = requestedDeviceId && availableDevicesRef.current.some((d) => d.deviceId === requestedDeviceId);

        const constraints: MediaStreamConstraints = {
          audio: deviceExists ? { deviceId: { exact: requestedDeviceId } } : true
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        mediaStreamRef.current = stream;
        micAccessGranted = true;

        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] getUserMedia result: PASS (Access Granted)');
        }

        // Refresh devices now that permission is granted
        refreshDevices();

        // Setup audio level analyzer for live visual feedback
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          try {
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
          } catch {
            // non-critical audio analyzer error
          }
        }
      } catch (mediaErr: any) {
        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] getUserMedia result: FAIL', mediaErr?.name, mediaErr?.message);
        }

        isStartingRef.current = false;
        isListeningRef.current = false;
        stopAudioAnalysis();

        let errorDetails: JemmiVoiceErrorDetails;
        const errName = mediaErr?.name || '';

        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          errorDetails = {
            type: 'PERMISSION_DENIED',
            message: '🎙 Microphone access is blocked for AU Placera.',
            actionHint: 'Allow microphone access for this site in your browser\'s site settings, then click Try Again.',
            canRetry: true
          };
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          errorDetails = {
            type: 'DEVICE_NOT_FOUND',
            message: 'No microphone detected.',
            actionHint: 'Please connect a microphone or headset and try again.',
            canRetry: true
          };
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          errorDetails = {
            type: 'DEVICE_BUSY',
            message: 'The microphone is currently unavailable or being used by another application.',
            actionHint: 'Close other applications using your microphone (Zoom, Teams, Meet) and try again.',
            canRetry: true
          };
        } else if (errName === 'OverconstrainedError') {
          // Reset to default device
          activeDeviceIdRef.current = undefined;
          localStorage.removeItem('au_jemmi_mic_device');
          errorDetails = {
            type: 'GENERIC_ERROR',
            message: 'Jemmi couldn\'t use the selected microphone.',
            actionHint: 'Switched to default microphone. Click Try Again.',
            canRetry: true
          };
        } else if (errName === 'SecurityError') {
          errorDetails = {
            type: 'GENERIC_ERROR',
            message: 'Microphone access is blocked by the browser security policy.',
            actionHint: 'Please check your browser security settings or open via HTTPS.',
            canRetry: true
          };
        } else if (errName === 'AbortError') {
          errorDetails = {
            type: 'GENERIC_ERROR',
            message: 'Microphone access was interrupted. Please try again.',
            actionHint: 'Please try again.',
            canRetry: true
          };
        } else {
          errorDetails = {
            type: 'GENERIC_ERROR',
            message: 'Jemmi couldn\'t access the microphone. Please try again.',
            actionHint: 'Please check your microphone connection and permissions.',
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

    // LAYER B: Speech Recognition Service Availability
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
        // Language must be set BEFORE start()
        recognition.lang = locale;

        if (import.meta.env?.DEV) {
          console.log('[Jemmi Voice] Recognition start with locale:', locale);
        }

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
          if (import.meta.env?.DEV) {
            console.log('[Jemmi Voice] Recognition result:', combined);
          }

          setState((prev) => ({ ...prev, transcript: combined }));

          if (combined && onTranscriptRef.current) {
            onTranscriptRef.current(combined);
          }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (import.meta.env?.DEV) {
            console.log('[Jemmi Voice] Recognition error:', event.error);
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

          // If speech recognition cloud service failed, but getUserMedia already succeeded:
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            stopListening();
            setState((prev) => ({
              ...prev,
              isListening: false,
              phase: 'ERROR',
              error: {
                type: 'SPEECH_SERVICE_UNAVAILABLE',
                message: micAccessGranted
                  ? 'Your microphone is working, but browser speech recognition is unavailable.'
                  : 'Microphone access is blocked for this site or speech service is restricted.',
                actionHint: micAccessGranted
                  ? 'Your physical microphone is connected. You can type your query in the input box below.'
                  : 'Check browser site settings to allow microphone access.',
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
                message: 'Speech recognition network error.',
                actionHint: 'Please check your internet connection and try again.',
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
                message: 'Audio capture failed. Please check your microphone.',
                actionHint: 'Ensure your microphone is connected and not in use by another app.',
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
          if (import.meta.env?.DEV) {
            console.log('[Jemmi Voice] Recognition end');
          }
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
          console.warn('[Jemmi Voice] SpeechRecognition.start() exception:', speechErr);
        }
      }
    }

    // Fallback: If SpeechRecognition is completely unavailable in the browser but getUserMedia succeeded
    isStartingRef.current = false;
    isListeningRef.current = false;
    stopAudioAnalysis();

    setState((prev) => ({
      ...prev,
      isListening: false,
      phase: 'ERROR',
      error: {
        type: 'SPEECH_SERVICE_UNAVAILABLE',
        message: micAccessGranted
          ? 'Your microphone is working, but browser speech recognition isn\'t supported in this browser.'
          : 'Voice recognition is not supported in this browser.',
        actionHint: 'Use Google Chrome or Microsoft Edge for voice recognition, or type your query.',
        canRetry: false
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

  // Retry voice input flow cleanly
  const retry = useCallback(() => {
    stopListening();
    clearError();
    startListening();
  }, [clearError, startListening, stopListening]);

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
    retry,
    clearError,
    setDevice,
    refreshDevices
  };
}
