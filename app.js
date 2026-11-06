// ============================================================
// Hauptlogik: Englisch-LernApp mit Überspringen-Funktion (Skip)
// ============================================================

function initApp() {
  try {
  // --- STATE ---
  let currentCategory = 'all';
  let currentView = 'cards';
  let filteredVocab = (typeof VOCAB_DATA !== 'undefined' && Array.isArray(VOCAB_DATA)) ? [...VOCAB_DATA] : [];
  let currentCardIndex = 0;
  let isCardFlipped = false;

  let filteredSpeech = (typeof SPEECH_DATA !== 'undefined' && Array.isArray(SPEECH_DATA)) ? [...SPEECH_DATA] : [];
  let currentSpeechIndex = 0;

  let filteredCloze = (typeof CLOZE_DATA !== 'undefined' && Array.isArray(CLOZE_DATA)) ? [...CLOZE_DATA] : [];
  let currentClozeIndex = 0;

  // LocalStorage Persistenz (Fehlersicher & Korruptionsgeschützt)
  let masteredCards = [];
  try {
    const raw = localStorage.getItem('fiae_mastered_cards');
    if (raw) masteredCards = JSON.parse(raw);
    if (!Array.isArray(masteredCards)) masteredCards = [];
  } catch (e) {
    masteredCards = [];
  }

  let userXP = 0;
  try {
    userXP = parseInt(localStorage.getItem('fiae_user_xp') || '0', 10) || 0;
  } catch (e) {
    userXP = 0;
  }

  // --- SOUND EFFECTS VIA WEB AUDIO API (MOBILE SAFE SINGLETON) ---
  let sharedAudioCtx = null;
  function getAudioContext() {
    try {
      if (!sharedAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          sharedAudioCtx = new AudioContext();
        }
      }
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
      return sharedAudioCtx;
    } catch (e) {
      return null;
    }
  }

  // Unlock AudioContext on first user interaction on mobile
  document.addEventListener('touchstart', () => getAudioContext(), { once: true, passive: true });
  document.addEventListener('click', () => getAudioContext(), { once: true });

  function playSound(type) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (type === 'success') {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = freq;
          osc.connect(gain);
          gain.connect(ctx.destination);
          const startTime = ctx.currentTime + idx * 0.08;
          gain.gain.setValueAtTime(0.12, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
          osc.start(startTime);
          osc.stop(startTime + 0.26);
        });
      } else if (type === 'try-again') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 240;
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.29);
      }
    } catch (e) {}
  }

  // --- AUDIO & SPEECH SYNTHESIS (SMOOTH & NATURAL VOICE ENGINE) ---
  window._activeUtterance = null;

  const VOICE_PROFILES = {
    soft: {
      id: 'soft',
      name: '🌸 Natürlich, Lebendig & Menschlich',
      label: 'Natürlich (0.94x)',
      desc: 'Natürliches Konversationstempo (0.94x), geschmeidige Aussprache & adaptive Gender-Tonhöhe',
      rate: 0.94,
      pitch: 1.05,
      volume: 0.95
    },
    clear: {
      id: 'clear',
      name: '💼 Klar & Dynamisch',
      label: 'Klar (0.98x)',
      desc: 'Flottes, professionelles Sprechtempo (0.98x) für IT- & Businesstalk',
      rate: 0.98,
      pitch: 1.02,
      volume: 0.95
    },
    slow: {
      id: 'slow',
      name: '🐢 Ruhig & Bedacht',
      label: 'Ruhig (0.84x)',
      desc: 'Entspanntes Lerntempo (0.84x) für detailgenaues Hinhören',
      rate: 0.84,
      pitch: 1.04,
      volume: 0.90
    }
  };

  let activeVoiceProfileId = localStorage.getItem('englapp_voice_profile') || 'soft';

  function getActiveVoiceProfile() {
    return VOICE_PROFILES[activeVoiceProfileId] || VOICE_PROFILES.soft;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  // ============================================================
  // BUST PORTRAIT AVATARS (CHEST TO HEAD) & SPEAKING ANIMATION
  // ============================================================
  const FEMALE_BUST_SVG = `<svg class="avatar-bust-svg female" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="femBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#ec4899" stop-opacity="0.3"/>
      </linearGradient>
      <linearGradient id="femHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c2d12"/>
        <stop offset="100%" stop-color="#451a03"/>
      </linearGradient>
      <linearGradient id="femSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#fed7aa"/>
        <stop offset="100%" stop-color="#fdba74"/>
      </linearGradient>
      <linearGradient id="femCloth" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="url(#femBg)"/>
    <path d="M32 45 C32 20, 88 20, 88 45 C88 75, 84 95, 80 102 C75 92, 70 85, 60 85 C50 85, 45 92, 40 102 C36 95, 32 75, 32 45 Z" fill="url(#femHair)"/>
    <path d="M22 120 C22 94, 42 84, 60 84 C78 84, 98 94, 98 120 Z" fill="url(#femCloth)"/>
    <path d="M52 84 L60 100 L68 84 Z" fill="url(#femSkin)"/>
    <path d="M54 90 Q60 96 66 90" stroke="#fef08a" stroke-width="1.5" fill="none"/>
    <path d="M52 68 L52 86 L68 86 L68 68 Z" fill="url(#femSkin)"/>
    <path d="M52 74 Q60 80 68 74 L68 68 L52 68 Z" fill="#fb923c" opacity="0.25"/>
    <ellipse cx="60" cy="52" rx="19" ry="22" fill="url(#femSkin)"/>
    <circle cx="48" cy="58" r="4.5" fill="#f43f5e" opacity="0.25"/>
    <circle cx="72" cy="58" r="4.5" fill="#f43f5e" opacity="0.25"/>
    <path d="M47 43 Q52 40 56 44" stroke="#451a03" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M64 44 Q68 40 73 43" stroke="#451a03" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <ellipse cx="51.5" cy="49.5" rx="3" ry="3.5" fill="#1e293b"/>
    <circle cx="50.5" cy="48" r="1.2" fill="#ffffff"/>
    <ellipse cx="68.5" cy="49.5" rx="3" ry="3.5" fill="#1e293b"/>
    <circle cx="67.5" cy="48" r="1.2" fill="#ffffff"/>
    <path d="M60 51 L59 56 L62 56" stroke="#ea580c" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path class="avatar-mouth" d="M53 62 Q60 67 67 62" stroke="#e11d48" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M34 42 C36 24, 76 20, 86 35 C88 48, 86 64, 84 72 C80 50, 78 38, 62 38 C46 38, 40 46, 36 60 C34 54, 33 48, 34 42 Z" fill="url(#femHair)"/>
    <circle cx="41" cy="55" r="2" fill="#fef08a"/>
    <circle cx="79" cy="55" r="2" fill="#fef08a"/>
  </svg>`;

  const MALE_BUST_SVG = `<svg class="avatar-bust-svg male" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="maleBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.3"/>
      </linearGradient>
      <linearGradient id="maleHair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="maleSkin" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#ffedd5"/>
        <stop offset="100%" stop-color="#fed7aa"/>
      </linearGradient>
      <linearGradient id="maleShirt" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#0369a1"/>
      </linearGradient>
    </defs>
    <circle cx="60" cy="60" r="56" fill="url(#maleBg)"/>
    <path d="M18 120 C18 92, 40 82, 60 82 C80 82, 102 92, 102 120 Z" fill="url(#maleShirt)"/>
    <path d="M50 82 L60 96 L46 92 Z" fill="#ffffff"/>
    <path d="M70 82 L60 96 L74 92 Z" fill="#f1f5f9"/>
    <path d="M52 82 L60 94 L68 82 Z" fill="url(#maleSkin)"/>
    <path d="M50 66 L50 84 L70 84 L70 66 Z" fill="url(#maleSkin)"/>
    <path d="M50 72 Q60 78 70 72 L70 66 L50 66 Z" fill="#ea580c" opacity="0.2"/>
    <path d="M41 46 C41 34, 79 34, 79 46 C79 62, 75 73, 60 73 C45 73, 41 62, 41 46 Z" fill="url(#maleSkin)"/>
    <path d="M46 42 Q52 39 57 42" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M63 42 Q68 39 74 42" stroke="#1e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="51.5" cy="48.5" rx="3.2" ry="3.5" fill="#0f172a"/>
    <circle cx="50.5" cy="47" r="1.2" fill="#ffffff"/>
    <ellipse cx="68.5" cy="48.5" rx="3.2" ry="3.5" fill="#0f172a"/>
    <circle cx="67.5" cy="47" r="1.2" fill="#ffffff"/>
    <path d="M60 48 L59 55 L63 55" stroke="#c2410c" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <path class="avatar-mouth" d="M52 62 Q60 67 68 62" stroke="#991b1b" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <path d="M38 42 C38 24, 82 22, 82 38 C82 43, 80 47, 78 48 C76 34, 70 30, 58 30 C46 30, 42 36, 40 45 Z" fill="url(#maleHair)"/>
    <path d="M38 42 C40 30, 52 24, 62 25 C72 26, 80 30, 82 38 C80 30, 72 27, 60 27 C48 27, 40 32, 38 42 Z" fill="#475569"/>
    <ellipse cx="40" cy="50" rx="3" ry="5" fill="url(#maleSkin)"/>
    <ellipse cx="80" cy="50" rx="3" ry="5" fill="url(#maleSkin)"/>
  </svg>`;

  // ============================================================
  // AVATAR DEFINITIONS & SWITCHER (ISTVAN 3D, ROBOT, REAL, EMMA)
  // ============================================================
  const AVATAR_OPTIONS = {
    future_female: {
      id: 'future_female',
      name: 'Nova (Zukunfts-Tutorin)',
      tag: '🚀 Damen-Avatar',
      desc: 'Futuristische weibliche KI-Tutorin im Cyber-Suit mit leuchtenden Akzenten',
      src: 'avatar_future_female.jpg',
      type: 'image',
      gender: 'female'
    },
    future_male: {
      id: 'future_male',
      name: 'Leo (Zukunfts-Coach)',
      tag: '🚀 Zukunfts-Coach',
      desc: 'Futuristischer männlicher KI-Coach im High-Tech Smart-Suit',
      src: 'avatar_future_male.jpg',
      type: 'image',
      gender: 'male'
    },
    istvan_3d: {
      id: 'istvan_3d',
      name: 'Leo (3D Business)',
      tag: '👔 Business',
      desc: '3D Pixar-Style Coach im Business-Hemd mit Krawatte',
      src: 'avatar_istvan_3d.jpg',
      type: 'image',
      gender: 'male'
    },
    robot: {
      id: 'robot',
      name: 'Cyber-Bot (AI-Robot)',
      tag: '🤖 AI Robot',
      desc: 'Freundlicher KI-Roboter mit blau leuchtendem Visier',
      src: 'avatar_robot.jpg',
      type: 'image',
      gender: 'male'
    },
    istvan_real: {
      id: 'istvan_real',
      name: 'Leo (Foto-Coach)',
      tag: '📸 Foto',
      desc: 'Authentisches Porträtfoto von Istvan im Business-Look',
      src: 'avatar_istvan_real.jpg',
      type: 'image',
      gender: 'male'
    },
    emma: {
      id: 'emma',
      name: 'Emma (Klassisch)',
      tag: '👩 Klassisch',
      desc: 'Geduldige Vektor-Tutorin für Alltag & Smalltalk',
      type: 'svg',
      svg: FEMALE_BUST_SVG,
      gender: 'female'
    }
  };

  function getCurrentPartnerMeta() {
    const avatarId = getSelectedAvatarId();
    if (currentScenarioId === 'economics') {
      const grade = (typeof getEconomicsGrade === 'function') ? getEconomicsGrade() : '11';
      const gradeLabel = grade === '11' ? 'Kl. 11: Grundlagen & Globalisierung' : (grade === '12' ? 'Kl. 12: Freihandel, Zölle & Lieferketten' : 'Kl. 13: Makroökonomie & Abitur-Debatten');
      if (avatarId === 'future_female') {
        return {
          name: 'Nova (Wirtschafts-Dozentin)',
          role: `Rolle: Gymnasiale Fachlehrerin für Internationale Wirtschaft (${gradeLabel})`,
          isMale: false
        };
      }
      return {
        name: 'Leo (Wirtschafts-Coach)',
        role: `Rolle: Gymnasial-Dozent für Internationale Wirtschaft (${gradeLabel})`,
        isMale: true
      };
    }
    if (avatarId === 'future_female') {
      return {
        name: 'Nova (Futuristische KI-Tutorin)',
        role: 'Rolle: Deine futuristische Englisch-Tutorin & KI-Begleiterin',
        isMale: false
      };
    }
    if (avatarId === 'future_male') {
      return {
        name: 'Leo (Futuristischer KI-Coach)',
        role: 'Rolle: Dein zukunftsweisender Englisch- & FIAE-Coach',
        isMale: true
      };
    }
    if (avatarId === 'robot') {
      return {
        name: 'Cyber-Bot (AI Robot Tutor)',
        role: 'Rolle: Futuristischer KI-Roboter & Sprachassistent',
        isMale: true
      };
    }
    if (avatarId === 'istvan_3d' || avatarId === 'istvan_real') {
      return {
        name: 'Leo (Englisch & FIAE Coach)',
        role: 'Rolle: Dein persönlicher Englisch-Tutor & Entwickler-Partner',
        isMale: true
      };
    }
    const curScenario = (typeof DIALOG_SCENARIOS !== 'undefined' && DIALOG_SCENARIOS[currentScenarioId]) ? DIALOG_SCENARIOS[currentScenarioId] : null;
    return {
      name: curScenario ? curScenario.partnerName : 'Emma (Tutorin)',
      role: curScenario ? `Rolle: ${curScenario.partnerRole}` : 'Rolle: Geduldige Englisch-Tutorin für Alltag & Smalltalk',
      isMale: curScenario ? (curScenario.gender === 'male') : false
    };
  }

  function getSelectedAvatarId() {
    try {
      return localStorage.getItem('fiae_selected_avatar') || 'future_male';
    } catch (e) {
      return 'istvan_3d';
    }
  }

  function setSelectedAvatarId(avatarId) {
    try {
      localStorage.setItem('fiae_selected_avatar', avatarId);
    } catch (e) {}
  }
  function getEconomicsGrade() {
    try {
      return localStorage.getItem('fiae_economics_grade') || '11';
    } catch (e) {
      return '11';
    }
  }

  function setEconomicsGrade(grade) {
    try {
      localStorage.setItem('fiae_economics_grade', grade);
    } catch (e) {}
    updateEconomicsGradePills();
    updateHeaderPartnerCard();
    resetDialogScenario('economics');
    const label = grade === '11' ? '📘 Klasse 11 (Grundlagen)' : (grade === '12' ? '📙 Klasse 12 (Freihandel & Zölle)' : '🎓 Klasse 13 & Abitur');
    showToast(`🎓 Gymnasiale Stufe aktiv: ${label}`);
  }

  function updateEconomicsGradePills() {
    const curGrade = getEconomicsGrade();
    const pills = document.querySelectorAll('#economicsGradePills .grade-pill');
    pills.forEach(pill => {
      if (pill.dataset.grade === curGrade) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }


  function renderPartnerAvatarHtml(scenarioId) {
    const avatarId = getSelectedAvatarId();
    const opt = AVATAR_OPTIONS[avatarId] || AVATAR_OPTIONS.istvan_3d;
    if (opt.type === 'image') {
      return `<img class="avatar-bust-img" id="scenarioAvatarImg" src="${opt.src}" alt="${escapeHtml(opt.name)}">`;
    } else {
      return opt.svg || FEMALE_BUST_SVG;
    }
  }

  function getPartnerAvatarSvg(scenarioId) {
    const sc = (typeof DIALOG_SCENARIOS !== 'undefined' && DIALOG_SCENARIOS[scenarioId]) ? DIALOG_SCENARIOS[scenarioId] : null;
    const isFemale = sc ? (sc.gender === 'female') : (scenarioId === 'beginner' || scenarioId === 'standup' || scenarioId === 'architecture');
    return isFemale ? FEMALE_BUST_SVG : MALE_BUST_SVG;
  }

  function setAvatarSpeaking(isSpeaking) {
    const avatarEl = document.getElementById('scenarioAvatar');
    if (avatarEl) {
      avatarEl.classList.toggle('is-speaking', isSpeaking);
    }
  }

  // Mobile Voice Caching & Preloading (Try/Catch Geschützt)
  let cachedDeviceVoices = [];
  function updateVoicesCache() {
    if ('speechSynthesis' in window) {
      try {
        const v = window.speechSynthesis.getVoices() || [];
        if (v && v.length > 0) cachedDeviceVoices = v;
      } catch (e) {
        console.warn('Voice update error:', e);
      }
    }
  }

  if ('speechSynthesis' in window) {
    try {
      updateVoicesCache();
      window.speechSynthesis.onvoiceschanged = () => {
        updateVoicesCache();
        const modal = document.getElementById('voicePickerModal');
        const container = document.getElementById('voiceListContainer');
        if (modal && modal.classList.contains('active') && container && typeof renderVoiceListItems === 'function') {
          renderVoiceListItems(container);
        }
      };
    } catch (e) {
      console.warn('speechSynthesis registration error:', e);
    }
  }

  function scoreVoice(v, preferMale = false) {
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    let score = 0;

    // Nur englische Stimmen
    if (!lang.startsWith('en') && !name.includes('english')) return -2000;

    // 1. Online / Neural / Natural / Premium Stimmen (extrem menschlich, sanft und weich)
    if (name.includes('natural') || uri.includes('natural')) score += 800;
    if (name.includes('neural') || uri.includes('neural')) score += 750;
    if (name.includes('online') || uri.includes('online')) score += 650;
    if (name.includes('premium') || uri.includes('premium')) score += 600;
    if (name.includes('enhanced') || uri.includes('enhanced')) score += 550;

    // 2. Google High Quality & Network Stimmen (auf Android/Chrome ultra weich)
    if (name.includes('google us english') || name.includes('google uk english')) score += 420;
    if (uri.includes('network') || name.includes('network')) score += 450;
    if (name.includes('google')) score += 200;

    // 3. Sympathische weibliche vs männliche Stimmen nach Szenario
    if (preferMale) {
      if (name.includes('guy') || name.includes('male') || name.includes('christopher') || name.includes('eric') || name.includes('ryan') || name.includes('daniel') || name.includes('oliver') || name.includes('george') || name.includes('tom')) score += 450;
      if (name.includes('david')) score += 350;
      if (name.includes('female') || name.includes('jenny') || name.includes('aria') || name.includes('samantha') || name.includes('zira') || name.includes('hazel')) score -= 500;
    } else {
      // Weibliche Stimmen (Nova & Standard)
      if (name.includes('jenny')) score += 450;
      if (name.includes('aria')) score += 420;
      if (name.includes('samantha')) score += 380;
      if (name.includes('ava') || name.includes('zoe') || name.includes('stephanie')) score += 360;
      if (name.includes('female') || name.includes('karen') || name.includes('victoria') || name.includes('susan')) score += 320;
      if (name.includes('zira')) score += 280;
      if (name.includes('guy') || name.includes('male') || name.includes('david') || name.includes('christopher')) score -= 500;
    }

    // 4. US / UK Dialekt-Bonus
    if (lang === 'en-us') score += 35;
    if (lang === 'en-gb') score += 25;

    // 5. Harte, mechanische Roboter-Desktop-Stimmen mäßig gewichten, aber desktop-spezifisch nutzbar halten
    if (name.includes('desktop') || uri.includes('desktop')) score -= 150;
    if (name.includes('mark')) score -= 300;
    if (name.includes('hazel')) score -= 300;
    if (name.includes('espeak')) score -= 1000;

    return score;
  }

  function getBestEnglishVoice(preferMale = false) {
    if (!('speechSynthesis' in window)) return null;
    try {
      updateVoicesCache();
      const voices = (cachedDeviceVoices && cachedDeviceVoices.length > 0) ? cachedDeviceVoices : (window.speechSynthesis.getVoices() || []);
      if (!voices.length) return null;

      // 0. Prüfe benutzerdefinierte Stimme aus Einstellungen
      const customURI = localStorage.getItem('englapp_custom_voice_uri');
      if (customURI) {
        const found = voices.find(v => v.voiceURI === customURI || v.name === customURI);
        if (found) return found;
      }

      const enVoices = voices.filter(v => {
        const l = (v.lang || '').toLowerCase().replace('_', '-');
        const n = (v.name || '').toLowerCase();
        return l.startsWith('en') || n.includes('english');
      });
      if (!enVoices.length) return voices[0] || null;

      const sorted = [...enVoices].sort((a, b) => scoreVoice(b, preferMale) - scoreVoice(a, preferMale));
      return sorted[0] || enVoices[0];
    } catch (e) {
      return null;
    }
  }

  // Bereinigt den Text vor der Sprachausgabe: Entfernt Smileys, Emojis, Markdown & Sonderzeichen
  function cleanTextForSpeech(raw) {
    if (!raw) return '';
    let clean = raw
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/<[^>]+>/g, '');
    try {
      clean = clean.replace(/\p{Extended_Pictographic}/gu, '');
    } catch (e) {
      clean = clean.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
    }
    return clean
      .replace(/[\u2600-\u27BF\uFE00-\uFE0F]/g, '')
      .replace(/[👉👈👆👇🟢🔴🩺💡🎉⭐✔❌➔➜➤▶◀▲▼•–—]/g, ' ')
      .replace(/[\(\)\[\]\{\}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --- INTERAKTIVE SPRACHSTEUERUNG (ANHALTEN & WIEDER STARTEN) ---
  let activeSpeakingBtn = null;
  let activeSpeakingOriginalHTML = null;
  let lastSpokenText = '';

  function resetSpeakingBtn() {
    if (activeSpeakingBtn && activeSpeakingOriginalHTML !== null) {
      activeSpeakingBtn.innerHTML = activeSpeakingOriginalHTML;
      activeSpeakingBtn.classList.remove('is-speaking-btn');
      activeSpeakingBtn = null;
      activeSpeakingOriginalHTML = null;
    }
    const mainToggle = document.getElementById('btnToggleScenarioAudio');
    if (mainToggle) {
      mainToggle.innerHTML = '🔊 Vorlesen';
      mainToggle.classList.remove('is-speaking-btn');
    }
  }

  function stopSpeaking() {
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
    setAvatarSpeaking(false);
    resetSpeakingBtn();
  }

  function isSpeakingNow() {
    return !!(window.speechSynthesis && window.speechSynthesis.speaking);
  }

  function toggleSpeakEnglish(text, triggerBtn = null, customRate = null, onEndCallback = null) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }

    // Wenn gerade gesprochen wird:
    if (window.speechSynthesis.speaking) {
      const isSameBtn = (triggerBtn && triggerBtn === activeSpeakingBtn);
      stopSpeaking();
      showToast('⏹️ Sprachausgabe angehalten');
      if (isSameBtn || !triggerBtn) {
        return;
      }
    }

    speakEnglish(text, customRate, onEndCallback, triggerBtn);
  }

  function speakEnglish(text, customRate = null, onEndCallback = null, triggerBtn = null) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setAvatarSpeaking(false);
      resetSpeakingBtn();

      // WICHTIG: Text vollständig von Emojis, Smileys und Formatierungen befreien!
      const speechText = cleanTextForSpeech(text);
      if (!speechText) return;

      lastSpokenText = speechText;

      const profile = getActiveVoiceProfile();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'en-US';

      // Stimme mit Gender-Support für Dialogpartner & gewählten Avatar ermitteln
      const meta = getCurrentPartnerMeta();
      const preferMale = meta.isMale;
      const voice = getBestEnglishVoice(preferMale);

      // Basis-Tempo aus gewähltem Profil (oder customRate falls übergeben)
      // Standard: 0.94x - flüssig, natürlich und nicht mehr zu langsam!
      let targetRate = (typeof customRate === 'number' && customRate > 0) ? customRate : profile.rate;
      let targetPitch = profile.pitch;

      if (preferMale) {
        // MÄNNLICHE STIMME (Leo):
        // Nutzerwunsch: "man soll etwas tiefer und jugendlicher angehört werden"
        // -> Tonhöhe auf 0.92 (warmer, sonorer Bariton)
        // -> Tempo auf 0.95x - 0.96x (flüssig, aktiv, jugendlich und frisch)
        targetPitch = 0.92;
        targetRate = Math.max(targetRate, 0.95);
      } else {
        // WEIBLICHE STIMME (Nova):
        // Nutzerwunsch: "frau stimme soll etwas mehr weiblich sein"
        // -> Tonhöhe auf 1.16 (deutlich femininer, heller, weich und melodisch)
        // -> Tempo auf 0.93x - 0.94x (natürlich-fließendes, sympathisches Konversationstempo)
        targetPitch = 1.16;
        targetRate = Math.max(targetRate, 0.93);
      }

      if (voice) {
        utterance.voice = voice;
        const vName = (voice.name || '').toLowerCase();
        // Gezieltes Feintuning für Windows-SAPI Desktop-Stimmen (David & Zira):
        if (vName.includes('david')) {
          targetPitch = 0.91; // Sonor-jugendlich, kein metallisches Dröhnen
          targetRate = 0.95;  // Natürlich flüssiges Tempo
        } else if (vName.includes('zira')) {
          targetPitch = 1.18; // Spürbar femininer & weicher Klang
          targetRate = 0.94;  // Natürlich flüssiges Tempo
        }
      }

      utterance.rate = targetRate;
      utterance.pitch = targetPitch;
      utterance.volume = profile.volume || 0.95;

      setAvatarSpeaking(true);

      if (triggerBtn) {
        activeSpeakingBtn = triggerBtn;
        activeSpeakingOriginalHTML = triggerBtn.innerHTML;
        triggerBtn.innerHTML = '⏹️ Anhalten';
        triggerBtn.classList.add('is-speaking-btn');
      }

      const mainToggle = document.getElementById('btnToggleScenarioAudio');
      if (mainToggle) {
        mainToggle.innerHTML = '⏹️ Anhalten';
        mainToggle.classList.add('is-speaking-btn');
      }

      utterance.onend = () => {
        setAvatarSpeaking(false);
        resetSpeakingBtn();
        window._activeUtterance = null;
        if (typeof onEndCallback === 'function') {
          onEndCallback();
        }
      };

      utterance.onerror = (e) => {
        setAvatarSpeaking(false);
        resetSpeakingBtn();
        window._activeUtterance = null;
        console.warn('SpeechSynthesis error:', e);
      };

      // Referenz halten gegen Garbage-Collection Cutoffs
      window._activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('speakEnglish error:', err);
      resetSpeakingBtn();
      setAvatarSpeaking(false);
    }
  }

  function updateVoiceBadgeUI() {
    const profile = getActiveVoiceProfile();
    const labelEl = document.getElementById('currentVoiceLabel');
    if (labelEl) {
      labelEl.textContent = profile.label;
    }
  }

  function cycleVoiceProfile() {
    const order = ['soft', 'clear', 'slow'];
    const curIdx = order.indexOf(activeVoiceProfileId);
    const nextIdx = (curIdx + 1) % order.length;
    activeVoiceProfileId = order[nextIdx];
    localStorage.setItem('englapp_voice_profile', activeVoiceProfileId);
    updateVoiceBadgeUI();
    const p = getActiveVoiceProfile();
    showToast(`Stimme umgestellt auf: ${p.name}`);
    testCurrentVoice();
  }

  function testCurrentVoice() {
    const p = getActiveVoiceProfile();
    const btn = document.getElementById('btnVoiceTest');
    if (isSpeakingNow()) {
      stopSpeaking();
      showToast('⏹️ Sprachausgabe angehalten');
      return;
    }
    const meta = getCurrentPartnerMeta();
    const v = getBestEnglishVoice(meta.isMale);
    const vName = v ? v.name.split('-')[0].trim() : (meta.isMale ? 'Leo' : 'Nova');
    showToast(`🔊 ${meta.name} (${vName})`);
    if (meta.isMale) {
      toggleSpeakEnglish("Hello! I am Leo, your personal coach. My voice is now deeper, youthful, and speaking at a natural pace!", btn, p.rate);
    } else {
      toggleSpeakEnglish("Hello! I am Nova, your English tutor. My voice is now softer, more feminine, and speaking at a natural pace!", btn, p.rate);
    }
  }

  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // --- SPEECH RECOGNITION (SPRACHE PRÜFEN & KONTROLLIEREN) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;
  let activeMicTarget = 'speechTrainer';

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecording = true;
      if (activeMicTarget === 'speechTrainer') {
        document.getElementById('btnStartRecord').classList.add('recording');
        document.getElementById('audioWaves').classList.add('active');
        document.getElementById('micStatusText').textContent = '🔴 Ich höre zu... Bitte sprich jetzt!';
        document.getElementById('recognizedBox').innerHTML = '<em>Höre zu...</em>';
        document.getElementById('spokenResultContainer').style.display = 'block';
      } else if (activeMicTarget === 'flashcard') {
        const cardMicBtn = document.getElementById('cardMicCheckBtn');
        cardMicBtn.classList.add('recording');
        cardMicBtn.textContent = '🔴 Höre...';
        const cardFb = document.getElementById('cardPronounceFeedback');
        cardFb.className = 'card-pronounce-feedback listening';
        cardFb.textContent = '🔴 Höre zu... Sprich jetzt das englische Wort!';
      } else if (activeMicTarget === 'dialogChat') {
        const dialogMic = document.getElementById('btnDialogMic');
        if (dialogMic) dialogMic.classList.add('recording');
        const hint = document.getElementById('dialogInputHint');
        if (hint) hint.textContent = '🔴 Ich höre zu... Bitte sprich jetzt deinen Satz auf Englisch!';
      }
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      if (activeMicTarget === 'speechTrainer') {
        evaluateSentencePronunciation(spokenText);
      } else if (activeMicTarget === 'flashcard') {
        evaluateFlashcardPronunciation(spokenText);
      } else if (activeMicTarget === 'dialogChat') {
        handleDialogSpeechResult(spokenText);
      }
    };

    recognition.onerror = (event) => {
      isRecording = false;
      stopAllRecordingUI();
      if (event.error === 'not-allowed') {
        showToast('⚠️ Mikrofon-Zugriff im Browser blockiert.');
      } else {
        showToast('⚠️ Sprachaufnahme: ' + event.error);
      }
    };

    recognition.onend = () => {
      isRecording = false;
      stopAllRecordingUI();
    };
  }

  function stopAllRecordingUI() {
    const micBtn = document.getElementById('btnStartRecord');
    if (micBtn) micBtn.classList.remove('recording');
    const waves = document.getElementById('audioWaves');
    if (waves) waves.classList.remove('active');
    
    const cardMicBtn = document.getElementById('cardMicCheckBtn');
    if (cardMicBtn) {
      cardMicBtn.classList.remove('recording');
      cardMicBtn.textContent = '🎙️ Aussprache testen';
    }
    const dialogMic = document.getElementById('btnDialogMic');
    if (dialogMic) dialogMic.classList.remove('recording');
    const hint = document.getElementById('dialogInputHint');
    if (hint) hint.textContent = '✍️ Tippe deine Antwort ein oder tippe auf das 🎙️ Mikrofon, um direkt zu sprechen!';
  }

  // --- AUSSPRACHE-BEWERTUNG IM SPRECHTRAINER ---
  function evaluateSentencePronunciation(spoken) {
    const target = filteredSpeech[currentSpeechIndex].sentenceEn;
    const recognizedBox = document.getElementById('recognizedBox');
    const wordChipsContainer = document.getElementById('wordChipsContainer');
    const feedbackBox = document.getElementById('speechFeedback');
    
    recognizedBox.textContent = `"${spoken}"`;
    document.getElementById('spokenResultContainer').style.display = 'block';

    const cleanSpokenWords = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    const targetRawWords = target.split(/\s+/);
    const cleanTargetWords = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    wordChipsContainer.innerHTML = '';
    let matchCount = 0;

    cleanTargetWords.forEach((targetWord, idx) => {
      const originalWord = targetRawWords[idx] || targetWord;
      const isMatched = cleanSpokenWords.includes(targetWord) || 
        cleanSpokenWords.some(sw => Math.abs(sw.length - targetWord.length) <= 1 && (sw.includes(targetWord) || targetWord.includes(sw)));

      const chip = document.createElement('div');
      chip.className = `word-chip ${isMatched ? 'correct' : 'wrong'}`;
      chip.innerHTML = `
        ${isMatched ? '✅' : '❌'} ${originalWord}
        <span class="chip-speaker" title="Anhören">🔊</span>
      `;

      chip.addEventListener('click', () => {
        speakEnglish(originalWord, 0.8);
        showToast(`"${originalWord}" wird vorgespielt`);
      });

      wordChipsContainer.appendChild(chip);
      if (isMatched) matchCount++;
    });

    const scorePct = Math.round((matchCount / cleanTargetWords.length) * 100);

    feedbackBox.className = 'score-feedback';
    if (scorePct >= 80) {
      feedbackBox.classList.add('good');
      feedbackBox.innerHTML = `<strong>🏆 Ausgezeichnet! (${scorePct}%)</strong><br>Sehr deutlich gesprochen! (+20 XP)`;
      playSound('success');
      addXP(20);
      showToast('🎉 Perfekt ausgesprochen! +20 XP');
    } else if (scorePct >= 50) {
      feedbackBox.classList.add('good');
      feedbackBox.innerHTML = `<strong>👍 Schon gut verständlich! (${scorePct}%)</strong><br>Klicke auf die roten Wörter (❌) zum Wiederholen.`;
      playSound('success');
      addXP(10);
      showToast('👍 Guter Versuch! +10 XP');
    } else {
      feedbackBox.classList.add('try-again');
      feedbackBox.innerHTML = `<strong>🔄 Nochmal üben (${scorePct}%)</strong><br>Klicke auf die roten Wörter oder überspringe mit ⏭️ Skip.`;
      playSound('try-again');
      showToast('Tipp: Rote Wörter anklicken!');
    }
  }

  // --- AUSSPRACHE-BEWERTUNG DIREKT AUF DER KARTEIKARTE ---
  function evaluateFlashcardPronunciation(spoken) {
    const card = filteredVocab[currentCardIndex];
    const target = card.english;
    const cardFb = document.getElementById('cardPronounceFeedback');

    const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    const isMatch = cleanSpoken === cleanTarget || cleanSpoken.includes(cleanTarget) || cleanTarget.includes(cleanSpoken);

    if (isMatch) {
      cardFb.className = 'card-pronounce-feedback success';
      cardFb.innerHTML = `🎉 <strong>Perfekt!</strong> Du hast gesagt: <em>"${spoken}"</em> (+10 XP)`;
      playSound('success');
      addXP(10);
      showToast('🎉 Aussprache korrekt! +10 XP');

      if (!masteredCards.includes(card.id)) {
        masteredCards.push(card.id);
        localStorage.setItem('fiae_mastered_cards', JSON.stringify(masteredCards));
        updateStatsBadges();
      }
    } else {
      cardFb.className = 'card-pronounce-feedback wrong';
      cardFb.innerHTML = `⚠️ Gehört: <em>"${spoken}"</em><br>Tippe auf <strong>🔊 Anhören</strong> und probiere es nochmal!`;
      playSound('try-again');
      showToast('Aussprache noch nicht ganz exakt');
    }
  }

  // --- XP & REWARDS ---
  function addXP(points) {
    userXP += points;
    localStorage.setItem('fiae_user_xp', userXP);
    updateStatsBadges();
  }

  function updateStatsBadges() {
    document.getElementById('xpCount').textContent = userXP;
    document.getElementById('masteredCount').textContent = masteredCards.length;
    document.getElementById('totalVocabCount').textContent = VOCAB_DATA.length;
    
    const totalM = document.getElementById('statsTotalMastered');
    const totalX = document.getElementById('statsTotalXP');
    const pct = document.getElementById('statsPercentage');
    if (totalM) totalM.textContent = masteredCards.length;
    if (totalX) totalX.textContent = userXP;
    if (pct) {
      const percentage = Math.round((masteredCards.length / VOCAB_DATA.length) * 100);
      pct.textContent = percentage + '%';
    }
  }

  function showToast(msg) {
    const toast = document.getElementById('toastMsg');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2200);
  }

  // --- VIEW SWITCHING ---
  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    document.querySelectorAll('.bottom-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    const targetSection = document.getElementById(viewName + 'View');
    if (targetSection) {
      targetSection.classList.add('active');
    }

    if (viewName === 'glossary') {
      renderGlossary();
    } else if (viewName === 'dialog') {
      initDialogView();
    } else if (viewName === 'stories') {
      initStoriesView();
    } else if (viewName === 'grammar') {
      initGrammarView();
    }
  }

  document.querySelectorAll('.nav-tab-btn, .bottom-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // --- CATEGORY FILTERING ---
  function setCategory(catId) {
    currentCategory = catId;
    document.querySelectorAll('.cat-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.category === catId);
    });

    if (catId === 'all') {
      filteredVocab = [...VOCAB_DATA];
      filteredSpeech = [...SPEECH_DATA];
      filteredCloze = [...CLOZE_DATA];
    } else {
      filteredVocab = VOCAB_DATA.filter(v => v.category === catId);
      filteredSpeech = SPEECH_DATA.filter(s => s.category === catId);
      filteredCloze = CLOZE_DATA.filter(c => c.category === catId);
      if (filteredSpeech.length === 0) filteredSpeech = [...SPEECH_DATA];
      if (filteredCloze.length === 0) filteredCloze = [...CLOZE_DATA];
    }

    currentCardIndex = 0;
    currentSpeechIndex = 0;
    currentClozeIndex = 0;

    renderCurrentCard();
    renderCurrentSpeech();
    renderCurrentCloze();
    renderGlossary();
  }

  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => setCategory(btn.dataset.category));
  });

  // --- FLASHCARD LOGIC ---
  const flashcardEl = document.getElementById('mainFlashcard');

  function renderCurrentCard() {
    if (filteredVocab.length === 0) return;
    const card = filteredVocab[currentCardIndex];
    isCardFlipped = false;
    flashcardEl.classList.remove('flipped');

    document.getElementById('cardCategoryTag').textContent = card.categoryName;
    document.getElementById('cardIndexIndicator').textContent = `${currentCardIndex + 1} / ${filteredVocab.length}`;
    document.getElementById('cardVisualIcon').innerHTML = card.svg;
    document.getElementById('cardEnglish').textContent = card.english;
    document.getElementById('cardPhonetic').textContent = card.phonetic;

    const cardFb = document.getElementById('cardPronounceFeedback');
    cardFb.style.display = 'none';
    cardFb.className = 'card-pronounce-feedback';

    // Back
    document.getElementById('cardGerman').textContent = card.german;
    document.getElementById('cardDefinition').textContent = card.definition;
    document.getElementById('cardExampleEn').textContent = card.exampleEn;
    document.getElementById('cardExampleDe').textContent = card.exampleDe;

    const pct = ((currentCardIndex + 1) / filteredVocab.length) * 100;
    document.getElementById('cardProgressBar').style.width = pct + '%';

    document.getElementById('btnPrevCard').disabled = (currentCardIndex === 0 && filteredVocab.length <= 1);
    document.getElementById('btnNextCard').disabled = false;

    const isMastered = masteredCards.includes(card.id);
    const masterBtn = document.getElementById('btnMarkMastered');
    if (isMastered) {
      masterBtn.textContent = '⭐ Bereits gemeistert';
      masterBtn.style.opacity = '0.7';
    } else {
      masterBtn.textContent = '✅ Gekonnt (+10 XP)';
      masterBtn.style.opacity = '1';
    }
  }

  function flipCard() {
    isCardFlipped = !isCardFlipped;
    flashcardEl.classList.toggle('flipped', isCardFlipped);
  }

  flashcardEl.addEventListener('click', (e) => {
    if (e.target.closest('#cardSpeakBtn') || e.target.closest('#cardMicCheckBtn')) return;
    flipCard();
  });

  document.getElementById('btnFlipCard').addEventListener('click', flipCard);

  document.getElementById('cardSpeakBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const btn = e.currentTarget;
    const card = filteredVocab[currentCardIndex];
    toggleSpeakEnglish(card.english, btn, 0.82);
  });

  // Direct pronunciation check on Flashcard
  document.getElementById('cardMicCheckBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!recognition) {
      const card = filteredVocab[currentCardIndex];
      const userSpoke = prompt(`Spracherkennung wird vom Browser eingeschränkt.\nBitte sprich das Wort laut aus:\n"${card.english}"\n\nDrücke danach OK zur Bestätigung:`);
      if (userSpoke !== null) {
        evaluateFlashcardPronunciation(card.english);
      }
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      activeMicTarget = 'flashcard';
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  });

  // PREV CARD (Circular)
  document.getElementById('btnPrevCard').addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
    } else {
      currentCardIndex = filteredVocab.length - 1; // loop back
    }
    renderCurrentCard();
  });

  // NEXT CARD (Circular)
  document.getElementById('btnNextCard').addEventListener('click', () => {
    if (currentCardIndex < filteredVocab.length - 1) {
      currentCardIndex++;
    } else {
      currentCardIndex = 0; // loop back
    }
    renderCurrentCard();
  });

  // SKIP CARD (Überspringen)
  document.getElementById('btnSkipCard').addEventListener('click', () => {
    currentCardIndex = (currentCardIndex + 1) % filteredVocab.length;
    renderCurrentCard();
    showToast('Karte übersprungen ⏭️');
  });

  document.getElementById('btnMarkMastered').addEventListener('click', () => {
    const card = filteredVocab[currentCardIndex];
    if (!masteredCards.includes(card.id)) {
      masteredCards.push(card.id);
      localStorage.setItem('fiae_mastered_cards', JSON.stringify(masteredCards));
      addXP(10);
      playSound('success');
      showToast('🎉 Vokabel gemeistert! +10 XP');
    } else {
      showToast('Bereits gemeistert!');
    }
    // Auto advance to next card
    currentCardIndex = (currentCardIndex + 1) % filteredVocab.length;
    renderCurrentCard();
    updateStatsBadges();
  });

  document.getElementById('btnMarkRepeat').addEventListener('click', () => {
    const card = filteredVocab[currentCardIndex];
    masteredCards = masteredCards.filter(id => id !== card.id);
    localStorage.setItem('fiae_mastered_cards', JSON.stringify(masteredCards));
    showToast('Zur Wiederholung vorgemerkt');
    currentCardIndex = (currentCardIndex + 1) % filteredVocab.length;
    renderCurrentCard();
    updateStatsBadges();
  });

  // --- SPEECH TRAINER & COACH LOGIC WITH SKIP ---
  function renderCurrentSpeech() {
    if (filteredSpeech.length === 0) return;
    const sp = filteredSpeech[currentSpeechIndex];

    document.getElementById('speechCatBadge').textContent = `${sp.categoryName} • Aussprache-Coach`;
    document.getElementById('speechCounterBadge').textContent = `${currentSpeechIndex + 1} / ${filteredSpeech.length}`;
    document.getElementById('speechTargetSentence').textContent = sp.sentenceEn;
    document.getElementById('speechTranslation').textContent = sp.sentenceDe;
    document.getElementById('speechPhonetic').textContent = sp.phonetic;

    document.getElementById('micStatusText').textContent = 'Klicke auf das Mikrofon und sprich nach – oder tippe auf ⏭️ Überspringen!';
    document.getElementById('spokenResultContainer').style.display = 'none';
    document.getElementById('speechFeedback').className = 'score-feedback';
    document.getElementById('speechFeedback').style.display = 'none';
  }

  document.getElementById('btnPlaySpeechAudio').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const sp = filteredSpeech[currentSpeechIndex];
    const rate = parseFloat(document.getElementById('voiceSpeedSelect').value || '0.78');
    toggleSpeakEnglish(sp.sentenceEn, btn, rate);
  });

  document.getElementById('btnStartRecord').addEventListener('click', () => {
    if (!recognition) {
      const target = filteredSpeech[currentSpeechIndex].sentenceEn;
      const userSpoke = prompt(`Spracherkennung wird vom Browser eingeschränkt.\nBitte sprich den englischen Satz laut aus:\n"${target}"\n\nDrücke danach OK zur Auswertung:`);
      if (userSpoke !== null) {
        evaluateSentencePronunciation(target);
      }
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
      activeMicTarget = 'speechTrainer';
      try {
        recognition.start();
      } catch (err) {
        console.error('Speech recognition error:', err);
      }
    }
  });

  document.getElementById('btnPrevSpeech').addEventListener('click', () => {
    if (currentSpeechIndex > 0) {
      currentSpeechIndex--;
    } else {
      currentSpeechIndex = filteredSpeech.length - 1;
    }
    renderCurrentSpeech();
  });

  document.getElementById('btnNextSpeech').addEventListener('click', () => {
    if (currentSpeechIndex < filteredSpeech.length - 1) {
      currentSpeechIndex++;
    } else {
      currentSpeechIndex = 0;
    }
    renderCurrentSpeech();
  });

  // SKIP SPEECH (Überspringen)
  document.getElementById('btnSkipSpeech').addEventListener('click', () => {
    if (isRecording && recognition) recognition.stop();
    currentSpeechIndex = (currentSpeechIndex + 1) % filteredSpeech.length;
    renderCurrentSpeech();
    showToast('Satz übersprungen ⏭️');
  });

  // Custom Sentence Test
  document.getElementById('btnSetCustomSentence').addEventListener('click', () => {
    const input = document.getElementById('customSentenceInput').value.trim();
    if (!input) {
      showToast('Bitte gib zuerst einen Satz ein!');
      return;
    }
    const customItem = {
      id: 'custom-' + Date.now(),
      category: 'custom',
      categoryName: 'Eigener Satz',
      sentenceEn: input,
      sentenceDe: 'Freie Eingabe',
      phonetic: 'Individuelle Übung'
    };
    filteredSpeech.unshift(customItem);
    currentSpeechIndex = 0;
    renderCurrentSpeech();
    speakEnglish(input, 0.9);
    showToast('Eigener Satz geladen!');
  });

  // --- CLOZE TEST LOGIC WITH SKIP ---
  function renderCurrentCloze() {
    if (filteredCloze.length === 0) return;
    const cl = filteredCloze[currentClozeIndex];

    document.getElementById('clozeCatBadge').textContent = `${cl.categoryName} • Frage ${currentClozeIndex + 1} von ${filteredCloze.length}`;
    document.getElementById('clozeQuestionTitle').textContent = cl.question;
    document.getElementById('clozeBefore').textContent = cl.sentenceBefore;
    document.getElementById('clozeBlankDisplay').textContent = '[ _____ ]';
    document.getElementById('clozeBlankDisplay').style.color = 'var(--accent)';
    document.getElementById('clozeAfter').textContent = cl.sentenceAfter;

    document.getElementById('clozeHintBox').style.display = 'none';
    document.getElementById('clozeHintBox').textContent = '💡 ' + cl.hint;
    document.getElementById('clozeExplanationBox').style.display = 'none';

    const optionsGrid = document.getElementById('clozeOptionsGrid');
    optionsGrid.innerHTML = '';

    cl.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cloze-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectClozeAnswer(opt, btn, cl));
      optionsGrid.appendChild(btn);
    });
  }

  function selectClozeAnswer(selected, buttonEl, cl) {
    const isCorrect = (selected.toLowerCase() === cl.correctAnswer.toLowerCase());
    const allButtons = document.querySelectorAll('.cloze-opt-btn');
    allButtons.forEach(b => b.disabled = true);

    const blank = document.getElementById('clozeBlankDisplay');
    blank.textContent = cl.correctAnswer;

    if (isCorrect) {
      buttonEl.classList.add('correct');
      blank.style.color = '#34d399';
      addXP(10);
      playSound('success');
      showToast('🎉 Richtig! +10 XP');
      speakEnglish(cl.correctAnswer, 0.9);
    } else {
      buttonEl.classList.add('wrong');
      blank.style.color = '#f87171';
      allButtons.forEach(b => {
        if (b.textContent.toLowerCase() === cl.correctAnswer.toLowerCase()) {
          b.classList.add('correct');
        }
      });
      playSound('try-again');
      showToast('Leider falsch');
    }

    const explBox = document.getElementById('clozeExplanationBox');
    document.getElementById('clozeExplanationText').textContent = cl.explanation;
    explBox.style.display = 'block';
  }

  document.getElementById('btnToggleHint').addEventListener('click', () => {
    const hintBox = document.getElementById('clozeHintBox');
    hintBox.style.display = (hintBox.style.display === 'block') ? 'none' : 'block';
  });

  document.getElementById('btnPrevCloze').addEventListener('click', () => {
    if (currentClozeIndex > 0) {
      currentClozeIndex--;
    } else {
      currentClozeIndex = filteredCloze.length - 1;
    }
    renderCurrentCloze();
  });

  document.getElementById('btnNextCloze').addEventListener('click', () => {
    if (currentClozeIndex < filteredCloze.length - 1) {
      currentClozeIndex++;
    } else {
      currentClozeIndex = 0;
    }
    renderCurrentCloze();
  });

  // SKIP CLOZE (Überspringen)
  document.getElementById('btnSkipCloze').addEventListener('click', () => {
    currentClozeIndex = (currentClozeIndex + 1) % filteredCloze.length;
    renderCurrentCloze();
    showToast('Frage übersprungen ⏭️');
  });

  // --- GLOSSARY SEARCH & STATS ---
  function openVocabInFlashcards(vocabId) {
    let idx = filteredVocab.findIndex(v => v.id === vocabId);
    if (idx === -1) {
      currentCategory = 'all';
      document.querySelectorAll('.cat-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'all');
      });
      filteredVocab = [...VOCAB_DATA];
      idx = filteredVocab.findIndex(v => v.id === vocabId);
    }
    if (idx !== -1) {
      currentCardIndex = idx;
      renderCurrentCard();
      switchView('flashcards');
      showToast(`🎴 Karteikarte geöffnet: ${filteredVocab[idx].english}`);
      const cardEl = document.getElementById('flashcardEl');
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  function renderGlossary(searchTerm = '') {
    const listEl = document.getElementById('glossaryList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const term = searchTerm.toLowerCase().trim();
    let displayList = VOCAB_DATA;
    if (currentCategory !== 'all') {
      displayList = displayList.filter(v => v.category === currentCategory);
    }
    if (term) {
      displayList = displayList.filter(v => 
        v.english.toLowerCase().includes(term) ||
        v.german.toLowerCase().includes(term) ||
        v.definition.toLowerCase().includes(term) ||
        (v.exampleEn && v.exampleEn.toLowerCase().includes(term)) ||
        (v.exampleDe && v.exampleDe.toLowerCase().includes(term))
      );
    }

    if (displayList.length === 0) {
      listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 24px;">Keine Treffer gefunden.</p>';
      return;
    }

    displayList.forEach(item => {
      const isMastered = masteredCards.includes(item.id);
      const div = document.createElement('div');
      div.className = 'glossary-item';
      div.dataset.vocabId = item.id;
      div.innerHTML = `
        <div class="glossary-summary">
          <div class="item-left">
            <div class="item-en">
              ${item.english}
              ${item.phonetic ? `<span class="item-phonetic">${item.phonetic}</span>` : ''}
              <span class="item-badge">${item.categoryName}</span>
              ${isMastered ? ' <span title="Gemeistert" class="item-star">⭐</span>' : ''}
            </div>
            <div class="item-de">${item.german}</div>
          </div>
          <div class="item-actions">
            <button class="item-audio-btn" title="Aussprache anhören" data-speak="${encodeURIComponent(item.english)}">🔊</button>
            <button class="item-card-btn" title="In Karteikarten-Trainer öffnen" data-open-card="${item.id}">🎴 Karte</button>
            <button class="item-expand-toggle" title="Details ein-/ausklappen">▼</button>
          </div>
        </div>
        <div class="glossary-details">
          <div class="glossary-def-box">
            <div class="glossary-def-label">📖 Definition:</div>
            <div class="glossary-def-text">${item.definition}</div>
          </div>
          ${item.exampleEn ? `
            <div class="glossary-example-box">
              <div class="glossary-example-header">
                <span class="glossary-example-label">💬 Beispielsatz:</span>
                <button class="item-audio-btn-sm" data-speak="${encodeURIComponent(item.exampleEn)}" title="Satz anhören">🔊 Anhören</button>
              </div>
              <div class="glossary-example-en">${item.exampleEn}</div>
              <div class="glossary-example-de">🇩🇪 <em>${item.exampleDe || ''}</em></div>
            </div>
          ` : ''}
          <div class="glossary-footer-actions">
            <button class="btn-open-in-cards" data-open-card="${item.id}">
              🎴 In Karteikarten-Trainer öffnen & üben
            </button>
          </div>
        </div>
      `;

      div.querySelector('.glossary-summary').addEventListener('click', (e) => {
        if (e.target.closest('.item-audio-btn') || e.target.closest('.item-card-btn')) return;
        div.classList.toggle('expanded');
        const toggleBtn = div.querySelector('.item-expand-toggle');
        if (toggleBtn) {
          toggleBtn.textContent = div.classList.contains('expanded') ? '▲' : '▼';
        }
      });

      div.querySelectorAll('[data-speak]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const txt = decodeURIComponent(e.currentTarget.dataset.speak);
          speakEnglish(txt, 0.88);
        });
      });

      div.querySelectorAll('[data-open-card]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const vId = e.currentTarget.dataset.openCard;
          openVocabInFlashcards(vId);
        });
      });

      listEl.appendChild(div);
    });
  }

    document.getElementById('glossarySearchInput').addEventListener('input', (e) => {
    renderGlossary(e.target.value);
  });

  document.getElementById('btnResetProgress').addEventListener('click', () => {
    if (confirm('Möchtest du deinen gesamten Lernstand wirklich zurücksetzen?')) {
      masteredCards = [];
      userXP = 0;
      localStorage.removeItem('fiae_mastered_cards');
      localStorage.removeItem('fiae_user_xp');
      updateStatsBadges();
      renderCurrentCard();
      renderGlossary();
      showToast('Lernstand zurückgesetzt');
    }
  });

  // --- INITIAL RENDER ---

  // --- PWA INSTALLATION MODAL & NATIVE PROMPT LOGIC ---
  let deferredPrompt = null;
  const btnInstallApp = document.getElementById('btnInstallApp');
  const modalOverlay = document.getElementById('installModalOverlay');
  const btnCloseModal = document.getElementById('btnCloseInstallModal');
  const btnTriggerDirect = document.getElementById('btnTriggerDirectInstall');

  // Listen for native Android/Chrome install prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnTriggerDirect) btnTriggerDirect.style.display = 'block';
    console.log('[PWA] beforeinstallprompt captured');
  });

  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast('🎉 App wird auf deinem Handy installiert!');
          }
          deferredPrompt = null;
        });
      } else {
        if (modalOverlay) modalOverlay.classList.add('show');
      }
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      if (modalOverlay) modalOverlay.classList.remove('show');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('show');
      }
    });
  }

  if (btnTriggerDirect) {
    btnTriggerDirect.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast('🎉 App wird installiert!');
            if (modalOverlay) modalOverlay.classList.remove('show');
          }
          deferredPrompt = null;
        });
      }
    });
  }

  window.addEventListener('appinstalled', () => {
    showToast('🎉 App erfolgreich installiert!');
    if (btnInstallApp) btnInstallApp.style.display = 'none';
  });


  // ============================================================
  // 5. DIALOG-COACH & SATZ-DOKTOR LOGIK
  // ============================================================
  let currentDialogMode = 'text'; // 'text' oder 'voice'
  let currentScenarioId = 'beginner';

  function getUserName() {
    return localStorage.getItem('fiae_user_name') || '';
  }

  function setUserName(name) {
    const clean = (name || '').trim();
    if (clean) {
      localStorage.setItem('fiae_user_name', clean);
    } else {
      localStorage.removeItem('fiae_user_name');
    }
    updateUserNameUI();
  }

  function updateUserNameUI() {
    const el = document.getElementById('displayUserName');
    if (el) {
      const name = getUserName();
      el.textContent = name ? name : 'Name eingeben';
    }
  }
  let dialogHistories = {};
  let activeGuests = [];
  let dialogInitialized = false;

  // --- DER GRAMMATIK- & SATZ-DOKTOR (CLIENT-SEITIGE ANALYSE & PRAISE) ---
  const SentenceDoctor = {
    germanWords: [
      'ich', 'habe', 'arbeitete', 'gestern', 'mein', 'meine', 'warum', 'dass', 'nicht',
      'bitte', 'ja', 'nein', 'gut', 'danke', 'wir', 'sie', 'heute', 'morgen', 'frage',
      'problem', 'fehler', 'gemacht', 'gearbeitet', 'datenbank', 'entwicklung', 'entwickler',
      'funktion', 'klasse', 'abfrage', 'hilfe', 'kannst', 'wochenende', 'urlaub', 'zimmer'
    ],

    techVocabList: [
      'optimize', 'optimization', 'refactor', 'refactoring', 'throughput', 'asynchronous',
      'bottleneck', 'redundant', 'inheritance', 'polymorphism', 'encapsulation', 'scalability',
      'concurrency', 'transaction', 'normalization', 'microservice', 'microservices',
      'monolith', 'deployment', 'pipeline', 'middleware', 'idempotent', 'resilient'
    ],

    analyze(text) {
      const clean = text.trim();
      if (!clean) return null;

      const lower = clean.toLowerCase();

      // 1A. Typo & Spelling Checker for common English learner typos
      const commonTypos = [
        { regex: /\bhow\s+old\s+you\s+are\b/gi, fix: 'how old are you', tip: 'Fragen-Satzbau: Bei Fragen steht das Verb vor dem Subjekt: <em>"How old are you?"</em>' },
        { regex: /\bi\s+have\s+\d+\s+years\b/gi, fix: 'I am ... years old', tip: 'Alter auf Englisch: Sage <em>"I am ... years old"</em> (mit <strong>to be</strong>, nicht "have").' },
        { regex: /\bi\s+am\s+beginner\b/gi, fix: 'I am a beginner', tip: 'Artikelregel: Vor zählbaren Berufen/Rollen im Singular gehört ein <em>"a"</em>: <strong>"I am a beginner"</strong>.' },
        { regex: /\bi\s+want\s+learn\b/gi, fix: 'I want to learn', tip: 'Infinitiv mit "to": Nach "want" folgt <strong>"to"</strong> + Verb: <em>"I want to learn"</em>.' },
        { regex: /\bhow\s+to\s+say\b/gi, fix: 'how do you say', tip: 'Vollständige Frage: <em>"How do you say [Wort] in English?"</em>' },
        { regex: /\bwath\b/gi, fix: 'what', tip: 'W-Fragen beginnen mit <em>"wh"</em> (<strong>what</strong>, <em>where, when, why</em>).' },
        { regex: /\bwaht\b/gi, fix: 'what', tip: '<em>"what"</em> (nicht "waht").' },
        { regex: /\bmornig\b/gi, fix: 'morning', tip: '<em>"morning"</em> wird mit <strong>"ng"</strong> am Ende geschrieben.' },
        { regex: /\byuor\b/gi, fix: 'your', tip: '<em>"your"</em> (dein/deine).' },
        { regex: /\bnam\b/gi, fix: 'name', tip: '<em>"name"</em> mit stummem <strong>e</strong>.' },
        { regex: /\bplese\b/gi, fix: 'please', tip: '<em>"please"</em> (bitte).' },
        { regex: /\bteh\b/gi, fix: 'the', tip: '<em>"the"</em> (der/die/das).' },
        { regex: /\bwich\b/gi, fix: 'which', tip: '<em>"which"</em> (welche/r/s).' }
      ];

      let foundTypos = [];
      let typoCorrected = clean;
      for (const t of commonTypos) {
        if (t.regex.test(clean)) {
          foundTypos.push(t);
          typoCorrected = typoCorrected.replace(t.regex, t.fix);
        }
      }
      const words = lower.replace(/[^a-zäöüß0-9\s]/g, '').split(/\s+/).filter(Boolean);

      // 1. Prüfen auf deutsche Eingabe
      const germanCount = words.filter(w => this.germanWords.includes(w)).length;
      if (germanCount >= 2 || (words.length <= 4 && germanCount >= 1)) {
        return {
          hasError: true,
          isGerman: true,
          originalText: clean,
          correctedText: this.translateGermanInput(clean),
          explanation: '⚠️ Du hast auf Deutsch geschrieben! Versuche deinen Gedanken auf Englisch zu formulieren. Sieh dir oben die englische Übersetzung an.'
        };
      }

      // 2. Prüfen auf bekannte Grammatikfehler & False Friends
      let corrected = clean;
      let hasError = false;
      let explanation = '';

      // Regel A: "become" vs "get / receive" (False Friend: become = werden, nicht bekommen)
      const becomeMatch = lower.match(/\b(i|we|they|he|she|you)\s+(become|became)\s+(a|an|the|some|my)?\s*(coffee|tea|job|ticket|email|message|problem|question|task|bug|update|offer)\b/i);
      if (becomeMatch) {
        hasError = true;
        const past = becomeMatch[2].toLowerCase() === 'became';
        const replacementVerb = past ? 'got' : 'get';
        corrected = corrected.replace(new RegExp(becomeMatch[2], 'i'), replacementVerb);
        explanation = '⚠️ <strong>False Friend:</strong> <em>"become"</em> heißt auf Deutsch <strong>"werden"</strong>, NICHT "bekommen"! Verwende im Englischen <strong>"get"</strong> oder <strong>"receive"</strong> (z. B. <em>"I got a ticket"</em>).';
      }

      // Regel B: "actually" vs "currently" (False Friend: actually = eigentlich/tatsächlich, nicht aktuell)
      if (!hasError && /\b(i\s+am\s+actually\s+working|actually\s+i\s+am|i\s+actually\s+work)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bactually\b/i, 'currently');
        explanation = '⚠️ <strong>False Friend:</strong> <em>"actually"</em> bedeutet <strong>"eigentlich / in Wirklichkeit"</strong>. Wenn du <em>"aktuell / im Moment"</em> meinst, verwende <strong>"currently"</strong> oder <strong>"at the moment"</strong>.';
      }

      // Regel C: "control" vs "check / test / verify" (False Friend: control = steuern/beherrschen)
      if (!hasError && /\b(control|controlled)\s+(the\s+)?(code|query|database|logs|server|test|error)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bcontrol\b/i, 'check').replace(/\bcontrolled\b/i, 'checked');
        explanation = '⚠️ <strong>False Friend:</strong> <em>"control"</em> bedeutet <strong>"steuern / kontrollieren im Sinne von beherrschen"</strong>. Wenn du etwas überprüfen oder kontrollieren willst, sagt man <strong>"check"</strong>, <strong>"verify"</strong> oder <strong>"inspect"</strong>.';
      }

      // Regel D: "make" vs "run / do / conduct"
      if (!hasError && /\b(make|making|made)\s+(a\s+)?(test|tests|code review|sports|homework|query|interview|decision)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bmake\s+(a\s+)?tests?\b/i, 'run tests')
                             .replace(/\bmade\s+(a\s+)?tests?\b/i, 'ran tests')
                             .replace(/\bmake\s+(a\s+)?code review\b/i, 'conduct a code review')
                             .replace(/\bmake\s+homework\b/i, 'do homework')
                             .replace(/\bmake\s+sports\b/i, 'do sports');
        explanation = '💡 Im Englischen sagt man <strong>"run a test"</strong>, <strong>"conduct a code review"</strong> oder <strong>"do homework"</strong>, nicht "make".';
      }

      // Regel E: "since" vs "for" (Dauer vs Zeitpunkt)
      if (!hasError && /\bsince\s+(\d+|one|two|three|four|five|several|many|a\s+few)\s+(minutes|hours|days|weeks|months|years)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bsince\s+/i, 'for ');
        explanation = '💡 <strong>Since vs. For:</strong> Zeitspannen (Dauer wie <em>"for 3 years"</em>) stehen immer mit <strong>"for"</strong>. <strong>"since"</strong> nutzt man nur für feste Startzeitpunkte (z. B. <em>"since Monday"</em>, <em>"since 2024"</em>).';
      }

      // Regel F: "for yesterday" / "for last week"
      if (!hasError && /\bfor\s+(yesterday|last\s+week|last\s+month|last\s+year)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bfor\s+/i, 'since ');
        explanation = '💡 Bei festen Zeitpunkten in der Vergangenheit nutzen wir <strong>"since"</strong> (z. B. <em>"since yesterday"</em>), niemals "for".';
      }

      // Regel G: Doppelte Vergangenheit: "didn't knew" -> "didn't know"
      if (!hasError && /\b(didn\'t|did\s+not)\s+(knew|saw|worked|went|fixed|found)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bdid\s*n\'?t\s+knew\b/i, "didn't know")
                             .replace(/\bdid\s*n\'?t\s+saw\b/i, "didn't see")
                             .replace(/\bdid\s*n\'?t\s+worked\b/i, "didn't work")
                             .replace(/\bdid\s*n\'?t\s+went\b/i, "didn't go")
                             .replace(/\bdid\s*n\'?t\s+fixed\b/i, "didn't fix")
                             .replace(/\bdid\s*n\'?t\s+found\b/i, "didn't find");
        explanation = '💡 <strong>Doppelte Vergangenheitsform:</strong> Nach <em>"didn\'t"</em> steht immer der einfache Infinitiv (z. B. <em>"I didn\'t know"</em>, nicht "didn\'t knew").';
      }

      // Regel H: "He / She / It - das 's' muss mit!"
      if (!hasError) {
        const sMatch = lower.match(/\b(he|she|it|the\s+server|the\s+system|the\s+app|the\s+query|the\s+service)\s+(work|fail|run|need|want|have|think|test|happen)\b/i);
        if (sMatch) {
          hasError = true;
          const verb = sMatch[2].toLowerCase();
          const verbWithS = verb === 'have' ? 'has' : (verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('ss') ? verb + 'es' : verb + 's');
          corrected = corrected.replace(new RegExp('\\b' + verb + '\\b', 'i'), verbWithS);
          explanation = '💡 <strong>He / She / It – das "s" muss mit:</strong> In der 3. Person Einzahl Gegenwart (Present Simple) bekommt das Verb ein <strong>-s</strong> (z. B. <em>"the system runs"</em>, <em>"he works"</em>).';
        }
      }

      // Regel I: "I am agree" -> "I agree"
      if (!hasError && /\b(i\s+am\s+agree|i\s+was\s+agree)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+agree\b/i, 'I agree').replace(/\bi\s+was\s+agree\b/i, 'I agreed');
        explanation = '💡 Im Englischen ist <strong>"agree"</strong> bereits ein Vollverb. Man sagt <strong>"I agree"</strong> (Ich stimme zu), niemals "I am agree".';
      }

      // Regel J: "I am developer" (Fehlender unbestimmter Artikel)
      if (!hasError && /\bi\s+am\s+(junior\s+|senior\s+|software\s+|web\s+|backend\s+|frontend\s+)?(developer|programmer|engineer|student|architect)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+/i, 'I am a ');
        explanation = '💡 Bei Berufsbezeichnungen im Englischen muss immer ein unbestimmter Artikel <strong>"a"</strong> oder <strong>"an"</strong> stehen (z. B. <em>"I am a software developer"</em>).';
      }

      // Regel K: Unzählbare Nomen: "informations", "softwares", "feedbacks"
      if (!hasError && /\b(informations|softwares|hardwares|feedbacks)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\binformations\b/i, 'information')
                             .replace(/\bsoftwares\b/i, 'software')
                             .replace(/\bhardwares\b/i, 'hardware')
                             .replace(/\bfeedbacks\b/i, 'feedback');
        explanation = '💡 Wörter wie <strong>"information"</strong>, <strong>"software"</strong> und <strong>"feedback"</strong> sind im Englischen unzählbar und haben keine Pluralform mit -s.';
      }

      // Regel L: Modalverb + to: "must to", "can to", "should to"
      if (!hasError && /\b(must|can|could|should|will|would)\s+to\s+([a-z]+)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\b(must|can|could|should|will|would)\s+to\s+/i, '$1 ');
        explanation = '💡 Nach Modalverben wie <em>must, can, should</em> folgt der reine Infinitiv <strong>ohne "to"</strong> (z. B. <em>"I must optimize the database"</em>).';
      }

      // Regel M: "interested for" -> "interested in"
      if (!hasError && /\binterested\s+for\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\binterested\s+for\b/i, 'interested in');
        explanation = '💡 Im Englischen heißt es <strong>"interested in"</strong> (z. B. <em>"I am interested in clean architecture"</em>), nicht "interested for".';
      }

      // Regel N: "depend of" -> "depend on"
      if (!hasError && /\bdepend\s+of\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bdepend\s+of\b/i, 'depend on');
        explanation = '💡 Das Verb <em>depend</em> verlangt immer die Präposition <strong>"on"</strong>: <strong>"it depends on the requirements"</strong>.';
      }

      // Regel O: Wortstellung S-V-O: "Yesterday worked I" -> "Yesterday I worked"
      if (!hasError && /\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started|built)\s+i\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started|built)\s+i\b/i, '$1 I $2');
        explanation = '💡 <strong>Wortstellung S-V-O:</strong> Im Englischen bleibt das Subjekt vor dem Verb (<em>"Yesterday I worked"</em>, nicht "Yesterday worked I").';
      }

      // Regel P: Kleingeschriebenes "i" als Pronomen
      if (/\b(i)\b/.test(corrected)) {
        corrected = corrected.replace(/\bi\b/g, 'I');
      }

      // Großschreibung am Satzanfang & Satzzeichen am Ende
      if (corrected.length > 0) {
        corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);
        if (!/[.!?]$/.test(corrected)) {
          corrected += '.';
        }
      }

      // Fachvokabular-Erkennung für besonderes Lob
      const foundTechVocab = words.filter(w => this.techVocabList.includes(w));
      let techPraise = '';
      if (!hasError && foundTechVocab.length > 0) {
        techPraise = `<br>🌟 <strong>Starkes Fachvokabular:</strong> Du hast Fachbegriffe wie <em>"${foundTechVocab.join(', ')}"</em> verwendet – das klingt wie professionelles Englisch erfahrener Softwareentwickler!`;
      }

      if (foundTypos.length > 0 && !hasError) {
        hasError = true;
        corrected = typoCorrected;
        const tips = foundTypos.map(t => t.tip).join(' ');
        explanation = `💡 <strong>Rechtschreib-Tipp:</strong> ${tips}`;
      }

      return {
        hasError,
        isGerman: false,
        originalText: clean,
        correctedText: corrected,
        explanation: hasError ? explanation : ('🌟 Großartig formuliert! Dein Satz ist grammatikalisch einwandfrei und klingt nach natürlichem, flüssigem Englisch.' + techPraise)
      };
    },

    translateGermanInput(german) {
      const g = german.toLowerCase();
      if (g.includes('richtige') && (g.includes('name') || g.includes('nahme'))) {
        return 'My real name is ' + (getUserName() || 'Istvan') + '.';
      }
      if (g.includes('nicht') && g.includes('sondern')) {
        return 'My name is ' + (getUserName() || 'Istvan') + ', not the previous spelling.';
      }
      if (g.includes('wie sagt man') || g.includes('wie heisst') || g.includes('wie schreibt')) {
        return 'How do you say that in English?';
      }
      if (g.includes('korrigier') || g.includes('fehler')) {
        return 'Could you please check my sentences and correct any grammar mistakes?';
      }
      if (g.includes('hilfe') || g.includes('hilf mir') || g.includes('kannst du mir helfen')) {
        return 'Could you please help me with this English sentence?';
      }
      if (g.includes('verstehe') && g.includes('nicht')) {
        return 'I do not quite understand that, could you please explain it more simply?';
      }
      if (g.includes('datenbank') || g.includes('sql') || g.includes('abfrage')) {
        return 'I worked on optimizing our SQL database queries.';
      }
      if (g.includes('fehler') || g.includes('bug') || g.includes('ticket')) {
        return 'I investigated the bug ticket and wrote an automated test to reproduce the issue.';
      }
      if (g.includes('gestern') && g.includes('gearbeitet')) {
        return 'Yesterday I implemented new features and refactored our backend services.';
      }
      if (g.includes('architektur') || g.includes('clean code')) {
        return 'I think we should apply clean code principles and split the monolithic class.';
      }
      if (g.includes('bewerbung') || g.includes('vorstellung') || g.includes('warum')) {
        return 'I would love to work with your agile team because I am passionate about modern software development.';
      }
      if (g.includes('zoll') || g.includes('zölle') || g.includes('protektionismus')) {
        return 'What are the economic consequences of protective tariffs and trade wars?';
      }
      if (g.includes('lieferkette') || g.includes('lieferketten')) {
        return 'How can global companies make their international supply chains more resilient?';
      }
      if (g.includes('globalisierung') || g.includes('welthandel')) {
        return 'What are the main drivers and challenges of economic globalization?';
      }
      if (g.includes('komparativ') || g.includes('kostenvorteil') || g.includes('ricardo')) {
        return 'Can you explain the theory of comparative advantage according to David Ricardo?';
      }
      if (g.includes('wechselkurs') || g.includes('währung') || g.includes('inflation')) {
        return 'How do central bank interest rates influence international currency exchange rates?';
      }
      if (g.includes('abitur') || g.includes('klausur') || g.includes('prüfung')) {
        return 'Could you give me an Abitur-level essay prompt analyzing modern geoeconomics?';
      }
      if (g.includes('wochenende') || g.includes('pause') || g.includes('musik')) {
        return 'I am taking a quick coffee break and look forward to producing electronic music this weekend.';
      }
      if (g.includes('zimmer') || g.includes('reservierung') || g.includes('hotel')) {
        return 'Good evening, I have a hotel room reservation under the name Istvan Csovrij.';
      }
      return 'I would like to discuss our software project and practice professional English.';
    }
  };


  // --- DER INTERAKTIVE VOKABEL-PRÜFER (QUIZ-ENGINE) ---
  const VocabQuizEngine = {
    state: {
      active: false,
      currentIndex: 0,
      currentVocab: null,
      score: 0,
      totalAsked: 0,
      deck: []
    },

    start() {
      this.state.active = true;
      this.state.score = 0;
      this.state.totalAsked = 0;
      // Deck mit allen Vokabeln mischen
      this.state.deck = [...VOCAB_DATA].sort(() => Math.random() - 0.5);
      this.state.currentIndex = 0;
      return this.askNext();
    },

    askNext() {
      if (this.state.currentIndex >= this.state.deck.length) {
        this.state.deck = [...VOCAB_DATA].sort(() => Math.random() - 0.5);
        this.state.currentIndex = 0;
      }
      const item = this.state.deck[this.state.currentIndex];
      this.state.currentVocab = item;
      this.state.currentIndex++;
      this.state.totalAsked++;

      const cleanGermanHint = item.german.split('/')[0].replace(/\(.*?\)/g, '').trim();

      const suggestions = [
        cleanGermanHint,
        '💡 Lösung anzeigen',
        '⏭️ Nächstes Wort'
      ];

      return {
        en: `Question ${this.state.totalAsked}: What is the German meaning of "${item.english}"?`,
        de: `Frage ${this.state.totalAsked}: Wie lautet die deutsche Bedeutung von:\n👉 **"${item.english}"**?\n*(Kategorie: ${item.categoryName})*`,
        audioText: item.english,
        suggestions: suggestions,
        vocabItem: item
      };
    },

    evaluateAnswer(userAnswer) {
      if (!this.state.currentVocab) {
        return this.start();
      }

      const item = this.state.currentVocab;
      const cleanUser = userAnswer.toLowerCase().trim().replace(/[^a-zäöüß0-9\s]/g, '');

      // Falls der Nutzer nach der Lösung fragt oder überspringen möchte
      if (cleanUser.includes('lösung') || cleanUser.includes('solution') || cleanUser.includes('skip') || cleanUser.includes('weiß nicht') || cleanUser.includes('nächstes') || cleanUser.includes('weiter')) {
        const nextQ = this.askNext();
        return {
          isCorrect: false,
          isSkip: true,
          en: `"${item.english}" translates to "${item.german}". Definition: ${item.definition}`,
          de: `💡 **Lösung:**\n👉 **"${item.english}"** = **"${item.german}"**\n*Erklärung:* ${item.definition}\n\n━━━━━━━━━━━━━━━━━━━━\n${nextQ.de}`,
          audioText: `${item.english}. Nächstes Wort: ${nextQ.vocabItem.english}`,
          suggestions: nextQ.suggestions
        };
      }

      // Kern-Schlüsselwörter aus der deutschen Übersetzung und Definition extrahieren
      const germanKeywords = (item.german + ' ' + (item.definition || '')).toLowerCase().replace(/[^a-zäöüß0-9\s]/g, '').split(/\s+/).filter(w => w.length >= 4);
      const userWords = cleanUser.split(/\s+/).filter(w => w.length >= 4);

      // Treffer prüfen
      const hasMatch = userWords.some(uw => germanKeywords.some(gk => gk.includes(uw) || uw.includes(gk))) ||
                       cleanUser.includes(item.german.toLowerCase().split('/')[0].trim().toLowerCase().slice(0, 5));

      let feedbackEn = '';
      let feedbackDe = '';

      if (hasMatch) {
        this.state.score++;
        userXP += 15;
        localStorage.setItem('fiae_user_xp', userXP);
        playSound('success');

        feedbackEn = `Correct! 🎉 "${item.english}" means "${item.german}".`;
        feedbackDe = `Hervorragend${this.salutation()}! 🎉 Das ist absolut richtig!\n👉 **"${item.english}"** = **"${item.german}"**\n💡 *Erklärung:* ${item.definition}\n*(+15 XP • Punktestand: ${this.state.score} von ${this.state.totalAsked} richtig)*`;
      } else {
        playSound('try-again');
        feedbackEn = `Close! "${item.english}" translates to "${item.german}".`;
        feedbackDe = `Fast! 💡 **"${item.english}"** bedeutet auf Deutsch:\n👉 **"${item.german}"**\n*Erklärung:* ${item.definition}\n*(Punktestand: ${this.state.score} von ${this.state.totalAsked} richtig)*`;
      }

      const nextQ = this.askNext();
      return {
        isCorrect: hasMatch,
        isSkip: false,
        en: `${feedbackEn}\n\n${nextQ.en}`,
        de: `${feedbackDe}\n\n━━━━━━━━━━━━━━━━━━━━\n${nextQ.de}`,
        audioText: `${feedbackEn} Next word: ${nextQ.vocabItem.english}`,
        suggestions: nextQ.suggestions
      };
    }
  };

  // --- DIE DYNAMISCHE DIALOG-ENGINE (MULTI-TURN & ABWECHSLUNGSREICH) ---
  const DialogEngine = {
    state: {
      turnCount: 0,
      currentScenario: 'standup',
      usedResponseKeys: new Set()
    },

    reset(scenarioId) {
      this.state.turnCount = 0;
      this.state.currentScenario = scenarioId;
      this.state.usedResponseKeys.clear();
    },

    // Antwort-Katalog mit Dutzenden dynamischen Antwort-Zweigen
    scenarios: {
      economics: {
        comparative_advantage: [
          {
            id: 'econ_ricardo_1',
            en: 'David Ricardo\'s theory of comparative advantage is fascinating{name}! Even if Country A produces everything more efficiently than Country B in absolute terms, both nations gain if each specializes in goods with the lowest opportunity cost. Would you like a classic example with wine and cloth?',
            de: 'David Ricardos Theorie des komparativen Kostenvorteils ist faszinierend{name}! Selbst wenn Land A absolut alles effizienter produziert als Land B, profitieren beide, wenn sich jedes auf Güter mit den geringsten Opportunitätskosten spezialisiert. Möchtest du ein klassisches Beispiel mit Wein und Tuch?',
            suggestions: [
              'Yes, please explain the wine and cloth example!',
              'What is the exact difference between absolute and comparative advantage?',
              'How do opportunity costs determine trading prices?'
            ]
          },
          {
            id: 'econ_ricardo_2',
            en: 'Imagine England needs 100 hours for cloth and 120 for wine, while Portugal needs 90 for cloth and 80 for wine. Portugal has an absolute advantage in both! But Portugal\'s relative advantage is greatest in wine, so England specializes in cloth. By exchanging goods, both get more total output. Isn\'t that an elegant economic insight?',
            de: 'Stell dir vor: England braucht 100 Stunden für Tuch und 120 für Wein, während Portugal 90 für Tuch und 80 für Wein benötigt. Portugal hat bei beidem einen absoluten Vorteil! Aber Portugals relativer Vorteil ist beim Wein am größten, also spezialisiert sich England auf Tuch. Durch den Tausch haben beide insgesamt mehr Güter. Ist das nicht eine elegante ökonomische Erkenntnis?',
            suggestions: [
              'That makes sense! So trade is not a zero-sum game.',
              'Does comparative advantage still hold in modern digital economies?',
              'What are the critical assumptions behind Ricardo\'s model?'
            ]
          }
        ],
        trade_balance: [
          {
            id: 'econ_balance_1',
            en: 'The balance of trade measures exports minus imports{name}. If a nation exports more value than it imports, it runs a trade surplus (like Germany). If imports exceed exports, it runs a trade deficit (like the US). How do you think a strong or weak currency influences this balance?',
            de: 'Die Handelsbilanz misst Exporte abzüglich Importe{name}. Exportiert ein Land mehr Wert als es importiert, erzielt es einen Handelsbilanzüberschuss (wie Deutschland). Übersteigen die Importe die Exporte, entsteht ein Handelsbilanzdefizit (wie in den USA). Wie beeinflusst deiner Meinung nach eine starke oder schwache Währung diese Bilanz?',
            suggestions: [
              'A weaker currency makes domestic exports cheaper on global markets.',
              'A stronger currency makes imported goods and raw materials more affordable.',
              'What happens when exchange rates fluctuate unpredictably?'
            ]
          }
        ],
        tariffs_protectionism: [
          {
            id: 'econ_tariff_1',
            en: 'Tariffs are a central debate topic in Grade 12{name}! While tariffs shield domestic manufacturers from low-price foreign competitors, they also create deadweight economic loss, raise prices for consumers, and provoke retaliatory tariffs in a trade war. How would you argue this in an exam?',
            de: 'Zölle sind ein zentrales Schwerpunktthema der 12. Klasse{name}! Zwar schützen Zölle heimische Hersteller vor billigerer Auslandskonkurrenz, sie verursachen aber auch Wohlfahrtsverluste, verteuern Produkte für Verbraucher und provozieren Vergeltungszölle in einem Handelskrieg. Wie würdest du das in einer Klausur argumentieren?',
            suggestions: [
              'On the one hand, tariffs protect domestic jobs; on the other, they fuel inflation.',
              'Retaliatory tariffs can harm export-oriented industries significantly.',
              'Are non-tariff trade barriers like strict quotas more effective than tariffs?'
            ]
          },
          {
            id: 'econ_tariff_2',
            en: 'Exactly right! Non-tariff trade barriers include import quotas, administrative red tape, and strict technical standards. Often governments argue for national security or environmental standards to disguise protectionist motives. What is your view on this tension?',
            de: 'Vollkommen richtig! Nicht-tarifäre Handelshemmnisse umfassen Importquoten, bürokratische Hürden und strenge Produktnormen. Oft führen Regierungen nationale Sicherheit oder Umweltstandards an, um protektionistische Absichten zu verschleiern. Wie beurteilst du dieses Spannungsverhältnis?',
            suggestions: [
              'National security is sometimes a valid concern for critical semiconductors.',
              'Consumers usually bear the ultimate cost of protectionist policies.',
              'Can the WTO prevent countries from abusing national security exceptions?'
            ]
          }
        ],
        supply_chains: [
          {
            id: 'econ_supply_1',
            en: 'Supply chain resilience has transformed from a corporate detail into a premier geopolitical issue{name}! Decades of extreme Just-in-Time optimization reduced storage costs, but created extreme vulnerability to single-source bottlenecks. Have you heard of nearshoring and friendshoring?',
            de: 'Lieferketten-Resilienz hat sich von einem Unternehmensdetail zu einem geopolitischen Top-Thema entwickelt{name}! Jahrzehntelange extreme Just-in-Time-Optimierung senkte zwar Lagerkosten, schuf aber extreme Anfälligkeit für Engpässe bei einzelnen Lieferanten. Hast du schon von Nearshoring und Friendshoring gehört?',
            suggestions: [
              'Nearshoring means bringing production closer to home markets.',
              'Friendshoring restricts sourcing to politically trusted allied nations.',
              'How do these strategies affect overall production costs?'
            ]
          },
          {
            id: 'econ_supply_2',
            en: 'Spot on! Nearshoring and friendshoring prioritize reliability and security over sheer low wages. However, diversifying supply chains also incurs higher capital expenditure and operational costs. For an Abitur analysis, you should highlight this exact trade-off between resilience and cost efficiency.',
            de: 'Volltreffer! Nearshoring und Friendshoring priorisieren Verlässlichkeit und Sicherheit vor reinen Niedriglöhnen. Die Diversifizierung von Lieferketten verursacht jedoch auch höhere Investitionen und Betriebskosten. Für eine Abitur-Analyse solltest du genau diesen Trade-off zwischen Resilienz und Kosteneffizienz herausarbeiten.',
            suggestions: [
              'How does the European Supply Chain Due Diligence Act impact MNCs?',
              'Let\'s discuss how raw material dependencies (like lithium) affect Europe.',
              'Can automated robotics make domestic re-industrialization viable?'
            ]
          }
        ],
        fdi_multinationals: [
          {
            id: 'econ_fdi_1',
            en: 'Foreign Direct Investment (FDI) is crucial for emerging economies{name}. When multinational corporations establish factories abroad, they bring capital, technological know-how, and jobs. But critics point out issues like profit repatriation and local wage exploitation. What is your evaluation?',
            de: 'Ausländische Direktinvestitionen (FDI) sind für Schwellenländer entscheidend{name}. Wenn multinationale Konzerne Fabriken im Ausland bauen, bringen sie Kapital, technologisches Know-how und Arbeitsplätze. Kritiker bemängeln jedoch Gewinnabflüsse und Ausbeutung von Arbeitskräften. Wie beurteilst du das?',
            suggestions: [
              'FDI can accelerate industrial development and build infrastructure.',
              'Host countries must enforce labor standards and environmental regulations.',
              'What distinguishes portfolio investment from Foreign Direct Investment?'
            ]
          }
        ],
        sustainability_fairtrade: [
          {
            id: 'econ_sustain_1',
            en: 'In modern Gymnasium economics, trade and ecological responsibility are inseparable{name}! Instruments like the EU\'s Carbon Border Adjustment Mechanism (CBAM) impose a carbon price on imports of steel and cement. Is this green innovation or disguised protectionism?',
            de: 'In der modernen Gymnasialökonomie sind Außenhandel und ökologische Verantwortung untrennbar{name}! Instrumente wie der CO2-Grenzausgleich der EU (CBAM) belegen Importe von Stahl und Zement mit einem CO2-Preis. Ist das grüne Innovation oder verdeckter Protektionismus?',
            suggestions: [
              'CBAM prevents carbon leakage and levels the playing field for clean industry.',
              'Developing countries argue they lack capital for instant decarbonization.',
              'How do Fair Trade premiums benefit smallholder farmers worldwide?'
            ]
          }
        ],
        monetary_centralbanks: [
          {
            id: 'econ_monetary_1',
            en: 'Now entering Grade 13 & Abitur territory{name}! The US Dollar acts as the primary global reserve currency. When the Federal Reserve raises benchmark interest rates to curb US inflation, global capital rushes into dollar-denominated assets. What happens to debt-burdened emerging economies as a result?',
            de: 'Jetzt betreten wir das Terrain von Klasse 13 und Abitur{name}! Der US-Dollar fungiert als wichtigste weltweite Leitwährung. Wenn die Federal Reserve die Leitzinsen zur Inflationsbekämpfung anhebt, strömt globales Kapital in Dollar-Anlagen. Was passiert infolgedessen mit hochverschuldeten Schwellenländern?',
            suggestions: [
              'Their debt servicing costs in dollars rise dramatically, risking currency crises.',
              'Their central banks are often forced to raise rates, slowing domestic growth.',
              'How does the European Central Bank balance inflation and eurozone cohesion?'
            ]
          }
        ],
        institutions_treaties: [
          {
            id: 'econ_wto_1',
            en: 'Multilateralism under the World Trade Organization (WTO) is a cornerstone of the Abitur curriculum{name}. The WTO operates on principles of Most-Favored-Nation treatment and national treatment. However, its dispute settlement Appellate Body has faced severe gridlock. Why is this dangerous for smaller trading nations?',
            de: 'Der Multilateralismus der Welthandelsorganisation (WTO) ist ein Eckpfeiler des Abiturlehrplans{name}. Die WTO basiert auf den Prinzipien der Meistbegünstigung und Inländerbehandlung. Allerdings leidet ihr Berufungsgremium unter Blockaden. Warum ist das für kleinere Handelsnationen gefährlich?',
            suggestions: [
              'Without binding WTO arbitration, the rule of law is replaced by power politics.',
              'Regional trade agreements like the EU Single Market or USMCA gain importance.',
              'What are the four fundamental freedoms of the European Single Market?'
            ]
          }
        ],
        geopolitics_decoupling: [
          {
            id: 'econ_decoupling_1',
            en: 'This is the hottest Abitur debate today{name}: Geoeconomic Decoupling versus De-risking! Major powers are imposing semiconductor export controls and screening outbound investments. Is pure free-market globalization giving way to a fragmented world of regional trade blocs?',
            de: 'Das ist die aktuellste Abitur-Debatte{name}: Geoeconomic Decoupling versus De-risking! Großmächte verhängen Halbleiter-Exportkontrollen und überprüfen Auslandsinvestitionen. Weicht die reine Freihandels-Globalisierung einer fragmentierten Welt regionaler Handelsblöcke?',
            suggestions: [
              'Complete decoupling is unrealistic, but de-risking critical tech is necessary.',
              'Fragmenting the world into rival economic blocs reduces global wealth and innovation.',
              'How can export nations like Germany maintain strategic autonomy?'
            ]
          }
        ],
        abitur_exam_debates: [
          {
            id: 'econ_abitur_1',
            en: 'Let\'s construct an exemplary Abitur exam response{name}! When answering evaluative exam questions ("Beurteilen Sie..."), always follow the Dialectical Structure: Thesis (Pros/Benefits), Antithesis (Cons/Risks), and Synthesis with your differentiated judgment. Would you like to practice an essay question now?',
            de: 'Lass uns eine vorbildliche Abitur-Antwort aufbauen{name}! Bei Beurteilungsaufgaben ("Beurteilen Sie...") folgst du immer der dialektischen Struktur: These (Vorteile/Chancen), Antithese (Nachteile/Risiken) und Synthese mit deinem differenzierten Urteil. Möchtest du jetzt eine Prüfungsfrage trainieren?',
            suggestions: [
              'Yes! Prompt me with a typical Abitur question on globalization.',
              'What connecting phrases demonstrate C1 academic English in an economics exam?',
              'How do examiners evaluate macroeconomic synthesis?'
            ]
          },
          {
            id: 'econ_abitur_2',
            en: 'Here is your official Abitur essay prompt: "Assess the statement: In an era of geopolitical rivalry, unilateral protective tariffs are the only viable tool to protect a nation\'s industrial sovereignty." How would you begin your thesis?',
            de: 'Hier ist deine offizielle Abitur-Essay-Aufgabe: "Beurteilen Sie die Aussage: In Zeiten geopolitischer Rivalitäten sind einseitige Schutzzölle das einzige wirksame Mittel zum Schutz nationaler Industriesouveränität." Wie würdest du deine These beginnen?',
            suggestions: [
              'On the one hand, protecting key tech sectors shields critical infrastructure.',
              'Conversely, unilateral tariffs invite retaliation, raise costs, and violate WTO rules.',
              'Consequently, strategic de-risking and multilateral partnerships are far superior to tariffs.'
            ]
          }
        ]
      },
      beginner: {
        personal: [
          {
            id: 'beg_pers_1',
            en: 'Nice to meet you{name}! How was your day today?',
            de: 'Schön dich kennenzulernen{name}! Wie war dein Tag heute?',
            suggestions: [
              'Hello, my name is Alex!',
              'I am a junior software developer.',
              'What is your favorite topic to talk about?'
            ]
          },
          {
            id: 'beg_pers_2',
            en: 'Talking about your day is easy! How was your day today{name}?',
            de: 'Über deinen Tag zu sprechen ist einfach! Wie war dein Tag heute{name}?',
            suggestions: [
              'Today was a good day, thank you!',
              'I was busy learning English and programming.',
              'A bit tired, but feeling positive!'
            ]
          }
        ],
        hobbies: [
          {
            id: 'beg_hob_1',
            en: 'Hobbies are great for smalltalk! What do you like doing in your free time{name}?',
            de: 'Hobbys sind toll für Smalltalk! Was machst du gern in deiner Freizeit{name}?',
            suggestions: [
              'I love making music with synthesizers.',
              'I enjoy programming and learning tech.',
              'I like watching good movies and relaxing.'
            ]
          },
          {
            id: 'beg_hob_2',
            en: 'Music is so inspiring! Do you play an instrument or create beats?',
            de: 'Musik ist so inspirierend! Spielst du ein Instrument oder machst du Beats?',
            suggestions: [
              'I use music software and synthesizers.',
              'I listen to lots of different music styles.',
              'Music helps me concentrate and relax.'
            ]
          }
        ],
        food_drinks: [
          {
            id: 'beg_food_1',
            en: 'Food and drinks are fun to talk about! What is your favorite food?',
            de: 'Über Essen zu sprechen macht Spaß! Was isst du am liebsten?',
            suggestions: [
              'I love hot coffee in the morning.',
              'My favorite food is traditional cooking.',
              'I enjoy cooking good food at home.'
            ]
          }
        ],
        learning_vocab: [
          {
            id: 'beg_voc_1',
            en: 'Here are two easy words: 1. Helpful (hilfreich) and 2. Fast (schnell). Can you try one?',
            de: 'Hier sind zwei leichte Wörter: 1. Helpful (hilfreich) und 2. Fast (schnell). Probier eins aus!',
            suggestions: [
              'English is very interesting!',
              'My colleagues are friendly and helpful.',
              'Can you give me 3 more words?'
            ]
          },
          {
            id: 'beg_voc_2',
            en: 'Great job! Whenever you want to learn a word, just ask me!',
            de: 'Toll gemacht! Wann immer du ein Wort lernen möchtest, frag mich einfach!',
            suggestions: [
              "How do you say 'Erfolg' in English?",
              "How do you say 'Feierabend' in English?",
              'Can you teach me another useful sentence?'
            ]
          }
        ],
        weather_daily: [
          {
            id: 'beg_wea_1',
            en: 'Talking about the weather is classic English smalltalk! How is the weather today?',
            de: 'Über das Wetter zu sprechen ist klassischer Smalltalk! Wie ist das Wetter heute?',
            suggestions: [
              'It is sunny and nice today.',
              'It is raining and grey outside.',
              'It is cold, but cozy inside!'
            ]
          }
        ],
        casual_chat: [
          {
            id: 'beg_chat_1',
            en: 'I really enjoy our conversation{name}! What would you like to talk about next?',
            de: 'Ich genieße unser Gespräch sehr{name}! Worüber möchtest du als Nächstes sprechen?',
            suggestions: [
              'Can we talk about daily routines?',
              'Can you ask me an easy question?',
              'Can we practice English for IT?'
            ]
          }
        ]
      },
      standup: {
        database: [
          {
            id: 'su_db_1',
            en: 'Great progress on the database{name}! Did you analyze the query with EXPLAIN?',
            de: 'Großartiger Fortschritt bei der Datenbank{name}! Hast du die Abfrage mit EXPLAIN analysiert?',
            suggestions: [
              'I analyzed the execution plan and added an index on the user ID column.',
              'I refactored a slow SQL join that was causing a full table scan.',
              'The query execution time dropped from 800ms down to 15ms.'
            ]
          },
          {
            id: 'su_db_2',
            en: 'Excellent! Did the query response time improve after your index changes?',
            de: 'Ausgezeichnet! Hat sich die Abfragezeit durch deine Index-Änderungen verbessert?',
            suggestions: [
              'Yes, all unit and integration tests are passing green.',
              'I wrote test cases covering large result sets and empty tables.',
              'I will push the pull request right after our daily standup.'
            ]
          },
          {
            id: 'su_db_3',
            en: 'That sounds very solid! Is your pull request ready for review?',
            de: 'Das klingt sehr solide! Ist dein Pull Request bereit zum Review?',
            suggestions: [
              'No assistance needed, the Flyway migration script is tested.',
              'Could someone take a quick look at the rollback script with me?',
              'Everything is on track for deployment this afternoon.'
            ]
          }
        ],
        testing: [
          {
            id: 'su_test_1',
            en: 'Writing automated tests is great practice! What is your current test coverage?',
            de: 'Automatisierte Tests zu schreiben ist top! Wie hoch ist deine Testabdeckung?',
            suggestions: [
              'I covered edge cases for null values and invalid user inputs.',
              'Our unit test suite now has over eighty percent coverage.',
              'I used mock objects to simulate the external payment API.'
            ]
          },
          {
            id: 'su_test_2',
            en: 'Automated tests give the team confidence. Are all unit tests passing now?',
            de: 'Tests geben dem Team Sicherheit. Laufen jetzt alle Unit-Tests durch?',
            suggestions: [
              'Yes, the continuous integration pipeline completed in under three minutes.',
              'I had to fix a flaky test, but now everything passes reliably.',
              'I will tag the ticket as ready for quality assurance testing.'
            ]
          }
        ],
        bug_fix: [
          {
            id: 'su_bug_1',
            en: 'Thanks for fixing that bug{name}! What was the root cause?',
            de: 'Danke fürs Beheben des Fehlers{name}! Was war die Ursache?',
            suggestions: [
              'The root cause was an unhandled null pointer exception in the auth controller.',
              'I reproduced the error using a special character in the username.',
              'I wrote a regression test first, so this bug will never happen again.'
            ]
          },
          {
            id: 'su_bug_2',
            en: 'Good job finding the bug! Did you write a regression test for it?',
            de: 'Gute Arbeit beim Finden des Fehlers! Hast du einen Regressionstest dafür geschrieben?',
            suggestions: [
              'I opened a pull request and asked a senior colleague for review.',
              'It is already tested on staging and verified by our QA team.',
              'I will merge it into the main branch right after standup.'
            ]
          }
        ],
        blocker: [
          {
            id: 'su_block_1',
            en: 'Blockers can be frustrating. Do you need help from another developer?',
            de: 'Blocker können frustrieren. Brauchst du Unterstützung von einem Entwickler?',
            suggestions: [
              'Yes please, a quick pair programming session would be very helpful.',
              'I only need permission access to the staging database server.',
              'Thanks! I will ping you on Slack right after the standup.'
            ]
          }
        ],
        general_progress: [
          {
            id: 'su_gen_1',
            en: 'Sounds like great progress yesterday{name}! What is your main focus today?',
            de: 'Klingt nach tollem Fortschritt gestern{name}! Was ist dein Hauptfokus heute?',
            suggestions: [
              'Today my focus is on finishing the REST API endpoints.',
              'I plan to refactor the service layer and improve modularity.',
              'No blockers today, I expect to finish the user story before four.'
            ]
          },
          {
            id: 'su_gen_2',
            en: 'Thanks for the clear update{name}! Do you foresee any blockers today?',
            de: 'Danke für das klare Update{name}! Siehst du irgendwelche Blocker für heute?',
            suggestions: [
              'No external dependencies, everything is within our team scope.',
              'The frontend team is waiting for my API payload specification.',
              'Everything is on track for our sprint demo on Friday.'
            ]
          },
          {
            id: 'su_gen_3',
            en: 'Awesome! We are in great shape for the sprint review. Keep it up{name}!',
            de: 'Großartig! Wir stehen für das Sprint-Review bestens da. Weiter so{name}!',
            suggestions: [
              'Thank you Sarah, let\'s deliver a successful sprint!',
              'I will document the new endpoints in Swagger/OpenAPI today.',
              'Have a great and productive day, everyone!'
            ]
          }
        ]
      },

      interview: {
        experience: [
          {
            id: 'int_exp_1',
            en: 'Could you tell me about a project you worked on recently?',
            de: 'Können Sie mir von einem Projekt erzählen, an dem Sie kürzlich gearbeitet haben?',
            suggestions: [
              'I have hands-on experience with Java, Python, and SQL databases.',
              'I specialize in object-oriented programming, REST APIs, and clean code.',
              'I have built database-driven applications using relational schemas.'
            ]
          },
          {
            id: 'int_exp_2',
            en: 'That sounds very practical. What technologies did you use for the backend?',
            de: 'Das klingt sehr praxisnah. Welche Technologien haben Sie im Backend eingesetzt?',
            suggestions: [
              'I resolved a database bottleneck by optimizing query joins and indexes.',
              'I refactored tightly coupled legacy code into modular, testable classes.',
              'I tracked down a complex concurrency race condition using log analysis.'
            ]
          }
        ],
        teamwork: [
          {
            id: 'int_team_1',
            en: 'How do you handle disagreement or different opinions in a dev team?',
            de: 'Wie gehen Sie mit Meinungsverschiedenheiten in einem Entwicklerteam um?',
            suggestions: [
              'I appreciate constructive feedback because it improves our codebase.',
              'I treat code reviews as a valuable learning opportunity from peers.',
              'I discuss architectural trade-offs openly and respectfully with teammates.'
            ]
          },
          {
            id: 'int_team_2',
            en: 'Communication is key. How do you do code reviews with your peers?',
            de: 'Kommunikation ist entscheidend. Wie führen Sie Code-Reviews mit Kollegen durch?',
            suggestions: [
              'I prioritize core functionality first and communicate transparently with stakeholders.',
              'I stay calm, break down tasks into small increments, and focus on clean solutions.',
              'Agile Scrum methodologies help adapt smoothly to changing customer needs.'
            ]
          }
        ],
        motivation: [
          {
            id: 'int_mot_1',
            en: 'What motivates you most about software development?',
            de: 'Was motiviert Sie an der Softwareentwicklung am meisten?',
            suggestions: [
              'I love solving complex problems with logic and writing software that helps people.',
              'I want to specialize in scalable backend architectures and cloud technologies.',
              'Continuous learning is what excites me most about software engineering.'
            ]
          },
          {
            id: 'int_mot_2',
            en: 'Where do you see yourself developing in the next two to three years?',
            de: 'Wo sehen Sie Ihre fachliche Entwicklung in den nächsten zwei bis drei Jahren?',
            suggestions: [
              'What CI/CD tools and cloud platforms does your team currently utilize?',
              'How does your engineering team support continuous professional training?',
              'What are the most exciting technical milestones planned for the next sprint?'
            ]
          }
        ]
      },

      support: {
        database_incident: [
          {
            id: 'sup_db_1',
            en: 'Thanks for checking this ticket{name}! Database timeouts are impacting checkout.',
            de: 'Danke fürs Prüfen dieses Tickets{name}! Datenbank-Timeouts bremsen das Checkout aus.',
            suggestions: [
              'I am checking the database connection pool metrics right now.',
              'The pool seems maxed out at 50 connections with high query wait times.',
              'I will run EXPLAIN on the checkout query to see why it locks rows.'
            ]
          },
          {
            id: 'sup_db_2',
            en: 'Good observation! Did you check the slow query log on the database server?',
            de: 'Gute Beobachtung! Hast du das Slow-Query-Log auf dem Server geprüft?',
            suggestions: [
              'I prepared the migration script and tested it locally without errors.',
              'The query execution dropped from 2 seconds to under 10 milliseconds.',
              'I opened an urgent hotfix PR and tagged the lead architect for review.'
            ]
          },
          {
            id: 'sup_db_3',
            en: 'Excellent! Let us run load tests in staging before deploying the fix.',
            de: 'Ausgezeichnet! Lass uns Lasttests im Staging machen, bevor wir deployen.',
            suggestions: [
              'I will write the post-mortem summary highlighting the root cause.',
              'We should add an automated alert if connection pool usage exceeds 80%.',
              'Thank you Alex, glad we resolved the customer impact so smoothly!'
            ]
          }
        ]
      },

      architecture: {
        clean_code: [
          {
            id: 'arch_clean_1',
            en: 'Welcome{name}! How would you apply the Single Responsibility Principle here?',
            de: 'Willkommen{name}! Wie würdest du hier das Single-Responsibility-Prinzip anwenden?',
            suggestions: [
              'I would split it into dedicated classes: OrderValidation, OrderPricing, and OrderRepository.',
              'We should extract interfaces so each service component has a single reason to change.',
              'Pairing this with comprehensive unit tests ensures we don\'t break existing business logic.'
            ]
          },
          {
            id: 'arch_clean_2',
            en: 'Your architectural intuition is great{name}! How do you design clear REST APIs?',
            de: 'Deine Architektur-Intuition ist super{name}! Wie gestaltest du klare REST-APIs?',
            suggestions: [
              'Dependency Injection is crucial because it allows us to mock dependencies easily in unit tests.',
              'It keeps our classes loosely coupled and adheres to the Inversion of Control principle.',
              'I have used Constructor Injection in Java and it makes code very maintainable.'
            ]
          },
          {
            id: 'arch_clean_3',
            en: 'Decoupled services are much easier to maintain and test.',
            de: 'Entkoppelte Services sind viel einfacher zu warten und zu testen.',
            suggestions: [
              'I use standard HTTP codes: 200 for OK, 201 for Created, 400 for Bad Request, and 404 for Not Found.',
              'I design standardized JSON response envelopes containing data, error messages, and pagination metadata.',
              'I document all endpoints with OpenAPI/Swagger so frontend developers can integrate easily.'
            ]
          }
        ]
      },

      smalltalk: {
        music_hobby: [
          {
            id: 'st_music_1',
            en: 'Producing electronic music sounds fascinating{name}! What software do you use?',
            de: 'Elektronische Musik zu machen klingt faszinierend{name}! Welche Software nutzt du?',
            suggestions: [
              'I use a DAW and software synthesizers to sculpt unique basslines and melodies.',
              'I enjoy designing custom synth patches with oscillators, filters, and audio effects.',
              'Making beats and arranging tracks is a great creative outlet after a day of coding.'
            ]
          },
          {
            id: 'st_music_2',
            en: 'Creative hobbies are a wonderful balance to programming! Do you play synths?',
            de: 'Kreative Hobbys sind ein toller Ausgleich zum Coden! Spielst du Synthesizer?',
            suggestions: [
              'Yes, layering sounds in a DAW feels very similar to structuring clean software classes.',
              'Adjusting frequencies and mastering tracks requires the same attention to detail as debugging.',
              'It really helps me clear my mind and recharge my mental focus for the next sprint.'
            ]
          }
        ],
        coffee_break: [
          {
            id: 'st_coffee_1',
            en: 'Coffee breaks are essential! How is your week going so far?',
            de: 'Kaffeepausen sind essenziell! Wie läuft deine Woche bisher?',
            suggestions: [
              'My week is going really well, making steady progress on my sprint backlog.',
              'Taking a short walk away from the monitors definitely clears my head.',
              'A good cup of coffee always boosts my problem-solving energy!'
            ]
          },
          {
            id: 'st_coffee_2',
            en: 'Any fun plans for the upcoming weekend, or just relaxing?',
            de: 'Schöne Pläne fürs Wochenende oder einfach nur entspannen?',
            suggestions: [
              'I want to enjoy some outdoor sunshine and produce new music on Sunday.',
              'I might check out an online developer talk about modern cloud architecture.',
              'Relaxing with good music and good food is definitely on my weekend agenda!'
            ]
          }
        ]
      },

      travel: {
        london_hotel: [
          {
            id: 'trv_lon_1',
            en: 'Good evening! I can check your hotel reservation. What is your name?',
            de: 'Guten Abend! Ich kann deine Hotelreservierung prüfen. Wie lautet dein Name?',
            suggestions: [
              'Thank you! Here is my passport and booking confirmation.',
              'Could you tell me what time complimentary breakfast is served in the morning?',
              'What is the easiest way to take the Underground to Shoreditch from here?'
            ]
          },
          {
            id: 'trv_lon_2',
            en: 'Welcome to London! Breakfast is served from 7 to 10 in the morning.',
            de: 'Willkommen in London! Frühstück gibt es morgens von 7 bis 10 Uhr.',
            suggestions: [
              'That is very clear and convenient, thank you for the directions!',
              'Can I pay on the Underground with my contactless credit card or phone?',
              'Could you also recommend an authentic British restaurant for dinner tonight?'
            ]
          },
          {
            id: 'trv_lon_3',
            en: 'The nearest tube station is Piccadilly Circus, just a two-minute walk away.',
            de: 'Die nächste U-Bahn-Station ist Piccadilly Circus, nur zwei Minuten zu Fuß.',
            suggestions: [
              'That sounds wonderful, I will definitely check out The George tonight.',
              'Thank you very much for your outstanding British hospitality!',
              'Have a wonderful evening, I will head up to my room now.'
            ]
          }
        ]
      },

      free: {
        general: [
          {
            id: 'fr_1',
            en: 'That is very interesting{name}! Tell me more about that.',
            de: 'Das ist sehr interessant{name}! Erzähl mir mehr darüber.',
            suggestions: [
              'In my daily routine, I balance intensive coding with continuous learning.',
              'I focus on writing readable code with clean architecture and automated tests.',
              'I find that discussing technical concepts in English builds immense confidence.'
            ]
          },
          {
            id: 'fr_2',
            en: 'You are expressing yourself very clearly! What would you like to talk about next?',
            de: 'Du drückst dich sehr verständlich aus! Worüber möchtest du als Nächstes sprechen?',
            suggestions: [
              'I am fascinated by scalable backend microservices and efficient database design.',
              'I love how agile Scrum frameworks enable collaborative and iterative development.',
              'I enjoy exploring how algorithmic patterns improve application performance.'
            ]
          },
          {
            id: 'fr_3',
            en: 'Great conversation{name}! Feel free to ask me anything.',
            de: 'Tolles Gespräch{name}! Du kannst mich jederzeit alles fragen.',
            suggestions: [
              'My next milestone is acing my Fachinformatiker AP 1 certification exam.',
              'I want to expand my English IT vocabulary to collaborate in international teams.',
              'I plan to build a full-stack web application showcasing clean code principles.'
            ]
          }
        ]
      }
    },

    // Hauptfunktion: Erkennt Thema, Turn-Zähler und wählt abwechslungsreiche Antworten
    getUserName() {
      return (typeof localStorage !== 'undefined' && localStorage.getItem('fiae_user_name')) || '';
    },

    setUserName(name) {
      const clean = (name || '').trim();
      if (typeof setUserName === 'function') {
        setUserName(clean);
      } else if (typeof localStorage !== 'undefined') {
        if (clean) localStorage.setItem('fiae_user_name', clean);
        else localStorage.removeItem('fiae_user_name');
      }
    },

    salutation(withComma = true) {
      const name = this.getUserName();
      if (!name) return '';
      return withComma ? `, ${name}` : ` ${name}`;
    },

    getPartnerMeta(scenarioId) {
      const p = (typeof getCurrentPartnerMeta === 'function') ? getCurrentPartnerMeta() : { name: 'Nova', role: 'Englisch-Tutorin', isMale: false };
      const pFirstName = p.name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
      const pCleanRole = p.role.replace(/^Rolle:\s*/, '');

      if (scenarioId === 'economics') {
        const grade = (typeof getEconomicsGrade === 'function') ? getEconomicsGrade() : '11';
        return {
          name: pFirstName,
          fullName: p.name,
          role: pCleanRole,
          desc: `Internationalwirtschaft (Klasse ${grade})`,
          isMale: p.isMale
        };
      }
      if (scenarioId === 'beginner' || scenarioId === 'free') {
        return {
          name: pFirstName,
          fullName: p.name,
          role: pCleanRole,
          desc: 'Anfänger & Plaudern',
          isMale: p.isMale
        };
      }

      const meta = {
        standup: { name: 'Sarah', role: 'Scrum Master & Agile Coach', desc: 'Daily Scrum Standup' },
        interview: { name: 'Mr. Davis', role: 'Lead Software Architect', desc: 'IT-Vorstellungsgespräch' },
        support: { name: 'Alex', role: 'Senior Product Manager', desc: 'Bug-Report & Ticket Support' },
        architecture: { name: 'David', role: 'Senior Cloud Solutions Architect', desc: 'System-Architektur Review' },
        smalltalk: { name: 'Mark', role: 'Senior Developer & Teammate', desc: 'Kaffeepause & Smalltalk' },
        travel: { name: 'James', role: 'Head Concierge at Royal Grand Hotel', desc: 'Hotel & London Reisen' },
        quiz: { name: 'Prof. Miller', role: 'Vokabel-Coach', desc: 'Vokabel-Prüfer & Quiz' }
      };
      return meta[scenarioId] || {
        name: pFirstName,
        fullName: p.name,
        role: pCleanRole,
        desc: 'Konversation',
        isMale: p.isMale
      };
    },

    normalizeInput(raw) {
      if (!raw) return '';
      let text = raw.trim().toLowerCase();

      // Typo- & Phonetik-Normalisierung für typische Fehler von Lernenden
      const typoMap = [
        [/\bhow\s+old\s+r\s+u\b/g, 'how old are you'],
        [/\bur\b/g, 'your'],
        [/\bu\b/g, 'you'],
        [/\bwath\b/g, 'what'],
        [/\bwaht\b/g, 'what'],
        [/\bwat\b/g, 'what'],
        [/\bmornig\b/g, 'morning'],
        [/\byuor\b/g, 'your'],
        [/\byuo\b/g, 'you'],
        [/\bnam\b/g, 'name'],
        [/\bnaem\b/g, 'name'],
        [/\bplese\b/g, 'please'],
        [/\bplz\b/g, 'please'],
        [/\bteh\b/g, 'the'],
        [/\bwich\b/g, 'which'],
        [/\bbecaus\b/g, 'because'],
        [/\balot\b/g, 'a lot'],
        [/\banfanger\b/g, 'beginner'],
        [/\banfaenger\b/g, 'beginner'],
        [/\bworter\b/g, 'words'],
        [/\bwoerter\b/g, 'words'],
        [/\bunterhalten\b/g, 'chat'],
        [/\bplaudern\b/g, 'chat'],
        [/\beinfach\b/g, 'simple']
      ];

      for (const [pattern, repl] of typoMap) {
        text = text.replace(pattern, repl);
      }
      return text;
    },

    detectDirectIntent(rawInput, scenarioId) {
      const norm = this.normalizeInput(rawInput);
      const meta = this.getPartnerMeta(scenarioId);
      const userName = this.getUserName();

      // 0-Guest. Neue Person / Gast stellt sich vor ("Das ist Peter", "Hier ist Anna", "Ich bin Anna", etc.)
      const isGuestIntroMatch = (() => {
        // 1. Explizite Einführung: "das ist mein Freund/Kollege X", "hier ist X", "this is X"
        const introExplicit = rawInput.match(/\b(?:das\s+ist|this\s+is)\s+(?:mein\s+freund|meine\s+freundin|mein\s+kollege|meine\s+kollegin|my\s+friend|my\s+colleague|a\s+friend|ein\s+freund)?\s*([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (introExplicit) return introExplicit[1];

        const hierIstMatch = rawInput.match(/\b(?:hier\s+ist|hier\s+spricht|here\s+is)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (hierIstMatch) return hierIstMatch[1];

        const auchDaMatch = rawInput.match(/\b(?:ich\s+bin\s+auch\s+da|auch\s+hier)\s*[,.]?\s*(?:ich\s+hei[sß]+e|ich\s+bin|mein\s+name\s+ist)?\s*([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (auchDaMatch) return auchDaMatch[1];

        // 2. Wenn das Gespräch bereits läuft (turnCount > 1) und jemand sagt "Ich bin Peter" oder "My name is Peter"
        // (Bei turnCount <= 1 ist es der Hauptnutzer, der sich zu Beginn vorstellt!)
        if (userName && this.state.turnCount > 1) {
          const isCorrection = /\b(nicht|sondern|richtig|falsch|korrigier|eigentlich|statt)\b/i.test(rawInput);
          if (!isCorrection) {
            const newPersonIntro = rawInput.match(/\b(?:ich\s+bin|i\s+am|ich\s+hei[sß]+e|my\s+name\s+is)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
            if (newPersonIntro) {
              const candidate = newPersonIntro[1].trim();
              if (candidate.toLowerCase() !== userName.toLowerCase() && !/^(here|da|bereit|ready|beginner|developer|online|good|fine|ok|okay)$/i.test(candidate)) {
                return candidate;
              }
            }
          }
        }
        return null;
      })();

      if (isGuestIntroMatch) {
        let guestName = isGuestIntroMatch.charAt(0).toUpperCase() + isGuestIntroMatch.slice(1).toLowerCase();
        if (typeof activeGuests !== 'undefined') {
          if (!activeGuests.includes(guestName)) {
            activeGuests.push(guestName);
          }
        }
        const coachName = getCurrentPartnerMeta().name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        const hostName = userName || 'Istvan';

        if (activeGuests.length > 1) {
          return {
            id: 'intent_guest_joined_multi',
            isGuestIntro: true,
            en: `Welcome to our conversation, ${guestName}! 👋 Now we have a fantastic learning team with ${hostName}, ${activeGuests.filter(g => g !== guestName).join(', ')}, and you! What would you like to talk about today?`,
            de: `Willkommen in unserer Runde, ${guestName}! 👋 Jetzt haben wir ein tolles Team mit ${hostName}, ${activeGuests.filter(g => g !== guestName).join(', ')} und dir! Worüber möchtet ihr sprechen?`,
            suggestions: [
              `Hello ${coachName}! Glad to join the group.`,
              `Can you ask our group an English question?`,
              `Let's practice a team conversation together!`
            ]
          };
        } else {
          return {
            id: 'intent_guest_joined',
            isGuestIntro: true,
            en: `Welcome to our conversation, ${guestName}! 👋 It's fantastic to have you joining ${hostName} and me (${coachName}). What would you like to talk about today, ${guestName}?`,
            de: `Willkommen in unserer Runde, ${guestName}! 👋 Toll, dass du bei ${hostName} und mir (${coachName}) mitmachst. Worüber möchtest du sprechen, ${guestName}?`,
            suggestions: [
              `Hello ${coachName}! I would like to introduce myself in English.`,
              `Can you ask ${guestName} and ${hostName} a question?`,
              `Let's practice an English conversation together!`
            ]
          };
        }
      }

      // 0-Guest-Inquiry: Wer ist alles da? / Who is here?
      const isAskingWhoIsHere = /\b(wer\s+ist\s+(alles\s+)?(da|hier|im\s+gespräch|im\s+chat)|who\s+is\s+(all\s+)?(here|in\s+this\s+chat|with\s+us))\b/i.test(rawInput);
      if (isAskingWhoIsHere) {
        const coachName = getCurrentPartnerMeta().name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        const hostName = userName || 'Istvan';
        const guestsList = (typeof activeGuests !== 'undefined' && activeGuests.length > 0)
          ? activeGuests.join(', ')
          : 'aktuell keine Gäste (nur du und ich)';

        return {
          id: 'intent_who_is_here',
          isGuestIntro: true,
          en: `In our conversation right now we have: ${hostName}, our guest(s): ${typeof activeGuests !== 'undefined' && activeGuests.length ? activeGuests.join(', ') : 'none yet'}, plus me (${coachName}) as your coach!`,
          de: `In unserem Gespräch sind aktuell: ${hostName}, Gäste: ${guestsList}, plus ich (${coachName}) als euer Coach!`,
          suggestions: [
            `Can you ask our group a practice question?`,
            `Let's practice English together!`,
            `Teach us some useful conversation phrases.`
          ]
        };
      }

      // 0-NoName: Nutzer möchte ohne Namen üben
      if (/\b(without\s+(using\s+)?names?|ohne\s+namen?|keine?n?\s+namen?)\b/i.test(rawInput)) {
        const coachName = meta.name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        return {
          id: 'intent_no_name_requested',
          isNameUpdate: true,
          en: `Certainly! No problem at all. We can dive straight into practicing English. What would you like to talk about today?`,
          de: `Natürlich! Überhaupt kein Problem. Wir können direkt ins Englisch-Training einsteigen. Worüber möchtest du heute sprechen?`,
          suggestions: [
            "Can you teach me some useful everyday English words?",
            "Let's practice a simple conversation about hobbies.",
            "Can you check my sentences and correct any mistakes?"
          ]
        };
      }

      // 0A. Intelligente Erkennung von Name & Namens-Korrektur ("meine richtige nahme ist...", "nicht X sondern Y", etc.)
      let detectedNewName = null;
      let isExplicitCorrection = false;

      // 1. Muster: "nicht Isht sondern Istvan" / "not X but Y" / "heiße nicht X sondern Y"
      const nichtSondern = rawInput.match(/\b(?:nicht|not)\s+[A-Za-zÄÖÜäöüß]+\s+(?:sondern|but)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
      if (nichtSondern) {
        detectedNewName = nichtSondern[1];
        isExplicitCorrection = true;
      }

      // 2. Muster: "meine richtige nahme/name ist Istvan", "mein richtiger name ist Istvan"
      if (!detectedNewName) {
        const richtigeName = rawInput.match(/\b(?:meine?|mein)\s+(?:richtige[rn]?\s+)?na[h]?me\s+(?:ist|lautet|heisst)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (richtigeName) {
          detectedNewName = richtigeName[1];
          isExplicitCorrection = true;
        }
      }

      // 3. Muster: "my name is...", "call me...", "ich heiße eigentlich...", "nenne mich..."
      if (!detectedNewName) {
        const stdName = rawInput.match(/\b(?:my\s+(?:real\s+)?name\s+is|call\s+me|ich\s+hei[sß]+e(?:\s+eigentlich)?|mein\s+name\s+ist|nenne?\s+mich|ich\s+bin|i\s+am)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (stdName) {
          detectedNewName = stdName[1];
          if (/eigentlich|real/i.test(rawInput)) isExplicitCorrection = true;
        }
      }

      // 4. Einzellwort-Name (z.B. wenn der Nutzer zu Beginn einfach "Istvan" eintippt)
      if (!detectedNewName) {
        const cleanTrim = rawInput.trim();
        const isCommonWord = /^(hello|hi|yes|no|okay|cool|super|good|nice|what|who|how|why|thanks|thank|bitte|danke|hallo|nein|ja|morning|fine|great|ready|start|begin)$/i.test(cleanTrim);
        if (/^[A-Za-zÄÖÜäöüß]{2,25}$/.test(cleanTrim) && !isCommonWord) {
          detectedNewName = cleanTrim;
        }
      }

      if (detectedNewName) {
        let extractedName = detectedNewName.charAt(0).toUpperCase() + detectedNewName.slice(1).toLowerCase();
        this.setUserName(extractedName);
        if (typeof setUserName === 'function') {
          setUserName(extractedName);
        }

        // Verlauf bereinigen: Falsche Schreibweisen ersetzen
        if (typeof dialogHistories !== 'undefined' && dialogHistories[scenarioId]) {
          dialogHistories[scenarioId].forEach(msg => {
            if (msg.type === 'partner') {
              msg.textEn = (msg.textEn || '').replace(/\b(Ishta|Isht)\b/g, extractedName);
              msg.textDe = (msg.textDe || '').replace(/\b(Ishta|Isht)\b/g, extractedName);
            }
          });
        }

        const partnerTitle = getCurrentPartnerMeta().name;

        if (isExplicitCorrection) {
          return {
            id: 'intent_name_corrected',
            isNameUpdate: true,
            en: `Thank you for the correction! I have updated your name to ${extractedName}. Great to talk with you, ${extractedName}! What would you like to practice today?`,
            de: `Danke für die Richtigstellung! Ich habe deinen Namen sofort auf ${extractedName} korrigiert. Schön, mit dir zu sprechen, ${extractedName}! Worüber möchtest du heute sprechen?`,
            suggestions: [
              "Can you teach me some new conversational words?",
              "How can I practice my daily speaking?",
              "Can you correct my sentences when I write?"
            ]
          };
        } else {
          const pName = partnerTitle.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
          return {
            id: 'intent_name_saved',
            isNameUpdate: true,
            en: `Wonderful to meet you, ${extractedName}! 🎉 I have saved your name. Now we are ready: What would you like to practice today? We can chat about everyday life, learn useful vocabulary, or practice speaking!`,
            de: `Wunderbar, dich kennenzulernen, ${extractedName}! 🎉 Ich habe deinen Namen gespeichert. Jetzt kann es losgehen: Worüber möchtest du heute sprechen? Wir können über den Alltag plaudern, Vokabeln lernen oder freies Sprechen üben!`,
            suggestions: [
              "Can you teach me some useful everyday English words?",
              "Let's practice a simple conversation about hobbies.",
              "Can you check my sentences and correct any mistakes?"
            ]
          };
        }
      }

      // 0B. Benutzer fragt nach seinem eigenen Namen ("Wie heiße ich?", "Weißt du wie ich heiße?", "What is my name?", etc.)
      const isAskingOwnName = /\b(wie\s+(heisse|hei[sß]+e)\s+ich|wei[sß]+t\s+du\s+(wie\s+ich\s+heisse|wie\s+ich\s+hei[sß]+e|meinen\s+na[h]?men)|sag\s+(mir\s+)?meinen\s+na[h]?men|kennst\s+du\s+meinen\s+na[h]?men|wer\s+bin\s+ich|wie\s+ist\s+mein\s+na[h]?me|what\s+is\s+my\s+name|what\'s\s+my\s+name|do\s+you\s+know\s+my\s+name|who\s+am\s+i|do\s+you\s+remember\s+my\s+name|tell\s+me\s+my\s+name)\b/i.test(rawInput) || (rawInput.toLowerCase().includes('weißt du wer ich bin') || rawInput.toLowerCase().includes('weisst du wer ich bin') || rawInput.toLowerCase().includes('weißt du wie ich heisse'));

      if (isAskingOwnName) {
        const uName = this.getUserName();
        const pMeta = getCurrentPartnerMeta();
        const pName = pMeta.name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
        if (uName) {
          return {
            id: 'intent_user_name_inquiry',
            isNameInquiry: true,
            en: `Of course I know your name! You are ${uName}, and I am ${pName} (your English coach). Great to have you here, ${uName}! What would you like to practice today?`,
            de: `Natürlich kenne ich deinen Namen! Du bist ${uName}, und ich bin ${pName} (dein persönlicher Englisch-Coach). Dein Name ist fest gespeichert! Was möchtest du heute üben, ${uName}?`,
            suggestions: [
              "Can you teach me 2 new English words?",
              "Can you correct my sentences when I write?",
              "Let us talk about IT and programming."
            ]
          };
        } else {
          return {
            id: 'intent_user_name_unknown',
            isNameInquiry: true,
            en: `I do not know your name yet! What should I call you? You can tell me: "My name is Istvan".`,
            de: `Ich kenne deinen Namen noch nicht! Wie darf ich dich nennen? Sag mir einfach: „Mein Name ist Istvan“ oder tippe oben auf „Name eingeben“.`,
            suggestions: [
              "My name is Istvan.",
              "Call me Istvan.",
              "Can we just practice without names?"
            ]
          };
        }
      }

      // 0B. Benutzer bittet explizit um Fehler-Korrektur ("sag mir meine fehler", "korrigiere mich", "what were my mistakes", etc.)
      const isCorrectionRequest = /(\b(korrigier[a-z]*|korrektur[a-z]*|correct[a-z]*|mistake[s]?|fehler[n]?|falsch|feedback)\b|(\b(sag|zeige?|show|tell)\b.*\b(fehler|mistake)\b)|(\b(was|what)\b.*\b(fehler|mistake|falsch|wrong)\b)|(\b(hilf|help|how)\b.*\b(richtig|correct|improve)\b)|(\bwie\s+(sage|schreibe)\s+ich\s+das\s+richtig\b))/i.test(norm);

      if (isCorrectionRequest) {
        // Letzten relevanten Satz des Nutzers aus dem Chatverlauf ermitteln
        let lastUserText = '';
        if (typeof dialogHistories !== 'undefined' && dialogHistories[scenarioId]) {
          const hist = dialogHistories[scenarioId];
          for (let i = hist.length - 1; i >= 0; i--) {
            const m = hist[i];
            if (m.type === 'user' && !/(\b(korrigier|fehler|correct|mistake|feedback)\b)/i.test(m.text)) {
              lastUserText = m.text.trim();
              break;
            }
          }
        }

        if (lastUserText) {
          const analysis = typeof SentenceDoctor !== 'undefined' ? SentenceDoctor.analyze(lastUserText) : null;
          if (analysis && analysis.hasError) {
            const cleanTip = analysis.explanation.replace(/<[^>]*>/g, '').trim();
            return {
              id: 'intent_correction_report',
              en: `Here is your correction${this.salutation()}:
"${analysis.correctedText}"
${cleanTip}`,
          de: `Hier ist deine Korrektur${this.salutation()}:
„${analysis.correctedText}“
${cleanTip}`,
          suggestions: [analysis.correctedText, 'Can you explain this rule?', 'Let us continue chatting.']
            };
          } else {
            return {
              id: 'intent_correction_report_clean',
              en: `Your last sentence was completely correct${this.salutation()}! What would you like to practice next?`,
          de: `Dein letzter Satz war völlig fehlerfrei${this.salutation()}! Was möchtest du als Nächstes üben?`,
          suggestions: ['Teach me 2 new words.', 'Ask me an everyday question.', 'Let us continue chatting.']
            };
          }
        } else {
          return {
            id: 'intent_correction_report_empty',
            en: `Write or speak any English sentence, and I will check your grammar${this.salutation()}!`,
            de: `Schreib oder sprich einen englischen Satz, und ich überprüfe deine Grammatik${this.salutation()}!`,
            suggestions: [
              "Yesterday I worked on my programming project.",
              "I want learn more English words for my job.",
              `How old are you, ${meta.name}?`
            ]
          };
        }
      }

      // 1. Asking for Partner's Name / Identity ("What is your name?", "wath is your name?", "who are you?")
      if (/\b(what|tell|may|can)\b.*\b(your|ur)\s+(name|naem)\b/i.test(norm) ||
          /\bwho\s+(are\s+you|is\s+this|am\s+i\s+talking\s+to)\b/i.test(norm) ||
          /\bwhats\s+your\s+name\b/i.test(norm) ||
          /\bname\s*\?/i.test(norm)) {
        if (scenarioId === 'beginner' || scenarioId === 'free') {
          return {
            id: 'intent_name_beginner',
            en: `My name is ${meta.name}, your ${meta.role}. How are you doing today?`,
            de: `Mein Name ist ${meta.name}, deine ${meta.role}. Wie geht es dir heute?`,
            suggestions: [
              `Nice to meet you, ${meta.name}! I am ready to practice.`,
              `Hello ${meta.name}! What are your favorite topics?`,
              `Can you teach me some easy English words?`
            ]
          };
        } else if (scenarioId === 'standup') {
          return {
            id: 'intent_name_standup',
            en: `Good morning! My name is ${meta.name}, your ${meta.role}. What did you accomplish yesterday?`,
            de: `Guten Morgen! Mein Name ist ${meta.name}, deine ${meta.role}. Was hast du gestern geschafft?`,
            suggestions: [
              "Nice to meet you, Sarah! Yesterday I fixed an issue in our codebase.",
              "Good morning Sarah! Yesterday I worked on the database queries.",
              "Hello Sarah, what is the main goal for today's sprint?"
            ]
          };
        } else if (scenarioId === 'interview') {
          return {
            id: 'intent_name_interview',
            en: `Hello, my name is ${meta.name}. Could you briefly introduce yourself?`,
          de: `Hallo, mein Name ist ${meta.name}. Können Sie sich kurz vorstellen?`,
          suggestions: ['Hello Mr. Davis, I am a software developer.', 'Nice to meet you. I specialize in backend code.', 'Ready when you are!']
          };
        } else if (scenarioId === 'support') {
          return {
            id: 'intent_name_support',
            en: `Hi! My name is ${meta.name}. Can you check the database connection pool ticket?`,
          de: `Hi! Mein Name ist ${meta.name}. Kannst du das Datenbank-Ticket prüfen?`,
          suggestions: ['I am looking into the connection pool now.', 'Do we have error logs for the checkout?', 'On it!']
          };
        } else if (scenarioId === 'smalltalk') {
          return {
            id: 'intent_name_smalltalk',
            en: `Hey! I am ${meta.name}. How is your day going so far?`,
          de: `Hey! Ich bin ${meta.name}. Wie läuft dein Tag bisher?`,
          suggestions: ['Pretty good, thanks! How about you?', 'Busy working on my code.', 'Just taking a short break.']
          };
        } else if (scenarioId === 'travel') {
          return {
            id: 'intent_name_travel',
            en: `Welcome to London! My name is ${meta.name}. How can I help you today?`,
          de: `Willkommen in London! Mein Name ist ${meta.name}. Wie kann ich dir heute helfen?`,
          suggestions: ['I have a reservation under my name.', 'Can I check in early?', 'Where is the nearest tube station?']
          };
        } else {
          return {
            id: 'intent_name_general',
            en: `My name is ${meta.name}. What would you like to practice today?`,
          de: `Mein Name ist ${meta.name}. Was möchtest du heute üben?`,
          suggestions: ['Let us practice daily conversation.', 'Can you teach me some new words?', 'How are you doing today?']
          };
        }
      }

      // 2. Asking for Partner's Age / "How old are you?" / "What is your age?" / "Wie alt bist du?"
      if (/\b(how\s+old(\s+(are\s+you|r\s+u|is\s+she|is\s+he))?|what\s+is\s+your\s+age|whats\s+your\s+age|your\s+age|ur\s+age|wie\s+alt\s+bist\s+du)\b/i.test(norm)) {
        if (scenarioId === 'economics') {
        const grade = (typeof getEconomicsGrade === 'function') ? getEconomicsGrade() : '11';
        if (grade === '11') {
          return {
            id: 'econ_fallback_11_' + this.state.turnCount,
            en: `Excellent economic observation${this.salutation()}! In Grade 11, we focus on the fundamental mechanics of trade: why countries exchange goods, how exchange rates fluctuate, and how specialization generates wealth. What concept would you like to explore next?`,
            de: `Hervorragende volkswirtschaftliche Beobachtung${this.salutation()}! In Klasse 11 konzentrieren wir uns auf die Grundmechanismen des Handels: Warum Staaten Güter tauschen, wie Wechselkurse schwanken und wie Spezialisierung Wohlstand schafft. Welches Konzept möchtest du vertiefen?`,
            suggestions: [
              "Can you explain opportunity costs with an everyday example?",
              "What happens when the Euro becomes stronger against the US Dollar?",
              "Why do multinational companies open production sites in developing countries?"
            ]
          };
        } else if (grade === '12') {
          return {
            id: 'econ_fallback_12_' + this.state.turnCount,
            en: `Very perceptive point${this.salutation()}! For Grade 12, we critically evaluate both sides: while protectionist tariffs shield domestic workers, they also invite retaliatory trade barriers and raise consumer inflation. How would you weigh these opposing interests?`,
            de: `Sehr scharfsinniger Punkt${this.salutation()}! Für die 12. Klasse müssen wir beide Seiten kritisch abwägen: Während Schutzzölle heimische Arbeitsplätze sichern, provozieren sie auch Vergeltungsmaßnahmen und erhöhen die Inflation für Verbraucher. Wie würdest du diese Interessen gewichten?`,
            suggestions: [
              "Protectionism protects domestic jobs, but increases prices for consumers.",
              "Nearshoring helps avoid long shipping routes and political risks.",
              "Can you give me an example of non-tariff trade barriers?"
            ]
          };
        } else {
          return {
            id: 'econ_fallback_13_' + this.state.turnCount,
            en: `A sophisticated macroeconomic observation${this.salutation()}! In Abitur examinations, examiners look for rigorous argumentation: linking monetary policy, geopolitical de-risking, and multilateral WTO rules. Let\'s formulate a well-structured thesis on this topic!`,
            de: `Eine anspruchsvolle makroökonomische Beobachtung${this.salutation()}! In Abiturprüfungen erwarten Prüfer eine präzise Argumentation: Die Verknüpfung von Geldpolitik, geopolitischem De-risking und multilateralen WTO-Regeln. Lass uns dazu eine strukturierte These formulieren!`,
            suggestions: [
              "On the one hand, open markets maximize efficiency, but on the other, they create dependencies.",
              "How does central bank interest rate policy combat imported inflation?",
              "Let\'s practice a typical oral Abitur exam question on modern trade policy."
            ]
          };
        }
      }

      if (scenarioId === 'economics') {
      const grade = getEconomicsGrade();
      const uGreeting = userName ? `Hello ${userName}! ` : 'Hello and welcome! ';
      const uGreetingDe = userName ? `Hallo ${userName}! ` : 'Hallo und herzlich willkommen! ';
      if (grade === '11') {
        promptEn = `${uGreeting}I am ${partnerFirstName}, your International Economics coach for Gymnasium Grade 11. Today we explore foundational trade concepts: Why do nations trade, and how does David Ricardo\'s comparative advantage work? What would you like to discuss first?`;
        promptDe = `${uGreetingDe}Ich bin ${partnerFirstName}, dein Coach für Internationale Wirtschaft im Gymnasium Klasse 11. Heute behandeln wir die Grundlagen des Welthandels: Warum betreiben Staaten Außenhandel und wie funktioniert der komparative Kostenvorteil nach David Ricardo? Worüber möchtest du zuerst sprechen?`;
      } else if (grade === '12') {
        promptEn = `${uGreeting}I am ${partnerFirstName}, your Economics tutor for Grade 12 (Qualification Phase 1). In this course, we examine contentious trade policies: free trade versus protectionism, customs tariffs, supply chain resilience, and ESG standards. Which economic challenge shall we examine?`;
        promptDe = `${uGreetingDe}Ich bin ${partnerFirstName}, dein Wirtschafts-Tutor für Klasse 12 (Qualifikationsphase 1). In diesem Halbjahr analysieren wir wirtschaftspolitische Kontroversen: Freihandel vs. Protektionismus, Schutzzölle, Lieferketten-Resilienz und ESG-Standards. Welche wirtschaftliche Herausforderung wollen wir untersuchen?`;
      } else {
        promptEn = `${uGreeting}I am ${partnerFirstName}, your Grade 13 & Abitur Economics lecturer. Here we prepare for high-level Abitur examinations: central bank monetary policies, global currency fluctuations, WTO arbitration, and geoeconomic decoupling. Which Abitur debate or exam topic would you like to practice today?`;
        promptDe = `${uGreetingDe}Ich bin ${partnerFirstName}, dein Fachdozent für Klasse 13 und die Abiturprüfung. Hier trainieren wir für anspruchsvolle Abitur-Klausuren und mündliche Prüfungen: Geldpolitik der Zentralbanken, Währungskrisen, WTO-Schlichtung und geoeconomische Entkopplung. Welche Abitur-Debatte möchtest du heute durchgehen?`;
      }
    } else if (scenarioId === 'beginner') {
          return {
            id: 'intent_age_beginner',
            en: `I am 28 years old. How old are you${this.salutation()}?`,
            de: `Ich bin 28 Jahre alt. Wie alt bist du${this.salutation()}?`,
            suggestions: [
              "I am in my twenties.",
              "I am in my thirties.",
              "I am in my forties.",
              "Can you teach me how to say numbers in English?"
            ]
          };
        } else if (scenarioId === 'standup') {
          return {
            id: 'intent_age_standup',
            en: `I am 31 years old. How old are you${this.salutation()}?`,
            de: `Ich bin 31 Jahre alt. Wie alt bist du${this.salutation()}?`,
            suggestions: [
              "I am in my thirties.",
              "I am in my twenties.",
              "Nice! Now let's continue with our daily standup.",
              "How long have you been a Scrum Master?"
            ]
          };
        } else if (scenarioId === 'interview') {
          return {
            id: 'intent_age_interview',
            en: `I have been leading engineering teams for 15 years. How long have you been coding?`,
          de: `Ich leite seit 15 Jahren Entwicklungsteams. Wie lange programmierst du schon?`,
          suggestions: ['I have been coding for two years.', 'I recently finished my FIAE training.', 'I started learning web development last year.']
          };
        } else {
          return {
            id: 'intent_age_general',
            en: `I am around 30 years old! How old are you${this.salutation()}?`,
          de: `Ich bin um die 30 Jahre alt! Wie alt bist du${this.salutation()}?`,
          suggestions: ['I am in my twenties.', 'I am in my thirties.', 'I am in my forties.']
          };
        }
      }

      // 3. "I am a beginner" / "I want to learn English" / "My English is not good" / "Sprache lernen"
      if (/\b(i\s+am\s+(a\s+)?(complete\s+)?beginner|anf[aä]nger|learn\s+english|english\s+lernen|sprach[en]*\s+lernen|my\s+english\s+is\s+(bad|poor|not\s+good)|help\s+me\s+(to\s+)?learn|teach\s+me|einfach\s+lernen|anf[aä]ngerlevel)\b/i.test(norm)) {
        return {
          id: 'intent_beginner_welcome',
          en: `You are doing great! Do not worry about mistakes. What topic would you like to try?`,
          de: `Du machst das super! Mach dir keine Sorgen wegen Fehlern. Welches Thema möchtest du probieren?`,
          suggestions: ['Let us talk about hobbies.', 'Teach me simple English words.', 'How was your day?']
        };
      }

      // 4. "Can we just chat / converse?" / "Einfach unterhalten / plaudern"
      if (/\b(can\s+we\s+(just\s+)?chat|just\s+talk|einfach\s+unterhalten|lass\s+uns\s+plaudern|nur\s+reden|talk\s+with\s+me|speak\s+with\s+me|let('?s)?\s+talk|let('?s)?\s+chat|unterhaltung)\b/i.test(norm)) {
        return {
          id: 'intent_just_chat',
          en: `I would love to just chat! How was your day today?`,
          de: `Sehr gerne plaudern wir einfach! Wie war dein Tag heute?`,
          suggestions: ['Today was good, thank you!', 'I was busy learning English and programming.', 'A bit tired, but good.']
        };
      }

      // 5. Asking for Words / Vocabulary ("teach me words", "give me words", "neue wörter", "bring mir wörter bei")
      if (/\b(teach\s+me\s+words|give\s+me\s+words|neue\s+w[oö]rter|w[oö]rter\s+lernen|vokabeln\s+lernen|bring\s+mir\s+w[oö]rter\s+bei|learn\s+words|more\s+words|vokabeln|words\s+please)\b/i.test(norm)) {
        return {
          id: 'intent_teach_words',
          en: `Here are two great words: 1. Reliable (zuverlässig) and 2. Breakthrough (Durchbruch). Can you use one in a sentence?`,
          de: `Hier sind zwei tolle Wörter: 1. Reliable (zuverlässig) und 2. Breakthrough (Durchbruch). Kannst du einen Satz damit bilden?`,
          suggestions: ['Our server is very reliable.', 'This is a real breakthrough for our team.', 'Teach me two more words!']
        };
      }

      // 6. Word Translation & "How do you say X in English?" / "Was heißt X?" / "Was bedeutet X?"
      if (/\b(how\s+do\s+you\s+say|what\s+is\s+.*in\s+english|wie\s+sagt\s+man|was\s+hei[sß]+t\s+.*auf\s+englisch|what\s+does\s+.*mean|was\s+bedeutet)\b/i.test(norm)) {
        return {
          id: 'intent_word_translation',
          en: `In English, "Danke" is "Thank you", and "Bitte" is "Please". What other word would you like to know?`,
          de: `Auf Englisch heißt „Danke“ „Thank you“ und „Bitte“ „Please“. Welches andere Wort möchtest du wissen?`,
          suggestions: ['How do you say Feierabend in English?', 'How do you say Schnitzeljagd?', 'Thank you very much!']
        };
      }

      // 7. Where are you from / Where do you live? / Woher kommst du?
      if (/\b(where\s+(are\s+you\s+from|do\s+you\s+live|do\s+you\s+come\s+from)|woher\s+kommst\s+du|wo\s+wohnst\s+du|where\s+from)\b/i.test(norm)) {
        return {
          id: 'intent_origin_location',
          en: `I am from London in the UK. Where are you from${this.salutation()}?`,
          de: `Ich komme aus London in England. Woher kommst du${this.salutation()}?`,
          suggestions: ['I am from Germany.', 'I live in a small town near the mountains.', 'I live in Frankfurt.']
        };
      }

      // 8. Hobbies & Free Time / Was machst du in der Freizeit?
      if (/\b(what\s+are\s+your\s+hobbies|what\s+do\s+you\s+do\s+in\s+your\s+free\s+time|your\s+hobby|hobbys|was\s+machst\s+du\s+in\s+deiner\s+freizeit|freizeit)\b/i.test(norm)) {
        return {
          id: 'intent_hobbies_freetime',
          en: `I love reading, music, and learning languages. What are your favorite hobbies?`,
          de: `Ich mag Lesen, Musik und Sprachen lernen. Was sind deine Lieblingshobbys?`,
          suggestions: ['I love making music with synthesizers.', 'I enjoy programming and gaming.', 'I like walking outdoors and relaxing.']
        };
      }

      // 9. Food & Drinks / Lieblingsessen / Kaffee / Pizza
      if (/\b(what\s+do\s+you\s+like\s+to\s+eat|favorite\s+food|do\s+you\s+like\s+coffee|do\s+you\s+drink\s+coffee|lieblingsessen|was\s+isst\s+du|pizza|burger|pasta)\b/i.test(norm)) {
        return {
          id: 'intent_food_drinks',
          en: `I love coffee, pasta, and pizza! What is your favorite food?`,
          de: `Ich liebe Kaffee, Pasta und Pizza! Was isst du am liebsten?`,
          suggestions: ['My favorite food is Italian pizza.', 'I love fresh sushi and Asian food.', 'I just need a strong coffee!']
        };
      }

      // 10. Pets & Animals / Haustiere / Hund / Katze
      if (/\b(do\s+you\s+have\s+(a\s+)?(pet|dog|cat)|pets|haustier|hast\s+du\s+einen\s+hund|katze|tiere)\b/i.test(norm)) {
        return {
          id: 'intent_pets_animals',
          en: `I love dogs and cats! Do you have any pets?`,
          de: `Ich mag Hunde und Katzen! Hast du Haustiere?`,
          suggestions: ['Yes, I have a cat at home.', 'No, but I would love to have a dog.', 'I do not have any pets right now.']
        };
      }

      // 11. Music & Entertainment / Musik
      if (/\b(what\s+music\s+do\s+you\s+like|favorite\s+music|what\s+kind\s+of\s+music|welche\s+musik|lieblingsmusik)\b/i.test(norm)) {
        return {
          id: 'intent_music_taste',
          en: `I listen to electronic and rock music. What music do you enjoy?`,
          de: `Ich höre gerne elektronische Musik und Rock. Welche Musik magst du?`,
          suggestions: ['I listen to electronic synth music.', 'I love rock and metal.', 'I enjoy relaxing acoustic songs.']
        };
      }

      // 12. Weather / Wetter / Cold / Sunny / Raining
      if (/\b(how\s+is\s+the\s+weather|what\s+is\s+the\s+weather\s+like|wie\s+ist\s+das\s+wetter|is\s+it\s+cold|is\s+it\s+sunny|is\s+it\s+raining|wetter)\b/i.test(norm)) {
        return {
          id: 'intent_weather_chat',
          en: `It is a bit cloudy here today. How is the weather with you?`,
          de: `Hier ist es heute etwas wolkig. Wie ist das Wetter bei dir?`,
          suggestions: ['It is warm and sunny here.', 'It is raining outside today.', 'It is cold and windy.']
        };
      }

      // 13. Telling a Joke / Humor
      if (/\b(tell\s+me\s+a\s+joke|something\s+funny|make\s+me\s+laugh|erz[aä]hl.*witz|hast\s+du\s+einen\s+witz|funny)\b/i.test(norm)) {
        return {
          id: 'intent_tell_joke',
          en: `Why do programmers prefer dark mode? Because light attracts bugs! Did you like it?`,
          de: `Warum bevorzugen Programmierer Dark Mode? Weil Licht Bugs anzieht! Gefällt er dir?`,
          suggestions: ['Haha, good one!', 'Tell me another joke!', 'That is very true for developers.']
        };
      }

      // 14. Feelings & Emotions / Müde / Gestresst
      if (/\b(i\s+am\s+(very\s+)?(tired|exhausted|stressed|happy|sad|bored)|ich\s+bin\s+m[uü]de|gestresst)\b/i.test(norm)) {
        return {
          id: 'intent_feelings_empathy',
          en: `Take a short break${this.salutation()}! We can do a very easy exercise, or just relax. What do you prefer?`,
          de: `Mach eine kurze Pause${this.salutation()}! Wir können eine ganz leichte Übung machen oder entspannen. Was möchtest du?`,
          suggestions: ['Let us just do a very simple dialogue.', 'I will take a short coffee break.', 'I feel better now, let us continue!']
        };
      }

      // 15. Ask me a Question / Frag mich was
      if (/\b(ask\s+me\s+a\s+question|frag\s+mich\s+(etwas|was)|give\s+me\s+a\s+question|ask\s+me\s+something)\b/i.test(norm)) {
        return {
          id: 'intent_ask_me_question',
          en: `Here is a question for you: What did you have for breakfast today?`,
          de: `Hier ist eine Frage für dich: Was hast du heute gefrühstückt?`,
          suggestions: ['I had coffee and toast.', 'I had a bowl of oatmeal with fruit.', 'I skipped breakfast this morning.']
        };
      }

      // 16. Are you real / AI / Robot?
      if (/\b(are\s+you\s+(a\s+)?(robot|ai|real|human)|bist\s+du\s+(ein\s+roboter|eine\s+ki))\b/i.test(norm)) {
        return {
          id: 'intent_ai_identity',
          en: `I am your AI English coach, here to help you practice anytime! What would you like to work on?`,
          de: `Ich bin dein KI-Englisch-Coach, um dir jederzeit beim Üben zu helfen! Woran möchtest du arbeiten?`,
          suggestions: ['Let us practice daily conversation.', 'Can you test my vocabulary?', 'Teach me some business English.']
        };
      }

      // 17. Short Affirmations ("yes", "no", "okay", "cool", "super", "genau", "danke")
      if (/^(yes|yeah|yep|sure|ok|okay|cool|super|great|thanks|thank you|danke|genau|ja|nein|no)\b/i.test(norm)) {
        return {
          id: 'intent_short_affirmation',
          en: `Awesome! What would you like to talk about next?`,
          de: `Klasse! Worüber möchtest du als Nächstes sprechen?`,
          suggestions: ['Tell me about your hobbies.', 'Can you teach me two new words?', 'Let us practice an interview question.']
        };
      }

      // 18. Asking "How are you? / How are you doing?"
      if (/\b(how\s+are\s+you|how\s+r\s+u|how\s+is\s+it\s+going|hows\s+it\s+going|wie\s+geht\s+es\s+dir|wie\s+gehts)\b/i.test(norm)) {
        return {
          id: 'intent_how_are_you',
          en: `I am doing great, thank you! How are you doing today?`,
          de: `Mir geht es super, danke! Wie geht es dir heute?`,
          suggestions: ['I am doing well, thank you!', 'Pretty busy, but having a good day.', 'A bit tired, but happy to learn English.']
        };
      }

      // 19. Simple greeting (Hello, Good morning, Hi) without technical update
      if (/^(hello|hi|hey|good\s+morning|good\s+day|guten\s+morgen|hallo|servus)\b/i.test(norm) && norm.length < 25) {
        return {
          id: 'intent_greeting_simple',
          en: `Good morning${this.salutation()}! How are you doing today?`,
          de: `Guten Morgen${this.salutation()}! Wie geht es dir heute?`,
          suggestions: ['Good morning! I am ready to practice.', 'Doing well, thank you! What are we working on today?', 'Hello! How are you?']
        };
      }

      // 20. Questions about the Partner's Job / Role ("What is your job?", "What do you do?")
      if (/\b(what\s+is\s+your\s+job|what\s+do\s+you\s+do|what\s+are\s+your\s+tasks|was\s+machst\s+du|was\s+ist\s+deine\s+aufgabe)\b/i.test(norm)) {
        return {
          id: 'intent_partner_role',
          en: `I am your ${meta.role}. I am here to help you practice English! What would you like to talk about?`,
          de: `Ich bin deine ${meta.role}. Ich helfe dir beim Englischüben! Worüber möchtest du sprechen?`,
          suggestions: ['Let us practice a realistic work dialogue.', 'Teach me some phrases for meetings.', 'How should I answer in a standup?']
        };
      }

      // 21. Questions about Standup / "What are we doing in this meeting?"
      if (/\b(what\s+are\s+we\s+doing|what\s+is\s+standup|what\s+should\s+i\s+say|was\s+machen\s+wir|was\s+soll\s+ich\s+sagen)\b/i.test(norm)) {
        return {
          id: 'intent_explain_standup',
          en: `In a standup, we answer three questions: 1. What did you do yesterday? 2. What are you doing today? 3. Any blockers?`,
          de: `Im Standup beantworten wir drei Fragen: 1. Was hast du gestern gemacht? 2. Was machst du heute? 3. Gibt es Blocker?`,
          suggestions: ['Yesterday I fixed a database issue.', 'Today I will write unit tests.', 'No blockers for me today.']
        };
      }

      // 22. Asking for Help / "I don't understand / Repeat please"
      if (/\b(i\s+do\s*not\s+understand|i\s+dont\s+understand|can\s+you\s+help|repeat\s+please|nicht\s+verstanden|hilfe|hilf\s+mir)\b/i.test(norm)) {
        return {
          id: 'intent_help_understand',
          en: `No problem at all! Let us take it step by step. What would you like to practice?`,
          de: `Gar kein Problem! Wir machen es Schritt für Schritt. Was möchtest du üben?`,
          suggestions: ['Please ask me a very simple question.', 'Can you explain that word in German?', 'Let us start with basic phrases.']
        };
      }

      // 23. Asking about German Language ("Do you speak German?")
      if (/\b(do\s+you\s+speak\s+german|sprichst\s+du\s+deutsch|can\s+you\s+speak\s+german|verstehst\s+du\s+deutsch)\b/i.test(norm)) {
        return {
          id: 'intent_speak_german',
          en: `I understand German, but let us try simple English together! What would you like to say?`,
          de: `Ich verstehe Deutsch, aber lass uns einfaches Englisch üben! Was möchtest du sagen?`,
          suggestions: ['I want to say that I worked on the server.', 'How do you say Feierabend?', 'Okay, let us speak English!']
        };
      }

      // 24. Technical Questions ("What is SQL / Git / Python / Docker / Index?")
      if (/\bwhat\s+is\s+sql\b/i.test(norm) || /\bwas\s+ist\s+sql\b/i.test(norm)) {
        return {
          id: 'intent_what_is_sql',
          en: `SQL stands for Structured Query Language. It is used to query databases. Would you like to practice SQL terms?`,
          de: `SQL steht für Structured Query Language und wird für Datenbankabfragen genutzt. Möchtest du SQL-Begriffe üben?`,
          suggestions: ['Yes, teach me 3 SQL terms.', 'I use SQL SELECT and JOIN queries daily.', 'What is a database index?']
        };
      }

      if (/\bwhat\s+is\s+git\b/i.test(norm) || /\bwas\s+ist\s+git\b/i.test(norm)) {
        return {
          id: 'intent_what_is_git',
          en: `Git is a version control system used to track changes in code. Do you use Git every day?`,
          de: `Git ist ein Versionskontrollsystem zur Nachverfolgung von Code-Änderungen. Nutzt du Git täglich?`,
          suggestions: ['Yes, I use git commit and git push daily.', 'What is the difference between git merge and rebase?', 'Git is very important for our team.']
        };
      }

      // 25. Status: Off / Vacation / Weekend / Sick leave
      if (/\b(yesterday\s+i\s+was\s+(sick|ill|off|absent|on\s+vacation)|i\s+was\s+sick|war\s+krank|hatte\s+urlaub)\b/i.test(norm)) {
        return {
          id: 'intent_sick_leave',
          en: `Welcome back${this.salutation()}! I hope you had some good rest. What is your focus for today?`,
          de: `Willkommen zurück${this.salutation()}! Ich hoffe, du konntest dich gut erholen. Was ist dein Fokus für heute?`,
          suggestions: ['I am catching up on unread tickets.', 'Today I will review open pull requests.', 'Taking it easy today.']
        };
      }

      // 26. Status: No blockers
      if (/\b(no\s+blockers|no\s+blocker|dont\s+have\s+any\s+blockers|everything\s+is\s+fine|keine\s+blocker)\b/i.test(norm)) {
        return {
          id: 'intent_no_blockers',
          en: `Awesome! Great to hear there are no blockers. Keep up the great work!`,
          de: `Klasse! Schön zu hören, dass es keine Hindernisse gibt. Weiter so!`,
          suggestions: ['I will finish the ticket before lunch.', 'Let us review the sprint board.', 'Thanks!']
        };
      }

      // 27. General direct question ending with '?'
      if (/\?\s*$/.test(norm.trim())) {
        return {
          id: 'intent_general_question',
          en: `That is a great question${this.salutation()}! What are your thoughts on it?`,
          de: `Das ist eine gute Frage${this.salutation()}! Was denkst du darüber?`,
          suggestions: ['I think it is very useful for developers.', 'I am still learning about it.', 'Could you give me an example?']
        };
      }

      return null;
    },

    generateResponse(userInput, scenarioId) {
      this.state.turnCount++;
      const lower = userInput.toLowerCase();
      const scenario = this.scenarios[scenarioId] || this.scenarios.beginner || this.scenarios.standup;
      const meta = this.getPartnerMeta(scenarioId);

      // 1. ZUERST: Prüfen auf direkte Fragen & Gesprächsabsichten (Name, Fehler, Alter, Begrüßung, Rolle, etc.)
      const directReply = this.detectDirectIntent(userInput, scenarioId);
      if (directReply) {
        return directReply;
      }

      // 2. Falls keine direkte Frage: Thema anhand von Schlüsselwörtern ermitteln
      let topicList = [];

      // Allgemeine & Anfänger-Themen
      if (lower.includes('name') || lower.includes('hello') || lower.includes('meet') || lower.includes('day') || lower.includes('introduce')) {
        topicList.push('personal');
      }
      if (lower.includes('hobby') || lower.includes('music') || lower.includes('synth') || lower.includes('beat') || lower.includes('guitar') || lower.includes('walk')) {
        topicList.push('hobbies', 'music_hobby');
      }
      if (lower.includes('food') || lower.includes('eat') || lower.includes('pizza') || lower.includes('coffee') || lower.includes('tea') || lower.includes('drink')) {
        topicList.push('food_drinks', 'coffee_break');
      }
      if (lower.includes('word') || lower.includes('vocab') || lower.includes('learn') || lower.includes('sentence') || lower.includes('teach')) {
        topicList.push('learning_vocab');
      }
      if (lower.includes('weather') || lower.includes('sunny') || lower.includes('rain') || lower.includes('cold') || lower.includes('cloud')) {
        topicList.push('weather_daily', 'coffee_break');
      }
      if (lower.includes('chat') || lower.includes('talk') || lower.includes('conversation') || lower.includes('speak')) {
        topicList.push('casual_chat');
      }

      // Technische Themen
      if (lower.includes('database') || lower.includes('query') || lower.includes('sql') || lower.includes('index') || lower.includes('table') || lower.includes('timeout')) {
        topicList.push('database', 'database_incident');
      }
      if (lower.includes('test') || lower.includes('tests') || lower.includes('unit test') || lower.includes('coverage') || lower.includes('qa')) {
        topicList.push('testing');
      }
      if (lower.includes('bug') || lower.includes('ticket') || lower.includes('fix') || lower.includes('issue') || lower.includes('error') || lower.includes('exception')) {
        topicList.push('bug_fix', 'database_incident');
      }
      if (lower.includes('clean code') || lower.includes('solid') || lower.includes('architecture') || lower.includes('refactor') || lower.includes('class') || lower.includes('api')) {
        topicList.push('clean_code');
      }
      if (lower.includes('hotel') || lower.includes('room') || lower.includes('london') || lower.includes('passport') || lower.includes('reservation') || lower.includes('tube')) {
        topicList.push('london_hotel');
      }
      if (lower.includes('experience') || lower.includes('developer') || lower.includes('career') || lower.includes('fiae') || lower.includes('programming')) {
        topicList.push('experience', 'clean_code');
      }
      if (lower.includes('team') || lower.includes('scrum') || lower.includes('feedback') || lower.includes('colleague') || lower.includes('review')) {
        topicList.push('teamwork');
      }
      if (lower.includes('blocker') || lower.includes('blocked') || lower.includes('stuck') || lower.includes('help')) {
        topicList.push('blocker');
      }

      // Internationalwirtschaft (Gymnasium & Abitur) Themen-Erkennung
      if (scenarioId === 'economics') {
        if (lower.includes('ricardo') || lower.includes('comparative') || lower.includes('advantage') || lower.includes('opportunity cost') || lower.includes('smith') || lower.includes('autarky') || lower.includes('specialize') || lower.includes('wine') || lower.includes('cloth')) {
          topicList.push('comparative_advantage');
        }
        if (lower.includes('export') || lower.includes('import') || lower.includes('surplus') || lower.includes('deficit') || lower.includes('trade balance') || lower.includes('currency') || lower.includes('exchange rate') || lower.includes('dollar') || lower.includes('euro')) {
          topicList.push('trade_balance');
        }
        if (lower.includes('tariff') || lower.includes('tariffs') || lower.includes('protect') || lower.includes('protectionism') || lower.includes('quota') || lower.includes('subsid') || lower.includes('trade war') || lower.includes('retaliat') || lower.includes('barrier')) {
          topicList.push('tariffs_protectionism');
        }
        if (lower.includes('supply chain') || lower.includes('resilience') || lower.includes('disrupt') || lower.includes('nearshor') || lower.includes('reshor') || lower.includes('logistics') || lower.includes('just-in-time') || lower.includes('bottleneck')) {
          topicList.push('supply_chains');
        }
        if (lower.includes('fdi') || lower.includes('direct investment') || lower.includes('multinational') || lower.includes('mnc') || lower.includes('emerging market') || lower.includes('developing')) {
          topicList.push('fdi_multinationals');
        }
        if (lower.includes('sustainab') || lower.includes('fair trade') || lower.includes('esg') || lower.includes('cbam') || lower.includes('carbon') || lower.includes('climate') || lower.includes('green')) {
          topicList.push('sustainability_fairtrade');
        }
        if (lower.includes('fed') || lower.includes('federal reserve') || lower.includes('ecb') || lower.includes('central bank') || lower.includes('monetary') || lower.includes('interest rate') || lower.includes('inflation')) {
          topicList.push('monetary_centralbanks');
        }
        if (lower.includes('wto') || lower.includes('imf') || lower.includes('world bank') || lower.includes('single market') || lower.includes('four freedoms') || lower.includes('usmca') || lower.includes('treaty') || lower.includes('bloc')) {
          topicList.push('institutions_treaties');
        }
        if (lower.includes('geopolitic') || lower.includes('decoupling') || lower.includes('de-risking') || lower.includes('derisking') || lower.includes('sanction') || lower.includes('semiconductor') || lower.includes('friendshoring') || lower.includes('autonomy')) {
          topicList.push('geopolitics_decoupling');
        }
        if (lower.includes('abitur') || lower.includes('exam') || lower.includes('essay') || lower.includes('debate') || lower.includes('argument') || lower.includes('thesis') || lower.includes('synthes') || lower.includes('klausur')) {
          topicList.push('abitur_exam_debates');
        }
      }

      // 3. Kandidaten aus dem Szenario sammeln
      let candidates = [];
      for (const t of topicList) {
        if (scenario[t] && Array.isArray(scenario[t])) {
          candidates.push(...scenario[t]);
        }
      }

      // Falls spezifische Themen zutreffen, ausfiltern & wählen
      if (candidates.length > 0) {
        let unusedCandidates = candidates.filter(c => !this.state.usedResponseKeys.has(c.id));
        if (unusedCandidates.length === 0) {
          candidates.forEach(c => this.state.usedResponseKeys.delete(c.id));
          unusedCandidates = candidates;
        }

        let chosen = unusedCandidates[(this.state.turnCount - 1) % unusedCandidates.length] || unusedCandidates[0];
        if (chosen && chosen.id) {
          this.state.usedResponseKeys.add(chosen.id);
        }
        return chosen;
      }

      // 4. INTELLIGENTER KONVERSATIONS-FALLBACK (Kein starres Wiederholen desselben Satzes!)
      if (scenarioId === 'beginner') {
        const beginnerFallbacks = [
          {
            en: `That sounds interesting${this.salutation()}! Tell me more about that.`,
            de: `Das klingt interessant${this.salutation()}! Erzähl mir mehr darüber.`,
            suggestions: [
              "And how about you? What are you doing today?",
              "Can you teach me 2 useful English words?",
              `What is your favorite hobby, ${meta.name}?`
            ]
          },
          {
            en: `You are doing great${this.salutation()}! What topic do you enjoy most: music, food, or computers?`,
            de: `Du machst das super${this.salutation()}! Welches Thema magst du am liebsten: Musik, Essen oder Computer?`,
            suggestions: [
              "I really enjoy talking about music and hobbies.",
              "I like talking about computers and programming.",
              "Tell me about good food and cooking!"
            ]
          },
          {
            en: `Great practice${this.salutation()}! What would you like to talk about next?`,
            de: `Tolles Training${this.salutation()}! Worüber möchtest du als Nächstes sprechen?`,
            suggestions: [
              "Can you ask me an everyday question in English?",
              "How do you say 'Schönen Feierabend' in English?",
              "Let's practice a short dialogue."
            ]
          }
        ];
        return {
          id: 'beginner_open_fallback_' + this.state.turnCount,
          ...beginnerFallbacks[(this.state.turnCount - 1) % beginnerFallbacks.length]
        };
      }

      if (scenarioId === 'standup') {
        const standupFallbacks = [
          {
            en: `Thanks for the update${this.salutation()}! What are you planning to work on today, and do you foresee any blockers?`,
            de: `Danke für dein Update${this.salutation()}! Woran planst du heute zu arbeiten und siehst du irgendwelche Hindernisse (Blocker)?`,
            suggestions: [
              "Today I will write unit tests for the new service.",
              "I plan to finish the documentation and review open PRs.",
              "Everything is on track, no blockers today!"
            ]
          },
          {
            en: `Great progress${this.salutation()}! Keep up the momentum. Are there any dependencies on other team members or external teams today?`,
            de: `Toller Fortschritt${this.salutation()}! Bleib am Ball. Gibt es heute irgendwelche Abhängigkeiten zu anderen Teammitgliedern oder Teams?`,
            suggestions: [
              "No dependencies, I have everything I need to proceed.",
              "I am coordinating with the frontend team on API data formats.",
              "I will ping DevOps if deployment needs assistance."
            ]
          },
          {
            en: `Understood${this.salutation()}! That gives us a clear picture. Is there anything specific you would like to discuss after standup?`,
            de: `Verstanden${this.salutation()}! Das gibt uns ein klares Bild. Gibt es etwas Bestimmtes, das du nach dem Standup besprechen möchtest?`,
            suggestions: [
              "Nothing to discuss, I can jump straight into coding.",
              "A quick 5-minute sync on architecture would be helpful.",
              "All good on my side, thanks Sarah!"
            ]
          }
        ];
        return {
          id: 'standup_open_fallback_' + this.state.turnCount,
          ...standupFallbacks[(this.state.turnCount - 1) % standupFallbacks.length]
        };
      }

      // Allgemeiner Fallback für andere Szenarien
      return {
        id: 'open_fallback_' + this.state.turnCount,
        en: `Thanks for sharing${this.salutation()}! In our ${meta.desc}, every contribution helps. What would you like to focus on next?`,
        de: `Danke fürs Teilen${this.salutation()}! In unserem ${meta.desc} hilft jeder Beitrag weiter. Worauf möchtest du dich als Nächstes konzentrieren?`,
        suggestions: [
          "Let's continue with our planned discussion.",
          "Could you explain the next step in simple terms?",
          "I am ready to proceed."
        ]
      };
    }
  };

  function formatReplyText(t) {
    if (!t) return '';
    const uName = getUserName();
    if (uName) {
      return t.replace(/\{name\}/g, `, ${uName}`).replace(/Istvan/g, uName).replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ');
    } else {
      return t.replace(/\{name\}/g, '').replace(/Istvan/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
    }
  }

  // Rückwärtskompatible Wrapper-Funktion mit Formatierung
  function generatePartnerResponse(userInput, scenarioId) {
    let raw;
    try {
      raw = DialogEngine.generateResponse(userInput, scenarioId);
    } catch (e) {
      console.warn('DialogEngine generateResponse error:', e);
      raw = {
        id: 'safety_fallback',
        en: "That is interesting! Tell me more about that. What would you like to practice next?",
        de: "Das ist interessant! Erzähl mir mehr darüber. Was möchtest du als Nächstes üben?",
        suggestions: [
          "Can you teach me some new words?",
          "How are you doing today?",
          "Let's practice a simple conversation."
        ]
      };
    }
    if (!raw) return raw;
    return {
      ...raw,
      en: formatReplyText(raw.en),
      de: formatReplyText(raw.de)
    };
  }

  // --- INITIALISIERUNG DES DIALOG-VIEWS ---

  // --- STIMMEN-AUSWAHL & MODAL (V15: HANDY- & PC-OPTIMIERT) ---
  function renderVoiceListItems(container) {
    updateVoicesCache();
    const voices = (cachedDeviceVoices && cachedDeviceVoices.length > 0) ? cachedDeviceVoices : (window.speechSynthesis.getVoices() || []);
    container.innerHTML = '';

    const savedVoiceURI = localStorage.getItem('englapp_custom_voice_uri') || '';
    const isDefaultActive = !savedVoiceURI;

    // 1. IMMER als Top-Eintrag: Smartphone & System-Standardstimme (funktioniert auf JEDEM Handy & Browser!)
    const defaultRow = document.createElement('div');
    defaultRow.className = 'voice-item-row' + (isDefaultActive ? ' selected' : '');
    defaultRow.innerHTML = `
      <div class="voice-item-info">
        <div class="voice-item-name">
          📱 Smartphone / System Standard-Stimme
          <span class="voice-pill-natural">🌟 Empfohlen für Handy</span>
          ${isDefaultActive ? '<span class="voice-pill-active">Aktiv</span>' : ''}
        </div>
        <div class="voice-item-lang">Nutzt die installierte Sprachausgabe deines Handys (Android Google TTS / iOS Siri)</div>
      </div>
      <div class="voice-item-actions">
        <button class="voice-sample-btn" id="btnTestDefaultPhone">🔊 Probe</button>
        <button class="voice-select-btn ${isDefaultActive ? 'is-active' : ''}">${isDefaultActive ? '✓ Aktiv' : 'Wählen'}</button>
      </div>
    `;

    defaultRow.querySelector('#btnTestDefaultPhone').addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance("Hello! This is the standard English voice of your phone.");
      u.lang = 'en-US';
      u.rate = 0.94;
      u.pitch = 0.98;
      window.speechSynthesis.speak(u);
    });

    defaultRow.querySelector('.voice-select-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      localStorage.removeItem('englapp_custom_voice_uri');
      showToast('📱 Smartphone Standard-Stimme aktiviert');
      renderVoiceListItems(container);
    });

    container.appendChild(defaultRow);

    // 2. Englische Stimmen filtern (en-US, en_US, en-GB, oder Name mit 'English')
    const enVoices = voices.filter(v => {
      const l = (v.lang || '').toLowerCase().replace('_', '-');
      const n = (v.name || '').toLowerCase();
      return l.startsWith('en') || n.includes('english') || n.includes('en-us') || n.includes('en-gb');
    });

    enVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));

    if (enVoices.length > 0) {
      enVoices.forEach(v => {
        const isSelected = (savedVoiceURI && (v.voiceURI === savedVoiceURI || v.name === savedVoiceURI));
        const isNatural = /natural|neural|online|enhanced|premium|google/i.test(v.name + ' ' + v.voiceURI);

        const row = document.createElement('div');
        row.className = 'voice-item-row' + (isSelected ? ' selected' : '');
        row.innerHTML = `
          <div class="voice-item-info">
            <div class="voice-item-name">
              ${v.name}
              ${isNatural ? '<span class="voice-pill-natural">🌟 Natürlich</span>' : ''}
              ${isSelected ? '<span class="voice-pill-active">Aktiv</span>' : ''}
            </div>
            <div class="voice-item-lang">${v.lang} ${v.localService ? '• Lokale Stimme' : '• Online/HQ'}</div>
          </div>
          <div class="voice-item-actions">
            <button class="voice-sample-btn">🔊 Probe</button>
            <button class="voice-select-btn ${isSelected ? 'is-active' : ''}">${isSelected ? '✓ Aktiv' : 'Wählen'}</button>
          </div>
        `;

        row.querySelector('.voice-sample-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance("Hello! How does this English voice sound to you?");
          u.voice = v;
          u.rate = 0.94;
          u.pitch = 0.98;
          window.speechSynthesis.speak(u);
        });

        row.querySelector('.voice-select-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          localStorage.setItem('englapp_custom_voice_uri', v.voiceURI);
          showToast(`🎙️ Stimme gewählt: ${v.name}`);
          renderVoiceListItems(container);
        });

        container.appendChild(row);
      });
    } else {
      // Wenn das Smartphone noch asynchron nachlädt
      const helpBox = document.createElement('div');
      helpBox.style.cssText = 'background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 12px; margin-top: 10px; font-size: 0.84rem; color: #94a3b8; line-height: 1.45; text-align: center;';
      helpBox.innerHTML = `
        <p style="margin: 0 0 8px 0; color: #e2e8f0;">📱 Dein Smartphone nutzt standardmäßig die obige Standard-Stimme.</p>
        <button id="btnRetryPhoneVoices" style="background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; padding: 6px 14px; border-radius: 8px; font-size: 0.82rem; cursor: pointer; font-weight: 600;">🔄 Zusätzliche Stimmen laden</button>
      `;
      helpBox.querySelector('#btnRetryPhoneVoices').addEventListener('click', () => {
        updateVoicesCache();
        renderVoiceListItems(container);
      });
      container.appendChild(helpBox);
    }
  }

  function openUserNameModal() {
    let modal = document.getElementById('userNameModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'userNameModal';
      modal.className = 'app-modal-overlay';
      modal.innerHTML = `
        <div class="app-modal-card user-name-modal-card">
          <div class="app-modal-header">
            <h3>👤 Deinen Namen einstellen</h3>
            <button class="modal-close-btn" id="btnCloseUserNameModal">✕</button>
          </div>
          <p class="app-modal-desc">
            Wie möchtest du von deinem KI-Tutor im Chat angesprochen werden?
          </p>
          <div style="margin: 16px 0;">
            <input type="text" id="modalInputUserName" class="user-name-input-field" placeholder="Z. B. Istvan" maxlength="30" autocomplete="given-name">
          </div>
          <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
            <button class="user-modal-btn reset-btn" id="btnResetUserNameModal" title="Name entfernen">🗑️ Zurücksetzen</button>
            <button class="user-modal-btn cancel-btn" id="btnCancelUserNameModal">Abbrechen</button>
            <button class="user-modal-btn save-btn" id="btnSaveUserNameModal">💾 Speichern</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
      modal.querySelector('#btnCloseUserNameModal').addEventListener('click', () => {
        modal.style.display = 'none';
      });
      modal.querySelector('#btnCancelUserNameModal').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      modal.querySelector('#btnSaveUserNameModal').addEventListener('click', () => {
        const input = document.getElementById('modalInputUserName');
        const val = input ? input.value.trim() : '';
        if (val) {
          setUserName(val);
          showToast(`👤 Name gespeichert: ${val}`);
        } else {
          setUserName('');
          showToast('👤 Name zurückgesetzt');
        }
        modal.style.display = 'none';
        switchDialogScenario(currentScenarioId);
      });

      modal.querySelector('#btnResetUserNameModal').addEventListener('click', () => {
        setUserName('');
        showToast('👤 Name zurückgesetzt');
        modal.style.display = 'none';
        switchDialogScenario(currentScenarioId);
      });

      const inp = modal.querySelector('#modalInputUserName');
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          modal.querySelector('#btnSaveUserNameModal').click();
        }
      });
    }

    const inp = modal.querySelector('#modalInputUserName');
    if (inp) {
      inp.value = getUserName() || '';
      setTimeout(() => inp.focus(), 60);
    }
    modal.style.display = 'flex';
  }

  function openAvatarPickerModal() {
    let modal = document.getElementById('avatarPickerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'avatarPickerModal';
      modal.className = 'app-modal-overlay';
      modal.innerHTML = `
        <div class="app-modal-card avatar-picker-card">
          <div class="app-modal-header">
            <h3>🎭 Tutor-Avatar wählen</h3>
            <button class="modal-close-btn" id="btnCloseAvatarModal">✕</button>
          </div>
          <p class="app-modal-desc">
            Wähle das Aussehen deines Gesprächspartners (3D Avatar, AI Robot oder echtes Foto):
          </p>
          <div class="avatar-grid-container" id="avatarGridContainer">
            <!-- Dynamically populated -->
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
      modal.querySelector('#btnCloseAvatarModal').addEventListener('click', () => {
        modal.style.display = 'none';
      });
    }

    const grid = modal.querySelector('#avatarGridContainer');
    const currentId = getSelectedAvatarId();
    grid.innerHTML = Object.values(AVATAR_OPTIONS).map(opt => {
      const isSelected = opt.id === currentId;
      const previewHtml = opt.type === 'image'
        ? `<img class="avatar-card-preview-img" src="${opt.src}" alt="${escapeHtml(opt.name)}">`
        : `<div class="avatar-card-preview-svg">${opt.svg}</div>`;

      return `
        <div class="avatar-option-card ${isSelected ? 'active-avatar' : ''}" data-avatar-id="${opt.id}">
          <div class="avatar-card-thumb-wrap">
            ${previewHtml}
            ${isSelected ? '<span class="avatar-active-badge">Aktiv</span>' : ''}
          </div>
          <div class="avatar-card-info">
            <div class="avatar-card-title-row">
              <strong>${escapeHtml(opt.name)}</strong>
              <span class="avatar-card-tag">${escapeHtml(opt.tag)}</span>
            </div>
            <p class="avatar-card-desc">${escapeHtml(opt.desc)}</p>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.avatar-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const chosenId = card.dataset.avatarId;
        setSelectedAvatarId(chosenId);
        showToast(`🎭 Avatar aktiviert: ${AVATAR_OPTIONS[chosenId].name}`);
        updateHeaderPartnerCard();
        resetDialogScenario(currentScenarioId);
        modal.style.display = 'none';
      });
    });

    modal.style.display = 'flex';
  }

  function openVoicePickerModal() {
    let modal = document.getElementById('voicePickerModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'voicePickerModal';
      modal.className = 'app-modal-overlay';
      modal.innerHTML = `
        <div class="app-modal-card">
          <div class="app-modal-header">
            <h3>🎙️ Englische Stimme wählen</h3>
            <button class="modal-close-btn" id="btnCloseVoiceModal">✕</button>
          </div>
          <p class="app-modal-desc">
            Wähle hier die für dein Handy oder PC angenehmste englische Stimme aus.
          </p>
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; font-size: 0.84rem; color: #a7f3d0; line-height: 1.45;">
            💡 <strong>Tipp für Handy & PC:</strong> Auf dem Smartphone funktioniert die <strong>Standard-Stimme</strong> immer sofort. Am PC sind Stimmen mit <strong>🌟 Natürlich</strong> am weichsten!
          </div>
          <div class="voice-list-container" id="voiceListContainer">
            <p style="text-align: center; color: var(--text-muted); padding: 16px;">Lade Stimmen...</p>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseVoiceModal').addEventListener('click', () => {
        modal.classList.remove('active');
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
      });
    }

    const container = modal.querySelector('#voiceListContainer');
    renderVoiceListItems(container);
    modal.classList.add('active');

    // Schnelle Wiederholung nach 350ms für asynchrone mobile Stimmen
    setTimeout(() => {
      if (modal.classList.contains('active')) {
        renderVoiceListItems(container);
      }
    }, 350);
  }

    function initDialogView() {
    if (dialogInitialized) return;
    dialogInitialized = true;

    const btnModeText = document.getElementById('btnModeText');
    const btnModeVoice = document.getElementById('btnModeVoice');
    const scenarioBar = document.getElementById('scenarioBar');
    const btnResetDialog = document.getElementById('btnResetDialog');
    const btnDialogSend = document.getElementById('btnDialogSend');
    const btnDialogMic = document.getElementById('btnDialogMic');
    const dialogTextInput = document.getElementById('dialogTextInput');

    // Modus umschalten (Schreiben/Lesen vs Sprechen/Hören)
    if (btnModeText && btnModeVoice) {
      btnModeText.addEventListener('click', () => {
        currentDialogMode = 'text';
        btnModeText.classList.add('active');
        btnModeVoice.classList.remove('active');
        showToast('✍️ Modus: Schreiben & Lesen aktiviert');
      });

      btnModeVoice.addEventListener('click', () => {
        currentDialogMode = 'voice';
        btnModeVoice.classList.add('active');
        btnModeText.classList.remove('active');
        showToast('🎙️ Modus: Sprechen & Hören aktiviert');
      });
    }

    // Gymnasiale Klassenstufen-Buttons (Internationalwirtschaft)
    const gradePills = document.querySelectorAll('#economicsGradePills .grade-pill');
    gradePills.forEach(pill => {
      pill.addEventListener('click', () => {
        setEconomicsGrade(pill.dataset.grade);
      });
    });

    // Szenario-Buttons
    if (scenarioBar) {
      scenarioBar.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          scenarioBar.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          switchDialogScenario(btn.dataset.scenario);
        });
      });
    }

    // Reset-Button
    if (btnResetDialog) {
      btnResetDialog.addEventListener('click', () => {
        resetDialogScenario(currentScenarioId);
      });
    }

    // Senden per Button oder Enter-Taste
    if (btnDialogSend) {
      btnDialogSend.addEventListener('click', () => {
        submitUserChatMessage();
      });
    }

    if (dialogTextInput) {
      dialogTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitUserChatMessage();
        }
      });
    }

    // Mikrofon-Button im Dialog
    if (btnDialogMic) {
      btnDialogMic.addEventListener('click', () => {
        if (!recognition) {
          showToast('Spracherkennung im Browser nicht verfügbar.');
          return;
        }

        if (isRecording && activeMicTarget === 'dialogChat') {
          recognition.stop();
        } else {
          try {
            activeMicTarget = 'dialogChat';
            recognition.start();
          } catch (e) {
            console.warn('Mic start error:', e);
          }
        }
      });
    }

    // Initialisiere Benutzernamen in der UI
    updateUserNameUI();

    const btnEditUserName = document.getElementById('btnEditUserName');
    if (btnEditUserName) {
      btnEditUserName.addEventListener('click', () => {
        openUserNameModal();
      });
    }

    const btnToggleScenarioAudio = document.getElementById('btnToggleScenarioAudio');
    if (btnToggleScenarioAudio) {
      btnToggleScenarioAudio.addEventListener('click', () => {
        if (isSpeakingNow()) {
          stopSpeaking();
          showToast('⏹️ Sprache angehalten');
        } else {
          // Letzte Partner-Nachricht oder Willkommenssatz wiederholen
          const history = dialogHistories[currentScenarioId] || [];
          const lastPartner = [...history].reverse().find(m => m.type === 'partner');
          const toSpeak = (lastPartner && lastPartner.textEn) ? lastPartner.textEn : (DIALOG_SCENARIOS[currentScenarioId]?.initialPrompt || 'Hello!');
          toggleSpeakEnglish(toSpeak, btnToggleScenarioAudio);
        }
      });
    }

    // Avatar direkt klickbar: Tippen stoppt die Sprache oder spielt sie wieder ab!
    const avatarEl = document.getElementById('scenarioAvatar');
    if (avatarEl) {
      avatarEl.style.cursor = 'pointer';
      avatarEl.title = 'Tippen zum Anhalten oder Wiederholen der Sprache';
      avatarEl.addEventListener('click', () => {
        if (isSpeakingNow()) {
          stopSpeaking();
          showToast('⏹️ Sprache angehalten');
        } else {
          const history = dialogHistories[currentScenarioId] || [];
          const lastPartner = [...history].reverse().find(m => m.type === 'partner');
          const toSpeak = (lastPartner && lastPartner.textEn) ? lastPartner.textEn : (DIALOG_SCENARIOS[currentScenarioId]?.initialPrompt || 'Hello!');
          toggleSpeakEnglish(toSpeak, btnToggleScenarioAudio);
        }
      });
    }

    const btnChooseMale = document.getElementById('btnChooseMale');
    if (btnChooseMale) {
      btnChooseMale.addEventListener('click', () => {
        setPartnerGender('male');
      });
    }

    const btnChooseFemale = document.getElementById('btnChooseFemale');
    if (btnChooseFemale) {
      btnChooseFemale.addEventListener('click', () => {
        setPartnerGender('female');
      });
    }

    const btnOpenAvatarPicker = document.getElementById('btnOpenAvatarPicker');
    if (btnOpenAvatarPicker) {
      btnOpenAvatarPicker.addEventListener('click', () => {
        openAvatarPickerModal();
      });
    }

    const btnOpenVoicePicker = document.getElementById('btnOpenVoicePicker');
    if (btnOpenVoicePicker) {
      btnOpenVoicePicker.addEventListener('click', () => {
        openVoicePickerModal();
      });
    }

    const btnAskFeedback = document.getElementById('btnAskFeedback');
    if (btnAskFeedback) {
      btnAskFeedback.addEventListener('click', () => {
        const input = document.getElementById('dialogTextInput');
        if (input) {
          input.value = "Kannst du bitte meine Fehler korrigieren?";
          submitUserChatMessage();
        }
      });
    }

    // Erstes Szenario starten
    switchDialogScenario('beginner');
  }

  function updateHeaderPartnerCard() {
    const avatarEl = document.getElementById('scenarioAvatar');
    const nameEl = document.getElementById('scenarioPartnerName');
    const roleEl = document.getElementById('scenarioPartnerRole');

    if (avatarEl) {
      avatarEl.innerHTML = `
        ${renderPartnerAvatarHtml(currentScenarioId)}
        <div class="speaking-badge" title="Spricht gerade">
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
          <span class="wave-bar"></span>
        </div>
      `;
    }

    const partnerMeta = getCurrentPartnerMeta();
    if (nameEl) nameEl.textContent = partnerMeta.name;
    if (roleEl) roleEl.textContent = partnerMeta.role;

    updateGenderTogglePills();
  }

  function updateGenderTogglePills() {
    const meta = getCurrentPartnerMeta();
    const btnMale = document.getElementById('btnChooseMale');
    const btnFemale = document.getElementById('btnChooseFemale');
    if (btnMale && btnFemale) {
      if (meta.isMale) {
        btnMale.classList.add('active');
        btnFemale.classList.remove('active');
      } else {
        btnFemale.classList.add('active');
        btnMale.classList.remove('active');
      }
    }
  }

  function setPartnerGender(gender) {
    if (gender === 'female') {
      setSelectedAvatarId('future_female');
      showToast('👩 Gesprächspartnerin: Nova (Damenstimme aktiv)');
    } else {
      setSelectedAvatarId('future_male');
      showToast('👨 Gesprächspartner: Leo (Männerstimme aktiv)');
    }
    updateHeaderPartnerCard();
    resetDialogScenario(currentScenarioId);
  }

  function switchDialogScenario(scenarioId) {
    currentScenarioId = scenarioId;
    DialogEngine.reset(scenarioId);

    const gradeBar = document.getElementById('economicsGradeBar');
    if (gradeBar) {
      gradeBar.style.display = (scenarioId === 'economics') ? 'flex' : 'none';
      if (scenarioId === 'economics') {
        updateEconomicsGradePills();
      }
    }

    updateHeaderPartnerCard();

    if (!dialogHistories[scenarioId] || dialogHistories[scenarioId].length === 0) {
      resetDialogScenario(scenarioId);
    } else {
      renderChatLog(scenarioId);
    }
  }

  function resetDialogScenario(scenarioId) {
    activeGuests = [];
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;
    dialogHistories[scenarioId] = [];

    if (scenarioId === 'quiz') {
      const firstQ = VocabQuizEngine.start();
      const initialPartnerMsg = {
        type: 'partner',
        sender: getCurrentPartnerMeta().name,
        textEn: formatReplyText(`Hello{name}! Let's test your vocabulary. ${firstQ.en}`),
        textDe: formatReplyText(`Hallo{name}! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische IT- & Fachbegriffe und du nennst mir die deutsche Bedeutung!

👉 Wie lautet die deutsche Bedeutung von:
**"${firstQ.vocabItem.english}"**?
*(Kategorie: ${firstQ.vocabItem.categoryName})*`),
        suggestions: firstQ.suggestions
      };
      dialogHistories[scenarioId].push(initialPartnerMsg);
      renderChatLog(scenarioId);
      if (currentDialogMode === 'voice') {
        speakEnglish(firstQ.vocabItem.english);
      }
      return;
    }

    // Initiale Begrüßungsnachricht des Partners:
    // Der Coach startet IMMER mit persönlicher Vorstellung und fragt den Lernenden nach seinem Namen,
    // um die Konversation maßgeschneidert und interaktiv aufzubauen!
    const partnerMeta = getCurrentPartnerMeta();
    const partnerFirstName = partnerMeta.name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');

    let promptEn = '';
    let promptDe = '';

    if (scenarioId === 'beginner' || scenarioId === 'free') {
      if (partnerMeta.isMale) {
        promptEn = `Hello and welcome! 😊 I am ${partnerFirstName}, your personal English coach. Before we begin our conversation: Who am I speaking with today? What is your name?`;
        promptDe = `Hallo und herzlich willkommen! 😊 Ich bin ${partnerFirstName}, dein persönlicher Englisch-Coach. Bevor wir mit unserem Gespräch beginnen: Mit wem spreche ich heute? Wie heißt du?`;
      } else {
        promptEn = `Hello and welcome! 😊 I am ${partnerFirstName}, your friendly English tutor. In this chat, there is zero pressure! Before we begin: Who am I speaking with today? What is your name?`;
        promptDe = `Hallo und herzlich willkommen! 😊 Ich bin ${partnerFirstName}, deine freundliche Sprachbegleiterin. Hier gibt es null Leistungsdruck! Bevor wir loslegen: Mit wem spreche ich heute? Wie heißt du?`;
      }
    } else if (scenarioId === 'economics') {
      const grade = getEconomicsGrade();
      const uGreeting = `Hello and welcome! 😊 I am ${partnerFirstName}, your International Economics coach. `;
      const uGreetingDe = `Hallo und herzlich willkommen! 😊 Ich bin ${partnerFirstName}, dein Coach für Internationale Wirtschaft. `;
      if (grade === '11') {
        promptEn = `${uGreeting}Before we explore David Ricardo's comparative advantage in Grade 11: Who am I speaking with today? What is your name?`;
        promptDe = `${uGreetingDe}Bevor wir in Klasse 11 die Grundlagen und David Ricardos komparativen Kostenvorteil erkunden: Mit wem spreche ich heute? Wie heißt du?`;
      } else if (grade === '12') {
        promptEn = `${uGreeting}Before we analyze protective tariffs and supply chain resilience in Grade 12: Who am I speaking with today? What is your name?`;
        promptDe = `${uGreetingDe}Bevor wir in Klasse 12 Schutzzölle und Lieferketten-Resilienz untersuchen: Mit wem spreche ich heute? Wie heißt du?`;
      } else {
        promptEn = `${uGreeting}Before we practice advanced Abitur exam debates on monetary policy and geoeconomics: Who am I speaking with today? What is your name?`;
        promptDe = `${uGreetingDe}Bevor wir anspruchsvolle Abitur-Debatten zu Geldpolitik und Geoeconomics trainieren: Mit wem spreche ich heute? Wie heißt du?`;
      }
    } else {
      const uGreeting = `Hello and welcome! 😊 I am ${partnerFirstName}. `;
      const uGreetingDe = `Hallo und herzlich willkommen! 😊 Ich bin ${partnerFirstName}. `;
      promptEn = `${uGreeting}Before we jump into our ${scenario.title}: Who am I speaking with today? What is your name?`;
      promptDe = `${uGreetingDe}Bevor wir in unser Szenario (${scenario.title}) starten: Mit wem spreche ich heute? Wie heißt du?`;
    }

    const initialPartnerMsg = {
      type: 'partner',
      sender: getCurrentPartnerMeta().name,
      textEn: promptEn,
      textDe: promptDe,
      suggestions: getInitialSuggestions(scenarioId)
    };

    dialogHistories[scenarioId].push(initialPartnerMsg);
    renderChatLog(scenarioId);

    // Falls Sprachmodus aktiv ist, Begrüßung vorlesen
    if (currentDialogMode === 'voice') {
      speakEnglish(scenario.initialPrompt);
    }
  }

  function getInitialSuggestions(scenarioId) {
    const pMeta = getCurrentPartnerMeta();
    const pName = pMeta.name.split(' ')[0].replace(/[^A-Za-zÄÖÜäöüß]/g, '');
    const savedName = getUserName() || 'Istvan';

    return [
      `Hello ${pName}! My name is ${savedName}.`,
      `Hi! I am ${savedName}. Nice to meet you.`,
      `Hello! My name is Alex.`,
      'Can we practice speaking without using names?'
    ];
  }

  function getInitialSuggestions_legacy(scenarioId) {
    if (scenarioId === 'standup') {
      return [
        'Yesterday I worked on optimizing the database queries.',
        'I fixed the user authentication bug. No blockers today!',
        'Today I am writing unit tests for our REST API.'
      ];
    }
    if (scenarioId === 'interview') {
      return [
        'I specialize in application development, Java, and SQL databases.',
        'I am passionate about clean code and modern agile development.',
        'I enjoy solving complex software problems in a team.'
      ];
    }
    if (scenarioId === 'support') {
      return [
        'I will inspect the error logs and reproduce the database timeout.',
        'Could you tell me which API endpoint failed during peak traffic?',
        'I am analyzing the server logs right now.'
      ];
    }
    if (scenarioId === 'smalltalk') {
      return [
        'My week is going great! I look forward to producing music this weekend.',
        'Yes, taking a quick coffee break clears my mind after coding.',
        'The weather forecast for Sunday looks wonderful!'
      ];
    }
    if (scenarioId === 'travel') {
      return [
        'Good evening, I have a reservation under the name Istvan Csovrij.',
        'Does the room reservation include complimentary breakfast?',
        'Could you recommend an authentic English restaurant nearby?'
      ];
    }
    return [
      'Hello! I am a junior software developer practicing my English.',
      'Could you help me improve my professional English vocabulary?',
      'Let\'s talk about software engineering and agile Scrum methods.'
    ];
  }

  function renderChatLog(scenarioId) {
    const chatLog = document.getElementById('dialogChatLog');
    const chipsContainer = document.getElementById('quickRepliesChips');
    if (!chatLog) return;

    chatLog.innerHTML = '';
    const history = dialogHistories[scenarioId] || [];

    let latestSuggestions = [];

    history.forEach(item => {
      if (item.type === 'partner') {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg chat-msg-partner';
        msgDiv.innerHTML = `
          <div class="chat-partner-bubble">
            <div class="chat-partner-sender">${item.sender}</div>
            <div class="chat-partner-text">${item.textEn}</div>
            <div class="chat-partner-de">🇩🇪 <em>${item.textDe}</em></div>
            <div class="chat-partner-actions">
              <button class="chat-audio-btn" data-speak="${encodeURIComponent(item.textEn)}">
                🔊 Vorlesen
              </button>
            </div>
          </div>
        `;

        msgDiv.querySelector('.chat-audio-btn').addEventListener('click', (e) => {
          const btn = e.currentTarget;
          const textToSpeak = decodeURIComponent(btn.dataset.speak);
          toggleSpeakEnglish(textToSpeak, btn);
        });

        chatLog.appendChild(msgDiv);
        if (item.suggestions) {
          latestSuggestions = item.suggestions;
        }
      } else if (item.type === 'user') {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg chat-msg-user';
        msgDiv.innerHTML = `
          <div class="chat-user-bubble">${item.text}</div>
        `;
        chatLog.appendChild(msgDiv);

        // Falls ein ECHTER Fehler vorliegt, Doctor Card rendern
        // WICHTIG: Wenn der Satz fehlerfrei ist, KEINE nervige "Großartig... bla bla"-Box anzeigen!
        if (item.analysis && item.analysis.hasError) {
          const docCard = document.createElement('div');
          docCard.className = 'sentence-doctor-card has-error';
          docCard.innerHTML = `
            <div class="doctor-header">
              <span class="doctor-badge error">🩺 Satz-Korrektur & Grammatik-Tipp</span>
            </div>
            <div class="doctor-detail-row">
              <span class="doctor-label">🔴 Dein Satz:</span>
              <span class="doctor-original-text">${item.analysis.originalText}</span>
            </div>
            <div class="doctor-corrected-box">
              <span class="doctor-corrected-text">🟢 ${item.analysis.correctedText}</span>
              <button class="chat-audio-btn" data-speak="${encodeURIComponent(item.analysis.correctedText)}">
                🔊 Anhören
              </button>
            </div>
            <div class="doctor-explanation-box">
              ${item.analysis.explanation}
            </div>
          `;

          const listenBtn = docCard.querySelector('.chat-audio-btn');
          if (listenBtn) {
            listenBtn.addEventListener('click', (e) => {
              const btn = e.currentTarget;
              const textToSpeak = decodeURIComponent(btn.dataset.speak);
              toggleSpeakEnglish(textToSpeak, btn, 0.80);
            });
          }

          chatLog.appendChild(docCard);
        }
      }
    });

    // Render Quick Suggestions
    if (chipsContainer) {
      chipsContainer.innerHTML = '';
      latestSuggestions.forEach(sugg => {
        const chip = document.createElement('button');
        chip.className = 'quick-reply-chip';
        chip.textContent = sugg;
        chip.addEventListener('click', () => {
          const input = document.getElementById('dialogTextInput');
          if (input) {
            input.value = sugg;
            submitUserChatMessage();
          }
        });
        chipsContainer.appendChild(chip);
      });
    }

    // Scroll smoothly to bottom
    const container = document.getElementById('dialogChatContainer');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }

  function handleDialogSpeechResult(spokenText) {
    const input = document.getElementById('dialogTextInput');
    if (input) {
      input.value = spokenText;
    }
    submitUserChatMessage();
  }

  function submitUserChatMessage() {
    const input = document.getElementById('dialogTextInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const scenarioId = currentScenarioId;

    // 1. Absicht erkennen, Vokabeln abzufragen (Quiz-Intent in JEDEM Szenario!)
    const isQuizIntent = /\b(abfrag|frage.*mich|teste.*mich|quiz|vokabeln.*abfrag|wörter.*abfrag|teste.*mein.*englisch|wörter.*fragen|vokabeltest)\b/i.test(text);
    if (isQuizIntent && currentScenarioId !== 'quiz') {
      const quizBtn = document.querySelector('.scenario-btn[data-scenario="quiz"]');
      if (quizBtn) {
        document.querySelectorAll('.scenario-btn').forEach(b => b.classList.remove('active'));
        quizBtn.classList.add('active');
      }
      switchDialogScenario('quiz');
      return;
    }

    // 2. Falls wir im Quiz-Modus sind: Antwort durch VocabQuizEngine prüfen!
    if (currentScenarioId === 'quiz') {
      if (!dialogHistories['quiz']) dialogHistories['quiz'] = [];
      dialogHistories['quiz'].push({
        type: 'user',
        text: text,
        analysis: null // Keine Grammatikkorrektur im Quiz, da der Nutzer auf Deutsch antwortet!
      });

      const quizResult = VocabQuizEngine.evaluateAnswer(text);
      dialogHistories['quiz'].push({
        type: 'partner',
        sender: 'Prof. Miller (Vokabel-Coach)',
        textEn: quizResult.en,
        textDe: quizResult.de,
        suggestions: quizResult.suggestions
      });

      updateStatsBadges();
      renderChatLog('quiz');

      if (currentDialogMode === 'voice') {
        setTimeout(() => {
          speakEnglish(quizResult.audioText || quizResult.en);
        }, 300);
      }
      return;
    }

    // 3. Normales Szenario: Vorab Intent prüfen & Satz analysieren
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;
    const directIntent = DialogEngine.detectDirectIntent(text, scenarioId);

    let analysis = SentenceDoctor.analyze(text);

    // Wenn der Nutzer seinen Namen nennt, sich vorstellt, einen Gast vorstellt oder nach dem Namen fragt:
    // NIEMALS eine Fehler-Box anzeigen!
    const isNameOrGuestMessage = directIntent || /\b(nicht\s+[A-Za-z]+\s+sondern|meine?\s+(richtige[rn]?\s+)?na[h]?me|ich\s+hei[sß]+e|my\s+name\s+is|call\s+me|ich\s+bin|i\s+am|mein\s+name\s+ist|wie\s+hei[sß]+e\s+ich|what\s+is\s+my\s+name|wei[sß]+t\s+du\s+wie\s+ich|sag\s+mir\s+meinen\s+namen|das\s+ist|hier\s+ist|this\s+is|wer\s+ist\s+(alles\s+)?da|who\s+is\s+here)\b/i.test(text);

    if (isNameOrGuestMessage && analysis) {
      analysis = null;
    }

    // User-Nachricht speichern
    if (!dialogHistories[scenarioId]) dialogHistories[scenarioId] = [];
    dialogHistories[scenarioId].push({
      type: 'user',
      text: text,
      analysis: analysis
    });

    // Antwort des Partners generieren
    let partnerReply;
    try {
      partnerReply = directIntent ? { ...directIntent, en: formatReplyText(directIntent.en), de: formatReplyText(directIntent.de) } : generatePartnerResponse(text, scenarioId);
    } catch (err) {
      console.error('generatePartnerResponse error:', err);
      partnerReply = {
        id: 'safety_fallback',
        en: "That is interesting{name}! Tell me more about that.",
        de: "Das ist interessant{name}! Erzähl mir mehr darüber.",
        suggestions: [
          "Can you teach me some new words?",
          "How are you doing today?",
          "Let us continue chatting."
        ]
      };
    }

    // WICHTIG: Sofortige sprachliche & textliche Korrektur mit Beispielsatz
    if (analysis && analysis.hasError) {
      const cleanCorrected = (analysis.correctedText || '').replace(/<[^>]+>/g, '').trim();
      let verbalEn = '';
      let verbalDe = '';

      if (analysis.isGerman) {
        verbalEn = `In English, say: "${cleanCorrected}"! `;
        verbalDe = `💡 Sprach-Tipp: Auf Englisch sagst du: „${cleanCorrected}“!
`;
      } else {
        verbalEn = `Quick tip: say "${cleanCorrected}"! `;
        verbalDe = `💡 Sprach-Tipp: Richtig heißt es „${cleanCorrected}“!
`;
      }

      partnerReply.en = `${verbalEn}${partnerReply.en}`;
      partnerReply.de = `${verbalDe}━━━━━━━━━━━━━━━━━━━━
${partnerReply.de}`;

      // Biete den korrigierten Satz sofort als ersten Vorschlags-Chip zum Wiederholen an
      partnerReply.suggestions = [
        cleanCorrected,
        ...(partnerReply.suggestions || []).filter(s => s !== cleanCorrected).slice(0, 2)
      ];
    }

    dialogHistories[scenarioId].push({
      type: 'partner',
      sender: getCurrentPartnerMeta().name,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      suggestions: partnerReply.suggestions || [
        "Can you teach me some new words?",
        "How are you doing today?",
        "Let us continue chatting."
      ]
    });

    // XP vergeben & Sound abspielen
    userXP += 10;
    localStorage.setItem('fiae_user_xp', userXP);
    updateStatsBadges();
    playSound(analysis && !analysis.hasError ? 'success' : 'try-again');

    // Chat neu rendern
    renderChatLog(scenarioId);

    // Falls Sprachmodus aktiv ist, Antwort vorlesen
    if (currentDialogMode === 'voice') {
      setTimeout(() => {
        speakEnglish(partnerReply.en);
      }, 400);
    }
  }


  // ============================================================
  // 6. HÖRTEXTE & SYNCHRONE UNTERTITEL LOGIK
  // ============================================================
  let currentStoryIdx = 0;
  let currentSentenceIdx = 0;
  let isPlayingStory = false;
  let showSubtitles = true;
  let storySpeechRate = 1.0;
  let storiesInitialized = false;

  function initStoriesView() {
    if (storiesInitialized) return;
    storiesInitialized = true;

    renderStoryTabs();

    // Event Listener für Controls
    const btnPlay = document.getElementById('btnStoryPlay');
    const btnPrev = document.getElementById('btnStoryPrev');
    const btnNext = document.getElementById('btnStoryNext');
    const btnRepeat = document.getElementById('btnStoryRepeat');
    const btnToggleSub = document.getElementById('btnToggleSubtitles');
    const btnSpeed = document.getElementById('btnStorySpeed');

    if (btnPlay) {
      btnPlay.addEventListener('click', toggleStoryPlayback);
    }

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentSentenceIdx > 0) {
          currentSentenceIdx--;
          updateCinemaDisplay();
          if (isPlayingStory) {
            speakCurrentStorySentence(true);
          } else {
            speakCurrentStorySentence(false);
          }
        }
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const story = STORY_DATA[currentStoryIdx];
        if (currentSentenceIdx < story.sentences.length - 1) {
          currentSentenceIdx++;
          updateCinemaDisplay();
          if (isPlayingStory) {
            speakCurrentStorySentence(true);
          } else {
            speakCurrentStorySentence(false);
          }
        }
      });
    }

    if (btnRepeat) {
      btnRepeat.addEventListener('click', () => {
        speakCurrentStorySentence(isPlayingStory);
      });
    }

    if (btnToggleSub) {
      btnToggleSub.addEventListener('click', () => {
        showSubtitles = !showSubtitles;
        btnToggleSub.classList.toggle('active', showSubtitles);
        btnToggleSub.textContent = showSubtitles ? '👁️ Untertitel' : '🕶️ Ohne Untertitel';
        const deSubtitle = document.getElementById('cinemaDeSubtitle');
        if (deSubtitle) {
          deSubtitle.classList.toggle('hidden', !showSubtitles);
        }
      });
    }

    if (btnSpeed) {
      btnSpeed.addEventListener('click', () => {
        if (storySpeechRate === 1.0) {
          storySpeechRate = 0.75;
          btnSpeed.textContent = '🐢 0.75x';
        } else {
          storySpeechRate = 1.0;
          btnSpeed.textContent = '⚡ 1.0x';
        }
      });
    }

    selectStory(0);
  }

  function renderStoryTabs() {
    const bar = document.getElementById('storySelectorBar');
    if (!bar) return;

    bar.innerHTML = '';
    STORY_DATA.forEach((story, idx) => {
      const card = document.createElement('div');
      card.className = `story-tab-card ${idx === currentStoryIdx ? 'active' : ''}`;
      card.innerHTML = `
        <span class="story-tab-category">${story.icon} ${story.categoryName}</span>
        <span class="story-tab-title">${story.title}</span>
        <span class="story-tab-de">${story.titleDe}</span>
      `;
      card.addEventListener('click', () => {
        selectStory(idx);
      });
      bar.appendChild(card);
    });
  }

  function selectStory(idx) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isPlayingStory = false;
    updateStoryPlayButtonState();

    currentStoryIdx = idx;
    currentSentenceIdx = 0;

    // Update Tab UI
    const bar = document.getElementById('storySelectorBar');
    if (bar) {
      bar.querySelectorAll('.story-tab-card').forEach((card, i) => {
        card.classList.toggle('active', i === idx);
      });
    }

    updateCinemaDisplay();
    renderStorySentencesList();
  }

  function updateCinemaDisplay() {
    const story = STORY_DATA[currentStoryIdx];
    if (!story) return;

    const sentence = story.sentences[currentSentenceIdx];
    if (!sentence) return;

    const tagEl = document.getElementById('cinemaStoryTag');
    const counterEl = document.getElementById('cinemaCounter');
    const enEl = document.getElementById('cinemaEnSentence');
    const deEl = document.getElementById('cinemaDeSubtitle');

    if (tagEl) tagEl.textContent = `${story.icon} ${story.categoryName}`;
    if (counterEl) counterEl.textContent = `Satz ${currentSentenceIdx + 1} / ${story.sentences.length}`;
    if (enEl) enEl.textContent = sentence.en;
    if (deEl) {
      deEl.textContent = sentence.de;
      deEl.classList.toggle('hidden', !showSubtitles);
    }

    // Highlight row in sentence list
    const container = document.getElementById('storySentencesContainer');
    if (container) {
      container.querySelectorAll('.story-sentence-row').forEach((row, i) => {
        row.classList.toggle('active', i === currentSentenceIdx);
      });
    }
  }

  function renderStorySentencesList() {
    const story = STORY_DATA[currentStoryIdx];
    const container = document.getElementById('storySentencesContainer');
    if (!story || !container) return;

    container.innerHTML = '';
    story.sentences.forEach((sentence, idx) => {
      const row = document.createElement('div');
      row.className = `story-sentence-row ${idx === currentSentenceIdx ? 'active' : ''}`;
      row.innerHTML = `
        <div class="story-num-badge">${idx + 1}</div>
        <div class="story-row-content">
          <div class="story-row-en">${sentence.en}</div>
          <div class="story-row-de">${sentence.de}</div>
        </div>
        <div class="story-row-speaker" title="Anhören">🔊</div>
      `;

      row.addEventListener('click', () => {
        currentSentenceIdx = idx;
        updateCinemaDisplay();
        speakCurrentStorySentence(isPlayingStory);
      });

      container.appendChild(row);
    });
  }

  function toggleStoryPlayback() {
    if (isPlayingStory) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isPlayingStory = false;
      updateStoryPlayButtonState();
      setCinemaWaveActive(false);
    } else {
      isPlayingStory = true;
      updateStoryPlayButtonState();
      speakCurrentStorySentence(true);
    }
  }

  function updateStoryPlayButtonState() {
    const btnPlay = document.getElementById('btnStoryPlay');
    if (btnPlay) {
      btnPlay.classList.toggle('playing', isPlayingStory);
      btnPlay.innerHTML = isPlayingStory ? '⏸️ Pause' : '▶️ Vorlesen';
    }
  }

  function setCinemaWaveActive(active) {
    const wave = document.getElementById('cinemaSoundWave');
    if (wave) {
      wave.classList.toggle('active', active);
    }
  }

  function speakCurrentStorySentence(autoAdvance = false) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht verfügbar.');
      return;
    }

    const story = STORY_DATA[currentStoryIdx];
    if (!story) return;

    const sentence = story.sentences[currentSentenceIdx];
    if (!sentence) return;

    setCinemaWaveActive(true);

    speakEnglish(sentence.en, storySpeechRate, () => {
      setCinemaWaveActive(false);
      if (autoAdvance && isPlayingStory) {
        if (currentSentenceIdx < story.sentences.length - 1) {
          currentSentenceIdx++;
          updateCinemaDisplay();
          setTimeout(() => {
            if (isPlayingStory) {
              speakCurrentStorySentence(true);
            }
          }, 650);
        } else {
          // Geschichte abgeschlossen!
          isPlayingStory = false;
          updateStoryPlayButtonState();
          playSound('success');
          userXP += 25;
          localStorage.setItem('fiae_user_xp', userXP);
          updateStatsBadges();
          showToast('🎉 Geschichte erfolgreich gehört & gelesen! +25 XP');
        }
      }
    });
  }


  // ==========================================
  // 📖 GRAMMAR & TENSES VIEW CONTROLLER
  // ==========================================
  let activeGrammarCategory = 'all';
  let currentGrammarSearch = '';

  function initGrammarView() {
    const filterBar = document.getElementById('grammarFilterBar');
    if (filterBar && !filterBar._initialized) {
      filterBar._initialized = true;
      filterBar.querySelectorAll('.grammar-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          filterBar.querySelectorAll('.grammar-filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          activeGrammarCategory = btn.dataset.gcat || 'all';
          renderGrammarCards();
        });
      });
    }

    const searchInput = document.getElementById('grammarSearchInput');
    const searchClear = document.getElementById('btnGrammarSearchClear');
    if (searchInput && !searchInput._initialized) {
      searchInput._initialized = true;
      searchInput.addEventListener('input', (e) => {
        currentGrammarSearch = (e.target.value || '').trim().toLowerCase();
        if (searchClear) {
          searchClear.style.display = currentGrammarSearch ? 'block' : 'none';
        }
        renderGrammarCards();
      });

      if (searchClear) {
        searchClear.addEventListener('click', () => {
          searchInput.value = '';
          currentGrammarSearch = '';
          searchClear.style.display = 'none';
          renderGrammarCards();
        });
      }
    }

    renderGrammarCards();
  }

  function renderGrammarCards() {
    const container = document.getElementById('grammarCardsContainer');
    const countEl = document.getElementById('grammarTopicCount');
    if (!container || typeof GRAMMAR_TOPICS === 'undefined') return;

    let topics = GRAMMAR_TOPICS;

    // Filter by category
    if (activeGrammarCategory !== 'all') {
      topics = topics.filter(t => t.category === activeGrammarCategory);
    }

    // Filter by search query
    if (currentGrammarSearch) {
      const q = currentGrammarSearch;
      topics = topics.filter(t => {
        const textToMatch = [
          t.title,
          t.subtitle,
          t.summary,
          t.formula,
          (t.signalWords || []).join(' '),
          (t.rules || []).map(r => r.title + ' ' + r.detail).join(' '),
          (t.examples || []).map(ex => ex.en + ' ' + ex.de).join(' '),
          (t.pitfalls || []).map(p => p.wrong + ' ' + p.right + ' ' + p.tip).join(' ')
        ].join(' ').toLowerCase();
        return textToMatch.includes(q);
      });
    }

    if (countEl) {
      countEl.textContent = `${topics.length} von ${GRAMMAR_TOPICS.length} Kapitel`;
    }

    if (!topics.length) {
      container.innerHTML = `
        <div class="empty-state-card" style="text-align: center; padding: 40px 20px; color: #94a3b8;">
          <div style="font-size: 40px; margin-bottom: 12px;">🔍</div>
          <h3>Keine Grammatik-Regel gefunden</h3>
          <p>Zu deinem Suchbegriff "${escapeHtml(currentGrammarSearch)}" gibt es leider keinen Treffer. Probiere z.B. <em>since</em>, <em>didn't</em>, <em>SVO</em> oder <em>if</em>.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = topics.map(topic => `
      <div class="grammar-card" data-topic-id="${topic.id}">
        <div class="grammar-card-header">
          <div class="grammar-card-icon-title">
            <span class="grammar-topic-icon">${topic.icon}</span>
            <div>
              <h3 class="grammar-topic-title">${topic.title}</h3>
              <span class="grammar-topic-subtitle">${topic.subtitle}</span>
            </div>
          </div>
          <span class="grammar-level-pill">${topic.tag}</span>
        </div>

        <div class="grammar-formula-box">
          <span class="grammar-formula-label">📐 GOLDENE FORMEL:</span>
          <code class="grammar-formula-code">${escapeHtml(topic.formula)}</code>
        </div>

        <p class="grammar-summary-text">${topic.summary}</p>

        <div class="grammar-rules-list">
          ${topic.rules.map(r => `
            <div class="grammar-rule-item">
              <strong>${escapeHtml(r.title)}:</strong> ${escapeHtml(r.detail)}
            </div>
          `).join('')}
        </div>

        <div class="grammar-signals-row">
          <span class="grammar-signals-label">⚡ Signalwörter:</span>
          <div class="grammar-signals-chips">
            ${topic.signalWords.map(sw => `<span class="signal-chip">${escapeHtml(sw)}</span>`).join('')}
          </div>
        </div>

        <div class="grammar-examples-section">
          <div class="grammar-examples-header">
            <span>🎧 Hörbeispiele (mit weicher Stimme anhören):</span>
          </div>
          <div class="grammar-examples-list">
            ${topic.examples.map(ex => `
              <div class="grammar-example-row">
                <div class="grammar-example-text">
                  <div class="example-en">${escapeHtml(ex.en)}</div>
                  <div class="example-de">${escapeHtml(ex.de)}</div>
                </div>
                <button class="grammar-audio-btn" data-audio-en="${escapeHtml(ex.en)}" title="Diesen Beispielsatz anhören">
                  🔊 Anhören
                </button>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="grammar-pitfalls-box">
          <div class="grammar-pitfalls-title">⚠️ Typische Fehler & Fallen vermeiden:</div>
          ${topic.pitfalls.map(p => `
            <div class="pitfall-item">
              <div class="pitfall-wrong">❌ <span>${escapeHtml(p.wrong)}</span></div>
              <div class="pitfall-right">✅ <span>${escapeHtml(p.right)}</span></div>
              <div class="pitfall-tip">💡 ${escapeHtml(p.tip)}</div>
            </div>
          `).join('')}
        </div>

        <div class="grammar-card-footer">
          <button class="btn-grammar-practice" data-cloze-target="${topic.clozeId}">
            ✏️ Diese Regel jetzt im Lückentext üben (+10 XP) ➡
          </button>
        </div>
      </div>
    `).join('');

    // Attach audio click listeners
    container.querySelectorAll('.grammar-audio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sentence = btn.dataset.audioEn;
        if (sentence) {
          btn.style.transform = 'scale(0.96)';
          setTimeout(() => btn.style.transform = '', 200);
          speakEnglish(sentence);
        }
      });
    });

    // Attach practice click listeners
    container.querySelectorAll('.btn-grammar-practice').forEach(btn => {
      btn.addEventListener('click', () => {
        const clozeId = btn.dataset.clozeTarget;
        jumpToGrammarCloze(clozeId);
      });
    });
  }

  function jumpToGrammarCloze(clozeId) {
    if (!clozeId) return;
    switchView('cloze');
    const idx = filteredCloze.findIndex(c => c.id === clozeId);
    if (idx !== -1) {
      currentClozeIndex = idx;
      renderCurrentCloze();
      showToast('🎯 Starte passende Grammatik-Übung!');
    } else {
      showToast('Übung im aktuellen Filter nicht aktiv.');
    }
  }

  // --- INITIAL RENDER (FAIL-SAFE TRY/CATCH) ---
  try { updateStatsBadges(); } catch (e) { console.warn('updateStatsBadges error:', e); }
  try { updateVoiceBadgeUI(); } catch (e) { console.warn('updateVoiceBadgeUI error:', e); }

  const btnVoiceToggle = document.getElementById('btnVoiceToggle');
  if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', cycleVoiceProfile);
  }

  const btnVoiceTest = document.getElementById('btnVoiceTest');
  if (btnVoiceTest) {
    btnVoiceTest.addEventListener('click', testCurrentVoice);
  }

  try { renderCurrentCard(); } catch (e) { console.warn('renderCurrentCard error:', e); }
  try { renderCurrentSpeech(); } catch (e) { console.warn('renderCurrentSpeech error:', e); }
  try { renderCurrentCloze(); } catch (e) { console.warn('renderCurrentCloze error:', e); }
  try { initDialogView(); } catch (e) { console.warn('initDialogView error:', e); }
  try { initStoriesView(); } catch (e) { console.warn('initStoriesView error:', e); }
  try { initGrammarView(); } catch (e) { console.warn('initGrammarView error:', e); }

  } catch (fatalErr) {
    console.error('Fatal initialization error in initApp:', fatalErr);
  }
}

// Dual Loading Guard: Führt initApp sofort aus, wenn DOM bereit ist, oder wartet auf DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// --- SERVICE WORKER REGISTRATION (OFFLINE SUPPORT) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered for offline use:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}
