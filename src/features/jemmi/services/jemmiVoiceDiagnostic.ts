// Diagnostic and Device Utility for Jemmi Voice System
import type { MicrophoneDiagnosticResult } from '../types/jemmi.types';

export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'Unknown Browser';
  const ua = navigator.userAgent;
  if ((navigator as any).brave && typeof (navigator as any).brave.isBrave === 'function') {
    return 'Brave';
  }
  if (/edg/i.test(ua)) return 'Microsoft Edge';
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
  if (/chrome|crios/i.test(ua)) return 'Google Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Mozilla Firefox';
  if (/safari/i.test(ua) && !/chrome|crios/i.test(ua)) return 'Apple Safari';
  return 'Browser';
}

export function isSecureContextEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost') || window.location.protocol === 'https:';
}

/**
 * Perform a full diagnostic of the browser's audio and speech capabilities.
 * Safe to call in development or from Voice Settings.
 */
export async function checkMicrophoneStatus(): Promise<MicrophoneDiagnosticResult> {
  const isSecure = isSecureContextEnvironment();
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';
  const browserName = detectBrowser();

  const result: MicrophoneDiagnosticResult = {
    mediaDevicesSupported: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices),
    getUserMediaSupported: typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    speechRecognitionSupported: false,
    permissionState: 'unknown',
    microphoneAvailable: false,
    deviceList: [],
    canRecordAudio: false,
    cloudSpeechServiceWorking: null,
    isSecureContext: isSecure,
    protocol,
    host,
    browserName,
    timestamp: new Date().toISOString()
  };

  if (typeof window === 'undefined') return result;

  // 1. Check SpeechRecognition API
  const win = window as any;
  result.speechRecognitionSupported = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);

  // 2. Check Permissions API for microphone
  if (navigator?.permissions?.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as any });
      result.permissionState = perm.state as any;
    } catch {
      result.permissionState = 'unknown';
    }
  }

  // 3. Enumerate Devices
  if (navigator?.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`
        }));
      result.deviceList = audioInputs;
      result.microphoneAvailable = audioInputs.length > 0;
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[Jemmi Diagnostic] enumerateDevices error:', e);
    }
  }

  // 4. Test Live Audio Capture via getUserMedia
  if (result.getUserMediaSupported) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      result.canRecordAudio = true;
      result.permissionState = 'granted';
      result.microphoneAvailable = true;

      // Refresh device labels with granted permissions
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d, index) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${index + 1}`
          }));
        result.deviceList = audioInputs;
      }

      // Stop tracks immediately after diagnostic test
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      result.canRecordAudio = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        result.permissionState = 'denied';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        result.microphoneAvailable = false;
      }
    }
  }

  return result;
}

// Alias for backward compatibility
export const checkMicrophoneAccess = checkMicrophoneStatus;
