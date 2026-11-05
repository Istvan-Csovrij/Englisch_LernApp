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
      rate: 0.90,
      pitch: 1.03,
      volume: 0.92
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

      const enVoices = voices.filter(v => v.lang && v.lang.toLowerCase().startsWith('en'));
      if (!enVoices.length) return voices[0] || null;

      function scoreVoice(v) {
        const name = (v.name || '').toLowerCase();
        const uri = (v.voiceURI || '').toLowerCase();
        let score = 0;

        // 1. Prioritize Microsoft Natural / Neural / Online voices (ultra-soft & human)
        if (name.includes('natural') || uri.includes('natural')) score += 120;
        if (name.includes('online') || uri.includes('online')) score += 90;
        if (name.includes('neural') || uri.includes('neural')) score += 100;
        if (name.includes('enhanced') || uri.includes('enhanced')) score += 95;
        if (name.includes('premium') || uri.includes('premium')) score += 95;

        // 2. High-quality human voices
        if (name.includes('jenny')) score += 80;
        if (name.includes('aria')) score += 75;
        if (name.includes('sonia')) score += 75;
        if (name.includes('google us english') || name.includes('google uk english female')) score += 70;
        if (name.includes('samantha')) score += 60;
        if (name.includes('ava')) score += 60;
        if (name.includes('karen') || name.includes('moira') || name.includes('serena')) score += 50;
        if (name.includes('guy') || name.includes('ryan')) score += 40;

        // 3. Female timbre bonus (perceived as warmer and less metallic than robotic voices)
        if (name.includes('female') || name.includes('zira')) score += 20;

        // 4. Heavily penalize harsh robotic desktop voices
        if (name.includes('david desktop') || name.includes('mark desktop')) score -= 90;
        if (name.includes('desktop')) score -= 45;
        if (name.includes('espeak')) score -= 100;

        // 5. English dialect preferences
        if (v.lang === 'en-US' || v.lang === 'en_US') score += 10;
        if (v.lang === 'en-GB' || v.lang === 'en_GB') score += 8;

        return score;
      }

      const sorted = [...enVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
      return sorted[0] || enVoices[0];
    } catch (e) {
      return null;
    }
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

      const profile = getActiveVoiceProfile();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';

      // Use custom rate if provided (e.g. from story speed button), otherwise profile default
      utterance.rate = (typeof customRate === 'number' && customRate > 0) ? customRate : profile.rate;
      utterance.pitch = profile.pitch;
      utterance.volume = profile.volume;

      const voice = getBestEnglishVoice();
      if (voice) {
        utterance.voice = voice;
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
    speakEnglish("Hello Istvan! Your English voice is now soft, smooth, and friendly. Let's practice English together!");
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
  function renderGlossary(searchTerm = '') {
    const listEl = document.getElementById('glossaryList');
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
        v.definition.toLowerCase().includes(term)
      );
    }

    if (displayList.length === 0) {
      listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 16px;">Keine Treffer.</p>';
      return;
    }

    displayList.forEach(item => {
      const isMastered = masteredCards.includes(item.id);
      const div = document.createElement('div');
      div.className = 'glossary-item';
      div.innerHTML = `
        <div class="item-left">
          <div class="item-en">
            ${item.english}
            <span class="item-badge">${item.categoryName}</span>
            ${isMastered ? ' <span title="Gemeistert">⭐</span>' : ''}
          </div>
          <div class="item-de">${item.german}</div>
        </div>
        <div class="item-actions">
          <button class="item-audio-btn" title="Aussprache anhören">🔊</button>
        </div>
      `;

      div.querySelector('.item-audio-btn').addEventListener('click', () => {
        speakEnglish(item.english, 0.9);
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
  let currentScenarioId = 'standup';
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
        feedbackDe = `Hervorragend, Istvan! 🎉 Das ist absolut richtig!\n👉 **"${item.english}"** = **"${item.german}"**\n💡 *Erklärung:* ${item.definition}\n*(+15 XP • Punktestand: ${this.state.score} von ${this.state.totalAsked} richtig)*`;
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
      standup: {
        database: [
          {
            id: 'su_db_1',
            en: 'Great progress on the database optimization, Istvan! Query tuning has a huge impact on system performance. Did you analyze the execution plan with EXPLAIN, or did you add composite indexes?',
            de: 'Großartiger Fortschritt bei der Datenbankoptimierung, Istvan! Abfrageoptimierung hat großen Einfluss auf die Performance. Hast du den Ausführungsplan mit EXPLAIN analysiert oder zusammengesetzte Indizes angelegt?',
            suggestions: [
              'I analyzed the execution plan and added an index on the user ID column.',
              'I refactored a slow SQL join that was causing a full table scan.',
              'The query execution time dropped from 800ms down to 15ms.'
            ]
          },
          {
            id: 'su_db_2',
            en: 'Excellent! Database latency was one of our main concerns during peak hours. Are your query improvements already verified with automated unit tests?',
            de: 'Hervorragend! Die Datenbank-Latenz war eine unserer Hauptsorgen in Spitzenzeiten. Sind deine Abfrage-Optimierungen schon durch automatisierte Modultests abgesichert?',
            suggestions: [
              'Yes, all unit and integration tests are passing green.',
              'I wrote test cases covering large result sets and empty tables.',
              'I will push the pull request right after our daily standup.'
            ]
          },
          {
            id: 'su_db_3',
            en: 'That sounds very solid. Once your pull request is merged, we can monitor the database connection pool in our staging environment. Do you need any assistance with the migration script?',
            de: 'Das klingt sehr solide. Sobald dein Pull Request gemergt ist, können wir den Verbindungspool auf der Testumgebung beobachten. Brauchst du Hilfe beim Migrationsskript?',
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
            en: 'Writing automated tests upfront is great development practice! What is your current test coverage, and did you encounter any tricky edge cases?',
            de: 'Automatisierte Tests vorab zu schreiben ist eine vorbildliche Praxis! Wie ist deine Testabdeckung und bist du auf knifflige Randfälle gestoßen?',
            suggestions: [
              'I covered edge cases for null values and invalid user inputs.',
              'Our unit test suite now has over eighty percent coverage.',
              'I used mock objects to simulate the external payment API.'
            ]
          },
          {
            id: 'su_test_2',
            en: 'Good automated test suites give the entire team confidence before releasing to production. Are these tests running smoothly in our CI/CD pipeline?',
            de: 'Gute automatisierte Testsuiten geben dem ganzen Team Sicherheit vor dem Release. Laufen diese Tests reibungslos in unserer CI/CD-Pipeline?',
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
            en: 'Thanks for taking care of that bug ticket, Istvan! What was the root cause of the issue, and could you reproduce it easily in your local setup?',
            de: 'Danke, dass du das Fehlerticket übernommen hast, Istvan! Was war die Ursache des Problems und konntest du es lokal leicht nachstellen?',
            suggestions: [
              'The root cause was an unhandled null pointer exception in the auth controller.',
              'I reproduced the error using a special character in the username.',
              'I wrote a regression test first, so this bug will never happen again.'
            ]
          },
          {
            id: 'su_bug_2',
            en: 'Great job identifying the root cause quickly! Is your fix already deployed to the staging environment, or are you waiting for a code review first?',
            de: 'Klasse, dass du die Ursache so schnell gefunden hast! Ist der Fix schon auf dem Testserver oder wartest du noch auf ein Code Review?',
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
            en: 'I understand. Let\'s remove that blocker as quickly as possible! Would it help if we set up a fifteen-minute pair programming session after the meeting?',
            de: 'Verstehe. Lass uns dieses Hindernis so schnell wie möglich aus dem Weg räumen! Würde es helfen, wenn wir nach dem Meeting eine 15-minütige Pair-Programming-Session machen?',
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
            en: 'Sounds like you made great headway yesterday, Istvan! What is your primary milestone for today, and do you foresee any architectural challenges?',
            de: 'Klingt, als hättest du gestern tolle Fortschritte gemacht, Istvan! Was ist dein Hauptziel für heute und siehst du architektonische Herausforderungen?',
            suggestions: [
              'Today my focus is on finishing the REST API endpoints.',
              'I plan to refactor the service layer and improve modularity.',
              'No blockers today, I expect to finish the user story before four.'
            ]
          },
          {
            id: 'su_gen_2',
            en: 'That aligns perfectly with our sprint velocity! Keep up the momentum. Is there any dependency on other teams that we need to coordinate?',
            de: 'Das passt perfekt zu unserer Sprint-Geschwindigkeit! Mach weiter so. Gibt es Abhängigkeiten zu anderen Teams, die wir abstimmen müssen?',
            suggestions: [
              'No external dependencies, everything is within our team scope.',
              'The frontend team is waiting for my API payload specification.',
              'Everything is on track for our sprint demo on Friday.'
            ]
          },
          {
            id: 'su_gen_3',
            en: 'Awesome! We are in great shape for the upcoming sprint review. Thanks for the clear update, Istvan!',
            de: 'Großartig! Wir stehen für das kommende Sprint-Review bestens da. Danke für das klare Update, Istvan!',
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
            en: 'That sounds very comprehensive! Which programming languages and databases have you worked with the most during your training as an application developer?',
            de: 'Das klingt sehr fundiert! Mit welchen Programmiersprachen und Datenbanken hast du während deiner Fachinformatiker-Ausbildung am meisten gearbeitet?',
            suggestions: [
              'I have hands-on experience with Java, Python, and SQL databases.',
              'I specialize in object-oriented programming, REST APIs, and clean code.',
              'I have built database-driven applications using relational schemas.'
            ]
          },
          {
            id: 'int_exp_2',
            en: 'Impressive! Could you give me an example of a challenging programming problem you solved recently, and how you approached the solution?',
            de: 'Beeindruckend! Könntest du mir ein Beispiel für ein kniffliges Programmierproblem nennen, das du kürzlich gelöst hast, und wie du vorgegangen bist?',
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
            en: 'Collaboration and code quality are essential for our engineering team. How do you approach receiving constructive feedback during peer code reviews?',
            de: 'Zusammenarbeit und Codequalität sind für unser Team unverzichtbar. Wie gehst du mit konstruktivem Feedback in Code Reviews um?',
            suggestions: [
              'I appreciate constructive feedback because it improves our codebase.',
              'I treat code reviews as a valuable learning opportunity from peers.',
              'I discuss architectural trade-offs openly and respectfully with teammates.'
            ]
          },
          {
            id: 'int_team_2',
            en: 'That demonstrates great professional maturity. How do you handle situations when project requirements change abruptly or deadlines are tight?',
            de: 'Das beweist große berufliche Reife. Wie gehst du mit Situationen um, in denen sich Anforderungen plötzlich ändern oder Deadlines knapp sind?',
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
            en: 'What made you choose application development as your profession, and where do you see your technical focus in the next few years?',
            de: 'Was hat dich dazu bewogen, Anwendungsentwicklung zu deinem Beruf zu machen, und wo siehst du deinen Schwerpunkt in den nächsten Jahren?',
            suggestions: [
              'I love solving complex problems with logic and writing software that helps people.',
              'I want to specialize in scalable backend architectures and cloud technologies.',
              'Continuous learning is what excites me most about software engineering.'
            ]
          },
          {
            id: 'int_mot_2',
            en: 'Your enthusiasm and clear technical understanding are exactly what we look for in our developers. Do you have any questions for us regarding our technology stack or development culture?',
            de: 'Deine Begeisterung und dein klares technisches Verständnis sind genau das, was wir suchen. Hast du Fragen zu unserem Tech-Stack oder unserer Entwicklungskultur?',
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
            en: 'Thanks for taking the lead on this ticket, Istvan! The database timeouts are impacting checkout during peak hours. Could you inspect the connection pool metrics in Grafana first?',
            de: 'Danke, dass du die Führung bei diesem Ticket übernimmst, Istvan! Die Datenbank-Timeouts beeinträchtigen den Checkout. Könntest du zuerst die Verbindungspool-Metriken in Grafana prüfen?',
            suggestions: [
              'I am checking the database connection pool metrics right now.',
              'The pool seems maxed out at 50 connections with high query wait times.',
              'I will run EXPLAIN on the checkout query to see why it locks rows.'
            ]
          },
          {
            id: 'sup_db_2',
            en: 'That confirms our suspicion! An unindexed table scan was holding connection locks for too long. Can you prepare a hotfix with a composite index on the orders table?',
            de: 'Das bestätigt unseren Verdacht! Ein Tabellenscan ohne Index hielt die Verbindungen zu lange blockiert. Kannst du einen Hotfix mit einem Index auf der Orders-Tabelle vorbereiten?',
            suggestions: [
              'I prepared the migration script and tested it locally without errors.',
              'The query execution dropped from 2 seconds to under 10 milliseconds.',
              'I opened an urgent hotfix PR and tagged the lead architect for review.'
            ]
          },
          {
            id: 'sup_db_3',
            en: 'Outstanding turnaround time! The deployment pipeline finished, and production response times are back to normal. Let\'s document our findings in a quick post-mortem summary.',
            de: 'Hervorragende Reaktionszeit! Die Pipeline ist durch und die Produktionszeiten sind wieder normal. Lass uns die Erkenntnisse kurz im Post-Mortem dokumentieren.',
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
            en: 'Welcome Istvan! We want to refactor our monolithic service layer. How would you apply the Single Responsibility Principle to break up our 2,000-line OrderManager class?',
            de: 'Willkommen Istvan! Wir wollen unsere monolithische Service-Schicht umbauen. Wie würdest du das Single-Responsibility-Prinzip anwenden, um die 2.000 Zeilen lange OrderManager-Klasse aufzuteilen?',
            suggestions: [
              'I would split it into dedicated classes: OrderValidation, OrderPricing, and OrderRepository.',
              'We should extract interfaces so each service component has a single reason to change.',
              'Pairing this with comprehensive unit tests ensures we don\'t break existing business logic.'
            ]
          },
          {
            id: 'arch_clean_2',
            en: 'Spot on! Separating validation, pricing calculation, and data persistence decouples our business logic. What are your thoughts on using Dependency Injection to wire these components together?',
            de: 'Volltreffer! Die Trennung von Validierung, Preiskalkulation und Persistenz entkoppelt unsere Geschäftslogik. Was hältst du vom Einsatz von Dependency Injection zur Verknüpfung?',
            suggestions: [
              'Dependency Injection is crucial because it allows us to mock dependencies easily in unit tests.',
              'It keeps our classes loosely coupled and adheres to the Inversion of Control principle.',
              'I have used Constructor Injection in Java and it makes code very maintainable.'
            ]
          },
          {
            id: 'arch_clean_3',
            en: 'Your architectural intuition is top notch, Istvan! When building RESTful APIs, how do you ensure clear response structures and proper HTTP status code handling?',
            de: 'Deine architektonische Intuition ist erstklassig, Istvan! Wie stellst du beim Entwurf von REST-APIs klare Antwortstrukturen und saubere HTTP-Statuscodes sicher?',
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
            en: 'Producing electronic music sounds like such a fascinating hobby, Istvan! What digital audio workstation do you use, and do you enjoy sound design or composing melodies more?',
            de: 'Elektronische Musik zu produzieren klingt nach einem faszinierenden Hobby, Istvan! Welche DAW nutzt du und macht dir Sounddesign oder das Melodienkomponieren mehr Spaß?',
            suggestions: [
              'I use a DAW and software synthesizers to sculpt unique basslines and melodies.',
              'I enjoy designing custom synth patches with oscillators, filters, and audio effects.',
              'Making beats and arranging tracks is a great creative outlet after a day of coding.'
            ]
          },
          {
            id: 'st_music_2',
            en: 'That is really cool. There is actually a strong psychological connection between music production and programming – both require structured logic and creative problem solving!',
            de: 'Das ist echt cool. Es gibt eine starke Verbindung zwischen Musikproduktion und Programmieren – beides erfordert logische Struktur und kreative Problemlösung!',
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
            en: 'Taking regular coffee and screen breaks is so important in software development! How is your week going so far with the new project tasks?',
            de: 'Regelmäßige Kaffee- und Bildschirmpausen sind in der Softwareentwicklung so wichtig! Wie läuft deine Woche bisher mit den neuen Projektaufgaben?',
            suggestions: [
              'My week is going really well, making steady progress on my sprint backlog.',
              'Taking a short walk away from the monitors definitely clears my head.',
              'A good cup of coffee always boosts my problem-solving energy!'
            ]
          },
          {
            id: 'st_coffee_2',
            en: 'The weather forecast for the weekend looks absolutely sunny and pleasant too! Do you have any plans to get outside or attend any tech meetups?',
            de: 'Der Wetterbericht fürs Wochenende sieht auch absolut sonnig und angenehm aus! Hast du Pläne rauszugehen oder ein Technik-Meetup zu besuchen?',
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
            en: 'Good day Mr. Csovrij! I see your reservation for three nights in our executive suite. May I assist you with your luggage or provide a map of Central London?',
            de: 'Guten Tag Herr Csovrij! Ich sehe Ihre Reservierung für drei Nächte in unserer Executive Suite. Darf ich Ihnen mit dem Gepäck helfen oder einen Stadtplan geben?',
            suggestions: [
              'Thank you! Here is my passport and booking confirmation.',
              'Could you tell me what time complimentary breakfast is served in the morning?',
              'What is the easiest way to take the Underground to Shoreditch from here?'
            ]
          },
          {
            id: 'trv_lon_2',
            en: 'Certainly! Breakfast is served in our restaurant from 7:00 to 10:30 AM. To get to Shoreditch, simply take the Central Line to Bank and change for the Northern Line to Old Street.',
            de: 'Sehr gerne! Frühstück wird im Restaurant von 7:00 bis 10:30 Uhr serviert. Nach Shoreditch nehmen Sie einfach die Central Line bis Bank und steigen in die Northern Line nach Old Street um.',
            suggestions: [
              'That is very clear and convenient, thank you for the directions!',
              'Can I pay on the Underground with my contactless credit card or phone?',
              'Could you also recommend an authentic British restaurant for dinner tonight?'
            ]
          },
          {
            id: 'trv_lon_3',
            en: 'Yes, contactless payment or Apple Pay is accepted at all station barriers! For dinner, I highly recommend "The George", an authentic historic restaurant just two blocks down the avenue.',
            de: 'Ja, kontaktloses Bezahlen oder Apple Pay funktioniert an allen Schranken! Fürs Abendessen empfehle ich "The George", ein authentisches historisches Restaurant nur zwei Straßen weiter.',
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
            en: 'That is very interesting, Istvan! Tell me more about that. How do you apply this in your daily programming work or personal routine?',
            de: 'Das ist sehr interessant, Istvan! Erzähl mir mehr darüber. Wie wendest du das in deiner täglichen Programmierarbeit oder deinem Alltag an?',
            suggestions: [
              'In my daily routine, I balance intensive coding with continuous learning.',
              'I focus on writing readable code with clean architecture and automated tests.',
              'I find that discussing technical concepts in English builds immense confidence.'
            ]
          },
          {
            id: 'fr_2',
            en: 'You express your thoughts very clearly in English! What area of software engineering do you find most fascinating right now?',
            de: 'Du drückst deine Gedanken auf Englisch sehr klar aus! Welches Gebiet der Softwaretechnik findest du im Moment am faszinierendsten?',
            suggestions: [
              'I am fascinated by scalable backend microservices and efficient database design.',
              'I love how agile Scrum frameworks enable collaborative and iterative development.',
              'I enjoy exploring how algorithmic patterns improve application performance.'
            ]
          },
          {
            id: 'fr_3',
            en: 'That is a great perspective. Continuous practice and curiosity are the best ingredients for becoming an outstanding software engineer. What goal are you working towards next?',
            de: 'Das ist eine tolle Perspektive. Kontinuierliche Übung und Neugier sind die besten Zutaten für einen herausragenden Softwareentwickler. An welchem Ziel arbeitest du als Nächstes?',
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
    normalizeInput(raw) {
      let t = (raw || '').toLowerCase().trim();
      t = t.replace(/[\?\,\.\!\:\;]/g, ' $& ');
      const typoMap = {
        'wath': 'what', 'waht': 'what', 'wat': 'what', 'whot': 'what', 'wut': 'what',
        'mornig': 'morning', 'mornin': 'morning', 'gud': 'good', 'godd': 'good',
        'yuor': 'your', 'yor': 'your', 'ur': 'your', 'nam': 'name', 'naem': 'name',
        'who r u': 'who are you', 'how r u': 'how are you', 'hw': 'how', 'pls': 'please', 'plz': 'please',
        'dont': "don't", 'didnt': "didn't", 'cant': "can't", 'wont': "won't", 'im': 'i am'
      };
      const words = t.split(/\s+/).filter(Boolean);
      const normalizedWords = words.map(w => typoMap[w] || w);
      return normalizedWords.join(' ');
    },

    getPartnerMeta(scenarioId) {
      const meta = {
        standup: { name: 'Sarah', role: 'Scrum Master & Agile Coach', desc: 'Daily Scrum Standup' },
        interview: { name: 'Mr. Davis', role: 'Lead Software Architect', desc: 'IT-Vorstellungsgespräch' },
        support: { name: 'Alex', role: 'Senior Product Manager', desc: 'Bug-Report & Ticket Support' },
        architecture: { name: 'David', role: 'Senior Cloud Solutions Architect', desc: 'System-Architektur Review' },
        smalltalk: { name: 'Mark', role: 'Senior Developer & Teammate', desc: 'Kaffeepause & Smalltalk' },
        travel: { name: 'James', role: 'Head Concierge at Royal Grand Hotel', desc: 'Hotel & London Reisen' },
        free: { name: 'AI English Coach', role: 'Persönlicher Sprachtrainer', desc: 'Freie Konversation' },
        quiz: { name: 'Prof. Miller', role: 'Vokabel-Coach', desc: 'Vokabel-Prüfer & Quiz' }
      };
      return meta[scenarioId] || meta.standup;
    },

    detectDirectIntent(rawInput, scenarioId) {
      const norm = this.normalizeInput(rawInput);
      const meta = this.getPartnerMeta(scenarioId);

      // 1. Asking for Partner's Name / Identity ("What is your name?", "wath is your name?", "who are you?")
      if (/\b(what|tell|may|can)\b.*\b(your|ur)\s+(name|naem)\b/i.test(norm) ||
          /\bwho\s+(are\s+you|is\s+this|am\s+i\s+talking\s+to)\b/i.test(norm) ||
          /\bwhats\s+your\s+name\b/i.test(norm) ||
          /\bname\s*\?/i.test(norm)) {
        if (scenarioId === 'standup') {
          return {
            id: 'intent_name_standup',
            en: `Good morning Istvan! My name is ${meta.name}, and I am the ${meta.role} for our development team. Nice to meet you! How did your work go yesterday?`,
            de: `Guten Morgen Istvan! Mein Name ist ${meta.name} und ich bin die ${meta.role} für unser Entwicklerteam. Schön dich kennenzulernen! Wie lief deine Arbeit gestern?`,
            suggestions: [
              "Nice to meet you, Sarah! Yesterday I fixed an issue in our codebase.",
              "Good morning Sarah! Yesterday I worked on the database queries.",
              "Hello Sarah, what is the main goal for today's sprint?"
            ]
          };
        } else if (scenarioId === 'interview') {
          return {
            id: 'intent_name_interview',
            en: `Hello Istvan, my name is ${meta.name}. I am the ${meta.role} conducting your technical interview today. Nice to meet you! Are you ready to tell me about yourself?`,
            de: `Hallo Istvan, mein Name ist ${meta.name}. Ich bin der ${meta.role} und führe heute dein Vorstellungsgespräch. Schön dich kennenzulernen! Möchtest du dich kurz vorstellen?`,
            suggestions: [
              "Nice to meet you Mr. Davis! I would love to introduce myself.",
              "Hello Mr. Davis! I have prepared a summary of my technical skills.",
              "I am ready! I can explain my background in software development."
            ]
          };
        } else if (scenarioId === 'support') {
          return {
            id: 'intent_name_support',
            en: `Hi Istvan! My name is ${meta.name}, and I am the ${meta.role} managing our production incidents. Thanks for jumping in! Have you seen the latest error logs?`,
            de: `Hi Istvan! Mein Name ist ${meta.name} und ich bin der ${meta.role} für unsere Produktionsvorfälle. Danke fürs Dazukommen! Hast du die neuesten Fehler-Logs gesehen?`,
            suggestions: [
              "Hi Alex! Yes, I am analyzing the server logs right now.",
              "Hello Alex! What is the severity of this production bug?",
              "I will check the error stack trace immediately."
            ]
          };
        } else if (scenarioId === 'smalltalk') {
          return {
            id: 'intent_name_smalltalk',
            en: `Hey Istvan! I'm ${meta.name}, your teammate from the backend team. Great to chat over a coffee! How is your week going so far?`,
            de: `Hey Istvan! Ich bin ${meta.name}, dein Kollege aus dem Backend-Team. Schön, beim Kaffee zu quatschen! Wie läuft deine Woche bisher?`,
            suggestions: [
              "Nice to meet you Mark! My week has been busy but good.",
              "Hey Mark! Coffee is definitely needed today. How about you?",
              "Doing well! Did you get a chance to work on your music projects?"
            ]
          };
        } else if (scenarioId === 'travel') {
          return {
            id: 'intent_name_travel',
            en: `Good day, sir! My name is ${meta.name}, and I am the ${meta.role} here at the Royal Grand Hotel in London. How may I be of service to you today?`,
            de: `Guten Tag, mein Herr! Mein Name ist ${meta.name} und ich bin der ${meta.role} hier im Royal Grand Hotel in London. Wie kann ich Ihnen heute behilflich sein?`,
            suggestions: [
              "Good day James! I would like to check into my room, please.",
              "Hello James! Could you recommend a good English restaurant nearby?",
              "Could you please tell me how to get to the Underground station?"
            ]
          };
        } else {
          return {
            id: 'intent_name_generic',
            en: `Hello Istvan! My name is ${meta.name}, and I am your ${meta.role}. It's a pleasure to speak with you! What would you like to discuss today?`,
            de: `Hallo Istvan! Mein Name ist ${meta.name} und ich bin dein ${meta.role}. Es ist mir eine Freude mit dir zu sprechen! Worüber möchtest du heute sprechen?`,
            suggestions: [
              `Nice to meet you, ${meta.name}!`,
              "I would like to practice my daily English conversation.",
              "Could you explain an IT concept to me?"
            ]
          };
        }
      }

      // 2. Asking "How are you? / How are you doing?"
      if (/\b(how\s+are\s+you|how\s+r\s+u|how\s+is\s+it\s+going|how\s+are\s+things|how\s+do\s+you\s+do)\b/i.test(norm)) {
        return {
          id: 'intent_how_are_you',
          en: `Good morning Istvan! I am doing very well, thank you for asking! How are you doing today, and are you ready for our ${meta.desc}?`,
          de: `Guten Morgen Istvan! Mir geht es sehr gut, vielen Dank der Nachfrage! Wie geht es dir heute und bist du bereit für unser ${meta.desc}?`,
          suggestions: [
            "I am doing great, thank you! Ready to start.",
            "A bit tired, but looking forward to today's tasks.",
            "Good morning! What should we focus on first?"
          ]
        };
      }

      // 3. Simple greeting (Hello, Good morning, Hi) without technical update
      if (/^\s*(good\s+morning|good\s+afternoon|good\s+day|hello|hi|hey)\s*[\!\.\,]*\s*$/i.test(norm)) {
        return {
          id: 'intent_greeting_simple',
          en: `Good morning Istvan! Great to see you. How is your day going so far? Let's get started with our ${meta.desc}.`,
          de: `Guten Morgen Istvan! Schön dich zu sehen. Wie läuft dein Tag bisher? Lass uns mit unserem ${meta.desc} starten.`,
          suggestions: [
            "Good morning! I am ready to give my update.",
            "Hello! Everything is going smoothly today.",
            "Good morning! What is the main priority for today?"
          ]
        };
      }

      // 4. Questions about the Partner's Job / Role ("What is your job?", "What do you do?")
      if (/\b(what\s+do\s+you\s+do|what\s+is\s+your\s+job|what\s+is\s+your\s+role|what\s+are\s+you\s+doing)\b/i.test(norm)) {
        if (scenarioId === 'standup') {
          return {
            id: 'intent_role_standup',
            en: `As your Scrum Master, my job is to facilitate agile meetings, remove blockers for developers like you, and ensure our sprint stays on track. How can I support your tasks today?`,
            de: `Als dein Scrum Master ist es meine Aufgabe, agile Meetings zu leiten, Hindernisse für Entwickler wie dich aus dem Weg zu räumen und den Sprint-Zeitplan zu sichern. Wie kann ich dich heute unterstützen?`,
            suggestions: [
              "I have a blocker with database credentials.",
              "Everything is on track, no blockers today.",
              "Could we review our sprint board together?"
            ]
          };
        } else {
          return {
            id: 'intent_role_generic',
            en: `I work as a ${meta.role}. In this session, my goal is to help you practice technical communication in English. How are you feeling about your progress?`,
            de: `Ich arbeite als ${meta.role}. In dieser Sitzung ist es mein Ziel, dir beim Üben technischer englischer Kommunikation zu helfen. Wie fühlst du dich bei deinen Fortschritten?`,
            suggestions: [
              "I feel I am improving step by step.",
              "Technical vocabulary is challenging, but I am learning.",
              "Let's practice some more questions!"
            ]
          };
        }
      }

      // 5. Questions about Standup / "What are we doing in this meeting?"
      if (/\b(what\s+are\s+we\s+doing|what\s+is\s+this\s+meeting|what\s+is\s+standup|what\s+is\s+scrum|what\s+should\s+i\s+say|what\s+should\s+i\s+do|explain\s+standup)\b/i.test(norm)) {
        return {
          id: 'intent_explain_standup',
          en: `In a Daily Standup, the team does a quick 15-minute sync. Every developer answers three simple questions: 1. What did you accomplish yesterday? 2. What will you do today? 3. Do you have any blockers? For example: 'Yesterday I worked on code, today I will test it, no blockers.' Give it a try!`,
          de: `In einem Daily Standup stimmt sich das Team kurz 15 Minuten ab. Jeder Entwickler beantwortet drei einfache Fragen: 1. Was hast du gestern geschafft? 2. Was machst du heute? 3. Gibt es Blocker? Z.B.: 'Yesterday I worked on code, today I will test it, no blockers.' Probier es einfach aus!`,
          suggestions: [
            "Yesterday I fixed a bug, today I will write tests, no blockers.",
            "Yesterday I worked on database queries, today I continue.",
            "I am waiting for credentials, so I am currently blocked."
          ]
        };
      }

      // 6. Asking for Help / "I don't understand / Repeat please"
      if (/\b(i\s+don'?t\s+understand|i\s+do\s+not\s+understand|can\s+you\s+help\s+me|help\s+me|what\s+did\s+you\s+say|repeat\s+please|could\s+you\s+repeat|i\s+am\s+confused|auf\s+deutsch)\b/i.test(norm)) {
        return {
          id: 'intent_help_needed',
          en: `No worries at all, Istvan! Take your time. You can speak in simple words, or tap one of the suggested answers below. You can also ask me questions in German whenever you like! What would you like to say?`,
          de: `Keine Sorge, Istvan! Lass dir Zeit. Du kannst in einfachen Worten sprechen oder unten auf die Antwortvorschläge tippen. Du kannst mich auch auf Deutsch fragen, wenn du möchtest! Was möchtest du sagen?`,
          suggestions: [
            "Yesterday I worked on my programming tasks.",
            "Could you explain that in simpler words, please?",
            "I am ready to try again in English."
          ]
        };
      }

      // 7. Asking about German Language ("Do you speak German?")
      if (/\b(german|deutsch|speak\s+german|understand\s+german)\b/i.test(norm)) {
        return {
          id: 'intent_speak_german',
          en: `Yes, absolutely! I understand both English and German. We can chat in English to train your speaking skills, and whenever you need an explanation, I will provide it in German. What would you like to practice?`,
          de: `Ja, absolut! Ich verstehe sowohl Englisch als auch Deutsch. Wir können auf Englisch chatten, um deine Sprachpraxis zu trainieren, und wenn du eine Erklärung brauchst, gebe ich sie dir auf Deutsch. Was möchtest du üben?`,
          suggestions: [
            "Let's practice the daily standup in English.",
            "Could you quiz me on English IT vocabulary?",
            "I would like to practice job interview questions."
          ]
        };
      }

      // 8. Technical Questions ("What is SQL / Git / Python / Docker / Index?")
      if (/\b(what\s+is|explain|tell\s+me\s+about)\b.*\b(sql|python|git|docker|api|database|bug|index|test|pipeline|linux)\b/i.test(norm)) {
        if (norm.includes('sql')) {
          return {
            id: 'intent_tech_sql',
            en: `SQL stands for Structured Query Language. It is the standard language for relational databases like PostgreSQL and MySQL to query, insert, and update data. Would you like to practice SQL queries?`,
            de: `SQL steht für Structured Query Language. Es ist die Standardsprache für relationale Datenbanken wie PostgreSQL und MySQL, um Daten abzufragen, einzufügen und zu aktualisieren. Möchtest du SQL-Abfragen üben?`,
            suggestions: [
              "I use SELECT and JOIN queries frequently.",
              "Indexes make SQL queries much faster.",
              "Could you show me an example SQL query?"
            ]
          };
        } else if (norm.includes('git')) {
          return {
            id: 'intent_tech_git',
            en: `Git is a distributed version control system. It tracks changes in source code and allows developers to collaborate using branches, commits, and pull requests. Do you use Git every day?`,
            de: `Git ist ein verteiltes Versionskontrollsystem. Es verfolgt Code-Änderungen und ermöglicht Entwicklern die Zusammenarbeit über Branches, Commits und Pull Requests. Nutzt du Git täglich?`,
            suggestions: [
              "I commit my changes regularly to git.",
              "Pull requests are great for code reviews.",
              "I recently resolved a merge conflict."
            ]
          };
        } else if (norm.includes('python')) {
          return {
            id: 'intent_tech_python',
            en: `Python is a high-level, interpreted programming language known for its clean, readable syntax and versatile libraries. It is widely used in backend development, automation, and AI. Have you written Python code?`,
            de: `Python ist eine höhere, interpretierte Programmiersprache, die für ihre saubere, lesbare Syntax und vielseitigen Bibliotheken bekannt ist. Hast du schon Python-Code geschrieben?`,
            suggestions: [
              "Yes, I write Python scripts for automation.",
              "Python syntax is very readable and beginner-friendly.",
              "I use Python along with SQL for data processing."
            ]
          };
        } else if (norm.includes('index')) {
          return {
            id: 'intent_tech_index',
            en: `A database index is a data structure (like a B-Tree) that speeds up data retrieval operations on a table at the cost of additional storage and slower writes. Do you use indexes on primary keys?`,
            de: `Ein Datenbank-Index ist eine Datenstruktur (wie ein B-Baum), die Abfragen auf einer Tabelle stark beschleunigt, auf Kosten von zusätzlichem Speicherplatz. Nutzt du Indizes auf Primärschlüsseln?`,
            suggestions: [
              "Yes, primary keys are indexed automatically.",
              "Composite indexes speed up multi-column queries.",
              "Too many indexes can slow down INSERT operations."
            ]
          };
        } else {
          return {
            id: 'intent_tech_generic',
            en: `In software engineering, understanding technical architecture and clean code principles is fundamental for your FIAE AP 1 qualification. Which technology do you want to explore next?`,
            de: `In der Softwareentwicklung ist das Verständnis von technischer Architektur und Clean-Code-Prinzipien grundlegend für deine FIAE AP 1 Qualifikation. Welche Technologie möchtest du als Nächstes vertiefen?`,
            suggestions: [
              "I want to improve my database design skills.",
              "I am focusing on automated unit testing.",
              "Continuous integration pipelines are very interesting."
            ]
          };
        }
      }

      // 9. Status: Off / Vacation / Weekend / Sick leave
      if (/\b(vacation|holiday|day\s+off|weekend|sick|was\s+ill|was\s+off)\b/i.test(norm)) {
        return {
          id: 'intent_status_off',
          en: `Welcome back, Istvan! I hope you had some good rest. What is your main priority to get started with today?`,
          de: `Willkommen zurück, Istvan! Ich hoffe, du konntest dich gut erholen. Was ist deine wichtigste Aufgabe für den Einstieg heute?`,
          suggestions: [
            "Today I am catching up on unread emails and tickets.",
            "I am starting work on the authentication module.",
            "I have no blockers today."
          ]
        };
      }

      // 10. Status: No blockers
      if (/\b(no\s+blocker|no\s+blockers|no\s+problem|everything\s+is\s+fine|all\s+good|no\s+issues)\b/i.test(norm)) {
        return {
          id: 'intent_no_blockers',
          en: `That's fantastic news, Istvan! Having no blockers means smooth sailing. What feature or ticket are you tackling next?`,
          de: `Das sind fantastische Neuigkeiten, Istvan! Keine Blocker bedeutet freie Bahn. Welches Feature oder Ticket gehst du als Nächstes an?`,
          suggestions: [
            "I will continue refactoring the backend service.",
            "I will write unit tests for the API endpoints.",
            "I plan to finish this user story by the end of the day."
          ]
        };
      }

      // 11. General direct question ending with '?'
      if (rawInput.includes('?')) {
        return {
          id: 'intent_general_question',
          en: `That is an interesting question, Istvan! In our ${meta.desc}, my goal is to guide you and answer your questions. Could you tell me a little bit more about what you have in mind?`,
          de: `Das ist eine interessante Frage, Istvan! In unserem ${meta.desc} ist es mein Ziel, dich zu unterstützen und deine Fragen zu beantworten. Kannst du mir etwas mehr darüber erzählen?`,
          suggestions: [
            "I wanted to ask about our sprint priorities.",
            "I was wondering about our deployment schedule.",
            "Let's continue with our normal update."
          ]
        };
      }

      return null;
    },

    // Hauptfunktion: Erkennt direkte Fragen, Themen, Turn-Zähler und wählt treffsichere Antworten
    generateResponse(userInput, scenarioId) {
      this.state.turnCount++;
      const lower = userInput.toLowerCase();
      const scenario = this.scenarios[scenarioId] || this.scenarios.standup;
      const meta = this.getPartnerMeta(scenarioId);

      // 1. ZUERST: Prüfen auf direkte Fragen & Gesprächsabsichten (Name, Begrüßung, Rolle, Hilfe, etc.)
      const directReply = this.detectDirectIntent(userInput, scenarioId);
      if (directReply) {
        return directReply;
      }

      // 2. Falls keine direkte Frage: Thema anhand von Schlüsselwörtern ermitteln
      let topicList = [];

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
      if (lower.includes('music') || lower.includes('synth') || lower.includes('beat') || lower.includes('studio') || lower.includes('daw') || lower.includes('hobby')) {
        topicList.push('music_hobby');
      }
      if (lower.includes('coffee') || lower.includes('break') || lower.includes('weather') || lower.includes('weekend') || lower.includes('tired')) {
        topicList.push('coffee_break');
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

      // 4. INTELLIGENTER KONVERSATIONS-FALLBACK (Kein blindes Ausgeben von Datenbankoptimierung mehr!)
      if (scenarioId === 'standup') {
        return {
          id: 'standup_open_fallback_' + this.state.turnCount,
          en: `Thanks for the update, Istvan! What are you planning to work on today, and do you foresee any blockers?`,
          de: `Danke für dein Update, Istvan! Woran planst du heute zu arbeiten und siehst du irgendwelche Hindernisse (Blocker)?`,
          suggestions: [
            "Today I will implement the new API endpoints.",
            "I plan to write automated unit tests for our service.",
            "I have no blockers and everything is on track."
          ]
        };
      } else if (scenarioId === 'interview') {
        return {
          id: 'interview_open_fallback_' + this.state.turnCount,
          en: `Thank you for sharing that, Istvan. Could you tell me about a challenging technical problem you solved recently?`,
          de: `Vielen Dank für deine Ausführung, Istvan. Könntest du mir von einem anspruchsvollen technischen Problem erzählen, das du kürzlich gelöst hast?`,
          suggestions: [
            "I resolved a performance issue in our SQL database.",
            "I refactored legacy code to follow clean architecture principles.",
            "I designed an automated continuous integration pipeline."
          ]
        };
      } else {
        return {
          id: 'generic_open_fallback_' + this.state.turnCount,
          en: `That sounds very interesting, Istvan! How would you like to continue our conversation in ${meta.desc}?`,
          de: `Das klingt sehr interessant, Istvan! Wie möchtest du unser Gespräch in ${meta.desc} fortsetzen?`,
          suggestions: [
            "I would like to practice technical English terms.",
            "Could we practice some more questions and answers?",
            "Let's move on to the next topic."
          ]
        };
      }
    }
  };

  // Rückwärtskompatible Wrapper-Funktion
  function generatePartnerResponse(userInput, scenarioId) {
    return DialogEngine.generateResponse(userInput, scenarioId);
  }

  // --- INITIALISIERUNG DES DIALOG-VIEWS ---
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

    // Erstes Szenario starten
    switchDialogScenario('standup');
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
        textEn: `Hello Istvan! Let's test your vocabulary. ${firstQ.en}`,
        textDe: `Hallo Istvan! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische IT- & Fachbegriffe und du nennst mir die deutsche Bedeutung!

👉 Wie lautet die deutsche Bedeutung von:
**"${firstQ.vocabItem.english}"**?
*(Kategorie: ${firstQ.vocabItem.categoryName})*`,
        suggestions: firstQ.suggestions
      };
      dialogHistories[scenarioId].push(initialPartnerMsg);
      renderChatLog(scenarioId);
      if (currentDialogMode === 'voice') {
        speakEnglish(firstQ.vocabItem.english);
      }
      return;
    }

    // Initiale Begrüßungsnachricht des Partners
    const initialPartnerMsg = {
      type: 'partner',
      sender: scenario.partnerName,
      textEn: scenario.initialPrompt,
      textDe: scenario.initialPromptDe,
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
    const isQuizIntent = /(abfrag|frage.*mich|teste.*mich|quiz|vokabeln.*abfrag|wörter.*abfrag|teste.*mein.*englisch|wörter.*fragen|vokabeltest)/i.test(text);
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

    // Antwort des Partners generieren
    const partnerReply = generatePartnerResponse(text, scenarioId);
    dialogHistories[scenarioId].push({
      type: 'partner',
      sender: scenario.partnerName,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      suggestions: partnerReply.suggestions
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
