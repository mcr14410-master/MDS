# Changelog

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

---

> **Hinweis:** Die Einträge 1.1.0 – 2.5.0 wurden am 2026-10-06 nachträglich aus der Git-Historie
> (Commits + Pull Requests) rekonstruiert. Versionsnummern folgen den damaligen Branch-Namen
> (`dev/vX.Y.Z-…`); 1.1.0–1.3.0 und 2.5.0 wurden nachträglich vergeben.

---

## [Unreleased]

---

## [2.7.1] - 2026-10-08 - Datensicherung repariert

### Für Anwender
- Die nächtliche Datensicherung des MDS wurde repariert und wird jetzt jeden Tag automatisch auf Vollständigkeit geprüft.
- Administratoren sehen unter „Automatische Aufgaben“ sofort eine rote Fehlermeldung, falls eine Sicherung fehlt oder unvollständig ist.

### Fixed
- `scripts/backup.sh`: Die nächtlichen Backups waren leer (20 Bytes) – Cron startet in `/root`, `docker compose` fand die `compose.yaml` nicht, und ohne `pipefail` meldete das Script trotzdem Erfolg. Jetzt: Wechsel in den Repo-Ordner, `set -euo pipefail`, Prüfung auf Mindestgröße + Endmarke `PostgreSQL database dump complete`, ungültige Backups werden verworfen (Exit 1), alte Backups nur nach Erfolg gelöscht, klare Meldung ohne Schreibrechte, Zeitstempel im Log
- Backup-Monitor (`backup_monitor`): prüfte nur Existenz und Alter, leere Backups galten als „✓“. Jetzt eigenes Modul `services/backupMonitor.js` – neuestes Backup muss vollständig (Größe + Endmarke) und ≤ 26 h alt sein, sonst wird der Lauf als Fehler protokolliert (rot, mit letztem gültigen Backup in der Meldung)

### Added
- `backend/tests/test-backup-monitor.js` (10 Tests: leere/unvollständige/kaputte Backups, Alter, fehlendes Verzeichnis)

### Changed
- DEPLOYMENT.md: Backup-Abschnitt (root-Crontab, `sudo ./scripts/backup.sh`, Prüfung, Monitor); Release-Checkliste: allgemeiner Ablauf mit Backup-Prüfung, 2.7.0 als erledigt

---

## [2.7.0] - 2026-10-07 - Urlaub nach Zeitmodell & sicherer Deploy

### Für Anwender
- Bei Teilzeit-Modellen (z. B. 4-Tage-Woche) werden freie Wochentage nicht mehr als Urlaubstag abgezogen – weder beim Eintragen noch bei Urlaubsanträgen.
- Im Zeitmodell gibt es pro Wochentag (auch Samstag und Sonntag) einen Haken „Arbeitstag“.
- Beim Anlegen von Auswahlfeldern (Dropdown) in Maschinentypen und Werkzeug-Kategorien stürzt die Seite nicht mehr ab.
- Im Hintergrund wurden Sicherheits-Updates eingespielt und der Update-Ablauf des MDS abgesichert.

### Added
- Zeitmodell-Formular: Checkbox „Arbeitstag“ je Wochentag inkl. Sa/So (aus = Soll-Zeit leer)
- `backend/tests/test-working-days.js` (Arbeitstage nach Zeitmodell, Feiertage, DST)
- NC-Viewer: Rechtsklick „Öffnen mit NC-Viewer“ für `.H`/`.NC` unter Windows (`tools/nc-viewer/launcher`, Starter `NC-Viewer-Start.exe`, Einrichtung per bat ohne Adminrechte); passende STEP-Datei im selben Ordner wird automatisch mitgeladen
- NC-Viewer: `PLANE AXIAL` (Achswinkel, z. B. Horizontal-BAZ GROB G350 mit `A-90`) – Bahnen liegen jetzt auf der richtigen Werkstückseite
- Interpreter-Test für `PLANE AXIAL`

