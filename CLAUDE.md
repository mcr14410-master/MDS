# MDS – Manufacturing Data System

## Projekt-Überblick
Eigenentwickeltes Fertigungs-Managementsystem für CNC-/Aerospace-Fertigung (8 Mitarbeiter, Einschichtbetrieb mit mannloser Nachtfertigung). Ersetzt teure kommerzielle Alternativen. Audit-Trail und Compliance sind kritisch (Aerospace-Zertifizierungen).

**Stack:** Node.js/Express Backend, React 19 Frontend (Vite, TailwindCSS v3, Zustand, React Router v7), PostgreSQL, Docker, Caddy Reverse Proxy
**Deployment:** Raspberry Pi 5 (8GB RAM, ext. SSD), Docker-Container laufen in UTC
**Repo:** github.com/mcr14410-master/MDS

## Arbeitsweise – STRIKT EINHALTEN

### Diagnose-First-Prinzip
Bei Problemen, Fehlern oder Bugs:
1. Problem diagnostizieren – Was genau ist der Fehler?
2. Optionen erklären – Was sind mögliche Lösungen?
3. AUF BESTÄTIGUNG WARTEN – Welche Lösung soll es sein?
4. Erst nach Bestätigung implementieren

**NIEMALS** eigenständig Fixes anwenden ohne vorherige Rückfrage.

### Nur auf Anfrage
- Fixes und HowTos NUR erstellen wenn explizit angefragt
- Dokumentation und Summaries NUR auf Anfrage
- Keine ungefragten Refactorings oder Verbesserungsvorschläge
- Keine unnötigen Erklärungen wie man eine Datei ersetzt

### Änderungen minimal halten
- Bei Änderungen NUR geänderte Dateien bereitstellen, nie das gesamte Projekt
- Bei kleinen Änderungen NUR die betreffenden Zeilen/Abschnitte zeigen
- Keine vollständigen Datei-Rewrites wenn nur 3 Zeilen betroffen sind

### Session-Workflow
- Entwicklung folgt dem ROADMAP.md mit Wochen-Meilensteinen
- Session-Ende: ROADMAP.md updaten, Session-Docs, Git Commit Messages
- CHANGELOG.md pflegen

## Git-Workflow
- Neue Branches IMMER von aktuellem main erstellen (`git checkout main && git pull` vor dem Branchen)
- Für jede Session/Feature/Bugfix einen neuen Branch erstellen
- Einzelne Schritte committen (kleine, nachvollziehbare Commits)
- Push erst wenn alles läuft und getestet ist
- Merge via Pull Request auf GitHub nach main
- Keine Commits, Pushes oder Branch-Operationen ohne explizite Aufforderung
- `git diff` und `git status` sind jederzeit erlaubt

## Technische Konventionen

### Backend
- **Datenbank:** PostgreSQL Pool mit Raw SQL (KEIN Knex, kein ORM)
- **Migrations:** node-pg-migrate
- **Auth-Middleware:** Import als `{ authenticateToken }` aus der Middleware – NICHT `auth`, NICHT `authMiddleware`. Falsche Import-Namen verursachen Server-Startup-Fehler.
- **File Uploads:** multer
- **Cron Jobs:** node-cron
- **API-Tests:** VS Code REST Client (.http-Dateien mit 20-30+ Szenarien pro Modul) – Backend-APIs KOMPLETT testen bevor Frontend-Entwicklung beginnt

### Frontend
- **Axios:** IMMER die konfigurierte Instanz aus `utils/axios.js` importieren (trägt Auth-Token und baseURL). NIEMALS raw axios importieren.
- **State Management:** Zustand
- **Routing:** React Router v7
- **UI-Sprache:** Komplett Deutsch – alle Labels, Meldungen, Platzhalter
- **Styling:** TailwindCSS v3, Dark/Light Mode Support

### File-Upload-Standard (MDS-weit)
- Files NUR via `/api/<resource>/<id>/view` (inline) + `/download` (attachment) hinter authenticateToken
- Frontend: `AuthImage` + `ImageLightbox` (components/common/), `downloadFileViaApi` (utils/)
- Alle via axios + Bearer + Blob + URL.createObjectURL
- Backend: DRY-Helper mit Path-Traversal-Schutz
- KEINE `/uploads/*`-URLs im Frontend

### Datenbank-Patterns
- COALESCE in UPDATE-Statements entfernen bei optionalen Feldern (sonst können Werte nicht geleert werden)
- PostgreSQL gibt Date-Spalten manchmal als Strings zurück → defensive `instanceof Date` Checks vor `.toISOString()`
- Stock-Berechnungen: `reorder_point` verwenden (NICHT `min_quantity`), gewichtete Faktoren: new=1.0, used=0.5, reground=0.8

### Timezone-Disziplin – KRITISCH
- Docker-Container laufen in UTC, Anwendungsschicht MUSS CET/CEST explizit handhaben
- ALLE Timestamp-Konstruktionen mit timezone-aware Datetimes (Europe/Berlin)
- DST-Übergänge via Noon-Probe-Pattern abfangen
- UTC-Fehlinterpretation hat mehrfach Bugs verursacht – bei jedem zeitbezogenen Code prüfen
- Python: `ZoneInfo("Europe/Berlin")` mit `tzdata`-Package (auf Windows nötig, Linux nicht)

### Balance/Zeiterfassung
- Salden IMMER aus `time_balances` lesen (enthält Korrekturen), NICHT aus `overtime_minutes` in `time_daily_summary`

## Risiko-Patterns (aus Erfahrung)
- Großflächige automatisierte CSS-Änderungen (sed über 136+ Files) → hohes Risiko, lieber gezielte Fixes
- View-in-new-tab mit Token-in-Query-Parameter → unlösbare Node.js Module-Caching-Issues, Feature wurde zurückgerollt. Download-only ist der stabile Ansatz.
- Git aktiv für Recovery nutzen

## Projekt-Struktur (Hauptmodule)
- Auth/RBAC, Teile-Management, Arbeitsgänge, NC-Programm-Verwaltung (Versionierung)
- Werkzeug-Management (Zustandstracking: neu/gebraucht/nachgeschliffen, QR-Codes, Lieferanten, Bestellungen)
- Messmittel-Verwaltung (Kalibrierung, Zertifikate, ISO-Compliance)
- Spannmittel & Vorrichtungen
- Wartungssystem (planbasiert + Standalone-Tasks, Checklisten, Skill-Level)
- Urlaubs- & Zeiterfassung (NFC-Terminal auf Raspi 4, Cron-Jobs, Zeitnachweis-PDF)
- Rüstblätter, Werkzeuglisten, Prüfpläne
- Wiki, Kundenverwaltung, Verbrauchsmaterial
- Setup Sheets, Zerobot Positionsrechner

## Hardware-Umgebung
- TopSolid CAD/CAM v7.17, Heidenhain TNC, Siemens Drehmaschinen, Mazatrol 640M
- Zerobot Laderobots (Grob G350, Hermle C22)
- Terminal: Raspberry Pi 4, 7" Touchscreen, PN532 NFC, KY-006 Buzzer, Python/FastAPI, X11/xinit
- Label-Drucker, Barcode-Scanner
