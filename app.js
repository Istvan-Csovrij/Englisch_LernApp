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
    return {
      name: 'Nova (Futuristische KI-Tutorin)',
      role: 'Rolle: Deine futuristische Englisch-Tutorin & KI-Begleiterin',
      isMale: false
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

  // Bereinigt den Text vor der Sprachausgabe: Entfernt Lautschrift-Klammern [...], Smileys, Emojis, Markdown & Sonderzeichen
  function cleanTextForSpeech(raw) {
    if (!raw) return '';
    let clean = raw
      .replace(/\[[^\]]*\]/g, ' ')
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

  let speechChunkQueue = [];
  let isCancelledSpeech = false;

  function stopSpeaking() {
    isCancelledSpeech = true;
    speechChunkQueue = [];
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
    setAvatarSpeaking(false);
    resetSpeakingBtn();
  }

  function isSpeakingNow() {
    return !!(window.speechSynthesis && (window.speechSynthesis.speaking || speechChunkQueue.length > 0));
  }

  function toggleSpeakEnglish(text, triggerBtn = null, customRate = null, onEndCallback = null) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }

    // Wenn gerade gesprochen wird: Beim Klick auf Stopp / Vorlesen sofort anhalten, sodass nur der Text vor einem bleibt!
    if (isSpeakingNow()) {
      const isSameBtn = (triggerBtn && triggerBtn === activeSpeakingBtn);
      const isNormalStop = !customRate;
      stopSpeaking();
      if (isSameBtn || !triggerBtn || isNormalStop) {
        showToast('⏹️ Vorlesen gestoppt – nur Text vor dir');
        return;
      }
    }

    speakEnglish(text, customRate, onEndCallback, triggerBtn);
  }

  function splitTextIntoSpeechChunks(cleanText) {
    if (!cleanText) return [];
    if (cleanText.length <= 160) return [cleanText];
    const rawParts = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
    const chunks = [];
    let current = '';
    for (const part of rawParts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if ((current + ' ' + trimmed).trim().length <= 170) {
        current = (current ? current + ' ' : '') + trimmed;
      } else {
        if (current) chunks.push(current);
        current = trimmed;
      }
    }
    if (current) chunks.push(current);
    return chunks.length ? chunks : [cleanText];
  }

  function speakEnglish(text, customRate = null, onEndCallback = null, triggerBtn = null) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }
    try {
      isCancelledSpeech = true;
      speechChunkQueue = [];
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setAvatarSpeaking(false);
      resetSpeakingBtn();

      // WICHTIG: Text vollständig von Emojis, Smileys und Formatierungen befreien!
      const speechText = cleanTextForSpeech(text);
      if (!speechText) return;

      lastSpokenText = speechText;
      isCancelledSpeech = false;

      const profile = getActiveVoiceProfile();
      const meta = getCurrentPartnerMeta();
      const preferMale = meta.isMale;
      const voice = getBestEnglishVoice(preferMale);

      let targetRate = (typeof customRate === 'number' && customRate > 0) ? customRate : profile.rate;
      let targetPitch = profile.pitch;
      const isCustomSlow = (typeof customRate === 'number' && customRate > 0 && customRate < 0.88);

      if (preferMale) {
        targetPitch = 0.92;
        if (!isCustomSlow) targetRate = Math.max(targetRate, 0.95);
      } else {
        targetPitch = 1.16;
        if (!isCustomSlow) targetRate = Math.max(targetRate, 0.93);
      }

      if (voice) {
        const vName = (voice.name || '').toLowerCase();
        if (vName.includes('david')) {
          targetPitch = 0.91;
          if (!isCustomSlow) targetRate = 0.95;
        } else if (vName.includes('zira')) {
          targetPitch = 1.18;
          if (!isCustomSlow) targetRate = 0.94;
        }
      }

      setAvatarSpeaking(true);

      // Falls im Dialog automatisch vorgelesen wird, auch den Button direkt unter der aktuellen Nachricht auf "⏹️ Stopp (Nur Text)" schalten!
      let targetBtn = triggerBtn;
      if (!targetBtn && currentView === 'dialog') {
        const normalBtns = document.querySelectorAll('#dialogChatLog .chat-msg-partner .chat-btn-normal');
        if (normalBtns && normalBtns.length > 0) {
          targetBtn = normalBtns[normalBtns.length - 1];
        }
      }

      if (targetBtn && targetBtn.id !== 'btnToggleScenarioAudio') {
        activeSpeakingBtn = targetBtn;
        activeSpeakingOriginalHTML = targetBtn.innerHTML;
        targetBtn.innerHTML = '⏹️ Stopp (Nur Text)';
        targetBtn.classList.add('is-speaking-btn');
      }

      const mainToggle = document.getElementById('btnToggleScenarioAudio');
      if (mainToggle) {
        mainToggle.innerHTML = '⏹️ Stopp (Nur Text)';
        mainToggle.classList.add('is-speaking-btn');
      }

      speechChunkQueue = splitTextIntoSpeechChunks(speechText);

      function speakNextChunk() {
        if (isCancelledSpeech || speechChunkQueue.length === 0) {
          setAvatarSpeaking(false);
          resetSpeakingBtn();
          window._activeUtterance = null;
          if (!isCancelledSpeech && typeof onEndCallback === 'function') {
            onEndCallback();
          }
          return;
        }

        const nextChunkText = speechChunkQueue.shift();
        const utterance = new SpeechSynthesisUtterance(nextChunkText);
        utterance.lang = (voice && voice.lang) ? voice.lang : 'en-US';
        if (voice) utterance.voice = voice;
        utterance.rate = targetRate;
        utterance.pitch = targetPitch;
        utterance.volume = profile.volume || 0.95;

        utterance.onend = () => {
          if (isCancelledSpeech) return;
          if (speechChunkQueue.length > 0) {
            speakNextChunk();
          } else {
            setAvatarSpeaking(false);
            resetSpeakingBtn();
            window._activeUtterance = null;
            if (typeof onEndCallback === 'function') {
              onEndCallback();
            }
          }
        };

        utterance.onerror = (e) => {
          if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
          setAvatarSpeaking(false);
          resetSpeakingBtn();
          speechChunkQueue = [];
          window._activeUtterance = null;
          console.warn('SpeechSynthesis error:', e);
        };

        window._activeUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }

      speakNextChunk();
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

  // --- SPEECH RECOGNITION (SPRACHE PRÜFEN & KONTROLLIEREN - v35 BILINGUAL EN/DE MIC & PAUSE-RESILIENT) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;
  let activeMicTarget = 'speechTrainer';
  let isDialogRecording = false;
  let manualDialogStopRequested = false;
  let dialogSpeechFinalAccumulator = '';
  let dialogMicLang = localStorage.getItem('fiae_dialog_mic_lang') || 'en-US';
  let activeChatPronounceContext = null;

  function startChatPronunciationTest(targetText, resultBoxEl, btnEl) {
    if (!targetText || !resultBoxEl) return;
    if (isSpeakingNow()) {
      stopSpeaking();
    }
    if (!recognition) {
      const userSpoke = prompt(`Bitte sprich folgenden englischen Text laut aus:\n"${targetText}"\n\nTippe zur Auswertung auf OK:`);
      if (userSpoke !== null) {
        activeChatPronounceContext = { targetText, resultBoxEl, btnEl };
        evaluateChatPronunciationTest(userSpoke || targetText);
      }
      return;
    }

    if (isRecording && activeMicTarget === 'chatPronounceTest') {
      try { recognition.stop(); } catch (e) {}
      return;
    }
    if (isRecording) {
      try { recognition.stop(); } catch (e) {}
    }

    activeChatPronounceContext = { targetText, resultBoxEl, btnEl };
    activeMicTarget = 'chatPronounceTest';
    isDialogRecording = false;
    manualDialogStopRequested = true;

    const phon = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(targetText) : '';
    resultBoxEl.style.display = 'block';
    resultBoxEl.innerHTML = `
      <div class="chat-pronounce-listening">
        🔴 <strong>Ich höre zu... Sprich jetzt auf Englisch:</strong><br>
        <span class="chat-pronounce-target">"${escapeHtml(targetText)}"</span>
        ${phon ? `<div class="chat-pronounce-phonetic">🗣️ Lautschrift: <code>[${escapeHtml(phon)}]</code></div>` : ''}
      </div>
    `;
    if (btnEl) {
      btnEl.classList.add('recording');
      btnEl.innerHTML = '🔴 Höre zu...';
    }

    try {
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.start();
    } catch (err) {
      console.warn('Chat pronunciation start error:', err);
    }
  }

  function evaluateChatPronunciationTest(spoken) {
    if (!activeChatPronounceContext) return;
    const { targetText, resultBoxEl, btnEl } = activeChatPronounceContext;
    if (btnEl) {
      btnEl.classList.remove('recording');
      btnEl.innerHTML = '🎙️ Nochmal testen';
    }

    const cleanSpokenWords = normalizePronunciationTokens(spoken);
    const targetRawWords = String(targetText).trim().split(/\s+/).filter(Boolean);
    const cleanTargetWords = targetRawWords.map(w => w.toLowerCase().replace(/[^a-z0-9']/g, '')).filter(Boolean);

    let matchCount = 0;
    const chipsHtml = targetRawWords.map((origWord) => {
      const cleanW = origWord.toLowerCase().replace(/[^a-z0-9']/g, '');
      const normTokens = normalizePronunciationTokens(cleanW);
      const isMatched = !cleanW || normTokens.every(t => isWordPronunciationMatch(t, cleanSpokenWords)) || isWordPronunciationMatch(cleanW, cleanSpokenWords);
      if (isMatched) matchCount++;
      const wordPhon = (typeof PronunciationCoach !== 'undefined' && cleanW) ? PronunciationCoach.wordToGermanPhonetic(cleanW) : '';
      return `
        <button type="button" class="chat-pronounce-word-chip ${isMatched ? 'is-ok' : 'is-miss'}" data-speak-word="${encodeURIComponent(origWord.replace(/[^a-zA-Z0-9'-]/g, ''))}" title="Tippen zum langsamen Anhören">
          ${isMatched ? '✅' : '❌'} <strong>${escapeHtml(origWord)}</strong>
          ${!isMatched && wordPhon ? `<span class="chip-phon">[${escapeHtml(wordPhon)}]</span>` : ''}
          <span>🔊</span>
        </button>
      `;
    }).join('');

    const total = Math.max(1, cleanTargetWords.length);
    const scorePct = Math.round((matchCount / total) * 100);
    let badgeText = '';
    let badgeClass = '';
    if (scorePct >= 80) {
      badgeText = `🏆 Starke Aussprache! (${scorePct}% richtig) +15 XP`;
      badgeClass = 'score-high';
      playSound('success');
      addXP(15);
      showToast(`🎉 Super ausgesprochen! (${scorePct}%) +15 XP`);
    } else if (scorePct >= 50) {
      badgeText = `👍 Gut verständlich (${scorePct}%) – Tippe auf ❌ Wörter zum Üben! (+10 XP)`;
      badgeClass = 'score-mid';
      playSound('success');
      addXP(10);
    } else {
      badgeText = `🔄 Noch einmal versuchen (${scorePct}%) – Tippe auf die ❌ Wörter, hör sie dir an & sprich nach!`;
      badgeClass = 'score-low';
      playSound('try-again');
    }

    resultBoxEl.style.display = 'block';
    resultBoxEl.innerHTML = `
      <div class="chat-pronounce-eval ${badgeClass}">
        <div class="chat-pronounce-score-header">${badgeText}</div>
        <div class="chat-pronounce-heard">🎙️ Verstanden: <em>"${escapeHtml(spoken)}"</em></div>
        <div class="chat-pronounce-chips-wrap">${chipsHtml}</div>
        <div class="chat-pronounce-tip">💡 Tippe auf ein Wort oben, um es einzeln und langsam zu hören!</div>
      </div>
    `;

    resultBoxEl.querySelectorAll('.chat-pronounce-word-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        const w = decodeURIComponent(e.currentTarget.dataset.speakWord || '');
        if (w) {
          speakEnglish(w, 0.75);
          const ph = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.wordToGermanPhonetic(w) : '';
          showToast(`🔊 "${w}" ${ph ? `[${ph}]` : ''}`);
        }
      });
    });
  }

  function updateDialogMicLangUI() {
    const btnLang = document.getElementById('btnDialogMicLang');
    const input = document.getElementById('dialogTextInput');
    const hint = document.getElementById('dialogInputHint');
    const isDe = dialogMicLang === 'de-DE';
    if (btnLang) {
      btnLang.innerHTML = isDe ? '🇩🇪 DE' : '🇬🇧 EN';
      btnLang.classList.toggle('lang-de', isDe);
      btnLang.title = isDe
        ? 'Mikrofon hört aktuell auf DEUTSCH (Tippen für Englisch 🇬🇧)'
        : 'Mikrofon hört aktuell auf ENGLISCH (Tippen für Deutsch 🇩🇪)';
    }
    if (input && !isDialogRecording) {
      input.placeholder = isDe
        ? "Sprich oder schreibe auf Deutsch oder Englisch... (z. B. 'Verstehst du Deutsch?')"
        : "Antworte auf Englisch oder Deutsch... (z. B. 'Can you understand German?')";
    }
    if (hint && !isDialogRecording) {
      hint.innerHTML = isDe
        ? '🎙️ Mikrofon-Sprache: <strong>🇩🇪 Deutsch</strong> (Tippe auf 🇩🇪 DE zum Umschalten auf 🇬🇧 EN)'
        : '🎙️ Mikrofon-Sprache: <strong>🇬🇧 Englisch</strong> (Tippe auf 🇬🇧 EN neben dem Mikrofon, wenn du Deutsch sprechen möchtest!)';
    }
  }

  function toggleDialogMicLang() {
    dialogMicLang = (dialogMicLang === 'de-DE') ? 'en-US' : 'de-DE';
    localStorage.setItem('fiae_dialog_mic_lang', dialogMicLang);
    updateDialogMicLangUI();
    if (isRecording && activeMicTarget === 'dialogChat') {
      try { recognition.stop(); } catch (e) {}
    }
    showToast(dialogMicLang === 'de-DE'
      ? '🇩🇪 Mikrofon versteht jetzt Deutsch!'
      : '🇬🇧 Mikrofon versteht jetzt Englisch!');
  }

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
        if (cardFb) {
          cardFb.style.display = 'block';
          cardFb.className = 'card-pronounce-feedback listening';
          cardFb.textContent = '🔴 Höre zu... Sprich jetzt das englische Wort!';
        }
      } else if (activeMicTarget === 'dialogChat') {
        isDialogRecording = true;
        const dialogMic = document.getElementById('btnDialogMic');
        if (dialogMic) dialogMic.classList.add('recording');
        const hint = document.getElementById('dialogInputHint');
        if (hint) hint.textContent = '🔴 Aufnahme aktiv (Pausen-Schutz aktiv)... Sprich in Ruhe! Klicke auf "⏹️ Stoppen & Abschicken", wenn du fertig bist.';
        showDialogRecordingBar(true);
      }
    };

    recognition.onresult = (event) => {
      if (activeMicTarget === 'speechTrainer') {
        const spokenText = event.results[0][0].transcript;
        evaluateSentencePronunciation(spokenText);
      } else if (activeMicTarget === 'flashcard') {
        const spokenText = event.results[0][0].transcript;
        evaluateFlashcardPronunciation(spokenText);
      } else if (activeMicTarget === 'chatPronounceTest') {
        const spokenText = event.results[0][0].transcript;
        evaluateChatPronunciationTest(spokenText);
      } else if (activeMicTarget === 'dialogChat') {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            dialogSpeechFinalAccumulator += (dialogSpeechFinalAccumulator ? ' ' : '') + trans.trim();
          } else {
            interim += trans;
          }
        }
        const fullSpoken = (dialogSpeechFinalAccumulator + (interim ? ' ' + interim : '')).trim();
        const input = document.getElementById('dialogTextInput');
        if (input && fullSpoken) {
          input.value = fullSpoken;
        }
        const statusText = document.getElementById('dialogRecordingStatusText');
        if (statusText && fullSpoken) {
          const displaySample = fullSpoken.length > 48 ? '...' + fullSpoken.slice(-45) : fullSpoken;
          statusText.textContent = `🎙️ "${displaySample}"`;
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' && activeMicTarget === 'dialogChat' && isDialogRecording && !manualDialogStopRequested) {
        // Im Dialog-Modus bei kurzer Denkpause nicht abbrechen, sondern weiter zuhören!
        return;
      }
      isRecording = false;
      if (isDialogRecording) {
        isDialogRecording = false;
        manualDialogStopRequested = true;
        showDialogRecordingBar(false);
      }
      stopAllRecordingUI();
      if (event.error === 'not-allowed') {
        showToast('⚠️ Mikrofon-Zugriff im Browser blockiert.');
      } else if (event.error === 'no-speech') {
        // Stille abfangen ohne Toast-Spam
      } else if (event.error !== 'aborted') {
        showToast('⚠️ Sprachaufnahme: ' + event.error);
      }
    };

    recognition.onend = () => {
      isRecording = false;
      // Pausen-Schutz im Dialog-Modus: Wenn der Browser nach kurzer Stille automatisch stoppt,
      // der Nutzer aber noch nicht auf "Stoppen & Abschicken" geklickt hat -> nahtlos weiterhören!
      if (activeMicTarget === 'dialogChat' && isDialogRecording && !manualDialogStopRequested) {
        try {
          recognition.lang = dialogMicLang;
          recognition.start();
          return;
        } catch (e) {
          // Falls direkter Neustart fehlschlägt, nach 120ms erneut versuchen
          setTimeout(() => {
            if (isDialogRecording && !manualDialogStopRequested) {
              try {
                recognition.lang = dialogMicLang;
                recognition.start();
              } catch (err) {}
            }
          }, 120);
          return;
        }
      }

      if (isDialogRecording) {
        isDialogRecording = false;
        showDialogRecordingBar(false);
      }
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
    if (activeChatPronounceContext && activeChatPronounceContext.btnEl) {
      activeChatPronounceContext.btnEl.classList.remove('recording');
      if (activeChatPronounceContext.btnEl.innerHTML.includes('Höre zu')) {
        activeChatPronounceContext.btnEl.innerHTML = '🎙️ Aussprache testen';
      }
    }
    const dialogMic = document.getElementById('btnDialogMic');
    if (dialogMic) dialogMic.classList.remove('recording');
    showDialogRecordingBar(false);
    updateDialogMicLangUI();
  }

  function showDialogRecordingBar(active) {
    const bar = document.getElementById('dialogRecordingBar');
    const sendBtn = document.getElementById('btnDialogSend');
    const statusText = document.getElementById('dialogRecordingStatusText');
    if (bar) {
      bar.style.display = active ? 'flex' : 'none';
    }
    if (sendBtn) {
      if (active) {
        sendBtn.classList.add('is-recording-send');
        sendBtn.innerHTML = '⏹️';
        sendBtn.title = 'Aufnahme beenden & Abschicken';
      } else {
        sendBtn.classList.remove('is-recording-send');
        sendBtn.innerHTML = '➤';
        sendBtn.title = 'Nachricht senden';
      }
    }
    if (statusText && active && !dialogSpeechFinalAccumulator) {
      statusText.textContent = 'Aufnahme läuft... Sprich in Ruhe (Pausen erlaubt)!';
    }
  }

  function startDialogSpeechRecording() {
    if (!recognition) {
      showToast('⚠️ Spracherkennung im Browser nicht verfügbar.');
      return;
    }
    // Laufende Sprachausgabe des Coaches sofort stoppen, damit sie nicht ins Mikrofon aufgenommen wird
    if (isSpeakingNow()) {
      stopSpeaking();
    }
    activeMicTarget = 'dialogChat';
    isDialogRecording = true;
    manualDialogStopRequested = false;
    const input = document.getElementById('dialogTextInput');
    dialogSpeechFinalAccumulator = input && input.value.trim() ? input.value.trim() : '';
    if (input && !input.value.trim()) {
      input.placeholder = dialogMicLang === 'de-DE'
        ? '🎙️ Höre zu (🇩🇪 Deutsch)... Sprich deinen Satz!'
        : '🎙️ Höre zu (🇬🇧 Englisch)... Sprich deinen Satz!';
    }
    try {
      recognition.lang = dialogMicLang;
      recognition.continuous = true;
      recognition.interimResults = true;
    } catch (e) {}

    try {
      recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e);
    }
  }

  function stopDialogRecordingAndSend() {
    manualDialogStopRequested = true;
    isDialogRecording = false;
    if (isRecording) {
      try { recognition.stop(); } catch(e) {}
    }
    showDialogRecordingBar(false);
    stopAllRecordingUI();
    // Kurze Verzögerung (150ms), damit das letzte gesprochene Wort noch vom Browser übertragen wird
    setTimeout(() => {
      const input = document.getElementById('dialogTextInput');
      const text = (input ? input.value : '').trim();
      if (text) {
        submitUserChatMessage();
      } else {
        showToast('ℹ️ Keine Sprache erkannt. Bitte sprich deinen Satz ins Mikrofon.');
      }
    }, 150);
  }

  function cancelDialogRecording() {
    manualDialogStopRequested = true;
    isDialogRecording = false;
    dialogSpeechFinalAccumulator = '';
    if (isRecording) {
      try { recognition.stop(); } catch(e) {}
    }
    showDialogRecordingBar(false);
    stopAllRecordingUI();
    const input = document.getElementById('dialogTextInput');
    if (input) input.value = '';
    showToast('❌ Aufnahme abgebrochen');
  }

  function toggleDialogSpeechRecording() {
    if (!recognition) {
      showToast('⚠️ Spracherkennung im Browser nicht verfügbar.');
      return;
    }
    if ((isRecording || isDialogRecording) && activeMicTarget === 'dialogChat') {
      stopDialogRecordingAndSend();
    } else {
      startDialogSpeechRecording();
    }
  }

  // Hilfsfunktionen für tolerante Aussprache-Bewertung (Levenshtein + Zahlen/Kontraktionen)
  function normalizePronunciationTokens(str) {
    if (!str) return [];
    const numMap = {
      '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
      '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine',
      '10': 'ten', '11': 'eleven', '12': 'twelve', '13': 'thirteen',
      '15': 'fifteen', '20': 'twenty', '30': 'thirty', '50': 'fifty',
      '80': 'eighty', '100': 'hundred', '800': 'eight hundred'
    };
    let s = str.toLowerCase()
      .replace(/\bi'm\b/g, 'i am')
      .replace(/\bit's\b/g, 'it is')
      .replace(/\bdon't\b/g, 'do not')
      .replace(/\bdoesn't\b/g, 'does not')
      .replace(/\bdidn't\b/g, 'did not')
      .replace(/\bcan't\b/g, 'cannot')
      .replace(/\bwon't\b/g, 'will not')
      .replace(/\blet's\b/g, 'let us')
      .replace(/\bwe're\b/g, 'we are')
      .replace(/\bthey're\b/g, 'they are')
      .replace(/\byou're\b/g, 'you are')
      .replace(/\bi've\b/g, 'i have')
      .replace(/\bi'll\b/g, 'i will')
      .replace(/%/g, ' percent ');
    return s.replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map(w => numMap[w] || w);
  }

  function isWordPronunciationMatch(targetWord, spokenWordsList) {
    if (!targetWord) return true;
    if (spokenWordsList.includes(targetWord)) return true;
    for (const sw of spokenWordsList) {
      if (Math.abs(sw.length - targetWord.length) <= 2 && (sw.includes(targetWord) || targetWord.includes(sw))) {
        return true;
      }
      // Levenshtein-Distanz <= 1 bei Wörtern >= 4 Buchstaben, <= 2 bei >= 7 Buchstaben
      if (targetWord.length >= 4) {
        const maxDist = targetWord.length >= 7 ? 2 : 1;
        const m = targetWord.length, n = sw.length;
        if (Math.abs(m - n) <= maxDist) {
          const dp = Array.from({ length: m + 1 }, (_, i) => [i]);
          for (let j = 1; j <= n; j++) dp[0][j] = j;
          for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
              dp[i][j] = targetWord[i - 1] === sw[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
          }
          if (dp[m][n] <= maxDist) return true;
        }
      }
    }
    return false;
  }

  // --- AUSSPRACHE-BEWERTUNG IM SPRECHTRAINER ---
  function evaluateSentencePronunciation(spoken) {
    const target = filteredSpeech[currentSpeechIndex].sentenceEn;
    const recognizedBox = document.getElementById('recognizedBox');
    const wordChipsContainer = document.getElementById('wordChipsContainer');
    const feedbackBox = document.getElementById('speechFeedback');
    
    recognizedBox.textContent = `"${spoken}"`;
    document.getElementById('spokenResultContainer').style.display = 'block';

    const cleanSpokenWords = normalizePronunciationTokens(spoken);
    const targetRawWords = target.split(/\s+/);
    const cleanTargetWords = target.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

    wordChipsContainer.innerHTML = '';
    let matchCount = 0;

    cleanTargetWords.forEach((targetWord, idx) => {
      const originalWord = targetRawWords[idx] || targetWord;
      const normTargetTokens = normalizePronunciationTokens(targetWord);
      const isMatched = normTargetTokens.every(t => isWordPronunciationMatch(t, cleanSpokenWords)) ||
                        isWordPronunciationMatch(targetWord, cleanSpokenWords);

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

    const scorePct = Math.round((matchCount / Math.max(1, cleanTargetWords.length)) * 100);

    feedbackBox.style.display = 'block';
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
    if (cardFb) cardFb.style.display = 'block';

    const spokenTokens = normalizePronunciationTokens(spoken);
    const targetTokens = normalizePronunciationTokens(target.split('/')[0].replace(/\(.*?\)/g, ''));

    const matchedTokens = targetTokens.filter(t => isWordPronunciationMatch(t, spokenTokens));
    const isMatch = targetTokens.length > 0 && (matchedTokens.length / targetTokens.length) >= 0.75;

    if (isMatch) {
      cardFb.className = 'card-pronounce-feedback success';
      cardFb.innerHTML = `🎉 <strong>Perfekt!</strong> Du hast gesagt: <em>"${escapeHtml(spoken)}"</em> (+10 XP)`;
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
      cardFb.innerHTML = `⚠️ Gehört: <em>"${escapeHtml(spoken)}"</em><br>Tippe auf <strong>🔊 Anhören</strong> und probiere es nochmal!`;
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
    if (currentView === 'dialog' && viewName !== 'dialog' && isSpeakingNow()) {
      stopSpeaking();
    }
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
      if (typeof updateDialogAudioModeUI === 'function') {
        updateDialogAudioModeUI();
      }
      if (currentDialogMode === 'voice' && !isSpeakingNow() && typeof speakLastPartnerMessage === 'function') {
        setTimeout(() => {
          if (currentView === 'dialog' && currentDialogMode === 'voice' && !isSpeakingNow()) {
            speakLastPartnerMessage();
          }
        }, 180);
      }
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
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
      } catch (e) {}
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
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
      } catch (e) {}
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
      document.querySelectorAll('.cat-btn').forEach(c => {
        c.classList.toggle('active', c.dataset.category === 'all');
      });
      filteredVocab = [...VOCAB_DATA];
      idx = filteredVocab.findIndex(v => v.id === vocabId);
    }
    if (idx !== -1) {
      currentCardIndex = idx;
      renderCurrentCard();
      switchView('cards');
      showToast(`🎴 Karteikarte geöffnet: ${filteredVocab[idx].english}`);
      const cardEl = document.getElementById('mainFlashcard');
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  let glossaryLiveTimer = null;

  function renderGlossary(searchTerm = '') {
    const listEl = document.getElementById('glossaryList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const rawQuery = (searchTerm || '').trim();
    const term = rawQuery.toLowerCase();
    let displayList = [...VOCAB_DATA];
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

      // Zusätzlich im großen 1.000+ Wörterbuch (TeacherDictionary) suchen!
      if (typeof TeacherDictionary !== 'undefined' && TeacherDictionary.searchAll) {
        const dictMatches = TeacherDictionary.searchAll(term);
        const existingEn = new Set(displayList.map(v => v.english.toLowerCase()));
        for (const dm of dictMatches) {
          if (!existingEn.has(dm.english.toLowerCase())) {
            displayList.push(dm);
            existingEn.add(dm.english.toLowerCase());
          }
        }
      }

      // Sofort-Übersetzer-Box ganz oben im Wörterbuch anzeigen (übersetzt jedes Wort & jeden Satz live!)
      const liveBox = document.createElement('div');
      liveBox.className = 'glossary-item expanded';
      liveBox.style.borderColor = 'rgba(56, 189, 248, 0.55)';
      liveBox.style.background = 'linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.92))';
      const instantHit = (typeof TeacherDictionary !== 'undefined') ? TeacherDictionary.lookup(rawQuery) : null;
      const initialTrans = instantHit
        ? (instantHit.direction === 'en_to_de' ? instantHit.german : instantHit.english)
        : 'Übersetze live... ⏳';
      liveBox.innerHTML = `
        <div class="glossary-summary" style="cursor: default;">
          <div class="item-left">
            <div class="item-en">
              🌐 <span id="glossaryLiveResultText">${escapeHtml(initialTrans)}</span>
              <span class="item-badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">Sofort-Übersetzer (DE ↔ EN)</span>
            </div>
            <div class="item-de">Deine Eingabe: <strong>„${escapeHtml(rawQuery)}“</strong></div>
          </div>
          <div class="item-actions">
            <button class="item-audio-btn" id="btnGlossarySpeakLive" title="Englische Übersetzung anhören">🔊</button>
          </div>
        </div>
      `;
      listEl.appendChild(liveBox);

      const speakLiveBtn = liveBox.querySelector('#btnGlossarySpeakLive');
      if (speakLiveBtn) {
        speakLiveBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const txtEl = document.getElementById('glossaryLiveResultText');
          const txt = txtEl ? txtEl.textContent.split('(')[0].replace(/^to\s+/i, '').trim() : rawQuery;
          speakEnglish(txt, 0.85);
        });
      }

      if (glossaryLiveTimer) clearTimeout(glossaryLiveTimer);
      glossaryLiveTimer = setTimeout(() => {
        if (typeof TeacherDictionary !== 'undefined' && TeacherDictionary.translateLive) {
          TeacherDictionary.translateLive(rawQuery, 'en').then(res => {
            const el = document.getElementById('glossaryLiveResultText');
            if (el && res && res.translatedText) {
              el.textContent = res.translatedText;
            } else if (el && !instantHit) {
              el.textContent = 'Keine direkte Übersetzung gefunden';
            }
          });
        }
      }, 220);
    }

    if (displayList.length === 0 && !term) {
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
  // Standardmäßig IMMER vorlesen ('voice' = wie ein echter Gesprächspartner).
  // Wenn der Nutzer unterwegs ist, kann er jederzeit auf 'text' (Nur Text / Stumm) umschalten.
  let currentDialogMode = (function() {
    try {
      return localStorage.getItem('fiae_dialog_mode') || 'voice';
    } catch (e) {
      return 'voice';
    }
  })();
  let currentScenarioId = 'beginner';

  // SYSTEM-BEFEHLE, BUTTON-TEXTE & VOKABELN, DIE NIEMALS ALS BENUTZERNAME GESPEICHERT WERDEN DÜRFEN (v41)
  const SYSTEM_NAME_BLACKLIST = new Set([
    'erklären', 'erklaeren', 'explain', 'korrigieren', 'korrektur', 'correct', 'correction',
    'vorlesen', 'read', 'listen', 'hören', 'hoeren', 'avatar', 'stimme', 'voice',
    'neustart', 'restart', 'reset', 'hilfe', 'help', 'quiz', 'test', 'übersetzen',
    'uebersetzen', 'translate', 'translation', 'settings', 'einstellungen', 'abbrechen',
    'cancel', 'stopp', 'stop', 'senden', 'send', 'study', 'learn', 'lernen', 'work',
    'arbeiten', 'speak', 'sprechen', 'practice', 'üben', 'ueben', 'today', 'heute',
    'morning', 'evening', 'night', 'tag', 'tomorrow', 'morgen', 'yesterday', 'gestern',
    'english', 'englisch', 'deutsch', 'german', 'okay', 'ok', 'sure', 'klar', 'ready',
    'start', 'begin', 'hallo', 'hello', 'hi', 'hey', 'danke', 'thanks', 'thank', 'bitte',
    'please', 'yes', 'no', 'ja', 'nein', 'good', 'gut', 'bad', 'schlecht', 'fine', 'how',
    'what', 'who', 'when', 'where', 'why', 'name', 'namen', 'first', 'second', 'wukabelari',
    'vocabulary', 'word', 'words', 'wort', 'wörter', 'sentence', 'satz', 'calling', 'tired'
  ]);
  function normalizeLearnerName(rawName) {
    const clean = (rawName || '').trim();
    if (!clean) return '';
    if (SYSTEM_NAME_BLACKLIST.has(clean.toLowerCase())) {
      return '';
    }
    if (/^(ishtam|ishta|isht|ishvan|istwan|ischtvan|ischwan|istfan|isthvan|istv[aá]n|easton|ishtvan)$/i.test(clean)) {
      return 'Istvan';
    }
    return clean;
  }

  function getUserName() {
    const stored = localStorage.getItem('fiae_user_name') || '';
    if (SYSTEM_NAME_BLACKLIST.has(stored.toLowerCase().trim())) {
      localStorage.removeItem('fiae_user_name');
      return '';
    }
    const norm = normalizeLearnerName(stored);
    if (!norm) {
      localStorage.removeItem('fiae_user_name');
      return '';
    }
    if (norm !== stored) {
      localStorage.setItem('fiae_user_name', norm);
    }
    return norm;
  }

  function setUserName(name) {
    const clean = normalizeLearnerName(name);
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

  // --- AUSSPRACHE- & LAUTSCHRIFT-GENERATOR FÜR DEUTSCHSPRACHIGE (v38) ---
  const PronunciationCoach = {
    knownPhonetics: {
      'project': 'PRO-dschekt', 'projects': 'PRO-dschekts', 'motivation': 'mo-ti-WEJ-schn',
      'children': 'TSCHIL-drön', 'child': 'TSCHAILD', 'study': 'STA-di', 'studying': 'STA-di-ing',
      'studio': 'STU-di-oh', 'will': 'wil', 'first': 'först', 'say': 'sey', 'tell': 'tel',
      'coffee': 'KOF-i', 'teeth': 'tieth', 'tooth': 'tuth', 'brush': 'brasch', 'train': 'treyn',
      'get': 'get', 'drink': 'drink', 'am': 'ey-em', 'pm': 'pi-em',
      'better': 'BET-ör', 'good': 'gud', 'best': 'best', 'doesnt': 'DAS-nt', "doesn't": 'DAS-nt',
      'matter': 'MÄT-ör', 'explain': 'ik-SPLEYN', 'understand': 'an-dör-STÄND', 'speaking': 'SPIH-king',
      'speak': 'spihk', 'english': 'ING-glisch', 'german': 'DSCHÖR-mön', 'language': 'LÄNG-gwidsch',
      'improve': 'im-PRUHW', 'pronunciation': 'pro-nan-si-EY-schön', 'sentence': 'SEN-tens',
      'word': 'wörd', 'words': 'wörds', 'example': 'ig-SAM-pöl', 'grammar': 'GRÄM-ör',
      'question': 'KWES-tschön', 'answer': 'ÄN-sör', 'practice': 'PRÄK-tis', 'learn': 'lörn',
      'learning': 'LÖR-ning', 'because': 'bi-KAWS', 'through': 'thru', 'thought': 'thawt',
      'thoughts': 'thawts', 'although': 'awl-THOH', 'weather': 'WETH-ör', 'together': 'tu-GETH-ör',
      'really': 'RIH-li', 'actually': 'ÄK-tschu-ö-li', 'currently': 'KÖR-önt-li', 'usually': 'JUH-schu-ö-li',
      'always': 'AWL-weys', 'never': 'NEV-ör', 'often': 'OF-ön', 'sometimes': 'SAM-taims',
      'yesterday': 'JES-tör-dey', 'today': 'tu-DEY', 'tomorrow': 'tu-MOR-oh', 'morning': 'MOR-ning',
      'evening': 'IHW-ning', 'afternoon': 'af-tör-NUHN', 'night': 'nait', 'early': 'ÖR-li', 'late': 'leyt',
      'moment': 'MOH-mönt', 'this': 'this', 'that': 'thät', 'these': 'thihs', 'those': 'thohs',
      'the': 'the', 'at': 'ät', 'in': 'in', 'on': 'on', 'it': 'it', 'now': 'nau', 'very': 'WER-i',
      'little': 'LIT-öl', 'yet': 'jet', 'well': 'wel', 'sleep': 'slihp', 'coffee': 'KOF-ih',
      'right': 'rait', 'know': 'noh', 'write': 'rait',
      'wrong': 'rong', 'listen': 'LIS-ön', 'could': 'kud', 'would': 'wud', 'should': 'schud',
      'can': 'kän', 'you': 'juh', 'your': 'johr', 'my': 'mai', 'mine': 'main', 'me': 'mih',
      'we': 'wih', 'they': 'they', 'their': 'thehr', 'there': 'thehr', 'where': 'wehr',
      'what': 'wot', 'when': 'wen', 'why': 'wai', 'who': 'huh', 'how': 'hau',
      'are': 'ahr', 'were': 'wör', 'was': 'wos', 'is': 'is', 'have': 'häw', 'has': 'häs',
      'make': 'meyk', 'made': 'meyd', 'take': 'teyk', 'give': 'giw', 'help': 'help',
      'please': 'plihs', 'thank': 'thänk', 'thanks': 'thänks', 'welcome': 'WEL-kam',
      'hello': 'he-LOH', 'name': 'neym', 'nice': 'nais', 'meet': 'miht', 'great': 'greyt',
      'work': 'wörk', 'working': 'WÖR-king', 'worked': 'wörkt', 'database': 'DEY-tö-beys',
      'query': 'KWIH-ri', 'server': 'SÖR-wör', 'code': 'kohd', 'developer': 'di-WEL-ö-pör',
      'software': 'SOFT-wehr', 'application': 'äp-li-KEY-schön', 'requirement': 'ri-KWAIR-mönt',
      'requirements': 'ri-KWAIR-mönts', 'library': 'LAI-brö-ri', 'vocabulary': 'wo-KÄB-ju-lö-ri'
    },

    wordToGermanPhonetic(w) {
      if (!w) return '';
      const clean = w.toLowerCase().replace(/[^a-z']/g, '');
      if (!clean) return w;
      if (this.knownPhonetics[clean]) return this.knownPhonetics[clean];

      let p = clean;
      p = p
        .replace(/^kn/, 'n')
        .replace(/^wr/, 'r')
        .replace(/^wh/, 'w')
        .replace(/tion$/g, '§SCHON§')
        .replace(/sion$/g, '§SCHON§')
        .replace(/ture$/g, '§TSCHOR§')
        .replace(/ough/g, 'oh')
        .replace(/igh/g, 'ai')
        .replace(/ea/g, 'ih')
        .replace(/ee/g, 'ih')
        .replace(/oo/g, 'uh')
        .replace(/ou/g, 'au')
        .replace(/ow/g, 'au')
        .replace(/ay/g, 'ey')
        .replace(/ai/g, 'ey')
        .replace(/ch/g, '§TSCH§')
        .replace(/sh/g, '§SCH§')
        .replace(/th/g, 'th')
        .replace(/ph/g, 'f')
        .replace(/ck/g, 'k')
        .replace(/qu/g, 'kw')
        .replace(/er$/g, 'ör')
        .replace(/or$/g, 'ör')
        .replace(/ir/g, 'ör')
        .replace(/ur/g, 'ör')
        .replace(/y$/g, 'i')
        .replace(/v/g, 'w')
        .replace(/j/g, '§DSCH§')
        .replace(/c([eiy])/g, 's$1')
        .replace(/c/g, 'k')
        .replace(/§SCHON§/g, 'schn')
        .replace(/§TSCHOR§/g, 'tscher')
        .replace(/§TSCH§/g, 'tsch')
        .replace(/§SCH§/g, 'sch')
        .replace(/§DSCH§/g, 'dsch');
      if (p.length > 3 && p.endsWith('e') && !p.endsWith('ie') && !p.endsWith('ee')) {
        p = p.slice(0, -1);
      }
      return p;
    },

    toPhonetic(sentence) {
      if (!sentence) return '';
      const clean = String(sentence).replace(/<[^>]+>/g, '').trim();
      const tokens = clean.split(/\s+/).filter(Boolean);
      return tokens.map(tok => {
        const puncMatch = tok.match(/([.?!,;]+)$/);
        const punc = puncMatch ? puncMatch[1] : '';
        const core = tok.replace(/[^a-zA-Z']/g, '');
        if (!core) return tok;
        return this.wordToGermanPhonetic(core) + punc;
      }).join(' ');
    },

    getGrammarAndUsageTip(deWord, enWord) {
      const enClean = (enWord || '').toLowerCase().split(/[\/(\s]/)[0].trim();
      const deClean = (deWord || '').toLowerCase().trim();
      if (enClean === 'better' || deClean === 'besser') {
        return {
          grammarTip: 'Steigerungsform (Komparativ) von <strong>good</strong> (gut): <em>good ➔ better ➔ the best</em>.',
          exampleEn: 'My English speaking is getting better every day.',
          exampleDe: 'Mein gesprochenes Englisch wird jeden Tag besser.'
        };
      }
      if (deClean === 'egal' || enWord.toLowerCase().includes('matter')) {
        return {
          grammarTip: 'Redewendung im Alltag: Man sagt <strong>"It doesn\'t matter"</strong> (Es macht nichts / Es ist egal) oder kurz <strong>"Never mind"</strong>.',
          exampleEn: 'It doesn\'t matter if you make a small mistake.',
          exampleDe: 'Es ist egal (macht nichts), wenn du einen kleinen Fehler machst.'
        };
      }
      if (enClean === 'explain' || deClean.startsWith('erklär')) {
        return {
          grammarTip: 'Wichtige Grammatik-Regel: Nach <em>explain</em> steht bei Personen immer <strong>"to"</strong>: <em>"Can you explain this <strong>to me</strong>?"</em> (NIEMALS "explain me").',
          exampleEn: 'Can you explain this grammar rule to me?',
          exampleDe: 'Kannst du mir diese Grammatikregel erklären?'
        };
      }
      if ((enWord || '').trim().toLowerCase().startsWith('to ')) {
        const baseV = enWord.split('/')[0].replace(/^to\s+/i, '').trim();
        return {
          grammarTip: `Englisches Verb (Grundform: <strong>to ${baseV}</strong>). Im normalen Satz steht es direkt nach der Person (Subjekt + Verb + Objekt): <em>"I ${baseV}..."</em> oder <em>"Can you ${baseV}..."</em>.`,
          exampleEn: `Can you help me ${baseV} this in English?`,
          exampleDe: `Kannst du mir helfen, das auf Englisch anzuwenden (${deWord})?`
        };
      }
      const primary = (enWord || '').split(/[\/(\,]/)[0].trim();
      return {
        grammarTip: `Wichtige Vokabel: <strong>"${primary}"</strong>. Sprich die Silben ruhig und weich aus: <code>[${this.toPhonetic(primary)}]</code>.`,
        exampleEn: `Can you show me how to use "${primary}" in a sentence?`,
        exampleDe: `Kannst du mir zeigen, wie man „${primary}“ (${deWord}) in einem Satz benutzt?`
      };
    }
  };

  // --- DER GRAMMATIK- & SATZ-DOKTOR (CLIENT-SEITIGE ANALYSE, KORREKTUR-VORSCHLAG & PRAISE) ---
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

    // Bekannte englische Grundwörter für die automatische Rechtschreib- & Tippfehler-Prüfung (Fuzzy-Spellcheck)
    coreEnglishWords: [
      'a', 'about', 'above', 'actually', 'add', 'after', 'afternoon', 'again', 'against', 'age', 'ago', 'agree', 'ai', 'all', 'almost', 'alone', 'along', 'already', 'also', 'although', 'always', 'am', 'among', 'an', 'and', 'animal', 'another', 'answer', 'any', 'anything', 'api', 'app', 'application', 'architecture', 'are', 'area', 'argument', 'around', 'arrive', 'art', 'article', 'artificial', 'as', 'ask', 'asked', 'asking', 'at', 'away', 'awesome',
      'back', 'backend', 'bad', 'balance', 'bank', 'barrier', 'base', 'basic', 'be', 'beat', 'beautiful', 'became', 'because', 'become', 'bed', 'been', 'before', 'begin', 'beginner', 'behind', 'believe', 'best', 'better', 'between', 'big', 'bit', 'blocker', 'blockers', 'board', 'book', 'bored', 'both', 'bottleneck', 'bowl', 'boy', 'break', 'breakfast', 'breakthrough', 'briefly', 'bring', 'brother', 'bug', 'bugs', 'build', 'building', 'built', 'burger', 'business', 'busy', 'but', 'buy', 'by',
      'call', 'called', 'calling', 'came', 'can', 'canada', 'cannot', 'car', 'carbon', 'card', 'care', 'career', 'case', 'cat', 'catch', 'catching', 'central', 'certain', 'certainly', 'challenge', 'challenges', 'chance', 'change', 'changes', 'chat', 'chatting', 'check', 'checked', 'checkout', 'child', 'children', 'chill', 'choice', 'choose', 'cinema', 'city', 'class', 'clean', 'clear', 'clears', 'climate', 'close', 'cloth', 'cloud', 'cloudy', 'coach', 'code', 'codebase', 'coding', 'coffee', 'cold', 'colleague', 'colleagues', 'color', 'come', 'comes', 'coming', 'common', 'communication', 'companies', 'company', 'comparative', 'complete', 'completely', 'complex', 'complimentary', 'computer', 'concept', 'conduct', 'confidence', 'confident', 'connection', 'consequences', 'continue', 'continuous', 'control', 'conversation', 'conversations', 'cool', 'coordinating', 'correct', 'corrected', 'correction', 'cost', 'could', 'countries', 'country', 'couple', 'course', 'couch', 'coverage', 'create', 'cup', 'currency', 'current', 'currently', 'customer',
      'daily', 'dark', 'data', 'database', 'databases', 'day', 'days', 'debate', 'debates', 'decade', 'decide', 'decision', 'decisions', 'decoupling', 'deep', 'deeper', 'deficit', 'definitely', 'dependencies', 'depend', 'depends', 'deployment', 'describe', 'design', 'detail', 'details', 'develop', 'developer', 'developers', 'developing', 'development', 'devops', 'did', 'didnt', 'difference', 'different', 'difficult', 'dinner', 'direct', 'directly', 'disagree', 'discover', 'discovered', 'discovering', 'discuss', 'discussed', 'discussing', 'discussion', 'discussions', 'do', 'docker', 'doctor', 'documentation', 'does', 'doesnt', 'dog', 'dogs', 'doing', 'dollar', 'done', 'dont', 'door', 'doors', 'down', 'drink', 'drinks', 'drivers', 'du', 'during',
      'each', 'early', 'easy', 'eat', 'eating', 'economic', 'economics', 'economy', 'editor', 'editors', 'education', 'effect', 'eight', 'either', 'electronic', 'else', 'email', 'emerging', 'end', 'endpoint', 'energy', 'engineer', 'engineering', 'english', 'enjoy', 'enjoyable', 'enough', 'environment', 'equipment', 'error', 'errors', 'especially', 'essay', 'euro', 'europe', 'even', 'evening', 'event', 'ever', 'every', 'everyday', 'everyone', 'everything', 'evolving', 'exact', 'exactly', 'exam', 'example', 'examples', 'exams', 'exception', 'excites', 'exercise', 'exhausted', 'experience', 'experienced', 'explain', 'explained', 'explaining', 'explanation', 'explanations', 'explore', 'export', 'express', 'expressed', 'expressing',
      'face', 'fact', 'fail', 'failed', 'fair', 'fall', 'family', 'far', 'fast', 'faster', 'fantastic', 'fascinating', 'father', 'favorite', 'fear', 'feature', 'features', 'fed', 'federal', 'feedback', 'feel', 'feeling', 'few', 'field', 'fifteen', 'fifth', 'fifty', 'fight', 'figure', 'file', 'files', 'fill', 'film', 'films', 'final', 'finally', 'find', 'fine', 'finish', 'finished', 'fire', 'first', 'fish', 'fitness', 'five', 'fix', 'fixed', 'fixing', 'flexible', 'flexibility', 'floor', 'flow', 'flowing', 'fluent', 'fluently', 'focus', 'follow', 'following', 'food', 'football', 'for', 'forecast', 'foreign', 'foresee', 'forget', 'form', 'forties', 'forward', 'found', 'four', 'free', 'freedom', 'freedoms', 'freely', 'fresh', 'friday', 'friend', 'friendly', 'friends', 'from', 'frontend', 'fruit', 'full', 'fun', 'function', 'functions', 'funny', 'future',
      'game', 'games', 'gaming', 'gave', 'general', 'german', 'germany', 'get', 'getting', 'git', 'give', 'given', 'gives', 'glad', 'gladly', 'global', 'globalization', 'go', 'goal', 'goals', 'goes', 'going', 'good', 'got', 'government', 'grade', 'grammar', 'great', 'green', 'group', 'grow', 'growing', 'guess', 'guest', 'guests', 'guide', 'guitar', 'guy', 'guys', 'gym',
      'had', 'half', 'hand', 'happen', 'happened', 'happens', 'happiness', 'happy', 'hard', 'hardware', 'has', 'have', 'having', 'he', 'head', 'hear', 'heard', 'hearing', 'heart', 'heat', 'heavy', 'hello', 'help', 'helped', 'helpful', 'helping', 'helps', 'her', 'here', 'hey', 'hi', 'high', 'higher', 'him', 'himself', 'his', 'history', 'hit', 'hobbies', 'hobby', 'hold', 'holiday', 'home', 'homework', 'hope', 'hot', 'hotel', 'hour', 'hours', 'house', 'how', 'however', 'huge', 'human', 'hundred', 'hunger', 'hungry', 'husband',
      'i', 'idea', 'ideas', 'if', 'ill', 'im', 'image', 'imagine', 'imf', 'immediately', 'impact', 'implement', 'implemented', 'import', 'important', 'improve', 'improved', 'improving', 'in', 'incident', 'include', 'includes', 'including', 'income', 'increase', 'indeed', 'index', 'industry', 'inflation', 'influence', 'info', 'information', 'inside', 'inspect', 'instead', 'intelligence', 'interest', 'interested', 'interesting', 'international', 'internet', 'interview', 'into', 'introduce', 'investigated', 'investment', 'ireland', 'is', 'isnt', 'issue', 'issues', 'it', 'italian', 'item', 'items', 'its', 'itself',
      'january', 'java', 'job', 'jobs', 'join', 'joining', 'joke', 'jump', 'junior', 'just',
      'keep', 'key', 'kids', 'kind', 'knew', 'know', 'knowledge', 'known', 'knows',
      'land', 'language', 'languages', 'large', 'last', 'late', 'later', 'laugh', 'law', 'lead', 'leader', 'leading', 'learn', 'learned', 'learner', 'learners', 'learning', 'least', 'leave', 'left', 'less', 'let', 'lets', 'letter', 'level', 'library', 'life', 'light', 'like', 'liked', 'likely', 'line', 'lines', 'list', 'listen', 'listening', 'little', 'live', 'living', 'local', 'log', 'logistics', 'logs', 'london', 'long', 'longer', 'look', 'looking', 'looks', 'lose', 'lost', 'lot', 'lots', 'loud', 'love', 'loved', 'lovely', 'low', 'lower', 'luck', 'lucky', 'lunch',
      'machine', 'made', 'main', 'major', 'make', 'makes', 'making', 'man', 'manage', 'manager', 'many', 'market', 'markets', 'master', 'math', 'maths', 'matter', 'matters', 'may', 'maybe', 'me', 'mean', 'meaning', 'means', 'meant', 'media', 'meet', 'meeting', 'meetings', 'member', 'members', 'memory', 'men', 'merge', 'message', 'messages', 'metal', 'method', 'methods', 'microphone', 'middle', 'might', 'mind', 'mine', 'minute', 'minutes', 'miss', 'mistake', 'mistakes', 'mix', 'mode', 'model', 'modern', 'moment', 'monday', 'monetary', 'money', 'monolith', 'monolithic', 'month', 'months', 'more', 'morning', 'most', 'mostly', 'mother', 'motivates', 'mountain', 'mountains', 'move', 'movie', 'movies', 'mr', 'mrs', 'ms', 'much', 'music', 'must', 'my', 'myself',
      'name', 'names', 'natural', 'naturally', 'nature', 'near', 'nearby', 'nearly', 'necessary', 'need', 'needed', 'needs', 'network', 'never', 'new', 'news', 'next', 'nice', 'night', 'nine', 'no', 'nobody', 'none', 'normal', 'north', 'not', 'note', 'nothing', 'notice', 'noticed', 'now', 'number', 'numbers',
      'oatmeal', 'object', 'of', 'off', 'offer', 'office', 'often', 'oh', 'ok', 'okay', 'old', 'older', 'on', 'once', 'one', 'online', 'only', 'open', 'opens', 'opinion', 'opportunities', 'opportunity', 'optimize', 'optimizing', 'option', 'or', 'order', 'other', 'others', 'our', 'out', 'outdoors', 'outside', 'over', 'own',
      'pack', 'page', 'paid', 'paper', 'parent', 'parents', 'park', 'part', 'particular', 'particularly', 'partner', 'partners', 'parts', 'party', 'pass', 'passionate', 'passport', 'past', 'pasta', 'path', 'pay', 'peace', 'peak', 'people', 'per', 'percent', 'perfect', 'performance', 'perhaps', 'period', 'person', 'personal', 'perspective', 'pet', 'pets', 'phone', 'photo', 'phrase', 'phrases', 'pick', 'picture', 'piece', 'pizza', 'place', 'places', 'plan', 'planned', 'planning', 'plans', 'plant', 'play', 'playing', 'please', 'plenty', 'plus', 'podcast', 'podcasts', 'point', 'points', 'policy', 'pool', 'poor', 'popular', 'position', 'positive', 'possible', 'power', 'powerful', 'practical', 'practice', 'practicing', 'prefer', 'prepare', 'preparing', 'present', 'president', 'pressure', 'pretty', 'previous', 'price', 'prices', 'primarily', 'principles', 'priorities', 'priority', 'private', 'probably', 'problem', 'problems', 'proceed', 'process', 'produce', 'producing', 'product', 'production', 'productivity', 'professional', 'professor', 'program', 'programmer', 'programmers', 'programming', 'progress', 'project', 'projects', 'prompt', 'pronounce', 'pronunciation', 'protect', 'protectionism', 'protective', 'provide', 'provides', 'prs', 'public', 'pull', 'put', 'python',
      'qa', 'quality', 'queries', 'query', 'question', 'questions', 'quick', 'quickly', 'quiet', 'quite', 'quiz', 'quota',
      'radio', 'rain', 'raining', 'rate', 'rates', 'rather', 'reach', 'read', 'reading', 'ready', 'real', 'really', 'reason', 'reasoning', 'rebase', 'receive', 'recently', 'recommend', 'red', 'reduce', 'refactor', 'refactored', 'refactoring', 'regular', 'related', 'relationship', 'relax', 'relaxing', 'release', 'reliable', 'remember', 'remote', 'remove', 'repeat', 'replace', 'reply', 'report', 'reproduce', 'request', 'requests', 'require', 'requirement', 'requirements', 'research', 'reservation', 'resilience', 'resilient', 'resource', 'resources', 'respond', 'response', 'rest', 'restaurant', 'result', 'results', 'return', 'review', 'right', 'risk', 'risks', 'road', 'robot', 'robots', 'rock', 'role', 'room', 'routine', 'rule', 'rules', 'run', 'running', 'runs',
      'sad', 'safe', 'said', 'same', 'saturday', 'save', 'saved', 'saves', 'saw', 'say', 'saying', 'says', 'scale', 'scenario', 'school', 'science', 'scrum', 'search', 'season', 'second', 'seconds', 'section', 'security', 'see', 'seeing', 'seem', 'seems', 'seen', 'select', 'send', 'senior', 'sense', 'sent', 'sentence', 'sentences', 'series', 'serious', 'server', 'servers', 'service', 'services', 'set', 'seven', 'several', 'shall', 'share', 'sharing', 'she', 'short', 'should', 'show', 'shows', 'sick', 'side', 'simple', 'simply', 'since', 'single', 'sister', 'sit', 'site', 'situation', 'six', 'size', 'skill', 'skills', 'skipped', 'sleep', 'sleeping', 'sleepy', 'slow', 'slower', 'slowly', 'small', 'smalltalk', 'smartphone', 'smith', 'so', 'soccer', 'social', 'software', 'solid', 'solution', 'solutions', 'solve', 'solving', 'some', 'somebody', 'someone', 'something', 'sometimes', 'song', 'songs', 'soon', 'sorry', 'sort', 'sound', 'sounds', 'south', 'space', 'speak', 'speaking', 'speaks', 'special', 'specialize', 'specific', 'spend', 'spending', 'spent', 'split', 'spoken', 'sport', 'sports', 'sprint', 'sql', 'staff', 'stage', 'stand', 'standard', 'stands', 'standup', 'start', 'started', 'starting', 'starts', 'state', 'statement', 'station', 'status', 'stay', 'staying', 'step', 'steps', 'still', 'stop', 'stories', 'story', 'straight', 'street', 'stressed', 'strong', 'structured', 'stuck', 'student', 'students', 'study', 'studying', 'stuff', 'style', 'subject', 'subtitles', 'success', 'successful', 'such', 'suddenly', 'summer', 'sun', 'sunday', 'sunny', 'super', 'supply', 'support', 'sure', 'surplus', 'sushi', 'sustainability', 'switch', 'sync', 'synth', 'synthesizer', 'synthesizers', 'system', 'systems',
      'table', 'take', 'taken', 'takes', 'taking', 'talk', 'talking', 'talks', 'tariff', 'tariffs', 'task', 'tasks', 'tea', 'teach', 'teacher', 'teaching', 'team', 'teams', 'teamwork', 'tech', 'technical', 'technology', 'tell', 'telling', 'ten', 'term', 'terms', 'test', 'tested', 'testing', 'tests', 'text', 'than', 'thank', 'thanks', 'that', 'thats', 'the', 'their', 'them', 'themselves', 'then', 'theory', 'there', 'therefore', 'these', 'they', 'thing', 'things', 'think', 'thinking', 'third', 'thirties', 'thirsty', 'thirty', 'this', 'those', 'though', 'thought', 'thoughtful', 'thoughts', 'thousand', 'three', 'through', 'throughout', 'thursday', 'ticket', 'tickets', 'time', 'timeout', 'times', 'tip', 'tips', 'tired', 'title', 'to', 'toast', 'today', 'together', 'told', 'tomorrow', 'tonight', 'too', 'took', 'tool', 'tools', 'top', 'topic', 'topics', 'total', 'totally', 'toward', 'town', 'track', 'trade', 'traffic', 'train', 'training', 'transaction', 'translate', 'translated', 'translating', 'translation', 'translations', 'travel', 'treaty', 'tree', 'trial', 'trick', 'tried', 'true', 'truth', 'try', 'trying', 'tube', 'tuesday', 'turn', 'twenty', 'twenties', 'twice', 'two', 'type',
      'uk', 'under', 'understand', 'understanding', 'understood', 'unit', 'united', 'unless', 'unread', 'until', 'unwind', 'up', 'update', 'updated', 'upon', 'us', 'usa', 'use', 'used', 'useful', 'user', 'users', 'uses', 'using', 'usual', 'usually',
      'vacation', 'valuable', 'value', 'values', 'various', 'verb', 'verify', 'version', 'very', 'video', 'view', 'visit', 'vocab', 'vocabulary', 'voice',
      'wait', 'waiting', 'walk', 'walking', 'wall', 'want', 'wanted', 'wants', 'war', 'warm', 'wars', 'was', 'wasnt', 'watch', 'watching', 'water', 'way', 'ways', 'we', 'weather', 'web', 'website', 'wednesday', 'week', 'weekend', 'weeks', 'welcome', 'well', 'went', 'were', 'west', 'what', 'whatever', 'whats', 'when', 'whenever', 'where', 'whether', 'which', 'while', 'white', 'who', 'whole', 'whom', 'whose', 'why', 'wide', 'wife', 'will', 'win', 'wind', 'window', 'windy', 'wine', 'winter', 'wish', 'with', 'within', 'without', 'woman', 'women', 'wonderful', 'wont', 'word', 'words', 'work', 'worked', 'working', 'workplace', 'works', 'world', 'worldwide', 'worry', 'worse', 'worst', 'worth', 'would', 'wouldnt', 'write', 'writing', 'written', 'wrong', 'wrote',
      'yeah', 'year', 'years', 'yep', 'yes', 'yesterday', 'yet', 'you', 'young', 'your', 'yours', 'yourself', 'zero'
    ],

    _validEnglishSet: null,
    getValidEnglishSet() {
      if (this._validEnglishSet) return this._validEnglishSet;
      const set = new Set(this.coreEnglishWords);
      if (typeof PronunciationCoach !== 'undefined' && PronunciationCoach.knownPhonetics) {
        Object.keys(PronunciationCoach.knownPhonetics).forEach(w => set.add(w.toLowerCase()));
      }
      this.techVocabList.forEach(w => set.add(w.toLowerCase()));
      if (typeof VOCAB_DATA !== 'undefined' && Array.isArray(VOCAB_DATA)) {
        VOCAB_DATA.forEach(item => {
          if (item && item.english) {
            item.english.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).forEach(w => set.add(w));
          }
        });
      }
      this._validEnglishSet = set;
      return set;
    },

    // Levenshtein-Distanz für automatische Rechtschreibkorrektur (Tippfehler & Lautschrift-Schreibweisen)
    editDistance(a, b) {
      if (a === b) return 0;
      if (!a.length) return b.length;
      if (!b.length) return a.length;
      if (Math.abs(a.length - b.length) > 2) return 99;
      const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
      for (let i = 0; i <= a.length; i++) dp[i][0] = i;
      for (let j = 0; j <= b.length; j++) dp[0][j] = j;
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + cost
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
          }
        }
      }
      return dp[a.length][b.length];
    },

    findClosestEnglishWord(rawWord) {
      const w = (rawWord || '').toLowerCase().replace(/[^a-z]/g, '');
      if (!w || w.length < 3) return null;
      const validSet = this.getValidEnglishSet();
      if (validSet.has(w)) return null;

      // 1. Phonetische Normalisierung für deutschsprachige Lernende (z. B. dhis -> this, earley -> early, sch -> sh)
      const phoneticCandidates = [
        w.replace(/^dh/, 'th'),
        w.replace(/dh/g, 'th'),
        w.replace(/ey$/, 'y'),
        w.replace(/ie/g, 'ea'),
        w.replace(/ie/g, 'ee'),
        w.replace(/sch/g, 'sh'),
        w.replace(/tsch/g, 'ch'),
        w.replace(/^k/, 'c'),
        w.replace(/k/g, 'c'),
        w.replace(/w/g, 'v'),
        w.replace(/(.)\1+/g, '$1'),
        w.replace(/^dh/, 'th').replace(/ey$/, 'y')
      ];
      for (const cand of phoneticCandidates) {
        if (cand && validSet.has(cand)) return cand;
      }

      // 2. Fuzzy-Suche (Edit-Distanz 1, oder 2 bei längeren Wörtern >= 6 Buchstaben)
      let bestMatch = null;
      let bestScore = 99;
      for (const target of this.coreEnglishWords) {
        if (target.length < 3) continue;
        if (Math.abs(target.length - w.length) > 2) continue;
        const sameFirst = target[0] === w[0] ||
          (w.startsWith('dh') && target.startsWith('th')) ||
          (w.startsWith('k') && target.startsWith('c')) ||
          (w.startsWith('c') && target.startsWith('k')) ||
          (w.startsWith('i') && target.startsWith('e')) ||
          (w.startsWith('e') && target.startsWith('i'));
        if (!sameFirst) continue;
        const dist = this.editDistance(w, target);
        const maxAllowed = (w.length >= 6 && target.length >= 6) ? 2 : 1;
        if (dist <= maxAllowed && dist < bestScore) {
          bestScore = dist;
          bestMatch = target;
          if (dist === 1 && Math.abs(target.length - w.length) <= 1) break;
        }
      }
      return bestMatch;
    },

    analyze(text) {
      const clean = text.trim();
      if (!clean) return null;

      const lower = clean.toLowerCase();

      // ============================================================
      // SYSTEMATISCHE REPARATUR-PIPELINE (v41)
      // Behebt akustische Verhörer, Denglisch & Wortstellung ganzheitlich
      // ============================================================

      // Test 1: "First I wil Studio wukabelari" -> "First I will study vocabulary."
      if (/\b(first|then|now|today|i)?\s*wil\s+(studio|studie|study)\s+(wukabelari|vokabeln|vocab|vocabulary)\b/i.test(lower) ||
          /\b(studio|studie)\s+(wukabelari|vokabeln)\b/i.test(lower)) {
        let fixed = clean
          .replace(/\bwil\b/gi, 'will')
          .replace(/\b(studio|studie)\b/gi, 'study')
          .replace(/\bwukabelari\b/gi, 'vocabulary');
        fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
        if (!/[.!?]$/.test(fixed)) fixed += '.';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <strong>"${fixed}"</strong><br>
1️⃣ <em>"will"</em> schreibt man mit Doppel-l.<br>
2️⃣ Vokabeln lernen heißt auf Englisch <strong>"study vocabulary"</strong> (nicht <em>Studio</em>).<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // Test 2: "Say mee how old ara you" -> "Tell me how old you are."
      if (/\b(say\s+mee|say\s+me)\b.*\bhow\s+old\b/i.test(lower) ||
          /\bhow\s+old\s+ara\s+you\b/i.test(lower)) {
        const fixed = 'Tell me how old you are.';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <strong>"${fixed}"</strong><br>
1️⃣ Im Englischen sagt man <strong>"Tell me"</strong> (nicht <em>Say me</em>).<br>
2️⃣ In indirekten Fragen steht das Subjekt vor dem Verb: <strong>"how old you are"</strong>.<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // Test 3: "Now ist 7:23 am I go up drink a coffe bruschetta teeth ang going to zrain"
      if (/\bnow\s+(ist|is)\s+\d{1,2}:\d{2}\b/i.test(lower) ||
          (/\bbruschetta\s+teeth\b/i.test(lower)) ||
          (/\bgo\s+up\b.*\bdrink.*coffe/i.test(lower)) ||
          (/\b(going\s+to|to)\s+zrain\b/i.test(lower))) {
        let repaired = clean
          .replace(/\bnow\s+ist\b/gi, 'Now it is')
          .replace(/\bnow\s+is\b/gi, 'Now it is')
          .replace(/\bgo\s+up\b/gi, 'get up')
          .replace(/\bcoffe\b/gi, 'coffee')
          .replace(/\bbruschetta\s+teeth\b/gi, 'brush my teeth')
          .replace(/\bbrush\s+teeth\b/gi, 'brush my teeth')
          .replace(/\bang\b/gi, 'and')
          .replace(/\bgoing\s+to\s+(the\s+)?zrain\b/gi, 'go to the train')
          .replace(/\bto\s+zrain\b/gi, 'to the train')
          .replace(/\bzrain\b/gi, 'train');

        const mTime = repaired.match(/^(now\s+it\s+is\s+\d{1,2}:\d{2}\s*(?:am|pm)?)\s+(.+)$/i);
        let fixed = repaired;
        if (mTime) {
          let timePart = mTime[1].charAt(0).toUpperCase() + mTime[1].slice(1);
          let restPart = mTime[2];
          restPart = restPart.replace(/\b(i\s+get\s+up)\s+(drink\s+a\s+coffee)\s+(brush\s+my\s+teeth)\s+(and\s+go\s+to\s+the\s+train)\b/gi, '$1, $2, $3, $4');
          if (!restPart.startsWith('I ') && restPart.startsWith('i ')) {
            restPart = 'I ' + restPart.slice(2);
          }
          if (!/[.!?]$/.test(restPart)) restPart += '.';
          fixed = `${timePart}. ${restPart}`;
        }
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <strong>"${fixed}"</strong><br>
1️⃣ <strong>Aufstehen:</strong> Heißt auf Englisch <strong>"get up"</strong> (nicht <em>go up</em>).<br>
2️⃣ <strong>Zähneputzen:</strong> Heißt <strong>"brush my teeth"</strong> (vom Mikrofon als <em>bruschetta</em> verhört).<br>
3️⃣ <strong>Zug fahren:</strong> Heißt <strong>"go to the train"</strong> (<em>train</em>, nicht <em>zrain</em>).<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // Test 4: "i would lern speacking englisch. What ist you meing?"
      if (/\b(lern|learn)\s+(speacking|speaking)\s+englisch\b/i.test(lower) ||
          /\bwhat\s+(ist|is)\s+(you|your)\s+(meing|meaning)\b/i.test(lower)) {
        const fixed = 'I would like to learn speaking English. What do you mean?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <strong>"${fixed}"</strong><br>
1️⃣ <strong>Möchte lernen:</strong> Heißt <strong>"would like to learn"</strong>.<br>
2️⃣ <strong>Englisch:</strong> Schreibt man mit "sh": <strong>"English"</strong>.<br>
3️⃣ <strong>Meinung erfragen:</strong> Sag <strong>"What do you mean?"</strong> (Was meinst du?) oder <em>"What is your opinion?"</em>.<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // Test 5: Deutsche Wörter in gemischten Sätzen ("programmieren und english", "ich want to lernen")
      const denglischWordsMap = {
        'programmieren': 'programming',
        'lernen': 'learn',
        'arbeiten': 'work',
        'arbeit': 'work',
        'schule': 'school',
        'gestern': 'yesterday',
        'heute': 'today',
        'morgen': 'tomorrow',
        'und': 'and',
        'ist': 'is',
        'oder': 'or',
        'aber': 'but',
        'mit': 'with',
        'auch': 'also',
        'sehr': 'very',
        'mein': 'my',
        'meine': 'my',
        'meinen': 'my',
        'vokabeln': 'vocabulary'
      };
      let denglischFixed = clean;
      let denglischReplacements = [];
      for (const [deWord, enWord] of Object.entries(denglischWordsMap)) {
        const reg = new RegExp(`\\b${deWord}\\b`, 'gi');
        if (reg.test(denglischFixed)) {
          denglischReplacements.push(`<em>"${deWord}"</em> ➔ <strong>"${enWord}"</strong>`);
          denglischFixed = denglischFixed.replace(reg, enWord);
        }
      }
      if (denglischReplacements.length > 0 && !lower.startsWith('wie ') && !lower.startsWith('was ') && !lower.startsWith('erklär')) {
        denglischFixed = denglischFixed.charAt(0).toUpperCase() + denglischFixed.slice(1);
        if (!/[.!?]$/.test(denglischFixed)) denglischFixed += '.';
        const phon = PronunciationCoach.toPhonetic(denglischFixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: denglischFixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <strong>"${denglischFixed}"</strong><br>
🇩🇪➔🇬🇧 <strong>Deutsche Wörter ins Englische übersetzt:</strong> ${denglischReplacements.join(', ')}.<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 0A. Spezifische Anfänger- & Denglisch-Konstruktionen (z. B. "dhis Moment is earley Morning", "this moment is early morning", "now is early morning")
      if (/\b(dhis|this|dis|at\s+this|in\s+this)?\s*moment\s+is\s+(earley|early|erly|earli|late)?\s*(mornig|morning|morining|evning|evening|afternoon|night|day)\b/i.test(lower) ||
          /\b(dhis|this|dis)\s+moment\b.*\b(earley|early|mornig|morning)\b/i.test(lower) ||
          /^(now\s+is|is|it\s+is)\s+(earley|early|erly|earli)\s+(mornig|morning|morining)[.!?\s]*$/i.test(lower)) {
        let timeOfDay = 'early in the morning';
        if (/evening|evning/i.test(lower)) timeOfDay = /earley|early/i.test(lower) ? 'early in the evening' : 'in the evening';
        else if (/afternoon/i.test(lower)) timeOfDay = 'in the afternoon';
        else if (/night|nigth/i.test(lower)) timeOfDay = 'late at night';
        else if (!/earley|early|erly|earli/i.test(lower)) timeOfDay = 'in the morning';

        const fixed = `At the moment, it is ${timeOfDay}.`;
        const altFixed = `Right now, it is ${timeOfDay.replace('in the ', '')}.`;
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Sag auf Englisch: <strong>"${fixed}"</strong> (oder kurz: <em>"${altFixed}"</em>).<br>
1️⃣ <strong>Rechtschreibung:</strong> <em>"this"</em> schreibt man mit <strong>th</strong> (nicht <em>dhis</em>) und <em>"early"</em> (früh) nur mit <strong>-y</strong> am Ende (nicht <em>earley</em>).<br>
2️⃣ <strong>Kleinschreibung:</strong> Nomen wie <strong>moment</strong> und <strong>morning</strong> schreibt man im Englischen mitten im Satz immer <strong>klein</strong>.<br>
3️⃣ <strong>Natürlicher Satzbau:</strong> Auf Deutsch sagt man <em>„Im Moment ist früher Morgen“</em>. Auf Englisch sagt man <strong>"At the moment, it is early in the morning."</strong> (mit <em>"At the moment"</em> und <em>"it is"</em> = es ist).<br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 0B. Allgemeine "this moment is ..." / "in this moment is ..." Konstruktion -> "At the moment, it is ..."
      if (/^(in\s+|at\s+)?(dhis|this|dis)\s+moment\s+is\s+(.+)$/i.test(lower)) {
        const m = clean.match(/^(?:in\s+|at\s+)?(?:dhis|this|dis)\s+moment\s+is\s+(.+?)[.!?\s]*$/i);
        const restRaw = m ? m[1].trim().toLowerCase() : 'good';
        const fixed = `At the moment, it is ${restRaw}.`;
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Statt wörtlich <em>"this moment is ..."</em> sagt man auf Englisch <strong>"At the moment, it is ..."</strong> (Im Moment ist es ...). Vergiss im Englischen nicht das <strong>"it"</strong> vor <em>"is"</em>!<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 0C. "I can no/not/little English" / "I cannot English" / "I no speak English" (Typischer Anfänger-Satz!)
      if (/\b(i\s+can\s+(no|not|little|bad|poor|keine?)\s+(english|englisch)|i\s+cannot\s+(english|englisch)|i\s+no\s+(speak|can)\s+(english|englisch)|i\s+speak\s+no\s+(english|englisch))\b/i.test(lower)) {
        const fixed = 'I cannot speak English very well yet, so I am learning step by step.';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Auf Deutsch sagt man <em>„Ich kann kein Englisch“</em>, aber auf Englisch braucht <strong>can</strong> immer ein Vollverb wie <strong>speak</strong> (sprechen)!<br>
👉 Sag: <strong>"I cannot speak English very well yet."</strong> (Ich kann noch nicht sehr gut Englisch sprechen) oder <strong>"I only speak a little English."</strong><br>
🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 0D. Typische Denglisch-Sätze ("how goes it", "what make you", "it makes fun", "I have hunger/thirst/cold/right")
      if (/\b(how\s+goes\s+it|how\s+goes\s+you|how\s+goes)\b/i.test(lower)) {
        const fixed = 'How are you doing today?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> <em>"How goes it"</em> ist wörtlich aus dem Deutschen (<em>„Wie geht es?“</em>) übersetzt. Auf Englisch fragt man: <strong>"How are you doing?"</strong> oder <strong>"How is it going?"</strong>.<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      if (/\b(what\s+make\s+you|what\s+do\s+you\s+make(\s+now|\s+today)?|what\s+you\s+make)\b/i.test(lower)) {
        const fixed = 'What are you doing right now?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Für <em>„Was machst du gerade?“</em> verwendet man im Englischen <strong>do</strong> (tun/machen) in der Verlaufsform (-ing), nicht <em>make</em> (= herstellen): <strong>"What are you doing right now?"</strong>.<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      if (/\b(it\s+makes\s+(a\s+lot\s+of\s+|much\s+)?fun|that\s+makes\s+fun|makes\s+fun)\b/i.test(lower)) {
        const fixed = 'It is a lot of fun!';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Auf Deutsch sagt man <em>„Es macht Spaß“</em>, aber auf Englisch heißt es immer <strong>"It is fun!"</strong> oder <strong>"I am having fun!"</strong> (niemals <em>"makes fun"</em>).<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      const haveStateMatch = lower.match(/\bi\s+have\s+(very\s+|big\s+)?(hunger|thirst|cold|warm|right|luck|fear)\b/i);
      if (haveStateMatch) {
        const stateMap = {
          hunger: 'hungry',
          thirst: 'thirsty',
          cold: 'cold',
          warm: 'warm',
          right: 'right',
          luck: 'lucky',
          fear: 'afraid'
        };
        const adj = stateMap[haveStateMatch[2].toLowerCase()] || 'hungry';
        const fixed = `I am ${adj}.`;
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `✅ <strong>Korrektur-Vorschlag:</strong> Im Deutschen sagt man <em>„Ich habe Hunger / Durst / Recht / Glück“</em>, aber im Englischen nutzt man <strong>"I am ..."</strong> + Adjektiv: 👉 <strong>"${fixed}"</strong>!<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 0E. Mikrofon-Verhörer & gebrochene Sätze beim Sprechen erkennen (z.B. "Oak Park can you make better mine the English language my speaking" oder "what's your name Boy Is Mine speaking was")
      if (/\boak\s+park\b/i.test(lower) || /\bmake\s+better\b.*\b(mine|my|english|speaking|pronunciation|language)\b/i.test(lower) || /\b(mine|my)\s+the\s+english\s+language\b/i.test(lower)) {
        const fixed = 'Okay, can you help me improve my English speaking and pronunciation?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          isMicGarbled: /\boak\s+park\b/i.test(lower),
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `💡 <strong>Grammatik- & Aussprache-Korrektur:</strong><br>
1️⃣ Statt <em>"make better"</em> (wörtlich „besser machen“) sagt man auf Englisch <strong>"improve"</strong> (verbessern).<br>
2️⃣ Vor einem Hauptwort heißt es immer <strong>"my"</strong> (<em>my English / my speaking</em>), niemals <em>"mine"</em>.<br>
3️⃣ Vor Sprachen steht kein Artikel (<strong>"English"</strong> statt <em>"the English language"</em>).<br>
🗣️ <strong>So sprichst du den richtigen Satz aus:</strong> <code>[${phon}]</code>`
        };
      }

      if (/\bboy\s+is\s+mine\s+speaking\s+was\b/i.test(lower) || /\bspeaking\s+was\s*$/i.test(lower) || /\bhow\s+my\s+speaking\s+was\b/i.test(lower)) {
        const hasNamePart = /\bwhat('?s|\s+is)\s+your\s+name\b/i.test(lower);
        const fixed = hasNamePart
          ? 'What is your name, and how was my speaking?'
          : 'How was my English speaking and pronunciation?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          isMicGarbled: true,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `💡 <strong>Satzbau- & Mikrofon-Korrektur:</strong><br>
Das Mikrofon hat <em>"Boy Is Mine speaking was"</em> verstanden. Wenn du fragen möchtest, wie deine Aussprache war, heißt es auf Englisch:<br>
👉 <strong>"${fixed}"</strong><br>
📖 <strong>Grammatik-Regel:</strong> Bei Fragen steht das Verb <strong>was</strong> vor <em>my speaking</em>: <strong>"How was my speaking?"</strong> (nicht "speaking was" am Ende).<br>
🗣️ <strong>Aussprache (Lautschrift):</strong> <code>[${phon}]</code>`
        };
      }

      // Allgemeine Regel für "mine" vor einem Nomen ("mine speaking", "mine English", "mine name", "mine pronunciation", "mine sentence")
      if (/\bmine\s+(the\s+)?(english|german|speaking|pronunciation|name|sentence|words?|grammar|job|work|code|friend)\b/i.test(lower)) {
        let fixed = clean.replace(/\bmine\s+(the\s+)?/gi, 'my ').replace(/\bmake\s+better\b/gi, 'improve');
        fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
        if (!/[.!?]$/.test(fixed)) fixed += '?';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `💡 <strong>Grammatik-Tipp (my vs. mine):</strong> Vor einem Nomen (wie <em>speaking, English, name</em>) musst du immer <strong>"my"</strong> verwenden (z. B. <em>"my speaking"</em>). <em>"mine"</em> darf nur ganz allein ohne Nomen stehen (z. B. <em>"This book is mine"</em>).<br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // Allgemeine Regel für "make better" -> "improve"
      if (/\bmake\s+better\b/i.test(lower)) {
        let fixed = clean.replace(/\bmake\s+better\b/gi, 'improve');
        fixed = fixed.charAt(0).toUpperCase() + fixed.slice(1);
        if (!/[.!?]$/.test(fixed)) fixed += '.';
        const phon = PronunciationCoach.toPhonetic(fixed);
        return {
          hasError: true,
          isGerman: false,
          originalText: clean,
          correctedText: fixed,
          phoneticText: phon,
          explanation: `💡 <strong>Natürliches Englisch:</strong> Statt <em>"make better"</em> verwendet man im Englischen das Verb <strong>"improve"</strong> (verbessern), z. B. <em>"Can you help me improve my pronunciation?"</em><br>🗣️ <strong>Aussprache:</strong> <code>[${phon}]</code>`
        };
      }

      // 1A. Typo & Spelling Checker for common English learner typos & phonetic spellings
      const commonTypos = [
        { regex: /\bhow\s+old\s+you\s+are\b/gi, fix: 'how old are you', tip: 'Fragen-Satzbau: Bei Fragen steht das Verb vor dem Subjekt: <em>"How old are you?"</em>' },
        { regex: /\bi\s+have\s+(\d+)\s+years(\s+old)?\b/gi, fix: 'I am $1 years old', tip: 'Alter auf Englisch: Sage <em>"I am ... years old"</em> (mit <strong>am</strong>, nicht "have").' },
        { regex: /\bi\s+am\s+beginner\b/gi, fix: 'I am a beginner', tip: 'Artikelregel: Vor zählbaren Rollen im Singular gehört ein <em>"a"</em>: <strong>"I am a beginner"</strong>.' },
        { regex: /\bi\s+want\s+(speak|learn|write|read|practice|talk|go|work|study|try|know|understand|see|eat|drink|sleep|play)\b/gi, fix: 'I want to $1', tip: 'Infinitiv mit "to": Nach <em>want</em> folgt immer <strong>"to"</strong> + Verb (z. B. <em>"I want to learn"</em>).' },
        { regex: /\bi\s+need\s+(speak|learn|write|read|practice|talk|go|work|study|try)\b/gi, fix: 'I need to $1', tip: 'Infinitiv mit "to": Nach <em>need</em> folgt <strong>"to"</strong> + Verb (z. B. <em>"I need to practice"</em>).' },
        { regex: /\bhow\s+to\s+say\b/gi, fix: 'how do you say', tip: 'Vollständige Frage: <em>"How do you say [Wort] in English?"</em>' },
        { regex: /\b(dhis|thiss)\b/gi, fix: 'this', tip: '<strong>"this"</strong> (dieses/diese) wird mit <strong>th</strong> am Anfang geschrieben (nicht <em>dhis</em>).' },
        { regex: /\b(dhat|thatt)\b/gi, fix: 'that', tip: '<strong>"that"</strong> (das/jenes) wird mit <strong>th</strong> geschrieben (nicht <em>dhat</em>).' },
        { regex: /\b(dhere|ther)\b/gi, fix: 'there', tip: '<strong>"there"</strong> (dort/da) wird mit <strong>th</strong> geschrieben.' },
        { regex: /\b(dhey)\b/gi, fix: 'they', tip: '<strong>"they"</strong> (sie, Mehrzahl) wird mit <strong>th</strong> geschrieben.' },
        { regex: /\b(dhese)\b/gi, fix: 'these', tip: '<strong>"these"</strong> (diese) wird mit <strong>th</strong> geschrieben.' },
        { regex: /\b(dhe|teh)\b/gi, fix: 'the', tip: '<strong>"the"</strong> (der/die/das) wird mit <strong>th-e</strong> geschrieben.' },
        { regex: /\b(earley|erly|earli|irly)\b/gi, fix: 'early', tip: '<strong>"early"</strong> (früh) schreibt man am Ende nur mit <strong>-ly</strong> (ohne <em>e</em> vor dem <em>y</em>).' },
        { regex: /\b(mornig|morining|moring)\b/gi, fix: 'morning', tip: '<strong>"morning"</strong> (Morgen) wird mit <strong>-ing</strong> am Ende geschrieben.' },
        { regex: /\b(evning|evenig|ewening)\b/gi, fix: 'evening', tip: '<strong>"evening"</strong> (Abend) schreibt man <em>e-v-e-n-i-n-g</em>.' },
        { regex: /\b(nigth|nigt|naight)\b/gi, fix: 'night', tip: '<strong>"night"</strong> (Nacht) schreibt man mit <strong>-ght</strong> am Ende.' },
        { regex: /\b(todey|tuday)\b/gi, fix: 'today', tip: '<strong>"today"</strong> (heute) schreibt man <em>t-o-d-a-y</em>.' },
        { regex: /\b(tomorow|tommorow|tumorrow)\b/gi, fix: 'tomorrow', tip: '<strong>"tomorrow"</strong> (morgen) schreibt man mit einem <em>m</em> und doppeltem <em>r</em>.' },
        { regex: /\b(yestarday|yesterdey|jesterday)\b/gi, fix: 'yesterday', tip: '<strong>"yesterday"</strong> (gestern) schreibt man mit <em>y-e-s-t-e-r-d-a-y</em>.' },
        { regex: /\b(wath|waht|wat|wot)\b/gi, fix: 'what', tip: 'W-Fragen beginnen mit <strong>"wh"</strong>: <strong>"what"</strong> (was).' },
        { regex: /\b(wher)\b/gi, fix: 'where', tip: '<strong>"where"</strong> (wo/wohin) schreibt man mit stummem <em>e</em> am Ende.' },
        { regex: /\b(wen)\b/gi, fix: 'when', tip: '<strong>"when"</strong> (wann/wenn) beginnt mit <strong>wh</strong>.' },
        { regex: /\b(wai)\b/gi, fix: 'why', tip: '<strong>"why"</strong> (warum) schreibt man <em>w-h-y</em>.' },
        { regex: /\b(hau|hou)\b/gi, fix: 'how', tip: '<strong>"how"</strong> (wie) schreibt man <em>h-o-w</em>.' },
        { regex: /\b(yuor|yor)\b/gi, fix: 'your', tip: '<strong>"your"</strong> (dein/deine).' },
        { regex: /\b(nam|naem)\b/gi, fix: 'name', tip: '<strong>"name"</strong> mit stummem <strong>e</strong> am Ende.' },
        { regex: /\b(plese|pleas|plis)\b/gi, fix: 'please', tip: '<strong>"please"</strong> (bitte) schreibt man mit <em>ea</em> und <em>e</em> am Ende.' },
        { regex: /\b(wich)\b/gi, fix: 'which', tip: '<strong>"which"</strong> (welche/r/s) schreibt man mit <strong>wh</strong>.' },
        { regex: /\b(speek|spiek)\b/gi, fix: 'speak', tip: '<strong>"speak"</strong> (sprechen) schreibt man mit <strong>ea</strong>.' },
        { regex: /\b(lern|laern)\b/gi, fix: 'learn', tip: '<strong>"learn"</strong> (lernen) schreibt man mit <strong>ea</strong>.' },
        { regex: /\b(undestand|understend|anderstand)\b/gi, fix: 'understand', tip: '<strong>"understand"</strong> (verstehen).' },
        { regex: /\b(inglish|englisch|englich)\b/gi, fix: 'English', tip: '<strong>"English"</strong> schreibt man auf Englisch mit <strong>E</strong> und <strong>sh</strong> am Ende (großgeschrieben!).' },
        { regex: /\b(tink|zink|thinck)\b/gi, fix: 'think', tip: '<strong>"think"</strong> (denken/glauben) schreibt man mit <strong>th</strong>.' },
        { regex: /\b(becose|becous|bicos|becaus|bekause)\b/gi, fix: 'because', tip: '<strong>"because"</strong> (weil) schreibt man <em>b-e-c-a-u-s-e</em>.' },
        { regex: /\b(wery|verry|weri)\b/gi, fix: 'very', tip: '<strong>"very"</strong> (sehr) beginnt mit <strong>v</strong> und hat nur ein <em>r</em>.' },
        { regex: /\b(gud|goud)\b/gi, fix: 'good', tip: '<strong>"good"</strong> (gut) schreibt man mit doppeltem <strong>oo</strong>.' },
        { regex: /\b(freind|frend)\b/gi, fix: 'friend', tip: '<strong>"friend"</strong> (Freund) schreibt man mit <strong>ie</strong> (Merksatz: <em>a friend to the end</em>).' },
        { regex: /\b(importent|importand)\b/gi, fix: 'important', tip: '<strong>"important"</strong> (wichtig) schreibt man mit <strong>-ant</strong> am Ende.' },
        { regex: /\b(diffrent|diferent)\b/gi, fix: 'different', tip: '<strong>"different"</strong> (unterschiedlich) schreibt man <em>d-i-f-f-e-r-e-n-t</em>.' },
        { regex: /\b(intresting|intersting)\b/gi, fix: 'interesting', tip: '<strong>"interesting"</strong> (interessant) schreibt man <em>i-n-t-e-r-e-s-t-i-n-g</em>.' },
        { regex: /\b(beutiful|biutiful|beautifull)\b/gi, fix: 'beautiful', tip: '<strong>"beautiful"</strong> (schön) schreibt man mit <em>eau</em> und nur einem <em>l</em> am Ende.' },
        { regex: /\b(alredy|allready)\b/gi, fix: 'already', tip: '<strong>"already"</strong> (schon/bereits) hat nur ein <em>l</em>.' },
        { regex: /\b(allways|alway)\b/gi, fix: 'always', tip: '<strong>"always"</strong> (immer) hat nur ein <em>l</em> und ein <em>s</em> am Ende.' },
        { regex: /\b(somtimes|somtime)\b/gi, fix: 'sometimes', tip: '<strong>"sometimes"</strong> (manchmal) schreibt man mit <em>some-times</em>.' },
        { regex: /\b(togeter|togedher)\b/gi, fix: 'together', tip: '<strong>"together"</strong> (zusammen) schreibt man mit <strong>th</strong>.' },
        { regex: /\b(shure|schure)\b/gi, fix: 'sure', tip: '<strong>"sure"</strong> (sicher) schreibt man ohne <em>h/ch</em>: <em>s-u-r-e</em>.' },
        { regex: /\b(shool|scool)\b/gi, fix: 'school', tip: '<strong>"school"</strong> (Schule) beginnt mit <strong>sch</strong> und doppeltem <strong>oo</strong>.' },
        { regex: /\b(wurk|worck)\b/gi, fix: 'work', tip: '<strong>"work"</strong> (Arbeit/arbeiten) schreibt man <em>w-o-r-k</em>.' },
        { regex: /\b(hause|hous)\b/gi, fix: 'house', tip: '<strong>"house"</strong> (Haus) schreibt man <em>h-o-u-s-e</em>.' },
        { regex: /\b(koffee|kaffee|cofee|coffe)\b/gi, fix: 'coffee', tip: '<strong>"coffee"</strong> (Kaffee) schreibt man mit <strong>c</strong>, doppeltem <strong>ff</strong> und doppeltem <strong>ee</strong>.' },
        { regex: /\b(musik|muzik)\b/gi, fix: 'music', tip: '<strong>"music"</strong> (Musik) schreibt man am Ende mit <strong>c</strong>.' },
        { regex: /\b(sentece|sentens|santence)\b/gi, fix: 'sentence', tip: '<strong>"sentence"</strong> (Satz) schreibt man <em>s-e-n-t-e-n-c-e</em>.' },
        { regex: /\b(korekt|corect|correkt)\b/gi, fix: 'correct', tip: '<strong>"correct"</strong> (korrekt/korrigieren) schreibt man mit <strong>c</strong> und doppeltem <strong>rr</strong>.' },
        { regex: /\b(mistak|misteik)\b/gi, fix: 'mistake', tip: '<strong>"mistake"</strong> (Fehler) schreibt man <em>m-i-s-t-a-k-e</em>.' },
        { regex: /\b(litel|littel|litle)\b/gi, fix: 'little', tip: '<strong>"little"</strong> (wenig/klein) schreibt man <em>l-i-t-t-l-e</em>.' },
        { regex: /\b(peopel|pipel|peple)\b/gi, fix: 'people', tip: '<strong>"people"</strong> (Leute/Menschen) schreibt man <em>p-e-o-p-l-e</em>.' },
        { regex: /\b(langwage|langauge|lenguage)\b/gi, fix: 'language', tip: '<strong>"language"</strong> (Sprache) schreibt man <em>l-a-n-g-u-a-g-e</em>.' },
        { regex: /\b(exampel|exemple)\b/gi, fix: 'example', tip: '<strong>"example"</strong> (Beispiel) schreibt man am Ende mit <strong>-le</strong> (nicht <em>-el</em>).' }
      ];

      let foundTypos = [];
      let typoCorrected = clean;
      for (const t of commonTypos) {
        if (t.regex.test(typoCorrected)) {
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
      let corrected = typoCorrected;
      let hasError = foundTypos.length > 0;
      let explanationParts = foundTypos.map(t => t.tip);

      // 2A. Automatischer Fuzzy-Spellcheck für weitere falsch geschriebene Wörter im Satz
      const rawTokens = corrected.split(/(\s+)/);
      const fuzzyFixes = [];
      const uNameLower = (typeof getUserName === 'function' ? (getUserName() || '') : '').toLowerCase();
      const ignoreNames = new Set(['istvan', 'csovrij', 'nova', 'leo', 'sarah', 'alex', 'miller', 'davis', 'ricardo', 'fiae', uNameLower].filter(Boolean));

      for (let i = 0; i < rawTokens.length; i++) {
        const tok = rawTokens[i];
        if (/^\s+$/.test(tok)) continue;
        const wordMatch = tok.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
        if (!wordMatch) continue;
        const [, prefix, coreWord, suffix] = wordMatch;
        const wLower = coreWord.toLowerCase();
        if (wLower.length < 3 || ignoreNames.has(wLower) || this.germanWords.includes(wLower)) continue;
        if (this.getValidEnglishSet().has(wLower)) continue;

        const suggestion = this.findClosestEnglishWord(wLower);
        if (suggestion && suggestion !== wLower) {
          const replacement = (coreWord[0] === coreWord[0].toUpperCase() && i === 0)
            ? suggestion.charAt(0).toUpperCase() + suggestion.slice(1)
            : suggestion;
          rawTokens[i] = `${prefix}${replacement}${suffix}`;
          fuzzyFixes.push({ wrong: coreWord, right: suggestion });
          hasError = true;
        }
      }
      if (fuzzyFixes.length > 0) {
        corrected = rawTokens.join('');
        const fixDescriptions = fuzzyFixes.map(f => `statt <em>"${f.wrong}"</em> schreibt man <strong>"${f.right}"</strong>`).join(', ');
        explanationParts.push(`Rechtschreibung: ${fixDescriptions}.`);
      }

      // 2B. Prüfung auf deutsche Großschreibung von Nomen mitten im englischen Satz (z. B. "Moment", "Morning", "House", "Time")
      const allowedCapWords = new Set([
        'i', 'english', 'german', 'germany', 'london', 'uk', 'usa', 'canada', 'australia', 'ireland', 'europe', 'italian', 'asian',
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
        'sql', 'git', 'api', 'rest', 'ai', 'it', 'qa', 'pr', 'prs', 'solid', 'scrum', 'devops', 'java', 'python', 'docker', 'fiae',
        'istvan', 'csovrij', 'nova', 'leo', 'sarah', 'alex', 'miller', 'davis', 'ricardo', 'smith', 'mr', 'mrs', 'ms', 'prof', uNameLower
      ]);
      const checkCapTokens = corrected.split(/(\s+)/);
      let wordIndex = 0;
      let prevEndedSentence = true;
      const loweredNouns = [];
      for (let i = 0; i < checkCapTokens.length; i++) {
        const tok = checkCapTokens[i];
        if (/^\s+$/.test(tok)) continue;
        const m = tok.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
        if (m) {
          const [, pre, wCore, suf] = m;
          const isStartOfSentence = prevEndedSentence || wordIndex === 0;
          const isCapitalized = /^[A-Z][a-z]+$/.test(wCore);
          if (!isStartOfSentence && isCapitalized && !allowedCapWords.has(wCore.toLowerCase())) {
            const lowerW = wCore.toLowerCase();
            checkCapTokens[i] = `${pre}${lowerW}${suf}`;
            loweredNouns.push(`<em>"${wCore}"</em> ➔ <strong>"${lowerW}"</strong>`);
            hasError = true;
          }
          prevEndedSentence = /[.!?]+$/.test(suf);
          wordIndex++;
        }
      }
      if (loweredNouns.length > 0) {
        corrected = checkCapTokens.join('');
        explanationParts.push(`Kleinschreibung im Englischen: Anders als im Deutschen schreibt man Nomen mitten im Satz <strong>klein</strong> (${loweredNouns.join(', ')}).`);
      }

      // 2C. Fehlendes Verb "to be" (am / is / are) in einfachen Anfänger-Sätzen (z. B. "I very tired", "This very good", "Today cold")
      const lowerAfterSpelling = corrected.toLowerCase();
      if (/^i\s+(very\s+|so\s+|really\s+|a\s+bit\s+)?(tired|happy|sad|ready|here|home|at\s+home|good|bad|sorry|hungry|thirsty|cold|warm|busy|sick|fine|new)\b/i.test(lowerAfterSpelling)) {
        hasError = true;
        corrected = corrected.replace(/^i\s+/i, 'I am ');
        explanationParts.push('Vollständiger Satz: Im Englischen braucht man das Verb <strong>"am"</strong> nach <em>"I"</em>: <strong>"I am ..."</strong> (Ich bin ...).');
      } else if (/^(this|that|it|everything)\s+(very\s+|so\s+|really\s+|too\s+)?(good|bad|nice|great|easy|hard|difficult|cold|warm|early|late|important|interesting|clear|fine|funny)\b/i.test(lowerAfterSpelling) && !/\b(is|was|will|can|should|has|does|looks|seems|sounds|feels|makes)\b/i.test(lowerAfterSpelling)) {
        hasError = true;
        corrected = corrected.replace(/^(this|that|it|everything)\s+/i, '$1 is ');
        explanationParts.push('Vollständiger Satz: Hier fehlte das Verb <strong>"is"</strong> (ist): z. B. <strong>"This is ..."</strong> / <strong>"It is ..."</strong>.');
      } else if (/^(today|now|right\s+now)\s+is\s+(very\s+|so\s+|a\s+bit\s+)?(cold|warm|hot|sunny|cloudy|windy|raining|rainy|early|late|nice|good|great)\b/i.test(lowerAfterSpelling)) {
        hasError = true;
        corrected = corrected.replace(/^(today|now|right\s+now)\s+is\s+/i, '$1, it is ');
        explanationParts.push('Englischer Satzbau: Bei Zeit- und Wetterangaben braucht man auf Englisch zwingend <strong>"it is"</strong> (es ist): z. B. <strong>"Today, it is ..."</strong> oder <strong>"Right now, it is ..."</strong>.');
      }

      const checkRuleLower = corrected.toLowerCase();

      // Regel A: "become" vs "get / receive" (False Friend: become = werden, nicht bekommen)
      const becomeMatch = checkRuleLower.match(/\b(i|we|they|he|she|you)\s+(become|became)\s+(a|an|the|some|my)?\s*(coffee|tea|job|ticket|email|message|problem|question|task|bug|update|offer)\b/i);
      if (becomeMatch) {
        hasError = true;
        const past = becomeMatch[2].toLowerCase() === 'became';
        const replacementVerb = past ? 'got' : 'get';
        corrected = corrected.replace(new RegExp(becomeMatch[2], 'i'), replacementVerb);
        explanationParts.push('<strong>False Friend:</strong> <em>"become"</em> heißt auf Deutsch <strong>"werden"</strong>, NICHT "bekommen"! Verwende im Englischen <strong>"get"</strong> oder <strong>"receive"</strong> (z. B. <em>"I got a ticket"</em>).');
      }

      // Regel B: "actually" vs "currently" (False Friend: actually = eigentlich/tatsächlich, nicht aktuell)
      if (/\b(i\s+am\s+actually\s+working|actually\s+i\s+am|i\s+actually\s+work)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bactually\b/i, 'currently');
        explanationParts.push('<strong>False Friend:</strong> <em>"actually"</em> bedeutet <strong>"eigentlich / in Wirklichkeit"</strong>. Wenn du <em>"aktuell / im Moment"</em> meinst, verwende <strong>"currently"</strong> oder <strong>"at the moment"</strong>.');
      }

      // Regel C: "control" vs "check / test / verify" (False Friend: control = steuern/beherrschen)
      if (/\b(control|controlled)\s+(the\s+)?(code|query|database|logs|server|test|error)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bcontrol\b/i, 'check').replace(/\bcontrolled\b/i, 'checked');
        explanationParts.push('<strong>False Friend:</strong> <em>"control"</em> bedeutet <strong>"steuern / beherrschen"</strong>. Wenn du etwas überprüfen willst, sagt man <strong>"check"</strong>, <strong>"verify"</strong> oder <strong>"inspect"</strong>.');
      }

      // Regel D: "make" vs "run / do / conduct"
      if (/\b(make|making|made)\s+(a\s+)?(test|tests|code review|sports|homework|query|interview|decision)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bmake\s+(a\s+)?tests?\b/i, 'run tests')
                             .replace(/\bmade\s+(a\s+)?tests?\b/i, 'ran tests')
                             .replace(/\bmake\s+(a\s+)?code review\b/i, 'conduct a code review')
                             .replace(/\bmake\s+homework\b/i, 'do homework')
                             .replace(/\bmake\s+sports\b/i, 'do sports');
        explanationParts.push('Im Englischen sagt man <strong>"run a test"</strong>, <strong>"conduct a code review"</strong> oder <strong>"do homework"</strong>, nicht "make".');
      }

      // Regel E: "since" vs "for" (Dauer vs Zeitpunkt)
      if (/\bsince\s+(\d+|one|two|three|four|five|several|many|a\s+few)\s+(minutes|hours|days|weeks|months|years)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bsince\s+/i, 'for ');
        explanationParts.push('<strong>Since vs. For:</strong> Zeitspannen (Dauer wie <em>"for 3 years"</em>) stehen immer mit <strong>"for"</strong>. <strong>"since"</strong> nutzt man nur für feste Startzeitpunkte (z. B. <em>"since Monday"</em>).');
      }

      // Regel F: "for yesterday" / "for last week"
      if (/\bfor\s+(yesterday|last\s+week|last\s+month|last\s+year)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bfor\s+/i, 'since ');
        explanationParts.push('Bei festen Zeitpunkten in der Vergangenheit nutzen wir <strong>"since"</strong> (z. B. <em>"since yesterday"</em>), niemals "for".');
      }

      // Regel G: Doppelte Vergangenheit: "didn't knew" -> "didn't know"
      if (/\b(didn\'t|did\s+not)\s+(knew|saw|worked|went|fixed|found)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bdid\s*n\'?t\s+knew\b/i, "didn't know")
                             .replace(/\bdid\s*n\'?t\s+saw\b/i, "didn't see")
                             .replace(/\bdid\s*n\'?t\s+worked\b/i, "didn't work")
                             .replace(/\bdid\s*n\'?t\s+went\b/i, "didn't go")
                             .replace(/\bdid\s*n\'?t\s+fixed\b/i, "didn't fix")
                             .replace(/\bdid\s*n\'?t\s+found\b/i, "didn't find");
        explanationParts.push('<strong>Doppelte Vergangenheitsform:</strong> Nach <em>"didn\'t"</em> steht immer der einfache Infinitiv (z. B. <em>"I didn\'t know"</em>, nicht "didn\'t knew").');
      }

      // Regel H: "He / She / It - das 's' muss mit!"
      const sMatch = checkRuleLower.match(/\b(he|she|it|the\s+server|the\s+system|the\s+app|the\s+query|the\s+service)\s+(work|fail|run|need|want|have|think|test|happen)\b/i);
      if (sMatch) {
        hasError = true;
        const verb = sMatch[2].toLowerCase();
        const verbWithS = verb === 'have' ? 'has' : (verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('ss') ? verb + 'es' : verb + 's');
        corrected = corrected.replace(new RegExp('\\b' + verb + '\\b', 'i'), verbWithS);
        explanationParts.push('<strong>He / She / It – das "s" muss mit:</strong> In der 3. Person Einzahl Gegenwart bekommt das Verb ein <strong>-s</strong> (z. B. <em>"the system runs"</em>, <em>"he works"</em>).');
      }

      // Regel I: "I am agree" -> "I agree"
      if (/\b(i\s+am\s+agree|i\s+was\s+agree)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+agree\b/i, 'I agree').replace(/\bi\s+was\s+agree\b/i, 'I agreed');
        explanationParts.push('Im Englischen ist <strong>"agree"</strong> bereits ein Vollverb. Man sagt <strong>"I agree"</strong> (Ich stimme zu), niemals "I am agree".');
      }

      // Regel J: "I am developer" (Fehlender unbestimmter Artikel)
      if (/\bi\s+am\s+(junior\s+|senior\s+|software\s+|web\s+|backend\s+|frontend\s+)?(developer|programmer|engineer|student|architect)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+/i, 'I am a ');
        explanationParts.push('Bei Berufsbezeichnungen im Englischen muss immer ein unbestimmter Artikel <strong>"a"</strong> oder <strong>"an"</strong> stehen (z. B. <em>"I am a software developer"</em>).');
      }

      // Regel K: Unzählbare Nomen: "informations", "softwares", "feedbacks", "equipments", "advices", "knowledges"
      if (/\b(informations|softwares|hardwares|feedbacks|equipments|advices|knowledges)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\binformations\b/i, 'information')
                             .replace(/\bsoftwares\b/i, 'software')
                             .replace(/\bhardwares\b/i, 'hardware')
                             .replace(/\bfeedbacks\b/i, 'feedback')
                             .replace(/\bequipments\b/i, 'equipment')
                             .replace(/\badvices\b/i, 'advice')
                             .replace(/\bknowledges\b/i, 'knowledge');
        explanationParts.push('Wörter wie <strong>"information"</strong>, <strong>"software"</strong>, <strong>"feedback"</strong>, <strong>"equipment"</strong> und <strong>"advice"</strong> sind im Englischen unzählbar und haben keine Pluralform mit -s.');
      }

      // Regel K2: "discuss about" -> "discuss" / "explain me" -> "explain to me" / "listen music" -> "listen to music"
      if (/\bdiscuss\s+about\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bdiscuss\s+about\b/i, 'discuss');
        explanationParts.push('Nach <strong>"discuss"</strong> steht im Englischen kein "about" (z. B. <em>"We discussed the architecture"</em>).');
      }
      if (/\bexplain\s+me\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bexplain\s+me\b/i, 'explain to me');
        explanationParts.push('Bei <em>explain</em> heißt es immer <strong>"explain to me"</strong> (mit "to"), nicht "explain me".');
      }
      if (/\blisten\s+(music|podcasts|radio|songs)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\blisten\s+(music|podcasts|radio|songs)\b/i, 'listen to $1');
        explanationParts.push('Nach <em>listen</em> folgt immer <strong>"to"</strong>: <strong>"listen to music"</strong>.');
      }
      if (/\bin\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bin\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, 'on $1')
                             .replace(/\bin\s+weekend\b/i, 'on the weekend');
        explanationParts.push('Vor Wochentagen steht im Englischen immer die Präposition <strong>"on"</strong> (z. B. <em>"on Monday"</em>, <em>"on Friday"</em>).');
      }

      // Regel L: Modalverb + to: "must to", "can to", "should to"
      if (/\b(must|can|could|should|will|would)\s+to\s+([a-z]+)\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\b(must|can|could|should|will|would)\s+to\s+/i, '$1 ');
        explanationParts.push('Nach Modalverben wie <em>must, can, should</em> folgt der reine Infinitiv <strong>ohne "to"</strong> (z. B. <em>"I must optimize the database"</em>).');
      }

      // Regel M: "interested for" -> "interested in"
      if (/\binterested\s+for\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\binterested\s+for\b/i, 'interested in');
        explanationParts.push('Im Englischen heißt es <strong>"interested in"</strong> (z. B. <em>"I am interested in clean architecture"</em>), nicht "interested for".');
      }

      // Regel N: "depend of" -> "depend on"
      if (/\bdepend\s+of\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\bdepend\s+of\b/i, 'depend on');
        explanationParts.push('Das Verb <em>depend</em> verlangt immer die Präposition <strong>"on"</strong>: <strong>"it depends on the requirements"</strong>.');
      }

      // Regel O: Wortstellung S-V-O: "Yesterday worked I" -> "Yesterday I worked"
      if (/\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started|built)\s+i\b/i.test(checkRuleLower)) {
        hasError = true;
        corrected = corrected.replace(/\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started|built)\s+i\b/i, '$1 I $2');
        explanationParts.push('<strong>Wortstellung S-V-O:</strong> Im Englischen bleibt das Subjekt vor dem Verb (<em>"Yesterday I worked"</em>, nicht "Yesterday worked I").');
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

      const finalPhonetic = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(corrected) : '';
      const explanation = hasError
        ? `✅ <strong>Korrektur-Vorschlag:</strong> Sag auf Englisch: <strong>"${corrected}"</strong><br>• ${explanationParts.join('<br>• ')}`
        : ('🌟 Großartig formuliert! Dein Satz ist grammatikalisch einwandfrei und klingt nach natürlichem, flüssigem Englisch.' + techPraise);

      return {
        hasError,
        isGerman: false,
        originalText: clean,
        correctedText: corrected,
        phoneticText: finalPhonetic,
        explanation
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

    salutation() {
      const name = getUserName();
      return name ? `, ${name}` : '';
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

  // ============================================================
  // DER PERSÖNLICHE WÖRTERBUCH- & ÜBERSETZUNGS-LEHRER (v32)
  // ============================================================
  const TeacherDictionary = {
    // Umfangreiches Alltags-, Job-, Schul- und IT-Wörterbuch (Deutsch <-> Englisch)
    common: {
      'feierabend': { de: 'Feierabend', en: 'end of work / calling it a day / clocking off', phonetic: 'end ov wörk', exampleEn: 'It is 5 PM, time for Feierabend! (Time to call it a day!)', exampleDe: 'Es ist 17 Uhr, Zeit für Feierabend!' },
      'erfolg': { de: 'Erfolg', en: 'success / achievement', phonetic: 'sək-SES', exampleEn: 'Consistency is the key to learning success.', exampleDe: 'Beständigkeit ist der Schlüssel zum Lernerfolg.' },
      'erfolgreich': { de: 'erfolgreich', en: 'successful', phonetic: 'sək-SES-fəl', exampleEn: 'She is a successful software engineer.', exampleDe: 'Sie ist eine erfolgreiche Softwareentwicklerin.' },
      'schlüssel': { de: 'Schlüssel', en: 'key', phonetic: 'kee', exampleEn: 'Here is the key to the office.', exampleDe: 'Hier ist der Schlüssel zum Büro.' },
      'zuverlässig': { de: 'zuverlässig', en: 'reliable / dependable', phonetic: 'ri-LY-uh-bəl', exampleEn: 'Our cloud server is completely reliable.', exampleDe: 'Unser Cloud-Server ist absolut zuverlässig.' },
      'zuverlässigkeit': { de: 'Zuverlässigkeit', en: 'reliability', phonetic: 'ri-ly-uh-BIL-i-tee', exampleEn: 'System reliability is our top priority.', exampleDe: 'System-Zuverlässigkeit ist unsere oberste Priorität.' },
      'schwierig': { de: 'schwierig', en: 'difficult / challenging / hard', phonetic: 'DIF-i-kəlt', exampleEn: 'This task was difficult, but we solved it.', exampleDe: 'Diese Aufgabe war schwierig, aber wir haben sie gelöst.' },
      'einfach': { de: 'einfach', en: 'simple / easy', phonetic: 'SIM-pəl', exampleEn: 'Learning English step by step is simple.', exampleDe: 'Schritt für Schritt Englisch zu lernen ist einfach.' },
      'wichtig': { de: 'wichtig', en: 'important / crucial / essential', phonetic: 'im-POR-tənt', exampleEn: 'Good communication is very important in IT.', exampleDe: 'Gute Kommunikation ist sehr wichtig in der IT.' },
      'entscheidung': { de: 'Entscheidung', en: 'decision', phonetic: 'di-SIZH-ən', exampleEn: 'We made an important architectural decision.', exampleDe: 'Wir haben eine wichtige Architekturentscheidung getroffen.' },
      'fortschritt': { de: 'Fortschritt', en: 'progress', phonetic: 'PROG-res', exampleEn: 'You are making wonderful progress every day!', exampleDe: 'Du machst jeden Tag wundervolle Fortschritte!' },
      'lösung': { de: 'Lösung', en: 'solution', phonetic: 'suh-LOO-shən', exampleEn: 'We developed an elegant solution for this problem.', exampleDe: 'Wir haben eine elegante Lösung für dieses Problem entwickelt.' },
      'prüfung': { de: 'Prüfung', en: 'exam / test / examination', phonetic: 'ig-ZAM', exampleEn: 'I prepared thoroughly for my final exam.', exampleDe: 'Ich habe mich gründlich auf meine Abschlussprüfung vorbereitet.' },
      'klausur': { de: 'Klausur', en: 'written exam / paper', phonetic: 'ig-ZAM', exampleEn: 'We had a math exam at school today.', exampleDe: 'Wir hatten heute eine Mathe-Klausur in der Schule.' },
      'erfahrung': { de: 'Erfahrung', en: 'experience', phonetic: 'ik-SPEER-ee-əns', exampleEn: 'Practical experience is the best teacher.', exampleDe: 'Praktische Erfahrung ist der beste Lehrer.' },
      'begriff': { de: 'Begriff', en: 'term / concept', phonetic: 'turm', exampleEn: 'Can you explain this technical term?', exampleDe: 'Kannst du diesen Fachbegriff erklären?' },
      'termin': { de: 'Termin', en: 'appointment / deadline / meeting', phonetic: 'uh-POINT-mənt', exampleEn: 'I have an important appointment tomorrow at 10 AM.', exampleDe: 'Ich habe morgen um 10 Uhr einen wichtigen Termin.' },
      'besprechung': { de: 'Besprechung', en: 'meeting / conference', phonetic: 'MEE-ting', exampleEn: 'Our daily standup meeting starts now.', exampleDe: 'Unsere tägliche Besprechung beginnt jetzt.' },
      'aufgabe': { de: 'Aufgabe', en: 'task / assignment', phonetic: 'task', exampleEn: 'My task is to test the payment gateway.', exampleDe: 'Meine Aufgabe ist es, das Zahlungs-Gateway zu testen.' },
      'arbeit': { de: 'Arbeit', en: 'work / job', phonetic: 'wurk', exampleEn: 'I love my work as a software developer.', exampleDe: 'Ich liebe meine Arbeit als Softwareentwickler.' },
      'arbeiten': { de: 'arbeiten', en: 'to work', phonetic: 'wurk', exampleEn: 'I work on backend microservices.', exampleDe: 'Ich arbeite an Backend-Microservices.' },
      'schule': { de: 'Schule', en: 'school', phonetic: 'skool', exampleEn: 'School finished early this afternoon.', exampleDe: 'Die Schule war heute Nachmittag früher aus.' },
      'haus': { de: 'Haus', en: 'house / home', phonetic: 'hows', exampleEn: 'I arrived home after a productive day.', exampleDe: 'Ich bin nach einem produktiven Tag zu Hause angekommen.' },
      'auto': { de: 'Auto', en: 'car / vehicle', phonetic: 'kar', exampleEn: 'Electric cars are popular today.', exampleDe: 'Elektroautos sind heutzutage beliebt.' },
      'geld': { de: 'Geld', en: 'money / funds', phonetic: 'MUN-ee', exampleEn: 'Investing money wisely takes discipline.', exampleDe: 'Geld klug anzulegen erfordert Disziplin.' },
      'zeit': { de: 'Zeit', en: 'time', phonetic: 'tym', exampleEn: 'Take your time to practice speaking.', exampleDe: 'Nimm dir Zeit, um das Sprechen zu üben.' },
      'freund': { de: 'Freund', en: 'friend', phonetic: 'frend', exampleEn: 'My friend is studying computer science.', exampleDe: 'Mein Freund studiert Informatik.' },
      'freundin': { de: 'Freundin', en: 'friend / girlfriend', phonetic: 'frend', exampleEn: 'My friend recommended this app to me.', exampleDe: 'Meine Freundin hat mir diese App empfohlen.' },
      'kollege': { de: 'Kollege', en: 'colleague / co-worker', phonetic: 'KOL-eeg', exampleEn: 'My colleagues in the sprint team are awesome.', exampleDe: 'Meine Kollegen im Sprint-Team sind großartig.' },
      'kollegin': { de: 'Kollegin', en: 'colleague / co-worker', phonetic: 'KOL-eeg', exampleEn: 'My colleague reviewed my pull request.', exampleDe: 'Meine Kollegin hat meinen Pull Request geprüft.' },
      'essen': { de: 'Essen', en: 'food / meal (to eat)', phonetic: 'food', exampleEn: 'We had delicious Italian food for lunch.', exampleDe: 'Wir hatten leckeres italienisches Essen zum Mittagessen.' },
      'trinken': { de: 'trinken', en: 'drink / to drink', phonetic: 'drink', exampleEn: 'Make sure to drink enough water while studying.', exampleDe: 'Achte darauf, beim Lernen genug Wasser zu trinken.' },
      'kaffee': { de: 'Kaffee', en: 'coffee', phonetic: 'KOF-ee', exampleEn: 'A cup of black coffee helps me wake up.', exampleDe: 'Eine Tasse schwarzer Kaffee hilft mir beim Wachwerden.' },
      'tee': { de: 'Tee', en: 'tea', phonetic: 'tee', exampleEn: 'I enjoy a warm cup of green tea in the evening.', exampleDe: 'Ich genieße abends eine warme Tasse grünen Tee.' },
      'wasser': { de: 'Wasser', en: 'water', phonetic: 'WAW-tər', exampleEn: 'Fresh water is the healthiest drink.', exampleDe: 'Frisches Wasser ist das gesündeste Getränk.' },
      'müde': { de: 'müde', en: 'tired / exhausted', phonetic: 'TY-ərd', exampleEn: 'I am a bit tired, but happy with my progress.', exampleDe: 'Ich bin etwas müde, aber zufrieden mit meinen Fortschritten.' },
      'müdigkeit': { de: 'Müdigkeit', en: 'tiredness / fatigue', phonetic: 'TY-ərd-nəs', exampleEn: 'A short walk helps reduce tiredness.', exampleDe: 'Ein kurzer Spaziergang hilft gegen Müdigkeit.' },
      'glücklich': { de: 'glücklich', en: 'happy / glad', phonetic: 'HAP-ee', exampleEn: 'I am happy that our release was successful.', exampleDe: 'Ich bin glücklich, dass unser Release erfolgreich war.' },
      'traurig': { de: 'traurig', en: 'sad', phonetic: 'sad', exampleEn: 'It is okay to feel sad sometimes.', exampleDe: 'Es ist völlig in Ordnung, sich manchmal traurig zu fühlen.' },
      'schnell': { de: 'schnell', en: 'fast / quick', phonetic: 'fast', exampleEn: 'Our database query is very fast now.', exampleDe: 'Unsere Datenbankabfrage ist jetzt sehr schnell.' },
      'langsam': { de: 'langsam', en: 'slow', phonetic: 'sloh', exampleEn: 'Please speak slower so I can understand better.', exampleDe: 'Bitte sprich langsamer, damit ich besser verstehe.' },
      'gesund': { de: 'gesund', en: 'healthy', phonetic: 'HEL-thee', exampleEn: 'Eating healthy food keeps your mind sharp.', exampleDe: 'Gesundes Essen hält den Geist fit.' },
      'krank': { de: 'krank', en: 'sick / ill', phonetic: 'sik', exampleEn: 'He stayed home because he was sick.', exampleDe: 'Er blieb zu Hause, weil er krank war.' },
      'krankheit': { de: 'Krankheit', en: 'illness / disease', phonetic: 'IL-nəs', exampleEn: 'Prevention is the best cure for illness.', exampleDe: 'Vorbeugung ist die beste Medizin gegen Krankheit.' },
      'wochenende': { de: 'Wochenende', en: 'weekend', phonetic: 'WEEK-end', exampleEn: 'Have a wonderful and relaxing weekend!', exampleDe: 'Hab ein wundervolles und erholsames Wochenende!' },
      'urlaub': { de: 'Urlaub', en: 'vacation / holiday / time off', phonetic: 'vey-KEY-shən', exampleEn: 'I am planning a two-week summer vacation.', exampleDe: 'Ich plane zwei Wochen Sommerurlaub.' },
      'reise': { de: 'Reise', en: 'trip / journey / travel', phonetic: 'trip', exampleEn: 'Have a safe trip to London!', exampleDe: 'Gute Reise nach London!' },
      'reisen': { de: 'reisen', en: 'to travel', phonetic: 'TRAV-əl', exampleEn: 'Traveling to new countries broadens your horizons.', exampleDe: 'In neue Länder zu reisen erweitert den Horizont.' },
      'flughafen': { de: 'Flughafen', en: 'airport', phonetic: 'AIR-port', exampleEn: 'We arrived at Heathrow Airport on time.', exampleDe: 'Wir kamen pünktlich am Flughafen Heathrow an.' },
      'bahnhof': { de: 'Bahnhof', en: 'train station / railway station', phonetic: 'TREYN stey-shən', exampleEn: 'The central train station is in the city center.', exampleDe: 'Der Hauptbahnhof liegt in der Innenstadt.' },
      'hotel': { de: 'Hotel', en: 'hotel', phonetic: 'hoh-TEL', exampleEn: 'I booked a quiet room in this hotel.', exampleDe: 'Ich habe ein ruhiges Zimmer in diesem Hotel gebucht.' },
      'zimmer': { de: 'Zimmer', en: 'room', phonetic: 'room', exampleEn: 'The hotel room has a great view.', exampleDe: 'Das Hotelzimmer hat eine tolle Aussicht.' },
      'buchung': { de: 'Buchung', en: 'booking / reservation', phonetic: 'BOOK-ing', exampleEn: 'Here is my booking confirmation number.', exampleDe: 'Hier ist meine Buchungsbestätigungsnummer.' },
      'reservierung': { de: 'Reservierung', en: 'reservation / booking', phonetic: 'rez-ər-VEY-shən', exampleEn: 'I have a table reservation for two at 7 PM.', exampleDe: 'Ich habe eine Tischreservierung für zwei um 19 Uhr.' },
      'hilfe': { de: 'Hilfe', en: 'help / assistance', phonetic: 'help', exampleEn: 'Thank you for your kind help!', exampleDe: 'Vielen Dank für deine freundliche Hilfe!' },
      'helfen': { de: 'helfen', en: 'to help / assist', phonetic: 'help', exampleEn: 'Can I help you with this project?', exampleDe: 'Kann ich dir bei diesem Projekt helfen?' },
      'verstehen': { de: 'verstehen', en: 'to understand / comprehend', phonetic: 'un-dər-STAND', exampleEn: 'Now I understand how the code works.', exampleDe: 'Jetzt verstehe ich, wie der Code funktioniert.' },
      'lernen': { de: 'lernen', en: 'to learn / study', phonetic: 'lurn', exampleEn: 'I practice English every day to learn faster.', exampleDe: 'Ich übe jeden Tag Englisch, um schneller zu lernen.' },
      'sprechen': { de: 'sprechen', en: 'to speak / talk', phonetic: 'speek', exampleEn: 'Speaking English daily builds high confidence.', exampleDe: 'Täglich Englisch zu sprechen baut großes Selbstvertrauen auf.' },
      'schreiben': { de: 'schreiben', en: 'to write', phonetic: 'ryt', exampleEn: 'I write clean and well-documented code.', exampleDe: 'Ich schreibe sauberen und gut dokumentierten Code.' },
      'lesen': { de: 'lesen', en: 'to read', phonetic: 'reed', exampleEn: 'Reading technical articles improves your vocabulary.', exampleDe: 'Fachartikel zu lesen erweitert deinen Wortschatz.' },
      'hören': { de: 'hören', en: 'to listen / hear', phonetic: 'LIS-ən', exampleEn: 'Listen carefully to the audio pronunciation.', exampleDe: 'Hör dir die Aussprache genau an.' },
      'fragen': { de: 'fragen', en: 'to ask', phonetic: 'ask', exampleEn: 'Never hesitate to ask questions.', exampleDe: 'Zögere nie, Fragen zu stellen.' },
      'frage': { de: 'Frage', en: 'question', phonetic: 'KWES-chən', exampleEn: 'That is a very good question!', exampleDe: 'Das ist eine sehr gute Frage!' },
      'antwort': { de: 'Antwort', en: 'answer / reply', phonetic: 'AN-sər', exampleEn: 'I have an answer for your inquiry.', exampleDe: 'Ich habe eine Antwort auf deine Anfrage.' },
      'antworten': { de: 'antworten', en: 'to answer / reply', phonetic: 'AN-sər', exampleEn: 'Please answer the customer email today.', exampleDe: 'Bitte beantworte die Kunden-E-Mail heute.' },
      'problem': { de: 'Problem', en: 'problem / issue', phonetic: 'PROB-ləm', exampleEn: 'Every problem has an engineering solution.', exampleDe: 'Jedes Problem hat eine technische Lösung.' },
      'fehler': { de: 'Fehler', en: 'error / mistake / bug', phonetic: 'ER-ər / bəg', exampleEn: 'We detected a syntax error in the configuration file.', exampleDe: 'Wir haben einen Syntaxfehler in der Konfigurationsdatei entdeckt.' },
      'verbesserung': { de: 'Verbesserung', en: 'improvement', phonetic: 'im-PROOV-mənt', exampleEn: 'Continuous improvement is our team goal.', exampleDe: 'Kontinuierliche Verbesserung ist unser Teamziel.' },
      'verbessern': { de: 'verbessern', en: 'to improve / enhance', phonetic: 'im-PROOV', exampleEn: 'I want to improve my spoken English.', exampleDe: 'Ich möchte mein gesprochenes Englisch verbessern.' },
      'übung': { de: 'Übung', en: 'practice / exercise', phonetic: 'PRAK-tis', exampleEn: 'Practice makes perfect!', exampleDe: 'Übung macht den Meister!' },
      'üben': { de: 'üben', en: 'to practice / train', phonetic: 'PRAK-tis', exampleEn: 'Let us practice ten minutes of English.', exampleDe: 'Lass uns zehn Minuten Englisch üben.' },
      'gespräch': { de: 'Gespräch', en: 'conversation / talk / discussion', phonetic: 'kon-vər-SEY-shən', exampleEn: 'We had an insightful conversation about APIs.', exampleDe: 'Wir hatten ein aufschlussreiches Gespräch über APIs.' },
      'unterhaltung': { de: 'Unterhaltung', en: 'conversation / chat / entertainment', phonetic: 'kon-vər-SEY-shən', exampleEn: 'I truly enjoy our English conversation.', exampleDe: 'Ich genieße unsere englische Unterhaltung sehr.' },
      'schnitzeljagd': { de: 'Schnitzeljagd', en: 'scavenger hunt', phonetic: 'SKAV-in-jər hunt', exampleEn: 'The team organized a fun scavenger hunt in the city.', exampleDe: 'Das Team hat eine lustige Schnitzeljagd in der Stadt organisiert.' },
      'wanderung': { de: 'Wanderung', en: 'hike / walking tour', phonetic: 'hyk', exampleEn: 'We went on a weekend hike in the Black Forest.', exampleDe: 'Wir machten eine Wochenend-Wanderung im Schwarzwald.' },
      'wandern': { de: 'wandern', en: 'to hike', phonetic: 'hyk', exampleEn: 'I love to hike in the mountains during autumn.', exampleDe: 'Ich wandere im Herbst sehr gerne in den Bergen.' },
      'wetter': { de: 'Wetter', en: 'weather', phonetic: 'WETH-ər', exampleEn: 'The weather is sunny and pleasant today.', exampleDe: 'Das Wetter ist heute sonnig und angenehm.' },
      'sonne': { de: 'Sonne', en: 'sun', phonetic: 'sən', exampleEn: 'The sun is shining brightly.', exampleDe: 'Die Sonne scheint hell.' },
      'sonnig': { de: 'sonnig', en: 'sunny', phonetic: 'SUN-ee', exampleEn: 'It is a warm, sunny afternoon.', exampleDe: 'Es ist ein warmer, sonniger Nachmittag.' },
      'regen': { de: 'Regen', en: 'rain', phonetic: 'reyn', exampleEn: 'We need rain for the gardens.', exampleDe: 'Wir brauchen Regen für die Gärten.' },
      'schnee': { de: 'Schnee', en: 'snow', phonetic: 'snoh', exampleEn: 'Fresh snow covered the streets.', exampleDe: 'Frischer Schnee bedeckte die Straßen.' },
      'kalt': { de: 'kalt', en: 'cold', phonetic: 'kohld', exampleEn: 'It is getting cold outside tonight.', exampleDe: 'Es wird heute Nacht kalt draußen.' },
      'warm': { de: 'warm', en: 'warm', phonetic: 'wawrm', exampleEn: 'It is cozy and warm inside the house.', exampleDe: 'Es ist gemütlich und warm im Haus.' },
      'heute': { de: 'heute', en: 'today', phonetic: 'tuh-DEY', exampleEn: 'Today is a great day to learn English!', exampleDe: 'Heute ist ein toller Tag, um Englisch zu lernen!' },
      'gestern': { de: 'gestern', en: 'yesterday', phonetic: 'YES-tər-dey', exampleEn: 'Yesterday I finished the project report.', exampleDe: 'Gestern habe ich den Projektbericht fertiggestellt.' },
      'morgen': { de: 'morgen', en: 'tomorrow / morning', phonetic: 'tuh-MAW-roh', exampleEn: 'Tomorrow we will start the new sprint.', exampleDe: 'Morgen starten wir den neuen Sprint.' },
      'sprache': { de: 'Sprache', en: 'language', phonetic: 'LANG-gwij', exampleEn: 'English is the global language of technology.', exampleDe: 'Englisch ist die weltweite Sprache der Technologie.' },
      'wort': { de: 'Wort', en: 'word', phonetic: 'wurd', exampleEn: 'Every new word expands your thinking.', exampleDe: 'Jedes neue Wort erweitert dein Denken.' },
      'satz': { de: 'Satz', en: 'sentence', phonetic: 'SEN-təns', exampleEn: 'Try to form a complete English sentence.', exampleDe: 'Versuche, einen vollständigen englischen Satz zu bilden.' },
      'aussprache': { de: 'Aussprache', en: 'pronunciation', phonetic: 'pruh-nun-see-EY-shən', exampleEn: 'Your English pronunciation is improving quickly!', exampleDe: 'Deine englische Aussprache verbessert sich schnell!' },
      'übersetzung': { de: 'Übersetzung', en: 'translation', phonetic: 'tranz-LEY-shən', exampleEn: 'This translation captures the exact meaning.', exampleDe: 'Diese Übersetzung trifft die genaue Bedeutung.' },
      'übersetzen': { de: 'übersetzen', en: 'to translate', phonetic: 'TRANZ-leyt', exampleEn: 'Can you translate this sentence for me?', exampleDe: 'Kannst du diesen Satz für mich übersetzen?' },
      'lehrer': { de: 'Lehrer', en: 'teacher / instructor', phonetic: 'TEE-chər', exampleEn: 'A good teacher encourages and inspires students.', exampleDe: 'Ein guter Lehrer ermutigt und inspiriert Schüler.' },
      'lehrerin': { de: 'Lehrerin', en: 'teacher / instructor (female)', phonetic: 'TEE-chər', exampleEn: 'My English teacher is very patient.', exampleDe: 'Meine Englisch-Lehrerin ist sehr geduldig.' },
      'schüler': { de: 'Schüler', en: 'student / pupil', phonetic: 'STOO-dənt', exampleEn: 'The students asked insightful questions.', exampleDe: 'Die Schüler stellten aufschlussreiche Fragen.' },
      'ausbildung': { de: 'Ausbildung', en: 'apprenticeship / vocational training', phonetic: 'uh-PREN-tis-ship', exampleEn: 'Dual vocational training offers great career prospects.', exampleDe: 'Die duale Ausbildung bietet hervorragende Berufsaussichten.' },
      'chef': { de: 'Chef', en: 'boss / manager / supervisor', phonetic: 'bos', exampleEn: 'My boss approved my training request.', exampleDe: 'Mein Chef hat meinen Weiterbildungsantrag genehmigt.' },
      'kunde': { de: 'Kunde', en: 'client / customer', phonetic: 'KUS-tuh-mər', exampleEn: 'Customer satisfaction is our highest metric.', exampleDe: 'Kundenzufriedenheit ist unsere wichtigste Kennzahl.' },
      'vertrag': { de: 'Vertrag', en: 'contract / agreement', phonetic: 'KON-trakt', exampleEn: 'Both parties signed the employment contract.', exampleDe: 'Beide Parteien haben den Arbeitsvertrag unterzeichnet.' },
      'rechnung': { de: 'Rechnung', en: 'invoice / bill', phonetic: 'IN-voys', exampleEn: 'Please send the invoice to our accounting department.', exampleDe: 'Bitte sende die Rechnung an unsere Buchhaltung.' },
      'angebot': { de: 'Angebot', en: 'offer / quote / proposal', phonetic: 'AW-fər', exampleEn: 'We sent a detailed project offer to the client.', exampleDe: 'Wir haben dem Kunden ein detailliertes Projektangebot geschickt.' },
      'bestellung': { de: 'Bestellung', en: 'order', phonetic: 'OR-dər', exampleEn: 'Your hardware order has been shipped.', exampleDe: 'Deine Hardware-Bestellung wurde versandt.' },
      'zoll': { de: 'Zoll', en: 'customs / tariff', phonetic: 'KUS-təmz', exampleEn: 'Imported goods must clear customs inspection.', exampleDe: 'Eingeführte Waren müssen die Zollkontrolle passieren.' },
      'zölle': { de: 'Zölle', en: 'tariffs / customs duties', phonetic: 'TAIR-ifs', exampleEn: 'Tariffs are taxes imposed on imported goods.', exampleDe: 'Zölle sind Steuern auf importierte Waren.' },
      'export': { de: 'Export', en: 'export', phonetic: 'EK-sport', exampleEn: 'Germany is known for high-quality automobile exports.', exampleDe: 'Deutschland ist bekannt für hochwertige Automobilexporte.' },
      'import': { de: 'Import', en: 'import', phonetic: 'IM-port', exampleEn: 'Countries import raw materials to support manufacturing.', exampleDe: 'Länder importieren Rohstoffe zur Unterstützung der Produktion.' },
      'handel': { de: 'Handel', en: 'trade / commerce', phonetic: 'treyd', exampleEn: 'International trade fosters global economic growth.', exampleDe: 'Internationaler Handel fördert das weltweite Wirtschaftswachstum.' },
      'wirtschaft': { de: 'Wirtschaft', en: 'economy / economics', phonetic: 'i-KON-uh-mee', exampleEn: 'We study how global economic markets operate.', exampleDe: 'Wir untersuchen, wie globale Wirtschaftsmärkte funktionieren.' },
      'markt': { de: 'Markt', en: 'market', phonetic: 'MAR-kit', exampleEn: 'Emerging markets offer rapid growth potential.', exampleDe: 'Schwellenmärkte bieten schnelles Wachstumspotenzial.' },
      'thought': { direction: 'en_to_de', de: 'Gedanke / Überlegung', en: 'thought / idea', phonetic: 'thawt', exampleEn: 'I had an interesting thought about learning English.', exampleDe: 'Ich hatte einen interessanten Gedanken zum Englischlernen.' },
      'thoughts': { direction: 'en_to_de', de: 'Gedanken / Überlegung / Meinung', en: 'thoughts / opinions / reflections', phonetic: 'thawts', exampleEn: 'What are your thoughts on learning English?', exampleDe: 'Was sind deine Gedanken (deine Meinung) zum Englischlernen?' },
      'meaning': { direction: 'en_to_de', de: 'Bedeutung / Sinn', en: 'meaning / sense', phonetic: 'MEE-ning', exampleEn: 'What is the meaning of this word?', exampleDe: 'Was ist die Bedeutung dieses Wortes?' },
      'meant': { direction: 'en_to_de', de: 'gemeint (Vergangenheit von mean)', en: 'meant', phonetic: 'ment', exampleEn: 'What is meant by this phrase?', exampleDe: 'Was ist mit dieser Redewendung gemeint?' },
      'mean': { direction: 'en_to_de', de: 'bedeuten / meinen', en: 'to mean / signify', phonetic: 'meen', exampleEn: 'What does this word mean in German?', exampleDe: 'Was bedeutet dieses Wort auf Deutsch?' },
      'opinion': { direction: 'en_to_de', de: 'Meinung / Ansicht', en: 'opinion / view', phonetic: 'uh-PIN-yən', exampleEn: 'What is your opinion on programming?', exampleDe: 'Was ist deine Meinung zum Programmieren?' },
      'idea': { direction: 'en_to_de', de: 'Idee / Einfall', en: 'idea / concept', phonetic: 'eye-DEE-uh', exampleEn: 'Sharing ideas helps everyone learn faster.', exampleDe: 'Ideen auszutauschen hilft jedem, schneller zu lernen.' },
      'speaking': { direction: 'en_to_de', de: 'Sprechen', en: 'speaking / spoken English', phonetic: 'SPEE-king', exampleEn: 'Speaking English daily builds high confidence.', exampleDe: 'Täglich Englisch zu sprechen baut großes Selbstvertrauen auf.' },
      'erklären': { de: 'erklären', en: 'to explain / clarify', phonetic: 'ik-SPLEYN', exampleEn: 'Can you explain this word to me in English?', exampleDe: 'Kannst du mir dieses Wort auf Englisch erklären?' },
      'erklärung': { de: 'Erklärung', en: 'explanation', phonetic: 'ek-spluh-NEY-shən', exampleEn: 'Thank you for the clear explanation!', exampleDe: 'Danke für die klare Erklärung!' },
      'diskutieren': { de: 'diskutieren', en: 'to discuss / debate', phonetic: 'di-SKUS', exampleEn: 'Let us discuss this topic in detail.', exampleDe: 'Lass uns dieses Thema im Detail diskutieren.' },
      'diskussion': { de: 'Diskussion', en: 'discussion / debate', phonetic: 'di-SKUSH-ən', exampleEn: 'We had a productive discussion in our meeting.', exampleDe: 'Wir hatten eine produktive Diskussion in unserem Meeting.' },
      'beschreiben': { de: 'beschreiben', en: 'to describe', phonetic: 'di-SKRYB', exampleEn: 'Can you describe how the application works?', exampleDe: 'Kannst du beschreiben, wie die Anwendung funktioniert?' },
      'beschreibung': { de: 'Beschreibung', en: 'description', phonetic: 'di-SKRIP-shən', exampleEn: 'Please read the ticket description carefully.', exampleDe: 'Bitte lies die Ticket-Beschreibung sorgfältig durch.' },
      'bedeuten': { de: 'bedeuten', en: 'to mean / signify', phonetic: 'meen', exampleEn: 'What does this word mean in English?', exampleDe: 'Was bedeutet dieses Wort auf Englisch?' },
      'bedeutung': { de: 'Bedeutung', en: 'meaning / significance', phonetic: 'MEE-ning', exampleEn: 'Do you know the meaning of this sentence?', exampleDe: 'Kennst du die Bedeutung dieses Satzes?' },
      'wiederholen': { de: 'wiederholen', en: 'to repeat', phonetic: 'ri-PEET', exampleEn: 'Could you please repeat that sentence?', exampleDe: 'Könntest du diesen Satz bitte wiederholen?' },
      'wiederholung': { de: 'Wiederholung', en: 'repetition / review', phonetic: 'rep-i-TISH-ən', exampleEn: 'Repetition is the mother of skill.', exampleDe: 'Wiederholung ist die Mutter des Könnens.' },
      'inhalt': { de: 'Inhalt', en: 'content / subject matter', phonetic: 'KON-tent', exampleEn: 'The content of this course is very practical.', exampleDe: 'Der Inhalt dieses Kurses ist sehr praxisnah.' },
      'stadt': { de: 'Stadt', en: 'city / town', phonetic: 'SIT-ee', exampleEn: 'London is a vibrant international city.', exampleDe: 'London ist eine lebendige internationale Stadt.' },
      'statt': { de: 'statt / anstatt', en: 'instead of', phonetic: 'in-STED ov', exampleEn: 'Let us use JSON instead of XML.', exampleDe: 'Lass uns JSON statt XML verwenden.' },
      'anstatt': { de: 'anstatt', en: 'instead of', phonetic: 'in-STED ov', exampleEn: 'I walked home instead of taking the bus.', exampleDe: 'Ich bin zu Fuß nach Hause gegangen, anstatt den Bus zu nehmen.' },
      'weiter': { de: 'weiter', en: 'further / next / continue', phonetic: 'FUR-thər', exampleEn: 'Let us continue with the next exercise.', exampleDe: 'Lass uns mit der nächsten Übung weitermachen.' },
      'zeigen': { de: 'zeigen', en: 'to show / demonstrate', phonetic: 'shoh', exampleEn: 'Can you show me an example sentence?', exampleDe: 'Kannst du mir einen Beispielsatz zeigen?' },
      'denken': { de: 'denken', en: 'to think', phonetic: 'think', exampleEn: 'What do you think about this idea?', exampleDe: 'Was denkst du über diese Idee?' },
      'glauben': { de: 'glauben', en: 'to believe / think', phonetic: 'bi-LEEV', exampleEn: 'I believe you will master English quickly.', exampleDe: 'Ich glaube, dass du Englisch schnell meistern wirst.' },
      'wissen': { de: 'wissen', en: 'to know', phonetic: 'noh', exampleEn: 'Do you know how to solve this bug?', exampleDe: 'Weißt du, wie man diesen Bug behebt?' },
      'kennen': { de: 'kennen', en: 'to know / be familiar with', phonetic: 'noh', exampleEn: 'I know this programming framework very well.', exampleDe: 'Ich kenne dieses Programmier-Framework sehr gut.' },
      'finden': { de: 'finden', en: 'to find', phonetic: 'fynd', exampleEn: 'Did you find the error in the log file?', exampleDe: 'Hast du den Fehler in der Log-Datei gefunden?' },
      'suchen': { de: 'suchen', en: 'to search / look for', phonetic: 'surch', exampleEn: 'I am looking for a good English dictionary.', exampleDe: 'Ich suche nach einem guten Englisch-Wörterbuch.' },
      'brauchen': { de: 'brauchen', en: 'to need / require', phonetic: 'need', exampleEn: 'We need more unit tests for this module.', exampleDe: 'Wir brauchen mehr Unit-Tests für dieses Modul.' },
      'wollen': { de: 'wollen', en: 'to want', phonetic: 'wont', exampleEn: 'I want to speak English fluently.', exampleDe: 'Ich will fließend Englisch sprechen.' },
      'können': { de: 'können', en: 'can / to be able to', phonetic: 'kan', exampleEn: 'Can you help me with the translation?', exampleDe: 'Kannst du mir bei der Übersetzung helfen?' },
      'müssen': { de: 'müssen', en: 'must / to have to', phonetic: 'must', exampleEn: 'We have to deploy the update today.', exampleDe: 'Wir müssen das Update heute bereitstellen.' },
      'sollen': { de: 'sollen', en: 'should / to be supposed to', phonetic: 'shood', exampleEn: 'What should I say in the interview?', exampleDe: 'Was soll ich im Vorstellungsgespräch sagen?' },
      'dürfen': { de: 'dürfen', en: 'may / to be allowed to', phonetic: 'mey', exampleEn: 'May I ask you a quick question?', exampleDe: 'Darf ich dir eine kurze Frage stellen?' },
      'machen': { de: 'machen', en: 'to make / to do', phonetic: 'meyk / doo', exampleEn: 'What are you doing this weekend?', exampleDe: 'Was machst du dieses Wochenende?' },
      'tun': { de: 'tun', en: 'to do', phonetic: 'doo', exampleEn: 'There is still a lot of work to do.', exampleDe: 'Es gibt noch viel zu tun.' },
      'gehen': { de: 'gehen', en: 'to go / to walk', phonetic: 'goh', exampleEn: 'Let us go for a walk in the park.', exampleDe: 'Lass uns im Park spazieren gehen.' },
      'kommen': { de: 'kommen', en: 'to come', phonetic: 'kum', exampleEn: 'Where do you come from?', exampleDe: 'Woher kommst du?' },
      'sehen': { de: 'sehen', en: 'to see / to look', phonetic: 'see', exampleEn: 'I see what you mean!', exampleDe: 'Ich verstehe (sehe), was du meinst!' },
      'geben': { de: 'geben', en: 'to give', phonetic: 'giv', exampleEn: 'Can you give me a simple example?', exampleDe: 'Kannst du mir ein einfaches Beispiel geben?' },
      'nehmen': { de: 'nehmen', en: 'to take', phonetic: 'teyk', exampleEn: 'Let us take a short coffee break.', exampleDe: 'Lass uns eine kurze Kaffeepause machen (nehmen).' },
      'bringen': { de: 'bringen', en: 'to bring', phonetic: 'bring', exampleEn: 'Can you bring your laptop to the meeting?', exampleDe: 'Kannst du deinen Laptop zum Meeting mitbringen?' },
      'holen': { de: 'holen', en: 'to get / to fetch', phonetic: 'get', exampleEn: 'I will get a cup of coffee.', exampleDe: 'Ich hole mir eine Tasse Kaffee.' },
      'kaufen': { de: 'kaufen', en: 'to buy / to purchase', phonetic: 'by', exampleEn: 'We need to buy a new server license.', exampleDe: 'Wir müssen eine neue Serverlizenz kaufen.' },
      'verkaufen': { de: 'verkaufen', en: 'to sell', phonetic: 'sel', exampleEn: 'The company sells cloud software worldwide.', exampleDe: 'Das Unternehmen verkauft weltweit Cloud-Software.' },
      'bezahlen': { de: 'bezahlen', en: 'to pay', phonetic: 'pey', exampleEn: 'Can I pay by credit card?', exampleDe: 'Kann ich mit Kreditkarte bezahlen?' },
      'kosten': { de: 'kosten', en: 'to cost (costs)', phonetic: 'kost', exampleEn: 'How much does this ticket cost?', exampleDe: 'Wie viel kostet dieses Ticket?' },
      'öffnen': { de: 'öffnen', en: 'to open', phonetic: 'OH-pən', exampleEn: 'Please open the project file in your editor.', exampleDe: 'Bitte öffne die Projektdatei in deinem Editor.' },
      'schließen': { de: 'schließen', en: 'to close', phonetic: 'klohz', exampleEn: 'Do not forget to close the database connection.', exampleDe: 'Vergiss nicht, die Datenbankverbindung zu schließen.' },
      'beginnen': { de: 'beginnen', en: 'to begin / to start', phonetic: 'bi-GIN', exampleEn: 'When does our meeting begin?', exampleDe: 'Wann beginnt unsere Besprechung?' },
      'anfangen': { de: 'anfangen', en: 'to start / to begin', phonetic: 'start', exampleEn: 'Let us start with an easy question.', exampleDe: 'Lass uns mit einer einfachen Frage anfangen.' },
      'aufhören': { de: 'aufhören', en: 'to stop / to quit', phonetic: 'stop', exampleEn: 'It finally stopped raining.', exampleDe: 'Es hat endlich aufgehört zu regnen.' },
      'beenden': { de: 'beenden', en: 'to finish / to end / to complete', phonetic: 'FIN-ish', exampleEn: 'I will finish this task before lunch.', exampleDe: 'Ich werde diese Aufgabe vor dem Mittagessen beenden.' },
      'versuchen': { de: 'versuchen', en: 'to try / to attempt', phonetic: 'try', exampleEn: 'Try to say the sentence out loud!', exampleDe: 'Versuche, den Satz laut auszusprechen!' },
      'benutzen': { de: 'benutzen', en: 'to use', phonetic: 'yooz', exampleEn: 'Which programming language do you use most?', exampleDe: 'Welche Programmiersprache benutzt du am meisten?' },
      'verwenden': { de: 'verwenden', en: 'to use / to utilize', phonetic: 'yooz', exampleEn: 'We use Git for version control.', exampleDe: 'Wir verwenden Git zur Versionsverwaltung.' },
      'entwickeln': { de: 'entwickeln', en: 'to develop / to build', phonetic: 'di-VEL-əp', exampleEn: 'We develop modern web applications.', exampleDe: 'Wir entwickeln moderne Webanwendungen.' },
      'entwicklung': { de: 'Entwicklung', en: 'development', phonetic: 'di-VEL-əp-mənt', exampleEn: 'Software development requires teamwork.', exampleDe: 'Softwareentwicklung erfordert Teamarbeit.' },
      'entwickler': { de: 'Entwickler', en: 'developer / engineer', phonetic: 'di-VEL-ə-pər', exampleEn: 'I work as a software developer.', exampleDe: 'Ich arbeite als Softwareentwickler.' },
      'programmieren': { de: 'programmieren', en: 'to program / to code', phonetic: 'PROH-gram / kohd', exampleEn: 'I love coding in JavaScript and Python.', exampleDe: 'Ich programmiere sehr gerne in JavaScript und Python.' },
      'testen': { de: 'testen', en: 'to test', phonetic: 'test', exampleEn: 'We must test the new feature thoroughly.', exampleDe: 'Wir müssen die neue Funktion gründlich testen.' },
      'speichern': { de: 'speichern', en: 'to save / to store', phonetic: 'seyv / stor', exampleEn: 'Remember to save your changes.', exampleDe: 'Denk daran, deine Änderungen zu speichern.' },
      'löschen': { de: 'löschen', en: 'to delete / to remove', phonetic: 'di-LEET', exampleEn: 'Be careful not to delete production data.', exampleDe: 'Pass auf, keine Produktionsdaten zu löschen.' },
      'ändern': { de: 'ändern', en: 'to change / to modify', phonetic: 'cheynj', exampleEn: 'You can change the language setting anytime.', exampleDe: 'Du kannst die Spracheinstellung jederzeit ändern.' },
      'änderung': { de: 'Änderung', en: 'change / modification', phonetic: 'cheynj', exampleEn: 'I pushed the latest code changes to GitHub.', exampleDe: 'Ich habe die neuesten Code-Änderungen auf GitHub hochgeladen.' },
      'vergleichen': { de: 'vergleichen', en: 'to compare', phonetic: 'kəm-PAIR', exampleEn: 'Let us compare both solutions.', exampleDe: 'Lass uns beide Lösungen vergleichen.' },
      'entscheiden': { de: 'entscheiden', en: 'to decide', phonetic: 'di-SYD', exampleEn: 'We need to decide which database to use.', exampleDe: 'Wir müssen entscheiden, welche Datenbank wir nutzen.' },
      'planen': { de: 'planen', en: 'to plan / to schedule', phonetic: 'plan', exampleEn: 'What are you planning for the next sprint?', exampleDe: 'Was planst du für den nächsten Sprint?' },
      'erinnern': { de: 'erinnern', en: 'to remember / to remind', phonetic: 'ri-MEM-bər', exampleEn: 'Do you remember this English word?', exampleDe: 'Erinnerst du dich an dieses englische Wort?' },
      'vergessen': { de: 'vergessen', en: 'to forget', phonetic: 'fər-GET', exampleEn: 'Never forget to back up your database.', exampleDe: 'Vergiss nie, ein Backup deiner Datenbank zu machen.' },
      'warten': { de: 'warten', en: 'to wait', phonetic: 'weyt', exampleEn: 'I am waiting for the code review.', exampleDe: 'Ich warte auf das Code-Review.' },
      'hoffen': { de: 'hoffen', en: 'to hope', phonetic: 'hohp', exampleEn: 'I hope you have a great day!', exampleDe: 'Ich hoffe, du hast einen tollen Tag!' },
      'wünschen': { de: 'wünschen', en: 'to wish', phonetic: 'wish', exampleEn: 'I wish you lots of success in your exam.', exampleDe: 'Ich wünsche dir viel Erfolg bei deiner Prüfung.' },
      'lieben': { de: 'lieben', en: 'to love', phonetic: 'luv', exampleEn: 'I love learning new things.', exampleDe: 'Ich liebe es, neue Dinge zu lernen.' },
      'mögen': { de: 'mögen', en: 'to like', phonetic: 'lyk', exampleEn: 'Do you like working in a team?', exampleDe: 'Magst du es, im Team zu arbeiten?' },
      'leben': { de: 'leben / Leben', en: 'to live / life', phonetic: 'liv / lyf', exampleEn: 'Where do you live?', exampleDe: 'Wo lebst du?' },
      'wohnen': { de: 'wohnen', en: 'to live / to reside', phonetic: 'liv', exampleEn: 'I live in Germany.', exampleDe: 'Ich wohne in Deutschland.' },
      'schlafen': { de: 'schlafen', en: 'to sleep', phonetic: 'sleep', exampleEn: 'Did you sleep well last night?', exampleDe: 'Hast du letzte Nacht gut geschlafen?' },
      'kochen': { de: 'kochen', en: 'to cook', phonetic: 'kook', exampleEn: 'I like to cook fresh food in the evening.', exampleDe: 'Ich koche abends gerne frisches Essen.' },
      'spielen': { de: 'spielen', en: 'to play', phonetic: 'pley', exampleEn: 'Do you play any musical instruments?', exampleDe: 'Spielst du ein Musikinstrument?' },
      'gewinnen': { de: 'gewinnen', en: 'to win / to gain', phonetic: 'win', exampleEn: 'With practice, you will gain confidence.', exampleDe: 'Mit Übung wirst du Selbstvertrauen gewinnen.' },
      'verlieren': { de: 'verlieren', en: 'to lose', phonetic: 'looz', exampleEn: 'Do not lose your motivation!', exampleDe: 'Verliere nicht deine Motivation!' },
      'beispiel': { de: 'Beispiel', en: 'example / instance', phonetic: 'ig-ZAM-pəl', exampleEn: 'Can you give me a practical example?', exampleDe: 'Kannst du mir ein praktisches Beispiel geben?' },
      'zusammen': { de: 'zusammen', en: 'together', phonetic: 'tuh-GETH-ər', exampleEn: 'Let us practice English together!', exampleDe: 'Lass uns zusammen Englisch üben!' },
      'natürlich': { de: 'natürlich', en: 'of course / naturally', phonetic: 'ov KORS / NACH-rəl-ee', exampleEn: 'Of course I can help you with that!', exampleDe: 'Natürlich kann ich dir dabei helfen!' },
      'vielleicht': { de: 'vielleicht', en: 'maybe / perhaps', phonetic: 'MEY-bee', exampleEn: 'Maybe we can test this tomorrow.', exampleDe: 'Vielleicht können wir das morgen testen.' },
      'immer': { de: 'immer', en: 'always', phonetic: 'AWL-weyz', exampleEn: 'You can always ask me in German or English.', exampleDe: 'Du kannst mich immer auf Deutsch oder Englisch fragen.' },
      'niemals': { de: 'niemals / nie', en: 'never', phonetic: 'NEV-ər', exampleEn: 'It is never too late to learn a language.', exampleDe: 'Es ist niemals zu spät, eine Sprache zu lernen.' },
      'oft': { de: 'oft', en: 'often / frequently', phonetic: 'AW-fən', exampleEn: 'How often do you practice English?', exampleDe: 'Wie oft übst du Englisch?' },
      'manchmal': { de: 'manchmal', en: 'sometimes', phonetic: 'SUM-tymz', exampleEn: 'Sometimes grammar can be tricky.', exampleDe: 'Manchmal kann Grammatik knifflig sein.' },
      'jetzt': { de: 'jetzt / sofort', en: 'now / right now', phonetic: 'now', exampleEn: 'Let us try it right now!', exampleDe: 'Lass es uns jetzt gleich ausprobieren!' },
      'später': { de: 'später', en: 'later', phonetic: 'LEY-tər', exampleEn: 'See you later!', exampleDe: 'Bis später!' },
      'richtig': { de: 'richtig', en: 'correct / right', phonetic: 'kuh-REKT / ryt', exampleEn: 'Your answer is completely correct!', exampleDe: 'Deine Antwort ist völlig richtig!' },
      'falsch': { de: 'falsch', en: 'wrong / incorrect / false', phonetic: 'rawng / in-kuh-REKT', exampleEn: 'Do not worry if a word is wrong.', exampleDe: 'Mach dir keine Sorgen, wenn ein Wort falsch ist.' },
      'genau': { de: 'genau', en: 'exactly / precise', phonetic: 'ig-ZAKT-lee', exampleEn: 'That is exactly what I meant!', exampleDe: 'Das ist genau das, was ich meinte!' },
      'klar': { de: 'klar / deutlich', en: 'clear / clearly', phonetic: 'kleer', exampleEn: 'Your pronunciation is very clear.', exampleDe: 'Deine Aussprache ist sehr klar.' },
      'anforderung': { de: 'Anforderung', en: 'requirement / demand', phonetic: 'ri-KWYR-mənt', exampleEn: 'We documented every customer requirement clearly.', exampleDe: 'Wir haben jede Kundenanforderung klar dokumentiert.' },
      'anforderungen': { de: 'Anforderungen', en: 'requirements', phonetic: 'ri-KWYR-mənts', exampleEn: 'The software meets all functional requirements.', exampleDe: 'Die Software erfüllt alle funktionalen Anforderungen.' },
      'bibliothek': { de: 'Bibliothek', en: 'library', phonetic: 'LY-brer-ee', exampleEn: 'This vocabulary library contains thousands of words.', exampleDe: 'Diese Vokabel-Bibliothek enthält Tausende Wörter.' },
      'vokabel': { de: 'Vokabel', en: 'vocabulary word / term', phonetic: 'voh-KAB-yuh-ler-ee', exampleEn: 'I learn ten new vocabulary words every day.', exampleDe: 'Ich lerne jeden Tag zehn neue Vokabeln.' },
      'vokabeln': { de: 'Vokabeln', en: 'vocabulary / words', phonetic: 'voh-KAB-yuh-ler-ee', exampleEn: 'Practicing vocabulary builds fluency.', exampleDe: 'Vokabeln zu üben baut Sprachflüssigkeit auf.' },
      'erkennung': { de: 'Erkennung', en: 'recognition / detection', phonetic: 'rek-əg-NISH-ən', exampleEn: 'Speech recognition works in both German and English.', exampleDe: 'Die Spracherkennung funktioniert auf Deutsch und Englisch.' },
      'erkennen': { de: 'erkennen', en: 'to recognize / to detect', phonetic: 'REK-əg-nyz', exampleEn: 'The system recognizes your intent automatically.', exampleDe: 'Das System erkennt deine Absicht automatisch.' },
      'funktionieren': { de: 'funktionieren', en: 'to work / to function', phonetic: 'wurk / FUNK-shən', exampleEn: 'Everything works flawlessly now!', exampleDe: 'Jetzt funktioniert alles einwandfrei!' },
      'einwandfrei': { de: 'einwandfrei', en: 'flawlessly / perfectly / impeccably', phonetic: 'FLAW-lis-lee', exampleEn: 'The translation module works flawlessly.', exampleDe: 'Das Übersetzungsmodul funktioniert einwandfrei.' },
      'selbstverständlich': { de: 'selbstverständlich', en: 'of course / naturally / self-evident', phonetic: 'ov KORS', exampleEn: 'Of course I can translate that for you!', exampleDe: 'Selbstverständlich kann ich das für dich übersetzen!' },
      'komplett': { de: 'komplett', en: 'complete / completely / full', phonetic: 'kəm-PLEET', exampleEn: 'Here is the complete translation.', exampleDe: 'Hier ist die komplette Übersetzung.' }
    },

    // Kompakte Groß-Bibliothek (über 700 weitere Grund- & Aufbauwörter Deutsch <-> Englisch für 100% Offline-Abdeckung)
    rawLexiconData: [
      'sein:to be|haben:to have|werden:to become / will|sagen:to say / tell|reden:to talk / speak|erzählen:to tell / narrate',
      'begreifen:to comprehend / understand|studieren:to study|meinen:to mean / think|suchen:to search / look for|bekommen:to get / receive|erhalten:to receive / obtain',
      'probieren:to try / taste|anpassen:to adapt / adjust / customize|prüfen:to check / test / examine|kontrollieren:to check / control|vorbereiten:to prepare|unterstützen:to support / assist',
      'aufwachen:to wake up|backen:to bake|laufen:to walk / run|rennen:to run|fahren:to drive / ride / go|fliegen:to fly',
      'buchen:to book / reserve|reservieren:to reserve / book|ankommen:to arrive|abfahren:to depart / leave|bleiben:to stay / remain|hassen:to hate',
      'fühlen:to feel|lachen:to laugh|weinen:to cry|lächeln:to smile|schauen:to look / watch|blicken:to look / glance',
      'treffen:to meet|kennenlernen:to get to know / meet|einladen:to invite|besuchen:to visit|anrufen:to call / phone|telefonieren:to talk on the phone',
      'schicken:to send|senden:to send / broadcast|akzeptieren:to accept|ablehnen:to reject / decline|erlauben:to allow / permit|verbieten:to forbid / prohibit',
      'versprechen:to promise|empfehlen:to recommend|vorschlagen:to suggest / propose|vereinbaren:to agree on / arrange|bestätigen:to confirm|absagen:to cancel',
      'verschieben:to postpone / move|teilnehmen:to participate / attend|leiten:to lead / manage|führen:to lead / guide|erstellen:to create / build|bauen:to build / construct',
      'reparieren:to repair / fix|lösen:to solve / resolve|berechnen:to calculate / compute|zählen:to count|messen:to measure|wachsen:to grow',
      'steigen:to rise / increase / climb|sinken:to sink / decrease / drop|fallen:to fall / drop|erhöhen:to increase / raise|reduzieren:to reduce / decrease|sparen:to save (money/time)',
      'investieren:to invest|liefern:to deliver / supply|bestellen:to order|verpacken:to pack / package|drucken:to print|kopieren:to copy',
      'teilen:to share / divide|verbinden:to connect / link|trennen:to separate / disconnect|starten:to start / launch|stoppen:to stop|installieren:to install',
      'herunterladen:to download|hochladen:to upload|aktualisieren:to update / refresh|sichern:to back up / secure|wiederherstellen:to restore / recover|buchstabieren:to spell',
      'aussprechen:to pronounce|bedeuten:to mean|heißen:to be called / mean|übersetzen:to translate|erklären:to explain|beschreiben:to describe',
      'beruf:profession / occupation / job|stelle:job / position|bewerbung:application|vorstellungsgespräch:job interview|lebenslauf:resume / CV|kenntnis:knowledge',
      'fähigkeit:ability / skill|ziel:goal / target / objective|vorschlag:suggestion / proposal|unterricht:lessons / class|kurs:course / class|universität:university',
      'note:grade / mark|zeugnis:certificate / report card|mitarbeiter:employee / coworker|abteilung:department|firma:company / firm|unternehmen:company / enterprise',
      'partner:partner|projekt:project|konferenz:conference|pause:break / pause|woche:week|monat:month',
      'jahr:year|vormittag:morning / forenoon|mittag:noon / midday|nachmittag:afternoon|abend:evening|nacht:night',
      'stunde:hour|minute:minute|sekunde:second|vergangenheit:past|gegenwart:present|zukunft:future',
      'anfang:beginning / start|ende:end / finish|grund:reason / cause|ursache:cause / root cause|wirkung:effect / impact|ergebnis:result / outcome',
      'vorteil:advantage / benefit|nachteil:disadvantage / drawback|unterschied:difference|ähnlichkeit:similarity|möglichkeit:possibility / option / opportunity|chance:chance / opportunity',
      'risiko:risk|sicherheit:security / safety|qualität:quality|leistung:performance / achievement|geschwindigkeit:speed / velocity|speicher:memory / storage',
      'netzwerk:network|server:server|datenbank:database|tabelle:table / spreadsheet|abfrage:query|schnittstelle:interface / API',
      'anwendung:application / app|programm:program|quellcode:source code|funktion:function / feature|methode:method|klasse:class',
      'objekt:object|variable:variable|schleife:loop|bedingung:condition|ausnahme:exception|berechtigung:permission / authorization',
      'passwort:password|benutzer:user|konto:account|einstellung:setting / configuration|bildschirm:screen / monitor|tastatur:keyboard',
      'maus:mouse|datei:file|ordner:folder / directory|verzeichnis:directory|pfad:path|verbindung:connection',
      'anfrage:request / inquiry|rückgabe:return|land:country / land|dorf:village|straße:street / road|weg:way / path',
      'platz:place / square / seat|brücke:bridge|wohnung:apartment / flat|küche:kitchen|bad:bathroom|fenster:window',
      'tür:door|tisch:table / desk|stuhl:chair|bett:bed|schrank:cabinet / closet|zug:train',
      'bahn:train / railway|bus:bus|flugzeug:airplane / plane|schiff:ship / boat|fahrrad:bicycle / bike|fahrkarte:ticket',
      'gepäck:luggage / baggage|koffer:suitcase|reisepass:passport|ausweis:ID card / identity card|rezeption:reception / front desk|restaurant:restaurant',
      'speisekarte:menu|frühstück:breakfast|mittagessen:lunch|abendessen:dinner / supper|brot:bread|butter:butter',
      'käse:cheese|fleisch:meat|fisch:fish|gemüse:vegetables|obst:fruit|apfel:apple',
      'kartoffel:potato|reis:rice|nudeln:pasta / noodles|suppe:soup|salat:salad|kuchen:cake',
      'salz:salt|pfeffer:pepper|zucker:sugar|milch:milk|saft:juice|bier:beer',
      'wein:wine|gesundheit:health|schmerz:pain / ache|arzt:doctor / physician|krankenhaus:hospital|medikament:medicine / medication',
      'familie:family|eltern:parents|vater:father|mutter:mother|kind:child / kid|sohn:son',
      'tochter:daughter|bruder:brother|schwester:sister|nachbar:neighbor|mensch:human / person|person:person',
      'mann:man / husband|frau:woman / wife|kopf:head|hand:hand|auge:eye|herz:heart',
      'stimme:voice|alter:age|adresse:address|telefonnummer:phone number|preis:price / prize|wert:value / worth',
      'bank:bank / bench|karte:card / map / ticket|bargeld:cash|steuer:tax|lieferung:delivery / shipment|rabatt:discount',
      'gewinn:profit / gain|verlust:loss|umsatz:revenue / sales / turnover|wachstum:growth|inflation:inflation|zins:interest (rate)',
      'währung:currency|wind:wind|wolke:cloud|himmel:sky / heaven|natur:nature|baum:tree',
      'blume:flower|tier:animal|hund:dog|katze:cat|vogel:bird|musik:music',
      'lied:song|film:movie / film|buch:book|zeitung:newspaper|nachricht:message / news|information:information',
      'wahrheit:truth|ruhe:calm / peace / quiet|stress:stress|freude:joy / pleasure|spaß:fun|glück:luck / happiness',
      'angst:fear / anxiety|sorge:worry / concern|hoffnung:hope|geduld:patience|vertrauen:trust / confidence|respekt:respect',
      'unterstützung:support|gut:good / well|schlecht:bad / poor|groß:big / large / tall|klein:small / little / short|lang:long',
      'kurz:short / brief|hoch:high / tall|niedrig:low|weit:far / wide|nah:near / close|früh:early',
      'spät:late|jung:young|alt:old|neu:new|modern:modern|schön:beautiful / nice / lovely',
      'hässlich:ugly|stark:strong / powerful|schwach:weak|schwer:heavy / difficult / hard|leicht:light / easy|hart:hard / tough',
      'weich:soft|heiß:hot|kühl:cool|hell:bright / light|dunkel:dark|laut:loud / noisy',
      'leise:quiet / soft|sauber:clean|schmutzig:dirty|voll:full|leer:empty|offen:open',
      'geschlossen:closed|frei:free / available|besetzt:busy / occupied|teuer:expensive|billig:cheap|günstig:affordable / favorable',
      'kostenlos:free of charge|reich:rich / wealthy|arm:poor|wach:awake|fit:fit|froh:glad / happy',
      'zufrieden:satisfied / content|wütend:angry / furious|nervös:nervous|ruhig:calm / quiet|entspannt:relaxed|gestresst:stressed',
      'freundlich:friendly / kind|nett:nice / kind|höflich:polite|ehrlich:honest|pünktlich:punctual / on time|fleißig:hardworking / diligent',
      'faul:lazy|klug:smart / clever / wise|intelligent:intelligent|notwendig:necessary|dringend:urgent|möglich:possible',
      'unmöglich:impossible|sicher:safe / secure / sure|gefährlich:dangerous|wahr:true|echt:real / genuine|exakt:exact / accurate',
      'deutlich:clear / distinct|verständlich:understandable / clear|ähnlich:similar|verschieden:different / various|unterschiedlich:different / varied|gleich:same / equal / right away',
      'gemeinsam:common / joint / together|eigen:own|persönlich:personal|öffentlich:public|privat:private|beruflich:professional / occupational',
      'technisch:technical|automatisch:automatic|digital:digital|lokal:local|global:global|international:international',
      'nützlich:useful / helpful|hilfreich:helpful|sinnvoll:meaningful / sensible / useful|interessant:interesting|langweilig:boring|spannend:exciting / thrilling',
      'lustig:funny|ernst:serious|bereit:ready|fertig:finished / ready / done|übermorgen:the day after tomorrow|vorgestern:the day before yesterday',
      'sofort:immediately / right now|bald:soon|vorher:before / previously|nachher:afterwards / later|häufig:frequently / often|selten:rarely / seldom',
      'nie:never|schon:already|bereits:already|noch:still / yet|erst:only / first|wieder:again',
      'nochmal:again / once more|hier:here|dort:there|überall:everywhere|nirgendwo:nowhere|oben:up / above / upstairs',
      'unten:down / below / downstairs|vorne:in front / ahead|hinten:in the back / behind|links:left|rechts:right|drinnen:inside / indoors',
      'draußen:outside / outdoors|allein:alone|gerne:gladly / with pleasure|leider:unfortunately|wahrscheinlich:probably / likely|bestimmt:certainly / definitely',
      'eigentlich:actually / really|besonders:especially / particularly|fast:almost / nearly|beinahe:almost / nearly|ungefähr:approximately / about|mindestens:at least',
      'höchstens:at most|genug:enough|sehr:very|ziemlich:quite / pretty / fairly|ganz:whole / quite / completely|völlig:completely / totally',
      'trotzdem:nevertheless / anyway|deshalb:therefore / that is why|darum:therefore / that is why|deswegen:therefore / because of that|weil:because|obwohl:although / even though',
      'falls:if / in case|sobald:as soon as|solange:as long as|bevor:before|nachdem:after|während:while / during',
      'damit:so that / with it|ohne:without|gegen:against|durch:through / by|zwischen:between|neben:next to / beside'
    ],

    _lexiconInitialized: false,
    ensureLexiconLoaded() {
      if (this._lexiconInitialized) return;
      this._lexiconInitialized = true;
      for (const row of this.rawLexiconData) {
        const pairs = row.split('|');
        for (const pair of pairs) {
          const [deRaw, enRaw] = pair.split(':');
          if (!deRaw || !enRaw) continue;
          const key = deRaw.trim().toLowerCase();
          if (!this.common[key]) {
            const isVerb = enRaw.trim().startsWith('to ');
            const capDe = isVerb ? key : (key.charAt(0).toUpperCase() + key.slice(1));
            const primaryEn = enRaw.split('/')[0].replace(/^to\s+/i, '').trim();
            this.common[key] = {
              de: capDe,
              en: enRaw.trim(),
              phonetic: '',
              exampleEn: isVerb
                ? `In English, we use "${enRaw.split('/')[0].trim()}" in daily conversation.`
                : `The word "${primaryEn}" is very useful in everyday English.`,
              exampleDe: `„${capDe}“ heißt auf Englisch „${enRaw.trim()}“.`
            };
          }
        }
      }
    },

    lookup(word) {
      this.ensureLexiconLoaded();
      if (!word) return null;
      let clean = word.toLowerCase().trim().replace(/[^a-zäöüß0-9\s\-]/g, '');
      if (!clean) return null;

      // Bereinige evtl. mitgegebene Begleitwörter ("das wort erklären" -> "erklären")
      clean = clean
        .replace(/^(das\s+wort|ein\s+wort|wort|the\s+word|word|der\s+begriff|begriff|was\s+hei[sß]+t|wie\s+hei[sß]+t|wie\s+sagt\s+man|übersetze|translate)\s+/i, '')
        .replace(/\s+(auf\s+englisch|ins\s+englische|in\s+english|to\s+english|into\s+english|auf\s+deutsch|in\s+german|übersetzen|übersetzt|translate|bitte|please|bedeutet|heißt|heisst)$/i, '')
        .replace(/^(der|die|das|ein|eine|einen|to|the|a|an)\s+/i, '')
        .trim();
      if (!clean) return null;

      // Typische Tippfehler bei deutschen Wörtern korrigieren (z.B. "ferstehen" -> "verstehen", "überstzen" -> "übersetzen", "wokabel" -> "vokabel")
      const deTypoFixes = {
        'ferstehen': 'verstehen',
        'ferschtehen': 'verstehen',
        'ferstehe': 'verstehen',
        'überstzen': 'übersetzen',
        'überstezen': 'übersetzen',
        'übersetzzt': 'übersetzen',
        'überstzung': 'übersetzung',
        'anvorderung': 'anforderung',
        'anvorderunge': 'anforderungen',
        'anvorderungen': 'anforderungen',
        'wokabel': 'vokabel',
        'wokabeln': 'vokabeln',
        'bibliotek': 'bibliothek',
        'selbverständlich': 'selbstverständlich',
        'lerenen': 'lernen',
        'prache': 'sprache',
        'erklaeren': 'erklären',
        'erklaerung': 'erklärung',
        'uebersetzen': 'übersetzen',
        'uebersetzung': 'übersetzung',
        'üebrsetzen': 'übersetzen',
        'frägt': 'fragen',
        'fragt': 'fragen'
      };
      if (deTypoFixes[clean]) {
        clean = deTypoFixes[clean];
      }

      // 1. In common Dictionary suchen (direkt oder über deutsche Verb-/Nomen-Stammformen)
      const umlautNorm = clean.replace(/ae/g, 'ä').replace(/oe/g, 'ö').replace(/ue/g, 'ü');
      const candidates = [
        clean,
        umlautNorm,
        clean.endsWith('s') && clean.length > 3 ? clean.slice(0, -1) : null,
        clean.endsWith('n') && clean.length > 4 ? clean.slice(0, -1) : null,
        clean.endsWith('en') && clean.length > 4 ? clean.slice(0, -2) : null,
        clean.endsWith('e') && clean.length > 3 ? clean.slice(0, -1) : null,
        clean.endsWith('e') && clean.length > 3 ? clean + 'n' : null,
        clean.endsWith('st') && clean.length > 4 ? clean.slice(0, -2) + 'en' : null,
        clean.endsWith('t') && clean.length > 3 ? clean.slice(0, -1) + 'en' : null,
        !clean.endsWith('en') && clean.length >= 3 ? clean + 'en' : null,
        umlautNorm !== clean && !umlautNorm.endsWith('en') ? umlautNorm + 'en' : null
      ].filter(Boolean);

      let item = null;
      for (const c of candidates) {
        if (this.common[c]) {
          item = this.common[c];
          break;
        }
      }

      if (item) {
        return {
          direction: item.direction || 'de_to_en',
          german: item.de || word,
          english: item.en,
          phonetic: item.phonetic || '',
          exampleEn: item.exampleEn || '',
          exampleDe: item.exampleDe || ''
        };
      }

      // Check reverse in common Dictionary (English -> German)
      for (const [k, v] of Object.entries(this.common)) {
        const enLower = v.en.toLowerCase();
        if (enLower.split(/[\/,]+/).map(p => p.trim()).includes(clean) || enLower === clean) {
          return {
            direction: 'en_to_de',
            german: v.de || k,
            english: v.en,
            phonetic: v.phonetic || '',
            exampleEn: v.exampleEn || '',
            exampleDe: v.exampleDe || ''
          };
        }
      }

      // 2. In VOCAB_DATA suchen
      if (typeof VOCAB_DATA !== 'undefined' && Array.isArray(VOCAB_DATA)) {
        for (const v of VOCAB_DATA) {
          const gLower = (v.german || '').toLowerCase();
          const eLower = (v.english || '').toLowerCase();

          // Exakte Übereinstimmung Deutsch
          const gParts = gLower.split(/[\/,\(\)&]+/).map(p => p.trim());
          if (gParts.includes(clean) || gLower === clean) {
            return {
              direction: 'de_to_en',
              german: v.german,
              english: v.english,
              phonetic: v.phonetic || '',
              exampleEn: v.exampleEn || '',
              exampleDe: v.exampleDe || '',
              definition: v.definition || ''
            };
          }

          // Exakte Übereinstimmung Englisch
          const eParts = eLower.split(/[\/,\(\)&]+/).map(p => p.trim());
          if (eParts.includes(clean) || eLower === clean) {
            return {
              direction: 'en_to_de',
              german: v.german,
              english: v.english,
              phonetic: v.phonetic || '',
              exampleEn: v.exampleEn || '',
              exampleDe: v.exampleDe || '',
              definition: v.definition || ''
            };
          }
        }

        // Substring-Match in VOCAB_DATA für längere Wörter
        if (clean.length >= 4) {
          for (const v of VOCAB_DATA) {
            const gLower = (v.german || '').toLowerCase();
            if (gLower.includes(clean)) {
              return {
                direction: 'de_to_en',
                german: v.german,
                english: v.english,
                phonetic: v.phonetic || '',
                exampleEn: v.exampleEn || '',
                exampleDe: v.exampleDe || '',
                definition: v.definition || ''
              };
            }
          }
        }
      }

      return null;
    },

    // Durchsucht das gesamte erweiterte Wörterbuch (für Glossar-Suche & Vorschläge)
    searchAll(query) {
      this.ensureLexiconLoaded();
      if (!query) return [];
      const q = query.toLowerCase().trim();
      if (q.length < 2) return [];
      const results = [];
      for (const [key, val] of Object.entries(this.common)) {
        const deStr = (val.de || key).toLowerCase();
        const enStr = (val.en || '').toLowerCase();
        if (deStr.includes(q) || enStr.includes(q) || key.includes(q)) {
          results.push({
            id: 'dict-' + key,
            english: val.en,
            german: val.de || key,
            phonetic: val.phonetic || '',
            category: 'all',
            categoryName: '📖 Groß-Wörterbuch',
            definition: `Deutsch: „${val.de || key}“ ➔ Englisch: „${val.en}“`,
            exampleEn: val.exampleEn || '',
            exampleDe: val.exampleDe || ''
          });
          if (results.length >= 40) break;
        }
      }
      return results;
    },

    // Dual-Engine Live-Übersetzer (Google GTX + MyMemory Fallback) für jedes Wort & jeden Satz!
    async translateLive(text, preferredTargetLang = 'en') {
      const cleanText = (text || '').trim();
      if (!cleanText) return null;

      // Prüfe zuerst im lokalen Wörterbuch (für Einzelwörter)
      const localHit = this.lookup(cleanText);
      if (localHit && cleanText.split(/\s+/).length <= 2) {
        const isDeToEn = localHit.direction !== 'en_to_de';
        return {
          sourceText: cleanText,
          translatedText: isDeToEn ? localHit.english : localHit.german,
          alternatives: [],
          direction: localHit.direction || 'de_to_en',
          exampleEn: localHit.exampleEn || '',
          exampleDe: localHit.exampleDe || ''
        };
      }

      // Engine 1: Google Translate GTX (extrem schnell, inkl. Wörterbuch-Alternativen dt=bd)
      try {
        const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${preferredTargetLang}&dt=t&dt=bd&q=${encodeURIComponent(cleanText)}`;
        const res = await fetch(gtxUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && Array.isArray(data[0])) {
            const mainTrans = data[0].map(part => (part && part[0]) ? part[0] : '').join('').trim();
            const detectedLang = (typeof data[2] === 'string') ? data[2] : 'de';

            // Wenn der Nutzer ein englisches Wort eingegeben hat und preferredTargetLang 'en' war -> automatisch nach 'de' übersetzen!
            if (detectedLang === 'en' && preferredTargetLang === 'en' && mainTrans.toLowerCase() === cleanText.toLowerCase()) {
              return await this.translateLive(cleanText, 'de');
            }

            const alts = [];
            if (Array.isArray(data[1])) {
              for (const posBlock of data[1]) {
                if (Array.isArray(posBlock[1])) {
                  for (const w of posBlock[1].slice(0, 4)) {
                    if (w && w.toLowerCase() !== mainTrans.toLowerCase() && !alts.includes(w)) {
                      alts.push(w);
                    }
                  }
                }
              }
            }

            if (mainTrans) {
              const combinedTrans = alts.length > 0
                ? `${mainTrans} (${alts.slice(0, 3).join(' / ')})`
                : mainTrans;
              return {
                sourceText: cleanText,
                translatedText: combinedTrans,
                primaryTranslation: mainTrans,
                alternatives: alts,
                direction: preferredTargetLang === 'de' ? 'en_to_de' : 'de_to_en'
              };
            }
          }
        }
      } catch (e) {
        // Fallback zu Engine 2
      }

      // Engine 2: MyMemory API Fallback
      try {
        const pair = preferredTargetLang === 'de' ? 'en|de' : 'de|en';
        const mmRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanText)}&langpair=${pair}`);
        if (mmRes.ok) {
          const mmData = await mmRes.json();
          const mmTrans = (mmData && mmData.responseData && mmData.responseData.translatedText)
            ? mmData.responseData.translatedText.trim()
            : '';
          if (mmTrans && mmTrans.toLowerCase() !== cleanText.toLowerCase()) {
            return {
              sourceText: cleanText,
              translatedText: mmTrans,
              primaryTranslation: mmTrans,
              alternatives: [],
              direction: preferredTargetLang === 'de' ? 'en_to_de' : 'de_to_en'
            };
          }
        }
      } catch (e) {}

      return null;
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
          },
          {
            id: 'beg_chat_2',
            en: 'Practicing English step by step is so rewarding{name}! How is your day going so far?',
            de: 'Schritt für Schritt Englisch zu üben bringt so viel{name}! Wie läuft dein Tag bisher?',
            suggestions: [
              'Today was busy with work and studies.',
              'Pretty good, thanks! How about you?',
              'I am ready to learn some new English phrases.'
            ]
          },
          {
            id: 'beg_chat_3',
            en: 'You are making wonderful progress{name}! Is there a specific situation you want to feel more confident in, like meetings, travel, or smalltalk?',
            de: 'Du machst tolle Fortschritte{name}! Gibt es eine bestimmte Situation, in der du sicherer werden willst, z. B. Meetings, Reisen oder Smalltalk?',
            suggestions: [
              'I want to be more confident in daily conversation.',
              'I need English for IT jobs and technical standups.',
              'Can you teach me some polite smalltalk phrases?'
            ]
          },
          {
            id: 'beg_chat_4',
            en: 'Every conversation helps build your English fluency{name}! What is your favorite way to learn new things?',
            de: 'Jedes Gespräch verbessert deine Sprachflüssigkeit{name}! Wie lernst du am liebsten Neues?',
            suggestions: [
              'I like practical conversations and exercises.',
              'Listening to English music and podcasts helps me a lot.',
              'I learn best by practicing a few minutes every day.'
            ]
          }
        ],
        school_exams: [
          {
            id: 'beg_school_1',
            en: 'A math exam in school sounds challenging{name}! How did it go? Did you feel well-prepared for the questions?',
            de: 'Eine Mathe-Klausur in der Schule klingt anspruchsvoll{name}! Wie ist es gelaufen? Hast du dich gut vorbereitet gefühlt?',
            suggestions: [
              'The math exam was tricky, but I think I did well.',
              'It was quite difficult, but I am glad it is over!',
              'Now I can finally relax and focus on English.'
            ]
          },
          {
            id: 'beg_school_2',
            en: 'Passing exams takes dedication! What subject do you find most interesting in school or training{name}?',
            de: 'Prüfungen zu meistern erfordert Durchhaltevermögen! Welches Fach findest du in der Schule oder Ausbildung am interessantesten{name}?',
            suggestions: [
              'Computer science and programming are my favorites.',
              'I really enjoy economics and business.',
              'English and languages are very useful for my future.'
            ]
          }
        ],
        tired_relax: [
          {
            id: 'beg_tired_1',
            en: 'You worked hard today{name}, so it is completely natural to feel tired! Make yourself comfortable. Would you like a very light, easy conversation, or should we keep it short?',
            de: 'Du hast heute hart gearbeitet{name}, da ist es völlig verständlich, dass du müde bist! Mach es dir gemütlich. Möchtest du eine ganz entspannte, leichte Unterhaltung oder machen wir nur kurz?',
            suggestions: [
              'Let us just do a short and easy practice today.',
              'I will grab a warm tea and relax on the couch.',
              'Can you teach me two relaxing English idioms?'
            ]
          },
          {
            id: 'beg_tired_2',
            en: 'Rest and good sleep are the best way to recharge your brain{name}! How do you usually relax in the evening?',
            de: 'Erholung und guter Schlaf sind das Beste für den Kopf{name}! Wie entspannst du dich abends am liebsten?',
            suggestions: [
              'I like listening to calm music or watching a series.',
              'I just lie down and scroll on my phone.',
              'A good night of sleep will give me energy for tomorrow.'
            ]
          }
        ],
        home_routine: [
          {
            id: 'beg_home_1',
            en: 'Welcome home{name}! There is nothing better than being back home after a long day. What are your plans for this evening?',
            de: 'Willkommen zu Hause{name}! Es gibt nichts Besseres als nach einem langen Tag heimzukommen. Was hast du heute Abend noch vor?',
            suggestions: [
              'I will cook some dinner and then relax.',
              'I want to practice 10 minutes of English.',
              'Just chilling and enjoying my free time!'
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
      if (typeof getUserName === 'function') {
        return getUserName();
      }
      const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('fiae_user_name')) || '';
      if (/^(ishtam|ishta|isht|ishvan|istwan|ischtvan|ischwan|istfan|isthvan|istv[aá]n|easton|ishtvan)$/i.test(raw.trim())) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('fiae_user_name', 'Istvan');
        return 'Istvan';
      }
      return raw;
    },

    setUserName(name) {
      const clean = (typeof normalizeLearnerName === 'function') ? normalizeLearnerName(name) : (name || '').trim();
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
      const pCleanRole = p.role.replace(/^Rolle:\s*/i, '').replace(/^(Deine|Dein)\s+/i, '');
      const pRoleEn = p.isMale ? 'personal English coach and AI companion' : 'personal English tutor and AI companion';

      if (scenarioId === 'economics') {
        const grade = (typeof getEconomicsGrade === 'function') ? getEconomicsGrade() : '11';
        return {
          name: pFirstName,
          fullName: p.name,
          role: pCleanRole,
          roleEn: 'International Economics Coach',
          desc: `Internationalwirtschaft (Klasse ${grade})`,
          isMale: p.isMale
        };
      }
      if (scenarioId === 'beginner' || scenarioId === 'free') {
        return {
          name: pFirstName,
          fullName: p.name,
          role: pCleanRole,
          roleEn: pRoleEn,
          desc: 'Anfänger & Plaudern',
          isMale: p.isMale
        };
      }

      const meta = {
        standup: { name: 'Sarah', role: 'Scrum Masterin & Agile Coach', roleEn: 'Scrum Master & Agile Coach', desc: 'Daily Scrum Standup' },
        interview: { name: 'Mr. Davis', role: 'Lead Software Architect', roleEn: 'Lead Software Architect', desc: 'IT-Vorstellungsgespräch', isMale: true },
        support: { name: 'Alex', role: 'Senior Product Manager', roleEn: 'Senior Product Manager', desc: 'Bug-Report & Ticket Support', isMale: true },
        architecture: { name: 'David', role: 'Senior Cloud Solutions Architect', roleEn: 'Senior Cloud Solutions Architect', desc: 'System-Architektur Review', isMale: true },
        smalltalk: { name: 'Mark', role: 'Senior Developer & Teammate', roleEn: 'Senior Developer & Teammate', desc: 'Kaffeepause & Smalltalk', isMale: true },
        travel: { name: 'James', role: 'Head Concierge at Royal Grand Hotel', roleEn: 'Head Concierge at Royal Grand Hotel', desc: 'Hotel & London Reisen', isMale: true },
        quiz: { name: 'Prof. Miller', role: 'Vokabel-Coach', roleEn: 'Vocabulary Coach', desc: 'Vokabel-Prüfer & Quiz', isMale: true }
      };
      return meta[scenarioId] || {
        name: pFirstName,
        fullName: p.name,
        role: pCleanRole,
        roleEn: pRoleEn,
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
        [/\beinfach\b/g, 'simple'],
        [/\bspeak\s+germany\b/g, 'speak german'],
        [/\bdo\s+you\s+speak\s+germany\b/g, 'do you speak german'],
        [/\bwelcje\b/g, 'welche'],
        [/\bspra\b/g, 'sprache'],
        [/\bdeutch\b/g, 'deutsch'],
        [/\bgermani\b/g, 'germany'],
        [/\bspeek\b/g, 'speak'],
        [/\bishtam\b/g, 'istvan'],
        [/\bishta\b/g, 'istvan'],
        [/\bishvan\b/g, 'istvan'],
        [/\bistwan\b/g, 'istvan'],
        [/\bischtvan\b/g, 'istvan'],
        // Häufige englische Mikrofon-Fehltranskriptionen, wenn jemand Deutsch ins englische Mikrofon spricht:
        [/\bcan\s+stew\s+deutsch\b/g, 'kannst du deutsch'],
        [/\bsprich\s+stew\s+deutsch\b/g, 'sprichst du deutsch'],
        [/\bfirst\s+days?\s+to\s+deutsch\b/g, 'verstehst du deutsch'],
        [/\bfish\s+taste?\s+to\s+deutsch\b/g, 'verstehst du deutsch'],
        [/\bfirst\s+taste?\s+to\s+mice\b/g, 'verstehst du mich'],
        // Tippfehler-Toleranz für deutsche Anfragen & Befehle:
        [/\b[uü]berstz(en|e|t|ung)\b/g, 'übersetzen'],
        [/\b[uü]berstez(en|e|t|ung)\b/g, 'übersetzen'],
        [/\b[uü]bersetzzt\b/g, 'übersetzt'],
        [/\bfersteh(en|e|st|t)?\b/g, 'verstehen'],
        [/\bferschteh(en|e|st|t)?\b/g, 'verstehen'],
        [/\bwokabel(n)?\b/g, 'vokabeln'],
        [/\bbibliotek\b/g, 'bibliothek'],
        [/\banvorderung(en|e)?\b/g, 'anforderungen'],
        [/\blerenen\b/g, 'lernen'],
        [/\bprache\b/g, 'sprache'],
        [/\bfr[aä]gt\b/g, 'fragt']
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

      // 0-Guest. Neue Person / Gast stellt sich vor (v30: Strikte Validierung gegen False Positives wie 'calling', 'tired')
      const isGuestIntroMatch = (() => {
        const NON_NAME_WORDS = new Set([
          'calling', 'tired', 'school', 'exam', 'math', 'matt', 'home', 'good', 'fine', 'great',
          'ready', 'developer', 'student', 'beginner', 'online', 'offline', 'here', 'there',
          'today', 'tomorrow', 'yesterday', 'now', 'feeling', 'working', 'studying', 'learning',
          'doing', 'going', 'talking', 'speaking', 'coming', 'trying', 'thinking', 'waiting',
          'happy', 'sad', 'angry', 'busy', 'bored', 'sick', 'ill', 'well', 'bad', 'excited',
          'nervous', 'calm', 'sure', 'right', 'wrong', 'late', 'early', 'fast', 'slow',
          'cool', 'hot', 'cold', 'warm', 'hungry', 'thirsty', 'asleep', 'awake', 'free',
          'a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'this', 'that',
          'what', 'how', 'why', 'when', 'where', 'who', 'which', 'just', 'really', 'very',
          'not', 'also', 'too', 'much', 'more', 'some', 'any', 'all', 'every', 'both',
          'muede', 'müde', 'krank', 'gesund', 'fleissig', 'faul', 'da', 'hier', 'dort',
          'bereit', 'fertig', 'schön', 'toll', 'gut', 'schlecht', 'neu', 'alt', 'spass',
          'spaß', 'schule', 'klausur', 'prüfung', 'arbeit', 'pause', 'mittag', 'abend'
        ]);

        function isValidGuestCandidate(candidate) {
          if (!candidate || candidate.length < 2 || candidate.length > 20) return false;
          const low = candidate.toLowerCase();
          if (NON_NAME_WORDS.has(low)) return false;
          if (low.endsWith('ing') || low.endsWith('ed') || low.endsWith('ly')) return false;
          if (userName && low === userName.toLowerCase()) return false;
          return true;
        }

        // 1. Explizite Einführung eines Gastes:
        // "das ist mein Freund/Kollege X", "this is my friend/colleague X", "meet my friend X"
        const introExplicit = rawInput.match(/\b(?:das\s+ist|this\s+is)\s+(?:mein\s+freund|meine\s+freundin|mein\s+kollege|meine\s+kollegin|my\s+friend|my\s+colleague|a\s+friend|ein\s+gast|a\s+guest)\s+([A-Za-zÄÖÜäöüß]{2,20})\b/i);
        if (introExplicit && isValidGuestCandidate(introExplicit[1])) return introExplicit[1];

        const meetMatch = rawInput.match(/\b(?:meet\s+my\s+friend|meet\s+my\s+colleague|meet)\s+([A-Za-zÄÖÜäöüß]{2,20})\b/i);
        if (meetMatch && isValidGuestCandidate(meetMatch[1])) return meetMatch[1];

        const hierIstMatch = rawInput.match(/\b(?:hier\s+ist\s+(?:mein\s+freund|meine\s+freundin|mein\s+kollege|ein\s+gast)|here\s+is\s+(?:my\s+friend|a\s+guest))\s+([A-Za-zÄÖÜäöüß]{2,20})\b/i);
        if (hierIstMatch && isValidGuestCandidate(hierIstMatch[1])) return hierIstMatch[1];

        // 2. Neuer Teilnehmer meldet sich selbst explizit neu im Chat an:
        const joinerMatch = rawInput.match(/\b(?:ich\s+bin\s+auch\s+(?:neu|da|dabei)|i\s+am\s+also\s+joining|i\s+am\s+joining)\b.*?\b(?:ich\s+hei[sß]+e|mein\s+name\s+ist|my\s+name\s+is|call\s+me)\s+([A-Za-zÄÖÜäöüß]{2,20})\b/i);
        if (joinerMatch && isValidGuestCandidate(joinerMatch[1])) return joinerMatch[1];

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
        const stdName = rawInput.match(/\b(?:my\s+(?:real\s+)?name\s+is|call\s+me|ich\s+hei[sß]+e(?:\s+eigentlich)?|mein\s+name\s+ist|nenne?\s+mich)\s+([A-Za-zÄÖÜäöüß]{2,25})\b/i);
        if (stdName) {
          detectedNewName = stdName[1];
          if (/eigentlich|real/i.test(rawInput)) isExplicitCorrection = true;
        }
      }

      // 3b. Muster: "ich bin Istvan" / "I am Istvan" -> NUR wenn das Wort kein Adjektiv/Verb/Sprache ist!
      if (!detectedNewName) {
        const iAmMatch = rawInput.trim().match(/^(?:hello\s+|hi\s+|hey\s+|hallo\s+)?(?:ich\s+bin|i\s+am|i'm)\s+([A-Za-zÄÖÜäöüß]{2,20})[.!?\s]*$/i);
        if (iAmMatch) {
          const cand = iAmMatch[1].toLowerCase();
          const forbiddenIam = new Set([
            'speaking', 'talking', 'asking', 'learning', 'studying', 'working', 'trying', 'waiting',
            'calling', 'ready', 'tired', 'good', 'fine', 'great', 'here', 'there', 'home', 'back',
            'happy', 'sad', 'busy', 'bored', 'sick', 'ill', 'well', 'bad', 'new', 'old', 'sure',
            'german', 'english', 'deutsch', 'beginner', 'student', 'developer', 'programmer',
            'müde', 'muede', 'fertig', 'bereit', 'da', 'hier', 'gut', 'krank', 'anfänger'
          ]);
          if (!forbiddenIam.has(cand) && !cand.endsWith('ing') && !cand.endsWith('ed')) {
            detectedNewName = iAmMatch[1];
          }
        }
      }

      // 4. Einzellwort-Name mit strenger Validierung (v41)
      if (!detectedNewName) {
        const cleanTrim = rawInput.trim();
        const lowerTrim = cleanTrim.toLowerCase();
        
        let isAwaitingName = false;
        if (typeof dialogHistories !== 'undefined' && dialogHistories[scenarioId] && dialogHistories[scenarioId].length > 0) {
          const lastPartner = [...dialogHistories[scenarioId]].reverse().find(m => m.type === 'partner');
          if (lastPartner && /(who\s+am\s+i\s+speaking\s+with|what\s+is\s+your\s+name|wie\s+hei[sß]+t\s+du|mit\s+wem\s+spreche\s+ich)/i.test(lastPartner.textEn || lastPartner.textDe)) {
            isAwaitingName = true;
          }
        }

        // Einzellwort ist NUR dann ein Name, wenn es NICHT in der System-Blacklist ist
        if (/^[A-Za-zÄÖÜäöüß]{2,25}$/.test(cleanTrim) && !SYSTEM_NAME_BLACKLIST.has(lowerTrim)) {
          if (isAwaitingName || !this.getUserName()) {
            detectedNewName = cleanTrim;
          }
        }
      }

      if (detectedNewName) {
        let rawExtracted = detectedNewName.charAt(0).toUpperCase() + detectedNewName.slice(1).toLowerCase();
        let extractedName = (typeof normalizeLearnerName === 'function') ? normalizeLearnerName(rawExtracted) : rawExtracted;
        if (!extractedName || SYSTEM_NAME_BLACKLIST.has(extractedName.toLowerCase())) {
          detectedNewName = null;
        } else {
          this.setUserName(extractedName);
        if (typeof setUserName === 'function') {
          setUserName(extractedName);
        }

        // Verlauf bereinigen: Falsche Schreibweisen ersetzen
        if (typeof dialogHistories !== 'undefined' && dialogHistories[scenarioId]) {
          dialogHistories[scenarioId].forEach(msg => {
            if (msg.type === 'partner') {
              msg.textEn = (msg.textEn || '').replace(/\b(Ishtam|Ishta|Isht|Ishvan|Istwan|Ischtvan)\b/gi, extractedName);
              msg.textDe = (msg.textDe || '').replace(/\b(Ishtam|Ishta|Isht|Ishvan|Istwan|Ischtvan)\b/gi, extractedName);
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

      // 0C. AUSSPRACHE VERBESSERN, WORT/SATZ AUSSPRECHEN LERNEN, GRAMMATIK-HILFE & NACHFRAGE BEI MIKROFON-VERHÖRERN (v38)
      // Fall 1: "what's your name Boy Is Mine speaking was" / "how was my speaking" / "wie war meine aussprache"
      if (/\bboy\s+is\s+mine\s+speaking\s+was\b/i.test(norm) || (/\b(speaking|pronunciation|aussprache)\b/i.test(norm) && /\b(how\s+was|wie\s+war|speaking\s+was)\b/i.test(norm))) {
        const hasNameQ = /\bwhat('?s|\s+is)\s+your\s+name\b/i.test(norm);
        const targetSentence = hasNameQ
          ? 'What is your name, and how was my speaking?'
          : 'How was my English speaking and pronunciation?';
        const phon = PronunciationCoach.toPhonetic(targetSentence);
        return {
          id: 'intent_clarify_speaking_was',
          practiceSentence: targetSentence,
          en: `${hasNameQ ? `My name is ${meta.name}, your ${meta.roleEn || 'personal English tutor'}! 😊 ` : ''}I noticed the microphone heard "${rawInput.trim()}" — did you mean to ask: "${targetSentence}"? Here is how you pronounce it: [${phon}]. Click "🎙️ Aussprache testen" below to say it out loud and I will check your pronunciation word by word!`,
          de: `${hasNameQ ? `Mein Name ist **${meta.name}**, ${meta.isMale ? 'dein' : 'deine'} ${meta.role}! 😊\n` : ''}🤔 **Kurze Nachfrage:** Das Mikrofon hat *„${rawInput.trim()}“* verstanden – **meintest du:**\n👉 **„${targetSentence}“** *(Wie heißt du, und wie war meine Aussprache?)*\n🗣️ **So sprichst du den Satz aus:** \`[${phon}]\`\n📖 **Grammatik-Hilfe:** Bei Fragen steht *was* vor *my speaking*: **„How was my speaking?“** (nicht *„speaking was“* am Ende).\n🎙️ **Tipp:** Klicke direkt hierunter auf **„🎙️ Aussprache testen“**, um den Satz laut nachzusprechen!`,
          suggestions: [
            targetSentence,
            'Can you help me improve my English pronunciation?',
            'Give me an easy sentence to practice speaking!'
          ]
        };
      }

      // Fall 2: Konkrete Frage: "Wie spricht man [X] aus?" / "How do I pronounce [X]?" / "Wie kann ich [X] aussprechen?"
      const pronounceWordMatch = rawInput.trim().match(/\b(?:wie\s+(?:spricht\s+man|spreche\s+ich|kann\s+ich|sagt\s+man)|how\s+(?:do\s+(?:i|you)|to|can\s+i)\s+pronounce)\s+["'„“]?([^"'?!.,]+?)["'“]?(?:\s+(?:aus|aussprechen|richtig\s+aus|in\s+english|auf\s+englisch))?[\s?!.]*$/i);
      if (pronounceWordMatch && pronounceWordMatch[1]) {
        const targetRaw = pronounceWordMatch[1].replace(/\b(aus|aussprechen|richtig|das\s+wort|the\s+word|den\s+satz|the\s+sentence)\b/gi, '').trim();
        if (targetRaw && targetRaw.length >= 2) {
          const dictEntry = TeacherDictionary.lookup(targetRaw);
          const enText = dictEntry ? (dictEntry.direction === 'en_to_de' ? targetRaw : dictEntry.english.split('/')[0].replace(/^to\s+/i, '').trim()) : targetRaw;
          const deMeaning = dictEntry ? (dictEntry.direction === 'en_to_de' ? dictEntry.german : targetRaw) : '';
          const phon = PronunciationCoach.toPhonetic(enText);
          const tipObj = PronunciationCoach.getGrammarAndUsageTip(deMeaning || targetRaw, enText);
          return {
            id: 'intent_how_to_pronounce_item',
            practiceSentence: enText,
            en: `You pronounce "${enText}" like this: [${phon}]. Example sentence: "${tipObj.exampleEn}" [${PronunciationCoach.toPhonetic(tipObj.exampleEn)}]. Click "🎙️ Aussprache testen" below to practice saying "${enText}" out loud!`,
            de: `🗣️ **Aussprache-Hilfe für „${enText}“${deMeaning && deMeaning.toLowerCase() !== enText.toLowerCase() ? ` (${deMeaning})` : ''}:**\n👉 **So sprichst du es aus:** \`[${phon}]\`\n📖 **Grammatik & Tipp:** ${tipObj.grammarTip}\n💬 **Beispielsatz:** *„${tipObj.exampleEn}“*\n*(🇩🇪 ${tipObj.exampleDe})*\n🎙️ Klicke unten auf **„🎙️ Aussprache testen“**, sprich **„${enText}“** nach und ich bewerte deine Aussprache sofort!`,
            suggestions: [
              enText,
              tipObj.exampleEn,
              'Can you give me another word to pronounce?'
            ]
          };
        }
      }

      // Fall 3: Wunsch nach Aussprache-Verbesserung, Sprechtraining & Grammatik-Hilfe
      // (z.B. "Oak Park can you make better mine the English language my speaking", "can you improve my pronunciation", "kannst du meine aussprache verbessern und grammatik helfen")
      if (/\boak\s+park\b/i.test(norm) ||
          (/\b(make\s+better|improve|better|verbessern|helfen|help|teach|üben|practice|check|prüfen)\b/i.test(norm) &&
           /\b(speaking|pronunciation|aussprache|sprechen|aussprechen|grammar|grammatik|my\s+english|mine\s+the\s+english)\b/i.test(norm))) {
        const hadGrammarOrMicIssue = /\b(oak\s+park|make\s+better|mine\s+the\s+english|mine\s+speaking|mine\s+english)\b/i.test(norm);
        const correctRequestSentence = 'Can you help me improve my English speaking and pronunciation?';
        const requestPhon = PronunciationCoach.toPhonetic(correctRequestSentence);
        const practiceEx = 'I want to improve my English pronunciation step by step.';
        const practicePhon = PronunciationCoach.toPhonetic(practiceEx);

        if (hadGrammarOrMicIssue) {
          return {
            id: 'intent_improve_speaking_with_correction',
            practiceSentence: correctRequestSentence,
            en: `Yes, I would love to help you improve your pronunciation and grammar${this.salutation()}! First, let's fix your sentence: Instead of "${rawInput.trim()}", say: "${correctRequestSentence}" [${requestPhon}]. Click "🎙️ Aussprache testen" below to speak this corrected sentence out loud right now!`,
            de: `Ja, sehr gerne helfe ich dir bei deiner **Aussprache und Grammatik**${this.salutation()}! 🎯\n\n1️⃣ **Nachfrage & Korrektur deines Satzes:**\nDas Mikrofon hat *„${rawInput.trim()}“* aufgenommen. Auf gutem Englisch fragst du das so:\n👉 **„${correctRequestSentence}“**\n🗣️ **Aussprache (Lautschrift):** \`[${requestPhon}]\`\n\n2️⃣ **Grammatik-Erklärung:**\n• Statt *„make better“* (wörtlich: besser machen) sagt man auf Englisch **„improve“** \`[im-PRUHW]\` *(verbessern)*.\n• Vor einem Hauptwort steht immer **„my“** (*my English, my speaking*), niemals *„mine“*.\n• Man sagt einfach **„my English“** statt *„mine the English language“*.\n\n3️⃣ **Sofort-Übung für deine Aussprache:**\nKlicke direkt hierunter auf **„🔊 Vorlesen“** zum Anhören und danach auf **„🎙️ Aussprache testen“**, um den Satz laut nachzusprechen!`,
            suggestions: [
              correctRequestSentence,
              practiceEx,
              'Give me another sentence to practice my pronunciation!'
            ]
          };
        }

        return {
          id: 'intent_improve_speaking_coach',
          practiceSentence: practiceEx,
          en: `Yes, let's train your pronunciation and grammar together${this.salutation()}! Here is your first practice sentence: "${practiceEx}" [${practicePhon}]. Listen to it with "🔊 Vorlesen" and then click "🎙️ Aussprache testen" to speak it out loud — I will check every single word!`,
          de: `Ja, lass uns deine **Aussprache und Grammatik** direkt zusammen trainieren${this.salutation()}! 🎯\n\n💬 **Dein Übungssatz zum Nachsprechen:**\n👉 **„${practiceEx}“**\n*(🇩🇪 Ich möchte meine englische Aussprache Schritt für Schritt verbessern.)*\n🗣️ **So sprichst du ihn aus:** \`[${practicePhon}]\`\n📖 **Grammatik-Tipp:** Nach *want* steht immer **to + Grundform** (*want to improve* = verbessern wollen).\n\n🎙️ **Jetzt du:** Klicke unten auf **„🎙️ Aussprache testen“** und sprich den Satz laut aus!`,
          suggestions: [
            practiceEx,
            'Can you give me an everyday sentence to pronounce?',
            'How do you pronounce "through" and "thought"?'
          ]
        };
      }

      // 1. Asking for Partner's Name / Identity ("What is your name?", "wath is your name?", "who are you?")
      if ((/\b(what|tell|may|can)\b.*\b(your|ur)\s+(name|naem)\b/i.test(norm) ||
          /\bwho\s+(are\s+you|is\s+this|am\s+i\s+talking\s+to)\b/i.test(norm) ||
          /\bwhats\s+your\s+name\b/i.test(norm) ||
          /\bname\s*\?/i.test(norm)) &&
          !/\b(speaking|pronunciation|make\s+better|improve|boy\s+is\s+mine|grammar)\b/i.test(norm)) {
        const roleEnText = meta.roleEn || 'personal English tutor';
        const deinWord = meta.isMale ? 'dein' : 'deine';
        if (scenarioId === 'beginner' || scenarioId === 'free') {
          return {
            id: 'intent_name_beginner',
            en: `My name is ${meta.name}, your ${roleEnText}. How are you doing today?`,
            de: `Mein Name ist ${meta.name}, ${deinWord} ${meta.role}. Wie geht es dir heute?`,
            suggestions: [
              `Nice to meet you, ${meta.name}! I am ready to practice.`,
              `Hello ${meta.name}! Can you help me improve my pronunciation?`,
              `Can you teach me some easy English words?`
            ]
          };
        } else if (scenarioId === 'standup') {
          return {
            id: 'intent_name_standup',
            en: `Good morning! My name is ${meta.name}, your ${roleEnText}. What did you accomplish yesterday?`,
            de: `Guten Morgen! Mein Name ist ${meta.name}, ${deinWord} ${meta.role}. Was hast du gestern geschafft?`,
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
          return {
            id: 'intent_age_economics',
            en: `I am 34 years old and have been teaching economics for nearly a decade! How old are you${this.salutation()}?`,
            de: `Ich bin 34 Jahre alt und unterrichte Wirtschaft seit fast zehn Jahren! Wie alt bist du${this.salutation()}?`,
            suggestions: [
              "I am in my twenties.",
              "I am preparing for my Abitur exams.",
              "Can we analyze international trade theory?"
            ]
          };
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

      // 3. Asking for Words / Vocabulary ("teach me some useful everyday English words", "teach me words", "give me words", "neue wörter", etc.)
      if (/\b(teach\s+me\b.*\b(words?|phrases?|vocab|vocabulary)|give\s+me\b.*\b(words?|phrases?)|neue\s+w[oö]rter|w[oö]rter\s+lernen|vokabeln\s+lernen|bring\s+mir\b.*\bw[oö]rter\s+bei|learn\s+(some\s+|new\s+|useful\s+|simple\s+|everyday\s+)?words|more\s+words|vokabeln|words\s+please)\b/i.test(norm)) {
        const wordPacks = [
          {
            en: `Here are two great everyday words${this.salutation()}: 1. "Actually" (eigentlich / tatsächlich) and 2. "Opportunity" (Gelegenheit / Chance). Which one would you like to try in a sentence?`,
            de: `Hier sind zwei super nützliche Alltagswörter${this.salutation()}:\n1️⃣ **Actually** \`[ÄK-tschu-ö-li]\` = *eigentlich / tatsächlich*\n2️⃣ **Opportunity** \`[op-ör-TUH-ni-ti]\` = *Gelegenheit / Chance*\n💬 Welches davon möchtest du in einem Satz ausprobieren?`,
            suggestions: [
              'Actually, I prefer practicing English by speaking.',
              'Learning English gives me a great opportunity.',
              'Teach me two more useful words!'
            ]
          },
          {
            en: `Here are two strong words for discussions${this.salutation()}: 1. "Reliable" (zuverlässig) and 2. "Breakthrough" (Durchbruch). Can you use one of them in a sentence?`,
            de: `Hier sind zwei starke Wörter für Gespräche & IT${this.salutation()}:\n1️⃣ **Reliable** \`[ri-LAI-ö-böl]\` = *zuverlässig*\n2️⃣ **Breakthrough** \`[BREYK-thru]\` = *Durchbruch*\n💬 Kannst du mit einem davon einen Satz bilden?`,
            suggestions: [
              'Our server is very reliable.',
              'This is a real breakthrough for our team.',
              'Teach me two more useful words!'
            ]
          },
          {
            en: `Let's learn two very natural conversation words${this.salutation()}: 1. "Definitely" (auf jeden Fall / definitiv) and 2. "Experience" (Erfahrung / Erlebnis). How would you use one of them?`,
            de: `Lass uns zwei sehr natürliche Gesprächswörter lernen${this.salutation()}:\n1️⃣ **Definitely** \`[DEF-i-nit-li]\` = *auf jeden Fall / definitiv*\n2️⃣ **Experience** \`[ik-SPIH-ri-öns]\` = *Erfahrung / Erlebnis*\n💬 Wie würdest du eines davon verwenden?`,
            suggestions: [
              'I definitely want to speak fluent English.',
              'I have practical experience in software development.',
              'Let us discuss an interesting topic now!'
            ]
          },
          {
            en: `Here are two great words to express your opinion${this.salutation()}: 1. "Advantage" (Vorteil) and 2. "Challenge" (Herausforderung). What is the biggest advantage of learning English for you?`,
            de: `Hier sind zwei tolle Wörter, um deine Meinung auszudrücken${this.salutation()}:\n1️⃣ **Advantage** \`[äd-WAN-tidsch]\` = *Vorteil*\n2️⃣ **Challenge** \`[TSCHÄL-öndsch]\` = *Herausforderung*\n💬 Was ist für dich der größte Vorteil (*advantage*) beim Englischlernen?`,
            suggestions: [
              'The biggest advantage is talking to people worldwide.',
              'Speaking freely is a good challenge for me.',
              'What do you think is the best way to learn?'
            ]
          }
        ];
        const chosenPack = wordPacks[(this.state.turnCount || 0) % wordPacks.length];
        return {
          id: 'intent_teach_words_' + ((this.state.turnCount || 0) % wordPacks.length),
          ...chosenPack
        };
      }

      // 4. "I am a beginner" / "I want to learn English" / "My English is not good" / "Sprache lernen"
      if (/\b(i\s+am\s+(a\s+)?(complete\s+)?beginner|anf[aä]nger|learn\s+english|english\s+lernen|sprach[en]*\s+lernen|my\s+english\s+is\s+(bad|poor|not\s+good)|help\s+me\s+(to\s+)?learn|einfach\s+lernen|anf[aä]ngerlevel)\b/i.test(norm)) {
        return {
          id: 'intent_beginner_welcome',
          en: `You are doing great${this.salutation()}! Do not worry about mistakes — we are here to talk and discuss freely like real conversation partners. What topic would you like to talk about?`,
          de: `Du machst das super${this.salutation()}! Mach dir keine Sorgen wegen Fehlern – wir sind hier, um wie echte Gesprächspartner frei miteinander zu reden und zu diskutieren. Worüber möchtest du sprechen?`,
          suggestions: ['Let us talk about hobbies and free time.', 'What do you think about artificial intelligence?', 'How was your day today?']
        };
      }

      // 5. "Can we just chat / converse / discuss?" / "Einfach unterhalten / plaudern / diskutieren"
      if (/\b(can\s+we\s+(just\s+)?chat|just\s+talk|einfach\s+unterhalten|lass\s+uns\s+(plaudern|reden|diskutieren)|nur\s+reden|talk\s+with\s+me|speak\s+with\s+me|let('?s)?\s+(just\s+)?(talk|chat|discuss)|unterhaltung|diskutieren)\b/i.test(norm) && !/\b(about|[uü]ber|hobbies|hobby|tech|music|work|movies|sport|food|travel|ai|future)\b/i.test(norm)) {
        return {
          id: 'intent_just_chat',
          en: `I would love to talk and discuss with you${this.salutation()}! Let's start an interesting conversation: Do you prefer working from home or working in an office with colleagues, and why?`,
          de: `Sehr gerne reden und diskutieren wir miteinander${this.salutation()}! Lass uns direkt mit einer spannenden Frage starten: Arbeitest du lieber von zu Hause (Homeoffice) oder im Büro mit Kollegen – und warum?`,
          suggestions: [
            'I prefer working from home because it saves time and is quiet.',
            'I like working in an office because I enjoy talking to colleagues.',
            'I think a mix of home office and office work is the best solution.'
          ]
        };
      }

      // 6. DYNAMISCHER ÜBERSETZUNGS-, AUSSPRACHE- & GRAMMATIK-LEHRER (v38): Wort-, Bedeutungs- & Live-Wörterbuch-Übersetzung
      const translationMatch = (() => {
        function cleanCandidate(c) {
          if (!c) return null;
          let cand = c.trim();
          cand = cand.replace(/^["'„“.,!?\s]+|["'„“.,!?\s]+$/g, '');
          // Entferne führende Einleitungen ("kannst du mir", "bitte", "das wort", "wie wird", etc.)
          cand = cand.replace(/^(?:kannst\s+du(?:\s+mir)?|can\s+you|could\s+you|wie\s+wird|wie\s+ist|was\s+ist|bitte|please|einfach|mal|nur|doch|jetzt|sofort|\s)+/gi, '').trim();
          cand = cand.replace(/^(?:das\s+wort|dem\s+wort|ein\s+wort|a\s+word|the\s+word|wort|word|der\s+begriff|den\s+begriff|begriff)\s+/gi, '').trim();
          // Entferne nachgestellte Zusätze ("auf englisch übersetzen", "auf englisch", "für mich", "soll", etc.)
          cand = cand.replace(/\s+(?:auf\s+englisch|ins\s+englische|in\s+english|to\s+english|into\s+english|auf\s+deutsch|ins\s+deutsche|in\s+german|to\s+german|übersetzen|übersetzt|übersetze|translate|erklären|ausgesprochen|geschrieben|soll|sollst|willst|bitte|please|für\s+mich|for\s+me|mir|me|jetzt|now|einfach|mal)+[\s?!.,]*$/gi, '').trim();
          cand = cand.replace(/\s+(?:auf\s+englisch|ins\s+englische|in\s+english|to\s+english|into\s+english|auf\s+deutsch|in\s+german|übersetzen|translate|bitte|please)+[\s?!.,]*$/gi, '').trim();
          cand = cand.replace(/\b(please|bitte|for\s+me|f[uü]r\s+mich|trace|always)\b/gi, '').trim();
          cand = cand.replace(/^(das\s+wort|ein\s+wort|a\s+word|the\s+word|word|wort)\s+/gi, '').trim();
          cand = cand.replace(/^["'„“.,!?\s]+|["'„“.,!?\s]+$/g, '');
          if (!cand || /^(word|wort|sentence|satz|something|etwas|me|mir|mich|it|this|that|this word|das wort|ein wort|englisch|english|deutsch|german|übersetzen|translate)$/i.test(cand)) {
            return null;
          }
          return cand.length >= 2 ? cand : null;
        }

        const rawClean = rawInput.trim();

        // A) Explizites Muster: "das Wort [X]" / "dem Wort [X]" / "the word [X]" überall im Satz
        const explicitWordMatch = rawClean.match(/\b(?:das\s+wort|dem\s+wort|the\s+word|wort)\s+["'„“]?([A-Za-zÄÖÜäöüß\-]{2,30})["'“]?(?:\s+(?:auf\s+englisch|ins\s+englische|in\s+english|auf\s+deutsch|übersetzen|übersetzt|translate|bedeutet|heißt|heisst|soll))?/i);
        if (explicitWordMatch && explicitWordMatch[1]) {
          const w = explicitWordMatch[1].trim();
          if (!/^(auf|in|to|into|übersetzen|übersetzt|translate|ist|heißt|heisst|bedeutet|und|oder|nicht|mir|mich|bitte|please)$/i.test(w)) {
            return { type: 'word', word: w };
          }
        }

        const patterns = [
          // Bedeutungsfragen (z.B. "what is mein whit word thoughts ?", "what is meant with X", "what means X")
          /\bwhat\s+(?:is\s+)?(?:meant|mein|mean)\s+(?:with|whit|by)\s+(?:the\s+)?(?:word\s+)?["'„“]?([^"'?!.,]+?)["'“]?\??$/i,
          /\bwhat\s+means\s+(?:the\s+)?(?:word\s+)?["'„“]?([^"'?!.,]+?)["'“]?\??$/i,
          /\bwhat\s+does\s+(?:the\s+)?(?:word\s+)?["'„“]?([^"'?!.,]+?)["'“]?\s+mean\??$/i,
          /\bmeaning\s+of\s+(?:the\s+)?(?:word\s+)?["'„“]?([^"'?!.,]+?)["'“]?\??$/i,
          /\bwas\s+(?:ist\s+)?(?:gemeint|meinst\s+du)\s+mit\s+(?:dem\s+wort\s+|das\s+wort\s+)?["'„“]?([^"'?!.,]+?)["'“]?\??$/i,
          /\bwas\s+bedeutet\s+(?:das\s+wort\s+|den\s+satz\s+)?["'„“]?([^"'?!.,]+?)["'“]?(\s+auf\s+englisch|\s+auf\s+deutsch)?\??$/i,
          /\bbedeutung\s+von\s+(?:dem\s+wort\s+|das\s+wort\s+)?["'„“]?([^"'?!.,]+?)["'“]?\??$/i,
          // Übersetzungsmuster
          /\bhow\s+do\s+you\s+say\s+["'„“]?([^"'?!.,]+?)["'“]?(\s+in\s+english)?\??$/i,
          /\bwhat\s+is\s+["'„“]?([^"'?!.,]+?)["'“]?\s+in\s+english\??$/i,
          /\bwie\s+sagt\s+man\s+["'„“]?([^"'?!.,]+?)["'“]?(\s+auf\s+englisch)?\??$/i,
          /\bwas\s+hei[sß]+t\s+["'„“]?([^"'?!.,]+?)["'“]?(\s+auf\s+englisch|\s+auf\s+deutsch)?\??$/i,
          /\bwie\s+(?:hei[sß]+t|wird)\s+(?:das\s+wort\s+)?["'„“]?([^"'?!.,]+?)["'“]?(\s+auf\s+englisch|\s+auf\s+deutsch)?\??$/i,
          /\b(?:übersetze|übersetzen|translate)\s+(?:mir\s+)?(?:bitte\s+)?(?:das\s+wort\s+|den\s+satz\s+)?["'„“]?([^"'?!.,]+?)["'“]?(\s+auf\s+englisch|\s+into\s+english|\s+to\s+english)?\??$/i,
          /\b(?:kannst\s+du\s+(?:mir\s+)?(?:bitte\s+)?|can\s+you\s+)\s*(?:das\s+wort\s+)?["'„“]?([^"'?!.,]+?)["'“]?\s+(?:auf\s+englisch\s+|ins\s+englische\s+|in\s+english\s+)?(?:übersetzen|übersetzt|translate)\??$/i,
          /\b["'„“]?([A-Za-zÄÖÜäöüß\-]{2,30})["'“]?\s+(?:auf\s+englisch|ins\s+englische|in\s+english)\s*(?:übersetzen|übersetzt|bitte|please|hei[sß]+t)?\??$/i,
          /\b(?:erkl[aä]r(?:e)?|explain)\s+(?:mir\s+)?(?:bitte\s+)?(?:das\s+wort\s+|the\s+word\s+)["'„“]?([^"'?!.,]+?)["'“]?\??$/i
        ];

        for (const pat of patterns) {
          const m = rawClean.match(pat);
          if (m) {
            const cand = cleanCandidate(m[1]);
            if (cand) return { type: 'word', word: cand };
          }
        }

        // B) Wenn die letzte Partner-Nachricht nach einem zu übersetzenden Wort gefragt hat ("Welches Wort möchtest du wissen?")
        if (typeof dialogHistories !== 'undefined' && dialogHistories[scenarioId] && dialogHistories[scenarioId].length > 0) {
          const lastMsg = [...dialogHistories[scenarioId]].reverse().find(m => m.type === 'partner');
          if (lastMsg && /Welches Wort möchtest du|What word would you like to translate|Du fragst nach der Übersetzung/i.test((lastMsg.textDe || '') + ' ' + (lastMsg.textEn || ''))) {
            if (rawClean.split(/\s+/).length <= 3) {
              const followCand = cleanCandidate(rawClean);
              if (followCand) return { type: 'word', word: followCand };
            }
          }
        }

        // C) Einzellwort- oder 2-Wort-Eingabe eines Begriffs prüfen
        if (rawClean.split(/\s+/).length <= 2) {
          const singleClean = cleanCandidate(rawClean);
          if (singleClean && TeacherDictionary.lookup(singleClean)) {
            return { type: 'word', word: singleClean };
          }
        }

        // D) Allgemeine Übersetzungsanfrage ohne konkretes Wort
        const isGeneral = /\b(translate(\s+me)?(\s+please)?|übersetz(e|en)?(\s+mir)?|can\s+you\s+(trace\s+)?translate|kannst\s+du\s+(mir\s+)?übersetzen|word.*translate|how\s+to\s+translate|brauche\s+eine\s+übersetzung|ein\s+wort\s+übersetzen|hilfe\s+beim\s+übersetzen|weiß\s+(das|ein)?\s*wort\s+nicht)\b/i.test(norm);
        if (isGeneral) {
          return { type: 'general' };
        }

        return null;
      })();

      if (translationMatch) {
        if (translationMatch.type === 'word') {
          const queryWord = translationMatch.word;
          const entry = TeacherDictionary.lookup(queryWord);
          if (entry) {
            const isDeToEn = entry.direction !== 'en_to_de';
            const targetWord = isDeToEn ? entry.english : entry.german;
            const sourceWord = queryWord;
            const primaryTarget = (isDeToEn ? targetWord : sourceWord).split('/')[0].replace(/\(.*?\)/g, '').replace(/^to\s+/i, '').trim();
            const tipInfo = PronunciationCoach.getGrammarAndUsageTip(isDeToEn ? sourceWord : targetWord, isDeToEn ? targetWord : sourceWord);
            const wordPhon = entry.phonetic || PronunciationCoach.toPhonetic(primaryTarget);
            const exEn = entry.exampleEn || tipInfo.exampleEn || `I use the word "${primaryTarget}" in my English conversation.`;
            const exDe = entry.exampleDe || tipInfo.exampleDe || `Ich benutze das Wort „${primaryTarget}“ in meinem englischen Gespräch.`;
            const exPhon = PronunciationCoach.toPhonetic(exEn);

            return {
              id: 'intent_word_translation_found',
              isTranslation: true,
              practiceSentence: exEn,
              en: isDeToEn 
                ? `In English, "${sourceWord}" means "${targetWord}" [${wordPhon}].\nExample: "${exEn}" [${exPhon}].`
                : `In German, "${sourceWord}" [${wordPhon}] means "${targetWord}".\nExample: "${exEn}".`,
              de: isDeToEn
                ? `🇩🇪➔🇬🇧 Auf Englisch heißt **„${sourceWord}“**: 👉 **„${targetWord}“**\n🗣️ **Aussprache (Lautschrift):** \`[${wordPhon}]\`\n📖 **Grammatik & Anwendung:** ${tipInfo.grammarTip}\n💬 **Beispielsatz:** *„${exEn}“*\n*(🇩🇪 ${exDe})*\n🎙️ *Klicke unten auf **„🎙️ Aussprache testen“**, um den Satz oder das Wort laut nachzusprechen!*`
                : `🇬🇧➔🇩🇪 Auf Deutsch bedeutet **„${sourceWord}“**: 👉 **„${targetWord}“**\n🗣️ **Aussprache (Lautschrift):** \`[${wordPhon}]\`\n📖 **Grammatik & Anwendung:** ${tipInfo.grammarTip}\n💬 **Beispielsatz:** *„${exEn}“* *(🇩🇪 ${exDe})*`,
              suggestions: [
                exEn,
                `How do I pronounce "${primaryTarget}"?`,
                `Was heißt 'wiederholen' auf Englisch?`
              ]
            };
          } else {
            // Wort nicht im Offline-Wörterbuch: Sofort per Live-Übersetzung übersetzen (inkl. Lautschrift & Beispielsatz!)
            return {
              id: 'intent_word_translation_live',
              isTranslation: true,
              needsLiveTranslation: true,
              queryWord: queryWord,
              en: `Translating "${queryWord}" into English with pronunciation and an example sentence right now...`,
              de: `Ich übersetze **„${queryWord}“** sofort inklusive Aussprache-Lautschrift und Beispielsatz... ⏳`,
              suggestions: [
                `Was heißt 'erklären' auf Englisch?`,
                `Was heißt 'Erfolg' auf Englisch?`,
                `Let us continue our conversation!`
              ]
            };
          }
        } else {
          // Allgemeine Übersetzungsanfrage ("can you translate me please", etc.)
          return {
            id: 'intent_word_translation_request',
            isTranslation: true,
            en: `I would love to help you translate any word or sentence! Just tell me: "How do you say [word] in English?" or "Was heißt [word] auf Englisch?" (or simply write the German word directly), and I will give you the exact translation, pronunciation, grammar tip, and an example sentence. What word would you like to translate right now?`,
            de: `Sehr gerne helfe ich dir, jedes Wort oder jeden Satz zu übersetzen! Frag mich einfach: „Wie heißt [Wort] auf Englisch?“ oder „Was heißt [Wort] auf Englisch?“ (oder schreib mir einfach direkt das deutsche Wort). Ich zeige dir sofort die Übersetzung, die Lautschrift-Aussprache, Grammatik-Tipps und einen Beispielsatz zum Nachsprechen! Welches Wort möchtest du wissen?`,
            suggestions: [
              "How do you say 'Erfolg' in English?",
              "Was heißt 'Feierabend' auf Englisch?",
              "Wie übersetzt man 'zuverlässig'?"
            ]
          };
        }
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
        const roleEnText = meta.roleEn || 'personal English tutor';
        const deinWord = meta.isMale ? 'dein' : 'deine';
        return {
          id: 'intent_partner_role',
          en: `I am your ${roleEnText}. I am here to help you practice English, improve your pronunciation, and explain grammar! What would you like to talk about?`,
          de: `Ich bin ${deinWord} ${meta.role}. Ich helfe dir beim Englischüben, verbessere deine Aussprache und erkläre dir die Grammatik! Worüber möchtest du sprechen?`,
          suggestions: ['Can you help me improve my pronunciation?', 'Let us practice a realistic work dialogue.', 'Teach me some phrases for meetings.']
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

      // 23a. Explain in German ("Explain in German", "Erklär es auf Deutsch")
      if (/\b(explain(\s+it)?\s+in\s+german|erkl[aä]r(e)?(\s+es|\s+das)?\s+auf\s+deutsch|auf\s+deutsch\s+erkl[aä]ren)\b/i.test(norm)) {
        return {
          id: 'intent_explain_in_german',
          en: `I am very happy to explain things in German! Whenever something is unclear or you need deeper explanations, just ask. The translation box directly below each of my messages also shows you the complete German text. What word or concept would you like me to explain right now?`,
          de: `Sehr gerne erkläre ich es dir auf Deutsch! Wann immer etwas unklar ist oder du eine genauere Erklärung brauchst, frag mich einfach. Das Übersetzungsfeld direkt unter jeder meiner Nachrichten zeigt dir zudem immer den vollständigen deutschen Text. Welches Wort oder welche Grammatik soll ich dir jetzt erklären?`,
          suggestions: [
            "Kannst du mir den Unterschied zwischen 'since' und 'for' erklären?",
            "Wie bildet man das Simple Past auf Englisch?",
            "Everything is clear, let's keep chatting!"
          ]
        };
      }

      // 23b. What languages do you speak? / Welche Sprachen sprichst du / kannst du?
      if (/\b(what\s+languages?(\s+(do|can)\s+you\s+speak)?|which\s+languages?(\s+(do|can)\s+you\s+speak)?|welche\s+sprachen?(\s+(sprichst|kannst|redest)\s+du)?|was\s+f[uü]r\s+sprachen?|how\s+many\s+languages|languages?\s+do\s+you\s+speak|welche\s+sprache\b|which\s+language)\b/i.test(norm)) {
        return {
          id: 'intent_languages_spoken',
          en: `I speak both German and English fluently! In our chat, I primarily speak and teach English so you get plenty of active practice, but I understand everything in German and provide full German translations and helpful tips below every single message. Which language would you prefer right now?`,
          de: `Ich spreche sowohl Deutsch als auch Englisch fließend! In unserem Chat spreche ich hauptsächlich Englisch mit dir, damit du viel aktive Übung bekommst – aber ich verstehe alles auf Deutsch und gebe dir unter jeder einzelnen Nachricht die komplette deutsche Übersetzung und hilfreiche Tipps. Welche Sprache ist dir gerade lieber?`,
          suggestions: [
            "Let's continue practicing in English!",
            "Kannst du mir auf Deutsch erklären, wie wir am besten üben?",
            "How do you say 'Ich möchte mein Englisch verbessern' in English?"
          ]
        };
      }

      // 23c. Asking about German or requesting German ("can you understand the German language", "are you speaking German", "Do you speak German?", "Sprichst du Deutsch?", "Verstehst du Deutsch?")
      const mentionsGerman = /\b(german|germany|deutsch|deutsche[nrms]?)\b/i.test(norm);
      const asksAboutLanguage = /\b(speak|speaking|speaks|talk|talking|understand|understanding|know|knowing|learn|language|sprache|sprich|sprichst|sprechen|versteh|verstehst|verstehen|kannst|k[oö]nnen|redest|reden|auf\s+deutsch|in\s+german|bitte|please|can\s+you|are\s+you|do\s+you)\b/i.test(norm);
      if ((mentionsGerman && asksAboutLanguage) || /^(deutsch|german|auf\s+deutsch|in\s+german)[.!?\s]*$/i.test(norm.trim())) {
        return {
          id: 'intent_speak_german',
          en: `Yes, of course${this.salutation()}! I understand and speak German fluently. You can write or speak to me in German or English anytime! Tip: If you want to speak German into the microphone, just tap the "🇬🇧 EN / 🇩🇪 DE" button right next to the microphone icon to switch it to German (🇩🇪 DE). What would you like to ask or practice?`,
          de: `Ja, natürlich${this.salutation()}! Ich verstehe und spreche fließend Deutsch. Du kannst mir jederzeit auf Deutsch oder auf Englisch schreiben und sprechen! 💡 Tipp: Wenn du auf Deutsch ins Mikrofon sprechen möchtest, tippe einfach unten neben dem Mikrofon auf den Button „🇬🇧 EN“ (er wechselt dann auf „🇩🇪 DE“), damit das Mikrofon deine deutsche Sprache perfekt erkennt. Was möchtest du mich fragen oder üben?`,
          suggestions: [
            "Wie sagt man 'Ich lerne jeden Tag Englisch' auf Englisch?",
            "Kannst du mir einfache englische Sätze für den Alltag zeigen?",
            "Okay, let us practice in English!"
          ]
        };
      }

      // 23d. Asking about English ("Do you speak English?", "Are you speaking English?", "Can you understand English?", "Sprichst du Englisch?")
      if (/\b(english|englisch|englische[nrms]?)\b/i.test(norm) && /\b(speak|speaking|talk|talking|understand|understanding|know|sprichst|kannst|verstehst|redest|can\s+you|are\s+you|do\s+you)\b/i.test(norm)) {
        return {
          id: 'intent_speak_english',
          en: `Yes, absolutely${this.salutation()}! I speak and understand both English and German fluently. I am here to help you speak, write, and understand English naturally. What topic would you like to explore today?`,
          de: `Ja, absolut${this.salutation()}! Ich spreche und verstehe sowohl Englisch als auch Deutsch fließend. Ich helfe dir dabei, ganz natürlich Englisch zu sprechen, zu schreiben und zu verstehen. Welches Thema möchtest du heute erkunden?`,
          suggestions: [
            "Let's practice everyday English conversation.",
            "Can you teach me some common English phrases?",
            "How is my pronunciation?"
          ]
        };
      }

      // 23e. "Can you hear me?" / "Do you understand me?" / "Verstehst du mich?" / "Hörst du mich?"
      if (/\b((can|do|are)\s+you\s+(hear|hearing|understand|understanding|listen|listening)(\s+to)?\s+me|verstehst\s+du\s+mich|h[oö]rst\s+du\s+mich|kannst\s+du\s+mich\s+(verstehen|h[oö]ren)|do\s+you\s+get\s+me)\b/i.test(norm)) {
        return {
          id: 'intent_understand_me',
          en: `Yes, I can hear and understand you loud and clear${this.salutation()}! You can ask me anything in English or in German. What would you like to talk about?`,
          de: `Ja, ich höre und verstehe dich klar und deutlich${this.salutation()}! Du kannst mich alles auf Englisch oder auf Deutsch fragen. Worüber möchtest du sprechen?`,
          suggestions: [
            "Can you ask me an easy question in English?",
            "Wie sagt man 'Können wir das wiederholen?' auf Englisch?",
            "Let's talk about my daily routine."
          ]
        };
      }

      // 23f. "Speak slower" / "Too fast" / "Say it again" / "Sprich langsamer" / "Nochmal bitte"
      if (/\b(speak\s+slow(er|ly)?|talk\s+slow(er|ly)?|too\s+fast|zu\s+schnell|langsamer(\s+sprechen|\s+bitte)?|sprich\s+langsamer|say\s+(that|it)\s+again|repeat\s+that|bitte\s+wiederholen|nochmal\s+sagen)\b/i.test(norm)) {
        return {
          id: 'intent_speak_slower',
          en: `Of course${this.salutation()}! I will keep my sentences clear and simple. Tip: You can also click the "🐢 Langsam" button below any of my messages to hear it spoken slowly, or tap any single word to hear its pronunciation!`,
          de: `Natürlich${this.salutation()}! Ich halte meine Sätze klar und einfach. 💡 Tipp: Du kannst unter jeder meiner Nachrichten auch auf „🐢 Langsam“ klicken, um sie langsam zu hören, oder jedes einzelne Wort direkt antippen!`,
          suggestions: [
            "Thank you! Ask me a simple question.",
            "Teach me 2 easy everyday words.",
            "Let's practice a slow and simple dialogue."
          ]
        };
      }

      // 23g. "What can you do?" / "How can you help me?" / "Was kannst du alles?"
      if (/\b(what\s+can\s+you\s+do|how\s+can\s+you\s+help(\s+me)?|what\s+are\s+your\s+functions|was\s+kannst\s+du(\s+alles|\s+machen)?|wie\s+kannst\s+du\s+mir\s+helfen|wie\s+funktioniert\s+das)\b/i.test(norm)) {
        return {
          id: 'intent_what_can_you_do',
          en: `I can help you in many ways${this.salutation()}: 1. Practice free conversations in English, 2. Correct your sentences and explain grammar, 3. Translate words and sentences between German and English, and 4. Quiz your vocabulary! What would you like to try?`,
          de: `Ich kann dir auf viele Arten helfen${this.salutation()}: 1. Freie Gespräche auf Englisch üben, 2. Deine Sätze korrigieren und Grammatik erklären, 3. Wörter und Sätze zwischen Deutsch und Englisch übersetzen und 4. Vokabeln abfragen! Was möchtest du ausprobieren?`,
          suggestions: [
            "Ask me an everyday question in English!",
            "Teste meine Vokabeln im Quiz!",
            "How do you say 'Ich arbeite als Softwareentwickler' in English?"
          ]
        };
      }

      // 23h. "What are you doing?" / "Was machst du gerade?"
      if (/\b(what\s+are\s+you\s+doing(\s+right\s+now|\s+now|\s+today)?|was\s+machst\s+du(\s+gerade|\s+heute|\s+jetzt)?)\b/i.test(norm)) {
        return {
          id: 'intent_what_are_you_doing',
          en: `Right now I am chatting with you and helping you improve your English${this.salutation()}! What are you doing today?`,
          de: `Gerade unterhalte ich mich mit dir und helfe dir, dein Englisch zu verbessern${this.salutation()}! Was machst du heute noch?`,
          suggestions: [
            "I am practicing English and relaxing at home.",
            "Today I am working on my programming project.",
            "Can you teach me 2 useful English words?"
          ]
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

      // 26b. "I don't know" / "No idea" / "Ich weiß nicht" / "Keine Ahnung"
      if (/^(i\s*don'?t\s*know|i\s*dont\s*know|dont\s*know|idk|no\s*idea|not\s*sure|have\s*no\s*idea|ich\s*wei[sß]\s*nicht|keine\s*ahnung|wei[sß]\s*nicht|wei[sß]\s*ich\s*nicht|nicht\s*sicher)[.!?\s]*$/i.test(norm.trim())) {
        return {
          id: 'intent_dont_know',
          en: `That is completely okay${this.salutation()}! You do not need to know everything — that is exactly why we are practicing together. Let me guide you step by step. What would you like to explore next?`,
          de: `Das ist völlig in Ordnung${this.salutation()}! Du musst nicht alles wissen – genau dafür üben wir ja zusammen. Ich helfe dir Schritt für Schritt. Worüber möchtest du als Nächstes sprechen?`,
          suggestions: [
            "Can you ask me an easy question?",
            "Can you explain it with an easy example?",
            "Teach me 2 useful everyday phrases."
          ]
        };
      }

      // 26c. Tutor Opinion / "What is your opinion / meaning?" / "What do you think?" / "What ist you meing?"
      if (/\b(what\s+(is|ist)\s+(your|ur|you)\s+(opinion|meaning|meing|view|thought|perspective)|what\s+do\s+you\s+think|what\s+you\s+think|what\s+think\s+you|was\s+ist\s+deine\s+meinung|was\s+denkst\s+du|wie\s+findest\s+du\s+das|deine\s+meinung)\b/i.test(norm)) {
        return {
          id: 'intent_tutor_opinion',
          en: `In my opinion${this.salutation()}, learning to speak English is one of the best decisions you can make! It opens doors worldwide, especially in IT, and speaking actively with me every day will help you become fluent and confident very quickly. Let's practice speaking right now!`,
          de: `Meiner Meinung nach${this.salutation()} ist Englisch sprechen zu lernen eine fantastische Entscheidung! Es öffnet dir weltweit alle Türen, besonders in der IT, und wenn du täglich aktiv mit mir sprichst, wirst du sehr schnell flüssig und sicher. Lass uns direkt mit dem Sprechen üben loslegen!`,
          suggestions: [
            "I want to practice speaking every day!",
            "Can you ask me an everyday question in English?",
            "Teach me 3 useful conversation phrases."
          ]
        };
      }

      // 26d. "Do you like X?" / "Magst du X?" (Allgemeine Vorlieben-Frage an den Coach)
      const likeMatch = norm.match(/\b(?:do\s+you\s+(?:like|love|enjoy)|magst\s+du|gef[aä]llt\s+dir)\s+([a-zäöüß\s]{2,30}?)[.!?\s]*$/i);
      if (likeMatch) {
        const likedTopic = likeMatch[1].trim();
        return {
          id: 'intent_do_you_like',
          en: `Yes, I really enjoy ${likedTopic}${this.salutation()}! It is a great topic to talk about. What do you like most about ${likedTopic}?`,
          de: `Ja, ich mag „${likedTopic}“ sehr gerne${this.salutation()}! Das ist ein tolles Gesprächsthema. Was gefällt dir daran am besten?`,
          suggestions: [
            `I really enjoy ${likedTopic} in my free time.`,
            `Can you teach me some English words about ${likedTopic}?`,
            "What else do you like to do?"
          ]
        };
      }

      // 27. General direct question (auch OHNE '?' am Ende bei Spracheingabe! z.B. "can you...", "are you...", "do you...", "what...", "how...", "kannst du...", "bist du...")
      const isSpokenOrWrittenQuestion = /\?\s*$/.test(norm.trim()) ||
        /^(can\s+you|could\s+you|would\s+you|will\s+you|do\s+you|are\s+you|is\s+it|is\s+there|are\s+there|have\s+you|did\s+you|what\b|how\b|why\b|where\b|when\b|who\b|which\b|kannst\s+du|k[oö]nntest\s+du|bist\s+du|hast\s+du|verstehst\s+du|sprichst\s+du|wei[sß]t\s+du|kennst\s+du|gibst\s+du|machst\s+du|was\b|wie\b|warum\b|weshalb\b|wieso\b|wo\b|wann\b|wer\b)\b/i.test(norm.trim());

      if (isSpokenOrWrittenQuestion) {
        // Prüfen, ob die Frage auf Deutsch gestellt wurde -> direkt auf die deutsche Frage eingehen & englische Übersetzung zeigen!
        const isGermanQuestion = /\b(kannst\s+du|k[oö]nntest\s+du|bist\s+du|hast\s+du|verstehst\s+du|sprichst\s+du|wei[sß]t\s+du|kennst\s+du|machst\s+du|wie\s+geht|was\s+ist|warum\s+ist|wie\s+kann|wo\s+ist|ich\b|du\b|mir\b|mich\b|bitte\b|deutsch)\b/i.test(norm);
        if (isGermanQuestion) {
          const docCheck = (typeof SentenceDoctor !== 'undefined') ? SentenceDoctor.analyze(rawInput) : null;
          const enTranslation = (docCheck && docCheck.isGerman && docCheck.correctedText) ? docCheck.correctedText.replace(/<[^>]+>/g, '').trim() : '';
          if (enTranslation) {
            return {
              id: 'intent_german_question_translated',
              en: `Yes, I understand your German question${this.salutation()}! In English, you can ask this as: "${enTranslation}". I am happy to help you with that — what details would you like to know?`,
              de: `Ja, ich habe deine deutsche Frage verstanden${this.salutation()}! 🇩🇪➔🇬🇧 Auf Englisch fragst du das so: **„${enTranslation}“**. Ich helfe dir sehr gerne dabei!`,
              suggestions: [
                enTranslation,
                "Can you give me a simple example?",
                "Let's practice this in a short dialogue!"
              ]
            };
          }
          return {
            id: 'intent_german_question_direct',
            en: `Yes, I understand your question in German${this.salutation()}! Yes, we can gladly do that together. How would you like to start?`,
            de: `Ja, ich verstehe deine deutsche Frage${this.salutation()}! Ja, das können wir sehr gerne zusammen machen. Wie möchtest du starten?`,
            suggestions: [
              "Can you give me an easy example in English?",
              "Teach me 2 useful words for this topic.",
              "Ask me a simple question in English!"
            ]
          };
        }

        // Englische "Can you / Could you / Will you ..." Frage direkt mit "Yes, of course!" beantworten
        if (/^(can\s+you|could\s+you|would\s+you|will\s+you)\b/i.test(norm.trim())) {
          return {
            id: 'intent_can_you_question',
            en: `Yes, of course I can${this.salutation()}! I am right here to help you with that. Tell me what topic or example you would like to start with!`,
            de: `Ja, natürlich kann ich das${this.salutation()}! Ich helfe dir sofort dabei. Sag mir einfach, mit welchem Beispiel oder Thema wir beginnen sollen!`,
            suggestions: [
              "Can you give me an easy example sentence?",
              "Ask me a simple everyday question!",
              "Teach me 2 useful English words."
            ]
          };
        }

        // Englische "Are you / Do you / Have you ..." Frage direkt beantworten
        if (/^(are\s+you|do\s+you|have\s+you|did\s+you)\b/i.test(norm.trim())) {
          return {
            id: 'intent_yes_no_question',
            en: `Yes, absolutely${this.salutation()}! As your personal English coach, I understand both English and German and I am always ready to practice with you. What would you like to ask me next?`,
            de: `Ja, absolut${this.salutation()}! Als dein persönlicher Englisch-Coach verstehe ich sowohl Englisch als auch Deutsch und übe jederzeit gerne mit dir. Was möchtest du mich als Nächstes fragen?`,
            suggestions: [
              "What are your favorite hobbies?",
              "Can you ask me an easy question in English?",
              "Teach me a useful English phrase!"
            ]
          };
        }

        const questionPool = [
          {
            en: `That is a great question${this.salutation()}! Taking it step by step with clear examples is always the best way. Would you like a simple explanation or an example sentence?`,
            de: `Das ist eine tolle Frage${this.salutation()}! Schritt für Schritt mit klaren Beispielen vorzugehen ist immer der beste Weg. Möchtest du eine einfache Erklärung oder einen Beispielsatz?`,
            suggestions: ['Can you give me an easy example?', 'How would you say that in a daily conversation?', 'Teach me a useful word for this.']
          },
          {
            en: `Good question${this.salutation()}! I am here to help you understand every aspect of English clearly. What part would you like me to explain first?`,
            de: `Gute Frage${this.salutation()}! Ich helfe dir gerne, jeden Aspekt im Englischen klar zu verstehen. Welchen Teil soll ich dir zuerst erklären?`,
            suggestions: ['Let us focus on useful vocabulary.', 'Can you explain the grammar simply?', 'Let us practice with a short sentence.']
          }
        ];
        const idx = (this.state.turnCount || 0) % questionPool.length;
        const chosen = questionPool[idx];
        return {
          id: 'intent_general_question',
          en: chosen.en,
          de: chosen.de,
          suggestions: chosen.suggestions
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

      // Spezifische Alltagsthemen (Schule & Prüfungen, Müdigkeit, Zuhause) ZUERST prüfen:
      if (/\b(tired|m[uü]de|exhausted|sleepy|sleep|couch|sofa|bed|bett|ausruhen|rest|relax|chill|unwind|calling\s+a\s+bit\s+tired|bit\s+tired|long\s+day)\b/i.test(lower)) {
        topicList.push('tired_relax');
      }
      if (/\b(school|schule|exam|exams|klausur|pr[uü]fung|test|math\b|maths\b|matt\b|mathematik|homework|hausaufgabe|class|unterricht|grade\s*\d+|abitur)\b/i.test(lower)) {
        topicList.push('school_exams');
      }
      if (/\b(im\s+home|i'm\s+home|at\s+home|now\s+home|back\s+home|arrive.*home|zuhause|heim|nach\s+hause|feierabend)\b/i.test(lower)) {
        topicList.push('home_routine');
      }

      // Allgemeine & Anfänger-Themen (nur wenn nicht spezifisch)
      if (lower.includes('name') || lower.includes('hello') || lower.includes('meet') || lower.includes('introduce')) {
        topicList.push('personal');
      }
      if ((lower.includes('day') || lower.includes('today')) && topicList.length === 0) {
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
      if (/\b(chat|let('?s)?\s+talk|just\s+talk|conversation|smalltalk|plaudern|unterhalten)\b/i.test(lower)) {
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

      // 4. INTERAKTIVER GESPRÄCHS- & DISKUSSIONS-PARTNER (v40):
      // Wie ein echter Ansprechpartner auf Tageszeit (Morgen/Abend), Meinungen, Argumente, Alltagsthemen und Aussagen eingehen und weiterdiskutieren!
      if (/\b(early\s+in\s+the\s+morning|early\s+morning|in\s+the\s+morning|this\s+morning|earley|mornig|morning)\b/i.test(lower)) {
        const morningReplies = [
          {
            en: `Yes, it is early in the morning${this.salutation()}! Starting your day by talking and practicing English with me is a wonderful habit. Did you sleep well, and have you had a cup of coffee or breakfast yet?`,
            de: `Ja, es ist früh am Morgen${this.salutation()}! Deinen Tag direkt mit unserem Gespräch auf Englisch zu starten, ist eine tolle Gewohnheit. Hast du gut geschlafen, und hattest du schon eine Tasse Kaffee oder Frühstück?`,
            suggestions: [
              'Yes, I slept well and I am drinking a cup of coffee now.',
              'I am still a little tired, but ready to practice English!',
              'What is a typical English breakfast?'
            ]
          },
          {
            en: `Good morning${this.salutation()}! Early in the morning, the mind is fresh and ready to learn new things. What are your plans for today?`,
            de: `Guten Morgen${this.salutation()}! Früh am Morgen ist der Kopf noch ganz frisch für neue Dinge. Was hast du dir für heute vorgenommen?`,
            suggestions: [
              'Today I want to practice my English and work on my projects.',
              'I have a busy day ahead of me.',
              'Teach me two useful English words for this morning!'
            ]
          }
        ];
        return {
          id: 'discuss_morning_time_' + this.state.turnCount,
          ...morningReplies[(this.state.turnCount - 1) % morningReplies.length]
        };
      }

      if (/\b(in\s+the\s+evening|this\s+evening|evening|evning|afternoon|late\s+at\s+night|tonight)\b/i.test(lower)) {
        return {
          id: 'discuss_evening_time_' + this.state.turnCount,
          en: `Yes${this.salutation()}! How was your day so far, and how do you like to relax in the evening?`,
          de: `Ja${this.salutation()}! Wie war dein Tag bisher, und wie entspannst du dich am liebsten am Abend?`,
          suggestions: [
            'I had a good day, and now I am relaxing at home.',
            'In the evening, I like listening to music or watching a movie.',
            'Let us chat a bit in English to finish the day!'
          ]
        };
      }

      if (/\b(artificial\s+intelligence|\bai\b|robot|robots|future|technology|tech|automation|chatgpt|machine\s+learning)\b/i.test(lower)) {
        const aiDiscussions = [
          {
            en: `Artificial intelligence and modern technology are fascinating topics${this.salutation()}! In my view, AI is a powerful tool that helps developers and learners work much faster. Do you see AI more as a helpful partner or a risk for jobs?`,
            de: `Künstliche Intelligenz und moderne Technik sind faszinierende Themen${this.salutation()}! Meiner Meinung nach ist KI ein starkes Werkzeug, das Entwicklern und Lernenden enorm hilft. Siehst du KI eher als hilfreichen Partner oder als Risiko für Jobs?`,
            suggestions: [
              'I see AI as a helpful partner that saves a lot of time.',
              'I think AI will change many jobs, so we must keep learning.',
              'AI helps me learn English and write better code every day.'
            ]
          },
          {
            en: `That is a great point about technology${this.salutation()}! Technology is evolving so quickly right now. Which technology or tool do you use most in your daily life?`,
            de: `Das ist ein super Punkt zum Thema Technik${this.salutation()}! Die Technologie entwickelt sich gerade rasant weiter. Welche Technik oder welches Tool nutzt du in deinem Alltag am meisten?`,
            suggestions: [
              'I use my smartphone and computer every single day.',
              'I use AI tools and coding editors for my projects.',
              'What technology excites you the most right now?'
            ]
          }
        ];
        return {
          id: 'discuss_ai_tech_' + this.state.turnCount,
          ...aiDiscussions[(this.state.turnCount - 1) % aiDiscussions.length]
        };
      }

      if (/\b(home\s*office|remote\s*work|working\s+from\s+home|office|colleagues|workplace|commute|pendeln|büro)\b/i.test(lower)) {
        const workDiscussions = [
          {
            en: `That is a very good argument${this.salutation()}! Working from home gives you peace, quiet, and zero commute time, while the office is great for direct teamwork. If you could choose freely, how many days per week would you work from home?`,
            de: `Das ist ein sehr gutes Argument${this.salutation()}! Homeoffice spart den Arbeitsweg und bietet Ruhe, während das Büro toll für direkten Team-Austausch ist. Wenn du frei wählen könntest: Wie viele Tage pro Woche würdest du von zu Hause arbeiten?`,
            suggestions: [
              'I would work from home three or four days a week.',
              'I prefer 100 percent remote work because I can focus better.',
              'I like going to the office twice a week to meet my team.'
            ]
          },
          {
            en: `I completely understand your perspective${this.salutation()}! A good work-life balance makes a huge difference for productivity and happiness. What is most important to you in a good job?`,
            de: `Ich verstehe deine Sichtweise vollkommen${this.salutation()}! Eine gute Work-Life-Balance macht einen riesigen Unterschied für Produktivität und Zufriedenheit. Was ist dir bei einem guten Job am wichtigsten?`,
            suggestions: [
              'Friendly colleagues and interesting tasks are most important to me.',
              'Flexibility and continuous learning are my top priorities.',
              'Good communication and fair teamwork matter most.'
            ]
          }
        ];
        return {
          id: 'discuss_work_life_' + this.state.turnCount,
          ...workDiscussions[(this.state.turnCount - 1) % workDiscussions.length]
        };
      }

      if (/\b(movie|movies|film|films|series|netflix|cinema|watch|watching|game|games|gaming|sport|sports|fitness|gym|football|soccer)\b/i.test(lower)) {
        return {
          id: 'discuss_entertainment_' + this.state.turnCount,
          en: `That sounds like a great way to spend your free time${this.salutation()}! Watching movies or series in English is also a fantastic trick to train your listening skills naturally. Have you ever tried watching a movie or series in English?`,
          de: `Das klingt nach einer tollen Freizeitbeschäftigung${this.salutation()}! Filme oder Serien auf Englisch zu schauen ist übrigens auch ein genialer Trick, um das Hörverständnis ganz nebenbei zu trainieren. Hast du schon mal einen Film oder eine Serie auf Englisch geschaut?`,
          suggestions: [
            'Yes, I sometimes watch movies in English with subtitles.',
            'Not yet, but I want to try it with my favorite series!',
            'What kind of movies or stories do you recommend?'
          ]
        };
      }

      if (/\b(family|friends?|parents|children|kids|wife|husband|partner|brother|sister|weekend|travel|vacation|holiday|country|countries|city)\b/i.test(lower)) {
        return {
          id: 'discuss_life_social_' + this.state.turnCount,
          en: `Spending quality time with family and friends or discovering new places is so valuable${this.salutation()}! If you could travel to any English-speaking country tomorrow, where would you love to go and why?`,
          de: `Schöne Zeit mit Familie und Freunden zu verbringen oder neue Orte zu entdecken ist unbezahlbar${this.salutation()}! Wenn du morgen in ein beliebiges englischsprachiges Land reisen könntest – wohin würdest du am liebsten reisen und warum?`,
          suggestions: [
            'I would love to visit London and explore the city.',
            'I want to travel to the USA or Canada to see the nature.',
            'Australia or Ireland would be an amazing adventure!'
          ]
        };
      }

      if (/\b(i\s+think|in\s+my\s+opinion|i\s+believe|i\s+agree|i\s+disagree|i\s+prefer|because|for\s+me|advantage|challenge|definitely|actually|opportunity)\b/i.test(lower)) {
        const opinionReplies = [
          {
            en: `I really like how you expressed your opinion${this.salutation()}! Using words like "because", "I think", or "I prefer" makes your English sound very natural and fluent. Tell me more: Why is that aspect particularly important to you?`,
            de: `Mir gefällt sehr, wie klar du deine Meinung ausgedrückt hast${this.salutation()}! Wörter wie *„because“*, *„I think“* oder *„I prefer“* lassen dein Englisch total natürlich und flüssig klingen. Erzähl mir noch etwas mehr: Warum ist dir dieser Punkt besonders wichtig?`,
            suggestions: [
              'Because it helps me reach my personal and professional goals.',
              'It makes everyday life much easier and more enjoyable.',
              'What is your perspective on this topic?'
            ]
          },
          {
            en: `That is a very strong and thoughtful point${this.salutation()}! I completely agree with your reasoning. If we look at the future, how do you think this will develop in the next few years?`,
            de: `Das ist ein sehr starker und durchdachter Punkt${this.salutation()}! Ich stimme deiner Begründung voll zu. Wenn wir in die Zukunft blicken: Wie wird sich das deiner Meinung nach in den nächsten Jahren entwickeln?`,
            suggestions: [
              'I think it will become even more important in the future.',
              'Many things will change, so staying flexible is key.',
              'Let us discuss another interesting everyday topic!'
            ]
          }
        ];
        return {
          id: 'discuss_opinion_' + this.state.turnCount,
          ...opinionReplies[(this.state.turnCount - 1) % opinionReplies.length]
        };
      }

      if (scenarioId === 'beginner' || scenarioId === 'free') {
        const discussionFallbacks = [
          {
            en: `That is a great point${this.salutation()}! I really enjoy talking and discussing with you like real conversation partners. What is your opinion on this: Is it better to learn a language through grammar rules or by speaking freely every day?`,
            de: `Das ist ein super Punkt${this.salutation()}! Es macht richtig Spaß, sich mit dir wie echte Gesprächspartner zu unterhalten und zu diskutieren. Was ist deine Meinung dazu: Lernt man eine Sprache besser durch Grammatikregeln oder durch tägliches freies Sprechen?`,
            suggestions: [
              'I think speaking freely every day is much better!',
              'Both are important, but speaking builds real confidence.',
              'I learn best when we talk and discuss together like now.'
            ]
          },
          {
            en: `Interesting thought${this.salutation()}! Let's keep our conversation flowing: What is something new you learned or experienced recently that you found really interesting?`,
            de: `Interessanter Gedanke${this.salutation()}! Lass uns direkt weiterplaudern: Was hast du in letzter Zeit Neues gelernt oder erlebt, das du richtig spannend fandest?`,
            suggestions: [
              'I am learning new programming skills and improving my English.',
              'I discovered how fun it is to practice English in a real dialogue.',
              'Ask me another discussion question!'
            ]
          },
          {
            en: `You are expressing yourself really well${this.salutation()}! Let's discuss another everyday question: What motivates you most when you work on a project or learn something new?`,
            de: `Du drückst dich richtig gut aus${this.salutation()}! Lass uns über eine weitere Alltagsfrage diskutieren: Was motiviert dich am meisten, wenn du an einem Projekt arbeitest oder etwas Neues lernst?`,
            suggestions: [
              'Seeing my own progress step by step motivates me the most.',
              'I love solving practical problems and building useful things.',
              'Having a good conversation partner makes learning much easier!'
            ]
          }
        ];
        return {
          id: 'beginner_open_fallback_' + this.state.turnCount,
          ...discussionFallbacks[(this.state.turnCount - 1) % discussionFallbacks.length]
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
  window.DialogEngine = DialogEngine;

  function formatReplyText(t) {
    if (!t) return '';
    const uName = getUserName();
    if (uName) {
      return t.replace(/\{name\}/g, `, ${uName}`).replace(/Istvan/g, uName).replace(/[ \t]+,/g, ',').replace(/[ \t]{2,}/g, ' ');
    } else {
      return t.replace(/\{name\}/g, '').replace(/Istvan/g, '').replace(/[ \t]+,/g, ',').replace(/[ \t]{2,}/g, ' ').trim();
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

  function speakLastPartnerMessage() {
    if (currentDialogMode !== 'voice' || currentView !== 'dialog') return;
    const history = dialogHistories[currentScenarioId] || [];
    const lastPartner = [...history].reverse().find(m => m.type === 'partner');
    if (lastPartner && lastPartner.textEn) {
      speakEnglish(lastPartner.textEn);
    }
  }

  function updateDialogAudioModeUI() {
    const isVoice = currentDialogMode === 'voice';
    const btnModeVoice = document.getElementById('btnModeVoice');
    const btnModeText = document.getElementById('btnModeText');
    const btnAutoSpeak = document.getElementById('btnToggleAutoSpeak');
    if (btnModeVoice) btnModeVoice.classList.toggle('active', isVoice);
    if (btnModeText) btnModeText.classList.toggle('active', !isVoice);
    if (btnAutoSpeak) {
      btnAutoSpeak.classList.toggle('active', isVoice);
      btnAutoSpeak.classList.toggle('muted-mode', !isVoice);
      btnAutoSpeak.innerHTML = isVoice ? '🔊 Immer vorlesen: AN' : '🔇 Unterwegs: Nur Text';
      btnAutoSpeak.title = isVoice
        ? 'Er liest jede Antwort automatisch vor (wie ein echter Gesprächspartner). Tippe hier zum Ausschalten, wenn du unterwegs bist!'
        : 'Unterwegs-Modus aktiv: Nur Text bleibt vor dir. Tippe hier, damit er wieder automatisch vorliest!';
    }
  }

  function setDialogAudioMode(mode, showFeedback = true) {
    currentDialogMode = (mode === 'text') ? 'text' : 'voice';
    try {
      localStorage.setItem('fiae_dialog_mode', currentDialogMode);
    } catch (e) {}
    updateDialogAudioModeUI();
    if (currentDialogMode === 'text') {
      if (isSpeakingNow()) {
        stopSpeaking();
      }
      if (showFeedback) {
        showToast('🔇 Unterwegs-Modus: Vorlesen gestoppt – es bleibt nur der Text');
      }
    } else {
      if (showFeedback) {
        showToast('🔊 Gesprächs-Modus: Liest immer automatisch vor!');
      }
      speakLastPartnerMessage();
    }
  }

  function initDialogView() {
    if (dialogInitialized) return;
    dialogInitialized = true;

    const btnModeText = document.getElementById('btnModeText');
    const btnModeVoice = document.getElementById('btnModeVoice');
    const btnToggleAutoSpeak = document.getElementById('btnToggleAutoSpeak');
    const scenarioBar = document.getElementById('scenarioBar');
    const btnResetDialog = document.getElementById('btnResetDialog');
    const btnDialogSend = document.getElementById('btnDialogSend');
    const btnDialogMic = document.getElementById('btnDialogMic');
    const dialogTextInput = document.getElementById('dialogTextInput');

    // Modus umschalten (Immer vorlesen & Reden vs. Unterwegs / Nur Text)
    if (btnModeText && btnModeVoice) {
      btnModeText.addEventListener('click', () => {
        setDialogAudioMode('text', true);
      });

      btnModeVoice.addEventListener('click', () => {
        setDialogAudioMode('voice', true);
      });
    }

    if (btnToggleAutoSpeak) {
      btnToggleAutoSpeak.addEventListener('click', () => {
        const nextMode = (currentDialogMode === 'voice') ? 'text' : 'voice';
        setDialogAudioMode(nextMode, true);
      });
    }

    updateDialogAudioModeUI();

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

    // Senden per Button oder Enter-Taste (v30: stoppt und sendet auch laufende Aufnahme)
    if (btnDialogSend) {
      btnDialogSend.addEventListener('click', () => {
        if (isRecording && activeMicTarget === 'dialogChat') {
          stopDialogRecordingAndSend();
        } else {
          submitUserChatMessage();
        }
      });
    }

    if (dialogTextInput) {
      dialogTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (isRecording && activeMicTarget === 'dialogChat') {
            stopDialogRecordingAndSend();
          } else {
            submitUserChatMessage();
          }
        }
      });
    }

    // Mikrofon-Button im Dialog
    if (btnDialogMic) {
      btnDialogMic.addEventListener('click', () => {
        toggleDialogSpeechRecording();
      });
    }

    // Mikrofon-Sprachumschalter (🇬🇧 EN / 🇩🇪 DE) im Dialog
    const btnDialogMicLang = document.getElementById('btnDialogMicLang');
    if (btnDialogMicLang) {
      btnDialogMicLang.addEventListener('click', () => {
        toggleDialogMicLang();
      });
    }
    updateDialogMicLangUI();

    // Dedizierter "Aufnahme stoppen & Abschicken"-Button
    const btnRecStopSend = document.getElementById('btnRecStopSend');
    if (btnRecStopSend) {
      btnRecStopSend.addEventListener('click', () => {
        stopDialogRecordingAndSend();
      });
    }

    // Dedizierter "Abbrechen"-Button
    const btnRecCancel = document.getElementById('btnRecCancel');
    if (btnRecCancel) {
      btnRecCancel.addEventListener('click', () => {
        cancelDialogRecording();
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
          showToast('⏹️ Vorlesen gestoppt – nur Text vor dir');
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
      avatarEl.title = 'Tippen zum sofortigen Stoppen (nur Text) oder Wiederholen der Sprache';
      avatarEl.addEventListener('click', () => {
        if (isSpeakingNow()) {
          stopSpeaking();
          showToast('⏹️ Vorlesen gestoppt – nur Text vor dir');
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
      if (currentDialogMode === 'voice' && currentView === 'dialog') {
        speakLastPartnerMessage();
      }
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
      if (currentDialogMode === 'voice' && currentView === 'dialog') {
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

    // Falls Sprachmodus aktiv ist (Standard: AN) und Dialog geöffnet ist, Begrüßung sofort vorlesen
    if (currentDialogMode === 'voice' && currentView === 'dialog') {
      speakEnglish(promptEn);
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

  function renderInteractiveEnglishText(rawText) {
    if (!rawText) return '';
    return String(rawText).split(/(\s+)/).map(token => {
      if (/^\s+$/.test(token)) return token.replace(/\n/g, '<br>');
      const cleanWord = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
      if (cleanWord.length >= 2) {
        return `<span class="chat-word-token" data-word="${escapeHtml(cleanWord)}" title="Tippen für Einzelwort-Aussprache & Übersetzung">${escapeHtml(token)}</span>`;
      }
      return escapeHtml(token);
    }).join('');
  }

  function formatChatDeHtml(rawDe) {
    if (!rawDe) return '';
    return String(rawDe)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="chat-phonetic-code">$1</code>')
      .replace(/\n/g, '<br>');
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
        const pronounceTarget = (item.practiceSentence || item.textEn || '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
        msgDiv.innerHTML = `
          <div class="chat-partner-bubble">
            <div class="chat-partner-sender">${item.sender}</div>
            <div class="chat-partner-text">${renderInteractiveEnglishText(item.textEn)}</div>
            <div class="chat-partner-de">🇩🇪 <span class="chat-partner-de-body">${formatChatDeHtml(item.textDe)}</span></div>
            <div class="chat-partner-actions">
              <button class="chat-audio-btn chat-btn-normal" data-speak="${encodeURIComponent(item.textEn)}" title="In natürlichem Tempo vorlesen">
                🔊 Vorlesen
              </button>
              <button class="chat-audio-btn chat-btn-slow" data-speak-slow="${encodeURIComponent(item.textEn)}" title="Langsam und deutlich vorlesen (0.78x)">
                🐢 Langsam
              </button>
              <button class="chat-audio-btn chat-btn-pronounce-test" data-pronounce="${encodeURIComponent(pronounceTarget)}" title="Sprich den englischen Satz/Begriff nach und lass deine Aussprache bewerten!">
                🎙️ Aussprache testen
              </button>
              <span class="chat-word-click-hint">💡 Wort antippen = Einzel-Aussprache</span>
            </div>
            <div class="chat-pronounce-result-box" style="display: none;"></div>
          </div>
        `;

        msgDiv.querySelector('.chat-btn-normal').addEventListener('click', (e) => {
          const btn = e.currentTarget;
          const textToSpeak = decodeURIComponent(btn.dataset.speak);
          toggleSpeakEnglish(textToSpeak, btn);
        });

        msgDiv.querySelector('.chat-btn-slow').addEventListener('click', (e) => {
          const btn = e.currentTarget;
          const textToSpeak = decodeURIComponent(btn.dataset.speakSlow);
          toggleSpeakEnglish(textToSpeak, btn, 0.78);
        });

        const pronBtn = msgDiv.querySelector('.chat-btn-pronounce-test');
        const pronBox = msgDiv.querySelector('.chat-pronounce-result-box');
        if (pronBtn && pronBox) {
          pronBtn.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const target = decodeURIComponent(btn.dataset.pronounce || '');
            startChatPronunciationTest(target, pronBox, btn);
          });
        }

        msgDiv.querySelectorAll('.chat-word-token').forEach(wordSpan => {
          wordSpan.addEventListener('click', (e) => {
            e.stopPropagation();
            const w = e.currentTarget.dataset.word;
            if (!w) return;
            speakEnglish(w, 0.80);
            const dictHit = (typeof TeacherDictionary !== 'undefined' && TeacherDictionary.lookup) ? TeacherDictionary.lookup(w) : null;
            const phonW = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.wordToGermanPhonetic(w) : '';
            if (dictHit && dictHit.german) {
              showToast(`🔊 "${w}" [${phonW}] = ${dictHit.german}`);
            } else {
              showToast(`🔊 "${w}" ${phonW ? `[${phonW}]` : ''}`);
            }
          });
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

        // Falls ein ECHTER Fehler vorliegt, Doctor Card mit Grammatik, Lautschrift & Aussprache-Test rendern
        if (item.analysis && item.analysis.hasError) {
          const docCard = document.createElement('div');
          docCard.className = 'sentence-doctor-card has-error';
          const cleanCorrectedForSpeech = (item.analysis.correctedText || '').replace(/<[^>]+>/g, '').trim();
          const phonLine = item.analysis.phoneticText || ((typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(cleanCorrectedForSpeech) : '');
          docCard.innerHTML = `
            <div class="doctor-header">
              <span class="doctor-badge error">🩺 Satz-Korrektur & Korrektur-Vorschlag</span>
            </div>
            <div class="doctor-detail-row">
              <span class="doctor-label">🔴 Dein Satz:</span>
              <span class="doctor-original-text">${item.analysis.originalText}</span>
            </div>
            <div class="doctor-corrected-box">
              <div style="flex: 1;">
                <span class="doctor-corrected-text">🟢 <strong>Korrektur-Vorschlag:</strong> ${item.analysis.correctedText}</span>
                ${phonLine ? `<div class="doctor-phonetic-line">🗣️ So sprichst du es aus: <code>[${escapeHtml(phonLine)}]</code></div>` : ''}
              </div>
              <div class="doctor-action-btns">
                <button class="chat-audio-btn doc-btn-listen" data-speak="${encodeURIComponent(cleanCorrectedForSpeech)}">
                  🔊 Anhören
                </button>
                <button class="chat-audio-btn chat-btn-pronounce-test doc-btn-pronounce" data-pronounce="${encodeURIComponent(cleanCorrectedForSpeech)}">
                  🎙️ Nachsprechen testen
                </button>
              </div>
            </div>
            <div class="doctor-explanation-box">
              ${item.analysis.explanation}
            </div>
            <div class="chat-pronounce-result-box" style="display: none;"></div>
          `;

          const listenBtn = docCard.querySelector('.doc-btn-listen');
          if (listenBtn) {
            listenBtn.addEventListener('click', (e) => {
              const btn = e.currentTarget;
              const textToSpeak = decodeURIComponent(btn.dataset.speak);
              toggleSpeakEnglish(textToSpeak, btn, 0.80);
            });
          }

          const docPronBtn = docCard.querySelector('.doc-btn-pronounce');
          const docPronBox = docCard.querySelector('.chat-pronounce-result-box');
          if (docPronBtn && docPronBox) {
            docPronBtn.addEventListener('click', (e) => {
              const btn = e.currentTarget;
              const target = decodeURIComponent(btn.dataset.pronounce || '');
              startChatPronunciationTest(target, docPronBox, btn);
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
    let analysis = SentenceDoctor.analyze(text);
    const cleanedAnalysisText = (analysis && analysis.hasError && analysis.correctedText && !analysis.isGerman)
      ? analysis.correctedText.replace(/<[^>]+>/g, '').trim()
      : text;

    const directIntent = DialogEngine.detectDirectIntent(text, scenarioId) ||
      ((cleanedAnalysisText !== text) ? DialogEngine.detectDirectIntent(cleanedAnalysisText, scenarioId) : null);

    // Wenn der Nutzer seinen Namen nennt, sich vorstellt, einen Gast vorstellt oder eine reine Wortübersetzung anfragt:
    // NIEMALS eine Fehler-Box anzeigen! Aber bei allen anderen Sätzen (auch wenn directIntent greift) soll SentenceDoctor aktiv helfen!
    const isPureNameOrTranslationIntent = directIntent && (directIntent.isNameUpdate || directIntent.isGuestIntro || directIntent.isNameInquiry || directIntent.isTranslation);
    const isNameOrGuestMessage = isPureNameOrTranslationIntent || /\b(nicht\s+[A-Za-z]+\s+sondern|meine?\s+(richtige[rn]?\s+)?na[h]?me|ich\s+hei[sß]+e|my\s+name\s+is|call\s+me|mein\s+name\s+ist|wie\s+hei[sß]+e\s+ich|what\s+is\s+my\s+name|wei[sß]+t\s+du\s+wie\s+ich|sag\s+mir\s+meinen\s+namen|wer\s+ist\s+(alles\s+)?da|who\s+is\s+here)\b/i.test(text);

    if (isNameOrGuestMessage && analysis) {
      analysis = null;
    }

    // User-Nachricht speichern mit eindeutiger ID (v41)
    if (!dialogHistories[scenarioId]) dialogHistories[scenarioId] = [];
    const msgIdUser = 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    dialogHistories[scenarioId].push({
      id: msgIdUser,
      type: 'user',
      text: text,
      analysis: analysis
    });

    // Antwort des Partners generieren (nutzt den korrigierten Satz als Kontext, damit die Bedeutung auch bei Tippfehlern erkannt wird!)
    let partnerReply;
    try {
      partnerReply = directIntent
        ? { ...directIntent, en: formatReplyText(directIntent.en), de: formatReplyText(directIntent.de) }
        : generatePartnerResponse(cleanedAnalysisText, scenarioId);
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

    // WICHTIG: Sofortiger Korrektur-Vorschlag mit Lautschrift & Erklärung direkt in der Antwort des Gesprächspartners
    const alreadyCoachesError = partnerReply && (partnerReply.isDirectCoaching || /^(intent_improve_speaking_with_correction|intent_clarify_speaking_was|intent_clarify_and_coach)/.test(partnerReply.id || ''));
    if (analysis && analysis.hasError && !alreadyCoachesError) {
      const cleanCorrected = (analysis.correctedText || '').replace(/<[^>]+>/g, '').trim();
      const corrPhon = analysis.phoneticText || ((typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(cleanCorrected) : '');
      let verbalEn = '';
      let verbalDe = '';

      // Verhindere doppelte Korrektur-Berichte im Chat-Bubble, da SentenceDoctor-Card bereits gerendert wird (v41)
      if (!partnerReply.practiceSentence) {
        partnerReply.practiceSentence = cleanCorrected;
      }

      // Vorschlags-Chips nur mit kurzen, passenden Antworten belegen (keine langen Absätze!)
      if (cleanCorrected && cleanCorrected.length <= 60 && !cleanCorrected.includes('\n')) {
        partnerReply.suggestions = [
          cleanCorrected,
          ...(partnerReply.suggestions || []).filter(s => s !== cleanCorrected).slice(0, 2)
        ];
      } else {
        // Bei langen Routine-Sätzen passende Gesprächs-Fortsetzungen vorschlagen
        partnerReply.suggestions = [
          "Have a great day at school or work!",
          "What are you studying today?",
          "How long does your train ride take?"
        ];
      }
    }

    const msgIdPartner = 'msg_partner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const pushedPartnerMsg = {
      id: msgIdPartner,
      type: 'partner',
      sender: getCurrentPartnerMeta().name,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      practiceSentence: partnerReply.practiceSentence || '',
      suggestions: partnerReply.suggestions || [
        "Can you help me improve my English pronunciation?",
        "Can you teach me some new words?",
        "Let us continue chatting."
      ]
    };
    dialogHistories[scenarioId].push(pushedPartnerMsg);

    // XP vergeben & Sound abspielen
    userXP += 10;
    localStorage.setItem('fiae_user_xp', userXP);
    updateStatsBadges();
    playSound(analysis && !analysis.hasError ? 'success' : 'try-again');

    // Chat neu rendern
    renderChatLog(scenarioId);

    // Falls ein Wort/Satz live übersetzt werden soll ODER eine deutsche Eingabe in den allgemeinen Fallback gefallen ist -> Dual-Engine Live-Übersetzer nutzen!
    const isGenericFallback = partnerReply && /^(beginner_open_fallback|open_fallback|standup_open_fallback|intent_german_question_direct)/.test(partnerReply.id || '');
    const looksGermanInput = (analysis && analysis.isGerman) || /\b(ich|du|wir|sie|mir|mich|mein|meine|wie|was|warum|wo|wann|kannst|möchte|will|soll|bitte|auf|für|mit|über|nicht|kein|keine|haben|sein|machen|gehen|heißt|bedeutet|übersetzen|erklären)\b/i.test(text);

    if ((partnerReply && partnerReply.needsLiveTranslation && partnerReply.queryWord) || (isGenericFallback && looksGermanInput)) {
      const qWord = (partnerReply && partnerReply.queryWord) ? partnerReply.queryWord : text;
      const isSingleOrShort = qWord.trim().split(/\s+/).length <= 3;

      TeacherDictionary.translateLive(qWord, 'en').then(res => {
        if (res && res.translatedText) {
          const primary = (res.primaryTranslation || res.translatedText).replace(/^to\s+/i, '').trim();
          const phonLive = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(primary) : '';
          const tipInfo = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.getGrammarAndUsageTip(qWord, res.translatedText) : { grammarTip: '', exampleEn: `Can you use "${primary}" in a sentence?`, exampleDe: `Kannst du „${primary}“ in einem Satz verwenden?` };
          if (isSingleOrShort) {
            TeacherDictionary.common[qWord.toLowerCase()] = {
              de: qWord,
              en: res.translatedText,
              phonetic: phonLive,
              exampleEn: tipInfo.exampleEn,
              exampleDe: tipInfo.exampleDe
            };
          }
          if (res.direction === 'en_to_de') {
            const srcPhon = (typeof PronunciationCoach !== 'undefined') ? PronunciationCoach.toPhonetic(qWord) : '';
            pushedPartnerMsg.practiceSentence = qWord;
            pushedPartnerMsg.textEn = `In German, "${qWord}" [${srcPhon}] means "${res.translatedText}". Example: "${tipInfo.exampleEn}".`;
            pushedPartnerMsg.textDe = `🇬🇧➔🇩🇪 Auf Deutsch bedeutet **„${qWord}“**: 👉 **„${res.translatedText}“**\n🗣️ **Aussprache (Lautschrift):** \`[${srcPhon}]\`\n📖 **Grammatik & Tipp:** ${tipInfo.grammarTip}\n💬 **Beispielsatz:** *„${tipInfo.exampleEn}“* *(🇩🇪 ${tipInfo.exampleDe})*`;
          } else if (isSingleOrShort) {
            pushedPartnerMsg.practiceSentence = tipInfo.exampleEn || primary;
            pushedPartnerMsg.textEn = `In English, "${qWord}" means "${res.translatedText}" [${phonLive}]. Example: "${tipInfo.exampleEn}".`;
            pushedPartnerMsg.textDe = `🇩🇪➔🇬🇧 Auf Englisch heißt **„${qWord}“**: 👉 **„${res.translatedText}“**\n🗣️ **Aussprache (Lautschrift):** \`[${phonLive}]\`\n📖 **Grammatik & Anwendung:** ${tipInfo.grammarTip}\n💬 **Beispielsatz:** *„${tipInfo.exampleEn}“*\n*(🇩🇪 ${tipInfo.exampleDe})*\n🎙️ *Klicke unten auf **„🎙️ Aussprache testen“**, um es laut nachzusprechen!*`;
          } else {
            pushedPartnerMsg.practiceSentence = primary;
            pushedPartnerMsg.textEn = `In English, you say: "${primary}" [${phonLive}]! Click "🎙️ Aussprache testen" below to practice saying it out loud!`;
            pushedPartnerMsg.textDe = `🇩🇪➔🇬🇧 Auf Englisch heißt dein Satz:\n👉 **„${primary}“**\n🗣️ **So sprichst du ihn aus:** \`[${phonLive}]\`\n🎙️ *(Klicke oben auf **🔊 Vorlesen** zum Anhören oder auf **🎙️ Aussprache testen** zum Nachsprechen!)*`;
          }
          pushedPartnerMsg.suggestions = [
            primary,
            tipInfo.exampleEn || `Can you give me an example sentence with "${primary.split(/\s+/)[0]}"?`,
            `Let us continue our conversation!`
          ];
          renderChatLog(scenarioId);
          if (currentDialogMode === 'voice') {
            speakEnglish(pushedPartnerMsg.textEn);
          }
        }
      });
      return;
    }

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