### Changed
- Abhängigkeiten ohne Breaking Changes aktualisiert (`npm audit fix`): Backend express 4.21.2 → 4.22.3 (behebt u. a. kritische Lücke in `proxy-addr`), Frontend axios 1.13 → 1.20, vite 7.1 → 7.3, react-router-dom 7.9 → 7.18, postcss, tailwindcss 3.4.19; Lücken Backend 16 → 5, Frontend 29 → 9 (Rest nur per Major-Update)
- `package-lock.json` für Backend, Frontend und `tools/nc-viewer` jetzt im Repo; `backend/Dockerfile` nutzt `npm ci --omit=dev`, `deploy.sh` baut das Frontend nur noch mit `npm ci` (kein stiller Fallback auf `npm install`, kein `--legacy-peer-deps`)
- ESLint: `eslint-plugin-react` mit Regel `react/jsx-no-undef` (fehlende Komponenten-Imports in JSX)
- `docs/RELEASE-CHECKLISTE.md` mit Sonderschritten für das nächste Release
- Repo aufgeräumt: Konzepte aus dem Root nach `docs/konzepte/` (`docs/ARCHITECTURE.md` → `MARKTANALYSE.md`, `Roadmap_wartung_infos.md` → `WARTUNG_NOTIZEN.md`), erledigte Feature-Dokus nach `docs/archiv/`, Session-Dokus bis Nov. 2025 nach `docs/sessions/archiv/` (Dateinamen ohne Leerzeichen)
- `backend/tests/`: `test-programs.http` = bisherige v6 (deckt v1–v5 ab), `test-parts.http` = bisherige `-FIXED`-Fassung
- ROADMAP aufgeräumt: Wochen-Nummern und Fortschrittsbalken entfernt, Abschnitt „Offene Fixes“, Shopfloor-Terminals vor Auftragsverwaltung, NC-Parser/Werkzeug-Extraktion in „TopSolid-Integration & NC-Programme“, Rohmaterial/Normteile in die Ideen, Erledigtes (Stammdaten-Optimierung, Urlaub, Zeit-Terminal) ins Archiv
- README neu geschrieben (Stand Okt. 2026): Module, Technik, lokale Entwicklung, Deployment, Projektstruktur – ohne Fortschrittsangaben, die auf ROADMAP/CHANGELOG verweisen

### Removed
- `backend/tests/test-programs-v2…v6.http`, `test-parts-FIXED.http`, `debug-parts.js`, ungenutztes `frontend/public/vite.svg`
- `QUICKSTART.md` (Stand Woche 3) und `CONTRIBUTING.md` – Inhalt in der README zusammengefasst

### Fixed
- `scripts/deploy.sh`: Migrationsfehler wurden verschluckt (`2>/dev/null … || echo "übersprungen"`) und der Deploy meldete trotzdem Erfolg. Jetzt: Backend-Image bauen → Migration per `docker compose run --rm` mit dem neuen Image → Frontend-Build → `up -d`; bei Migrationsfehler Abbruch mit Meldung, die bisherige Version läuft weiter. Health-Check mit `curl -f` und Wiederholung, Abbruch bei Fehler
- Custom-Fields-Editor: „Option hinzufügen“ bei Dropdown-Feldern stürzte ab (`Trash2` nicht importiert) – Maschinentypen und Werkzeug-Kategorien
- Verbrauchsmaterial: Upload-Dialog für Dokumente stürzte beim Öffnen ab (`X` nicht importiert)
- Urlaub: Urlaubstage (`calculated_days`) werden nach dem Zeitmodell des Mitarbeiters gezählt (Arbeitstag = Soll-Zeit > 0, ohne Zeitmodell weiter Mo–Fr) – betraf Eintragen, Bearbeiten, Vorschau, Antrag und erneutes Einreichen. Bestehende Einträge werden nicht neu berechnet
- NC-Viewer: Beim Herauszoomen verschwanden Aufspannung/Bahnen (Far-Clipping war an die zuletzt zentrierte Bahn gekoppelt) – Clipping-Ebenen werden jetzt laufend an Abstand und Szene angepasst

---

## [2.6.0] - 2026-10-06 - Was ist neu & TopSolid-Werkzeuge

### Für Anwender
- Neu: Ein Klick auf die Versionsnummer unten in der Seitenleiste zeigt „Was ist neu“ – eine Übersicht der Änderungen jeder Version.
- Nach einem Update erscheint an der Versionsnummer ein „Neu“-Hinweis, bis die Übersicht geöffnet wurde.

