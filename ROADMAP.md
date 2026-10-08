# Roadmap - MDS Fertigungsdaten Management System

**Stand:** Oktober 2026 · Versionen und erledigte Änderungen: [CHANGELOG.md](CHANGELOG.md)

> Detaillierte Dokumentation abgeschlossener Phasen: [ROADMAP_ARCHIVE.md](ROADMAP_ARCHIVE.md)

---

## 📊 Übersicht

| Phase | Status | Inhalt |
|-------|--------|--------|
| Phase 1-7 | ✅ | Fundament, Kern, Work Instructions, Werkzeuge, Messmittel, Spannmittel, User-Verwaltung, Wartung |
| Phase 8 | 🔄 | Kunden ✅, Wiki ✅, PWA ✅, Stammdaten-Optimierung ✅, Verbrauchsmaterial 🔄 |
| Phase 9 | 🔄 | Urlaub ✅ (Fix offen), Zerobot-Setups, Revisionen, Admin, Benachrichtigungen, Werkzeug-Icons, HTTPS |
| Phase 10 | 🔄 | Shopfloor-Terminals (Zeit-Terminal ✅ im Einsatz) |
| Phase 11 | 📋 | Auftragsverwaltung |
| TopSolid & NC | 🔄 | Exporter ✅, NC-Viewer ✅, Werkzeugimport, NC-Programm-Auswertung (auch ohne TopSolid) |
| Phase 12+ | 💡 | Ideen: Lager-Erweiterungen, Reports, Parser, ERP-Integration |

---

## 🐞 Offene Fixes

