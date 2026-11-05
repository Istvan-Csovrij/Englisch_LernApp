// ============================================================
// Lern-Datenbank: Fachinformatiker AP 1, Business & Alltag
// ============================================================

const CATEGORIES = {
  all: { id: 'all', name: 'Alle Themen', icon: '🌐' },
  grammar: { id: 'grammar', name: 'Grammatik & Zeiten', icon: '📖' },
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
    definition: 'Genaue Beschreibung aller funktionalen und nicht-funktionalen Anforderungen an ein Softwaresystem vor der Entwicklung.',
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
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`
  },
  {
    id: 'fiae-3',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Merge Conflict',
    phonetic: 'mördsh kon-flikt',
    german: 'Zusammenführungskonflikt (Git)',
    definition: 'Tritt auf, wenn in zwei Branches dieselben Codezeilen geändert wurden und Git sie nicht automatisch mergen kann.',
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
    exampleEn: 'Hello, I am Alex, the new software developer. Nice to meet you!',
    exampleDe: 'Hallo, ich bin Alex, der neue Softwareentwickler. Freut mich, dich kennenzulernen!',
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
    exampleEn: 'Good evening, I have a hotel reservation under the name Alex Miller.',
    exampleDe: 'Guten Abend, ich habe eine Hotelreservierung auf den Namen Alex Miller.',
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
,
  // --- WEITERE FIAE AP 1 & IT-FACHBEGRIFFE ---
  {
    id: 'fiae-9',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Clean Architecture',
    phonetic: 'klihn ar-ki-tek-tscher',
    german: 'Saubere Software-Architektur (Schichtenmodell)',
    definition: 'Architekturmuster zur Trennung von Geschäftslogik, Frameworks und Benutzeroberfläche in unabhängige Schichten.',
    exampleEn: 'Clean architecture decouples core business logic from external database frameworks.',
    exampleDe: 'Saubere Architektur entkoppelt die Kern-Geschäftslogik von externen Datenbank-Frameworks.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`
  },
  {
    id: 'fiae-10',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Dependency Injection',
    phonetic: 'di-pen-den-si in-dschek-shun',
    german: 'Abhängigkeitsinjektion (lose Kopplung)',
    definition: 'Entwurfsmuster, bei dem Abhängigkeiten von außen an eine Klasse übergeben werden, anstatt sie intern selbst zu erzeugen.',
    exampleEn: 'Dependency injection makes unit testing much easier because mock services can be injected.',
    exampleDe: 'Dependency Injection erleichtert Modultests enorm, da Mock-Dienste übergeben werden können.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`
  },
  {
    id: 'fiae-11',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'API Endpoint',
    phonetic: 'ey-pi-ai end-point',
    german: 'Schnittstellen-Endpunkt (REST-URL)',
    definition: 'Spezifische URL einer Webschnittstelle, über die ein Client Daten anfordern oder verändern kann (z. B. per GET oder POST).',
    exampleEn: 'The frontend sends an HTTP GET request to the user profile API endpoint.',
    exampleDe: 'Das Frontend sendet eine HTTP-GET-Anfrage an den Schnittstellen-Endpunkt des Benutzerprofils.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`
  },
  {
    id: 'fiae-12',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Pull Request & Code Review',
    phonetic: 'pul ri-kwest & kohd ri-wju',
    german: 'Pull-Request & Code-Überprüfung',
    definition: 'Vorschlag von Codeänderungen an ein Repository, der vor dem Zusammenführen (Merge) von Kollegen geprüft wird.',
    exampleEn: 'Every pull request requires approval from at least one senior developer before merging.',
    exampleDe: 'Jeder Pull-Request erfordert vor dem Mergen die Freigabe von mindestens einem Senior-Entwickler.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`
  },
  {
    id: 'fiae-13',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Data Encapsulation',
    phonetic: 'dey-tuh en-k\xe4p-su-ley-shun',
    german: 'Datenkapselung (Information Hiding)',
    definition: 'OOP-Prinzip: Verbergen interner Datenzustände hinter privaten Attributen und kontrollierter Zugriff über Getter/Setter.',
    exampleEn: 'Encapsulation prevents unauthorized direct modification of private object fields.',
    exampleDe: 'Datenkapselung verhindert die unbefugte direkte Änderung privater Objekt-Attribute.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
  },
  {
    id: 'fiae-14',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Polymorphism',
    phonetic: 'po-li-mor-fi-s\xf6m',
    german: 'Vielgestaltigkeit (Objektorientierung)',
    definition: 'Fähigkeit verschiedener Klassen, auf denselben Methodenaufruf jeweils mit eigenem spezifischem Verhalten zu reagieren.',
    exampleEn: 'Polymorphism allows our payment processor to handle credit cards and PayPal through one interface.',
    exampleDe: 'Polymorphie ermöglicht es unserem Bezahldienst, Kreditkarten und PayPal über eine einheitliche Schnittstelle zu verarbeiten.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`
  },
  {
    id: 'fiae-15',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Primary Key & Database Index',
    phonetic: 'prai-m\xe4-ri kih & dey-tuh-beys in-deks',
    german: 'Primärschlüssel & Datenbankindex',
    definition: 'Ein Primärschlüssel identifiziert jeden Datensatz eindeutig. Ein Index beschleunigt Suchabfragen drastisch.',
    exampleEn: 'Adding a B-tree index on the email column reduced query execution time from 2 seconds to 4 milliseconds.',
    exampleDe: 'Das Hinzufügen eines B-Tree-Index auf der E-Mail-Spalte reduzierte die Abfragezeit von 2 Sekunden auf 4 Millisekunden.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5-4.5 4.5 2 2-2 2-2-2L3 17l4 4 3-3-2-2 2-2 2 2 4.5-4.5L15 10l3.5-3.5"/></svg>`
  },
  {
    id: 'fiae-16',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Refactoring & Technical Debt',
    phonetic: 'ri-f\xe4k-to-ring & tek-ni-kl det',
    german: 'Refactoring & Technische Schulden',
    definition: 'Verbessern der internen Codequalität und Lesbarkeit, ohne das äußere funktionale Verhalten der Software zu verändern.',
    exampleEn: 'We scheduled sprint tasks to refactor legacy spaghetti code and reduce technical debt.',
    exampleDe: 'Wir haben Sprint-Aufgaben eingeplant, um unübersichtlichen Altcode zu refaktorisieren und technische Schulden abzubauen.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`
  },
  {
    id: 'fiae-17',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Single Responsibility Principle',
    phonetic: 'sing-gl ri-spon-si-bi-li-ti prin-si-pl',
    german: 'Prinzip der eindeutigen Verantwortlichkeit (SOLID)',
    definition: 'Eine Klasse oder ein Modul sollte genau eine einzige wohldefinierte Aufgabe haben und nur einen einzigen Grund zur Änderung besitzen.',
    exampleEn: 'According to the Single Responsibility Principle, a class should do only one thing well.',
    exampleDe: 'Nach dem Single-Responsibility-Prinzip sollte eine Klasse nur genau eine Aufgabe gut erledigen.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`
  },
  {
    id: 'fiae-18',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Asynchronous Function (Async/Await)',
    phonetic: 'ey-sin-kro-n\xf6s fank-shun',
    german: 'Asynchrone Funktion (nicht-blockierend)',
    definition: 'Funktion, die im Hintergrund ausgeführt wird, ohne den Haupt-Thread oder die Benutzeroberfläche zu blockieren.',
    exampleEn: 'Using async and await prevents the user interface from freezing while fetching data from the server.',
    exampleDe: 'Die Nutzung von async und await verhindert das Einfrieren der Benutzeroberfläche während des Datenabrufs vom Server.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  },
  {
    id: 'fiae-19',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Scalability & Load Balancing',
    phonetic: 'skey-la-bi-li-ti & lohd b\xe4-len-sing',
    german: 'Skalierbarkeit & Lastverteilung',
    definition: 'Fähigkeit eines IT-Systems, mit steigender Benutzer- und Datenlast durch Hinzufügen von Ressourcen stabil weiterzuarbeiten.',
    exampleEn: 'The load balancer distributes incoming user requests evenly across multiple application servers.',
    exampleDe: 'Der Load Balancer verteilt eingehende Benutzeranfragen gleichmäßig auf mehrere Anwendungsserver.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1"/><path d="M18 8h4a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4"/></svg>`
  },
  {
    id: 'fiae-20',
    category: 'fiae',
    categoryName: 'FIAE AP 1 & IT',
    english: 'Deadlock & Concurrency',
    phonetic: 'ded-lok & kon-k\xf6-ren-si',
    german: 'Verklemmung & Nebenläufigkeit',
    definition: 'Zustand, bei dem zwei Threads wechselseitig auf Ressourcen warten, die der jeweils andere gesperrt hält.',
    exampleEn: 'Proper lock ordering is critical to prevent database deadlocks in concurrent applications.',
    exampleDe: 'Eine saubere Reihenfolge beim Sperren ist entscheidend, um Datenbank-Deadlocks bei nebenläufigen Zugriffen zu vermeiden.',
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
  }
,
  {
    "id": "biz-11",
    "category": "business",
    "categoryName": "Job & Business",
    "english": "Deliverable",
    "phonetic": "di-li-ver-e-bl",
    "german": "Projektergebnis / Liefergegenstand",
    "definition": "Ein greifbares oder immaterielles Ergebnis, das im Rahmen eines Projekts vertraglich bereitgestellt werden muss.",
    "exampleEn": "The documentation and unit test suite are essential project deliverables.",
    "exampleDe": "Die Dokumentation und die Unit-Test-Suite sind wesentliche Projektergebnisse."
  },
  {
    "id": "biz-12",
    "category": "business",
    "categoryName": "Job & Business",
    "english": "Escalation",
    "phonetic": "es-ka-ley-shun",
    "german": "Eskalation / Problemweiterleitung",
    "definition": "Die geordnete Übergabe eines ungelösten Problems an eine höhere Management- oder Fachebene.",
    "exampleEn": "If the critical database outage continues, an immediate escalation to senior management is required.",
    "exampleDe": "Wenn der kritische Datenbankausfall anhält, ist eine sofortige Eskalation an das Senior-Management erforderlich."
  },
  {
    "id": "biz-13",
    "category": "business",
    "categoryName": "Job & Business",
    "english": "Attachment",
    "phonetic": "e-tätsh-ment",
    "german": "Dateianhang (E-Mail / Ticket)",
    "definition": "Eine elektronische Datei, die einer E-Mail oder einem Ticketsystem beigefügt wird.",
    "exampleEn": "Please find the revised system architecture diagram in the email attachment.",
    "exampleDe": "Im E-Mail-Anhang finden Sie das überarbeitete Systemarchitekturdiagramm."
  },
  {
    "id": "biz-14",
    "category": "business",
    "categoryName": "Job & Business",
    "english": "Stakeholder",
    "phonetic": "steyk-hol-der",
    "german": "Projektbeteiligter / Interessengruppe",
    "definition": "Person oder Gruppe mit einem berechtigten Interesse am Verlauf oder Ergebnis eines Projekts.",
    "exampleEn": "We scheduled a demo meeting to present the sprint progress to all key stakeholders.",
    "exampleDe": "Wir haben ein Demo-Meeting angesetzt, um allen wichtigen Stakeholdern den Sprint-Fortschritt zu präsentieren."
  },
  {
    "id": "biz-15",
    "category": "business",
    "categoryName": "Job & Business",
    "english": "Workaround",
    "phonetic": "wörk-e-raund",
    "german": "Notlösung / Behelfsmethode",
    "definition": "Eine vorübergehende Umgehung eines Fehlers, bis ein dauerhafter Patch verfügbar ist.",
    "exampleEn": "We implemented a temporary workaround to keep the checkout service running.",
    "exampleDe": "Wir haben eine vorübergehende Notlösung implementiert, um den Checkout-Dienst am Laufen zu halten."
  },
  {
    "id": "fiae-11",
    "category": "fiae",
    "categoryName": "FIAE AP 1 & IT",
    "english": "Refactoring",
    "phonetic": "ri-fäk-te-ring",
    "german": "Code-Überarbeitung / Refaktorisierung",
    "definition": "Strukturverbesserung von Quellcode ohne Veränderung des extern beobachtbaren Verhaltens.",
    "exampleEn": "Refactoring the legacy backend module improved readability and execution speed.",
    "exampleDe": "Die Refaktorisierung des veralteten Backend-Moduls verbesserte die Lesbarkeit und Ausführungsgeschwindigkeit."
  },
  {
    "id": "fiae-12",
    "category": "fiae",
    "categoryName": "FIAE AP 1 & IT",
    "english": "Redundancy",
    "phonetic": "ri-dan-den-si",
    "german": "Redundanz / Ausfallsicherheit",
    "definition": "Mehrfaches Vorhandensein funktionsgleicher Ressourcen zum Schutz vor Ausfällen.",
    "exampleEn": "Hardware redundancy prevents server downtime if one power supply fails.",
    "exampleDe": "Hardware-Redundanz verhindert Server-Ausfallzeiten, wenn ein Netzteil ausfällt."
  },
  {
    "id": "fiae-13",
    "category": "fiae",
    "categoryName": "FIAE AP 1 & IT",
    "english": "Continuous Integration",
    "phonetic": "kon-ti-nju-es in-te-grey-shun",
    "german": "Kontinuierliche Integration (CI)",
    "definition": "Automatisiertes Zusammenführen und Testen von Codeänderungen in einem gemeinsamen Repository.",
    "exampleEn": "Our continuous integration pipeline runs automated tests on every pull request.",
    "exampleDe": "Unsere Continuous-Integration-Pipeline führt bei jedem Pull Request automatisierte Tests durch."
  },
  {
    "id": "fiae-14",
    "category": "fiae",
    "categoryName": "FIAE AP 1 & IT",
    "english": "Deployment",
    "phonetic": "di-ploy-ment",
    "german": "Bereitstellung / Auslieferung",
    "definition": "Das Verteilen, Installieren und Aktivieren einer Softwareanwendung in einer Zielumgebung.",
    "exampleEn": "The automated production deployment was completed without any downtime.",
    "exampleDe": "Das automatisierte Produktions-Deployment wurde ohne Ausfallzeit abgeschlossen."
  }
,
  {
    id: 'voc_agenda',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Agenda',
    phonetic: 'ä-dschen-da',
    german: 'Tagesordnung / Ablaufplan',
    definition: 'A list of items to be discussed or acted upon at a meeting.',
    exampleEn: 'Before we start the meeting, let\'s quickly review today\'s agenda.',
    exampleDe: 'Bevor wir das Meeting starten, lasst uns kurz die heutige Tagesordnung durchgehen.',
    svg: '<svg viewBox="0 0 100 100"><rect x="25" y="15" width="50" height="70" rx="6" fill="none" stroke="#38bdf8" stroke-width="4"/><line x1="35" y1="30" x2="65" y2="30" stroke="#38bdf8" stroke-width="4"/><line x1="35" y1="45" x2="65" y2="45" stroke="#38bdf8" stroke-width="4"/><line x1="35" y1="60" x2="55" y2="60" stroke="#38bdf8" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_action_item',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Action Item',
    phonetic: 'äk-schen ay-tem',
    german: 'Aufgabenpunkt / To-Do',
    definition: 'A specific task or action that needs to be completed, usually assigned to an individual during a meeting.',
    exampleEn: 'My action item from the sprint retrospective is to update our API documentation.',
    exampleDe: 'Mein Aufgabenpunkt aus der Sprint-Retrospektive ist es, unsere API-Dokumentation zu aktualisieren.',
    svg: '<svg viewBox="0 0 100 100"><circle cx="35" cy="35" r="8" fill="#10b981"/><line x1="50" y1="35" x2="80" y2="35" stroke="#e2e8f0" stroke-width="4"/><circle cx="35" cy="65" r="8" fill="#10b981"/><line x1="50" y1="65" x2="80" y2="65" stroke="#e2e8f0" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_deliverable',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Deliverable',
    phonetic: 'di-liw-er-a-bel',
    german: 'Projektergebnis / Liefergegenstand',
    definition: 'A tangible product or service given to a client or stakeholder upon project milestone completion.',
    exampleEn: 'The main deliverable for this sprint is the user registration endpoint.',
    exampleDe: 'Das wichtigste Projektergebnis für diesen Sprint ist der Endpunkt für die Benutzerregistrierung.',
    svg: '<svg viewBox="0 0 100 100"><rect x="25" y="30" width="50" height="50" rx="6" fill="none" stroke="#f59e0b" stroke-width="4"/><polygon points="25,30 50,15 75,30 50,45" fill="#f59e0b" opacity="0.5"/></svg>'
  },
  {
    id: 'voc_consensus',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Consensus',
    phonetic: 'kon-sen-sas',
    german: 'Einigung / Übereinstimmung',
    definition: 'A general agreement reached by all members of a group or team.',
    exampleEn: 'After an open discussion, the engineering team reached a consensus on using PostgreSQL.',
    exampleDe: 'Nach einer offenen Diskussion erzielte das Entwicklerteam eine Einigung über die Nutzung von PostgreSQL.',
    svg: '<svg viewBox="0 0 100 100"><circle cx="35" cy="45" r="16" fill="#38bdf8" opacity="0.6"/><circle cx="65" cy="45" r="16" fill="#10b981" opacity="0.6"/><path d="M40,75 L60,75" stroke="#fff" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_stakeholder',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Stakeholder',
    phonetic: 'steyk-hol-der',
    german: 'Projektbeteiligter / Interessengruppe',
    definition: 'Any person or organization that has a legitimate interest in the outcome of a software project.',
    exampleEn: 'We will present the working demo to key business stakeholders on Friday.',
    exampleDe: 'Wir werden die lauffähige Demo am Freitag den wichtigsten Projektbeteiligten vorstellen.',
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="35" r="15" fill="none" stroke="#a855f7" stroke-width="4"/><path d="M25,75 C25,55 75,55 75,75" fill="none" stroke="#a855f7" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_escalation',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Escalation',
    phonetic: 'es-ka-ley-schen',
    german: 'Eskalation / Weiterleitung an höhere Stelle',
    definition: 'The process of raising an unresolved issue or blocker to higher authority levels for quick resolution.',
    exampleEn: 'If the third-party API remains down, we will initiate an immediate management escalation.',
    exampleDe: 'Wenn die Drittanbieter-API weiterhin down bleibt, leiten wir eine sofortige Management-Eskalation ein.',
    svg: '<svg viewBox="0 0 100 100"><path d="M20,80 L80,20 M80,20 L50,20 M80,20 L80,50" fill="none" stroke="#ef4444" stroke-width="5"/></svg>'
  },
  {
    id: 'voc_workaround',
    category: 'daily',
    categoryName: 'Tägliche IT-Begriffe',
    english: 'Workaround',
    phonetic: 'wörk-a-rawnd',
    german: 'Behelfslösung / Übergangslösung',
    definition: 'A temporary method to bypass a bug or problem while waiting for a permanent fix.',
    exampleEn: 'We applied a quick workaround so users can log in while we patch the root cause.',
    exampleDe: 'Wir haben eine schnelle Übergangslösung eingerichtet, damit sich Benutzer einloggen können, während wir die Ursache beheben.',
    svg: '<svg viewBox="0 0 100 100"><path d="M20,50 Q50,15 80,50" fill="none" stroke="#f59e0b" stroke-width="4" stroke-dasharray="6,6"/><line x1="20" y1="50" x2="80" y2="50" stroke="#ef4444" stroke-width="3"/></svg>'
  },
  {
    id: 'voc_redundancy',
    category: 'architecture',
    categoryName: 'Architektur & Clean Code',
    english: 'Redundancy',
    phonetic: 'ri-dan-den-si',
    german: 'Ausfallsicherheit / Redundanz',
    definition: 'Duplication of critical components to increase system reliability in case of failure.',
    exampleEn: 'Our database cluster uses multi-region redundancy to ensure zero downtime.',
    exampleDe: 'Unser Datenbank-Cluster nutzt regionsübergreifende Redundanz, um Ausfallzeiten zu verhindern.',
    svg: '<svg viewBox="0 0 100 100"><rect x="20" y="35" width="28" height="30" rx="4" fill="none" stroke="#10b981" stroke-width="4"/><rect x="52" y="35" width="28" height="30" rx="4" fill="none" stroke="#10b981" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_bottleneck',
    category: 'daily',
    categoryName: 'Tägliche IT-Begriffe',
    english: 'Bottleneck',
    phonetic: 'bot-tel-nek',
    german: 'Engpass / Leistungsengstelle',
    definition: 'A point of congestion in a system that limits overall throughput and performance.',
    exampleEn: 'Unindexed database queries were the primary bottleneck in our backend application.',
    exampleDe: 'Nicht indexierte Datenbankabfragen waren der Hauptengpass in unserer Backend-Anwendung.',
    svg: '<svg viewBox="0 0 100 100"><path d="M35,20 L65,20 L65,40 L80,75 L20,75 L35,40 Z" fill="none" stroke="#f59e0b" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_feasible',
    category: 'daily',
    categoryName: 'Tägliche IT-Begriffe',
    english: 'Feasible',
    phonetic: 'fie-si-bel',
    german: 'Machbar / umsetzbar',
    definition: 'Possible to do easily or conveniently within given resources and time constraints.',
    exampleEn: 'Delivering this feature by next sprint is technically feasible with our current team.',
    exampleDe: 'Dieses Feature bis zum nächsten Sprint zu liefern, ist mit unserem aktuellen Team technisch machbar.',
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="none" stroke="#10b981" stroke-width="4"/><polyline points="35,50 45,62 65,38" fill="none" stroke="#10b981" stroke-width="5"/></svg>'
  },
  {
    id: 'voc_reliable',
    category: 'daily',
    categoryName: 'Tägliche IT-Begriffe',
    english: 'Reliable',
    phonetic: 'ri-lay-a-bel',
    german: 'Zuverlässig / verlässlich',
    definition: 'Consistently good in quality or performance; able to be trusted.',
    exampleEn: 'We write comprehensive unit tests to ensure our payment service is 100% reliable.',
    exampleDe: 'Wir schreiben umfassende Unit-Tests, um sicherzustellen, dass unser Bezahldienst 100% verlässlich ist.',
    svg: '<svg viewBox="0 0 100 100"><path d="M50,15 L78,30 L78,60 C78,75 50,88 50,88 C50,88 22,75 22,60 L22,30 Z" fill="none" stroke="#38bdf8" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_challenging',
    category: 'daily',
    categoryName: 'Tägliche IT-Begriffe',
    english: 'Challenging',
    phonetic: 'tschäl-len-dsching',
    german: 'Herausfordernd / anspruchsvoll',
    definition: 'Testing one\'s abilities; demanding and rewarding effort.',
    exampleEn: 'Refactoring the legacy microservices architecture was challenging but highly rewarding.',
    exampleDe: 'Die Überarbeitung der Altsystem-Microservices-Architektur war herausfordernd, aber sehr lohnend.',
    svg: '<svg viewBox="0 0 100 100"><polygon points="50,15 90,80 10,80" fill="none" stroke="#a855f7" stroke-width="4"/><circle cx="50" cy="45" r="5" fill="#a855f7"/></svg>'
  },
  {
    id: 'voc_clarify',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Clarify',
    phonetic: 'klär-i-fai',
    german: 'Klären / verdeutlichen',
    definition: 'To make a statement or situation less confused and more clearly comprehensible.',
    exampleEn: 'Could we schedule a five-minute call to clarify the acceptance criteria for this user story?',
    exampleDe: 'Könnten wir ein 5-Minuten-Telefonat vereinbaren, um die Akzeptanzkriterien für diese User Story zu klären?',
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="45" r="25" fill="none" stroke="#38bdf8" stroke-width="4"/><line x1="50" y1="35" x2="50" y2="50" stroke="#38bdf8" stroke-width="4"/><circle cx="50" cy="58" r="2" fill="#38bdf8"/></svg>'
  },
  {
    id: 'voc_postpone',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Postpone',
    phonetic: 'post-pown',
    german: 'Verschieben / vertagen',
    definition: 'To cause or arrange for an event or task to take place at a later time than originally scheduled.',
    exampleEn: 'Because two key developers are ill, we decided to postpone the deployment until Monday.',
    exampleDe: 'Da zwei wichtige Entwickler krank sind, haben wir beschlossen, das Deployment auf Montag zu verschieben.',
    svg: '<svg viewBox="0 0 100 100"><circle cx="45" cy="50" r="28" fill="none" stroke="#f59e0b" stroke-width="4"/><line x1="45" y1="32" x2="45" y2="50" stroke="#f59e0b" stroke-width="4"/><line x1="45" y1="50" x2="60" y2="50" stroke="#f59e0b" stroke-width="4"/><path d="M75,45 L85,55 L75,65" fill="none" stroke="#f59e0b" stroke-width="4"/></svg>'
  },
  {
    id: 'voc_deadline',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Deadline',
    phonetic: 'ded-layn',
    german: 'Abgabefrist / Stichtag',
    definition: 'The latest time or date by which something should be completed.',
    exampleEn: 'Our final project submission deadline for the FIAE examination committee is next month.',
    exampleDe: 'Unsere finale Projektabgabefrist für den FIAE-Prüfungsausschuss ist nächsten Monat.',
    svg: '<svg viewBox="0 0 100 100"><rect x="20" y="20" width="60" height="60" rx="6" fill="none" stroke="#ef4444" stroke-width="4"/><line x1="20" y1="38" x2="80" y2="38" stroke="#ef4444" stroke-width="4"/><circle cx="50" cy="58" r="10" fill="#ef4444"/></svg>'
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
    sentenceEn: 'Hello, my name is Alex and I am learning English.',
    sentenceDe: 'Hallo, mein Name ist Alex und ich lerne Englisch.',
    phonetic: 'häl-lo, mai neym is Älex änd ai äm lör-ning ing-glisch.'
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
,
  {
    "id": "sp-9",
    "category": "business",
    "categoryName": "Job & Business",
    "instruction": "Höre zu und sprich den Satz laut nach:",
    "sentenceEn": "Could you please send me the updated project timeline by this afternoon?",
    "sentenceDe": "Könnten Sie mir bitte bis heute Nachmittag den aktualisierten Projektzeitplan zusenden?",
    "phonetic": "kud ju plis send mi thi ap-dey-ted pro-dshekt taim-lain bai this af-ter-nun?"
  },
  {
    "id": "sp-10",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "instruction": "Höre zu und sprich den Satz laut nach:",
    "sentenceEn": "I have worked with relational databases and SQL for three years.",
    "sentenceDe": "Ich arbeite seit drei Jahren mit relationalen Datenbanken und SQL.",
    "phonetic": "ai häv wörkt with ri-ley-shun-el dey-te-bey-ses änd es-kju-el for thri jiars."
  },
  {
    "id": "sp-11",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "instruction": "Höre zu und sprich den Satz laut nach:",
    "sentenceEn": "Did you review the pull request before merging it into main?",
    "sentenceDe": "Hast du den Pull Request überprüft, bevor du ihn in Main gemergt hast?",
    "phonetic": "did ju ri-vju thö pul ri-kwest bi-for mördsh-ing it in-tu meyn?"
  },
  {
    "id": "sp-12",
    "category": "business",
    "categoryName": "Job & Business",
    "instruction": "Höre zu und sprich den Satz laut nach:",
    "sentenceEn": "I look forward to hearing from you and discussing the technical details.",
    "sentenceDe": "Ich freue mich darauf, von Ihnen zu hören und die technischen Details zu besprechen.",
    "phonetic": "ai luk for-ward tu hi-ring from ju änd dis-ka-sing thö tek-ni-kl di-teyls."
  }
,
  {
    id: 'sp_meet_1',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Could you please elaborate on that point?',
    phonetic: 'kud ju plies i-läb-o-reyt on dät poynt?',
    german: 'Könntest du diesen Punkt bitte näher ausführen?',
    context: 'Höflich nach weiteren Details in einer Besprechung fragen.'
  },
  {
    id: 'sp_meet_2',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Let\'s take this discussion offline and follow up after the standup.',
    phonetic: 'lets teyk dis dis-kasch-en off-layn änd fol-lo ap af-ter de ständ-ap.',
    german: 'Lass uns diese Diskussion bilateral (offline) nach dem Standup fortsetzen.',
    context: 'Standard-Meeting-Phrase, um Zeit bei Detaildiskussionen zu sparen.'
  },
  {
    id: 'sp_meet_3',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Can everyone see my shared screen properly?',
    phonetic: 'kän ev-ri-wan sie mai schärd skrien prop-er-li?',
    german: 'Können alle meinen geteilten Bildschirm gut sehen?',
    context: 'Typischer Einstieg in Online-Meetings und Demos.'
  },
  {
    id: 'sp_meet_4',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'I see your point, but we have to consider database latency.',
    phonetic: 'ai sie jor poynt, bat wi häf tu kon-si-der dey-ta-beys ley-ten-si.',
    german: 'Ich verstehe deinen Punkt, aber wir müssen die Datenbank-Latenz bedenken.',
    context: 'Höflich Einwände oder technische Bedenken einbringen.'
  },
  {
    id: 'sp_meet_5',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Let\'s summarize the key action items before we wrap up.',
    phonetic: 'lets sam-ma-rays de kie äk-schen ay-tems bi-for wi räp ap.',
    german: 'Lass uns die wichtigsten Aufgabenpunkte zusammenfassen, bevor wir abschließen.',
    context: 'Besprechungen mit klaren Verantwortlichkeiten beenden.'
  },
  {
    id: 'sp_meet_6',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'I have a blocker regarding server permissions from the DevOps team.',
    phonetic: 'ai häf a blok-ker ri-gar-ding ser-ver per-misch-ens from de dev-ops tiem.',
    german: 'Ich habe ein Hindernis (Blocker) bezüglich der Server-Berechtigungen vom DevOps-Team.',
    context: 'Im Daily Standup ein Problem klar und professionell ansprechen.'
  },
  {
    id: 'sp_meet_7',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Who is the primary owner of this sprint ticket?',
    phonetic: 'hu is de pray-ma-ri ow-ner of dis sprint tik-ket?',
    german: 'Wer ist der Hauptverantwortliche für dieses Sprint-Ticket?',
    context: 'Zuständigkeiten im Team klären.'
  },
  {
    id: 'sp_meet_8',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'I completely agree with this architecture proposal.',
    phonetic: 'ai kom-pliet-li ä-grie wid dis ar-ki-tek-tscher pro-po-sal.',
    german: 'Ich stimme diesem Architekturvorschlag voll und ganz zu.',
    context: 'Zustimmung in technischen Diskussionen ausdrücken.'
  },
  {
    id: 'sp_meet_9',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'Sorry to interrupt, but could you clarify what you mean by that?',
    phonetic: 'sor-ri tu in-ter-rapt, bat kud ju klär-i-fai wat ju mien bai dät?',
    german: 'Entschuldige die Unterbrechung, aber könntest du klarstellen, was du damit meinst?',
    context: 'Höfliches Nachfragen und Unterbrechen in Diskussionen.'
  },
  {
    id: 'sp_meet_10',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    english: 'What is our estimated timeline for deploying this release?',
    phonetic: 'wat is awer es-ti-mey-ted taym-layn for dip-loy-ing dis ri-lies?',
    german: 'Wie sieht unser geschätzter Zeitplan für die Veröffentlichung dieses Releases aus?',
    context: 'Fristen und Veröffentlichungstermine erfragen.'
  },
  {
    id: 'sp_cas_1',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'Good morning! How was your weekend? Did you do anything fun?',
    phonetic: 'gud mor-ning! haw was jor wiek-end? did ju du en-i-thing fan?',
    german: 'Guten Morgen! Wie war dein Wochenende? Hast du etwas Schönes gemacht?',
    context: 'Klassischer Montagmorgen-Smalltalk im Team.'
  },
  {
    id: 'sp_cas_2',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'I am learning English step by step to communicate better with international teams.',
    phonetic: 'ai äm lör-ning ing-glisch step bai step tu kom-mju-ni-keyt bet-ter wid in-ter-nä-schon-al tiems.',
    german: 'Ich lerne Schritt für Schritt Englisch, um besser mit internationalen Teams zu kommunizieren.',
    context: 'Die eigene Motivation und Lernfortschritte erklären.'
  },
  {
    id: 'sp_cas_3',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'Could you speak a little slower, please? I am still practicing my English.',
    phonetic: 'kud ju spiek a lit-tel slow-er, plies? ai äm stil präk-ti-sing mai ing-glisch.',
    german: 'Könntest du bitte etwas langsamer sprechen? Ich übe noch mein Englisch.',
    context: 'Freundliche Bitte um langsameres Sprechtempo ohne Scheu.'
  },
  {
    id: 'sp_cas_4',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'In my free time, I really enjoy producing electronic music with synthesizers.',
    phonetic: 'in mai frie taym, ai riel-li en-djoy pro-dju-sing e-lek-tron-ik mju-sik wid syn-the-say-sers.',
    german: 'In meiner Freizeit mache ich sehr gerne elektronische Musik mit Synthesizern.',
    context: 'Über eigene Hobbys und Leidenschaften erzählen.'
  },
  {
    id: 'sp_cas_5',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'I usually start my morning with a hot cup of fresh black coffee.',
    phonetic: 'ai ju-schu-al-li start mai mor-ning wid a hot kap of fresch bläk kof-fie.',
    german: 'Ich starte meinen Morgen gewöhnlich mit einer heißen Tasse frischem schwarzem Kaffee.',
    context: 'Alltagsroutine in der Kaffeeküche.'
  },
  {
    id: 'sp_cas_6',
    category: 'daily',
    categoryName: 'Alltag & Konversation',
    english: 'Thank you so much for your patient help! I really appreciate it.',
    phonetic: 'thänk ju so matsch for jor pey-schent help! ai riel-li äp-prie-schi-eyt it.',
    german: 'Vielen Dank für deine geduldige Hilfe! Ich schätze das wirklich sehr.',
    context: 'Herzlicher und professioneller Dank an Kollegen oder Tutoren.'
  },
  {
    id: 'sp_dev_1',
    category: 'architecture',
    categoryName: 'Architektur & Clean Code',
    english: 'We should separate the business logic from the database access layer.',
    phonetic: 'wi schud sep-a-reyt de bis-nes lod-dschik from de dey-ta-beys äk-ses ley-er.',
    german: 'Wir sollten die Geschäftslogik von der Datenbank-Zugriffsschicht trennen.',
    context: 'Architekturprinzip der Schichtenarchitektur (Separation of Concerns).'
  },
  {
    id: 'sp_dev_2',
    category: 'database',
    categoryName: 'Datenbanken & SQL',
    english: 'Adding a composite index reduced our query response time from two seconds to fifty milliseconds.',
    phonetic: 'äd-ding a kom-po-sit in-deks ri-djust awer kwie-ri ri-spons taym from tu sek-onds tu fif-ti mil-li-sek-onds.',
    german: 'Das Hinzufügen eines zusammengesetzten Index hat unsere Abfragezeit von zwei Sekunden auf 50 Millisekunden gesenkt.',
    context: 'Erfolgreiche Performance-Optimierung im Standup berichten.'
  },
  {
    id: 'sp_dev_3',
    category: 'architecture',
    categoryName: 'Architektur & Clean Code',
    english: 'Automated unit tests give us confidence when refactoring legacy code.',
    phonetic: 'aw-to-mey-ted ju-nit tests gif as kon-fi-dens wen ri-fäk-tor-ing leg-a-si kowd.',
    german: 'Automatisierte Unit-Tests geben uns Sicherheit bei der Überarbeitung von Altsystemen.',
    context: 'Bedeutung von Testautomatisierung erklären.'
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
,
  {
    "id": "cl-9",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welches Wort vervollständigt den Satz im Present Simple (He/She/It-Regel)?",
    "sentenceBefore": "Our lead developer always",
    "sentenceAfter": "the code before pushing to production.",
    "correctAnswer": "tests",
    "options": [
      "tests",
      "test",
      "is testing",
      "tested"
    ],
    "hint": "Regel aus Zusammenfassung Tenses: Bei he/she/it muss ein -s ans Verb!",
    "explanation": "Subjekt 'Our lead developer' ist 3. Person Singular (he/she). Im Present Simple für regelmäßige Routinen ('always') lautet die Form 'tests'."
  },
  {
    "id": "cl-10",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welches Hilfsverb gehört in die Verneinung im Present Simple?",
    "sentenceBefore": "She",
    "sentenceAfter": "like working with outdated legacy software.",
    "correctAnswer": "doesn't",
    "options": [
      "doesn't",
      "don't",
      "isn't",
      "haven't"
    ],
    "hint": "3. Person Singular he/she/it wird mit 'does not' / 'doesn't' verneint.",
    "explanation": "Bei he/she/it wird die Verneinung mit 'does not' bzw. 'doesn't' + Infinitiv gebildet: 'She doesn't like...'."
  },
  {
    "id": "cl-11",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welches Hilfsverb bildet die Frage nach dem ASI-Prinzip (Auxiliary + Subject + Infinitive)?",
    "sentenceBefore": "",
    "sentenceAfter": "you understand how RESTful API endpoints communicate?",
    "correctAnswer": "Do",
    "options": [
      "Do",
      "Are",
      "Have",
      "Is"
    ],
    "hint": "ASI-Formel für geschlossene Ja/Nein-Fragen an 'you': Do + you + understand.",
    "explanation": "Nach dem ASI-Prinzip (Auxiliary - Subject - Infinitive) lautet die Frage: 'Do you understand...?'. Niemals 'Understand you...?'!"
  },
  {
    "id": "cl-12",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welches Hilfsverb gehört in die W-Frage nach dem QuASI-Prinzip?",
    "sentenceBefore": "Where",
    "sentenceAfter": "he store the encryption keys for the database?",
    "correctAnswer": "does",
    "options": [
      "does",
      "do",
      "is",
      "has"
    ],
    "hint": "QuASI: Question word (Where) + Auxiliary (does für he) + Subject (he) + Infinitive (store).",
    "explanation": "QuASI-Prinzip für he/she/it: Fragewort (Where) + does + he + Infinitiv (store)."
  },
  {
    "id": "cl-13",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welche Form des Present Continuous drückt aus, was GENAU JETZT passiert?",
    "sentenceBefore": "The DevOps engineer",
    "sentenceAfter": "the server update right now.",
    "correctAnswer": "is deploying",
    "options": [
      "is deploying",
      "deploys",
      "deployed",
      "deploy"
    ],
    "hint": "Signalwort 'right now': am/is/are + Verb mit -ing.",
    "explanation": "Handlungen, die im Moment des Sprechens ablaufen ('right now'), verlangen das Present Continuous: 'is deploying'."
  },
  {
    "id": "cl-14",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welche Form beachtet die Konsonantenverdopplung beim Present Continuous?",
    "sentenceBefore": "Look at the terminal! The test suite is",
    "sentenceAfter": "very smoothly.",
    "correctAnswer": "running",
    "options": [
      "running",
      "runing",
      "runed",
      "ran"
    ],
    "hint": "Bei kurzem, betonten Vokal vor dem Endkonsonanten (r-u-n) wird der Konsonant verdoppelt!",
    "explanation": "Verben wie run, stop, swim verdoppeln den Endkonsonanten vor -ing: run > running."
  },
  {
    "id": "cl-15",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welche unregelmäßige Simple-Past-Form ist korrekt für 'go'?",
    "sentenceBefore": "Yesterday after the standup meeting, the team",
    "sentenceAfter": "to the server room.",
    "correctAnswer": "went",
    "options": [
      "went",
      "goed",
      "gone",
      "goes"
    ],
    "hint": "Unregelmäßige Verben: 1. go, 2. went, 3. gone.",
    "explanation": "Das Simple Past (2. Form) von 'go' ist unregelmäßig und lautet 'went'."
  },
  {
    "id": "cl-16",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Goldene Regel bei didn't: Welches Verb folgt nach didn't?",
    "sentenceBefore": "We checked the firewall logs, but we didn't",
    "sentenceAfter": "any suspicious network traffic.",
    "correctAnswer": "see",
    "options": [
      "see",
      "saw",
      "seen",
      "seeing"
    ],
    "hint": "WICHTIGSTE ENGLISCH-REGEL: Nach 'didn't' steht IMMER der reine Infinitiv!",
    "explanation": "Weil 'didn't' bereits die Vergangenheitsform trägt, MUSS das folgende Verb im reinen Infinitiv stehen: 'didn't see' (NIEMALS 'didn't saw')."
  },
  {
    "id": "cl-17",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welche unregelmäßige Simple-Past-Form ist korrekt für 'write'?",
    "sentenceBefore": "Last week, Alex",
    "sentenceAfter": "a Python script to automate the backup.",
    "correctAnswer": "wrote",
    "options": [
      "wrote",
      "writed",
      "written",
      "writes"
    ],
    "hint": "Unregelmäßige 2. Form von write: write > wrote > written.",
    "explanation": "Das Simple Past von write heißt 'wrote' (abgeschlossene Handlung mit Signalwort 'Last week')."
  },
  {
    "id": "cl-18",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Since oder For? Welches Wort steht vor einer Zeitdauer / Menge von Jahren?",
    "sentenceBefore": "I have lived in Germany",
    "sentenceAfter": "five years.",
    "correctAnswer": "for",
    "options": [
      "for",
      "since",
      "during",
      "from"
    ],
    "hint": "FOR wird mit Zahlen und Zeitspannen genutzt (for 5 years). SINCE nur bei Zeitpunkten!",
    "explanation": "'For' beschreibt Zeitmengen und Dauern ('for five years'). 'Since' beschreibt feste Startzeitpunkte ('since 2019')."
  },
  {
    "id": "cl-19",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Since oder For? Welches Wort steht vor einem konkreten Kalenderjahr / Startzeitpunkt?",
    "sentenceBefore": "She has worked as an IT specialist at this company",
    "sentenceAfter": "2021.",
    "correctAnswer": "since",
    "options": [
      "since",
      "for",
      "ago",
      "until"
    ],
    "hint": "2021 ist ein fester Zeitpunkt auf der Zeitachse: hier MUSS 'since' stehen!",
    "explanation": "'Since' markiert den festen Anfangszeitpunkt in der Vergangenheit ('since 2021', 'since Monday')."
  },
  {
    "id": "cl-20",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welche Form des Present Perfect verbindet Vergangenheit und Gegenwart?",
    "sentenceBefore": "We",
    "sentenceAfter": "already resolved the bug, so you can test it now.",
    "correctAnswer": "have",
    "options": [
      "have",
      "had",
      "are",
      "did"
    ],
    "hint": "Present Perfect = have/has + 3. Form (resolved).",
    "explanation": "Für 'we' wird im Present Perfect 'have' verwendet: 'We have already resolved the bug'."
  },
  {
    "id": "cl-21",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Wann nutzen wir das will-future? Für spontane Entschlüsse oder Vorhersagen!",
    "sentenceBefore": "The customer is calling right now. Don't worry, I",
    "sentenceAfter": "answer the phone.",
    "correctAnswer": "will",
    "options": [
      "will",
      "going to",
      "am",
      "have"
    ],
    "hint": "Spontaner Entschluss im Moment des Sprechens verlangt das Will-Future!",
    "explanation": "Spontane Reaktionen ('Ich gehe ran!') werden mit will + Infinitiv gebildet: 'I will answer the phone'."
  },
  {
    "id": "cl-22",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Wann nutzen wir going-to? Wenn die Zukunft in der Gegenwart schon sichtbar ist!",
    "sentenceBefore": "Look at the error counter spiking! The server is",
    "sentenceAfter": "to crash.",
    "correctAnswer": "going",
    "options": [
      "going",
      "will",
      "about",
      "must"
    ],
    "hint": "Sichtbares Vorzeichen in der Gegenwart: is going to + Infinitiv.",
    "explanation": "Wenn ein Ereignis durch gegenwärtige Anzeichen unmittelbar bevorsteht, nutzt man 'going to': 'The server is going to crash'."
  },
  {
    "id": "cl-23",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "If-Clause Type 1: Reale Bedingung in der Zukunft. Welches Verb steht im If-Teilsatz?",
    "sentenceBefore": "If the CI/CD pipeline",
    "sentenceAfter": "successfully, we will deploy the app.",
    "correctAnswer": "finishes",
    "options": [
      "finishes",
      "will finish",
      "finished",
      "would finish"
    ],
    "hint": "Merke: Niemals 'will' im If-Satz! Im If-Satz steht das Present Simple!",
    "explanation": "Im Konditionalsatz Typ 1 steht im If-Satz das Present Simple ('finishes') und im Hauptsatz das Will-Future ('will deploy')."
  },
  {
    "id": "cl-24",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "If-Clause Type 2: Hypothetische Bedingung. Welche Form steht im If-Teil?",
    "sentenceBefore": "If I",
    "sentenceAfter": "more RAM on my development machine, I would run three Docker containers simultaneously.",
    "correctAnswer": "had",
    "options": [
      "had",
      "have",
      "would have",
      "will have"
    ],
    "hint": "Typ 2 (hypothetisch): If + Simple Past (had), Folge mit would + Infinitiv.",
    "explanation": "Hypothetische Situationen verlangen im If-Satz das Simple Past ('had') und im Folgesatz 'would run'."
  },
  {
    "id": "cl-25",
    "category": "business",
    "categoryName": "Job & Business",
    "question": "Welches Wort vervollständigt die typische englische E-Mail-Formel für Anhänge?",
    "sentenceBefore": "Please find",
    "sentenceAfter": "the technical requirements and sprint backlog.",
    "correctAnswer": "attached",
    "options": [
      "attached",
      "attaching",
      "enclosed",
      "appended"
    ],
    "hint": "Aus Dr. Higgins-Welters Business English: 'Please find attached...'.",
    "explanation": "Die Standardformel für E-Mail-Anhänge lautet: 'Please find attached [the document]'."
  },
  {
    "id": "cl-26",
    "category": "business",
    "categoryName": "Job & Business",
    "question": "Welche Form folgt auf die Redewendung 'I look forward to...'?",
    "sentenceBefore": "I look forward to",
    "sentenceAfter": "from you regarding our interview appointment.",
    "correctAnswer": "hearing",
    "options": [
      "hearing",
      "hear",
      "heard",
      "be heard"
    ],
    "hint": "Nach der Präposition 'to' in dieser festen Redewendung MUSS das Gerundium mit -ing stehen!",
    "explanation": "Nach 'look forward to' folgt zwingend die -ing-Form: 'I look forward to hearing from you'. Sehr häufige IHK-Prüfungsfalle!"
  },
  {
    "id": "cl-27",
    "category": "business",
    "categoryName": "Job & Business",
    "question": "Wie formuliert man eine Bitte im Geschäftsenglisch professionell und höflich?",
    "sentenceBefore": "",
    "sentenceAfter": "you please provide the API documentation for our external partner?",
    "correctAnswer": "Could",
    "options": [
      "Could",
      "Must",
      "Should",
      "Shall"
    ],
    "hint": "Höflichkeitsformel mit Modalverb: Could you please...?",
    "explanation": "'Could you please...' ist die höfliche, professionelle Standardform für Bitten im Business English."
  },
  {
    "id": "cl-28",
    "category": "grammar",
    "categoryName": "Grammatik & Zeiten",
    "question": "Welches Wort ordnet das Adverb der Häufigkeit im SVO-Satzbau richtig ein?",
    "sentenceBefore": "I",
    "sentenceAfter": "check the Git commit log before writing new code.",
    "correctAnswer": "always",
    "options": [
      "always",
      "yesterday",
      "now",
      "since"
    ],
    "hint": "Häufigkeitsadverbien wie always, usually, often stehen direkt VOR dem Hauptverb!",
    "explanation": "Adverbien der Häufigkeit (always, often, usually) stehen im SVO-Satzbau direkt vor dem Vollverb ('I always check...')."
  }
];

// ============================================================
// 4. HÖR- & LESE-GESCHICHTEN MIT SYNCHRONEN UNTERTITELN
// ============================================================
// ============================================================
// 4. HÖR- & LESE-GESCHICHTEN MIT SYNCHRONEN UNTERTITELN (10 STORIES)
// ============================================================
const STORY_DATA = [
  {
    id: 'story-1',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    title: 'A Day in the Life of a Software Developer',
    titleDe: 'Ein Tag im Leben eines Fachinformatikers',
    description: 'Begleite einen Entwickler durch sein morgendliches Daily Standup, Code Review und das Lösen eines Fehlers.',
    icon: '💻',
    sentences: [
      {
        en: 'Good morning! My name is Alex, and I work as a junior software developer.',
        de: 'Guten Morgen! Mein Name ist Alex und ich arbeite als Junior-Softwareentwickler.'
      },
      {
        en: 'Every morning at nine o\'clock, our development team gathers for the daily standup meeting.',
        de: 'Jeden Morgen um neun Uhr versammelt sich unser Entwicklerteam zum täglichen Standup-Meeting.'
      },
      {
        en: 'I report what I accomplished yesterday and mention that I am currently optimizing a relational database query.',
        de: 'Ich berichte, was ich gestern geschafft habe, und erwähne, dass ich aktuell eine relationale Datenbankabfrage optimiere.'
      },
      {
        en: 'Suddenly, an urgent bug ticket arrives from the quality assurance team.',
        de: 'Plötzlich trifft ein dringendes Fehlerticket aus dem Qualitätssicherungsteam ein.'
      },
      {
        en: 'The user login fails whenever someone enters special characters in the input field.',
        de: 'Der Benutzer-Login schlägt fehl, wann immer jemand Sonderzeichen in das Eingabefeld eintippt.'
      },
      {
        en: 'I open my development environment, write an automated unit test, and improve the exception handling.',
        de: 'Ich öffne meine Entwicklungsumgebung, schreibe einen automatisierten Modultest und verbessere die Fehlerbehandlung.'
      },
      {
        en: 'After testing the solution thoroughly, I create a pull request and ask my colleague for a code review.',
        de: 'Nachdem ich die Lösung gründlich getestet habe, erstelle ich einen Pull Request und bitte meinen Kollegen um ein Code Review.'
      },
      {
        en: 'By four o\'clock in the afternoon, all automated tests pass with green lights.',
        de: 'Um vier Uhr nachmittags sind alle automatisierten Tests erfolgreich grün.'
      },
      {
        en: 'The continuous deployment pipeline automatically deploys the tested build to the staging server.',
        de: 'Die Continuous-Deployment-Pipeline spielt den getesteten Build automatisch auf den Testserver aus.'
      },
      {
        en: 'It was a challenging but very rewarding day in application development!',
        de: 'Es war ein anspruchsvoller, aber sehr erfüllender Tag in der Anwendungsentwicklung!'
      }
    ]
  },
  {
    id: 'story-2',
    category: 'business',
    categoryName: 'Job & Business',
    title: 'The Job Interview for Application Developers',
    titleDe: 'Das IT-Bewerbungsgespräch',
    description: 'Höre die typischen Fragen und professionellen Antworten bei einem Vorstellungsgespräch.',
    icon: '👔',
    sentences: [
      {
        en: 'Welcome to our office! Thank you for taking the time to speak with us today.',
        de: 'Willkommen in unserem Büro! Vielen Dank, dass Sie sich heute die Zeit für ein Gespräch genommen haben.'
      },
      {
        en: 'Could you please introduce yourself and tell us about your experience in programming?',
        de: 'Könnten Sie sich bitte kurz vorstellen und uns von Ihren Erfahrungen im Programmieren erzählen?'
      },
      {
        en: 'Certainly! I specialize in application development, object-oriented programming, and relational databases with SQL.',
        de: 'Sehr gerne! Ich habe mich auf Anwendungsentwicklung, objektorientierte Programmierung und relationale Datenbanken mit SQL spezialisiert.'
      },
      {
        en: 'What motivated you to apply for our technology team specifically?',
        de: 'Was hat Sie dazu motiviert, sich speziell bei unserem Technologieteam zu bewerben?'
      },
      {
        en: 'I am impressed by your modern tech stack and your agile development culture using Scrum.',
        de: 'Ich bin beeindruckt von Ihrem modernen Tech-Stack und Ihrer agilen Entwicklungskultur mit Scrum.'
      },
      {
        en: 'How do you handle situations when a project deadline is very tight?',
        de: 'Wie gehen Sie mit Situationen um, in denen ein Projekttermin sehr knapp ist?'
      },
      {
        en: 'I prioritize the essential requirements, communicate openly with the team, and focus on clean code.',
        de: 'Ich priorisiere die wesentlichen Anforderungen, kommuniziere offen im Team und konzentriere mich auf sauberen Code.'
      },
      {
        en: 'That sounds excellent! We are very pleased with your profile and will contact you by Friday.',
        de: 'Das klingt hervorragend! Wir sind sehr angetan von Ihrem Profil und werden uns bis Freitag bei Ihnen melden.'
      }
    ]
  },
  {
    id: 'story-3',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    title: 'Coffee Break & Weekend Plans with Colleagues',
    titleDe: 'Kaffeepause & Wochenendpläne mit Kollegen',
    description: 'Lockerer Plausch in der Büroküche über Hobbys, Musik und das Wochenende.',
    icon: '☕',
    sentences: [
      {
        en: 'Hey there, are you taking a quick screen break? Would you like to grab a coffee together?',
        de: 'Hey, machst du eine kurze Bildschirmpause? Möchtest du dir zusammen einen Kaffee holen?'
      },
      {
        en: 'Yes, absolutely! My eyes need a rest after two hours of intensive coding.',
        de: 'Ja, unbedingt! Meine Augen brauchen nach zwei Stunden intensivem Coden eine Pause.'
      },
      {
        en: 'Do you have any interesting plans for the upcoming weekend?',
        de: 'Hast du schon interessante Pläne für das kommende Wochenende?'
      },
      {
        en: 'On Saturday, I will attend a tech conference, and on Sunday, I want to produce some electronic music.',
        de: 'Am Samstag besuche ich eine Technik-Konferenz, und am Sonntag möchte ich elektronische Musik produzieren.'
      },
      {
        en: 'That sounds like a wonderful balance between professional learning and creative relaxation!',
        de: 'Das klingt nach einer wunderbaren Balance zwischen fachlichem Lernen und kreativer Entspannung!'
      },
      {
        en: 'The weather forecast predicts warm sunshine for the entire Sunday afternoon.',
        de: 'Der Wetterbericht sagt warmen Sonnenschein für den gesamten Sonntagnachmittag voraus.'
      },
      {
        en: 'Awesome! Let\'s finish today\'s sprint backlog so we can enjoy a relaxing weekend.',
        de: 'Großartig! Lass uns das heutige Sprint-Backlog abschließen, damit wir ein entspanntes Wochenende genießen können.'
      }
    ]
  },
  {
    id: 'story-4',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    title: 'Arriving in London: Airport, Hotel & Dinner',
    titleDe: 'Ankunft in London: Flughafen, Hotel & Abendessen',
    description: 'Wichtige Sätze beim Reisen: Vom Flugsteig über den Hotel-Check-in bis zum Restaurant.',
    icon: '✈️',
    sentences: [
      {
        en: 'Attention passengers, flight four hundred two has landed safely at London Heathrow Airport.',
        de: 'Achtung Fluggäste, Flug vierhundert-zwei ist sicher auf dem Flughafen London Heathrow gelandet.'
      },
      {
        en: 'Please have your passport and boarding pass ready for border control.',
        de: 'Bitte halten Sie Ihren Reisepass und Ihre Bordkarte für die Grenzkontrolle bereit.'
      },
      {
        en: 'Good afternoon, I have a hotel room reservation under the name Alex Miller.',
        de: 'Guten Tag, ich habe eine Hotelzimmer-Reservierung auf den Namen Alex Miller.'
      },
      {
        en: 'Welcome! Here is your magnetic key card for room three hundred five on the third floor.',
        de: 'Herzlich willkommen! Hier ist Ihre Magnetkarte für Zimmer dreihundert-fünf im dritten Stock.'
      },
      {
        en: 'Could you please recommend a traditional restaurant nearby where we can have dinner?',
        de: 'Könnten Sie bitte ein traditionelles Restaurant in der Nähe empfehlen, wo wir zu Abend essen können?'
      },
      {
        en: 'Certainly! There is an excellent authentic English restaurant just two blocks down the avenue.',
        de: 'Sehr gerne! Es gibt ein hervorragendes, authentisches englisches Restaurant nur zwei Querstraßen weiter.'
      },
      {
        en: 'Thank you very much for your kind hospitality and assistance!',
        de: 'Vielen Dank für Ihre freundliche Gastfreundschaft und Hilfe!'
      }
    ]
  },
  {
    id: 'story-5',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    title: 'Troubleshooting a Critical Production Incident',
    titleDe: 'Fehleranalyse eines kritischen Vorfalls in der Produktion',
    description: 'Ein Live-Vorfall im Kundenportal: Logs analysieren, Nullpointer Exception beheben und Hotfix ausrollen.',
    icon: '🚨',
    sentences: [
      {
        en: 'At two o\'clock in the afternoon, our automated monitoring system triggered a high-priority alert for our customer portal.',
        de: 'Um zwei Uhr nachmittags löste unser automatisches Überwachungssystem einen Alarm hoher Priorität für unser Kundenportal aus.'
      },
      {
        en: 'Several users reported that they could not complete their orders because the checkout service was returning an internal server error.',
        de: 'Mehrere Benutzer berichteten, dass sie ihre Bestellungen nicht abschließen konnten, da der Checkout-Dienst einen internen Serverfehler meldete.'
      },
      {
        en: 'I immediately joined the emergency incident channel and inspected the application error logs in our centralized dashboard.',
        de: 'Ich trat sofort dem Notfall-Kanal bei und untersuchte die Anwendungs-Fehlerprotokolle in unserem zentralen Dashboard.'
      },
      {
        en: 'The stack trace revealed an unexpected null pointer exception when calculating discounts on empty shopping carts.',
        de: 'Der Stacktrace zeigte eine unerwartete Nullpointer-Ausnahme bei der Rabattberechnung bei leeren Warenkörben.'
      },
      {
        en: 'I reproduced the bug locally on my development machine and wrote a targeted regression test to verify the failure.',
        de: 'Ich reproduzierte den Fehler lokal auf meinem Entwicklungsrechner und schrieb einen gezielten Regressionstest, um das Fehlverhalten zu belegen.'
      },
      {
        en: 'Within twenty minutes, I implemented a defensive null check and verified that all automated unit tests passed.',
        de: 'Innerhalb von zwanzig Minuten implementierte ich eine defensive Null-Prüfung und stellte sicher, dass alle Modultests erfolgreich waren.'
      },
      {
        en: 'The lead architect approved my hotfix pull request, and the continuous integration pipeline deployed it straight to production.',
        de: 'Die Chefarchitektin gab meinen Hotfix-Pull-Request frei, und die Continuous-Integration-Pipeline spielte ihn direkt auf die Produktivumgebung ein.'
      },
      {
        en: 'The error rate dropped back to zero, and our retrospective meeting helped us strengthen our automated validation rules.',
        de: 'Die Fehlerrate sank sofort wieder auf null, und unser Nachbesprechungs-Meeting half uns, unsere automatisierten Validierungsregeln zu stärken.'
      }
    ]
  },
  {
    id: 'story-6',
    category: 'fiae',
    categoryName: 'FIAE AP 1',
    title: 'Sprint Retrospective & Refactoring Legacy Code',
    titleDe: 'Sprint-Retrospektive & Refactoring von Altcode',
    description: 'Wie ein Entwicklerteam technische Schulden abbaut und monolithischen Code modularisiert.',
    icon: '🛠️',
    sentences: [
      {
        en: 'Every two weeks on Friday afternoon, our agile development team gathers for our sprint retrospective.',
        de: 'Alle zwei Wochen am Freitagnachmittag versammelt sich unser agiles Entwicklerteam zur Sprint-Retrospektive.'
      },
      {
        en: 'Our Scrum Master asks us what went smoothly, what hindered our velocity, and how we can work more effectively.',
        de: 'Unsere Scrum Masterin fragt uns, was reibungslos lief, was unsere Geschwindigkeit bremste und wie wir effektiver arbeiten können.'
      },
      {
        en: 'I highlighted that an old billing module contains tightly coupled legacy code with high technical debt.',
        de: 'Ich betonte, dass ein altes Abrechnungsmodul eng gekoppelten Altcode mit hohen technischen Schulden enthält.'
      },
      {
        en: 'We agreed to dedicate twenty percent of our upcoming sprint capacity specifically for refactoring and architectural cleanup.',
        de: 'Wir einigten uns darauf, zwanzig Prozent unserer kommenden Sprint-Kapazität gezielt für Refactoring und architektonische Aufräumarbeiten zu reservieren.'
      },
      {
        en: 'My colleague and I used pair programming to break down a huge method into cohesive, reusable domain classes.',
        de: 'Mein Kollege und ich nutzten Pair Programming, um eine riesige Methode in zusammenhängende, wiederverwendbare Domänenklassen aufzuteilen.'
      },
      {
        en: 'We applied the Single Responsibility Principle and established clear interfaces between all dependencies.',
        de: 'Wir wandten das Single-Responsibility-Prinzip an und schufen klare Schnittstellen zwischen allen Abhängigkeiten.'
      },
      {
        en: 'Now our codebase is significantly cleaner, easier to maintain, and future feature implementations will take half the time.',
        de: 'Jetzt ist unsere Codebasis deutlich sauberer, leichter zu warten, und zukünftige Feature-Implementierungen werden nur noch halb so viel Zeit kosten.'
      }
    ]
  },
  {
    id: 'story-7',
    category: 'business',
    categoryName: 'Job & Business',
    title: 'Technical Interview: System Design & Databases',
    titleDe: 'Technisches Fachgespräch: Systemarchitektur & Datenbanken',
    description: 'Fachfragen im Vorstellungsgespräch: Relationale Datenbanken, Primärschlüssel, Normalisierung und Indizes.',
    icon: '📊',
    sentences: [
      {
        en: 'In the second round of my technical interview, the lead engineer questioned me about relational database architecture.',
        de: 'In der zweiten Runde meines Fachgesprächs befragte mich die leitende Ingenieurin über relationale Datenbankarchitektur.'
      },
      {
        en: 'She asked me to explain the exact difference between primary keys and foreign keys in a normalized schema.',
        de: 'Sie bat mich, den genauen Unterschied zwischen Primärschlüsseln und Fremdschlüsseln in einem normalisierten Schema zu erklären.'
      },
      {
        en: 'I explained that a primary key uniquely identifies a single row, whereas a foreign key establishes referential integrity across related tables.',
        de: 'Ich erklärte, dass ein Primärschlüssel eine einzelne Zeile eindeutig identifiziert, während ein Fremdschlüssel referenzielle Integrität über verknüpfte Tabellen hinweg herstellt.'
      },
      {
        en: 'Next, she asked how I would troubleshoot slow SQL queries that perform sequential table scans over millions of records.',
        de: 'Als Nächstes fragte sie, wie ich langsame SQL-Abfragen analysieren würde, die sequenzielle Tabellenscans über Millionen von Datensätzen ausführen.'
      },
      {
        en: 'I suggested analyzing the execution plan with EXPLAIN ANALYZE and creating composite B-tree indexes on heavily filtered columns.',
        de: 'Ich schlug vor, den Ausführungsplan mit EXPLAIN ANALYZE zu analysieren und zusammengesetzte B-Tree-Indizes auf stark gefilterte Spalten zu legen.'
      },
      {
        en: 'She nodded approvingly and emphasized that practical database optimization is essential for scalable backend systems.',
        de: 'Sie nickte anerkennend und betonte, dass praktische Datenbankoptimierung für skalierbare Backend-Systeme unverzichtbar ist.'
      },
      {
        en: 'My thorough preparation for the Fachinformatiker exam gave me the confidence to answer every question clearly.',
        de: 'Meine gründliche Vorbereitung auf die Fachinformatiker-Prüfung gab mir die Sicherheit, jede Frage präzise zu beantworten.'
      }
    ]
  },
  {
    id: 'story-8',
    category: 'business',
    categoryName: 'Job & Business',
    title: 'Client Presentation: Software Prototype Demo',
    titleDe: 'Kundenpräsentation: Live-Demo eines Software-Prototyps',
    description: 'Vorstellung einer Anwendung vor Stakeholdern, Feedback aufnehmen und Scope Creep managen.',
    icon: '🤝',
    sentences: [
      {
        en: 'Today our engineering squad presented the first interactive prototype of the management portal to our client stakeholders.',
        de: 'Heute präsentierte unser Entwicklerteam den ersten interaktiven Prototyp des Management-Portals vor den Kunden-Stakeholdern.'
      },
      {
        en: 'I guided the client through the responsive interface, demonstrating how live data charts refresh dynamically using WebSockets.',
        de: 'Ich führte den Kunden durch die responsive Oberfläche und demonstrierte, wie sich Live-Diagramme über WebSockets dynamisch aktualisieren.'
      },
      {
        en: 'The client praised the clean UI design and inquired whether we could add an automated PDF reporting export.',
        de: 'Der Kunde lobte das saubere UI-Design und erkundigte sich, ob wir einen automatisierten PDF-Berichtsexport einbauen könnten.'
      },
      {
        en: 'Our Product Owner explained how we can prioritize this enhancement for the upcoming sprint without jeopardizing the milestone release.',
        de: 'Unser Product Owner erklärte, wie wir diese Erweiterung im kommenden Sprint priorisieren können, ohne den Meilenstein-Release zu gefährden.'
      },
      {
        en: 'Maintaining transparent communication with clients builds long-term trust and ensures requirements align with business objectives.',
        de: 'Transparente Kommunikation mit Kunden schafft langfristiges Vertrauen und stellt sicher, dass Anforderungen mit Geschäftszielen übereinstimmen.'
      },
      {
        en: 'It was deeply fulfilling to see our clean software architecture solve real-world problems for end users.',
        de: 'Es war zutiefst erfüllend zu sehen, wie unsere saubere Softwarearchitektur reale Probleme von Endbenutzern löst.'
      }
    ]
  },
  {
    id: 'story-9',
    category: 'conversation',
    categoryName: 'Smalltalk & Alltag',
    title: 'Tech Talk: Electronic Music Production & Home Studios',
    titleDe: 'Technik-Gespräch: Elektronische Musikproduktion & Heimstudio',
    description: 'Spannender Plausch über Synthesizer, DAWs, Audio-Plugins und wie kreatives Musizieren das Programmieren fördert.',
    icon: '🎛️',
    sentences: [
      {
        en: 'During the afternoon coffee break, my colleague asked about my creative passion for producing electronic music.',
        de: 'Während der Nachmittagskaffeepause erkundigte sich mein Kollege nach meiner kreativen Leidenschaft, elektronische Musik zu produzieren.'
      },
      {
        en: 'I shared that I set up a home studio equipped with a digital audio workstation, virtual synthesizers, and audio interfaces.',
        de: 'Ich erzählte, dass ich mir ein Heimstudio mit einer digitalen Audio-Workstation, virtuellen Synthesizern und Audio-Interfaces eingerichtet habe.'
      },
      {
        en: 'He was surprised to discover that sound design using oscillators, envelopes, and modulation matrices mirrors algorithmic thinking.',
        de: 'Er war überrascht zu erfahren, dass Sounddesign mit Oszillatoren, Hüllkurven und Modulationsmatrizen dem algorithmischen Denken stark ähnelt.'
      },
      {
        en: 'When I mix frequencies and sequence percussion rhythms, my mind enters a relaxed state of creative flow.',
        de: 'Wenn ich Frequenzen abmische und Percussion-Rhythmen sequenziere, kommt mein Geist in einen entspannten Zustand kreativen Flows.'
      },
      {
        en: 'Balancing analytical coding with expressive music production keeps my mind sharp and sparks innovative problem-solving ideas.',
        de: 'Der Ausgleich zwischen analytischem Programmieren und ausdrucksstarker Musikproduktion hält meinen Verstand fit und weckt innovative Ideen beim Problemlösen.'
      }
    ]
  },
  {
    id: 'story-10',
    category: 'travel',
    categoryName: 'Urlaub & Reise',
    title: 'London Underground, Tech Meetup & City Exploration',
    titleDe: 'Londoner U-Bahn, Entwickler-Meetup & Stadterkundung',
    description: 'U-Bahn fahren nach Shoreditch, Teilnahme an einem internationalen IT-Meetup und Networking auf Englisch.',
    icon: '🚇',
    sentences: [
      {
        en: 'On my second morning in the United Kingdom, I tapped my payment card at the station gate and boarded the London Underground.',
        de: 'An meinem zweiten Vormittag im Vereinigten Königreich hielt ich meine Zahlungskarte an die Schranke und stieg in die Londoner U-Bahn.'
      },
      {
        en: 'I traveled directly to Shoreditch, known worldwide as the vibrant technology hub nicknamed Silicon Roundabout.',
        de: 'Ich fuhr direkt nach Shoreditch, das weltweit als pulsierender Technologie-Hotspot namens Silicon Roundabout bekannt ist.'
      },
      {
        en: 'In the evening, I attended a developer meetup where engineers from around the globe discussed cloud-native microservices.',
        de: 'Am Abend besuchte ich ein Entwickler-Meetup, bei dem Softwareingenieure aus aller Welt über cloud-native Microservices diskutierten.'
      },
      {
        en: 'During the networking break, I chatted with local British programmers and shared insights into the German dual education system.',
        de: 'Während der Netzwerk-Pause unterhielt ich mich mit britischen Programmierern und tauschte Einblicke in das deutsche duale Ausbildungssystem aus.'
      },
      {
        en: 'Speaking fluent English in professional developer circles was a thrilling experience that broadened my global perspective.',
        de: 'Fließend Englisch in professionellen Entwicklerkreisen zu sprechen war eine aufregende Erfahrung, die meinen globalen Horizont erweiterte.'
      }
    ]
  }
  ,
  {
    id: 'story-2',
    category: 'meetings',
    categoryName: 'Meetings & Besprechungen',
    title: 'The Agile Sprint Planning Meeting',
    titleDe: 'Die Sprint-Planungs-Besprechung',
    description: 'Erlebe ein vollständiges englisches Team-Meeting: User Stories besprechen, Einigungen erzielen, Aufgaben verteilen und Termine abstimmen.',
    icon: '💼',
    sentences: [
      {
        en: 'Welcome everyone to our sprint planning session for the upcoming release!',
        de: 'Willkommen an alle zu unserer Sprint-Planungsrunde für das anstehende Release!'
      },
      {
        en: 'Today, we need to review user stories, estimate story points, and define our sprint goal.',
        de: 'Heute müssen wir die User Stories besprechen, Story Points schätzen und unser Sprint-Ziel definieren.'
      },
      {
        en: 'Our Product Owner presents the highest-priority ticket: a secure customer authentication endpoint.',
        de: 'Unsere Product Ownerin stellt das wichtigste Ticket vor: einen sicheren Endpunkt zur Kundenauthentifizierung.'
      },
      {
        en: 'The software architect asks: "Could you please elaborate on the security requirements for tokens?"',
        de: 'Der Softwarearchitekt fragt: "Könntest du bitte die Sicherheitsanforderungen für die Token näher erläutern?"'
      },
      {
        en: 'I suggest: "We should implement JSON Web Tokens with a fifteen-minute expiration time."',
        de: 'Ich schlage vor: "Wir sollten JSON Web Tokens mit einer 15-minütigen Ablaufzeit implementieren."'
      },
      {
        en: 'The team discusses the proposal and reaches a consensus after ten minutes.',
        de: 'Das Team diskutiert den Vorschlag und erzielt nach zehn Minuten eine Einigung.'
      },
      {
        en: 'The Scrum Master asks: "Who is going to be the primary owner for writing the automated tests?"',
        de: 'Die Scrum Masterin fragt: "Wer übernimmt die Hauptverantwortung für das Schreiben der automatisierten Tests?"'
      },
      {
        en: 'I raise my hand and volunteer to implement the test suite and verify edge cases.',
        de: 'Ich hebe die Hand und melde mich freiwillig, die Testsuite zu implementieren und Randfälle zu prüfen.'
      },
      {
        en: 'Before wrapping up the meeting, we summarize our key action items and assign deadlines.',
        de: 'Bevor wir das Meeting abschließen, fassen wir unsere wichtigsten Aufgabenpunkte zusammen und vergeben Fristen.'
      },
      {
        en: 'Everyone feels confident and excited to kick off the new two-week development sprint!',
        de: 'Alle fühlen sich sicher und freuen sich darauf, den neuen zweiwöchigen Entwicklungssprint zu starten!'
      }
    ]
  }
];

// ============================================================
// 5. DIALOG- & KONVERSATIONS-SZENARIEN (MIT SPRECHEN & KORREKTUR)
// ============================================================
const DIALOG_SCENARIOS = {
  beginner: {
    id: 'beginner',
    title: '🌱 Anfänger & Plaudern',
    icon: '🌱',
    partnerName: 'Emma (Lernpartnerin & Tutorin)',
    partnerRole: 'Geduldige Englisch-Tutorin für Alltag & Smalltalk',
    initialPrompt: 'Hello {name}! Welcome! 😊 I am Emma, your friendly English tutor. In this chat, there is zero pressure: we can talk about anything you like—hobbies, everyday life, food, pets, or we can practice simple words and sentences together. What would you like to talk about today?',
    initialPromptDe: 'Hallo {name}! Willkommen! 😊 Ich bin Emma, deine freundliche Sprachbegleiterin. Hier gibt es null Leistungsdruck: Wir können über alles sprechen, was dir Spaß macht – Hobbys, Alltag, Essen, Haustiere oder einfach neue Wörter lernen. Worüber möchtest du heute sprechen?',
    contextKeywords: ['hello', 'hi', 'chat', 'talk', 'beginner', 'learn', 'words', 'hobby', 'music', 'food', 'weather', 'old', 'age', 'live', 'from', 'pet', 'dog', 'cat', 'help', 'simple', 'easy', 'question']
  },
  quiz: {
    id: 'quiz',
    title: '🎯 Vokabel-Prüfer & Quiz',
    icon: '🎯',
    partnerName: 'Prof. Miller (Vokabel-Coach)',
    partnerRole: 'Interaktiver Vokabel- & Fachbegriff-Prüfer',
    initialPrompt: 'Hallo {name}! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische Fachbegriffe und du schreibst oder sprichst mir die deutsche Bedeutung! Los geht\'s mit deinem ersten Begriff:',
    initialPromptDe: 'Hallo {name}! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische Fachbegriffe und du schreibst oder sprichst mir die deutsche Bedeutung! Los geht\'s mit deinem ersten Begriff:',
    contextKeywords: ['bereit', 'ready', 'ja', 'start', 'los', 'yes', 'abfragen', 'quiz', 'vokabeln', 'wörter', 'deutsch']
  },
  standup: {
    id: 'standup',
    title: 'Daily Scrum Standup',
    icon: '💻',
    partnerName: 'Sarah (Scrum Master)',
    partnerRole: 'Scrum Master & Agile Coach',
    initialPrompt: 'Good morning {name}! Welcome to today\'s daily standup. What did you accomplish yesterday, what is your plan for today, and do you have any blockers?',
    initialPromptDe: 'Guten Morgen {name}! Willkommen zum heutigen Daily Standup. Was hast du gestern geschafft, was planst du für heute und hast du Hindernisse (Blocker)?',
    contextKeywords: ['yesterday', 'today', 'ticket', 'bug', 'database', 'worked', 'working', 'blocked', 'finish', 'sql', 'query', 'code', 'test', 'api', 'pr', 'review']
  },
  interview: {
    id: 'interview',
    title: 'IT-Vorstellungsgespräch',
    icon: '👔',
    partnerName: 'Mr. Davis (Tech Lead)',
    partnerRole: 'Lead Architect & Interviewer',
    initialPrompt: 'Hello {name}, thank you for coming in today! Could you tell me a little bit about yourself and what projects you enjoyed most during your development training?',
    initialPromptDe: 'Hallo {name}, vielen Dank für Ihr Erscheinen heute! Können Sie mir ein wenig über sich erzählen und welche Projekte Ihnen während Ihrer Entwicklerausbildung am meisten Spaß gemacht haben?',
    contextKeywords: ['experience', 'programming', 'developer', 'company', 'learn', 'java', 'python', 'sql', 'team', 'skills', 'because', 'project', 'architecture', 'clean code', 'database']
  },
  support: {
    id: 'support',
    title: 'Bug-Report & Ticket Support',
    icon: '🛠️',
    partnerName: 'Alex (Product Manager)',
    partnerRole: 'Senior Product Manager',
    initialPrompt: 'Hi {name}! Our QA team flagged an issue in production: the database connection pool times out during peak checkout hours. Could you investigate this ticket?',
    initialPromptDe: 'Hi {name}! Unser QS-Team hat ein Problem in der Produktion gemeldet: Der Datenbank-Verbindungspool bricht zu Spitzenzeiten ab. Könntest du dieses Ticket untersuchen?',
    contextKeywords: ['check', 'fix', 'database', 'issue', 'problem', 'look', 'connection', 'timeout', 'test', 'server', 'log', 'query', 'reproduce', 'hotfix', 'pool']
  },
  architecture: {
    id: 'architecture',
    title: 'Software-Architektur & Clean Code',
    icon: '📐',
    partnerName: 'Elena (Senior Architect)',
    partnerRole: 'Staff Software Architect',
    initialPrompt: 'Hi {name}! We are currently redesigning our backend service layer. What are your thoughts on applying the Single Responsibility Principle and RESTful API conventions here?',
    initialPromptDe: 'Hi {name}! Wir überarbeiten aktuell unsere Backend-Service-Schicht. Was hältst du davon, hier das Single-Responsibility-Prinzip und RESTful-API-Konventionen anzuwenden?',
    contextKeywords: ['architecture', 'clean code', 'refactor', 'solid', 'pattern', 'api', 'rest', 'json', 'service', 'layer', 'class', 'interface', 'coupling', 'microservices']
  },
  smalltalk: {
    id: 'smalltalk',
    title: 'Kaffeepause & Smalltalk',
    icon: '☕',
    partnerName: 'Mark (Colleague)',
    partnerRole: 'Senior Developer & Teammate',
    initialPrompt: 'Hey {name}! Taking a quick screen break? How is your week treating you so far, and did you get any chance to work on your music projects?',
    initialPromptDe: 'Hey {name}! Machst du eine kurze Bildschirmpause? Wie läuft deine Woche bisher und hattest du Gelegenheit, an deinen Musikprojekten zu arbeiten?',
    contextKeywords: ['good', 'busy', 'fine', 'weekend', 'work', 'coffee', 'music', 'weather', 'tired', 'learning', 'project', 'nice', 'studio', 'beat', 'relax']
  },
  travel: {
    id: 'travel',
    title: 'Hotel, London & Reisen',
    icon: '✈️',
    partnerName: 'James (Concierge)',
    partnerRole: 'Royal Grand Hotel Concierge',
    initialPrompt: 'Good day, sir! Welcome to Central London. How may I be of service to you regarding your stay, transportation, or restaurant reservations today?',
    initialPromptDe: 'Guten Tag, mein Herr! Willkommen in Zentral-London. Wie kann ich Ihnen bezüglich Ihres Aufenthalts, des Nahverkehrs oder Restaurant-Reservierungen behilflich sein?',
    contextKeywords: ['reservation', 'room', 'check', 'key', 'breakfast', 'name', 'stay', 'night', 'bill', 'book', 'luggage', 'restaurant', 'london', 'subway', 'tube', 'ticket']
  },
  free: {
    id: 'free',
    title: 'Freie Konversation',
    icon: '🌐',
    partnerName: 'AI English Coach',
    partnerRole: 'Persönlicher Sprachtrainer',
    initialPrompt: 'Hello {name}! I am your interactive English conversational partner. You can talk to me about programming, daily life, exams, or anything you like. What is on your mind today?',
    initialPromptDe: 'Hallo {name}! Ich bin dein interaktiver englischer Gesprächspartner. Du kannst mit mir über Programmierung, Alltag, Prüfungen oder beliebige Themen sprechen. Woran denkst du gerade?',
    contextKeywords: []
  }
};


// ==========================================
// 📖 GRAMMAR & TENSES COMPASS (GRAMMATIK-KOMPASS)
// ==========================================
const GRAMMAR_TOPICS = [
  {
    "id": "svo",
    "category": "svo",
    "icon": "⏰",
    "title": "SVO-Formel & Satzbau",
    "subtitle": "Subject - Verb - Object & Wortstellung",
    "tag": "Grundregel • A1-B2",
    "formula": "[Subject (Wer?)] + [Verb (Macht was?)] + [Object (Womit?)] + [Place (Wo?)] + [Time (Wann?)]",
    "summary": "Im Englischen ist die Satzstellung streng festgelegt: Erst kommt das Subjekt, dann das Verb, dann das Objekt. Ortsangaben stehen immer VOR Zeitangaben (Place before Time)!",
    "rules": [
      {
        "title": "1. Die SVO-Reihenfolge",
        "detail": "Im Gegensatz zum Deutschen darf das Prädikat nicht ans Satzende rutschen. 'John fixed the computer' (John = Subject, fixed = Verb, the computer = Object)."
      },
      {
        "title": "2. Ortsangabe vor Zeitangabe (Place before Time)",
        "detail": "Ort kommt immer vor Zeit: 'I worked at the office yesterday' (NICHT: 'I worked yesterday at the office')."
      },
      {
        "title": "3. Adverbien der Häufigkeit (Frequency Adverbs)",
        "detail": "Wörter wie always, usually, often, sometimes, never stehen VOR dem Hauptverb ('I always test my code'), aber NACH dem Hilfsverb 'to be' ('The server is always online')."
      }
    ],
    "signalWords": [
      "always",
      "usually",
      "often",
      "sometimes",
      "never",
      "yesterday",
      "tomorrow"
    ],
    "examples": [
      {
        "en": "John resolved the critical bug in the database yesterday.",
        "de": "John hat den kritischen Fehler in der Datenbank gestern behoben."
      },
      {
        "en": "I always write automated unit tests before deploying.",
        "de": "Ich schreibe vor dem Ausrollen immer automatisierte Unit-Tests."
      },
      {
        "en": "Our production database is always secure and reliable.",
        "de": "Unsere Produktionsdatenbank ist immer sicher und zuverlässig."
      },
      {
        "en": "We discuss the project requirements at the office every Monday.",
        "de": "Wir besprechen die Projektanforderungen jeden Montag im Büro."
      }
    ],
    "pitfalls": [
      {
        "wrong": "Yesterday restarted I the server.",
        "right": "Yesterday, I restarted the server. (Oder: I restarted the server yesterday.)",
        "tip": "Im Englischen niemals Verb und Subjekt wie im Deutschen vertauschen!"
      },
      {
        "wrong": "I test always my code before commit.",
        "right": "I always test my code before commit.",
        "tip": "Häufigkeitsadverbien (always, usually) gehören direkt VOR das Hauptverb!"
      }
    ],
    "clozeId": "cl-28"
  },
  {
    "id": "present-simple",
    "category": "present-simple",
    "icon": "🟢",
    "title": "Present Simple & He/She/It -s",
    "subtitle": "Routinen, Gewohnheiten & Fakten",
    "tag": "Gegenwart • A1-B1",
    "formula": "Bejahung: [Subject] + [Infinitive] (+s bei he/she/it) | Verneinung: [Subject] + [don't / doesn't] + [Infinitive]",
    "summary": "Wird genutzt für tägliche Gewohnheiten ('I drink coffee'), regelmäßige Aktionen, Fakten ('Water boils at 100°C') und feste Fahrpläne ('The train arrives at 9 PM').",
    "rules": [
      {
        "title": "1. He / She / It - das 's' muss mit!",
        "detail": "In der 3. Person Singular erhält das Verb ein -s: work > works, test > tests, run > runs."
      },
      {
        "title": "2. Endungen auf -s, -sh, -ch, -x",
        "detail": "Endet das Verb auf Zischlaute, hängt man -es an: pass > passes, wash > washes, teach > teaches, fix > fixes."
      },
      {
        "title": "3. Konsonant + y wird zu -ies",
        "detail": "fly > flies, study > studies. Aber nach Vokal bleibt das y: say > says, play > plays."
      },
      {
        "title": "4. Wichtige Ausnahmen",
        "detail": "go > goes, do > does, have > has."
      },
      {
        "title": "5. Verneinung mit do not / does not",
        "detail": "Bei Verneinung entfällt das -s am Hauptverb, da 'doesn't' es bereits trägt: 'He doesn't work' (NICHT: 'doesn't works')."
      }
    ],
    "signalWords": [
      "always",
      "every day",
      "regularly",
      "usually",
      "normally",
      "often",
      "seldom",
      "never"
    ],
    "examples": [
      {
        "en": "I live in Germany and work as a software development apprentice.",
        "de": "Ich lebe in Deutschland und arbeite als Fachinformatiker-Azubi."
      },
      {
        "en": "He debugs the backend application every morning.",
        "de": "Er debuggt die Backend-Anwendung jeden Morgen."
      },
      {
        "en": "She fixes the memory leak very quickly.",
        "de": "Sie behebt das Speicherleck sehr schnell."
      },
      {
        "en": "Our IT team does not deploy software on Friday afternoons.",
        "de": "Unser IT-Team rollt Freitagnachmittag keine Software aus."
      }
    ],
    "pitfalls": [
      {
        "wrong": "He work in Berlin.",
        "right": "He works in Berlin.",
        "tip": "3. Person Singular (he/she/it) benötigt zwingend das -s!"
      },
      {
        "wrong": "She doesn't likes slow internet.",
        "right": "She doesn't like slow internet.",
        "tip": "Nach does / doesn't folgt immer der reine Infinitiv ohne -s!"
      }
    ],
    "clozeId": "cl-9"
  },
  {
    "id": "asi-quasi",
    "category": "questions",
    "icon": "❓",
    "title": "Fragen bilden: ASI & QuASI",
    "subtitle": "Die Formel für englische Fragen",
    "tag": "Fragesatzbau • A1-B2",
    "formula": "ASI: [Auxiliary (Do/Does/Did)] + [Subject] + [Infinitive] | QuASI: [Question word] + [ASI]",
    "summary": "Im Englischen bildet man Fragen mit Hilfsverben (Auxiliary Verbs). Man darf niemals einfach Subjekt und Hauptverb wie im Deutschen vertauschen ('Work you here?' ist falsch!).",
    "rules": [
      {
        "title": "1. ASI-Prinzip für Ja/Nein-Fragen (Closed Questions)",
        "detail": "A = Auxiliary (Do / Does / Did), S = Subject (you / he / she / they), I = Infinitive. Beispiel: Do (A) + you (S) + code (I) + in Python?"
      },
      {
        "title": "2. QuASI-Prinzip für W-Fragen (Open Questions)",
        "detail": "Qu = Question word (What, Where, When, Why, How), A = Auxiliary, S = Subject, I = Infinitive. Beispiel: Where (Qu) + does (A) + she (S) + work (I)?"
      },
      {
        "title": "3. Fragen in der Vergangenheit mit DID",
        "detail": "In der Vergangenheit wird 'Did' als Hilfsverb verwendet, und das Hauptverb bleibt IMMER im reinen Infinitiv: 'Did you test the app?' (NICHT: 'Did you tested?')."
      }
    ],
    "signalWords": [
      "Do...?",
      "Does...?",
      "Did...?",
      "Where",
      "What",
      "When",
      "Why",
      "How",
      "Which"
    ],
    "examples": [
      {
        "en": "Do you speak English in your daily scrum meetings?",
        "de": "Sprichst du Englisch in deinen täglichen Scrum-Meetings?"
      },
      {
        "en": "Does your company use agile software development?",
        "de": "Nutzt dein Unternehmen agile Softwareentwicklung?"
      },
      {
        "en": "Where do you host the cloud database backups?",
        "de": "Wo hostet ihr die Cloud-Datenbank-Backups?"
      },
      {
        "en": "Did you commit your bugfix to the main branch?",
        "de": "Hast du deinen Bugfix auf den Main-Branch committet?"
      }
    ],
    "pitfalls": [
      {
        "wrong": "Understand you this programming concept?",
        "right": "Do you understand this programming concept?",
        "tip": "Fragen immer mit Hilfsverb (Do/Does) bilden!"
      },
      {
        "wrong": "Did you solved the problem yesterday?",
        "right": "Did you solve the problem yesterday?",
        "tip": "Nach 'Did' steht das Hauptverb ausnahmslos im Infinitiv!"
      }
    ],
    "clozeId": "cl-11"
  },
  {
    "id": "present-continuous",
    "category": "present-continuous",
    "icon": "🔵",
    "title": "Present Continuous (am/is/are + -ing)",
    "subtitle": "Handlungen genau JETZT in diesem Moment",
    "tag": "Verlaufsform • A1-B1",
    "formula": "[Subject] + [am / is / are] + [Verb + ing]",
    "summary": "Zeigt an, dass eine Handlung genau jetzt im Moment des Sprechens abläuft ('I am coding right now') oder ein vorübergehender aktueller Zustand ist ('I am staying at a hotel this week').",
    "rules": [
      {
        "title": "1. Bildung mit to be + -ing",
        "detail": "I am working, you are working, he/she/it is working, we are working, they are working."
      },
      {
        "title": "2. Konsonantenverdopplung (Doubling)",
        "detail": "Bei kurzem, betontem Vokal vor dem Endkonsonanten wird dieser verdoppelt: run > running, stop > stopping, swim > swimming, plan > planning."
      },
      {
        "title": "3. Stummes -e entfällt",
        "detail": "Verben auf -e verlieren das e vor -ing: write > writing, configure > configuring, code > coding."
      },
      {
        "title": "4. Zustandsverben (Stative Verbs) ohne -ing",
        "detail": "Verben des Wissens, Fühlens und Besitzens stehen fast nie im Continuous: know, understand, believe, like, have (Besitz), need. Richtig: 'I know the answer' (NICHT: 'I am knowing')."
      }
    ],
    "signalWords": [
      "now",
      "at the moment",
      "right now",
      "currently",
      "Look!",
      "Listen!",
      "today",
      "this week"
    ],
    "examples": [
      {
        "en": "I am currently developing a responsive learning application.",
        "de": "Ich entwickle derzeit eine responsive Lernanwendung."
      },
      {
        "en": "The DevOps engineer is deploying the latest patch right now.",
        "de": "Der DevOps-Ingenieur rollt das neueste Patch genau jetzt aus."
      },
      {
        "en": "We are analyzing the database logs to find the error.",
        "de": "Wir analysieren die Datenbank-Logs, um den Fehler zu finden."
      },
      {
        "en": "Listen! The alarm is ringing in the server room.",
        "de": "Hör mal! Der Alarm klingelt im Serverraum."
      }
    ],
    "pitfalls": [
      {
        "wrong": "I coding the new feature right now.",
        "right": "I am coding the new feature right now.",
        "tip": "Das Hilfsverb 'am/is/are' darf niemals weggelassen werden!"
      },
      {
        "wrong": "I am understanding the task now.",
        "right": "I understand the task now.",
        "tip": "Zustandsverben wie understand, know, like stehen nicht in der -ing-Form!"
      }
    ],
    "clozeId": "cl-13"
  },
  {
    "id": "simple-past",
    "category": "simple-past",
    "icon": "🟠",
    "title": "Simple Past & Unregelmäßige Verben",
    "subtitle": "Abgeschlossene Vergangenheit",
    "tag": "Vergangenheit • A1-B2",
    "formula": "Regulär: [Verb + ed] | Irregulär: 2. Verbform | Verneinung: [didn't] + [Infinitive]",
    "summary": "Wird genutzt für Aktionen, die in der Vergangenheit stattfanden und komplett vorbei sind. Meist steht eine konkrete Zeitangabe dabei (yesterday, last year, 2 hours ago).",
    "rules": [
      {
        "title": "1. Reguläre Verben (+ed)",
        "detail": "work > worked, install > installed, check > checked. Bei kurzem Vokal: stop > stopped. Bei Konsonant + y: study > studied."
      },
      {
        "title": "2. Die wichtigsten unregelmäßigen Verben (2. Form)",
        "detail": "go > went, see > saw, write > wrote, buy > bought, make > made, find > found, build > built, run > ran, think > thought."
      },
      {
        "title": "3. Goldene Regel bei didn't & did",
        "detail": "In der Verneinung und Frage steht nach 'didn't' bzw. 'did' IMMER der reine Infinitiv: 'I didn't see' (NIEMALS: 'didn't saw'!)."
      }
    ],
    "signalWords": [
      "yesterday",
      "last week",
      "last month",
      "in 2022",
      "... ago",
      "two days ago",
      "when I was"
    ],
    "examples": [
      {
        "en": "Yesterday, I resolved the merge conflict in our repository.",
        "de": "Gestern habe ich den Merge-Konflikt in unserem Repository gelöst."
      },
      {
        "en": "Our lead developer wrote clean, modular code for the project.",
        "de": "Unser leitender Entwickler schrieb sauberen, modularen Code für das Projekt."
      },
      {
        "en": "The database crashed two hours ago, but we recovered it.",
        "de": "Die Datenbank stürzte vor zwei Stunden ab, aber wir haben sie wiederhergestellt."
      },
      {
        "en": "We didn't see any error messages in the server logs.",
        "de": "Wir sahen keine Fehlermeldungen in den Server-Logs."
      }
    ],
    "pitfalls": [
      {
        "wrong": "I didn't went to the office yesterday.",
        "right": "I didn't go to the office yesterday.",
        "tip": "Nach didn't immer den reinen Infinitiv verwenden!"
      },
      {
        "wrong": "Did you saw the new pull request?",
        "right": "Did you see the new pull request?",
        "tip": "Auch in Fragen mit 'Did' steht das Verb im Infinitiv!"
      }
    ],
    "clozeId": "cl-16"
  },
  {
    "id": "present-perfect",
    "category": "present-perfect",
    "icon": "🟣",
    "title": "Present Perfect & Since vs. For",
    "subtitle": "Brücke von der Vergangenheit zur Gegenwart",
    "tag": "Perfekt • A2-B2",
    "formula": "[Subject] + [have / has] + [3. Form (Past Participle)] | For = Dauer | Since = Zeitpunkt",
    "summary": "Verbindet Vergangenheit mit Gegenwart: für Handlungen, die in der Vergangenheit begannen und bis heute andauern, oder deren Ergebnis JETZT noch wichtig ist.",
    "rules": [
      {
        "title": "1. Bildung mit have / has + 3. Verbform",
        "detail": "have/has + Partizip Perfekt: regular (worked, tested), irregular (seen, written, done, gone, built)."
      },
      {
        "title": "2. FOR: Für Zeitspannen & Mengen (Quantity of time)",
        "detail": "Wird mit Zahlen und Dauern genutzt: for 3 years, for two hours, for five minutes, for a long time."
      },
      {
        "title": "3. SINCE: Für feste Startzeitpunkte (Point in time)",
        "detail": "Wird mit Kalenderdaten, Tagen und Uhrzeiten genutzt: since 2020, since Monday, since 9:00 AM, since last month."
      },
      {
        "title": "4. Falscher Freund 'Seit'",
        "detail": "Im Deutschen sagt man Präsens ('Ich lebe seit 3 Jahren hier'). Im Englischen MUSS das Present Perfect stehen: 'I have lived here for 3 years' (NICHT: 'I live here since 3 years')."
      }
    ],
    "signalWords": [
      "for",
      "since",
      "already",
      "just",
      "yet",
      "ever",
      "never",
      "so far",
      "recently"
    ],
    "examples": [
      {
        "en": "I have worked as an IT apprentice for two years.",
        "de": "Ich arbeite seit zwei Jahren als IT-Auszubildender."
      },
      {
        "en": "She has lived in Berlin since 2019.",
        "de": "Sie lebt seit 2019 in Berlin."
      },
      {
        "en": "We have already deployed the hotfix to production.",
        "de": "Wir haben den Hotfix bereits auf Production ausgerollt."
      },
      {
        "en": "Have you ever configured an automated CI/CD pipeline?",
        "de": "Hast du jemals eine automatisierte CI/CD-Pipeline konfiguriert?"
      }
    ],
    "pitfalls": [
      {
        "wrong": "I work here since 5 years.",
        "right": "I have worked here for 5 years.",
        "tip": "Seit + Dauer = have worked + for!"
      },
      {
        "wrong": "He has went to the server room.",
        "right": "He has gone to the server room.",
        "tip": "Im Present Perfect immer die 3. Form (gone) nutzen, nicht die 2. Form (went)!"
      }
    ],
    "clozeId": "cl-18"
  },
  {
    "id": "future",
    "category": "future",
    "icon": "🟡",
    "title": "Zukunft: Will vs. Going To vs. Present",
    "subtitle": "Spontane Entschlüsse vs. feste Pläne",
    "tag": "Zukunft • A2-B2",
    "formula": "Will: [will] + [Infinitive] | Going to: [am/is/are] + [going to] + [Infinitive]",
    "summary": "Im Englischen gibt es mehrere Zukunftsformen. Je nachdem, ob es eine spontane Idee, eine Vermutung, ein fester Plan oder ein Fahrplan ist, wählt man eine andere Form.",
    "rules": [
      {
        "title": "1. Will-Future: Spontan, Vermutung & Versprechen",
        "detail": "Für spontane Entschlüsse im Moment des Sprechens ('The phone rings – I will answer it') und Meinungen ('I think it will work')."
      },
      {
        "title": "2. Going-To-Future: Feste Pläne & sichtbare Vorzeichen",
        "detail": "Für bereits geplante Vorhaben ('I am going to study IT') oder wenn man die Zukunft in der Gegenwart schon sieht ('Look at the clouds, it is going to rain')."
      },
      {
        "title": "3. Present Continuous für feste Verabredungen",
        "detail": "Für Termine mit anderen Personen oder im Kalender: 'We are meeting the customer tomorrow at 10 AM'."
      },
      {
        "title": "4. Present Simple für offizielle Fahrpläne",
        "detail": "Für feste Programme und Fahrpläne: 'The train leaves at 08:30 AM'."
      }
    ],
    "signalWords": [
      "tomorrow",
      "next week",
      "in the future",
      "I think",
      "I hope",
      "probably",
      "soon"
    ],
    "examples": [
      {
        "en": "Don't worry about the server issue, I will fix it right away.",
        "de": "Keine Sorge wegen des Serverproblems, ich werde es sofort beheben (spontan)."
      },
      {
        "en": "Look at the high CPU load! The server is going to crash.",
        "de": "Schau dir die hohe CPU-Last an! Der Server wird gleich abstürzen (sichtbares Vorzeichen)."
      },
      {
        "en": "We are going to migrate our database to the cloud next month.",
        "de": "Wir haben vor, unsere Datenbank nächsten Monat in die Cloud zu migrieren (fester Plan)."
      },
      {
        "en": "I will definitely pass my IHK FIAE AP 1 exam.",
        "de": "Ich werde meine IHK FIAE AP 1 Prüfung definitiv bestehen (Überzeugung)."
      }
    ],
    "pitfalls": [
      {
        "wrong": "Look at the smoke, the engine will overheat.",
        "right": "Look at the smoke, the engine is going to overheat.",
        "tip": "Bei unmittelbaren sichtbaren Beweisen in der Gegenwart: going to!"
      },
      {
        "wrong": "I will meet the doctor tomorrow at 3 PM.",
        "right": "I am seeing the doctor tomorrow at 3 PM.",
        "tip": "Feste persönliche Termine mit Uhrzeit = Present Continuous!"
      }
    ],
    "clozeId": "cl-22"
  },
  {
    "id": "conditionals",
    "category": "conditionals",
    "icon": "🔴",
    "title": "If-Clauses (Bedingungssätze für IT)",
    "subtitle": "Type 1 & Type 2 für Logik & Softwaretests",
    "tag": "Bedingungssätze • B1-B2",
    "formula": "Type 1: If + [Present Simple], will + [Infinitive] | Type 2: If + [Simple Past], would + [Infinitive]",
    "summary": "Bedingungssätze (If-Clauses) sind essenziell für die Softwareentwicklung (If-Else-Logik). Es gibt zwei Haupttypen für reale und hypothetische Bedingungen.",
    "rules": [
      {
        "title": "1. Type 1: Reale, wahrscheinliche Bedingungen",
        "detail": "Bedingung im Present Simple, Folge mit will + Infinitiv: 'If the tests pass, the pipeline will deploy automatically'."
      },
      {
        "title": "2. Kein 'will' im If-Teilsatz!",
        "detail": "Merke: 'If und will machen das Englische schrill'. Niemals will im If-Satz verwenden! Richtig: 'If it crashes...', NICHT: 'If it will crash...'."
      },
      {
        "title": "3. Type 2: Hypothetische, unwahrscheinliche Situationen",
        "detail": "Bedingung im Simple Past, Folge mit would + Infinitiv: 'If I had more RAM, I would run five virtual machines'."
      }
    ],
    "signalWords": [
      "if",
      "unless (außer wenn)",
      "as soon as",
      "provided that",
      "in case"
    ],
    "examples": [
      {
        "en": "If you find a security bug, the company will reward you.",
        "de": "Wenn du eine Sicherheitslücke findest, wird dich das Unternehmen belohnen."
      },
      {
        "en": "The deployment will succeed if all unit tests pass.",
        "de": "Das Deployment wird erfolgreich sein, wenn alle Unit-Tests bestehen."
      },
      {
        "en": "If I had the root password, I would reconfigure the server now.",
        "de": "Wenn ich das Root-Passwort hätte, würde ich den Server jetzt neu konfigurieren."
      },
      {
        "en": "What would you do if the production database went offline?",
        "de": "Was würdest du tun, wenn die Produktionsdatenbank offline gehen würde?"
      }
    ],
    "pitfalls": [
      {
        "wrong": "If you will push to main, the CI will start.",
        "right": "If you push to main, the CI will start.",
        "tip": "Im If-Satz Typ 1 steht immer das Present Simple, niemals will!"
      },
      {
        "wrong": "If I would have more time, I would write tests.",
        "right": "If I had more time, I would write tests.",
        "tip": "Im If-Satz Typ 2 steht das Simple Past (had), niemals would have!"
      }
    ],
    "clozeId": "cl-23"
  },
  {
    "id": "business",
    "category": "business",
    "icon": "💼",
    "title": "Business English & Höfliche Kommunikation",
    "subtitle": "Aus Dr. Higgins-Welters Unterricht & Oxford Course",
    "tag": "Business • B1-B2",
    "formula": "Höflichkeit: [Could / Would you please] + [Infinitive] | E-Mail: [Please find attached] & [I look forward to hearing]",
    "summary": "Im Geschäftsleben wirkt die wörtliche Übersetzung deutscher Sätze oft herrisch oder unhöflich. Englische Fachkräfte nutzen Höflichkeitsformen (Modalverben) und feste E-Mail-Muster.",
    "rules": [
      {
        "title": "1. Höfliche Bitten mit Could & Would",
        "detail": "Statt direktem Imperativ ('Give me the report'): 'Could you please provide me with the latest report?' oder 'Would you mind reviewing this PR?'."
      },
      {
        "title": "2. E-Mail-Anhänge ankündigen",
        "detail": "Feste Formel: 'Please find attached the updated specification document' (NICHT: 'Attached you find')."
      },
      {
        "title": "3. Die Look-Forward-To-Regel",
        "detail": "Nach 'I look forward to' folgt zwingend die -ing-Form (Gerundium): 'I look forward to hearing from you' (Häufigste Prüfungsfalle!)."
      },
      {
        "title": "4. Fristen professionell setzen mit BY",
        "detail": "Für Fristen und Deadlines verwendet man 'by': 'Please send the file by Friday 5 PM' ('until' bedeutet bis zu dem Zeitpunkt durchgehend)."
      }
    ],
    "signalWords": [
      "Could you please...",
      "Please find attached...",
      "I look forward to...",
      "Kind regards",
      "By tomorrow"
    ],
    "examples": [
      {
        "en": "Could you please review my pull request when you have a moment?",
        "de": "Könntest du bitte meinen Pull Request überprüfen, wenn du einen Moment Zeit hast?"
      },
      {
        "en": "Please find attached the latest architecture diagram for your review.",
        "de": "Im Anhang finden Sie das neueste Architekturdiagramm zu Ihrer Durchsicht."
      },
      {
        "en": "I look forward to discussing the system requirements in our next sprint.",
        "de": "Ich freue mich darauf, die Systemanforderungen in unserem nächsten Sprint zu besprechen."
      },
      {
        "en": "Would it be possible to reschedule our standup meeting to 11 AM?",
        "de": "Wäre es möglich, unser Standup-Meeting auf 11:00 Uhr zu verschieben?"
      }
    ],
    "pitfalls": [
      {
        "wrong": "I look forward to hear from you soon.",
        "right": "I look forward to hearing from you soon.",
        "tip": "Nach 'look forward to' steht immer das Gerundium mit -ing!"
      },
      {
        "wrong": "Please send me the report until Friday.",
        "right": "Please send me the report by Friday.",
        "tip": "Deadlines und Fristen werden mit 'by' ausgedrückt, nicht mit 'until'!"
      }
    ],
    "clozeId": "cl-26"
  }
];
