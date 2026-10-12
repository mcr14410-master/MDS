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
- [x] **Urlaub über den Jahreswechsel:** Tage werden je Kalenderjahr aufgeteilt (`vacations.days_by_year`), Saldo, Übertrag, Listen und PDFs rechnen mit dem Jahresanteil (Branch `fix/urlaub-jahreswechsel`)
- [x] **Eigene Urlaubsanträge bearbeiten/zurückziehen,** solange nicht genehmigt – `PUT /vacations/:id/own`, `POST /vacations/:id/withdraw` (Status `cancelled`), Buttons in „Meine Anträge“ (Branch `fix/eigene-urlaubsantraege`); genehmigte Urlaube ändert weiterhin nur die Verwaltung
- [x] **Deaktivierte Maschinen in Auswahllisten:** Bearbeiten-Formulare (Arbeitsgang, Rüstblatt/Einrichteblatt, Spannmittel, Vorrichtung, Wiki, Wartungsplan) bieten nur aktive Maschinen plus die bereits zugeordnete an (markiert „(inaktiv)“, vorher verschwand sie aus der Anzeige bzw. Rüstblatt/Wartungsplan zeigten alle); Listenfilter zeigen weiter alle, inaktive markiert (`utils/machineOptions.js`, Branch `fix/deaktivierte-maschinen-auswahl`). In der Oberfläche gibt es nur Deaktivieren – alte Testmaschinen auf dem Pi deaktivieren statt löschen
- [ ] **Wartungspläne kopieren:** Plan (inkl. Checkliste, Intervalle, Skill-Level) auf eine andere Maschine übernehmen – viele Maschinen haben gleiche Pläne; aktuell keine Kopierfunktion
- [x] **Standardrollen umbenennen/löschen:** Sperre galt fest für alle sechs Standardrollen (Frontend + Backend), jetzt nur noch für `admin` (Code prüft den Namen). Voraussetzung: Programm-Workflow prüft `program.release` statt der Rolle `programmer` (Backend + Buttons, vorher Buttons per `part.update`) (Branch `fix/rollen-workflow-rechte`)
- [ ] **Rollen:** selbst erstellte Rollen haben keine Farbe (Farben fest nach Rollenname im Frontend, sonst grau) → Farbe je Rolle wählbar und speichern; Rollen deaktivieren können statt nur löschen – auch umbenannte Standardrollen sind bis dahin grau
- [x] **Arbeitsgänge zeigten Daten anderer Arbeitsgänge:** `programsStore`, `setupSheetsStore` und `inspectionPlansStore` hielten je einen gemeinsamen Zustand für alle (auch zugeklappte) Arbeitsgänge – die zuletzt geladene Antwort erschien überall (Programme mit Download/Workflow, Einrichteblatt mit Löschen, Prüfplan; Sortieren schickte Merkmale des falschen Plans). Jetzt Daten je Arbeitsgang (`…ByOperation`) (Branch `fix/arbeitsgang-daten-je-arbeitsgang`)
- [x] **CORS aus `.env`:** `CORS_ORIGIN` wird gelesen (kommagetrennt, `"*"` abgelehnt, Standard `http://localhost:5173`); `CORS_ORIGIN: "*"` aus `compose.yaml` entfernt (Produktion same-origin über Caddy)
- [x] **Berechtigungen per Migration anlegen:** `tools.*`, `storage.*`, `stock.*` per Migration `1737000113000` (Produktion unverändert, dort schon über `init.sh`); `npm run dev:init` setzt das Admin-Passwort und gibt der Rolle `admin` alle Berechtigungen, `npm run seed` läuft wieder und ist wiederholbar (Branch `fix/dev-db-init`). Berechtigungen jetzt nur noch in Migrationen: `1737000114000` gibt der Rolle `admin` alle (gleicht 050/079/091 aus), `init.sh` legt keine mehr an und setzt das Admin-Passwort nur noch beim ersten Lauf bzw. mit `ADMIN_PASSWORD_RESET=1` (Branch `fix/permissions-per-migration`).
- [x] **Rollenrechte auf frischer DB:** betrifft nur Dev/Test – in Produktion werden Rollen über die Benutzerverwaltung gepflegt (eigene Rollen, Standardrollen mit Rechten), nach einem Ausfall kommen sie aus dem DB-Backup. `npm run seed` vergibt den Standardrollen jetzt Standardrechte (`config/devRoleDefaults.js`, Vorlage Produktion 10/2026, nie bei `NODE_ENV=production`); CLAUDE.md-Regel: Migrationen geben Rechte nur an `admin`. Die alten Zuweisungen an nicht existierende Rollen (`Fertigungsleiter`, `Meister` …) in älteren Migrationen bleiben als wirkungsloser Code stehen (Branch `feat/seed-rollen-standardrechte`)
- [x] **Migration `1737000094000_create-cron-job-logs`** lief über den App-Pool (`DB_*`) statt `pgm` – jetzt `pgm.sql`, gleiche Tabelle/Indizes mit `IF NOT EXISTS`, gelaufene DBs unberührt; Regel „Migrationen nur über `pgm`“ in CLAUDE.md (Branch `fix/migration-094-pgm`)
- [x] **Backend beendet sich nicht vollständig:** der SIGTERM-Handler schloss den HTTP-Server nie (nur Cron + einen der beiden DB-Pools), `docker stop` wartete bis SIGKILL. Jetzt `server.close()` → beide Pools → `exit 0`, auch bei SIGINT; Notbremse nach 8 s (Branch `fix/backend-graceful-shutdown`)
- [x] **Backend-Fehler-Handler** (`server.js`): übernimmt jetzt den Status des Fehlers (kaputtes JSON 400, zu groß 413, Upload-Dateityp 400) und gibt bei 500 keine internen Details mehr heraus
- [ ] **Upload-Meldungen auf Englisch:** Werkzeug-Dokumente (`toolDocumentsController`) und Verbrauchsmaterial (`consumablesRoutes`) melden einen falschen Dateityp auf Englisch – UI ist deutsch
- [x] **Urlaub-PDFs ohne Korrektur:** alle drei Urlaubs-PDFs lesen den Saldo aus `vacation_balances`, Korrektur angezeigt (Branch `fix/urlaub-pdf-korrektur`)
- [x] **PDF-Export bricht Backend ab:** behoben für alle 11 gestreamten PDF-Endpunkte (`utils/pdfResponse.js`, Branch `fix/urlaub-pdf-absturz`)
- [x] **Urlaubs-Verwaltung zeigt Salden des falschen Jahres:** Salden folgen dem angezeigten Jahr (Kalender-Navigation, Rückkehr aus Einstellungen), Jahreswechsel-Pfeile im Urlaub-Tab (Branch `fix/urlaub-saldo-jahr`)
- [x] **Zeitnachweis-PDFs zum Monatsende** (Wunsch Buchhaltung): Urlaubskonto mit Stichtag Monatsende statt Druckdatum, Korrektur/Auszahlung im Zeitkonto (Branch `fix/payroll-stichtag`)
- [ ] **Bundesland für Feiertage einheitlich:** Einstellung „Standard-Region“ (`default_region`) steuert nur Kalender/Feiertagsliste im Frontend. Urlaubstage-Berechnung und Feiertage-Nachholen rechnen fest mit „BY“, Zeiterfassung (`timeEntriesController`, 2 Stellen) und Kalender-Endpunkt filtern gar nicht nach Region (zählen Feiertage jedes angelegten Bundeslandes), `holiday_region` ist ungenutzt. Heute ohne Auswirkung (alles BY) – nach Umstellen des Bundeslandes in den Einstellungen aber falsche Urlaubstage/Zeitsalden. Fix: überall `default_region` verwenden, `holiday_region` entfernen
- [x] **Halbe Feiertage im Urlaub:** Heiligabend/Silvester zählen 0,5 Urlaubstage statt 0 (Branch `fix/urlaub-halbe-feiertage`, Migration für Urlaube ab 2026)
- [ ] **Zeiterfassung: Urlaub an Feiertagen uneinheitlich:** `timeEntriesController` berechnet Tage auf zwei Wegen – einer priorisiert Feiertag vor Urlaub und halbiert das Soll an halben Feiertagen, der andere priorisiert Urlaub und kennt keine halben Feiertage. Saldo heute in beiden Fällen gleich, Status/Anzeige können abweichen; vereinheitlichen
- [x] **Urlaub über den Jahreswechsel – Anzeige einheitlich:** überall „5 T (+2 in 2027)“ statt „5 von 7 T“ (Detail-Modal, Mein Bereich, PDFs zweizeilig); Antragsformular und Antragslisten zeigen die Aufteilung („7 Arbeitstage (5 in 2026, 2 in 2027)“), `check-overlap` liefert `daysByYear`
- [x] **Urlaubs-PDFs: Urlaubskonto-Box zu niedrig** – zweite Wertezeile lag in allen drei PDFs auf bzw. unter dem Rahmen (Sammel-PDF 4 pt, Einzel-PDFs 2 pt); Boxen erhöht, Sammel-PDF zeigt jetzt auch „Tage“
- [ ] **Zeitmodell-Historie (gültig ab):** Ein Mitarbeiter hat nur das *aktuelle* Zeitmodell (`users.time_model_id`); „ab“ (`time_tracking_start_date`) ist der Beginn der Zeiterfassung, kein Gültig-ab-Datum. Beim Zuweisen eines neuen Modells bleiben gespeicherte Tage (`time_daily_summary.target_minutes`) und Salden unverändert – aber jede spätere Neuberechnung eines vergangenen Tages (Buchung nachtragen/korrigieren/löschen, Tagesinfo, Auto-Schließen offener Tage) nimmt das Soll aus dem neuen Modell (außer bei manuellem Soll-Override), der Nacht-Job `generate_absence_entries` legt fehlende Tage der letzten 7 Tage mit dem neuen Modell an, und neu gespeicherte Urlaube rechnen ebenfalls mit dem neuen Modell. Ziel: Zuordnung Mitarbeiter → Zeitmodell mit „gültig ab“ (eigene Tabelle, Migration der heutigen Zuordnung), Tagesberechnung, Nacht-Job und Urlaubsberechnung nehmen das am jeweiligen Tag gültige Modell. Löst den Punkt „Urlaubsberechnung beachtet ‚ab‘-Datum“ mit. Bis dahin: Modell zum Monatswechsel zuweisen, Tage davor möglichst nicht mehr bearbeiten bzw. Soll danach prüfen/überschreiben
- [ ] **Urlaubsberechnung beachtet „ab“-Datum:** vor `time_tracking_start_date` (Feld „ab“ neben dem Zeitmodell) ohne Zeitmodell rechnen (Mo–Fr) – sonst verfälscht jede Neuberechnung Urlaube aus der Zeit vor dem Zeitmodell (Fall MA 13, Release 2.8.0). Kleiner Zwischenschritt bis zur Workforce-Konsolidierung (Zeitmodell-Verlauf)
- [ ] **Testmaschinen endgültig löschen (Pi):** Abhängigkeiten prüfen (Arbeitsgänge, Rüstblätter, Wartungspläne, Dokumente, Werkzeugnummernlisten, Spannmittel/Vorrichtungen …), Backup, dann löschen (`DELETE /api/machines/:id?hard_delete=true` geht nur ohne Arbeitsgänge)
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
- [ ] **Workforce-Konsolidierung:** Urlaubs- und Zeitverwaltung zu einem System zusammenführen – [docs/konzepte/WORKFORCE-CONSOLIDATION-CONCEPT.md](docs/konzepte/WORKFORCE-CONSOLIDATION-CONCEPT.md) (~20–30h). Dabei berücksichtigen: Zeitmodell ohne Historie (kein „gültig ab“), Teilzeit mit wechselndem freien Tag (aktuell Workaround). Release 2.8.0 hat gezeigt: Neuberechnungen nutzen das aktuelle Modell und verfälschen alte Urlaube (MA 13: 4-Tage-Woche ab 01.04.2026, freier Tag mal Montag, mal Freitag – Workaround Überstundenabbau)
- [ ] **Operations-Zeiteinheiten:** `cycle_time_seconds` (Sekunden in DB, Minuten im Frontend) → `cycle_time_minutes` wie `setup_time_minutes` (~2h, niedrig)
- [ ] **Programmnummern-Format:** aktuell auto „OP10-001“ – anderes Format / manuell editierbar? (~1h, niedrig)