- [x] **Custom-Fields:** „Option hinzufügen“ bei Dropdown-Feldern ließ das Frontend abstürzen (fehlender Icon-Import, auch Werkzeug-Kategorien; gleicher Fehler im Upload-Dialog Verbrauchsmaterial)
- [x] **Urlaub:** Wochentage mit Soll-Zeit 0 wurden als Urlaubstag abgezogen (#92)
- [x] **`scripts/deploy.sh`:** verschluckte Migrationsfehler – jetzt Migration vor dem Umschalten, Abbruch bei Fehler, strenger Health-Check
- [ ] **`deploy.sh`: DB-Backup direkt vor der Migration** (`scripts/backup.sh`) als Rückfall bei missglückter Migration
- [ ] **`deploy.sh`: Frontend-Build** schreibt direkt nach `frontend/dist` (Vite leert den Ordner vorher) – bricht der Build ab, ist das Frontend weg. Besser in temporären Ordner bauen und erst bei Erfolg tauschen
- [ ] **`deploy.sh`: Autostash** – `git stash pop || true` ignoriert Konflikte stillschweigend
- [ ] **`backend/.migrationrc.json`** zeigt auf `./src/migrations` (Migrationen liegen in `backend/migrations`), wird von node-pg-migrate v6 nicht gelesen → entfernen oder korrigieren
- [x] **Lockfiles:** jetzt im Repo, Backend-Image und Frontend-Build mit `npm ci`
- [ ] **ESLint:** 4 Fehler, 1 Warnung in `Sidebar.jsx`
- [x] **ESLint-Regel `react/jsx-no-undef`** (`eslint-plugin-react`) aktiv
- [ ] **ESLint aufräumen:** 270 Fehler / 118 Warnungen im Frontend; `varsIgnorePattern: '^[A-Z_]'` durch `react/jsx-uses-vars` ersetzen
- [x] **Abhängigkeiten, Stufe 1:** `npm audit fix` ohne Breaking Changes (Backend 16 → 5 Lücken, kritisch behoben; Frontend 29 → 9)
- [ ] **Abhängigkeiten, Stufe 2 (Major, einzeln prüfen):** `multer` 2.x (alle Uploads!), `exceljs`, `chokidar` (prüfen ob noch genutzt), `uuid`, `online-3d-viewer`; Tailwind 4 **nicht** (großer Umbau)
- [ ] **Urlaub über den Jahreswechsel:** Ein Urlaub vom Dezember bis in den Januar wird komplett dem **Startjahr** angerechnet – die View `vacation_balances` gruppiert nach `EXTRACT(YEAR FROM start_date)`, `calculated_days` ist eine Gesamtzahl. Tage müssen je Kalenderjahr aufgeteilt werden (Berechnung je Jahr, Anzeige im Kalender + Resturlaub + PDFs prüfen)
- [ ] **Eigene Urlaubsanträge bearbeiten/zurückziehen,** solange sie noch nicht genehmigt sind – aktuell erfordern Bearbeiten und Löschen `vacations.manage`, Mitarbeiter können nur abgelehnte Anträge erneut einreichen
- [ ] **Deaktivierte Maschinen in Auswahllisten:** `GET /api/machines` liefert ohne Filter auch inaktive Maschinen; mehrere Formulare (Arbeitsgang, Rüstblatt, Wiki, Varianten, Spannmittel, Vorrichtungen …) filtern nicht bzw. uneinheitlich. Einheitlich nur aktive anbieten (bestehende Zuordnungen weiter anzeigen); dazu Löschen vs. Deaktivieren prüfen und alte Testdaten-Maschinen auf dem Pi bereinigen
- [ ] **Wartungspläne kopieren:** Plan (inkl. Checkliste, Intervalle, Skill-Level) auf eine andere Maschine übernehmen – viele Maschinen haben gleiche Pläne; aktuell keine Kopierfunktion
- [ ] **Rollen:** selbst erstellte Rollen haben keine Farbe (Farben fest nach Rollenname im Frontend, sonst grau) → Farbe je Rolle wählbar und speichern; Rollen deaktivieren können statt nur löschen
- [ ] **Berechtigungen per Migration anlegen:** `storage.*` (von 43 API-Stellen verlangt) und weitere stehen nur in `scripts/init.sh`, in keiner Migration – eine nur per Migration aufgesetzte DB (z. B. lokal) hat sie nicht. Admin-Zugang zurücksetzen / Berechtigungen nachziehen bis dahin: `./scripts/init.sh` (ersetzt die früheren Skripte `seed-storage-permissions.js` und `test-reset-password.js`)
- [ ] **Backend-Fehler-Handler** (`server.js`): antwortet bei jedem Fehler mit 500 – z. B. kaputtes JSON im Request sollte 400 sein (niedrig)
- [x] **`scripts/backup.sh`:** nächtliche Backups waren leer (Cron startete ohne Repo-Ordner, kein `pipefail`) – jetzt `cd` ins Repo, `pipefail`, Prüfung auf Größe + Endmarke, Aufräumen nur nach Erfolg; Backup-Monitor im MDS prüft inhaltlich und meldet Fehler rot
- [ ] **Backup-Konzept außerhalb des Pi** (DB, Backups und Uploads liegen auf derselben SSD) – Ziel-Netzlaufwerk klären (SMB-Fileserver/NAS, vom Pi erreichbar? selbst gesichert?). Stand Pi 08.10.2026: OS auf SD-Karte (58 GB, 20 GB belegt), Daten auf SSD `/srv` (112 GB, 1 % belegt), Uploads 67 MB, DB-Backup ~0,7 MB/Tag
  - [ ] **Ebene 1 – Datenbank:** täglichen `pg_dump` zusätzlich aufs Netzlaufwerk, dort längere Aufbewahrung (z. B. 30 Tage + monatlich)
  - [ ] **Ebene 2 – Dateien:** `/srv/mds/uploads` + `.env` vom Pi (Secrets, nicht im Repo) täglich per `rsync` mit Versionsständen
  - [ ] **Ebene 3 – Pi-System:** Image der SD-Karte monatlich und vor größeren Änderungen (Datei aufs Netzlaufwerk oder bootfähiger Klon auf Ersatz-SD/USB)
  - [ ] **Ebene 3b – Terminals:** Images des **Zeiterfassungs-Terminals** (Raspberry Pi 4, Repo `mds-time-terminal`) und künftiger Shopfloor-Terminals – nach Einrichtung und nach Änderungen. Aufbau in drei Schichten: **gemeinsame Basis** (Raspberry Pi OS, Kiosk/X11 + Chromium, Touch/Display, Zeitzone, Updates, SSH) → **ein Image je Terminal-Typ** (Rolle, z. B. Zeit-Terminal mit Python-Dienst + NFC, Kiosk-Terminal mit MDS-URL – Typen ergeben sich aus der Architektur-Entscheidung in Phase 10) → **Konfig-Datei je Gerät** (Hostname, Terminal-ID/API-Key bzw. `.env`, Maschine/Schrank). Offene Stempel in der SQLite-Queue werden alle 30 s synchronisiert, sind also kein Dauerbestand. Ziel: defektes Terminal schnell ersetzen (Image des Typs + Konfig-Datei)
  - [ ] Zugangsdaten nur in geschützter Datei auf dem Pi (z. B. `/root/.smbcredentials`, `chmod 600`)
  - [ ] Backup-Monitor im MDS erweitern: Netzlaufwerk-Kopie vorhanden und aktuell?
  - [ ] Wiederherstellungs-Anleitung in DEPLOYMENT.md (frischer Pi → OS, Docker, Repo, `.env`, DB, Uploads) und einmal testen
  - [ ] Zwischenlösung bis dahin erwägen: Backups zusätzlich auf die SD-Karte kopieren (anderes physisches Medium als die SSD)
- [ ] **`scripts/restore.sh`:** nutzt `docker compose` ohne `cd` ins Repo – nur aus `~/mds` heraus aufrufen bzw. wie `backup.sh` absichern
- [ ] **Hinweis „Neue Version verfügbar“** im Frontend (Version aus `/api/health` mit eigener vergleichen) – offene Tabs/Web-App zeigen sonst bis zum Reload die alte Version

---

## ✅ Abgeschlossene Phasen (Zusammenfassung)

### Phase 1-3: Basis-System ✅
Fundament mit PostgreSQL, JWT-Auth, React-Frontend. Bauteile, Operationen, NC-Programme mit Versionierung, Maschinen-Stammdaten, Workflow-System, Setup Sheets, Tool Lists, Prüfpläne.

### Phase 4-6: Asset Management ✅
Werkzeugverwaltung (Stammdaten, Lager, Bestellungen), Messmittelverwaltung (Kalibrierung, Checkout), Spannmittel & Vorrichtungen mit Lager-Integration.

### Phase 7: Erweiterungen ✅
Sidebar-Layout, User-Verwaltung mit Rollen/Berechtigungen, Wartungssystem mit Plänen, Checklisten, Foto-Upload.

### Phase 8 (Teil): Kunden, Wiki, PWA, Stammdaten-Optimierung ✅
Kundenverwaltung, MachineDetailPage, Wiki, Wartung-Standalone-Tasks, PWA; April 2026 einheitliches Listen-/Detail-Pattern für alle Stammdaten, File-Upload-Standard, Custom-Fields (Details im Archiv).

---

## 🔄 Phase 8: Verbrauchsmaterial

**Status:** 🔄 Umgesetzt, noch nicht im Einsatz

Erledigt: DB (Kategorien, Bestand mit Chargen/MHD, Buchungen, Dokumente, Alert-Views, Bestellsystem-Anbindung), Backend-API (CRUD, Buchungen, Dokumente, Low-Stock/MHD-Alerts), Frontend (Übersicht, Detail mit Bestand/Dokumente, Formular, Sidebar).

Offen:
- [ ] Lokal testen (Migration, API, Frontend) und in Betrieb nehmen
- [ ] Integration Wartungssystem: Verbrauch bei Wartung buchen (UI)
- [ ] Dashboard-Alarme (Mindestbestand, MHD) einbinden

---

### ⚠️ Offene Entscheidung: Lager-Architektur

**Vor Rohmaterial/Normteile (siehe Ideen) zu treffen.** Aktuell hat jede Lagerkategorie eigene Tabellen, Controller, Store und Seiten (`tool_master`/`storage_items`, `consumables`/`consumable_stock`); das Bestellsystem braucht pro Kategorie eine eigene FK-Spalte. Eine weitere Kategorie kostet so ~20–30h.

| Option | Inhalt |
|---|---|
| **A** | Separate Tabellen beibehalten – ok für 3–4 Kategorien |
| **B** | Generisches `inventory_items` + typ-spezifische Detail-Tabellen, ein Bestand, eine Buchungstabelle (~20–24h einmalig, danach ~2–4h pro Kategorie) |
| **C** | Zwei-Systeme-Architektur: Mengen-Inventory (Werkzeuge, Verbrauchsmaterial, Rohmaterial, Normteile) getrennt von Einzelstück-Assets (Messmittel, Spannmittel, Vorrichtungen) – [docs/konzepte/INVENTORY_SYSTEM_KONZEPT.md](docs/konzepte/INVENTORY_SYSTEM_KONZEPT.md) |

- [ ] Entscheidung treffen und hier dokumentieren
- [ ] Bei B/C: Schema in Test-Branch erproben, Migrationsstrategie für bestehende Daten planen (3-PR-Ansatz)

---

## 📋 Phase 9: Erweiterungen

### 🔄 Urlaubsplanung
**Status:** ✅ Im Einsatz (Kalender, Antrags-Workflow, Feiertage aller Bundesländer, Ansprüche, PDF-Exports – Details im Archiv)

- [ ] Integration Wartungssystem: User mit aktivem Urlaub/Krank automatisch ausblenden

---

### 📋 Beladeroboter: Zerobot-Setups speichern
**Status:** 🔄 Zerobot-Positionsrechner vorhanden (Standalone-Tool, Werte werden nicht gespeichert)

- [ ] Errechnete und eingestellte Werte pro Arbeitsgang speichern (Greifer, Rack, Positionen, Programm)
- [ ] Zerobot-Rechner aus dem Arbeitsgang öffnen, gespeichertes Setup laden
- [ ] Setup-Fotos, Verknüpfung zum Rüstblatt
- [ ] Greifer/Rack-Stammdaten (falls nötig)

---

### 📋 Bauteil-Revisionsverwaltung
- [ ] Revisionen pro Bauteil (Änderungsbeschreibung, gültig ab, aktive Revision)
- [ ] NC-Programme, Rüstblätter und Werkzeuglisten je Revision
- [ ] Revision freigeben/sperren, Historie

---

### 📋 Admin-Konfigurationsbereich
Ideensammlung: [docs/konzepte/SETTINGS-WISHLIST.md](docs/konzepte/SETTINGS-WISHLIST.md)
- [ ] `system_settings` (key/value/category) + Admin-API mit Cache
- [ ] Admin → Einstellungen: Firmenname/Logo, Standardwerte, Intervalle, Schwellwerte

---

### 📋 Benachrichtigungs-System
Tabelle `notifications` existiert seit der ersten Migration, wird aber nicht genutzt.
- [ ] Auto-Generierung bei Events (Wartung überfällig, Kalibrierung fällig, Bestand niedrig)
- [ ] Glocke im Header, Dropdown, Benachrichtigungs-Center, gelesen/alle gelesen
- [ ] Einstellungen pro User

---

### 📋 Werkzeug-Icons
`tool_categories.icon` existiert, eigene Icons fehlen.
- [ ] SVG-Icon-Set für Werkzeugtypen (Fräser, Bohrer, Wendeschneidplatten …)
- [ ] Icons in Werkzeugstamm, Werkzeuglisten, Auswahl bei Erstellung

---

### 📋 HTTPS
Browser zeigen „nicht sicher“; PWA (Service Worker) und Kamera-Zugriff (QR-Scan) brauchen HTTPS.
- [ ] Caddy mit `tls internal` (eigene CA) oder mkcert, HTTP → HTTPS
- [ ] Root-Zertifikat auf Clients/Tablets verteilen, Anleitung in DEPLOYMENT.md

---

## 📱 Phase 10: Shopfloor-Terminals

> **Fokus: Usability** - Die Terminals sollen den Bedienern helfen, nicht zusätzlich belasten.
> Große Touch-Buttons, wenig Text, schnelle Workflows, minimale Eingaben.
>
> **Vor der Auftragsverwaltung (Phase 11):** Wo unten „Auftrag scannen“ / `production_order_id` steht, arbeiten die Terminals zunächst mit **Bauteil + Arbeitsgang** (`operation_id`). Die Auftrags-Verknüpfung kommt mit Phase 11 nach.

### ⚠️ Offene Entscheidung: Architektur je Terminal-Typ

Nicht pauschal „Kiosk-Browser“ – je Terminal-Typ entscheiden (spätestens beim Start des jeweiligen Terminals):

| Option | Beschreibung | Passt z. B. für |
|---|---|---|
| **Kiosk-Browser** | MDS-Seite im Vollbild, keine eigene Software auf dem Gerät; Scanner als Tastatur | Werkzeug-, Messraum-Terminal |
| **Lokaler Dienst + Web-Oberfläche** | wie das Zeiterfassungs-Terminal (Python/FastAPI-Dienst + HTML im Kiosk): Hardware, Offline-Queue, Sync | Geräte mit eigener Hardware oder Offline-Bedarf |
| **Eigene App** | z. B. Electron oder nativ, auf einem lokalen Dienst aufbauend | wenn die Oberfläche mehr braucht als ein Browser kann |

**Maschinen-Terminal** (das umfangreichste) braucht voraussichtlich mindestens einen **lokalen Dienst**:
- NC-Programme an die Steuerung übertragen (SMB/FTP/SFTP, USB-Fallback) – geht nicht direkt aus dem Browser
- Offline weiterarbeiten (Rüst-/Stückzeiten, Unterbrechungen), Timer überstehen Neustarts
- Maschinendaten später direkt abgreifen (MTConnect/OPC UA), weitere Hardware am Gerät

Oberfläche (Web im Kiosk oder eigene App) wird beim Start des Maschinen-Terminals entschieden.

### ✅ Zeiterfassungs-Terminal ⏱️
**Status:** ✅ Seit Monaten im Einsatz (Raspberry Pi 4, NFC, Offline-Queue, eigenes Repo `mds-time-terminal` – Details im Archiv)

- [ ] PI-SETUP.md im Terminal-Repo prüfen

---

### 📋 Shopfloor Basis-System
**Status:** 📋 Geplant
**Ziel:** Grundlagen für alle Terminals

**Login-System:**
- [ ] DB: `users.pin` Feld (4-6 Ziffern, gehashed)
- [ ] Backend: `/api/auth/pin-login` Endpoint
- [ ] Frontend: User-Grid mit Fotos + PIN-Pad
- [ ] Auto-Logout Timer (konfigurierbar pro Terminal)
- [ ] Session-Handling für Terminals

**Terminal-Framework:**
- [ ] Basis-Layout für Touch-Bedienung (große Buttons 64px+)
- [ ] Kiosk-Modus Konfiguration
- [ ] QR-Code Scanner Komponente (Kamera)
- [ ] Shopfloor-spezifische Komponenten (NumPad, ActionButtons)
- [ ] Responsive für verschiedene Displaygrößen

**QR-Code System:**
- [ ] QR-Format Definition (MDS:TOOL:xxx, MDS:ORDER:xxx:xx, etc.)
- [ ] QR-Code Generator für Werkzeugfächer
- [ ] QR-Code Generator für Aufträge/OPs
- [ ] Scanner-Integration (Kamera + externe Scanner)

**Deliverable:** Login + QR-Scan funktioniert, Basis-UI steht

---

### 📋 Werkzeug-Terminal 🔧
**Status:** 📋 Geplant
**Ziel:** Komplettes Werkzeug-Terminal an Werkzeugschränken

**Hauptfunktionen:**
- [ ] "Meine Werkzeuge" - Liste entnommener WZ mit Dauer
- [ ] QR-Code Scan → Werkzeug direkt anzeigen
- [ ] Auftrag scannen → Tool List der OP anzeigen
- [ ] Werkzeug suchen (Fallback ohne QR)
- [ ] Entnehmen (einzeln oder mehrere aus Tool List)
- [ ] Zurückgeben (einzeln oder "Alle zurückgeben")
- [ ] Verschrotten mit Grund (Gebrochen/Verschleiß/Sonstig)

**Lagerverwaltung:**
- [ ] Zur Bestellung hinzufügen (mit Mengenauswahl)
- [ ] Lieferungen einbuchen (Bestellung auswählen, Positionen abhaken)
- [ ] Teillieferungen unterstützen

**Problem melden:**
- [ ] Defekt melden
- [ ] Bestand stimmt nicht
- [ ] Nachschleifen erforderlich

**DB-Erweiterung:**
- [ ] `tool_checkouts.production_order_id` (Verknüpfung WZ ↔ Auftrag)
- [ ] `tool_checkouts.operation_id`
- [ ] `tool_scrap_log` Tabelle (Verschrottungen mit Grund)

**Deliverable:** Vollständiges Werkzeug-Terminal

---

### 📋 Messraum-Terminal 📏
**Status:** 📋 Geplant
**Ziel:** Messmittel-Ausgabe im Messraum

**Hauptfunktionen:**
- [ ] "Meine Messmittel" - Liste entnommener MM mit Dauer
- [ ] QR-Code Scan → Messmittel direkt anzeigen
- [ ] Auftrag scannen → Prüfplan + benötigte Messmittel anzeigen
- [ ] Messmittel suchen (Fallback ohne QR)
- [ ] Entnehmen (einzeln oder mehrere aus Prüfplan)
- [ ] Zurückgeben (einzeln oder "Alle zurückgeben")

**Kalibrierung:**
- [ ] Übersicht "Bald fällig" (nächste 7 Tage)
- [ ] Kalibrierung anfordern (Planmäßig / Verdacht auf Fehler)
- [ ] Problem melden (Beschädigt, Messabweichung)

**Deliverable:** Vollständiges Messraum-Terminal

---

### 📋 Maschinen-Terminal 🏭
**Status:** 📋 Geplant
**Ziel:** Produktions-Terminal an jeder Maschine

**Gestaltungsidee: angelehnt an die Heidenhain-Bedienung (TNC 640, Touch + Tasten)** – vertraut für die Bediener, kaum Einarbeitung:
- Statuszeile oben (Betriebsart, Maschine, Netz/Sync, Uhrzeit), feste Statusanzeige (Arbeitsgang, Programm, Rüst-/Produktionszeit, Stück)
- Betriebsarten statt Menüs: Rüsten, Produktion, Messen, Programme, Wartung
- Kontextabhängige Softkey-Leiste unten (8 Softkeys, je Betriebsart wechselnd), bedienbar per Touch **und** Tasten (F1–F8, auch mit Handschuhen)
- Industrielle, kontrastreiche Farbwelt, gut lesbar aus Bedienabstand; NC-Viewer im Terminal einbindbar
- „Angelehnt“, nicht kopiert: eigenes Design, keine Heidenhain-Logos/-Namen; später ggf. Erscheinungsbild je Steuerung (Siemens, Mazatrol) auf gemeinsamem Grundgerüst
- Erstes klickbares Mockup (08.10.2026): Arbeitsgang scannen → Rüsten (Werkzeugliste, Checkliste) → Produktion (Stück fertig, Zeiten) → Unterbrechung mit Grund, Messen, Programme, Wartung

**NC-Programm Transfer (Kernfunktion):**
- [ ] Programm laden: DB → Maschine (einzeln oder alle zur OP)
- [ ] Programm senden: Maschine → DB als neue Version
- [ ] Änderungserkennung (welche Programme wurden modifiziert)
- [ ] Versionsauswahl bei Rücksendung (Patch/Minor/Major)
- [ ] Änderungsnotiz erfassen (was wurde optimiert)
- [ ] Transfer-Log (wer, wann, was, wohin)
- [ ] Netzwerk-Protokolle: SMB, FTP, SFTP
- [ ] Fallback: USB-Download für Offline-Maschinen
- [ ] DB: `program_transfers` Tabelle
- [ ] DB: `machines.network_protocol`, `network_user`, `network_password`

**Auftragsverwaltung:**
- [ ] Auftrag scannen / aus Liste wählen
- [ ] Aktueller Auftrag prominent anzeigen
- [ ] Rüsten starten (Timer läuft)
- [ ] Rüsten beenden → Produktion starten
- [ ] Produktion direkt starten (bereits gerüstet)

**Unterbrechungen:**
- [ ] Pause mit Grund (Pause, WZ-Wechsel, Messen, Material, Störung, Warten, Sonstig)
- [ ] Unterbrechungs-Timer
- [ ] Fortsetzen
- [ ] Auftrag vorzeitig beenden

**Stück-Tracking:**
- [ ] "Stück fertig" Button
- [ ] Automatische Laufzeit pro Stück
- [ ] Soll/Ist Vergleich anzeigen
- [ ] Statistik (Ø, Schnellstes, Langsamstes)
- [ ] Optional: Mit Messung kombinieren

**In-Prozess Messung:**
- [ ] Prüfplan der aktuellen OP laden
- [ ] NumPad für Messwert-Eingabe
- [ ] Sofortige i.O./n.i.O. Anzeige
- [ ] Messwerte mit Stück verknüpfen

**Dokumentation:**
- [ ] Setup Sheet anzeigen
- [ ] Werkzeugliste anzeigen
- [ ] Wiki durchsuchen (Fehlerbehebung)

**Wartung:**
- [ ] Fällige Wartungen für diese Maschine
- [ ] Wartung starten / durchführen / abschließen
- [ ] Neue Aufgabe erstellen (Ad-hoc)
- [ ] Störung melden

**Auto-Logout:**
- [ ] Konfigurierbar (Aus / 3 Min / 5 Min / 10 Min)
- [ ] Bei laufender Produktion automatisch deaktiviert
- [ ] Warnung vor Logout (30 Sek)

**DB-Erweiterungen:**
- [ ] `production_order_times` (Rüst-/Produktionszeiten pro Session)
- [ ] `production_interruptions` (Unterbrechungen mit Grund)
- [ ] `production_piece_times` (Laufzeit pro Stück, optional SPC)

**Deliverable:** Vollständiges Maschinen-Terminal mit Zeiterfassung

---

## 🏭 Phase 11: Auftragsverwaltung

### 📋 Auftrags-Grundsystem
**Status:** 📋 Geplant
**Ziel:** Fertigungsaufträge anlegen und verwalten

- [ ] DB: `production_orders` Tabelle (Auftragsnummer, Kunde, Bauteil, Menge, Termin)
- [ ] DB: `production_order_status` Tabelle (geplant, freigegeben, in Arbeit, fertig)
- [ ] DB: `production_order_operations` Tabelle (Arbeitsgang-Fortschritt)
- [ ] Backend: Production Orders CRUD API
- [ ] Backend: Status-Workflow (Statusübergänge)
- [ ] Backend: Termin-Berechnung
- [ ] Frontend: Auftrags-Übersicht (Liste, Filter, Suche)
- [ ] Frontend: Auftrags-Formular (Kunde, Bauteil, Menge, Termin)
- [ ] Frontend: Auftrags-Detail-Seite
- [ ] Frontend: Status-Badge und Fortschrittsanzeige

**Deliverable:** Basis-Auftragsverwaltung mit Status-Workflow

---

### 📋 Auftrags-Verfolgung
**Status:** 📋 Geplant
**Ziel:** Fertigungsfortschritt verfolgen

- [ ] DB: `production_order_logs` Tabelle (Zeitstempel, Aktion, User)
- [ ] DB: `production_order_times` Tabelle (Ist-Zeiten pro Arbeitsgang)
- [ ] Backend: Fortschritts-Tracking API
- [ ] Backend: Ist-Zeit Erfassung
- [ ] Backend: Soll/Ist Vergleich
- [ ] Frontend: Fortschritts-Timeline
- [ ] Frontend: Arbeitsgang-Abhaken (Start/Stop/Fertig)
- [ ] Frontend: Zeit-Erfassung pro Arbeitsgang
- [ ] Frontend: Soll/Ist Vergleich Anzeige
- [ ] Frontend: Auftrags-Historie

**Deliverable:** Echtzeit-Fortschrittsverfolgung mit Zeiterfassung

---

### 📋 Auftrags-Planung
**Status:** 📋 Geplant
**Ziel:** Kapazitätsplanung und Terminierung

- [ ] DB: `machine_capacity` Tabelle (Verfügbarkeit pro Maschine)
- [ ] Backend: Kapazitäts-Berechnung
- [ ] Backend: Terminierungs-Algorithmus
- [ ] Backend: Engpass-Erkennung
- [ ] Frontend: Planungs-Übersicht (Gantt-artig)
- [ ] Frontend: Maschinen-Auslastung
- [ ] Frontend: Termin-Konflikte anzeigen
- [ ] Frontend: Drag & Drop Umplanung (optional)
- [ ] Integration: Urlaub/Abwesenheiten berücksichtigen

**Deliverable:** Kapazitätsplanung mit Terminübersicht

---

### 📋 Auftrags-Dashboard & Reporting
**Status:** 📋 Geplant
**Ziel:** Übersichten und Auswertungen

- [ ] Backend: Dashboard-Statistiken API
- [ ] Backend: Report-Generierung (PDF/Excel)
- [ ] Frontend: Auftrags-Dashboard
- [ ] Frontend: KPIs (Durchlaufzeit, Termintreue, Auslastung)
- [ ] Frontend: Auftrags-Kalender
- [ ] Frontend: Überfällige Aufträge Warnung
- [ ] Frontend: Export-Funktionen
- [ ] Integration: Dashboard-Widget auf Startseite

**Deliverable:** Management-Dashboard mit KPIs und Reports

---

## 🔗 TopSolid-Integration & NC-Programme (CAM ↔ MDS)

**Status:** 🔄 Exporter und Werkzeuge fertig, MDS-Seite offen
**Konzepte:** [TOPSOLID_TOOL_IMPORT_KONZEPT.md](docs/konzepte/TOPSOLID_TOOL_IMPORT_KONZEPT.md) (Werkzeugimport, ausgearbeitet) · [TOPSOLID_INTEGRATION_IDEEN.md](docs/konzepte/TOPSOLID_INTEGRATION_IDEEN.md) (Ideensammlung)
**Code:** `tools/` (Quellcode; exe, DLLs und Daten nicht im Repo) · **Lokale Daten:** `_lokal/topsolid/` (Werkzeugstamm-Export, Testdaten – per `.gitignore` ausgeschlossen)
**Reihenfolge:** Werkzeuge → Bauteile → NC-Programme

### ✅ Fertig (außerhalb des MDS, Oktober 2026)
- [x] **NC-Viewer / 3D-G-Code-Viewer** (`tools/nc-viewer`): Heidenhain-Programm + Aufspannung (STEP) in 3D, offline, eine HTML-Datei. Interpreter `hh.js` UI-unabhängig (auch im Backend nutzbar)
- [x] NC-Viewer: Rechtsklick „Öffnen mit NC-Viewer“ (Windows, `launcher/`), `PLANE AXIAL` (Horizontal-BAZ), Clipping-Fix (#87)
- [ ] NC-Viewer am Arbeitsplatz: Rechtsklick-Eintrag einrichten, `PLANE AXIAL` mit echtem G350-Programm prüfen
- [x] **TS_SN_Generator** (`tools/ts-sn-generator`): Seriennummer-Gravur durchschalten, G-Code je Nummer
- [x] **TS_ToolExport** (`tools/ts-tool-export`): Werkzeuge eines CAM-Dokuments (118 Parameter, STEP, glb)
- [x] **TS_LibExport** (`tools/ts-lib-export`): Bibliotheken → `components.json` / `tools.json` (925 Komponenten, 761 Werkzeuge, 0 Fehler, 74 s)
- [x] Mapping ISO 13399 → MDS, Ausspannlänge (`LPR` / `LPR_MIN` / `LPR_MAX`) geklärt
- [ ] Datenbereinigung in TopSolid (18 doppelte T-Nummern, 69 doppelte Bestellnummern, Hersteller-Schreibweisen)

### 📋 Phase 1 – Werkzeug-Stammdaten + T-Nummern (nächster Schritt)
- [ ] Migration (Konzept Abschn. 4) – **Nummer `1737000111000`** (`…110000` ist durch `last_seen_version` belegt)
- [ ] Backend: Parser/Validator `mds-tool-import/1`, Abgleich über PDM-ID, `preview` → `commit`, `tool_imports`-Protokoll
- [ ] `.http`-Tests mit dem echten Export aus `_lokal/topsolid/werkzeugstamm/`
- [ ] Frontend: „Aus TopSolid importieren“ in der T-Nummern-Liste, Vorschau mit Status (gleich/neu/geändert/fehlt/Konflikt)
- [ ] Frontend: Aufnahme + Ausspannlänge in der T-Nummern-Ansicht
- [ ] Zwei Listen: „TopSolid Werkzeuge“ und „Sonderwerkzeuge“

### 📋 Phase 2 – 3D-Modelle
- [ ] STEP/glb je T-Nummer (`tool_number_item_documents`), `/view` + `/download`, 3D-Vorschau

### 📋 Phase 3 – NC-Programme
- [ ] `TOOL CALL` per `hh.js` parsen → `tool_list_items`, Abgleich mit T-Nummern-Liste der Maschine
- [ ] Ausspannlänge je Programm (`ShankDistance`), Abweichung im Rüstblatt markieren, außerhalb MIN/MAX = Fehler
- [ ] „Alle Werkzeuge im Lager?“ vor Freigabe
- [ ] NC-Viewer lädt Programm, STEP und Werkzeugdaten aus dem MDS

### 📋 Ohne TopSolid (Grundfunktion für alle NC-Programme)
Der Interpreter `hh.js` arbeitet auf dem G-Code selbst – diese Funktionen gehen auch ohne TopSolid-Export:
- [ ] Werkzeug-Extraktion beim Programm-Upload (`TOOL CALL` → T-Nummern, Beschreibung) → Werkzeugliste vorbefüllen
- [ ] Nullpunkt-Extraktion (Preset/`CYCL DEF 247`, G54 …) → Rüstblatt vorbefüllen
- [ ] Laufzeit-Abschätzung und Plausibilitätsprüfung beim Upload
- [ ] Weitere Steuerungen: Siemens (Drehen), ggf. Mazatrol

### 💡 Ideen (nicht ausgearbeitet, siehe Ideensammlung)
- [ ] Bestandsaufnahme Kundenprojekte → Bauteile ins MDS (nur lesend)
- [ ] CAM-Ausgabeordner überwachen (File Watcher) → Programme automatisch zum Import anbieten
- [ ] „In TopSolid anlegen“ aus dem MDS (Projekt aus Vorlage, STEP-Import, PDM-ID zurück)
- [ ] Projekt-Umzug: ein TopSolid-Projekt je Bauteil statt je Kunde (Paket-Kopie, Pilot zuerst)

**Leitplanken:** Lesen ist harmlos, Schreiben in TopSolid immer zuerst im Testprojekt. TopSolid-DLLs, Automation-Doku, Kundendaten und Werkzeugstamm nie ins öffentliche Repo.

---

## 💡 Phase 12+: Ideen / Optionale Features

### Lager-Erweiterungen (erst nach der Lager-Architektur-Entscheidung)
- [ ] **Rohmaterial:** Material, Güte, Form, Abmessungen; Bestand mit Chargen-Verfolgung; Wareneingang/Entnahme; Bauteil → Rohmaterial-Zuordnung; Lieferanten
- [ ] **Normteile / Zukaufteile:** DIN/ISO-Katalog, Kategorien (Schrauben, Muttern, Stifte, O-Ringe …), Bestand + Mindestbestand, Lieferanten; optional Stücklisten

### Texte gestalten (Rich-Text-Editor)
Heute sind alle Textfelder reiner Text (58 `textarea`, Anzeige nur mit Zeilenumbrüchen). Idee: kleine Werkzeugleiste wie in Foren – fett/kursiv/unterstrichen, Überschriften, Listen, Farben, Tabellen.
- [ ] Gemeinsamer Editor-Baustein in `components/common/` (z. B. TipTap; Alternative: Markdown mit Werkzeugleiste) – bewusst kleiner Funktionsumfang, feste Farbpalette (z. B. Rot für Warnungen) statt freier Farbwahl, später Bilder
- [ ] Gespeichertes HTML beim Anzeigen bereinigen (z. B. DOMPurify) – Schutz vor eingeschleustem Code
- [ ] Gezielt einsetzen, nicht in allen Feldern: Wiki, Arbeitsanweisungen, Hinweise in Rüstblättern
- [ ] Prüfen, wo die Texte zusätzlich erscheinen (PDF-Ausgaben, Terminals) und dort mit darstellen; bestehende Texte werden übernommen
- Aufwand grob: Baustein ~1 Tag, danach je Modul

### Shopfloor-UI Erweiterungen
- [ ] Weitere Terminal-Typen (Lager, Versand, QS)
- [ ] Offline-Modus (Service Worker)
- [ ] Externe Barcode-Scanner Integration
- [ ] Schichtübergabe-Funktion

### Reports & Analytics
- [ ] Dashboard für Meister
- [ ] Statistiken (Teile, Programme, Werkzeuge, Messmittel)
- [ ] Kalibrierungs-Report (ISO/Luftfahrt)
- [ ] Werkzeug-Bestandsreport
- [ ] Audit-Trail Export (PDF/Excel)

### Dokumentation & Qualität
- [ ] Schulungs-Material für Mitarbeiter
- [ ] ISO-Checkliste finalisieren

### Erweiterte Features
- [ ] Machine Monitoring (MTConnect/OPC UA)
- [ ] DNC-Integration
- [ ] Mobile App (React Native)
- [ ] ERP-Integration

---

## 🔧 Technical Debt / Refactoring-Kandidaten

- Lager-Architektur: siehe „Offene Entscheidung“ unter Phase 8
- [ ] **Workforce-Konsolidierung:** Urlaubs- und Zeitverwaltung zu einem System zusammenführen – [docs/konzepte/WORKFORCE-CONSOLIDATION-CONCEPT.md](docs/konzepte/WORKFORCE-CONSOLIDATION-CONCEPT.md) (~20–30h). Dabei berücksichtigen: Zeitmodell ohne Historie (kein „gültig ab“), Teilzeit mit wechselndem freien Tag (aktuell Workaround)
- [ ] **Operations-Zeiteinheiten:** `cycle_time_seconds` (Sekunden in DB, Minuten im Frontend) → `cycle_time_minutes` wie `setup_time_minutes` (~2h, niedrig)
- [ ] **Programmnummern-Format:** aktuell auto „OP10-001“ – anderes Format / manuell editierbar? (~1h, niedrig)

---

## 🔧 Nächste Session

Stand: [Session 07./08.10.2026](docs/sessions/SESSION-2026-10-07-aufraeumen-fixes.md) – v2.7.1 läuft auf dem Pi

0. **Backup-Kontrolle:** erste Nachtläufe nach 2.7.1 (`tail -4 /srv/mds/backups/backup.log`, Backup-Status im MDS grün)
1. **Urlaub über den Jahreswechsel** (Fix-Liste) – vor dem nächsten Jahreswechsel lösen
2. **Weitere Fixes** (siehe „Offene Fixes“) – je Fix: Diagnose → Lösung abstimmen → eigener Branch/PR; Kandidaten: eigene Urlaubsanträge bearbeiten, deaktivierte Maschinen in Auswahllisten
3. **TopSolid-Werkzeugimport, Phase 1:** Konzept-Ist-Stand gegen Code prüfen → Spec + Plan → Migration → preview/commit-API → `.http`-Tests mit echtem Export → Frontend
4. **Backup-Konzept** umsetzen, sobald das Ziel-Netzlaufwerk geklärt ist
5. **Verbrauchsmaterial** lokal testen und in Betrieb nehmen, Wartungs-Integration
6. **Lager-Architektur** entscheiden (vor Rohmaterial/Normteile)
7. Kleinkram: PI-SETUP.md im Terminal-Repo prüfen, NC-Viewer-Rechtsklick am Arbeitsplatz, auf dem Pi alten Stash (01.12.2025) sichern + entfernen und `~/mds-dist-2.6.0` löschen

---

**Letzte Aktualisierung:** 2026-10-08
