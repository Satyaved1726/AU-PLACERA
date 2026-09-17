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

export interface JemmiVoiceState {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
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
