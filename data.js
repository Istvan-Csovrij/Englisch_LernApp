// ============================================================
// Lern-Datenbank: Fachinformatiker AP 1, Business & Alltag
// ============================================================

const CATEGORIES = {
  all: { id: 'all', name: 'Alle Themen', icon: '🌐' },
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
        en: 'Good morning! My name is Istvan, and I work as a junior software developer.',
        de: 'Guten Morgen! Mein Name ist Istvan und ich arbeite als Junior-Softwareentwickler.'
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
        en: 'Hey Istvan, are you taking a quick screen break? Would you like to grab a coffee together?',
        de: 'Hey Istvan, machst du eine kurze Bildschirmpause? Möchtest du dir zusammen einen Kaffee holen?'
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
        en: 'Good afternoon, I have a hotel room reservation under the name Istvan Csovrij.',
        de: 'Guten Tag, ich habe eine Hotelzimmer-Reservierung auf den Namen Istvan Csovrij.'
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
];

// ============================================================
// 5. DIALOG- & KONVERSATIONS-SZENARIEN (MIT SPRECHEN & KORREKTUR)
// ============================================================
const DIALOG_SCENARIOS = {
  quiz: {
    id: 'quiz',
    title: '🎯 Vokabel-Prüfer & Quiz',
    icon: '🎯',
    partnerName: 'Prof. Miller (Vokabel-Coach)',
    partnerRole: 'Interaktiver Vokabel- & Fachbegriff-Prüfer',
    initialPrompt: 'Hallo Istvan! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische Fachbegriffe und du schreibst oder sprichst mir die deutsche Bedeutung! Los geht\'s mit deinem ersten Begriff:',
    initialPromptDe: 'Hallo Istvan! 🎯 In diesem Modus teste ich deinen Wortschatz. Ich nenne dir englische Fachbegriffe und du schreibst oder sprichst mir die deutsche Bedeutung! Los geht\'s mit deinem ersten Begriff:',
    contextKeywords: ['bereit', 'ready', 'ja', 'start', 'los', 'yes', 'abfragen', 'quiz', 'vokabeln', 'wörter', 'deutsch']
  },
  standup: {
    id: 'standup',
    title: 'Daily Scrum Standup',
    icon: '💻',
    partnerName: 'Sarah (Scrum Master)',
    partnerRole: 'Scrum Master & Agile Coach',
    initialPrompt: 'Good morning Istvan! Welcome to today\'s daily standup. What did you accomplish yesterday, what is your plan for today, and do you have any blockers?',
    initialPromptDe: 'Guten Morgen Istvan! Willkommen zum heutigen Daily Standup. Was hast du gestern geschafft, was planst du für heute und hast du Hindernisse (Blocker)?',
    contextKeywords: ['yesterday', 'today', 'ticket', 'bug', 'database', 'worked', 'working', 'blocked', 'finish', 'sql', 'query', 'code', 'test', 'api', 'pr', 'review']
  },
  interview: {
    id: 'interview',
    title: 'IT-Vorstellungsgespräch',
    icon: '👔',
    partnerName: 'Mr. Davis (Tech Lead)',
    partnerRole: 'Lead Architect & Interviewer',
    initialPrompt: 'Hello Istvan, thank you for coming in today! Could you tell me a little bit about yourself and what projects you enjoyed most during your development training?',
    initialPromptDe: 'Hallo Istvan, vielen Dank für Ihr Erscheinen heute! Können Sie mir ein wenig über sich erzählen und welche Projekte Ihnen während Ihrer Entwicklerausbildung am meisten Spaß gemacht haben?',
    contextKeywords: ['experience', 'programming', 'developer', 'company', 'learn', 'java', 'python', 'sql', 'team', 'skills', 'because', 'project', 'architecture', 'clean code', 'database']
  },
  support: {
    id: 'support',
    title: 'Bug-Report & Ticket Support',
    icon: '🛠️',
    partnerName: 'Alex (Product Manager)',
    partnerRole: 'Senior Product Manager',
    initialPrompt: 'Hi Istvan! Our QA team flagged an issue in production: the database connection pool times out during peak checkout hours. Could you investigate this ticket?',
    initialPromptDe: 'Hi Istvan! Unser QS-Team hat ein Problem in der Produktion gemeldet: Der Datenbank-Verbindungspool bricht zu Spitzenzeiten ab. Könntest du dieses Ticket untersuchen?',
    contextKeywords: ['check', 'fix', 'database', 'issue', 'problem', 'look', 'connection', 'timeout', 'test', 'server', 'log', 'query', 'reproduce', 'hotfix', 'pool']
  },
  architecture: {
    id: 'architecture',
    title: 'Software-Architektur & Clean Code',
    icon: '📐',
    partnerName: 'Elena (Senior Architect)',
    partnerRole: 'Staff Software Architect',
    initialPrompt: 'Hi Istvan! We are currently redesigning our backend service layer. What are your thoughts on applying the Single Responsibility Principle and RESTful API conventions here?',
    initialPromptDe: 'Hi Istvan! Wir überarbeiten aktuell unsere Backend-Service-Schicht. Was hältst du davon, hier das Single-Responsibility-Prinzip und RESTful-API-Konventionen anzuwenden?',
    contextKeywords: ['architecture', 'clean code', 'refactor', 'solid', 'pattern', 'api', 'rest', 'json', 'service', 'layer', 'class', 'interface', 'coupling', 'microservices']
  },
  smalltalk: {
    id: 'smalltalk',
    title: 'Kaffeepause & Smalltalk',
    icon: '☕',
    partnerName: 'Mark (Colleague)',
    partnerRole: 'Senior Developer & Teammate',
    initialPrompt: 'Hey Istvan! Taking a quick screen break? How is your week treating you so far, and did you get any chance to work on your music projects?',
    initialPromptDe: 'Hey Istvan! Machst du eine kurze Bildschirmpause? Wie läuft deine Woche bisher und hattest du Gelegenheit, an deinen Musikprojekten zu arbeiten?',
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
    initialPrompt: 'Hello Istvan! I am your interactive English conversational partner. You can talk to me about programming, daily life, exams, or anything you like. What is on your mind today?',
    initialPromptDe: 'Hallo Istvan! Ich bin dein interaktiver englischer Gesprächspartner. Du kannst mit mir über Programmierung, Alltag, Prüfungen oder beliebige Themen sprechen. Woran denkst du gerade?',
    contextKeywords: []
  }
};
