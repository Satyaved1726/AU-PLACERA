import { useState, useCallback, useEffect, useRef } from 'react';
import type { JemmiLanguage, JemmiMessage, JemmiQuickAction } from '../types/jemmi.types';
import { detectLanguage } from '../utils/jemmiLanguage';
import { classifyIntent } from '../utils/jemmiIntent';
import { generateJemmiResponse } from '../utils/jemmiResponses';
import { jemmiDataService } from '../services/jemmiDataService';
import type { JemmiLiveContext } from '../services/jemmiDataService';
import { useAuth } from '../../auth/useAuth';
import { useJemmiVoice } from './useJemmiVoice';
import { useJemmiSpeech } from './useJemmiSpeech';

export const JEMMI_QUICK_ACTIONS: JemmiQuickAction[] = [
  {
    id: 'opportunities',
    icon: '💼',
    label: {
      en: 'Opportunities',
      te: 'అవకాశాలు',
      hi: 'अवसर'
    },
    prompt: {
      en: 'What opportunities are available?',
      te: 'ప్రస్తుతం ఏ ఏ అవకాశాలు అందుబాటులో ఉన్నాయి?',
      hi: 'वर्तमान में कौन से अवसर उपलब्ध हैं?'
    },
    intent: 'OPPORTUNITIES'
  },
  {
    id: 'missed',
    icon: '⚡',
    label: {
      en: 'What did I miss?',
      te: 'నేను ఏమి మిస్ అయ్యాను?',
      hi: 'क्या छूट गया?'
    },
    prompt: {
      en: 'What did I miss recently?',
      te: 'ఇటీవల నేను మిస్ అయిన ముఖ్యమైన అప్‌డేట్‌లు ఏమిటి?',
      hi: 'हाल ही में क्या महत्वपूर्ण अपडेट छूट गया?'
    },
    intent: 'WHAT_DID_I_MISS'
  },
  {
    id: 'registrations',
    icon: '📝',
    label: {
      en: 'My Registrations',
      te: 'నా రిజిస్ట్రేషన్లు',
      hi: 'मेरे पंजीकरण'
    },
    prompt: {
      en: 'What have I registered for?',
      te: 'నేను ఏ ఏ డ్రైవ్‌లకు రిజిస్టర్ చేసుకున్నాను?',
      hi: 'मैंने किन ड्राइव्स के लिए पंजीकरण किया है?'
    },
    intent: 'REGISTRATIONS'
  },
  {
    id: 'eligibility',
    icon: '🎓',
    label: {
      en: 'Check Eligibility',
      te: 'నా అర్హత',
      hi: 'मेरी पात्रता'
    },
    prompt: {
      en: 'Check my profile and eligibility',
      te: 'నా ప్రొఫైల్ మరియు అర్హత వివరాలు ఏమిటి?',
      hi: 'मेरी प्रोफ़ाइल और पात्रता विवरण क्या हैं?'
    },
    intent: 'ELIGIBILITY'
  },
  {
    id: 'polls',
    icon: '📊',
    label: {
      en: 'Active Polls',
      te: 'యాక్టివ్ పోల్స్',
      hi: 'सक्रिय पोल'
    },
    prompt: {
      en: 'Are there any active polls?',
      te: 'ప్రస్తుతం ఏవైనా యాక్టివ్ పోల్స్ ఉన్నాయా?',
      hi: 'क्या कोई सक्रिय पोल चल रहा है?'
    },
    intent: 'POLLS'
  },
  {
    id: 'priority',
    icon: '⭐',
    label: {
      en: 'Priority Alerts',
      te: 'ప్రాధాన్యత అంశాలు',
      hi: 'प्राथमिकता अलर्ट'
    },
    prompt: {
      en: 'Are there any urgent priority alerts?',
      te: 'ప్రస్తుతం ఏవైనా అత్యవసర ప్రాధాన్యత నోటీసులు ఉన్నాయా?',
      hi: 'क्या कोई जरूरी प्राथमिकता नोटिस है?'
    },
    intent: 'PRIORITY_ALERTS'
  }
];

function getInitialMessage(language: JemmiLanguage, userName?: string): JemmiMessage {
  const name = userName || 'Student';
  if (language === 'te') {
    return {
      id: 'welcome-init',
      sender: 'jemmi',
      text: `నమస్కారం **${name}**! నేను **Jemmi**, మీ AU Placera అసిస్టెంట్‌ని. ప్లేస్‌మెంట్‌లు, అవకాశాలు, రిజిస్ట్రేషన్లు లేదా నోటీసుల గురించి ఏదైనా అడగండి!`,
      timestamp: new Date().toISOString(),
      intent: 'GREETING',
      actions: [
        { label: '🔥 అవకాశాలు', url: '/student/notice-board?tab=opportunities' },
        { label: '📝 నా రిజిస్ట్రేషన్లు', url: '/student/registered' }
      ],
      language
    };
  }
  if (language === 'hi') {
    return {
      id: 'welcome-init',
      sender: 'jemmi',
      text: `नमस्ते **${name}**! मैं **Jemmi** हूँ, आपका AU Placera सहायक। नए अवसर, पंजीकरण, नोटिस या पात्रता के बारे में मुझसे पूछें!`,
      timestamp: new Date().toISOString(),
      intent: 'GREETING',
      actions: [
        { label: '🔥 नए अवसर', url: '/student/notice-board?tab=opportunities' },
        { label: '📝 मेरे पंजीकरण', url: '/student/registered' }
      ],
      language
    };
  }
  return {
    id: 'welcome-init',
    sender: 'jemmi',
    text: `Hi **${name}**! I'm **Jemmi**, your AU Placera assistant. How can I help you today? Ask about opportunities, your registered drives, priority alerts, or active polls!`,
    timestamp: new Date().toISOString(),
    intent: 'GREETING',
    actions: [
      { label: '🔥 Opportunities', url: '/student/notice-board?tab=opportunities' },
      { label: '📝 My Registrations', url: '/student/registered' },
      { label: '📊 Active Polls', url: '/student/polls' }
    ],
    language
  };
}

