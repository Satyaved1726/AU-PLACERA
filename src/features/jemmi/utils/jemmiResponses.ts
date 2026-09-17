import type { JemmiIntent, JemmiLanguage, JemmiAction } from '../types/jemmi.types';
import type { JemmiLiveContext } from '../services/jemmiDataService';

export interface GeneratedResponse {
  text: string;
  intent: JemmiIntent;
  actions: JemmiAction[];
  language: JemmiLanguage;
}

export function generateJemmiResponse(
  intent: JemmiIntent,
  _query: string,
  context: JemmiLiveContext,
  language: JemmiLanguage
): GeneratedResponse {
  const studentName = context.student?.fullName || 'Student';

  switch (intent) {
    case 'GREETING': {
      if (language === 'te') {
        return {
          text: `నమస్కారం ${studentName}! నేను **Jemmi**, మీ AU Placera అసిస్టెంట్‌ని. ప్లేస్‌మెంట్ అవకాశాలు, రిజిస్ట్రేషన్లు, నోటీసులు లేదా అర్హతల గురించి నన్ను ఏదైనా అడగండి!`,
          intent,
          actions: [
            { label: '🔥 అవకాశాలు', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 నా రిజిస్ట్రేషన్లు', url: '/student/registered' }
          ],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `नमस्ते ${studentName}! मैं **Jemmi** हूँ, आपका AU Placera सहायक। प्लेसमेंट के अवसर, पंजीकरण, नोटिस या पात्रता के बारे में मुझसे कुछ भी पूछें!`,
          intent,
          actions: [
            { label: '🔥 नए अवसर', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 मेरे पंजीकरण', url: '/student/registered' }
          ],
          language
        };
      }
      return {
        text: `Hello **${studentName}**! I am **Jemmi**, your AU Placera assistant. How can I assist your placement journey today? Ask me about job opportunities, your registered drives, priority notices, or polls!`,
        intent,
        actions: [
          { label: '🔥 View Opportunities', url: '/student/notice-board?tab=opportunities' },
          { label: '📝 My Registrations', url: '/student/registered' },
          { label: '📊 Active Polls', url: '/student/polls' }
        ],
        language
      };
    }

    case 'PLATFORM_INFO': {
      if (language === 'te') {
        return {
          text: `**AU Placera** అనేది ఆంధ్ర విశ్వవిద్యాలయం ఇంజనీరింగ్ & ప్లేస్‌మెంట్ మేనేజ్‌మెంట్ పోర్టల్.\n\nఇక్కడ మీరు:\n- 🚀 క్యాంపస్ రిక్రూట్‌మెంట్ డ్రైవ్‌లు మరియు జాబ్ అప్‌డేట్‌లు చూడవచ్చు\n- 📝 ఒకే క్లిక్‌తో డ్రైవ్‌లకు రిజిస్టర్ చేసుకోవచ్చు\n- ⭐ ముఖ్యమైన నోటీసులు & ప్రాధాన్యత హెచ్చరికలు పొందవచ్చు\n- 📊 డిపార్ట్‌మెంట్ పోల్స్‌లో పాల్గొనవచ్చు\n- 📚 ప్రిపరేషన్ మెటీరియల్స్ డౌన్‌లోడ్ చేసుకోవచ్చు`,
          intent,
          actions: [
            { label: '📌 నోటీస్ బోర్డు', url: '/student/notice-board' },
            { label: '📚 ప్రిపరేషన్ మెటీరియల్స్', url: '/student/materials' }
          ],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `**AU Placera** आंध्र विश्वविद्यालय का आधिकारिक प्लेसमेंट और कैंपस ड्राइव प्रबंधन पोर्टल है।\n\nयहाँ आप:\n- 🚀 नए प्लेसमेंट और इंटर्नशिप के अवसर देख सकते हैं\n- 📝 सीधे ड्राइव के लिए रजिस्टर कर सकते हैं\n- ⭐ महत्वपूर्ण और प्राथमिकता सूचनाएं प्राप्त कर सकते हैं\n- 📊 सक्रिय पोल में भाग ले सकते हैं\n- 📚 अध्ययन सामग्री और पिछले प्रश्नपत्र देख सकते हैं`,
          intent,
          actions: [
            { label: '📌 नोटिस बोर्ड', url: '/student/notice-board' },
            { label: '📚 अध्ययन सामग्री', url: '/student/materials' }
          ],
          language
        };
      }
      return {
        text: `**AU Placera** is the official campus placement and recruitment portal for Andhra University.\n\nKey capabilities for students:\n- 🚀 **Placement Drives**: Browse curated full-time and internship opportunities\n- 📝 **1-Click Registration**: Register and track your drive status\n- ⭐ **Priority Alerts**: Stay updated with urgent deadlines and interview schedules\n- 📊 **Interactive Polls**: Participate in student opinions and surveys\n- 📚 **Preparation Hub**: Access past papers, syllabus, and study resources`,
        intent,
        actions: [
          { label: '📌 Notice Board', url: '/student/notice-board' },
          { label: '📚 Study Materials', url: '/student/materials' },
          { label: '🌐 International (OIA)', url: '/student/oia' }
        ],
        language
      };
    }

    case 'OPPORTUNITIES': {
      const opps = context.opportunities;
      if (opps.length === 0) {
        const noOppText = {
          en: `There are currently no active placement drives listed on AU Placera. Please check back later or monitor priority alerts!`,
          te: `ప్రస్తుతం AU Placeraలో కొత్త ప్లేస్‌మెంట్ డ్రైవ్‌లు ఏవీ లేవు. దయచేసి కాసేపటి తర్వాత మళ్ళీ చూడండి!`,
          hi: `वर्तमान में AU Placera पर कोई सक्रिय ड्राइव सूचीबद्ध नहीं है। कृपया बाद में दोबारा देखें!`
        };
        return {
          text: noOppText[language],
          intent,
          actions: [{ label: '📌 Notice Board', url: '/student/notice-board' }],
          language
        };
      }

      const listItems = opps
        .map((p, i) => {
          const title = p.opportunity_title || p.company_name || 'Placement Opportunity';
          const company = p.company_name ? `(${p.company_name})` : '';
          return `${i + 1}. **${title}** ${company}`;
        })
        .join('\n');

      if (language === 'te') {
        return {
          text: `ప్రస్తుతం అందుబాటులో ఉన్న **${opps.length}** ప్లేస్‌మెంట్ అవకాశాలు:\n\n${listItems}\n\nపూర్తి వివరాలు చూడటానికి లేదా దరఖాస్తు చేసుకోవడానికి క్రింది బటన్ నొక్కండి:`,
          intent,
          actions: [
            { label: '🚀 అవకాశాలు చూడండి', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 నా రిజిస్ట్రేషన్లు', url: '/student/registered' }
          ],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `वर्तमान में उपलब्ध **${opps.length}** प्लेसमेंट अवसर:\n\n${listItems}\n\nविवरण देखने या आवेदन करने के लिए नीचे दिए गए बटन पर क्लिक करें:`,
          intent,
          actions: [
            { label: '🚀 अवसर देखें', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 मेरे पंजीकरण', url: '/student/registered' }
          ],
          language
        };
      }

      return {
        text: `Here are **${opps.length}** active placement opportunities available in AU Placera right now:\n\n${listItems}\n\nClick below to review details, eligibility, and apply:`,
        intent,
        actions: [
          { label: '🚀 Explore Opportunities', url: '/student/notice-board?tab=opportunities' },
          { label: '📝 My Registrations', url: '/student/registered' }
        ],
        language
      };
    }

    case 'WHAT_DID_I_MISS': {
      const recents = context.recentPosts;
      const count = recents.length;
      if (count === 0) {
        const text = {
          en: `You are completely up to date! There are no recent notices posted in the last few days.`,
          te: `మీరు అన్ని అప్‌డేట్‌లను చూసేశారు! ఇటీవల కొత్త నోటీసులు ఏవీ రాలేదు.`,
          hi: `आप पूरी तरह से अपडेट हैं! पिछले कुछ दिनों में कोई नया नोटिस पोस्ट नहीं किया गया है।`
        };
        return {
          text: text[language],
          intent,
          actions: [{ label: '📌 Feed', url: '/student/notice-board' }],
          language
        };
      }

      const listItems = recents
        .map((p, i) => {
          const title = p.opportunity_title || p.company_name || (p.original_content ? p.original_content.slice(0, 45) + '...' : 'Notice');
          const typeBadge = p.post_type === 'opportunity' ? '💼 [Drive]' : '📢 [Notice]';
          return `${i + 1}. ${typeBadge} **${title}**`;
        })
        .join('\n');

      if (language === 'te') {
        return {
          text: `ఇటీవల పోస్ట్ చేయబడిన తాజా సమాచారం ఇక్కడ ఉంది:\n\n${listItems}\n\nమీరు ఏమైనా మిస్ అయితే నోటీస్ బోర్డును పరిశీలించండి:`,
          intent,
          actions: [
            { label: '📌 తాజా నోటీసులు', url: '/student/notice-board' },
            { label: '⭐ ప్రాధాన్యత పోస్ట్‌లు', url: '/student/notice-board?tab=priority' }
          ],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `यहाँ हाल ही में पोस्ट की गई महत्वपूर्ण सूचनाएं हैं:\n\n${listItems}\n\nपूरा विवरण देखने के लिए नोटिस बोर्ड पर जाएँ:`,
          intent,
          actions: [
            { label: '📌 हाल के नोटिस', url: '/student/notice-board' },
            { label: '⭐ प्राथमिकता नोटिस', url: '/student/notice-board?tab=priority' }
          ],
          language
        };
      }

      return {
        text: `Here is a quick summary of what you might have missed:\n\n${listItems}\n\nCheck the Notice Board to stay completely in sync:`,
        intent,
        actions: [
          { label: '📌 Unified Feed', url: '/student/notice-board' },
          { label: '⭐ Priority Alerts', url: '/student/notice-board?tab=priority' }
        ],
        language
      };
    }

    case 'REGISTRATIONS': {
      const regList = context.myRegistrations;
      if (regList.length === 0) {
        const noReg = {
          en: `You haven't registered for any placement drives yet. Check the opportunities tab to find drives matching your profile!`,
          te: `మీరు ఇంకా ఏ ప్లేస్‌మెంట్ డ్రైవ్‌కూ రిజిస్టర్ చేసుకోలేదు. అందుబాటులో ఉన్న అవకాశాలను చూసి దరఖాస్తు చేసుకోండి!`,
          hi: `आपने अभी तक किसी प्लेसमेंट ड्राइव के लिए पंजीकरण नहीं किया है। नए अवसर देखें और आवेदन करें!`
        };
        return {
          text: noReg[language],
          intent,
          actions: [{ label: '🚀 Explore Drives', url: '/student/notice-board?tab=opportunities' }],
          language
        };
      }

      const items = regList
        .map((r, i) => {
          const name = r.opportunity_title || r.company_name || (r.posts?.company_name) || (r.posts?.opportunity_title) || 'Placement Drive';
          return `${i + 1}. **${name}**`;
        })
        .join('\n');

      if (language === 'te') {
        return {
          text: `మీరు మొత్తం **${regList.length}** డ్రైవ్‌లకు రిజిస్టర్ చేసుకున్నారు:\n\n${items}\n\nరిజిస్ట్రేషన్ల వివరాలు మరియు స్థితిని మీ ప్రొఫైల్‌లో చూడండి:`,
          intent,
          actions: [{ label: '📝 నా రిజిస్ట్రేషన్లు', url: '/student/registered' }],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `आपने कुल **${regList.length}** प्लेसमेंट ड्राइव के लिए सफलतापूर्वक पंजीकरण किया है:\n\n${items}\n\nअपनी स्थिति देखने के लिए नीचे क्लिक करें:`,
          intent,
          actions: [{ label: '📝 मेरे पंजीकरण', url: '/student/registered' }],
          language
        };
      }

      return {
        text: `You are registered for **${regList.length}** placement drive(s):\n\n${items}\n\nVisit your registered drives page to track schedule and updates:`,
        intent,
        actions: [{ label: '📝 View My Registrations', url: '/student/registered' }],
        language
      };
    }

    case 'PRIORITY_ALERTS': {
      const pPosts = context.priorityPosts;
      const pPolls = context.priorityPolls;
      const total = pPosts.length + pPolls.length;

      if (total === 0) {
        const noPrio = {
          en: `There are no urgent or priority items active right now. Everything is running normally!`,
          te: `ప్రస్తుతం ఎటువంటి అత్యవసర లేదా ప్రాధాన్యత అలర్టులు లేవు.`,
          hi: `वर्तमान में कोई अत्यावश्यक या प्राथमिकता अलर्ट सक्रिय नहीं है।`
        };
        return {
          text: noPrio[language],
          intent,
          actions: [{ label: '📌 Notice Board', url: '/student/notice-board' }],
          language
        };
      }

      const postItems = pPosts.map((p) => `⭐ [Post] **${p.opportunity_title || p.company_name || 'Important Notice'}**`);
      const pollItems = pPolls.map((p) => `⭐ [Poll] **${p.question}**`);
      const combined = [...postItems, ...pollItems].map((item, idx) => `${idx + 1}. ${item}`).join('\n');

      if (language === 'te') {
        return {
          text: `ప్రస్తుతం **${total}** ప్రాధాన్యత అంశాలు యాక్టివ్‌గా ఉన్నాయి:\n\n${combined}\n\nముఖ్యమైన సమాచారం కోసం వెంటనే చూడండి:`,
          intent,
          actions: [{ label: '⭐ ప్రాధాన్యత బోర్డు', url: '/student/notice-board?tab=priority' }],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `वर्तमान में **${total}** प्राथमिकता और अत्यावश्यक सूचनाएं सक्रिय हैं:\n\n${combined}\n\nसमय पर कार्रवाई के लिए अभी देखें:`,
          intent,
          actions: [{ label: '⭐ प्राथमिकता नोटिस', url: '/student/notice-board?tab=priority' }],
          language
        };
      }

      return {
        text: `There are **${total}** active priority alerts requiring student attention:\n\n${combined}\n\nCheck them now to avoid missing crucial deadlines:`,
        intent,
        actions: [{ label: '⭐ Open Priority Tab', url: '/student/notice-board?tab=priority' }],
        language
      };
    }

    case 'POLLS': {
      const polls = context.activePolls;
      if (polls.length === 0) {
        const noPolls = {
          en: `There are no active polls right now. Check back soon for departmental voting and surveys!`,
          te: `ప్రస్తుతం ఎటువంటి యాక్టివ్ పోల్స్ లేవు.`,
          hi: `वर्तमान में कोई सक्रिय पोल उपलब्ध नहीं है।`
        };
        return {
          text: noPolls[language],
          intent,
          actions: [{ label: '📊 Polls', url: '/student/polls' }],
          language
        };
      }

      const pollList = polls.map((p, i) => `${i + 1}. **${p.question}**`).join('\n');

      if (language === 'te') {
        return {
          text: `ప్రస్తుతం **${polls.length}** పోల్స్ ఓటింగ్‌కు అందుబాటులో ఉన్నాయి:\n\n${pollList}\n\nమీ అభిప్రాయాన్ని తెలియజేయడానికి ఓటు వేయండి:`,
          intent,
          actions: [{ label: '📊 ఓటు వేయండి', url: '/student/polls' }],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `वर्तमान में **${polls.length}** सक्रिय पोल चल रहे हैं:\n\n${pollList}\n\nअपनी राय देने के लिए वोट करें:`,
          intent,
          actions: [{ label: '📊 वोट दें', url: '/student/polls' }],
          language
        };
      }

      return {
        text: `There are **${polls.length}** active campus poll(s) open for voting:\n\n${pollList}\n\nCast your vote below:`,
        intent,
        actions: [{ label: '📊 Vote in Polls', url: '/student/polls' }],
        language
      };
    }

    case 'ELIGIBILITY': {
      const student = context.student;
      const branch = student?.branch || 'Not Specified';
      const batch = student?.batch || 'Current';
      const cgpa = student?.cgpa ? `${student.cgpa}` : 'Not Specified';
      const oia = student?.oiaEligible ? 'Eligible' : 'Check with Coordinator';

      if (language === 'te') {
        return {
          text: `**మీ అర్హత ప్రొఫైల్ వివరాలు:**\n\n- 👤 **విద్యార్థి**: ${studentName}\n- 🏛 **బ్రాంచ్**: ${branch}\n- 🎓 **బ్యాచ్**: ${batch}\n- 📈 **CGPA**: ${cgpa}\n- 🌐 **OIA స్థితి**: ${oia}\n\nప్రతి కంపెనీకి అర్హత నిబంధనలు (మినిమం CGPA, అర్హత కలిగిన బ్రాంచ్‌లు) వేర్వేరుగా ఉంటాయి. కంపెనీ పోస్ట్ చూసి నిర్ధారించుకోండి.`,
          intent,
          actions: [
            { label: '🚀 డ్రైవ్‌ల అర్హతలు చూడండి', url: '/student/notice-board?tab=opportunities' },
            { label: '🌐 OIA పోర్టల్', url: '/student/oia' }
          ],
          language
        };
      }

      if (language === 'hi') {
        return {
          text: `**आपकी प्रोफ़ाइल पात्रता विवरण:**\n\n- 👤 **नाम**: ${studentName}\n- 🏛 **शाखा (Branch)**: ${branch}\n- 🎓 **बैच**: ${batch}\n- 📈 **CGPA**: ${cgpa}\n- 🌐 **OIA स्थिति**: ${oia}\n\nप्रत्येक कंपनी के अपने पात्रता मानदंड (न्यूनतम CGPA और शाखाएं) होते हैं। कृपया विशिष्ट विवरण के लिए अवसर पोस्ट देखें।`,
          intent,
          actions: [
            { label: '🚀 अवसर और पात्रता', url: '/student/notice-board?tab=opportunities' },
            { label: '🌐 OIA पोर्टल', url: '/student/oia' }
          ],
          language
        };
      }

      return {
        text: `**Your Profile & Eligibility Snapshot:**\n\n- 👤 **Student**: ${studentName}\n- 🏛 **Branch**: ${branch}\n- 🎓 **Batch**: ${batch}\n- 📈 **CGPA**: ${cgpa}\n- 🌐 **OIA Eligibility**: ${oia}\n\nEligibility criteria (minimum CGPA, allowed branches, standing backlogs) are defined per company. Click below to inspect active company criteria:`,
        intent,
        actions: [
          { label: '🚀 Browse Opportunities', url: '/student/notice-board?tab=opportunities' },
          { label: '🌐 International (OIA)', url: '/student/oia' }
        ],
        language
      };
    }

    case 'SAVED_ITEMS': {
      const saved = context.savedPosts;
      if (saved.length === 0) {
        const noSaved = {
          en: `You haven't bookmarked any posts yet. Click the bookmark icon on any post card to save it for quick reference!`,
          te: `మీరు ఇంకా ఏ పోస్ట్‌ను సేవ్ చేయలేదు. పోస్ట్ కార్డుపై ఉన్న బుక్‌మార్క్ చిహ్నాన్ని నొక్కడం ద్వారా సేవ్ చేసుకోవచ్చు!`,
          hi: `आपने अभी तक कोई पोस्ट सहेजा (bookmark) नहीं है। किसी भी पोस्ट को सहेजने के लिए बुकमार्क आइकन दबाएं!`
        };
        return {
          text: noSaved[language],
          intent,
          actions: [{ label: '📌 Notice Board', url: '/student/notice-board' }],
          language
        };
      }

      return {
        text:
          language === 'te'
            ? `మీరు **${saved.length}** పోస్ట్‌లను బుక్‌మార్క్ చేసుకున్నారు.`
            : language === 'hi'
            ? `आपने **${saved.length}** पोस्ट सहेजे हैं।`
            : `You have **${saved.length}** saved / bookmarked post(s).`,
        intent,
        actions: [{ label: '🔖 Saved Posts', url: '/student/saved' }],
        language
      };
    }

    case 'MATERIALS': {
      if (language === 'te') {
        return {
          text: `మీ ప్లేస్‌మెంట్ తయారీ కోసం గత ప్రశ్నపత్రాలు, సిలబస్ మరియు ఇంటర్వ్యూ స్టడీ మెటీరియల్స్ **Preparation Hub**లో అందుబాటులో ఉన్నాయి.`,
          intent,
          actions: [{ label: '📚 ప్రిపరేషన్ మెటీరియల్స్', url: '/student/materials' }],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `आपकी प्लेसमेंट तैयारी के लिए पिछले प्रश्न पत्र, पाठ्यक्रम और अध्ययन सामग्री **Preparation Hub** में उपलब्ध हैं।`,
          intent,
          actions: [{ label: '📚 अध्ययन सामग्री', url: '/student/materials' }],
          language
        };
      }
      return {
        text: `Access curated preparation resources, past question papers, coding guides, and interview materials in the **Preparation Hub**:`,
        intent,
        actions: [{ label: '📚 Study Materials', url: '/student/materials' }],
        language
      };
    }

    case 'TEAM_INFO': {
      if (language === 'te') {
        return {
          text: `ఆంధ్ర విశ్వవిద్యాలయం ప్లేస్‌మెంట్ టీమ్ మరియు మీ డిపార్ట్‌మెంట్ కోఆర్డినేటర్‌ల వివరాలను తెలుసుకోవడానికి ప్లేస్‌మెంట్ సెల్‌ను సంప్రదించండి లేదా అధికారిక ప్రకటనలను గమనించండి.`,
          intent,
          actions: [{ label: '📌 నోటీస్ బోర్డు', url: '/student/notice-board' }],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `आंध्र विश्वविद्यालय प्लेसमेंट सेल और विभागीय समन्वयकों के बारे में जानकारी के लिए नोटिस बोर्ड पर संपर्क विवरण देखें।`,
          intent,
          actions: [{ label: '📌 नोटिस बोर्ड', url: '/student/notice-board' }],
          language
        };
      }
      return {
        text: `AU Placement Cell coordinates campus recruitments across all engineering and university departments. For direct queries, reach out to your department coordinator or check official notices.`,
        intent,
        actions: [{ label: '📌 Notice Board', url: '/student/notice-board' }],
        language
      };
    }

    case 'HELP': {
      if (language === 'te') {
        return {
          text: `**నేను మీకు ఎలా సహాయం చేయగలను:**\n\n- 💼 *"ఏ ఏ కంపెనీలు వస్తున్నాయి?"* — తాజా అవకాశాలు\n- ⚡ *"నేను ఏమి మిస్ అయ్యాను?"* — ఇటీవల అప్‌డేట్‌లు\n- 📝 *"నా రిజిస్ట్రేషన్లు"* — మీరు దరఖాస్తు చేసినవి\n- 🎓 *"నా అర్హత ఏమిటి?"* — ప్రొఫైల్ వివరాలు\n- 📊 *"యాక్టివ్ పోల్స్"* — ఓటింగ్ వివరాలు\n- 🎙 లేదా మైక్ బటన్ నొక్కి వాయిస్‌తో మాట్లాడండి!`,
          intent,
          actions: [
            { label: '🚀 అవకాశాలు', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 రిజిస్ట్రేషన్లు', url: '/student/registered' }
          ],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `**मैं आपकी इस प्रकार सहायता कर सकता हूँ:**\n\n- 💼 *"कौन से अवसर उपलब्ध हैं?"* — नए प्लेसमेंट\n- ⚡ *"क्या छूट गया?"* — हाल के नोटिस\n- 📝 *"मेरे पंजीकरण"* — आपके आवेदन\n- 🎓 *"मेरी पात्रता"* — प्रोफ़ाइल विवरण\n- 📊 *"सक्रिय पोल"* — मतदान\n- 🎙 या माइक बटन दबाकर बोलें!`,
          intent,
          actions: [
            { label: '🚀 अवसर', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 पंजीकरण', url: '/student/registered' }
          ],
          language
        };
      }
      return {
        text: `**Here is how Jemmi can help you:**\n\n- 💼 *"What opportunities are available?"* — Browse active drives\n- ⚡ *"What did I miss?"* — Catch up on recent announcements\n- 📝 *"What have I registered for?"* — Check your drive applications\n- 🎓 *"Check my eligibility"* — Review your profile & requirements\n- 📊 *"Active polls"* — Participate in voting\n- ⭐ *"Priority alerts"* — View urgent notices\n- 🎙 Speak directly using the microphone button!`,
        intent,
        actions: [
          { label: '🚀 Opportunities', url: '/student/notice-board?tab=opportunities' },
          { label: '📝 My Registrations', url: '/student/registered' },
          { label: '📊 Polls', url: '/student/polls' }
        ],
        language
      };
    }

    case 'UNKNOWN':
    default: {
      if (language === 'te') {
        return {
          text: `నన్ను క్షమించండి, నాకు ఆ వివరాలు అర్థం కాలేదు. నేను AU Placera ప్లేస్‌మెంట్‌లు, అవకాశాలు, రిజిస్ట్రేషన్లు, అర్హతలు మరియు నోటీసుల గురించి సమాధానం ఇవ్వగలను. క్రింది ఎంపికలను ఎంచుకోండి:`,
          intent: 'UNKNOWN',
          actions: [
            { label: '🚀 అవకాశాలు', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 నా రిజిస్ట్రేషన్లు', url: '/student/registered' },
            { label: '❓ సహాయం', url: '/student/notice-board' }
          ],
          language
        };
      }
      if (language === 'hi') {
        return {
          text: `क्षमा करें, मैं इसे पूरी तरह समझ नहीं पाया। मैं AU Placera प्लेसमेंट, अवसर, पंजीकरण, पात्रता और नोटिस में आपकी सहायता कर सकता हूँ। कृपया इनमें से चुनें:`,
          intent: 'UNKNOWN',
          actions: [
            { label: '🚀 अवसर', url: '/student/notice-board?tab=opportunities' },
            { label: '📝 मेरे पंजीकरण', url: '/student/registered' },
            { label: '❓ सहायता', url: '/student/notice-board' }
          ],
          language
        };
      }
      return {
        text: `I'm specialized in AU Placera placements, opportunities, registrations, eligibility, and announcements. I didn't quite catch that. Try asking about open drives, your registrations, or active polls!`,
        intent: 'UNKNOWN',
        actions: [
          { label: '🚀 Explore Opportunities', url: '/student/notice-board?tab=opportunities' },
          { label: '📝 My Registrations', url: '/student/registered' },
          { label: '📊 Active Polls', url: '/student/polls' }
        ],
        language
      };
    }
  }
}
