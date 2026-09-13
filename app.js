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
      }
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      if (activeMicTarget === 'speechTrainer') {
        evaluateSentencePronunciation(spokenText);
      } else if (activeMicTarget === 'flashcard') {
        evaluateFlashcardPronunciation(spokenText);
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
  updateStatsBadges();
  renderCurrentCard();
  renderCurrentSpeech();
  renderCurrentCloze();
});

  // Service Worker Registration for Offline Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('Service Worker registered for offline use:', reg.scope))
        .catch((err) => console.log('Service Worker registration failed:', err));
    
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
    console.log('[PWA] beforeinstallprompt saved');
  });

  if (btnInstallApp) {
    btnInstallApp.addEventListener('click', () => {
      if (deferredPrompt) {
        // Trigger native prompt immediately
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            showToast('🎉 App wird auf deinem Handy installiert!');
          }
          deferredPrompt = null;
        });
      } else {
        // Open the guide modal showing iPhone & Android steps
        modalOverlay.classList.add('show');
      }
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', () => {
      modalOverlay.classList.remove('show');
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
            modalOverlay.classList.remove('show');
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

});
