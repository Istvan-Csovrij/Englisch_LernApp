// ============================================================
// Hauptlogik: Englisch-LernApp (FIAE AP 1, Business & Alltag)
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

  // --- AUDIO & SPEECH SYNTHESIS ---
  function speakEnglish(text, rate = 1.0) {
    if (!('speechSynthesis' in window)) {
      showToast('Sprachausgabe wird im Browser leider nicht unterstützt.');
      return;
    }
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    
    // Select an English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (enVoice) {
      utterance.voice = enVoice;
    }
    window.speechSynthesis.speak(utterance);
  }

  // Pre-load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }

  // --- SPEECH RECOGNITION (NACHSPRECHEN) ---
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isRecording = false;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      isRecording = true;
      const micBtn = document.getElementById('btnStartRecord');
      micBtn.classList.add('recording');
      document.getElementById('micStatusText').textContent = '🔴 Ich höre zu... Bitte sprich jetzt!';
      document.getElementById('recognizedBox').innerHTML = '<em>Höre zu...</em>';
    };

    recognition.onresult = (event) => {
      const spokenText = event.results[0][0].transcript;
      evaluateSpokenSentence(spokenText);
    };

    recognition.onerror = (event) => {
      isRecording = false;
      const micBtn = document.getElementById('btnStartRecord');
      micBtn.classList.remove('recording');
      document.getElementById('micStatusText').textContent = '⚠️ Fehler bei der Aufnahme: ' + (event.error || 'Unbekannt');
    };

    recognition.onend = () => {
      isRecording = false;
      const micBtn = document.getElementById('btnStartRecord');
      micBtn.classList.remove('recording');
      if (document.getElementById('micStatusText').textContent.includes('höre zu')) {
        document.getElementById('micStatusText').textContent = 'Aufnahme beendet. Klicke erneut zum Wiederholen.';
      }
    };
  }

  function evaluateSpokenSentence(spoken) {
    const target = filteredSpeech[currentSpeechIndex].sentenceEn;
    const recognizedBox = document.getElementById('recognizedBox');
    const feedbackBox = document.getElementById('speechFeedback');
    
    recognizedBox.textContent = `Du hast gesagt: "${spoken}"`;

    // Calculate basic similarity
    const cleanSpoken = spoken.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const cleanTarget = target.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

    const targetWords = cleanTarget.split(' ');
    const spokenWords = cleanSpoken.split(' ');
    let matches = 0;
    targetWords.forEach(w => {
      if (spokenWords.includes(w)) matches++;
    });
    const matchPercentage = Math.round((matches / targetWords.length) * 100);

    feedbackBox.className = 'score-feedback';
    if (matchPercentage >= 70) {
      feedbackBox.classList.add('good');
      feedbackBox.innerHTML = `🎉 Hervorragend ausgesprochen! (${matchPercentage}% Treffer)<br><strong>+15 XP</strong> gutgeschrieben!`;
      addXP(15);
      showToast('🎉 Super Aussprache! +15 XP');
    } else {
      feedbackBox.classList.add('try-again');
      feedbackBox.innerHTML = `👍 Guter Versuch! (${matchPercentage}% Treffer)<br>Tipp: Höre es dir noch einmal langsam an und probiere es erneut.`;
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
    
    // In Stats View
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
    }, 2400);
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

    // Filter Vocab
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
    if (filteredVocab.length === 0) {
      document.getElementById('cardEnglish').textContent = 'Keine Vokabeln in dieser Kategorie';
      return;
    }
    const card = filteredVocab[currentCardIndex];
    isCardFlipped = false;
    flashcardEl.classList.remove('flipped');

    document.getElementById('cardCategoryTag').textContent = card.categoryName;
    document.getElementById('cardIndexIndicator').textContent = `${currentCardIndex + 1} / ${filteredVocab.length}`;
    document.getElementById('cardVisualIcon').innerHTML = card.svg;
    document.getElementById('cardEnglish').textContent = card.english;
    document.getElementById('cardPhonetic').textContent = card.phonetic;

    // Back
    document.getElementById('cardGerman').textContent = card.german;
    document.getElementById('cardDefinition').textContent = card.definition;
    document.getElementById('cardExampleEn').textContent = card.exampleEn;
    document.getElementById('cardExampleDe').textContent = card.exampleDe;

    // Progress Bar
    const pct = ((currentCardIndex + 1) / filteredVocab.length) * 100;
    document.getElementById('cardProgressBar').style.width = pct + '%';

    // Buttons
    document.getElementById('btnPrevCard').disabled = currentCardIndex === 0;
    document.getElementById('btnNextCard').disabled = currentCardIndex === filteredVocab.length - 1;

    // Is already mastered?
    const isMastered = masteredCards.includes(card.id);
    const masterBtn = document.getElementById('btnMarkMastered');
    if (isMastered) {
      masterBtn.textContent = '⭐ Bereits gemeistert';
      masterBtn.style.opacity = '0.7';
    } else {
      masterBtn.textContent = '✅ Schon gekonnt (+10 XP)';
      masterBtn.style.opacity = '1';
    }
  }

  function flipCard() {
    isCardFlipped = !isCardFlipped;
    flashcardEl.classList.toggle('flipped', isCardFlipped);
  }

  flashcardEl.addEventListener('click', (e) => {
    // Avoid flipping when clicking the audio button
    if (e.target.closest('#cardSpeakBtn')) return;
    flipCard();
  });

  document.getElementById('btnFlipCard').addEventListener('click', flipCard);

  document.getElementById('cardSpeakBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    const card = filteredVocab[currentCardIndex];
    speakEnglish(card.english, 0.9);
  });

  document.getElementById('btnPrevCard').addEventListener('click', () => {
    if (currentCardIndex > 0) {
      currentCardIndex--;
      renderCurrentCard();
    }
  });

  document.getElementById('btnNextCard').addEventListener('click', () => {
    if (currentCardIndex < filteredVocab.length - 1) {
      currentCardIndex++;
      renderCurrentCard();
    }
  });

  document.getElementById('btnMarkMastered').addEventListener('click', () => {
    const card = filteredVocab[currentCardIndex];
    if (!masteredCards.includes(card.id)) {
      masteredCards.push(card.id);
      localStorage.setItem('fiae_mastered_cards', JSON.stringify(masteredCards));
      addXP(10);
      showToast('🎉 Vokabel gemeistert! +10 XP');
    } else {
      showToast('Diese Karte hast du bereits gemeistert!');
    }
    renderCurrentCard();
    updateStatsBadges();
  });

  document.getElementById('btnMarkRepeat').addEventListener('click', () => {
    const card = filteredVocab[currentCardIndex];
    masteredCards = masteredCards.filter(id => id !== card.id);
    localStorage.setItem('fiae_mastered_cards', JSON.stringify(masteredCards));
    showToast('Wird zur Wiederholung vorgemerkt');
    renderCurrentCard();
    updateStatsBadges();
  });

  // Mobile Swipe Gesture on Flashcard
  let touchStartX = 0;
  flashcardEl.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  flashcardEl.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchEndX - touchStartX;
    if (Math.abs(diff) > 60) {
      if (diff < 0 && currentCardIndex < filteredVocab.length - 1) {
        currentCardIndex++;
        renderCurrentCard();
      } else if (diff > 0 && currentCardIndex > 0) {
        currentCardIndex--;
        renderCurrentCard();
      }
    }
  }, { passive: true });

  // --- SPEECH TRAINER LOGIC ---
  function renderCurrentSpeech() {
    if (filteredSpeech.length === 0) return;
    const sp = filteredSpeech[currentSpeechIndex];

    document.getElementById('speechCatBadge').textContent = `${sp.categoryName} • Satz ${currentSpeechIndex + 1} von ${filteredSpeech.length}`;
    document.getElementById('speechTargetSentence').textContent = sp.sentenceEn;
    document.getElementById('speechTranslation').textContent = sp.sentenceDe;
    document.getElementById('speechPhonetic').textContent = sp.phonetic;

    document.getElementById('micStatusText').textContent = 'Klicke auf das Mikrofon und sprich den Satz auf Englisch nach!';
    document.getElementById('recognizedBox').innerHTML = '<em>Erkannte Sprache erscheint hier...</em>';
    document.getElementById('speechFeedback').className = 'score-feedback';
    document.getElementById('speechFeedback').style.display = 'none';

    document.getElementById('btnPrevSpeech').disabled = currentSpeechIndex === 0;
    document.getElementById('btnNextSpeech').disabled = currentSpeechIndex === filteredSpeech.length - 1;
  }

  document.getElementById('btnPlaySpeechAudio').addEventListener('click', () => {
    const sp = filteredSpeech[currentSpeechIndex];
    const rate = parseFloat(document.getElementById('voiceSpeedSelect').value || '0.75');
    speakEnglish(sp.sentenceEn, rate);
  });

  document.getElementById('btnStartRecord').addEventListener('click', () => {
    if (!recognition) {
      // Fallback for browsers without Web Speech Recognition (or file:// restrictions)
      const target = filteredSpeech[currentSpeechIndex].sentenceEn;
      const userSpoke = prompt(`Spracherkennung wird von diesem Browser eingeschränkt.\nBitte tippe oder lies den englischen Satz laut vor:\n"${target}"\n\nWenn du ihn laut gesprochen hast, drücke OK:`);
      if (userSpoke !== null) {
        evaluateSpokenSentence(target);
      }
      return;
    }

    if (isRecording) {
      recognition.stop();
    } else {
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
      renderCurrentSpeech();
    }
  });

  document.getElementById('btnNextSpeech').addEventListener('click', () => {
    if (currentSpeechIndex < filteredSpeech.length - 1) {
      currentSpeechIndex++;
      renderCurrentSpeech();
    }
  });

  // --- CLOZE TEST LOGIC ---
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

    // Render options
    const optionsGrid = document.getElementById('clozeOptionsGrid');
    optionsGrid.innerHTML = '';

    cl.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'cloze-opt-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectClozeAnswer(opt, btn, cl));
      optionsGrid.appendChild(btn);
    });

    document.getElementById('btnPrevCloze').disabled = currentClozeIndex === 0;
    document.getElementById('btnNextCloze').disabled = currentClozeIndex === filteredCloze.length - 1;
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
      showToast('🎉 Richtig beantwortet! +10 XP');
      speakEnglish(cl.correctAnswer, 0.9);
    } else {
      buttonEl.classList.add('wrong');
      blank.style.color = '#f87171';
      allButtons.forEach(b => {
        if (b.textContent.toLowerCase() === cl.correctAnswer.toLowerCase()) {
          b.classList.add('correct');
        }
      });
      showToast('Leider falsch. Sieh dir die Erklärung an!');
    }

    // Show Explanation
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
      renderCurrentCloze();
    }
  });

  document.getElementById('btnNextCloze').addEventListener('click', () => {
    if (currentClozeIndex < filteredCloze.length - 1) {
      currentClozeIndex++;
      renderCurrentCloze();
    }
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
      listEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Keine passenden Begriffe gefunden.</p>';
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
        <button class="item-audio-btn" title="Aussprache anhören">🔊</button>
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
