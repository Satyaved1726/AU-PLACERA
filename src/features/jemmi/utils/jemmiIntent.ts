import type { JemmiIntent } from '../types/jemmi.types';

interface IntentRule {
  intent: JemmiIntent;
  patterns: RegExp[];
  keywords: string[];
}

const INTENT_RULES: IntentRule[] = [
  {
    intent: 'GREETING',
    patterns: [
      /^(hi|hello|hey|hola|namaste|namaskaram|namaskaramu|pranam|good\s+(morning|afternoon|evening)|wassup|yo)(\b|\s)/i,
      /^(నమస్కారం|నమస్తే|హలో|హాయ్)/i,
      /^(नमस्ते|नमस्कार|हेलो|हाय)/i
    ],
    keywords: ['hi', 'hello', 'hey', 'namaste', 'namaskaram', 'pranam', 'నమస్కారం', 'నమస్తే', 'नमस्ते']
  },
  {
    intent: 'PLATFORM_INFO',
    patterns: [
      /(what\s+is\s+au\s*placera|about\s+au\s*placera|au\s*placera\s+enti|au\s*placera\s+kya\s+hai|tell\s+me\s+about\s+au\s*placera|platform\s+info|how\s+does\s+au\s*placera\s+work)/i,
      /(ప్లాట్\s*ఫామ్\s*గురించి|au\s*ప్లేసెరా\s*ఏంటి|au\s*ప్లేసెరా\s*గురించి|ప్లాసెరా\s*అంటే\s*ఏంటి)/i,
      /(au\s*प्लेसेरा\s*क्या\s*है|प्लेसेरा\s*के\s*बारे\s*में)/i
    ],
    keywords: ['placera', 'about', 'platform', 'ప్లేసెరా', 'గురించి', 'प्लेसेरा', 'जानकारी']
  },
  {
    intent: 'WHAT_DID_I_MISS',
    patterns: [
      /(what\s+did\s+i\s+miss|did\s+i\s+miss\s+anything|recent\s+updates|latest\s+updates|new\s+posts|recent\s+announcements|what\'s\s+new|kya\s+(choot|chhoota|miss)\s+hua|nenu\s+miss\s+ayyinda|nenu\s+em\s+miss\s+ayyanu)/i,
      /(నేను\s+ఏమి\s+మిస్\s+అయ్యాను|ఇటీవలి\s+అప్‌డేట్లు|కొత్త\s+అంశాలు|తాజా\s+సమాచారం)/i,
      /(क्या\s+छूट\s+गया|हाल\s+के\s+अपडेट|नया\s+क्या\s+है)/i
    ],
    keywords: ['miss', 'missed', 'recent', 'latest', 'updates', 'మిస్', 'తాజా', 'छूट', 'नया']
  },
  {
    intent: 'PRIORITY_ALERTS',
    patterns: [
      /(priority|urgent|urgent\s+alerts|important\s+updates|priority\s+posts|urgent\s+notices|mukhyamaina|mukhya\s+soochana|zaroori\s+suchna|emergency\s+alerts)/i,
      /(ముఖ్యమైన\s+నోటీసులు|ప్రాధాన్యత|అత్యవసర)/i,
      /(प्राथमिकता|महत्वपूर्ण\s+सूचना|आवश्यक)/i
    ],
    keywords: ['priority', 'urgent', 'important', 'alert', 'mukhyamaina', 'zaroori', 'ప్రాధాన్యత', 'ముఖ్యమైన', 'प्राथमिकता', 'जरूरी']
  },
  {
    intent: 'REGISTRATIONS',
    patterns: [
      /(my\s+registrations|registered\s+drives|what\s+have\s+i\s+registered|applied\s+jobs|my\s+applications|registered\s+jobs|nenu\s+register\s+chesina|register\s+chesukunna|meri\s+registration|maine\s+kisme\s+apply\s+kiya)/i,
      /(నా\s+రిజిస్ట్రేషన్లు|నేను\s+దరఖాస్తు\s+చేసుకున్నవి|నా\s+దరఖాస్తులు)/i,
      /(मेरे\s+पंजीकरण|मेरे\s+आवेदन|मैंने\s+कहाँ\s+आवेदन\s+किया)/i
    ],
    keywords: ['registration', 'registrations', 'registered', 'applied', 'applications', 'రిజిస్ట్రేషన్', 'దరఖాస్తు', 'पंजीकरण', 'आवेदन']
  },
  {
    intent: 'ELIGIBILITY',
    patterns: [
      /(am\s+i\s+eligible|check\s+my\s+eligibility|eligibility\s+criteria|eligible\s+companies|eligible\s+jobs|nenu\s+eligible\s+aa|arhata|yogyata|kya\s+main\s+eligible\s+hoon|eligibility)/i,
      /(నా\s+అర్హత|నేను\s+అర్హుడినా|అర్హత\s+నియమాలు)/i,
      /(मेरी\s+योग्यता|क्या\s+मैं\s+योग्य\s+हूँ|पात्रता)/i
    ],
    keywords: ['eligible', 'eligibility', 'criteria', 'cgpa', 'arhata', 'yogyata', 'అర్హత', 'యోగ్యత', 'पात्रता', 'योग्य']
  },
  {
    intent: 'POLLS',
    patterns: [
      /(active\s+polls|polls|vote|surveys|voting|open\s+polls|poll\s+status|ennikalu|matdaan|opinion\s+poll)/i,
      /(పోల్స్|ఓటింగు|అభిప్రాయ\s+సేకరణ)/i,
      /(मतदान|सर्वेक्षण|पोल्स)/i
    ],
    keywords: ['poll', 'polls', 'vote', 'voting', 'survey', 'పోల్', 'ఓటు', 'मतदान', 'पोल']
  },
  {
    intent: 'SAVED_ITEMS',
    patterns: [
      /(saved\s+posts|saved\s+items|bookmarks|bookmarked\s+jobs|saved\s+opportunities|dachukunnavi|bachaya\s+hua|my\s+bookmarks)/i,
      /(సేవ్\s+చేసినవి|దాచుకున్నవి|బుక్‌మార్క్‌లు)/i,
      /(सहेजे\s+गए|बुकमार्क|सेव\s+किए)/i
    ],
    keywords: ['saved', 'bookmark', 'bookmarks', 'సేవ్', 'దాచుకున్న', 'सहेजे', 'बुकमार्क']
  },
  {
    intent: 'MATERIALS',
    patterns: [
      /(preparation\s+materials|study\s+materials|past\s+papers|resources|interview\s+prep|resume\s+templates|coding\s+questions|placement\s+materials|notes|syllabus)/i,
      /(స్టడీ\s+మెటీరియల్స్|తయారీ\s+పుస్తకాలు|నోట్స్|ప్రిపరేషన్)/i,
      /(अध्ययन\s+सामग्री|तैयारी|नोट्स|संसाधन)/i
    ],
    keywords: ['material', 'materials', 'study', 'prep', 'preparation', 'resume', 'papers', 'మెటీరియల్', 'నోట్స్', 'सामग्री', 'तैयारी']
  },
  {
    intent: 'TEAM_INFO',
    patterns: [
      /(placement\s+team|placement\s+officer|who\s+is\s+the\s+placement\s+officer|placement\s+coordinator|contact\s+coordinator|placement\s+cell|deans|directors)/i,
      /(ప్లేస్‌మెంట్\s+టీమ్|కోఆర్డినేటర్|ప్లేస్‌మెంట్\s+ఆఫీసర్)/i,
      /(प्लेसमेंट\s+टीम|समन्वयक|प्लेसमेंट\s+अधिकारी)/i
    ],
    keywords: ['team', 'officer', 'coordinator', 'cell', 'dean', 'director', 'కోఆర్డినేటర్', 'ఆఫీసర్', 'समन्वयक', 'अधिकारी']
  },
  {
    intent: 'OPPORTUNITIES',
    patterns: [
      /(what\s+opportunities|available\s+jobs|placement\s+drives|open\s+jobs|companies\s+hiring|hiring\s+drives|job\s+vacancies|avakasalu|naukri|placements|internships|internship\s+opportunities)/i,
      /(అవకాశాలు|ఉద్యోగాలు|కంపెనీలు|ప్లేస్‌మెంట్స్)/i,
      /(अवसर|नौकरियां|कंपनियां|प्लेसमेंट्स)/i
    ],
    keywords: ['opportunity', 'opportunities', 'job', 'jobs', 'placement', 'placements', 'internship', 'drives', 'hiring', 'companies', 'company', 'drive', 'vacancies', 'అవకాశాలు', 'ఉద్యోగాలు', 'नौकरी', 'अवसर']
  },
  {
    intent: 'HELP',
    patterns: [
      /(help|sahayam|madad|what\s+can\s+you\s+do|how\s+to\s+use|features|options|commands|guide\s+me)/i,
      /(సహాయం|ఎలా\s+ఉపయోగించాలి|మీరు\s+ఏమి\s+చేయగలరు)/i,
      /(मदद|सहायता|मार्गदर्शन|आप\s+क्या\s+कर\s+सकते\s+हैं)/i
    ],
    keywords: ['help', 'guide', 'assist', 'support', 'sahayam', 'madad', 'సహాయం', 'मदद', 'सहायता']
  }
];

/**
 * Classify the intent of user query
 */
export function classifyIntent(query: string): JemmiIntent {
  if (!query || !query.trim()) {
    return 'UNKNOWN';
  }

  const normalized = query.trim().toLowerCase();

  // 1. Direct pattern matching
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        return rule.intent;
      }
    }
  }

  // 2. Keyword density / occurrence scoring
  let bestIntent: JemmiIntent = 'UNKNOWN';
  let maxMatches = 0;

  for (const rule of INTENT_RULES) {
    let matches = 0;
    for (const kw of rule.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestIntent = rule.intent;
    }
  }

  return bestIntent;
}
