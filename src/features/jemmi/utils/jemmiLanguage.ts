import type { JemmiLanguage } from '../types/jemmi.types';

// Regex ranges for scripts
const TELUGU_SCRIPT_REGEX = /[\u0C00-\u0C7F]/;
const DEVANAGARI_SCRIPT_REGEX = /[\u0900-\u097F]/;

// Romanized distinct keywords for Telugu detection
const ROMAN_TELUGU_WORDS = [
  'cheppu', 'cheppandi', 'unnayi', 'unnada', 'unayi', 'unada', 'emi', 'enti', 'ela', 'eppudu', 'ekkada',
  'chudali', 'chesanu', 'chesukovali', 'chesukovalante', 'ayindi', 'ayyindi', 'chesindi',
  'sahayam', 'namaskaram', 'bagunnara', 'meeru', 'nenu', 'naaku', 'maaku', 'memu', 'manaki',
  'avakasam', 'avakasalu', 'patralu', 'pariksha', 'vivaralu', 'telsuko', 'telusa', 'kanapadatla',
  'gurinchi', 'deniki', 'edaina', 'kotha', 'mukhyamaina'
];

// Romanized distinct keywords for Hindi detection
const ROMAN_HINDI_WORDS = [
  'batao', 'bataye', 'batana', 'hai', 'hain', 'kya', 'kaise', 'kab', 'kahan', 'kyu', 'kyun', 'kisko',
  'naukri', 'madad', 'sahayata', 'namaste', 'kaise ho', 'karna', 'karo', 'kiya',
  'dekho', 'chahiye', 'mera', 'meri', 'mere', 'kripya', 'aap', 'mujhe', 'hum',
  'paatra', 'yogyata', 'chhut', 'chhoota', 'gaya', 'gayi', 'gaye', 'soochana', 'parinam', 'koun', 'kaun'
];

/**
 * Detect language from user input string.
 * Priority: Native Unicode scripts -> Romanized keyword frequencies -> Fallback to preferred or 'en'
 */
export function detectLanguage(input: string, currentPreference?: JemmiLanguage): JemmiLanguage {
  if (!input || !input.trim()) {
    return currentPreference || 'en';
  }

  const text = input.trim();

  // 1. Native Unicode script detection
  if (TELUGU_SCRIPT_REGEX.test(text)) {
    return 'te';
  }
  if (DEVANAGARI_SCRIPT_REGEX.test(text)) {
    return 'hi';
  }

  // 2. Romanized transliteration keyword scoring
  const lowerWords = text.toLowerCase().split(/\s+/);
  let teluguScore = 0;
  let hindiScore = 0;

  for (const word of lowerWords) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (!cleaned) continue;
    if (ROMAN_TELUGU_WORDS.includes(cleaned)) {
      teluguScore += 1;
    }
    if (ROMAN_HINDI_WORDS.includes(cleaned)) {
      hindiScore += 1;
    }
  }

  if (teluguScore > 0 && teluguScore >= hindiScore) {
    return 'te';
  }
  if (hindiScore > 0 && hindiScore > teluguScore) {
    return 'hi';
  }

  // If no strong signal, stick to current preference if provided, otherwise default to English
  return currentPreference || 'en';
}

/**
 * Language labels and locale mapping for Speech Recognition and Synthesis
 */
export const LANGUAGE_CONFIG: Record<
  JemmiLanguage,
  {
    code: JemmiLanguage;
    label: string;
    nativeLabel: string;
    locale: string;
    speechVoicePrefixes: string[];
  }
> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    locale: 'en-IN',
    speechVoicePrefixes: ['en-IN', 'en-GB', 'en-US', 'en']
  },
  te: {
    code: 'te',
    label: 'Telugu',
    nativeLabel: 'తెలుగు',
    locale: 'te-IN',
    speechVoicePrefixes: ['te-IN', 'te']
  },
  hi: {
    code: 'hi',
    label: 'Hindi',
    nativeLabel: 'हिन्दी',
    locale: 'hi-IN',
    speechVoicePrefixes: ['hi-IN', 'hi']
  }
};
