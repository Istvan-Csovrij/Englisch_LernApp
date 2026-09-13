// ============================================================
// Lern-Datenbank: Fachinformatiker AP 1, Business & Alltag
// ============================================================

const CATEGORIES = {
  all: { id: 'all', name: 'Alle Bereiche', icon: '🌐' },
  fiae: { id: 'fiae', name: 'FIAE AP 1 & IT', icon: '💻' },
  business: { id: 'business', name: 'Job & Business', icon: '💼' },
  conversation: { id: 'conversation', name: 'Smalltalk & Alltag', icon: '💬' },
  travel: { id: 'travel', name: 'Urlaub & Reise', icon: '✈️' }
};

const VOCAB_DATA = [
  // --- FIAE AP 1 & IT ---
  {
    id: 'fiae-1',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Requirements Specification',
    phonetic: 'ri-kweier-ments spe-si-fi-key-shun',
    german: 'Anforderungsspezifikation / Lastenheft',
    definition: 'Genaue Beschreibung aller funktionalen und nicht-funktionalen Anforderungen an ein Softwaresystem.',
    exampleEn: 'The client approved the functional requirements specification before sprint planning.',
    exampleDe: 'Der Kunde hat die funktionale Anforderungsspezifikation vor der Sprint-Planung genehmigt.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
  },
  {
    id: 'fiae-2',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Relational Database & Foreign Key',
    phonetic: 'ri-ley-shun-al dey-tuh-beys & for-en kih',
    german: 'Relationale Datenbank & Fremdschlüssel',
    definition: 'Tabellenbasierte Datenhaltung (SQL) mit Primär- und Fremdschlüsseln zur Gewährleistung referenzieller Integrität.',
    exampleEn: 'A foreign key links records between two tables to prevent orphaned data.',
    exampleDe: 'Ein Fremdschlüssel verknüpft Datensätze zwischen zwei Tabellen, um verwaiste Daten zu verhindern.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3\"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`
  },
  {
    id: 'fiae-3',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Merge Conflict',
    phonetic: 'mördsh kon-flikt',
    german: 'Zusammenführungskonflikt (Git)',
    definition: 'Tritt auf, wenn in zwei Branches dieselben Codezeilen geändert wurden und Git sie nicht automatisch zusammenführen kann.',
    exampleEn: 'Please pull the latest main branch and resolve the merge conflict locally.',
    exampleDe: 'Bitte ziehe den aktuellen Main-Branch und löse den Merge-Konflikt lokal.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 9v12"/><path d="M20.2 15.6L12 9"/></svg>`
  },
  {
    id: 'fiae-4',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Continuous Integration / Deployment',
    phonetic: 'kon-ti-nyu-as in-te-grey-shun / di-ploy-ment',
    german: 'Kontinuierliche Integration & Auslieferung (CI/CD)',
    definition: 'Automatisierte Pipelines, die Code bei jedem Commit kompilieren, testen und auf Server ausrollen.',
    exampleEn: 'The CI/CD pipeline runs automated unit tests after every git push.',
    exampleDe: 'Die CI/CD-Pipeline führt nach jedem Git-Push automatisch Unit-Tests aus.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><polyline points="12 11 12 16 16 12"/><line x1="12" y1="11" x2="8" y2="15"/></svg>`
  },
  {
    id: 'fiae-5',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Exception Handling (Try-Catch)',
    phonetic: 'ik-sep-shun händ-ling',
    german: 'Fehlerbehandlung / Ausnahmebehandlung',
    definition: 'Fängt Laufzeitfehler ab, damit die Anwendung kontrolliert reagiert und nicht unerwartet abstürzt.',
    exampleEn: 'We implement exception handling to catch database timeouts gracefully.',
    exampleDe: 'Wir implementieren Ausnahmebehandlung, um Timeouts bei der Datenbankverbindung kontrolliert abzufangen.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  },
  {
    id: 'fiae-6',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Object-Oriented Inheritance',
    phonetic: 'ob-dschekt o-ri-en-ted in-her-i-tens',
    german: 'Objektorientierte Vererbung (OOP)',
    definition: 'Klassen erben Eigenschaften voneinander und können Methoden individuell überschreiben.',
    exampleEn: 'Inheritance allows child classes to inherit attributes from a parent class.',
    exampleDe: 'Vererbung erlaubt Kindklassen, Attribute von einer Elternklasse zu erben.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
  },
  {
    id: 'fiae-7',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Subnet Mask',
    phonetic: 'sab-net mäsk',
    german: 'Subnetzmaske & IP-Adressierung',
    definition: 'Unterteilt Netzwerke in Netz- und Hostanteil (z. B. IPv4 /24 oder 255.255.255.0).',
    exampleEn: 'The subnet mask determines how many usable host addresses exist in the local network.',
    exampleDe: 'Die Subnetzmaske bestimmt, wie viele nutzbare Host-Adressen im lokalen Netzwerk existieren.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><line x1="12" y1="12" x2="12" y2="8"/></svg>`
  },
  {
    id: 'fiae-8',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Unit Testing',
    phonetic: 'yu-nit tes-ting',
    german: 'Modultests & Testabdeckung',
    definition: 'Automatisierte Tests für isolierte Code-Funktionen zur Qualitätssicherung und Regressionsvermeidung.',
    exampleEn: 'Our target is to maintain at least 80 percent code coverage with automated unit tests.',
    exampleDe: 'Unser Ziel ist es, mindestens 80 Prozent Testabdeckung mit automatisierten Unit-Tests zu halten.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
  },

  // --- JOB & BUSINESS ---
  {
    id: 'biz-1',
    category: 'business',
    categoryName: 'Job & Business',
    english: 'Daily Standup Meeting',
    phonetic: 'dey-li ständ-ap mi-ting',
    german: 'Tägliches Standup-Meeting (Scrum)',
    definition: 'Kurzes 15-minütiges Team-Meeting über gestrige Fortschritte, heutige Aufgaben und etwaige Blocker.',
    exampleEn: 'In today’s daily standup, I reported that my pull request is ready for review.',
    exampleDe: 'Im heutigen Daily Standup habe ich berichtet, dass mein Pull Request prüfbereit ist.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  {
    id: 'biz-2',
    category: 'business',
    categoryName: 'Job & Business',
    english: 'Tight Deadline',
    phonetic: 'tait ded-lain',
    german: 'Knapper Abgabetermin / Fälligkeit',
    definition: 'Dringender Fertigstellungstermin, der hohe Priorisierung erfordert.',
    exampleEn: 'We have a tight deadline for the upcoming customer release next Monday.',
    exampleDe: 'Wir haben einen knappen Abgabetermin für das bevorstehende Kunden-Release am nächsten Montag.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  },
  {
    id: 'biz-3',
    category: 'business',
    categoryName: 'Job & Business',
    english: 'I am currently blocked by...',
    phonetic: 'ai äm kör-ent-li blokt bai',
    german: 'Ich werde zurzeit blockiert von...',
    definition: 'Schlüsselsatz im Daily Standup, um Hindernisse (Impediments) sofort transparent zu machen.',
    exampleEn: 'I am currently blocked by missing API tokens for the payment gateway test environment.',
    exampleDe: 'Ich werde zurzeit durch fehlende API-Tokens für die Payment-Testumgebung blockiert.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
  },
  {
    id: 'biz-4',
    category: 'business',
    categoryName: 'Job & Business',
    english: 'Could you please clarify the requirements?',
    phonetic: 'kud ju plies kle-ri-fai thö ri-kweier-ments',
    german: 'Könnten Sie bitte die Anforderungen präzisieren / erläutern?',
    definition: 'Höfliche, professionelle Nachfrage bei unklaren Aufgaben im Ticket oder Projekt.',
    exampleEn: 'Could you please clarify the acceptance criteria for user story number 42?',
    exampleDe: 'Könnten Sie bitte die Akzeptanzkriterien für User Story Nummer 42 präzisieren?',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
  },

  // --- SMALLTALK & ALLTAG ---
  {
    id: 'conv-1',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    english: 'Nice to meet you!',
    phonetic: 'nais tu miht ju',
    german: 'Freut mich, dich / Sie kennenzulernen!',
    definition: 'Der perfekte, freundliche Einstiegssatz bei neuen Kollegen oder Gesprächspartnern.',
    exampleEn: 'Hello, I am Istvan, the new software developer. Nice to meet you!',
    exampleDe: 'Hallo, ich bin Istvan, der neue Softwareentwickler. Freut mich, dich kennenzulernen!',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`
  },
  {
    id: 'conv-2',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    english: 'Would you like to grab a coffee?',
    phonetic: 'wud ju laik tu gräb a ko-fi',
    german: 'Möchtest du dir einen Kaffee holen / eine Pause machen?',
    definition: 'Lockerer Einladungssatz für eine Kaffeepause mit Kollegen.',
    exampleEn: 'I need a short break from coding. Would you like to grab a coffee?',
    exampleDe: 'Ich brauche eine kurze Bildschirmpause. Möchtest du dir einen Kaffee holen?',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`
  },
  {
    id: 'conv-3',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    english: 'How was your weekend?',
    phonetic: 'hau wos yor wik-end',
    german: 'Wie war dein Wochenende?',
    definition: 'Standard-Smalltalkfrage jeden Montagmorgen im Team.',
    exampleEn: 'Good morning! How was your weekend? Did you do anything exciting?',
    exampleDe: 'Guten Morgen! Wie war dein Wochenende? Hast du etwas Aufregendes unternommen?',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="12" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>`
  },
  {
    id: 'conv-4',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    english: 'Have a great evening!',
    phonetic: 'häv a greyt ihv-ning',
    german: 'Schönen Feierabend!',
    definition: 'Herzliche Verabschiedung zum Arbeitsende.',
    exampleEn: 'Great teamwork today! See you tomorrow and have a great evening!',
    exampleDe: 'Tolle Teamarbeit heute! Bis morgen und schönen Feierabend!',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
  },

  // --- URLAUB & REISE ---
  {
    id: 'trav-1',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    english: 'Boarding Pass & Departure Gate',
    phonetic: 'bor-ding päs & di-par-tscher geyt',
    german: 'Bordkarte & Abflug-Gate',
    definition: 'Wichtigste Begriffe am Flughafen für den Flugantritt.',
    exampleEn: 'Please proceed to gate B24 with your passport and boarding pass ready.',
    exampleDe: 'Bitte begeben Sie sich mit Ihrem Reisepass und Ihrer Bordkarte zu Gate B24.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>`
  },
  {
    id: 'trav-2',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    english: 'I have a reservation under the name...',
    phonetic: 'ai häv a re-ser-vey-shun an-der thö neym',
    german: 'Ich habe eine Reservierung auf den Namen...',
    definition: 'Standardsatz für Hotel-Check-in oder Mietwagenabholung.',
    exampleEn: 'Good evening, I have a hotel reservation under the name Istvan Csovrij.',
    exampleDe: 'Guten Abend, ich habe eine Hotelreservierung auf den Namen Istvan Csovrij.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="9" y1="13" x2="9.01" y2="13"/><line x1="15" y1="13" x2="15.01" y2="13"/></svg>`
  },
  {
    id: 'trav-3',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    english: 'Could you please tell me the way to...?',
    phonetic: 'kud ju plies tel mi thö wey tu',
    german: 'Könnten Sie mir bitte den Weg nach ... beschreiben?',
    definition: 'Klassische Orientierungsfrage nach Bahnstationen, Sehenswürdigkeiten oder Straßen.',
    exampleEn: 'Excuse me, could you please tell me the way to the central train station?',
    exampleDe: 'Entschuldigung, könnten Sie mir bitte den Weg zum Hauptbahnhof beschreiben?',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`
  },
  {
    id: 'trav-4',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    english: 'Could we please have the bill?',
    phonetic: 'kud wi plies häv thö bil',
    german: 'Könnten wir bitte die Rechnung bekommen?',
    definition: 'Höfliche Frage zum Bezahlen im Restaurant oder Café.',
    exampleEn: 'The food was delicious! Could we please have the bill?',
    exampleDe: 'Das Essen war köstlich! Könnten wir bitte die Rechnung bekommen?',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`
  }
];

const SPEECH_DATA = [
  {
    id: 'sp-1',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'I resolved the merge conflict in the git repository.',
    sentenceDe: 'Ich habe den Merge-Konflikt im Git-Repository gelöst.',
    phonetic: 'ai ri-solvd thö mördsh kon-flikt in thö git ri-po-si-to-ri.'
  },
  {
    id: 'sp-2',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'We write unit tests to ensure high software quality.',
    sentenceDe: 'Wir schreiben Unit-Tests, um hohe Softwarequalität sicherzustellen.',
    phonetic: 'wi rait yu-nit tests tu en-schur hai soft-wär kwo-li-ti.'
  },
  {
    id: 'sp-3',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'The primary key uniquely identifies each database row.',
    sentenceDe: 'Der Primärschlüssel identifiziert jede Datenbankzeile eindeutig.',
    phonetic: 'thö prai-mä-ri kih yu-nihk-li ai-den-ti-fais ihtsch dey-tuh-beys rou.'
  },
  {
    id: 'sp-4',
    category: 'business',
    categoryName: 'Job & Business',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'I will finish this user story before the sprint ends.',
    sentenceDe: 'Ich werde diese User Story vor dem Sprint-Ende abschließen.',
    phonetic: 'ai wil fi-nisch this yu-zer sto-ri bi-for thö sprint ends.'
  },
  {
    id: 'sp-5',
    category: 'business',
    categoryName: 'Job & Business',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'Can we schedule a quick call to discuss the API?',
    sentenceDe: 'Können wir einen kurzen Anruf planen, um die API zu besprechen?',
    phonetic: 'kän wi ske-dschul a kwik kohl tu dis-kas thö ey-pi-ai?'
  },
  {
    id: 'sp-6',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'Hello, my name is Istvan and I am learning English.',
    sentenceDe: 'Hallo, mein Name ist Istvan und ich lerne Englisch.',
    phonetic: 'häl-lo, mai neym is Istvan änd ai äm lör-ning ing-glisch.'
  },
  {
    id: 'sp-7',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'Excuse me, where is the departure gate for flight 402?',
    sentenceDe: 'Entschuldigung, wo ist das Abflug-Gate für Flug 402?',
    phonetic: 'ik-skyus mi, wär is thö di-par-tscher geyt for flait for-ou-tu?'
  },
  {
    id: 'sp-8',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    instruction: 'Höre zu und sprich den Satz laut nach:',
    sentenceEn: 'Could we please have two glasses of water and the menu?',
    sentenceDe: 'Könnten wir bitte zwei Gläser Wasser und die Speisekarte haben?',
    phonetic: 'kud wi plies häv tu glä-ses ow woh-ter änd thö men-yu?'
  }
];

const CLOZE_DATA = [
  {
    id: 'cl-1',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    question: 'Welches Fachwort gehört in die Lücke (IHK AP 1 Thema Git)?',
    sentenceBefore: 'When two programmers change the same line, Git raises a merge',
    sentenceAfter: '.',
    correctAnswer: 'conflict',
    options: ['conflict', 'package', 'hardware', 'meeting'],
    hint: 'Auf Deutsch: Merge-Konflikt.',
    explanation: 'Ein "merge conflict" entsteht, wenn automatische Änderungen in Git kollidieren und manuell gelöst werden müssen.'
  },
  {
    id: 'cl-2',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    question: 'SQL & Datenbank-Grundlagen:',
    sentenceBefore: 'To read data from a table, developers execute a',
    sentenceAfter: 'query in SQL.',
    correctAnswer: 'SELECT',
    options: ['SELECT', 'DELETE', 'DROP', 'INSERT'],
    hint: 'Der Befehl wählt Datensätze zum Lesen aus.',
    explanation: '"SELECT" ist das fundamentale Schlüsselwort in SQL zum Abfragen und Anzeigen gespeicherter Daten.'
  },
  {
    id: 'cl-3',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    question: 'Objektorientierte Programmierung (OOP):',
    sentenceBefore: 'In OOP, a blueprint used to instantiate objects is called a',
    sentenceAfter: '.',
    correctAnswer: 'class',
    options: ['class', 'loop', 'switch', 'pointer'],
    hint: 'Deutsch: Klasse / Bauplan.',
    explanation: 'Eine "class" (Klasse) definiert Attribute und Methoden, aus der konkrete Objekte erzeugt werden.'
  },
  {
    id: 'cl-4',
    category: 'business',
    categoryName: 'Job & Business',
    question: 'Scrum Standup Meeting:',
    sentenceBefore: 'I cannot finish my task because I am',
    sentenceAfter: 'by missing server access.',
    correctAnswer: 'blocked',
    options: ['blocked', 'entertained', 'celebrated', 'promoted'],
    hint: 'Bedeutet "blockiert" oder "aufgehalten".',
    explanation: '"I am blocked by..." ist die Standard-Formulierung im Daily Standup bei Hindernissen.'
  },
  {
    id: 'cl-5',
    category: 'business',
    categoryName: 'Job & Business',
    question: 'Projekt-Management:',
    sentenceBefore: 'We must work focused to meet the customer',
    sentenceAfter: 'this Friday.',
    correctAnswer: 'deadline',
    options: ['deadline', 'holiday', 'printer', 'game'],
    hint: 'Der Stichtag / Abgabetermin.',
    explanation: '"deadline" bezeichnet die verbindliche Frist zur Fertigstellung eines Projekts.'
  },
  {
    id: 'cl-6',
    category: 'conversation',
    categoryName: 'Smalltalk',
    question: 'Höfliche Begrüßung:',
    sentenceBefore: 'Hello and welcome! It is truly a pleasure to',
    sentenceAfter: 'you.',
    correctAnswer: 'meet',
    options: ['meet', 'cook', 'delete', 'download'],
    hint: 'Bedeutet treffen oder kennenlernen.',
    explanation: '"Nice / a pleasure to meet you" bedeutet: Schön, Sie/dich kennenzulernen.'
  },
  {
    id: 'cl-7',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    question: 'Hotel Check-in:',
    sentenceBefore: 'Good evening, I booked a room and have a',
    sentenceAfter: 'under the name Csovrij.',
    correctAnswer: 'reservation',
    options: ['reservation', 'keyboard', 'monitor', 'ticket'],
    hint: 'Bedeutet Reservierung oder Vorab-Buchung.',
    explanation: '"I have a reservation" sagt man beim Einchecken im Hotel oder Mietwagenschalter.'
  },
  {
    id: 'cl-8',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    question: 'Im Restaurant bezahlen:',
    sentenceBefore: 'The dinner was fantastic! Could you please bring us the',
    sentenceAfter: '?',
    correctAnswer: 'bill',
    options: ['bill', 'luggage', 'passport', 'keyboard'],
    hint: 'Bedeutet "die Rechnung" im Restaurant.',
    explanation: '"bill" (britisch) oder "check" (amerikanisch) ist die Restaurant-Rechnung.'
  }
];