### Added
- Seite `/changelog` („Was ist neu“): Anwender-Fassung für alle, technische Abschnitte für Admins (Toggle)
- `GET /api/changelog`, `PUT /api/changelog/seen`; Parser-Service für `CHANGELOG.md` (Volume im Backend-Container)
- Migration `users.last_seen_version`, Neu-Badge in der Sidebar pro Benutzer
- `tools/`: TopSolid-Werkzeuge als Quellcode – NC-Viewer (`hh.js`-Interpreter + 3D), TS_SN_Generator, TS_ToolExport, TS_LibExport
- Konzepte `TOPSOLID_TOOL_IMPORT_KONZEPT.md` und `TOPSOLID_INTEGRATION_IDEEN.md`, ROADMAP-Abschnitt „TopSolid-Integration“
- `_lokal/` in `.gitignore` für Kundendaten und Werkzeugstamm-Exporte

### Changed
- `CLAUDE.md`: Regel „Repo ist öffentlich“ mit Platzhalter-Konvention, Release-Regel „Für Anwender“
- `.gitattributes`: `.bat`/`.cmd` werden mit CRLF ausgecheckt

---

## [2.5.1] - 2026-10-06 - Versionierung & Aufräumen

### Für Anwender
- Die aktuelle Programmversion steht jetzt unten in der Seitenleiste.

### Changed
- Version wird zentral aus `package.json` gelesen (Backend + Frontend auf 2.5.1 synchronisiert)
- Sidebar zeigt die Version aus `package.json` statt hartcodiertem `v2.4.2-dev`
- Backend: Root-Endpoint, `/api/health`, `/api/db/info` und Startup-Log liefern die echte Version; veraltete „Phase 3, Week 9“-Angaben entfernt
- `CLAUDE.md`: Arbeitsregeln an Claude-Code-Workflow angepasst (Abschnitt „Scope-Disziplin“), Versionierungs-Workflow dokumentiert
- `ROADMAP.md` auf Stand Oktober 2026 gebracht, CHANGELOG nachgetragen
- `.claude/settings.local.json` in `.gitignore`

### Removed
- Leere Dateien `mds-backend@1.0.0` und `node-pg-migrate` im Root (versehentlich durch npm-Befehle entstanden)

---

## [2.5.0] - 2026-04-19 - Stammdaten-Optimierung (PRs #66–#81)

### Für Anwender
- Vorrichtungen, Spannmittel, Maschinen, Kunden und Bauteile haben jetzt einheitliche Listen mit Kennzahlen, Schnellfilter, Kachel-/Tabellenansicht und Seitenweise-Anzeige.
- Kunden und Bauteile: Dokumente können hochgeladen und nach Typ sortiert werden.
- Maschinen: frei definierbare Zusatzfelder.
- Neue Vorrichtungen bekommen ihre Nummer automatisch.
- Wartung: Wartungstypen auf Deutsch und mit eigenem Symbol.

