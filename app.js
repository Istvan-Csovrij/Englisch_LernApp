// ============================================================
// Hauptlogik: Englisch-LernApp mit Überspringen-Funktion (Skip)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- STATE ---
  let currentCategory = 'all';
  let currentView = 'cards';
  let filteredVocab = [...VOCAB_DATA];
  let currentCardIndex = 0;
  let isCardFlipped = false;

  let filteredSpeech = [...SPEECH_DATA];
  let currentSpeechIndex = 0;

  let filteredCloze = [...CLOZE_DATA];
  let currentClozeIndex = 0;

  // LocalStorage Persistenz
  let masteredCards = JSON.parse(localStorage.getItem('fiae_mastered_cards') || '[]');
  let userXP = parseInt(localStorage.getItem('fiae_user_xp') || '0', 10);

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
      name: '🌸 Weich & Natürlich',
      label: 'Weich',
      desc: 'Sanfte Aussprache, warmes Lerntempo & natürliche Betonung',
      rate: 0.94,
      pitch: 0.98,
      volume: 0.95
    },
    clear: {
      id: 'clear',
      name: '💼 Klar & Business',
      label: 'Klar',
      desc: 'Deutliche Business-Artikulation für IT & Vorstellungsgespräche',
      rate: 0.96,
      pitch: 1.00,
      volume: 0.95
    },
    slow: {
      id: 'slow',
      name: '🐢 Ruhig & Lerntempo',
      label: 'Ruhig',
      desc: 'Entspanntes Lerntempo (0.82x) für Anfänger & Hörübungen',
      rate: 0.82,
      pitch: 1.02,
      volume: 0.90
    }
  };

  let activeVoiceProfileId = localStorage.getItem('englapp_voice_profile') || 'soft';

  function getActiveVoiceProfile() {
    return VOICE_PROFILES[activeVoiceProfileId] || VOICE_PROFILES.soft;
  }

  function getBestEnglishVoice() {
    if (!('speechSynthesis' in window)) return null;
    try {
      const voices = window.speechSynthesis.getVoices() || [];
      if (!voices.length) return null;

      // 0. Prüfe benutzerdefinierte Stimme aus Einstellungen
      const customURI = localStorage.getItem('englapp_custom_voice_uri');
      if (customURI) {
        const found = voices.find(v => v.voiceURI === customURI || v.name === customURI);
        if (found) return found;
      }

      const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (!enVoices.length) return voices[0] || null;

      function scoreVoice(v) {
        const name = (v.name || '').toLowerCase();
        const uri = (v.voiceURI || '').toLowerCase();
        let score = 0;

        // 1. Online / Neural / Natural Stimmen haben oberste Priorität (klingen ultra-weich und menschlich)
        if (name.includes('natural') || uri.includes('natural')) score += 500;
        if (name.includes('online') || uri.includes('online')) score += 350;
        if (name.includes('neural') || uri.includes('neural')) score += 400;

        // 2. Bekannte sehr flüssige menschliche Stimmen
        if (name.includes('jenny')) score += 250;
        if (name.includes('aria')) score += 220;
        if (name.includes('google us english') || name.includes('google uk english female')) score += 260;
        if (name.includes('google')) score += 180;
        if (name.includes('samantha')) score += 150;
        if (name.includes('ava')) score += 120;
        if (name.includes('guy')) score += 110;

        // 3. Harte Roboter-Desktop-Stimmen MASSIV abwerten!
        if (name.includes('desktop') || uri.includes('desktop')) score -= 500;
        if (name.includes('david')) score -= 300;
        if (name.includes('zira')) score -= 250;
        if (name.includes('mark')) score -= 300;
        if (name.includes('hazel')) score -= 300;
        if (name.includes('espeak')) score -= 500;

        // 4. US / UK Dialekt-Bonus
        if (v.lang === 'en-US' || v.lang === 'en_US') score += 15;
        if (v.lang === 'en-GB' || v.lang === 'en_GB') score += 10;

        return score;
      }

      const sorted = [...enVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
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

  function speakEnglish(text, customRate = null, onEndCallback = null) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      // WICHTIG: Text vollständig von Emojis, Smileys und Formatierungen befreien!
      const speechText = cleanTextForSpeech(text);
      if (!speechText) return;

      const profile = getActiveVoiceProfile();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'en-US';

      // Tempo & Tonhöhe aus Profil oder benutzerdefiniert
      utterance.rate = (typeof customRate === 'number' && customRate > 0) ? customRate : profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = profile.volume;

      const voice = getBestEnglishVoice();
      if (voice) {
        utterance.voice = voice;
        // Anti-Roboter-Weichzeichner falls nur alte Desktop-Stimme vorhanden ist:
        const vName = (voice.name || '').toLowerCase();
        if (vName.includes('desktop') || vName.includes('zira') || vName.includes('david')) {
          utterance.rate = 0.94;
          utterance.pitch = 0.95;
        }
      }

      utterance.onend = () => {
        window._activeUtterance = null;
        if (typeof onEndCallback === 'function') {
          onEndCallback();
        }
      };

      utterance.onerror = (e) => {
        window._activeUtterance = null;
        console.warn('SpeechSynthesis error:', e);
      };

      // Keep reference to prevent mobile garbage-collection cutoffs
      window._activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('speakEnglish error:', err);
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
    const v = getBestEnglishVoice();
    const vName = v ? v.name.split('-')[0].trim() : 'Standard';
    showToast(`🔊 ${p.name} (${vName})`);
    speakEnglish("Hello! Your English voice is now soft, smooth, and friendly. Let's practice English together!");
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
    const card = filteredVocab[currentCardIndex];
    speakEnglish(card.english, 0.9);
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

  document.getElementById('btnPlaySpeechAudio').addEventListener('click', () => {
    const sp = filteredSpeech[currentSpeechIndex];
    const rate = parseFloat(document.getElementById('voiceSpeedSelect').value || '0.75');
    speakEnglish(sp.sentenceEn, rate);
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
      beginner: {
        personal: [
          {
            id: 'beg_pers_1',
            en: 'Nice to meet you{name}! How was your day today?',
            de: 'Schön dich kennenzulernen{name}! Wie war dein Tag heute?',
            suggestions: [
              'Hello Emma, my name is Alex!',
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
            de: 'Entkoppelte Services sind viel einfacher zu warten und zu testen.'
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
            de: 'Schöne Pläne fürs Wochenende oder einfach nur entspannen?'
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
            de: 'Guten Abend! Ich kann deine Hotelreservierung prüfen. Wie lautet dein Name?'
            suggestions: [
              'Thank you! Here is my passport and booking confirmation.',
              'Could you tell me what time complimentary breakfast is served in the morning?',
              'What is the easiest way to take the Underground to Shoreditch from here?'
            ]
          },
          {
            id: 'trv_lon_2',
            en: 'Welcome to London! Breakfast is served from 7 to 10 in the morning.',
            de: 'Willkommen in London! Frühstück gibt es morgens von 7 bis 10 Uhr.'
            suggestions: [
              'That is very clear and convenient, thank you for the directions!',
              'Can I pay on the Underground with my contactless credit card or phone?',
              'Could you also recommend an authentic British restaurant for dinner tonight?'
            ]
          },
          {
            id: 'trv_lon_3',
            en: 'The nearest tube station is Piccadilly Circus, just a two-minute walk away.',
            de: 'Die nächste U-Bahn-Station ist Piccadilly Circus, nur zwei Minuten zu Fuß.'
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
            de: 'Das ist sehr interessant{name}! Erzähl mir mehr darüber.'
            suggestions: [
              'In my daily routine, I balance intensive coding with continuous learning.',
              'I focus on writing readable code with clean architecture and automated tests.',
              'I find that discussing technical concepts in English builds immense confidence.'
            ]
          },
          {
            id: 'fr_2',
            en: 'You are expressing yourself very clearly! What would you like to talk about next?',
            de: 'Du drückst dich sehr verständlich aus! Worüber möchtest du als Nächstes sprechen?'
            suggestions: [
              'I am fascinated by scalable backend microservices and efficient database design.',
              'I love how agile Scrum frameworks enable collaborative and iterative development.',
              'I enjoy exploring how algorithmic patterns improve application performance.'
            ]
          },
          {
            id: 'fr_3',
            en: 'Great conversation{name}! Feel free to ask me anything.',
            de: 'Tolles Gespräch{name}! Du kannst mich jederzeit alles fragen.'
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
      const meta = {
        beginner: { name: 'Emma', role: 'Geduldige Englisch-Tutorin für Alltag & Smalltalk', desc: 'Anfänger & Plaudern' },
        standup: { name: 'Sarah', role: 'Scrum Master & Agile Coach', desc: 'Daily Scrum Standup' },
        interview: { name: 'Mr. Davis', role: 'Lead Software Architect', desc: 'IT-Vorstellungsgespräch' },
        support: { name: 'Alex', role: 'Senior Product Manager', desc: 'Bug-Report & Ticket Support' },
        architecture: { name: 'David', role: 'Senior Cloud Solutions Architect', desc: 'System-Architektur Review' },
        smalltalk: { name: 'Mark', role: 'Senior Developer & Teammate', desc: 'Kaffeepause & Smalltalk' },
        travel: { name: 'James', role: 'Head Concierge at Royal Grand Hotel', desc: 'Hotel & London Reisen' },
        free: { name: 'AI English Coach', role: 'Persönlicher Sprachtrainer', desc: 'Freie Konversation' },
        quiz: { name: 'Prof. Miller', role: 'Vokabel-Coach', desc: 'Vokabel-Prüfer & Quiz' }
      };
      return meta[scenarioId] || meta.beginner || meta.standup;
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

      // 0A. Benutzer stellt sich mit Namen vor ("My name is ...", "I am ...", "Ich heiße ...")
      const nameMatch = rawInput.match(/\b(my\s+name\s+is|i\s+am|call\s+me|ich\s+hei[sß]+e|mein\s+name\s+ist|nenne?\s+mich)\s+([A-Za-zÄÖÜäöüß]+)\b/i);
      const isSoloName = !userName && /^[A-Za-zÄÖÜäöüß]{2,20}$/.test(rawInput.trim()) && !/^(hello|hi|yes|no|okay|cool|super|good|nice|what|who|how|why)$/i.test(rawInput.trim());

      if (nameMatch || isSoloName) {
        let extractedName = nameMatch ? nameMatch[2] : rawInput.trim();
        extractedName = extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
        this.setUserName(extractedName);

        return {
          id: 'intent_name_saved',
          en: `Nice to meet you, ${extractedName}! What would you like to talk about today?`,
          de: `Schön dich kennenzulernen, ${extractedName}! Worüber möchtest du heute sprechen?`,
          suggestions: [
            "Can you teach me some new conversational words?",
            "How old are you, and what are your hobbies?",
            "Can you correct my English when I make mistakes?"
          ]
        };
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
              "How old you are Emma?"
            ]
          };
        }
      }

      // 1. Asking for Partner's Name / Identity ("What is your name?", "wath is your name?", "who are you?")
      if (/\b(what|tell|may|can)\b.*\b(your|ur)\s+(name|naem)\b/i.test(norm) ||
          /\bwho\s+(are\s+you|is\s+this|am\s+i\s+talking\s+to)\b/i.test(norm) ||
          /\bwhats\s+your\s+name\b/i.test(norm) ||
          /\bname\s*\?/i.test(norm)) {
        if (scenarioId === 'beginner') {
          return {
            id: 'intent_name_beginner',
            en: `My name is ${meta.name}, your ${meta.role}. How are you doing today?`,
            de: `Mein Name ist ${meta.name}, deine ${meta.role}. Wie geht es dir heute?`,
            suggestions: [
              "Nice to meet you Emma! I am ready to practice.",
              "Hello Emma! What are your favorite topics?",
              "Can you teach me some easy English words?"
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
        if (scenarioId === 'beginner') {
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
              "What is your favorite hobby, Emma?"
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

  // --- STIMMEN-AUSWAHL & MODAL ---
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
            Wähle hier die für dein Gerät angenehmste, weichste englische Stimme aus.
          </p>
          <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; font-size: 0.84rem; color: #a7f3d0; line-height: 1.45;">
            💡 <strong>Tipp für flüssige Sprache:</strong> Wähle eine Stimme mit dem grünen Badge <strong>🌟 Natürlich</strong> (z. B. <em>Microsoft Jenny</em> oder <em>Google US English</em>). Diese klingen besonders weich und menschlich!
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
    container.innerHTML = '';

    if (!('speechSynthesis' in window)) {
      container.innerHTML = '<p style="color: #ef4444; padding: 12px;">SpeechSynthesis wird in diesem Browser leider nicht unterstützt.</p>';
      modal.classList.add('active');
      return;
    }

    const voices = window.speechSynthesis.getVoices() || [];
    const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
    // Natürlichste Stimmen ganz oben einsortieren
    enVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));

    if (enVoices.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); padding: 12px;">Keine englischen Stimmen auf diesem Gerät gefunden.</p>';
      modal.classList.add('active');
      return;
    }

    const savedVoiceURI = localStorage.getItem('englapp_custom_voice_uri') || '';
    const bestDefault = getBestEnglishVoice();

    enVoices.forEach(v => {
      const isSelected = savedVoiceURI ? (v.voiceURI === savedVoiceURI) : (bestDefault && v.voiceURI === bestDefault.voiceURI);
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
          <button class="voice-sample-btn" title="Hörprobe abspielen">🔊 Probe</button>
          <button class="voice-select-btn ${isSelected ? 'is-active' : ''}">${isSelected ? '✓ Gewählt' : 'Auswählen'}</button>
        </div>
      `;

      row.querySelector('.voice-sample-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance("Hello! How does this English voice sound to you? It should be very smooth and natural.");
        u.voice = v;
        u.rate = 0.88;
        u.pitch = 1.0;
        window.speechSynthesis.speak(u);
      });

      row.querySelector('.voice-select-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        localStorage.setItem('englapp_custom_voice_uri', v.voiceURI);
        showToast(`🎙️ Stimme aktiviert: ${v.name}`);
        openVoicePickerModal();
      });

      container.appendChild(row);
    });

    modal.classList.add('active');
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
        const current = getUserName();
        const newName = prompt('Wie lautet dein Name? (Wird für die persönliche Anrede im Chat genutzt):', current);
        if (newName !== null) {
          setUserName(newName);
          showToast(newName.trim() ? `👤 Name gespeichert: ${newName.trim()}` : '👤 Name zurückgesetzt');
          resetDialogScenario(currentScenarioId);
        }
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

  function switchDialogScenario(scenarioId) {
    currentScenarioId = scenarioId;
    DialogEngine.reset(scenarioId);
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;

    const avatarEl = document.getElementById('scenarioAvatar');
    const nameEl = document.getElementById('scenarioPartnerName');
    const roleEl = document.getElementById('scenarioPartnerRole');

    if (avatarEl) avatarEl.textContent = scenario.icon;
    if (nameEl) nameEl.textContent = scenario.partnerName;
    if (roleEl) roleEl.textContent = `Rolle: ${scenario.partnerRole}`;

    // Wenn noch keine Nachrichten für dieses Szenario da sind, Begrüßung erstellen
    if (!dialogHistories[scenarioId] || dialogHistories[scenarioId].length === 0) {
      resetDialogScenario(scenarioId);
    } else {
      renderChatLog(scenarioId);
    }
  }

  function resetDialogScenario(scenarioId) {
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;
    dialogHistories[scenarioId] = [];

    if (scenarioId === 'quiz') {
      const firstQ = VocabQuizEngine.start();
      const initialPartnerMsg = {
        type: 'partner',
        sender: scenario.partnerName,
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

    // Initiale Begrüßungsnachricht des Partners (dynamisch mit Benutzername)
    const userName = getUserName();
    let promptEn = scenario.initialPrompt;
    let promptDe = scenario.initialPromptDe;

    if (userName) {
      promptEn = promptEn.replace(/\{name\}/g, userName).replace(/Istvan/g, userName);
      promptDe = promptDe.replace(/\{name\}/g, userName).replace(/Istvan/g, userName);
    } else {
      if (scenarioId === 'beginner') {
        promptEn = `Hello and welcome! 😊 I am Emma, your friendly English tutor. In this chat, there is zero pressure: we can talk about everyday life, hobbies, or learn new words. Before we begin: what is your name?`;
        promptDe = `Hallo und herzlich willkommen! 😊 Ich bin Emma, deine freundliche Sprachbegleiterin. Hier gibt es null Leistungsdruck: Wir können über den Alltag, Hobbys plaudern oder neue Wörter lernen. Bevor wir starten: Wie lautet dein Name?`;
      } else {
        promptEn = promptEn.replace(/\{name\}/g, '').replace(/Istvan/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ');
        promptDe = promptDe.replace(/\{name\}/g, '').replace(/Istvan/g, '').replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ');
      }
    }

    const initialPartnerMsg = {
      type: 'partner',
      sender: scenario.partnerName,
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
    if (scenarioId === 'beginner') {
      const uName = getUserName();
      if (!uName) {
        return [
          'My name is Alex.',
          'My name is Alex.',
          'Can we just practice without names?'
        ];
      }
      return [
        `Hello Emma! My name is ${uName}.`,
        'Can you teach me some useful everyday English words?',
        'Can you correct my English when I make mistakes?'
      ];
    }
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
          const textToSpeak = decodeURIComponent(e.currentTarget.dataset.speak);
          speakEnglish(textToSpeak);
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
              const textToSpeak = decodeURIComponent(e.currentTarget.dataset.speak);
              speakEnglish(textToSpeak);
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

    // 3. Normales Szenario: Satz analysieren (Grammatik & Satzkorrektur)
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;
    const analysis = SentenceDoctor.analyze(text);

    // User-Nachricht speichern
    if (!dialogHistories[scenarioId]) dialogHistories[scenarioId] = [];
    dialogHistories[scenarioId].push({
      type: 'user',
      text: text,
      analysis: analysis
    });

    // Antwort des Partners generieren (mit robustem Fallback)
    let partnerReply;
    try {
      partnerReply = generatePartnerResponse(text, scenarioId);
    } catch (err) {
      console.error('generatePartnerResponse error:', err);
      partnerReply = {
        id: 'safety_fallback',
        en: "That is interesting{name}! Tell me more about that. What would you like to practice next?",
        de: "Das ist interessant{name}! Erzähl mir mehr darüber. Was möchtest du als Nächstes üben?",
        suggestions: [
          "Can you teach me some new words?",
          "How are you doing today?",
          "Let's practice a simple conversation."
        ]
      };
    }

    dialogHistories[scenarioId].push({
      type: 'partner',
      sender: scenario.partnerName,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      suggestions: partnerReply.suggestions || [
        "Can you teach me some new words?",
        "How are you doing today?",
        "Let's continue chatting."
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

  // --- INITIAL RENDER ---
  updateStatsBadges();
  updateVoiceBadgeUI();

  const btnVoiceToggle = document.getElementById('btnVoiceToggle');
  if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', cycleVoiceProfile);
  }

  const btnVoiceTest = document.getElementById('btnVoiceTest');
  if (btnVoiceTest) {
    btnVoiceTest.addEventListener('click', testCurrentVoice);
  }

  renderCurrentCard();
  renderCurrentSpeech();
  renderCurrentCloze();
  initDialogView();
  initStoriesView();
  initGrammarView();
});

// --- SERVICE WORKER REGISTRATION (OFFLINE SUPPORT) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered for offline use:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}