export function useJemmi() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [language, setLanguageState] = useState<JemmiLanguage>('en');
  const [inputText, setInputText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Cached live context to respond instantaneously
  const contextRef = useRef<JemmiLiveContext | null>(null);

  // Pre-fetch live student context on mount / auth change
  useEffect(() => {
    if (!user?.id) return;
    jemmiDataService.getFullStudentContext(user.id).then((ctx) => {
      contextRef.current = ctx;
    });
  }, [user?.id]);

  const [messages, setMessages] = useState<JemmiMessage[]>(() => [
    getInitialMessage(language, user?.profile?.full_name)
  ]);

  // Sync initial welcome message when user profile loads if chat is pristine
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [getInitialMessage(language, user?.profile?.full_name)];
      }
      return prev;
    });
  }, [language, user?.profile?.full_name]);

  // Update language and customize greeting if chat is fresh
  const setLanguage = useCallback((newLang: JemmiLanguage) => {
    setLanguageState(newLang);
    setMessages((prev) => {
      if (prev.length <= 1) {
        return [getInitialMessage(newLang, user?.profile?.full_name)];
      }
      return prev;
    });
  }, [user?.profile?.full_name]);

  const handleVoiceTranscript = useCallback((transcript: string) => {
    setInputText(transcript);
  }, []);

  const voice = useJemmiVoice({
    language,
    onTranscript: handleVoiceTranscript
  });

  const speech = useJemmiSpeech();

  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend !== undefined ? textToSend : inputText).trim();
      if (!text || isProcessing) return;

      setInputText('');
      if (voice.isListening) {
        voice.stopListening();
      }

      // 1. Language detection from query
      const detectedLang = detectLanguage(text, language);
      if (detectedLang !== language) {
        setLanguageState(detectedLang);
      }

      // 2. Add user message
      const userMsgId = `user-${Date.now()}`;
      const userMessage: JemmiMessage = {
        id: userMsgId,
        sender: 'user',
        text,
        timestamp: new Date().toISOString(),
        language: detectedLang
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsProcessing(true);

      try {
        // 3. Fetch / refresh live context
        let currentContext = contextRef.current;
        if (!currentContext && user?.id) {
          currentContext = await jemmiDataService.getFullStudentContext(user.id);
          contextRef.current = currentContext;
        } else if (user?.id) {
          // Fresh background sync
          jemmiDataService.getFullStudentContext(user.id).then((ctx) => {
            contextRef.current = ctx;
          });
        }

        const safeContext: JemmiLiveContext = currentContext || {
          opportunities: [],
          priorityPosts: [],
          priorityPolls: [],
          recentPosts: [],
          activePolls: [],
          myRegistrations: [],
          savedPosts: []
        };

        // 4. Intent Classification
        const intent = classifyIntent(text);

        // 5. Generate Multilingual Response
        const response = generateJemmiResponse(intent, text, safeContext, detectedLang);

        // 6. Append Jemmi Response
        const jemmiMsgId = `jemmi-${Date.now()}`;
        const jemmiMessage: JemmiMessage = {
          id: jemmiMsgId,
          sender: 'jemmi',
          text: response.text,
          timestamp: new Date().toISOString(),
          intent: response.intent,
          actions: response.actions,
          language: response.language
        };

        setMessages((prev) => [...prev, jemmiMessage]);
      } catch (err) {
        console.error('[Jemmi] Message handling failed:', err);
        const errMsg: JemmiMessage = {
          id: `jemmi-${Date.now()}`,
          sender: 'jemmi',
          text: 'Sorry, I ran into an issue retrieving the latest updates. Please try again or check the Notice Board!',
          timestamp: new Date().toISOString(),
          intent: 'UNKNOWN',
          actions: [{ label: '📌 Notice Board', url: '/student/notice-board' }],
          language: detectedLang
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsProcessing(false);
      }
    },
    [inputText, isProcessing, language, user?.id, voice]
  );

  const clearMessages = useCallback(() => {
    setMessages([getInitialMessage(language, user?.profile?.full_name)]);
    speech.stop();
  }, [language, speech, user?.profile?.full_name]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        speech.stop();
        if (voice.isListening) voice.stopListening();
      }
      return !prev;
    });
  }, [speech, voice]);

  const openJemmi = useCallback(() => setIsOpen(true), []);
  const closeJemmi = useCallback(() => {
    speech.stop();
    if (voice.isListening) voice.stopListening();
    setIsOpen(false);
  }, [speech, voice]);

  return {
    isOpen,
    openJemmi,
    closeJemmi,
    toggleOpen,
    language,
    setLanguage,
    inputText,
    setInputText,
    isProcessing,
    messages,
    sendMessage,
    clearMessages,
    voice,
    speech,
    quickActions: JEMMI_QUICK_ACTIONS
  };
}
