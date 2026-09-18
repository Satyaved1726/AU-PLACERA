// TypeScript definitions for Jemmi AI — AU Placera Assistant

export type JemmiLanguage = 'en' | 'te' | 'hi';

export type JemmiIntent =
  | 'PLATFORM_INFO'
  | 'OPPORTUNITIES'
  | 'OPPORTUNITY_DETAILS'
  | 'ANNOUNCEMENTS'
  | 'WHAT_DID_I_MISS'
  | 'REGISTRATIONS'
  | 'SAVED_ITEMS'
  | 'ELIGIBILITY'
  | 'POLLS'
  | 'PRIORITY_ALERTS'
  | 'MATERIALS'
  | 'TEAM_INFO'
  | 'GREETING'
  | 'HELP'
  | 'UNKNOWN';

export interface JemmiAction {
  label: string;
  url: string;
  icon?: string;
}

export interface JemmiMessage {
  id: string;
  sender: 'user' | 'jemmi';
  text: string;
  timestamp: string;
  intent?: JemmiIntent;
  actions?: JemmiAction[];
  language?: JemmiLanguage;
  isStreaming?: boolean;
}

export interface JemmiQuickAction {
  id: string;
  icon: string;
  label: Record<JemmiLanguage, string>;
  prompt: Record<JemmiLanguage, string>;
  intent: JemmiIntent;
}

export type JemmiVoicePhase =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'CHECKING_MICROPHONE'
  | 'LOADING_MODEL'
  | 'LISTENING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

export interface JemmiVoiceErrorDetails {
  type:
    | 'PERMISSION_DENIED'
    | 'DEVICE_NOT_FOUND'
    | 'DEVICE_BUSY'
    | 'SPEECH_SERVICE_UNAVAILABLE'
    | 'NO_SPEECH'
    | 'NETWORK_ERROR'
    | 'UNSUPPORTED_BROWSER'
    | 'GENERIC_ERROR';
  message: string;
  canRetry: boolean;
  actionHint?: string;
}

export interface JemmiVoiceState {
  isListening: boolean;
  phase: JemmiVoicePhase;
  transcript: string;
  isSupported: boolean;
  error: JemmiVoiceErrorDetails | null;
  audioLevel?: number;
  selectedDeviceId?: string;
  availableDevices: Array<{ deviceId: string; label: string }>;
}

export interface JemmiSpeechState {
  isSpeaking: boolean;
  currentMessageId: string | null;
  isSupported: boolean;
}

export interface StudentContextData {
  id: string;
  fullName: string;
  rollNumber?: string;
  branch?: string;
  section?: string;
  batch?: string;
  cgpa?: number | string;
  oiaEligible?: boolean;
}

export interface MicrophoneDiagnosticResult {
  speechRecognitionSupported: boolean;
  mediaDevicesSupported: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unknown';
  hardwareMicrophoneFound: boolean;
  deviceList: Array<{ deviceId: string; label: string }>;
  canRecordAudio: boolean;
  cloudSpeechServiceWorking: boolean | null;
  timestamp: string;
}
