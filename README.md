# 🇬🇧 FIAE & Business English Master (Englisch-Lern-App)

Eine moderne, voll responsive Web-Applikation zur gezielten Vorbereitung auf die **IHK-Abschlussprüfung Teil 1 (AP 1) Fachinformatiker Anwendungsentwicklung**, den **Berufsalltag in der IT / Business**, **Alltagssmalltalk** und den **Urlaub**.

Optimiert für **Smartphones (iOS & Android)** sowie **Desktop-Browser**.

---

## 🌟 Hauptfunktionen

1. **🗂️ 3D-Karteikarten & Bildvokabeln (Flashcards)**
   - Grafische SVGs und Icons für jeden Begriff.
   - Vorderseite: Englisches Fachwort, Lautschrift-Aussprachehilfe, Audio-Button.
   - Rückseite: Deutsche Übersetzung, prüfungsrelevante Definition und praxisnahe Beispielsätze.
   - "Nochmal üben" & "Schon gekonnt"-Buttons mit XP-Punktevergabe.
   - Mobile Touch-Wischgesten (Swipe) zum Weiterblättern.

2. **🎙️ Sprech- & Hörtrainer (Speech & Voice Repetition)**
   - Natürliche Sprachausgabe (Text-to-Speech) mit Tempowahl (⚡ 1.0x Normal oder 🐢 0.75x für Anfänger).
   - Mikrofon-Aufnahme mit Spracherkennung (`webkitSpeechRecognition` / Speech API).
   - Sofortiges Feedback und prozentuale Aussprache-Bewertung!

3. **✏️ Interaktiver Lückentext-Trainer (Cloze Tests)**
   - Relevante Prüfungsfragen und typische Berufs-Szenarien.
   - Multiple-Choice-Optionen mit Sofort-Rückmeldung.
   - Hilfestellungen ("Tipp"-Button) und deutsche Erklärungen.

4. **📚 Durchsuchbares Wörterbuch & Fortschritts-Tracker**
   - Live-Suche über alle Vokabeln und Übersetzungen.
   - Audio-Aussprache auf Knopfdruck für jedes Wort.
   - Fortschritt und Erfahrungspunkte (XP) werden dauerhaft im Browser gespeichert (`localStorage`).

---

## 🚀 Themenbereiche

- **💻 FIAE AP 1 & IT:** Requirements Specification, Merge Conflict, Subnet Mask, Relational Database, CI/CD, Exception Handling, Unit Testing, OOP.
- **💼 Job & Business:** Daily Standup, Tight Deadline, I am blocked by..., Clarifying Requirements, Pull Requests.
- **💬 Smalltalk & Alltag:** Kennenlernen, Kaffeepause, Wochenende, Feierabend.
- **✈️ Urlaub & Reise:** Flugsteig & Gate, Hotelreservierung, Wegbeschreibung, Restaurant-Rechnung.

---

## 📱 Auf dem Smartphone öffnen

### Variante 1: Über GitHub Pages (Online)
1. Repository auf GitHub öffnen: [Istvan-Csovrij/Englisch_LernApp](https://github.com/Istvan-Csovrij/Englisch_LernApp)
2. Unter **Settings** ➔ **Pages** den Branch `main` auswählen und speichern.
3. Den generierten Link im mobilen Browser (Safari / Chrome) aufrufen und optional als Web-App zum Home-Bildschirm hinzufügen!

### Variante 2: Im lokalen Netzwerk
Starte im Ordner `Englisch_LernApp` ein Terminal:
```bash
python -m http.server 8080
```
Rufe im Handy-Browser deine lokale IP-Adresse auf (z. B. `http://192.168.178.xx:8080`).

---

## 🛠️ Technische Details

- **Technologie:** HTML5, Modern CSS3 (CSS Grid, Flexbox, 3D Transforms), Vanilla JavaScript.
- **APIs:** Web Speech API (`SpeechSynthesis`, `SpeechRecognition`), LocalStorage.
- **Keine externen Abhängigkeiten / Kein Build-Schritt erforderlich.**
