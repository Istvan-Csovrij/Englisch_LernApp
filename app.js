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

  // --- SOUND EFFECTS VIA WEB AUDIO API ---
  function playSound(type) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

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

  // --- AUDIO & SPEECH SYNTHESIS (VORLESEN) ---
  function speakEnglish(text, rate = 1.0) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe im Browser nicht unterstützt.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) {
      utterance.voice = enVoice;
    }
    window.speechSynthesis.speak(utterance);
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


  // ============================================================
  // 5. DIALOG-COACH & SATZ-DOKTOR LOGIK
  // ============================================================
  let currentDialogMode = 'text'; // 'text' oder 'voice'
  let currentScenarioId = 'standup';
  let dialogHistories = {};
  let dialogInitialized = false;

  // --- DER GRAMMATIK- & SATZ-DOKTOR (CLIENT-SEITIGE ANALYSE) ---
  const SentenceDoctor = {
    // Erkennt deutsche Sätze / Wörter
    germanWords: [
      'ich', 'habe', 'arbeitete', 'gestern', 'mein', 'meine', 'warum', 'dass', 'nicht',
      'bitte', 'ja', 'nein', 'gut', 'danke', 'wir', 'sie', 'heute', 'morgen', 'frage',
      'problem', 'fehler', 'gemacht', 'gearbeitet', 'datenbank', 'entwicklung', 'entwickler'
    ],

    analyze(text) {
      const clean = text.trim();
      if (!clean) return null;

      const lower = clean.toLowerCase();
      const words = lower.replace(/[^a-zäöüß0-9\s]/g, '').split(/\s+/).filter(Boolean);

      // 1. Prüfen auf deutsche Eingabe
      const germanCount = words.filter(w => this.germanWords.includes(w)).length;
      if (germanCount >= 2 || (words.length <= 3 && germanCount >= 1)) {
        return {
          hasError: true,
          isGerman: true,
          originalText: clean,
          correctedText: this.translateGermanInput(clean),
          explanation: '⚠️ Du hast auf Deutsch geschrieben! Versuche deinen Gedanken auf Englisch zu formulieren. Sieh dir oben den englischen Satz an.'
        };
      }

      // 2. Regel-Prüfungen auf häufige Grammatik- & Sprachfehler
      let corrected = clean;
      let hasError = false;
      let explanation = '';

      // Regel A: "become" vs "get / receive" (Klassischer False Friend)
      const becomeMatch = lower.match(/\b(i|we|they|he|she|you)\s+(become|became)\s+(a|an|the|some|my)?\s*(coffee|tea|job|ticket|email|message|problem|question|task|bug|update)\b/i);
      if (becomeMatch) {
        hasError = true;
        const past = becomeMatch[2].toLowerCase() === 'became';
        const replacementVerb = past ? 'got' : 'get';
        corrected = corrected.replace(new RegExp(becomeMatch[2], 'i'), replacementVerb);
        explanation = '⚠️ <strong>False Friend:</strong> <em>"become"</em> heißt auf Deutsch <strong>"werden"</strong>, NICHT "bekommen"! Verwende im Englischen <strong>"get"</strong> oder <strong>"receive"</strong> (z. B. <em>"I get a ticket"</em>).';
      }

      // Regel B: "make" vs "do/run/conduct"
      if (!hasError && /\b(make|making|made)\s+(a\s+)?(test|code review|sports|homework|query)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bmake\s+(a\s+)?test\b/i, 'run a test')
                             .replace(/\bmade\s+(a\s+)?test\b/i, 'ran a test')
                             .replace(/\bmake\s+(a\s+)?code review\b/i, 'conduct a code review')
                             .replace(/\bmake\s+homework\b/i, 'do homework')
                             .replace(/\bmake\s+sports\b/i, 'do sports');
        explanation = '💡 Im Englischen sagt man <strong>"run a test"</strong>, <strong>"conduct a code review"</strong> oder <strong>"do homework"</strong>, nicht "make".';
      }

      // Regel C: "since" vs "for" (Dauer vs Zeitpunkt)
      if (!hasError && /\bsince\s+(\d+|one|two|three|four|five|several|many|a\s+few)\s+(minutes|hours|days|weeks|months|years)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bsince\s+/i, 'for ');
        explanation = '💡 <strong>Since vs. For:</strong> Zeitspannen (Dauer wie <em>"for 3 years"</em>) stehen immer mit <strong>"for"</strong>. <strong>"since"</strong> nutzt man nur für feste Startzeitpunkte (z. B. <em>"since yesterday"</em>).';
      }

      // Regel D: "for yesterday" / "for last week"
      if (!hasError && /\bfor\s+(yesterday|last\s+week|last\s+month|last\s+year)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bfor\s+/i, 'since ');
        explanation = '💡 Bei festen Zeitpunkten in der Vergangenheit nutzen wir <strong>"since"</strong> (z. B. <em>"since yesterday"</em>), niemals "for".';
      }

      // Regel E: Relativpronomen "who" vs "which/that" für Dinge
      if (!hasError && /\b(the|a)\s+(computer|code|bug|database|server|program|ticket|script|query)\s+who\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bwho\b/i, 'which');
        explanation = '💡 <strong>"who"</strong> bezieht sich im Englischen ausschließlich auf Menschen/Personen. Für Dinge (Server, Code, Datenbank) verwendet man <strong>"which"</strong> oder <strong>"that"</strong>.';
      }

      // Regel F: Relativpronomen "which" für Personen
      if (!hasError && /\b(the|a)\s+(person|colleague|developer|user|manager|boss|programmer)\s+which\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bwhich\b/i, 'who');
        explanation = '💡 Bei Personen verwendet man als Relativpronomen <strong>"who"</strong> (z. B. <em>"the developer who fixed the bug"</em>), nicht "which".';
      }

      // Regel G: "He / She / It - das 's' muss mit!" (3. Person Einzahl Gegenwart)
      if (!hasError) {
        const sMatch = lower.match(/\b(he|she|it|the\s+server|the\s+system|the\s+app|the\s+query)\s+(work|fail|run|need|want|have|think|test|happen)\b/i);
        if (sMatch) {
          hasError = true;
          const verb = sMatch[2].toLowerCase();
          const verbWithS = verb === 'have' ? 'has' : (verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('ss') ? verb + 'es' : verb + 's');
          corrected = corrected.replace(new RegExp('\\b' + verb + '\\b', 'i'), verbWithS);
          explanation = '💡 <strong>He / She / It – das "s" muss mit:</strong> In der 3. Person Einzahl Gegenwart (Present Simple) bekommt das Verb ein <strong>-s</strong> (z. B. <em>"the system runs"</em>, <em>"he works"</em>).';
        }
      }

      // Regel H: "I am agree" -> "I agree"
      if (!hasError && /\b(i\s+am\s+agree|i\s+was\s+agree)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+agree\b/i, 'I agree').replace(/\bi\s+was\s+agree\b/i, 'I agreed');
        explanation = '💡 Im Englischen ist <strong>"agree"</strong> bereits ein Vollverb. Man sagt <strong>"I agree"</strong> (Ich stimme zu), niemals "I am agree".';
      }

      // Regel I: "I am work" / "I am code" -> "I am working"
      if (!hasError && /\bi\s+am\s+(work|code|write|program|test)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+(work|code|write|program|test)\b/i, (match, v) => `I am ${v}ing`);
        explanation = '💡 In der Verlaufsform (Present Continuous) folgt nach <em>"am"</em> immer die Verbform mit <strong>-ing</strong> (z. B. <em>"I am working"</em>).';
      }

      // Regel J: Fehlender Artikel bei Berufsbezeichnung: "I am developer" -> "I am a developer"
      if (!hasError && /\bi\s+am\s+(junior\s+|senior\s+|software\s+|web\s+)?(developer|programmer|engineer|student)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+/i, 'I am a ');
        explanation = '💡 Bei Berufsbezeichnungen im Englischen muss immer ein unbestimmter Artikel <strong>"a"</strong> oder <strong>"an"</strong> stehen (z. B. <em>"I am a software developer"</em>).';
      }

      // Regel K: Unzählbare Substantive: "informations", "softwares", "feedbacks"
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

      // Regel M: "look forward to see" -> "look forward to seeing"
      if (!hasError && /\blook\s+forward\s+to\s+see\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\blook\s+forward\s+to\s+see\b/i, 'look forward to seeing');
        explanation = '💡 Nach der Wendung <strong>"look forward to"</strong> folgt immer die -ing Form (Gerund): <em>"looking forward to seeing you"</em>.';
      }

      // Regel N: "explain me" -> "explain to me"
      if (!hasError && /\bexplain\s+me\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bexplain\s+me\b/i, 'explain to me');
        explanation = '💡 Im Englischen erfordert "explain" die Präposition "to": <strong>"explain to me"</strong>.';
      }

      // Regel O: "discuss about" -> "discuss"
      if (!hasError && /\bdiscuss\s+about\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bdiscuss\s+about\b/i, 'discuss');
        explanation = '💡 Nach <strong>"discuss"</strong> folgt direkt das Gesprächsthema ohne "about" (z. B. <em>"let\'s discuss the pull request"</em>).';
      }

      // Regel P: Deutsche Wortstellung: "Yesterday worked I" -> "Yesterday I worked"
      if (!hasError && /\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started)\s+i\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started)\s+i\b/i, '$1 I $2');
        explanation = '💡 <strong>Wortstellung S-V-O:</strong> Im Englischen bleibt das Subjekt immer vor dem Verb (<em>"Yesterday I worked"</em>, nicht "Yesterday worked I").';
      }

      // Regel Q: Kleingeschriebenes "i" als Pronomen
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

      return {
        hasError,
        isGerman: false,
        originalText: clean,
        correctedText: corrected,
        explanation: hasError ? explanation : '🌟 Großartig formuliert! Dein Satz ist grammatikalisch korrekt, flüssig und klingt wie natürliches Englisch.'
      };
    },

    translateGermanInput(german) {
      const g = german.toLowerCase();
      if (g.includes('datenbank') || g.includes('sql')) {
        return 'I worked on optimizing the SQL database queries.';
      }
      if (g.includes('gestern') && g.includes('gearbeitet')) {
        return 'Yesterday I worked on the application features and fixed a bug.';
      }
      if (g.includes('bewerbung') || g.includes('warum')) {
        return 'I want to apply because I am passionate about modern software development.';
      }
      if (g.includes('wochenende') || g.includes('pause') || g.includes('kaffee')) {
        return 'I am taking a quick coffee break and look forward to the weekend.';
      }
      if (g.includes('zimmer') || g.includes('reservierung') || g.includes('hotel')) {
        return 'Good evening, I have a hotel room reservation under the name Istvan.';
      }
      return 'I would like to practice English conversation with you.';
    }
  };

  // --- ANTWORT-GENERATOR FÜR DEN GESPRÄCHSPARTNER ---
  function generatePartnerResponse(userInput, scenarioId) {
    const lower = userInput.toLowerCase();

    if (scenarioId === 'standup') {
      if (lower.includes('database') || lower.includes('query') || lower.includes('sql')) {
        return {
          en: 'Great progress on the database optimization! Efficient queries are essential for our application throughput. Are the changes already covered by unit tests?',
          de: 'Großartiger Fortschritt bei der Datenbankoptimierung! Effiziente Abfragen sind unverzichtbar für unseren Durchsatz. Sind die Änderungen schon durch Modultests abgedeckt?',
          suggestions: [
            'Yes, I wrote automated unit tests for all queries.',
            'I am currently writing the test cases today.',
            'I will create a pull request before lunch.'
          ]
        };
      }
      if (lower.includes('bug') || lower.includes('ticket') || lower.includes('fix') || lower.includes('issue')) {
        return {
          en: 'Thank you for handling that bug ticket, Istvan! Is the fix already deployed to the staging environment, or do you need a code review first?',
          de: 'Danke, dass du das Ticket übernommen hast, Istvan! Ist der Fix schon auf der Testumgebung oder brauchst du zuerst ein Code Review?',
          suggestions: [
            'I need a quick code review from a colleague.',
            'The bug is fixed and verified in staging.',
            'I will merge the pull request right after our standup.'
          ]
        };
      }
      return {
        en: 'Thank you for the update, Istvan! What are your main goals for today\'s sprint, and is anything blocking your progress?',
        de: 'Danke für das Update, Istvan! Was sind deine Hauptziele für den heutigen Sprint und blockiert dich etwas?',
        suggestions: [
          'Today I will work on the API endpoints. No blockers!',
          'I want to finish the user authentication module.',
          'Everything is on track with my sprint tasks.'
        ]
      };
    }

    if (scenarioId === 'interview') {
      if (lower.includes('experience') || lower.includes('programming') || lower.includes('code') || lower.includes('developer')) {
        return {
          en: 'That sounds very impressive! Which programming languages and databases have you worked with the most during your training?',
          de: 'Das klingt sehr beeindruckend! Mit welchen Programmiersprachen und Datenbanken hast du während deiner Ausbildung am meisten gearbeitet?',
          suggestions: [
            'I have solid experience with Java, Python, and SQL databases.',
            'I specialize in application development and clean code.',
            'I enjoy building REST APIs and relational database models.'
          ]
        };
      }
      if (lower.includes('team') || lower.includes('scrum') || lower.includes('agile')) {
        return {
          en: 'Teamwork is at the heart of our culture. How do you approach constructive feedback during peer code reviews?',
          de: 'Teamarbeit steht bei uns im Mittelpunkt. Wie gehst du mit konstruktivem Feedback in Code Reviews um?',
          suggestions: [
            'I appreciate feedback because it improves our code quality.',
            'I view code reviews as a great learning opportunity.',
            'I discuss technical solutions openly with my colleagues.'
          ]
        };
      }
      return {
        en: 'Thank you for sharing that! What motivated you to specialize in application development specifically?',
        de: 'Vielen Dank fürs Erzählen! Was hat dich motiviert, dich speziell auf Anwendungsentwicklung zu spezialisieren?',
        suggestions: [
          'I love solving complex problems with logic and software.',
          'Creating digital applications that help users inspires me.',
          'Technology evolves rapidly, and I love learning new tools.'
        ]
      };
    }

    if (scenarioId === 'support') {
      if (lower.includes('log') || lower.includes('check') || lower.includes('fix') || lower.includes('investigate')) {
        return {
          en: 'Awesome, thank you! Please check the server error logs first to inspect if there is an unhandled database connection timeout.',
          de: 'Super, danke! Bitte überprüfe zuerst die Server-Logs, um zu sehen, ob ein Datenbank-Verbindungsabbruch vorliegt.',
          suggestions: [
            'I will inspect the error logs and reproduce the timeout.',
            'The issue seems to be an unindexed database query.',
            'I will increase the connection pool size and test it.'
          ]
        };
      }
      return {
        en: 'The customer reported that this error occurs mostly during peak traffic. Let me know as soon as you find the root cause in the logs.',
        de: 'Der Kunde berichtete, dass dieser Fehler vor allem zu Stoßzeiten auftritt. Gib mir Bescheid, sobald du die Ursache findest.',
        suggestions: [
          'I am already analyzing the backend server metrics.',
          'I found the slow database query and will optimize it.',
          'I will deploy a hotfix to the staging server shortly.'
        ]
      };
    }

    if (scenarioId === 'smalltalk') {
      if (lower.includes('weekend') || lower.includes('music') || lower.includes('hobby')) {
        return {
          en: 'Producing electronic music sounds fantastic! What kind of software or synthesizers do you like using in your studio?',
          de: 'Elektronische Musik zu produzieren klingt fantastisch! Welche Software oder Synthesizer nutzt du am liebsten in deinem Studio?',
          suggestions: [
            'I use digital audio workstations and virtual synthesizers.',
            'I love experimenting with electronic beats and melodies.',
            'Making music is a wonderful way to relax after coding.'
          ]
        };
      }
      if (lower.includes('coffee') || lower.includes('break') || lower.includes('tired')) {
        return {
          en: 'Here is your coffee! Taking regular screen breaks really boosts coding focus and creativity.',
          de: 'Hier ist dein Kaffee! Regelmäßige Pausen steigern die Konzentration und Kreativität beim Programmieren enorm.',
          suggestions: [
            'Thanks! A short coffee break definitely clears the mind.',
            'Yes, stepping away from the monitor prevents fatigue.',
            'Now I feel refreshed and ready for the next sprint task!'
          ]
        };
      }
      return {
        en: 'It is always nice chatting with you, Istvan! What are you most excited about for the upcoming days?',
        de: 'Es ist immer schön mit dir zu plaudern, Istvan! Worauf freust du dich in den kommenden Tagen am meisten?',
        suggestions: [
          'I look forward to mastering new English IT vocabulary!',
          'I want to make good progress on my development project.',
          'I am excited to enjoy some relaxing free time this weekend.'
        ]
      };
    }

    if (scenarioId === 'travel') {
      if (lower.includes('reservation') || lower.includes('room') || lower.includes('istvan') || lower.includes('name')) {
        return {
          en: 'I found your booking, Mr. Csovrij! You are booked for three nights in our executive room. May I see your ID card, please?',
          de: 'Ich habe Ihre Buchung gefunden, Herr Csovrij! Sie haben drei Nächte in unserem Executive-Zimmer gebucht. Darf ich bitte Ihren Ausweis sehen?',
          suggestions: [
            'Here is my passport and reservation confirmation.',
            'Does the room reservation include complimentary breakfast?',
            'What time is the check-out on Sunday morning?'
          ]
        };
      }
      return {
        en: 'Here is your magnetic key card for room 305 on the third floor. Elevators are on your left. Can I help you with your luggage?',
        de: 'Hier ist Ihre Zimmerkarte für Raum 305 im dritten Stock. Die Aufzüge sind links. Kann ich Ihnen mit dem Gepäck helfen?',
        suggestions: [
          'No thank you, I can manage my luggage myself.',
          'Could you recommend a good traditional restaurant nearby?',
          'What is the Wi-Fi password for the room?'
        ]
      };
    }

    // Freier Chat
    return {
      en: 'That is very interesting, Istvan! Could you tell me more about that in English? How does that relate to your work or daily routine?',
      de: 'Das ist sehr interessant, Istvan! Kannst du mir auf Englisch mehr darüber erzählen? Wie hängt das mit deiner Arbeit oder deinem Alltag zusammen?',
      suggestions: [
        'In my daily routine, I balance programming and continuous learning.',
        'It helps me prepare effectively for my IT certification exam.',
        'I enjoy discussing these topics in professional English.'
      ]
    };
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

        // Falls eine Satzkorrektur vorhanden ist, Doctor Card rendern
        if (item.analysis) {
          const docCard = document.createElement('div');
          docCard.className = `sentence-doctor-card ${item.analysis.hasError ? 'has-error' : 'is-perfect'}`;
          
          if (item.analysis.hasError) {
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
          } else {
            docCard.innerHTML = `
              <div class="doctor-header">
                <span class="doctor-badge perfect">🌟 Hervorragend formuliert!</span>
              </div>
              <div class="doctor-corrected-box">
                <span class="doctor-corrected-text">🟢 ${item.analysis.correctedText}</span>
                <button class="chat-audio-btn" data-speak="${encodeURIComponent(item.analysis.correctedText)}">
                  🔊 Anhören
                </button>
              </div>
              <div class="doctor-explanation-box" style="border-left-color: var(--success); color: #a7f3d0; background: rgba(16, 185, 129, 0.1);">
                ${item.analysis.explanation}
              </div>
            `;
          }

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
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;

    // 1. Satz analysieren (Grammatik & Satzkorrektur)
    const analysis = SentenceDoctor.analyze(text);

    // 2. User-Nachricht speichern
    if (!dialogHistories[scenarioId]) dialogHistories[scenarioId] = [];
    dialogHistories[scenarioId].push({
      type: 'user',
      text: text,
      analysis: analysis
    });

    // 3. Antwort des Partners generieren
    const partnerReply = generatePartnerResponse(text, scenarioId);
    dialogHistories[scenarioId].push({
      type: 'partner',
      sender: scenario.partnerName,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      suggestions: partnerReply.suggestions
    });

    // 4. XP vergeben & Sound abspielen
    userXP += 10;
    localStorage.setItem('fiae_user_xp', userXP);
    updateStatsBadges();
    playSound(analysis && !analysis.hasError ? 'success' : 'try-again');

    // 5. Chat neu rendern
    renderChatLog(scenarioId);

    // 6. Falls Sprachmodus oder Audio gewünscht, Antwort vorlesen
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

    window.speechSynthesis.cancel();
    const story = STORY_DATA[currentStoryIdx];
    if (!story) return;

    const sentence = story.sentences[currentSentenceIdx];
    if (!sentence) return;

    const utterance = new SpeechSynthesisUtterance(sentence.en);
    utterance.lang = 'en-US';
    utterance.rate = storySpeechRate;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    setCinemaWaveActive(true);

    utterance.onend = () => {
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
    };

    utterance.onerror = () => {
      setCinemaWaveActive(false);
    };

    window.speechSynthesis.speak(utterance);
  }

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

  // --- DER GRAMMATIK- & SATZ-DOKTOR (CLIENT-SEITIGE ANALYSE) ---
  const SentenceDoctor = {
    // Erkennt deutsche Sätze / Wörter
    germanWords: [
      'ich', 'habe', 'arbeitete', 'gestern', 'mein', 'meine', 'warum', 'dass', 'nicht',
      'bitte', 'ja', 'nein', 'gut', 'danke', 'wir', 'sie', 'heute', 'morgen', 'frage',
      'problem', 'fehler', 'gemacht', 'gearbeitet', 'datenbank', 'entwicklung', 'entwickler'
    ],

    analyze(text) {
      const clean = text.trim();
      if (!clean) return null;

      const lower = clean.toLowerCase();
      const words = lower.replace(/[^a-zäöüß0-9\s]/g, '').split(/\s+/).filter(Boolean);

      // 1. Prüfen auf deutsche Eingabe
      const germanCount = words.filter(w => this.germanWords.includes(w)).length;
      if (germanCount >= 2 || (words.length <= 3 && germanCount >= 1)) {
        return {
          hasError: true,
          isGerman: true,
          originalText: clean,
          correctedText: this.translateGermanInput(clean),
          explanation: '⚠️ Du hast auf Deutsch geschrieben! Versuche deinen Gedanken auf Englisch zu formulieren. Sieh dir oben den englischen Satz an.'
        };
      }

      // 2. Regel-Prüfungen auf häufige Grammatik- & Sprachfehler
      let corrected = clean;
      let hasError = false;
      let explanation = '';

      // Regel A: "become" vs "get / receive" (Klassischer False Friend)
      const becomeMatch = lower.match(/\b(i|we|they|he|she|you)\s+(become|became)\s+(a|an|the|some|my)?\s*(coffee|tea|job|ticket|email|message|problem|question|task|bug|update)\b/i);
      if (becomeMatch) {
        hasError = true;
        const past = becomeMatch[2].toLowerCase() === 'became';
        const replacementVerb = past ? 'got' : 'get';
        corrected = corrected.replace(new RegExp(becomeMatch[2], 'i'), replacementVerb);
        explanation = '⚠️ <strong>False Friend:</strong> <em>"become"</em> heißt auf Deutsch <strong>"werden"</strong>, NICHT "bekommen"! Verwende im Englischen <strong>"get"</strong> oder <strong>"receive"</strong> (z. B. <em>"I get a ticket"</em>).';
      }

      // Regel B: "make" vs "do/run/conduct"
      if (!hasError && /\b(make|making|made)\s+(a\s+)?(test|code review|sports|homework|query)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bmake\s+(a\s+)?test\b/i, 'run a test')
                             .replace(/\bmade\s+(a\s+)?test\b/i, 'ran a test')
                             .replace(/\bmake\s+(a\s+)?code review\b/i, 'conduct a code review')
                             .replace(/\bmake\s+homework\b/i, 'do homework')
                             .replace(/\bmake\s+sports\b/i, 'do sports');
        explanation = '💡 Im Englischen sagt man <strong>"run a test"</strong>, <strong>"conduct a code review"</strong> oder <strong>"do homework"</strong>, nicht "make".';
      }

      // Regel C: "since" vs "for" (Dauer vs Zeitpunkt)
      if (!hasError && /\bsince\s+(\d+|one|two|three|four|five|several|many|a\s+few)\s+(minutes|hours|days|weeks|months|years)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bsince\s+/i, 'for ');
        explanation = '💡 <strong>Since vs. For:</strong> Zeitspannen (Dauer wie <em>"for 3 years"</em>) stehen immer mit <strong>"for"</strong>. <strong>"since"</strong> nutzt man nur für feste Startzeitpunkte (z. B. <em>"since yesterday"</em>).';
      }

      // Regel D: "for yesterday" / "for last week"
      if (!hasError && /\bfor\s+(yesterday|last\s+week|last\s+month|last\s+year)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bfor\s+/i, 'since ');
        explanation = '💡 Bei festen Zeitpunkten in der Vergangenheit nutzen wir <strong>"since"</strong> (z. B. <em>"since yesterday"</em>), niemals "for".';
      }

      // Regel E: Relativpronomen "who" vs "which/that" für Dinge
      if (!hasError && /\b(the|a)\s+(computer|code|bug|database|server|program|ticket|script|query)\s+who\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bwho\b/i, 'which');
        explanation = '💡 <strong>"who"</strong> bezieht sich im Englischen ausschließlich auf Menschen/Personen. Für Dinge (Server, Code, Datenbank) verwendet man <strong>"which"</strong> oder <strong>"that"</strong>.';
      }

      // Regel F: Relativpronomen "which" für Personen
      if (!hasError && /\b(the|a)\s+(person|colleague|developer|user|manager|boss|programmer)\s+which\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bwhich\b/i, 'who');
        explanation = '💡 Bei Personen verwendet man als Relativpronomen <strong>"who"</strong> (z. B. <em>"the developer who fixed the bug"</em>), nicht "which".';
      }

      // Regel G: "He / She / It - das 's' muss mit!" (3. Person Einzahl Gegenwart)
      if (!hasError) {
        const sMatch = lower.match(/\b(he|she|it|the\s+server|the\s+system|the\s+app|the\s+query)\s+(work|fail|run|need|want|have|think|test|happen)\b/i);
        if (sMatch) {
          hasError = true;
          const verb = sMatch[2].toLowerCase();
          const verbWithS = verb === 'have' ? 'has' : (verb.endsWith('ch') || verb.endsWith('sh') || verb.endsWith('ss') ? verb + 'es' : verb + 's');
          corrected = corrected.replace(new RegExp('\\b' + verb + '\\b', 'i'), verbWithS);
          explanation = '💡 <strong>He / She / It – das "s" muss mit:</strong> In der 3. Person Einzahl Gegenwart (Present Simple) bekommt das Verb ein <strong>-s</strong> (z. B. <em>"the system runs"</em>, <em>"he works"</em>).';
        }
      }

      // Regel H: "I am agree" -> "I agree"
      if (!hasError && /\b(i\s+am\s+agree|i\s+was\s+agree)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+agree\b/i, 'I agree').replace(/\bi\s+was\s+agree\b/i, 'I agreed');
        explanation = '💡 Im Englischen ist <strong>"agree"</strong> bereits ein Vollverb. Man sagt <strong>"I agree"</strong> (Ich stimme zu), niemals "I am agree".';
      }

      // Regel I: "I am work" / "I am code" -> "I am working"
      if (!hasError && /\bi\s+am\s+(work|code|write|program|test)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+(work|code|write|program|test)\b/i, (match, v) => `I am ${v}ing`);
        explanation = '💡 In der Verlaufsform (Present Continuous) folgt nach <em>"am"</em> immer die Verbform mit <strong>-ing</strong> (z. B. <em>"I am working"</em>).';
      }

      // Regel J: Fehlender Artikel bei Berufsbezeichnung: "I am developer" -> "I am a developer"
      if (!hasError && /\bi\s+am\s+(junior\s+|senior\s+|software\s+|web\s+)?(developer|programmer|engineer|student)\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bi\s+am\s+/i, 'I am a ');
        explanation = '💡 Bei Berufsbezeichnungen im Englischen muss immer ein unbestimmter Artikel <strong>"a"</strong> oder <strong>"an"</strong> stehen (z. B. <em>"I am a software developer"</em>).';
      }

      // Regel K: Unzählbare Substantive: "informations", "softwares", "feedbacks"
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

      // Regel M: "look forward to see" -> "look forward to seeing"
      if (!hasError && /\blook\s+forward\s+to\s+see\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\blook\s+forward\s+to\s+see\b/i, 'look forward to seeing');
        explanation = '💡 Nach der Wendung <strong>"look forward to"</strong> folgt immer die -ing Form (Gerund): <em>"looking forward to seeing you"</em>.';
      }

      // Regel N: "explain me" -> "explain to me"
      if (!hasError && /\bexplain\s+me\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bexplain\s+me\b/i, 'explain to me');
        explanation = '💡 Im Englischen erfordert "explain" die Präposition "to": <strong>"explain to me"</strong>.';
      }

      // Regel O: "discuss about" -> "discuss"
      if (!hasError && /\bdiscuss\s+about\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\bdiscuss\s+about\b/i, 'discuss');
        explanation = '💡 Nach <strong>"discuss"</strong> folgt direkt das Gesprächsthema ohne "about" (z. B. <em>"let\'s discuss the pull request"</em>).';
      }

      // Regel P: Deutsche Wortstellung: "Yesterday worked I" -> "Yesterday I worked"
      if (!hasError && /\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started)\s+i\b/i.test(lower)) {
        hasError = true;
        corrected = corrected.replace(/\b(yesterday|today|now)\s+(worked|did|went|saw|finished|started)\s+i\b/i, '$1 I $2');
        explanation = '💡 <strong>Wortstellung S-V-O:</strong> Im Englischen bleibt das Subjekt immer vor dem Verb (<em>"Yesterday I worked"</em>, nicht "Yesterday worked I").';
      }

      // Regel Q: Kleingeschriebenes "i" als Pronomen
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

      return {
        hasError,
        isGerman: false,
        originalText: clean,
        correctedText: corrected,
        explanation: hasError ? explanation : '🌟 Großartig formuliert! Dein Satz ist grammatikalisch korrekt, flüssig und klingt wie natürliches Englisch.'
      };
    },

    translateGermanInput(german) {
      const g = german.toLowerCase();
      if (g.includes('datenbank') || g.includes('sql')) {
        return 'I worked on optimizing the SQL database queries.';
      }
      if (g.includes('gestern') && g.includes('gearbeitet')) {
        return 'Yesterday I worked on the application features and fixed a bug.';
      }
      if (g.includes('bewerbung') || g.includes('warum')) {
        return 'I want to apply because I am passionate about modern software development.';
      }
      if (g.includes('wochenende') || g.includes('pause') || g.includes('kaffee')) {
        return 'I am taking a quick coffee break and look forward to the weekend.';
      }
      if (g.includes('zimmer') || g.includes('reservierung') || g.includes('hotel')) {
        return 'Good evening, I have a hotel room reservation under the name Istvan.';
      }
      return 'I would like to practice English conversation with you.';
    }
  };

  // --- ANTWORT-GENERATOR FÜR DEN GESPRÄCHSPARTNER ---
  function generatePartnerResponse(userInput, scenarioId) {
    const lower = userInput.toLowerCase();

    if (scenarioId === 'standup') {
      if (lower.includes('database') || lower.includes('query') || lower.includes('sql')) {
        return {
          en: 'Great progress on the database optimization! Efficient queries are essential for our application throughput. Are the changes already covered by unit tests?',
          de: 'Großartiger Fortschritt bei der Datenbankoptimierung! Effiziente Abfragen sind unverzichtbar für unseren Durchsatz. Sind die Änderungen schon durch Modultests abgedeckt?',
          suggestions: [
            'Yes, I wrote automated unit tests for all queries.',
            'I am currently writing the test cases today.',
            'I will create a pull request before lunch.'
          ]
        };
      }
      if (lower.includes('bug') || lower.includes('ticket') || lower.includes('fix') || lower.includes('issue')) {
        return {
          en: 'Thank you for handling that bug ticket, Istvan! Is the fix already deployed to the staging environment, or do you need a code review first?',
          de: 'Danke, dass du das Ticket übernommen hast, Istvan! Ist der Fix schon auf der Testumgebung oder brauchst du zuerst ein Code Review?',
          suggestions: [
            'I need a quick code review from a colleague.',
            'The bug is fixed and verified in staging.',
            'I will merge the pull request right after our standup.'
          ]
        };
      }
      return {
        en: 'Thank you for the update, Istvan! What are your main goals for today\'s sprint, and is anything blocking your progress?',
        de: 'Danke für das Update, Istvan! Was sind deine Hauptziele für den heutigen Sprint und blockiert dich etwas?',
        suggestions: [
          'Today I will work on the API endpoints. No blockers!',
          'I want to finish the user authentication module.',
          'Everything is on track with my sprint tasks.'
        ]
      };
    }

    if (scenarioId === 'interview') {
      if (lower.includes('experience') || lower.includes('programming') || lower.includes('code') || lower.includes('developer')) {
        return {
          en: 'That sounds very impressive! Which programming languages and databases have you worked with the most during your training?',
          de: 'Das klingt sehr beeindruckend! Mit welchen Programmiersprachen und Datenbanken hast du während deiner Ausbildung am meisten gearbeitet?',
          suggestions: [
            'I have solid experience with Java, Python, and SQL databases.',
            'I specialize in application development and clean code.',
            'I enjoy building REST APIs and relational database models.'
          ]
        };
      }
      if (lower.includes('team') || lower.includes('scrum') || lower.includes('agile')) {
        return {
          en: 'Teamwork is at the heart of our culture. How do you approach constructive feedback during peer code reviews?',
          de: 'Teamarbeit steht bei uns im Mittelpunkt. Wie gehst du mit konstruktivem Feedback in Code Reviews um?',
          suggestions: [
            'I appreciate feedback because it improves our code quality.',
            'I view code reviews as a great learning opportunity.',
            'I discuss technical solutions openly with my colleagues.'
          ]
        };
      }
      return {
        en: 'Thank you for sharing that! What motivated you to specialize in application development specifically?',
        de: 'Vielen Dank fürs Erzählen! Was hat dich motiviert, dich speziell auf Anwendungsentwicklung zu spezialisieren?',
        suggestions: [
          'I love solving complex problems with logic and software.',
          'Creating digital applications that help users inspires me.',
          'Technology evolves rapidly, and I love learning new tools.'
        ]
      };
    }

    if (scenarioId === 'support') {
      if (lower.includes('log') || lower.includes('check') || lower.includes('fix') || lower.includes('investigate')) {
        return {
          en: 'Awesome, thank you! Please check the server error logs first to inspect if there is an unhandled database connection timeout.',
          de: 'Super, danke! Bitte überprüfe zuerst die Server-Logs, um zu sehen, ob ein Datenbank-Verbindungsabbruch vorliegt.',
          suggestions: [
            'I will inspect the error logs and reproduce the timeout.',
            'The issue seems to be an unindexed database query.',
            'I will increase the connection pool size and test it.'
          ]
        };
      }
      return {
        en: 'The customer reported that this error occurs mostly during peak traffic. Let me know as soon as you find the root cause in the logs.',
        de: 'Der Kunde berichtete, dass dieser Fehler vor allem zu Stoßzeiten auftritt. Gib mir Bescheid, sobald du die Ursache findest.',
        suggestions: [
          'I am already analyzing the backend server metrics.',
          'I found the slow database query and will optimize it.',
          'I will deploy a hotfix to the staging server shortly.'
        ]
      };
    }

    if (scenarioId === 'smalltalk') {
      if (lower.includes('weekend') || lower.includes('music') || lower.includes('hobby')) {
        return {
          en: 'Producing electronic music sounds fantastic! What kind of software or synthesizers do you like using in your studio?',
          de: 'Elektronische Musik zu produzieren klingt fantastisch! Welche Software oder Synthesizer nutzt du am liebsten in deinem Studio?',
          suggestions: [
            'I use digital audio workstations and virtual synthesizers.',
            'I love experimenting with electronic beats and melodies.',
            'Making music is a wonderful way to relax after coding.'
          ]
        };
      }
      if (lower.includes('coffee') || lower.includes('break') || lower.includes('tired')) {
        return {
          en: 'Here is your coffee! Taking regular screen breaks really boosts coding focus and creativity.',
          de: 'Hier ist dein Kaffee! Regelmäßige Pausen steigern die Konzentration und Kreativität beim Programmieren enorm.',
          suggestions: [
            'Thanks! A short coffee break definitely clears the mind.',
            'Yes, stepping away from the monitor prevents fatigue.',
            'Now I feel refreshed and ready for the next sprint task!'
          ]
        };
      }
      return {
        en: 'It is always nice chatting with you, Istvan! What are you most excited about for the upcoming days?',
        de: 'Es ist immer schön mit dir zu plaudern, Istvan! Worauf freust du dich in den kommenden Tagen am meisten?',
        suggestions: [
          'I look forward to mastering new English IT vocabulary!',
          'I want to make good progress on my development project.',
          'I am excited to enjoy some relaxing free time this weekend.'
        ]
      };
    }

    if (scenarioId === 'travel') {
      if (lower.includes('reservation') || lower.includes('room') || lower.includes('istvan') || lower.includes('name')) {
        return {
          en: 'I found your booking, Mr. Csovrij! You are booked for three nights in our executive room. May I see your ID card, please?',
          de: 'Ich habe Ihre Buchung gefunden, Herr Csovrij! Sie haben drei Nächte in unserem Executive-Zimmer gebucht. Darf ich bitte Ihren Ausweis sehen?',
          suggestions: [
            'Here is my passport and reservation confirmation.',
            'Does the room reservation include complimentary breakfast?',
            'What time is the check-out on Sunday morning?'
          ]
        };
      }
      return {
        en: 'Here is your magnetic key card for room 305 on the third floor. Elevators are on your left. Can I help you with your luggage?',
        de: 'Hier ist Ihre Zimmerkarte für Raum 305 im dritten Stock. Die Aufzüge sind links. Kann ich Ihnen mit dem Gepäck helfen?',
        suggestions: [
          'No thank you, I can manage my luggage myself.',
          'Could you recommend a good traditional restaurant nearby?',
          'What is the Wi-Fi password for the room?'
        ]
      };
    }

    // Freier Chat
    return {
      en: 'That is very interesting, Istvan! Could you tell me more about that in English? How does that relate to your work or daily routine?',
      de: 'Das ist sehr interessant, Istvan! Kannst du mir auf Englisch mehr darüber erzählen? Wie hängt das mit deiner Arbeit oder deinem Alltag zusammen?',
      suggestions: [
        'In my daily routine, I balance programming and continuous learning.',
        'It helps me prepare effectively for my IT certification exam.',
        'I enjoy discussing these topics in professional English.'
      ]
    };
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

        // Falls eine Satzkorrektur vorhanden ist, Doctor Card rendern
        if (item.analysis) {
          const docCard = document.createElement('div');
          docCard.className = `sentence-doctor-card ${item.analysis.hasError ? 'has-error' : 'is-perfect'}`;
          
          if (item.analysis.hasError) {
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
          } else {
            docCard.innerHTML = `
              <div class="doctor-header">
                <span class="doctor-badge perfect">🌟 Hervorragend formuliert!</span>
              </div>
              <div class="doctor-corrected-box">
                <span class="doctor-corrected-text">🟢 ${item.analysis.correctedText}</span>
                <button class="chat-audio-btn" data-speak="${encodeURIComponent(item.analysis.correctedText)}">
                  🔊 Anhören
                </button>
              </div>
              <div class="doctor-explanation-box" style="border-left-color: var(--success); color: #a7f3d0; background: rgba(16, 185, 129, 0.1);">
                ${item.analysis.explanation}
              </div>
            `;
          }

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
    const scenario = DIALOG_SCENARIOS[scenarioId] || DIALOG_SCENARIOS.standup;

    // 1. Satz analysieren (Grammatik & Satzkorrektur)
    const analysis = SentenceDoctor.analyze(text);

    // 2. User-Nachricht speichern
    if (!dialogHistories[scenarioId]) dialogHistories[scenarioId] = [];
    dialogHistories[scenarioId].push({
      type: 'user',
      text: text,
      analysis: analysis
    });

    // 3. Antwort des Partners generieren
    const partnerReply = generatePartnerResponse(text, scenarioId);
    dialogHistories[scenarioId].push({
      type: 'partner',
      sender: scenario.partnerName,
      textEn: partnerReply.en,
      textDe: partnerReply.de,
      suggestions: partnerReply.suggestions
    });

    // 4. XP vergeben & Sound abspielen
    userXP += 10;
    localStorage.setItem('fiae_user_xp', userXP);
    updateStatsBadges();
    playSound(analysis && !analysis.hasError ? 'success' : 'try-again');

    // 5. Chat neu rendern
    renderChatLog(scenarioId);

    // 6. Falls Sprachmodus oder Audio gewünscht, Antwort vorlesen
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

    window.speechSynthesis.cancel();
    const story = STORY_DATA[currentStoryIdx];
    if (!story) return;

    const sentence = story.sentences[currentSentenceIdx];
    if (!sentence) return;

    const utterance = new SpeechSynthesisUtterance(sentence.en);
    utterance.lang = 'en-US';
    utterance.rate = storySpeechRate;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) {
      utterance.voice = enVoice;
    }

    setCinemaWaveActive(true);

    utterance.onend = () => {
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
    };

    utterance.onerror = () => {
      setCinemaWaveActive(false);
    };

    window.speechSynthesis.speak(utterance);
  }

  // --- INITIAL RENDER ---
  updateStatsBadges();
  renderCurrentCard();
  renderCurrentSpeech();
  renderCurrentCloze();
});

// --- SERVICE WORKER REGISTRATION (OFFLINE SUPPORT) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered for offline use:', reg.scope))
      .catch((err) => console.log('Service Worker registration failed:', err));
  });
}