### Added
- **Maschinen:** Stammdaten-Verwaltung, Custom-Fields in MachineForm + DetailPage (#75, #76)
- **Kunden:** Dokumentenverwaltung (#79)
- **Bauteile:** Dokumenttypen (#80)
- **Vorrichtungen:** Vorrichtungsnummer wird beim Anlegen automatisch vergeben (#73)
- **Wartung:** dynamische Icons pro Wartungstyp (#67)

### Changed
- Einheitliches Listen-/Detail-Pattern (Stats-Cards, Live-Filter, Grid/Table, Pagination, Foto-Preview) für Vorrichtungen, Spannmittel, Maschinen, Kunden, Bauteile (#71, #72, #75, #78, #80)
- Wartungsplan-Liste: erweiterte Filter per default offen (#68)
- Wiederverwendbare Komponenten (CustomFields*, PdfViewer, StepViewer) nach `components/common/` verschoben (#81)

### Removed
- Legacy-Spalten aus `machines` (Abschluss 3-PR-Migration) (#77)

### Fixed
- Deutsche Wartungstyp-Bezeichnung in Dropdown, Tasks und Dashboard (#66, #69)
- Dark-Mode-Toggle in der Sidebar zeigt wieder dynamisches Icon (#74)

---

## [2.4.5] - 2026-04-16 - Entwicklungs-Setup (PRs #62–#65)

### Für Anwender
- Keine sichtbaren Änderungen (internes Entwicklungs-Setup).

### Added
- `CLAUDE.md` mit Projekt-Konventionen und Ordner-Struktur
- `.vscode`-Settings, Git-Workflow mit Branch-Namenskonvention

---

## [2.4.4] - 2026-04-15 - Upload-Standard & Cron (PRs #56–#61)

### Für Anwender
- Bilder und Downloads in Bauteilen, Programmen, Wartung und Verbrauchsmaterial werden zuverlässiger angezeigt.
- Wartungsaufgaben werden automatisch aus den Wartungsplänen erzeugt.

### Added
- Cron-Jobs `fs_garbage_collection` und `generate_maintenance_tasks` (#61)

### Changed
- MDS-weiter File-Upload-Standard: Bilder/Downloads nur noch via `/view` + `/download` hinter Auth (Bauteile, Programme, Wartung, Verbrauchsmaterial) (#57–#60)

### Fixed
- Setup-Sheet und Upload-Verzeichnis (#56)

---

## [2.4.3] - 2026-04-14 - Messmittel-Optimierungen (PR #55)

### Für Anwender
- Messmittel: mehrere Einträge auf einmal bearbeiten, Seitenweise-Anzeige, Tabellenansicht und erweiterte Etiketten.

### Added
- Messmittel: Bulk-Aktionen, Paginierung, Tabellen-Layout, Etiketten-Erweiterungen

---

## [2.4.2] - 2026-03-01 – 2026-04-01 - Zeiterfassung & Urlaub (PRs #49–#54)

### Für Anwender
- Urlaub: Detailansicht pro Mitarbeiter, PDF-Exporte und genauere Aufschlüsselung im Kalender.
- Zeitnachweis: Saldo aus dem Vormonat wird korrekt übernommen, nicht ausgestempelte Tage werden zur richtigen Uhrzeit geschlossen.

### Added
- Urlaubsstatus-Aufschlüsselung, Kalender-Schraffur (#49)
- VacationDetailModal, PDF-Exports, Saldo-Kaskadierung, Adjustment-Tabelle (#50, #52)

### Changed
- Lohnnachweis umbenannt in Zeitnachweis (#49)

### Fixed
- `/check-overlap` (#51)
- `auto_close_open_days` Zeitzonen-Fehler (#53)
- Zeitnachweis-Export übernimmt Vormonats-Saldo korrekt (#54)

---

## [2.4.1] - 2026-02-07 – 2026-02-23 - Zeiterfassungs-Terminal (PRs #44–#48)

### Für Anwender
- Stempeln am Terminal per NFC-Karte oder PIN; mehrere Karten pro Mitarbeiter möglich.
- Saldo-Berechnung und Lohnnachweis korrigiert.

### Added
- Terminal-API mit API-Key-Auth (`authenticateTerminal`), Stempel-/Batch-/User-Info-Endpoints
- Mehrere NFC-Chips pro Benutzer (`user_rfid_chips`)
- Server-Status-Endpoint für das Terminal (#47)

### Fixed
- `time_current_status`-View: `break_end` → `present`
- Saldo-Berechnung ohne offenen Tag, Lohnnachweis Timezone + Rundung (#48)

---

## [2.4.0] - 2026-02-06 - Zeiterfassung (PRs #41–#43)

### Für Anwender
- Neue Zeiterfassung: Kommen, Gehen und Pausen werden erfasst, offene Tage automatisch geprüft.
- Lohnnachweis als PDF.

### Added
- Zeiterfassungssystem mit Cron-Automatisierung und Selbst-Korrektur
- Mitarbeiter-Einstellungen, Pausen-Einstellungen, Dashboard-Überarbeitung
- Lohnnachweis-PDF-Export

---

## [2.3.3] - 2026-01-29 - Messmittel-Etiketten (PRs #38–#40)

### Für Anwender
- Messmittel: Etiketten drucken (mit Vorlagen) und per Barcode-Scanner aufrufen.

### Added
- Label-Generator mit Preset-System und Scanner-Integration

### Fixed
- Etiketten-Vorschau mit Lagerort

---

## [2.3.2] - 2026-01-28 - Zerobot (PR #37)

### Für Anwender
- Neuer Positionsrechner für die Zerobot-Beladeroboter.

### Added
- Positionsrechner für Beladeroboter

---

## [2.3.1] - 2026-01-25 - Urlaubs-Antrags-Workflow (PRs #35–#36)

### Für Anwender
- Urlaub kann jetzt beantragt und von Vorgesetzten genehmigt oder abgelehnt werden.

### Added
- Antrags-Workflow (beantragen → genehmigen/ablehnen)

### Changed
- Urlaubsmodul mit Tabs und Einstellungs-Panel neu strukturiert

---

## [2.3.0] - 2026-01-21 - Urlaubsplanung (PRs #32–#34)

### Für Anwender
- Neue Urlaubsplanung mit Kalender, Feiertagen und Warnung bei Überschneidungen.

### Added
- Urlaubskalender (Monat/Jahr), Überschneidungs-Check, Feiertage aller Bundesländer, Urlaubsansprüche, Rollen-Limits

---

## [2.2.4] - 2026-01-19 - Messmittel-UI (PRs #29–#31)

### Changed
- Feld-Kategorien, Checkout-Modal, Inventarnummer-Lücken, Navigation nach Erstellen, TypesModal-Redesign

---

## [2.2.3] - 2026-01-14 - Operationen-Varianten (PRs #25–#28)

### Added
- Operationstypen und Varianten-System für Arbeitsgänge
- pgAdmin-Setup in `init.sh`

### Fixed
- Löschen der primären OP-Variante

---

## [2.2.1] - 2025-12-11 - Bauteile & Suche (PRs #22–#24)

### Added
- Globale Suche, UI-Präferenzen
- Bauteile: Status-Dropdown, Historie-Tab, Hauptdokumente-Schnellzugriff, PDF-Viewer

---

## [2.2.0] - 2025-12-09 - Verbrauchsmaterial

### Added
- Vereinfachtes Verbrauchsmaterial-System mit Integrationen

---

## [2.1.4] - 2025-12-03 - Wartung & PWA (PRs #16–#21)

### Added
- Wartung: Standalone-Tasks, verbesserter Task-Workflow
- PWA-Support

### Fixed
- Hardcodierte API-URLs, MaintenanceWidget, Line-Endings auf LF normalisiert

---

## [2.1.3] - 2025-12-02 - Wiki & Maschinen-Dokumente

### Added
- Wiki-System (Kategorien, Volltext-Suche)
- MachineDetailPage mit Dokumenten-System

---

## [2.1.2] - 2025-12-01 - Erstes Deployment (PRs #11–#14)

### Added
- Docker-Setup für Raspberry Pi, `deploy.sh` mit Migrationen, erweiterte Seeds

---

## [2.1.1] - 2025-11-30 - Kundenverwaltung (PR #10)

### Added
- Kunden mit Ansprechpartnern und Bauteil-Zuordnung

---

## [2.1.0] - 2025-11-30 - Wartungssystem (PR #9)

### Added
- Wartungspläne, Checklisten, Foto-Upload, Skill-Level

---

## [2.0.0] - 2025-11-29 - UI & Benutzerverwaltung

### Added
- Sidebar-Layout (UI-Optimierung)
- User-Verwaltung mit Rollen und Berechtigungen

---

## [1.9.2] - 2025-11-29 - Vorrichtungen (PR #8)

### Added
- Vorrichtungs-Verwaltung mit Setup-Sheet-Integration

---

## [1.9.1] - 2025-11-28 - Spannmittel

### Added
- Spannmittel-Verwaltung mit Lager-Integration

---

## [1.9.0] - 2025-11-27 - Messmittel

### Added
- Messmittelverwaltung (Kalibrierung, Zertifikate, Checkout)

---

## [1.8.3] - 2025-11-25 - T-Nummern (PR #7)

### Added
- Werkzeug-Nummernlisten (T-Number-Management)

---

## [1.8.2] - 2025-11-24 - Bestellwesen (PR #6)

### Added
- Bestellungen (Purchase Orders)

---

## [1.8.1] - 2025-11-19 - Lieferanten

### Added
- Lieferantenverwaltung mit Werkzeug-Integration

---

## [1.8.0] - 2025-11-16 - Lager & Werkzeuge (PR #5)

### Added
- Lagerorte-System, Werkzeug-Datenbankschema, Lagerartikel mit Einzelgewichten

---

## [1.7.0] - 2025-11-09 - Werkzeuglisten & Prüfpläne (PR #4)

### Added
- Werkzeuglisten (Woche 11)
- Prüfpläne mit allen Toleranzarten (Woche 12)

---

## [1.6.0] - 2025-11-08 - Setup Sheets

### Added
- Setup Sheets Backend + Frontend (Woche 10)

---

## [1.5.0] - 2025-11-07 - Workflow & Dark Mode

### Added
- Workflow-System (Woche 9)
- Dark Mode für alle Komponenten

---

## [1.4.0] - 2025-11-06 - Maschinen (PRs #2–#3)

### Added
- Maschinen-Stammdaten Backend + Frontend (Woche 8)

---

## [1.3.0] - 2025-11-06 - Programm-Versionierung (PR #1)

### Added
- NC-Programm-Versionierung mit Diff-Viewer (Woche 7)

---

## [1.2.0] - 2025-11-05 - Programme

### Added
- Programme-Frontend mit Datei-Upload (Woche 6)

---

## [1.1.0] - 2025-11-04 - Arbeitsgänge

### Added
- Operations Backend CRUD + Frontend (Woche 5)

---

## [1.0.0] - 2025-11-03 - 🎉 PHASE 1 KOMPLETT!

### ✅ Woche 4: Integration & Testing - ABGESCHLOSSEN

**Datum:** 03. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~4 Stunden

#### Added
- **Frontend:**
  - Part Detail Page (`/parts/:id`) mit vollständiger Bauteil-Ansicht
  - Part Create/Edit Forms (`/parts/new`, `/parts/:id/edit`) mit Validierung
  - Toast Notification System (selbst gebaut, ohne externe Library)
  - Success/Error/Info Toasts mit Auto-dismiss und Manual Close
  - Layout Component mit Navigation und User Info
  - App.jsx mit Outlet-Pattern für verschachtelte Routes

#### Changed
- **Backend:**
  - CORS konfiguriert für Frontend (`http://localhost:5173`)
  - `customer_id` ist jetzt optional (nicht mehr Pflichtfeld)
  - Parts Controller filtert `deleted` Parts automatisch raus
  
- **Frontend:**
  - TailwindCSS v4 → v3 downgrade (Stabilität)
  - LoginPage: `login` → `username` Feld (Backend-kompatibel)
  - DashboardPage: Stats Mapping von camelCase → snake_case
  - DashboardPage: Doppeltes Layout entfernt
  - PartFormPage: `raw_material` → `dimensions` (DB-Schema kompatibel)
  - PartsPage: Verwendet Toast statt native alerts
  - Toaster: Array-Mutation Bug gefixt (push → spread operator)

#### Fixed
- **9 kritische Bugs:**
  1. ✅ TailwindCSS PostCSS Plugin Fehler
  2. ✅ Login: Falscher Feldname (login → username)
  3. ✅ Navigation: Doppeltes Layout gerendert
  4. ✅ Dashboard: Stats zeigten 0 (snake_case Problem)
  5. ✅ Parts Create: customer_id Pflichtfeld-Fehler
  6. ✅ Parts Create: raw_material Spalte existierte nicht
  7. ✅ Backend: customer_id Validierung zu strikt
  8. ✅ Audit-Log: Schema-Differenz (temporär deaktiviert)
  9. ✅ Toast: Array-Mutation verhinderte Rendering

#### Technical Details
- **Lines of Code:** ~1200 neue Frontend-Zeilen
- **Komponenten:** 3 neue Pages, 1 neue Component (Toaster)
- **Bug Fixes:** 9 kritische Fixes
- **Performance:** Toast System ohne externe Library (minimaler Footprint)

#### Deliverables
```
✅ Vollständig integriertes System (Frontend ↔ Backend)
✅ Part CRUD komplett (Create, Read, Update, Delete)
✅ Toast Notifications funktionieren
✅ Permission-based UI überall implementiert
✅ Responsive Design für alle Pages
✅ Form Validierung mit User-Feedback
✅ MEILENSTEIN 1 ERREICHT: Lauffähiges Basis-System!
```

---

## [0.3.0] - 2025-11-02 - Frontend React App

### ✅ Woche 3: Frontend Basis - ABGESCHLOSSEN

**Datum:** 02. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~2 Stunden

#### Added
- **React App Setup:**
  - React 19 + Vite 7
  - TailwindCSS v4 (später auf v3 downgraded)
  - Zustand State Management
  - React Router v7
  - Axios mit Interceptors

- **Components:**
  - ProtectedRoute mit Permission-Checks
  - Layout mit Navigation

- **Pages:**
  - LoginPage (schönes Gradient Design)
  - DashboardPage (Stats Cards + Quick Actions)
  - PartsPage (Tabelle mit Filter/Search)

- **Stores:**
  - authStore (Login, Logout, Permission-Checks)
  - partsStore (CRUD Operations, Filters)

- **Features:**
  - Token Persistence (localStorage)
  - Auto-Logout bei 401
  - Permission-based Navigation
  - Loading & Empty States

#### Technical Details
- **Lines of Code:** ~900 Frontend-Zeilen
- **Tech Stack:** React 19, Vite 7, TailwindCSS, Zustand, React Router
- **Komponenten:** 2 Components, 3 Pages, 2 Stores

#### Deliverables
```
✅ React App läuft auf localhost:5173
✅ Login/Logout funktioniert
✅ Dashboard mit Stats Cards
✅ Parts Liste mit Filter
✅ Permission-based UI
```

---

## [0.2.0] - 2025-11-02 - Backend API + Auth

### ✅ Woche 2: Backend Basis + Auth - ABGESCHLOSSEN

**Datum:** 02. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~8 Stunden

#### Added
- **Authentication:**
  - JWT Token Generation & Verification
  - bcrypt Password Hashing
  - User Registration & Login
  - Password Change Endpoint
  - Token Expiry (24h)

- **Authorization:**
  - Role-based Access Control (RBAC)
  - Permission-based Access Control
  - Auth Middleware (authenticateToken, requirePermission)

- **Parts API:**
  - GET /api/parts (mit Filtering)
  - GET /api/parts/:id
  - POST /api/parts (mit Validierung)
  - PUT /api/parts/:id
  - DELETE /api/parts/:id (Soft Delete)
  - GET /api/parts/stats

- **Audit-Log:**
  - Middleware für automatisches Logging
  - Tracking von CREATE, UPDATE, DELETE
  - User, IP, Timestamp Tracking

- **Database:**
  - 2 neue Migrations (auth enhancements, parts enhancements)
  - Test Customer Seeds (3 Kunden)
  - Enhanced Parts Schema (status, updated_by, cad_file_path)

#### Technical Details
- **API Endpoints:** 10 total (4 Auth + 6 Parts)
- **Lines of Code:** ~1500 Backend-Zeilen
- **Migrations:** 7 total (5 base + 2 enhancements)

#### Deliverables
```
✅ Backend API läuft auf localhost:5000
✅ JWT Authentication komplett
✅ Parts CRUD API komplett
✅ Audit-Log System aktiv
✅ Test-Suite vorhanden
```

---

## [0.1.0] - 2025-11-01 - Datenbank-Schema

### ✅ Woche 1: Projekt-Setup & Datenbank - ABGESCHLOSSEN

**Datum:** 01. November 2025  
**Phase:** 1 - Fundament  
**Status:** ✅ Abgeschlossen  
**Arbeitszeit:** ~8 Stunden

#### Added
- **Projekt-Struktur:**
  - Backend (Express + PostgreSQL)
  - Frontend (Vorbereitet für React)
  - Dokumentation (README, QUICKSTART, CONTRIBUTING, ROADMAP)

- **Datenbank:**
  - PostgreSQL Schema (28 Tabellen in 6 Kategorien)
  - node-pg-migrate Setup
  - 5 Basis-Migrations
  - Seed-Daten (6 Rollen, 27 Permissions, 1 Admin-User)

- **Express Server:**
  - Health Check API
  - Database Info API
  - Root Endpoint mit API-Übersicht

#### Technical Details
- **Tabellen:** 28 in 6 Kategorien
  - Authentication (users, roles, permissions, etc.)
  - Production (parts, operations, bom, etc.)
  - Machines (machines, tools, programs, etc.)
  - File Management (files, file_versions)
  - Audit (audit_logs)
  - Maintenance (maintenance_plans, tasks, etc.)

- **Migrations:** 5 Basis-Migrations
  1. create-auth-system.js
  2. create-parts-operations.js
  3. create-machines-programs.js
  4. create-audit-log.js
  5. create-maintenance-system.js

#### Deliverables
```
✅ Datenbank-Schema komplett (28 Tabellen)
✅ Migrations funktionieren
✅ Seeds vorhanden
✅ Express Server läuft
✅ Health Check API aktiv
```

---

## Kategorien

- **Added** - Neue Features
- **Changed** - Änderungen an existierenden Features
- **Deprecated** - Features die bald entfernt werden
- **Removed** - Entfernte Features
- **Fixed** - Bug Fixes
- **Security** - Sicherheits-Updates

---

## Nächste Version

### [1.1.0] - TBD - Operations System

**Geplant für:** Woche 5  
**Features:**
- Operations Backend CRUD
- Operations Frontend
- OP-Nummern System
- Maschinen-Zuweisung
- Sequence Management

---

**Letzte Aktualisierung:** 2025-11-03
