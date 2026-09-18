// Diagnostic and Device Utility for Jemmi Voice System
import type { MicrophoneDiagnosticResult } from '../types/jemmi.types';

/**
 * Perform a full diagnostic of the browser's audio and speech capabilities.
 * Safe to call in development or from Voice Settings.
 */
export async function checkMicrophoneAccess(): Promise<MicrophoneDiagnosticResult> {
  const result: MicrophoneDiagnosticResult = {
    speechRecognitionSupported: false,
    mediaDevicesSupported: false,
    permissionState: 'unknown',
    hardwareMicrophoneFound: false,
    deviceList: [],
    canRecordAudio: false,
    cloudSpeechServiceWorking: null,
    timestamp: new Date().toISOString()
  };

  if (typeof window === 'undefined') return result;

  // 1. Check SpeechRecognition API
  const win = window as any;
  result.speechRecognitionSupported = Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);

  // 2. Check MediaDevices API
  result.mediaDevicesSupported = Boolean(navigator?.mediaDevices?.getUserMedia);

  // 3. Check Permissions API
  if (navigator?.permissions?.query) {
    try {
      const perm = await navigator.permissions.query({ name: 'microphone' as any });
      result.permissionState = perm.state as any;
    } catch {
      result.permissionState = 'unknown';
    }
  }

  // 4. Enumerate Devices
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
      result.hardwareMicrophoneFound = audioInputs.length > 0;
    } catch (e) {
      if (import.meta.env?.DEV) console.warn('[Jemmi Diagnostic] enumerateDevices error:', e);
    }
  }

  // 5. Test Live Audio Capture
  if (result.mediaDevicesSupported) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      result.canRecordAudio = true;
      result.permissionState = 'granted';

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
        result.hardwareMicrophoneFound = audioInputs.length > 0;
      }

      // Stop tracks immediately
      stream.getTracks().forEach((track) => track.stop());
    } catch (err: any) {
      result.canRecordAudio = false;
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        result.permissionState = 'denied';
      }
    }
  }

  return result;
}