---

## 🔧 Nächste Session

Stand: [Session 12./13.10.2026](docs/sessions/SESSION-2026-10-13-kleine-fixes-urlaub-backend.md) – v2.9.0 läuft auf dem Pi, vier Fixes unter `[Unreleased]`

0. **Backup-Kontrolle:** Nachtläufe nach 2.9.0 (`tail -4 /srv/mds/backups/backup.log`, Backup-Status im MDS grün)
1. **Release 2.9.1** (Jahreswechsel-Anzeige, PDF-Box, Fehler-Handler, CORS) – nach dem Deploy die offenen Test-plan-Punkte von #132–#135 prüfen
2. **„ab“-Datum in der Urlaubsberechnung** (Fix-Liste) – vorher klären, ob die Zeitmodell-Historie bald kommt (löst den Punkt mit)
3. **Testmaschinen** auf dem Pi endgültig löschen (Abhängigkeiten prüfen, Backup)
4. **Weitere Fixes** (siehe „Offene Fixes“) – Kandidaten: Bundesland für Feiertage einheitlich (größer: Urlaub, Nachholen, Zeiterfassung, Kalender – gründliche Diagnose zuerst), Zeiterfassung Urlaub an Feiertagen, Upload-Meldungen auf Englisch, Rollen deaktivieren/Farben je Rolle
5. **TopSolid-Werkzeugimport, Phase 1:** Konzept-Ist-Stand gegen Code prüfen → Spec + Plan → Migration → preview/commit-API → `.http`-Tests mit echtem Export → Frontend
6. **Backup-Konzept** umsetzen, sobald das Ziel-Netzlaufwerk geklärt ist
7. **Verbrauchsmaterial** lokal testen und in Betrieb nehmen, Wartungs-Integration
8. **Lager-Architektur** entscheiden (vor Rohmaterial/Normteile)
9. Kleinkram: PI-SETUP.md im Terminal-Repo prüfen, NC-Viewer-Rechtsklick am Arbeitsplatz, auf dem Pi alten Stash (01.12.2025) sichern + entfernen und `~/mds-dist-2.6.0` löschen

---

**Letzte Aktualisierung:** 2026-10-12
