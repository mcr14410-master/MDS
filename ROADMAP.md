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
- [x] **`deploy.sh`: DB-Backup direkt vor der Migration** (`scripts/backup.sh`) als Rückfall bei missglückter Migration
- [x] **`deploy.sh`: Frontend-Build** schreibt direkt nach `frontend/dist` (Vite leert den Ordner vorher) – bricht der Build ab, ist das Frontend weg. Besser in temporären Ordner bauen und erst bei Erfolg tauschen – jetzt `.cache/frontend-dist` + `rsync` (Bind-Mount von Caddy bleibt gültig)
- [x] **`deploy.sh`: Autostash** – `git stash pop || true` ignoriert Konflikte stillschweigend – bricht jetzt vor dem Bauen mit Hinweis ab
- [x] **`backend/.migrationrc.json`** zeigt auf `./src/migrations` (Migrationen liegen in `backend/migrations`), wird von node-pg-migrate v6 nicht gelesen → entfernt
- [x] **Lockfiles:** jetzt im Repo, Backend-Image und Frontend-Build mit `npm ci`
- [x] **ESLint:** 4 Fehler, 1 Warnung in `Sidebar.jsx` – ungenutzter State entfernt, `fetchEscalations` in die Effekt-Abhängigkeiten, `react/jsx-uses-vars` aktiv (`icon: Icon` galt als unbenutzt)
- [x] **ESLint-Regel `react/jsx-no-undef`** (`eslint-plugin-react`) aktiv
- [ ] **ESLint aufräumen:** 138 Fehler / 116 Warnungen im Frontend (Stand 21.10.2026); `react/jsx-uses-vars` ist aktiv – `varsIgnorePattern: '^[A-Z_]'` noch entfernen
- [x] **Abhängigkeiten, Stufe 1:** `npm audit fix` ohne Breaking Changes (Backend 16 → 5 Lücken, kritisch behoben; Frontend 29 → 9)
- [ ] **Abhängigkeiten, Stufe 2 (Major, einzeln prüfen):** `multer` 2.x (alle Uploads!), `exceljs`, `chokidar` (prüfen ob noch genutzt), `uuid`, `online-3d-viewer`; Tailwind 4 **nicht** (großer Umbau)
- [x] **Urlaub über den Jahreswechsel:** Tage werden je Kalenderjahr aufgeteilt (`vacations.days_by_year`), Saldo, Übertrag, Listen und PDFs rechnen mit dem Jahresanteil (Branch `fix/urlaub-jahreswechsel`)
- [x] **Eigene Urlaubsanträge bearbeiten/zurückziehen,** solange nicht genehmigt – `PUT /vacations/:id/own`, `POST /vacations/:id/withdraw` (Status `cancelled`), Buttons in „Meine Anträge“ (Branch `fix/eigene-urlaubsantraege`); genehmigte Urlaube ändert weiterhin nur die Verwaltung
- [x] **Deaktivierte Maschinen in Auswahllisten:** Bearbeiten-Formulare (Arbeitsgang, Rüstblatt/Einrichteblatt, Spannmittel, Vorrichtung, Wiki, Wartungsplan) bieten nur aktive Maschinen plus die bereits zugeordnete an (markiert „(inaktiv)“, vorher verschwand sie aus der Anzeige bzw. Rüstblatt/Wartungsplan zeigten alle); Listenfilter zeigen weiter alle, inaktive markiert (`utils/machineOptions.js`, Branch `fix/deaktivierte-maschinen-auswahl`). In der Oberfläche gibt es nur Deaktivieren – alte Testmaschinen auf dem Pi deaktivieren statt löschen
- [ ] **Bauteilseite auf Handybreite zu breit:** bei 390 px Fensterbreite ist die Seite 443 px breit (waagrechtes Scrollen), gesehen am 30.10.2026 auf `/parts/:id` – Ursache noch nicht gesucht
- [ ] **Wartungspläne kopieren:** Plan (inkl. Checkliste, Intervalle, Skill-Level) auf eine andere Maschine übernehmen – viele Maschinen haben gleiche Pläne; aktuell keine Kopierfunktion
- [x] **Standardrollen umbenennen/löschen:** Sperre galt fest für alle sechs Standardrollen (Frontend + Backend), jetzt nur noch für `admin` (Code prüft den Namen). Voraussetzung: Programm-Workflow prüft `program.release` statt der Rolle `programmer` (Backend + Buttons, vorher Buttons per `part.update`) (Branch `fix/rollen-workflow-rechte`)
- [x] **Rollen:** Farbe je Rolle wählbar und gespeichert (feste Palette, Migration `1737000118000`; Branch `feat/rollen-farben`). „Rollen deaktivieren“ **entfällt** – war als Ausweg gedacht, solange die Standardrollen weder umbenannt noch gelöscht werden konnten; das geht seit dem Fix „Standardrollen umbenennen/löschen“
- [x] **Arbeitsgänge zeigten Daten anderer Arbeitsgänge:** `programsStore`, `setupSheetsStore` und `inspectionPlansStore` hielten je einen gemeinsamen Zustand für alle (auch zugeklappte) Arbeitsgänge – die zuletzt geladene Antwort erschien überall (Programme mit Download/Workflow, Einrichteblatt mit Löschen, Prüfplan; Sortieren schickte Merkmale des falschen Plans). Jetzt Daten je Arbeitsgang (`…ByOperation`) (Branch `fix/arbeitsgang-daten-je-arbeitsgang`)
- [x] **CORS aus `.env`:** `CORS_ORIGIN` wird gelesen (kommagetrennt, `"*"` abgelehnt, Standard `http://localhost:5173`); `CORS_ORIGIN: "*"` aus `compose.yaml` entfernt (Produktion same-origin über Caddy)
- [x] **Berechtigungen per Migration anlegen:** `tools.*`, `storage.*`, `stock.*` per Migration `1737000113000` (Produktion unverändert, dort schon über `init.sh`); `npm run dev:init` setzt das Admin-Passwort und gibt der Rolle `admin` alle Berechtigungen, `npm run seed` läuft wieder und ist wiederholbar (Branch `fix/dev-db-init`). Berechtigungen jetzt nur noch in Migrationen: `1737000114000` gibt der Rolle `admin` alle (gleicht 050/079/091 aus), `init.sh` legt keine mehr an und setzt das Admin-Passwort nur noch beim ersten Lauf bzw. mit `ADMIN_PASSWORD_RESET=1` (Branch `fix/permissions-per-migration`).
- [x] **Rollenrechte auf frischer DB:** betrifft nur Dev/Test – in Produktion werden Rollen über die Benutzerverwaltung gepflegt (eigene Rollen, Standardrollen mit Rechten), nach einem Ausfall kommen sie aus dem DB-Backup. `npm run seed` vergibt den Standardrollen jetzt Standardrechte (`config/devRoleDefaults.js`, Vorlage Produktion 10/2026, nie bei `NODE_ENV=production`); CLAUDE.md-Regel: Migrationen geben Rechte nur an `admin`. Die alten Zuweisungen an nicht existierende Rollen (`Fertigungsleiter`, `Meister` …) in älteren Migrationen bleiben als wirkungsloser Code stehen (Branch `feat/seed-rollen-standardrechte`)
- [x] **Migration `1737000094000_create-cron-job-logs`** lief über den App-Pool (`DB_*`) statt `pgm` – jetzt `pgm.sql`, gleiche Tabelle/Indizes mit `IF NOT EXISTS`, gelaufene DBs unberührt; Regel „Migrationen nur über `pgm`“ in CLAUDE.md (Branch `fix/migration-094-pgm`)
- [x] **Backend beendet sich nicht vollständig:** der SIGTERM-Handler schloss den HTTP-Server nie (nur Cron + einen der beiden DB-Pools), `docker stop` wartete bis SIGKILL. Jetzt `server.close()` → beide Pools → `exit 0`, auch bei SIGINT; Notbremse nach 8 s (Branch `fix/backend-graceful-shutdown`)
- [x] **Backend-Fehler-Handler** (`server.js`): übernimmt jetzt den Status des Fehlers (kaputtes JSON 400, zu groß 413, Upload-Dateityp 400) und gibt bei 500 keine internen Details mehr heraus
- [x] **Upload-Fehlermeldungen im Frontend:** Wiki-Bilder und Einrichteblatt-Fotos zeigen die Meldung aus der Antwort; Werkzeug-Dokumente und Verbrauchsmaterial (ganzer Dokumente-Controller) auf Deutsch
- [x] **Urlaub-PDFs ohne Korrektur:** alle drei Urlaubs-PDFs lesen den Saldo aus `vacation_balances`, Korrektur angezeigt (Branch `fix/urlaub-pdf-korrektur`)
- [x] **PDF-Export bricht Backend ab:** behoben für alle 11 gestreamten PDF-Endpunkte (`utils/pdfResponse.js`, Branch `fix/urlaub-pdf-absturz`)
- [x] **Urlaubs-Verwaltung zeigt Salden des falschen Jahres:** Salden folgen dem angezeigten Jahr (Kalender-Navigation, Rückkehr aus Einstellungen), Jahreswechsel-Pfeile im Urlaub-Tab (Branch `fix/urlaub-saldo-jahr`)
- [x] **Zeitnachweis-PDFs zum Monatsende** (Wunsch Buchhaltung): Urlaubskonto mit Stichtag Monatsende statt Druckdatum, Korrektur/Auszahlung im Zeitkonto (Branch `fix/payroll-stichtag`)
- [x] **Bundesland für Feiertage einheitlich:** Region kommt überall aus `default_region` (`utils/holidayRegion.js`): Urlaubsberechnung, automatisches Erzeugen, Feiertags-API ohne Regionsangabe, Zeiterfassung (Tagesberechnung, Nacht-Job) und Kalender; `holiday_region` entfernt; Warnhinweis beim Umstellen. Produktion hatte nur BY – keine Datenkorrektur nötig
- [x] **Halbe Feiertage im Urlaub:** Heiligabend/Silvester zählen 0,5 Urlaubstage statt 0 (Branch `fix/urlaub-halbe-feiertage`, Migration für Urlaube ab 2026)
- [x] **Zeiterfassung: Urlaub an Feiertagen uneinheitlich:** Es waren drei Rechenwege (Tagesberechnung, Nacht-Job, Urlaubs-Sync); die Tagesberechnung schrieb Feiertage mit −Soll (z. B. nach Tagesinfo-Notiz oder Stempeln am Feiertag), der Urlaubs-Sync kannte keine Feiertage. Jetzt eine gemeinsame Regel (`utils/dayAbsence.js`). Produktion: alle 44 Feiertagstage 2026 korrekt (±0), keine Datenkorrektur
- [x] **Halber Feiertag (24.12./31.12.):** mit der Buchhaltung abgestimmt (15.10.2026) – halber Arbeitstag (`HALF_HOLIDAY_IS_WORKDAY = true`); Krank nach Arbeitsbeginn: bis zum Soll auffüllen bestätigt
- [x] **Feste Testsammlung Zeiterfassung/Urlaub:** `npm run test:integration` (Wegwerf-DB per Docker, 22 Fälle, ~5 s) und `npm test` (schnelle Tests); Gegenprobe: wieder eingebaute Fehler (halber Feiertag „frei“, fehlender Regionsfilter) werden erkannt. Weitere Bereiche bei Bedarf ergänzen
- [x] **Teilweise Abwesenheit (z. B. 2 h gearbeitet, dann krank):** überall „bis zum Soll auffüllen“ (Lohnausfallprinzip, § 4 EFZG) – `calculateDayAbsence` berücksichtigt die gestempelte Zeit, der Urlaubs-Sync rechnet Tage mit Stempelungen über die Tagesberechnung. Produktion: kein betroffener Tag
- [x] **Urlaub über den Jahreswechsel – Anzeige einheitlich:** überall „5 T (+2 in 2027)“ statt „5 von 7 T“ (Detail-Modal, Mein Bereich, PDFs zweizeilig); Antragsformular und Antragslisten zeigen die Aufteilung („7 Arbeitstage (5 in 2026, 2 in 2027)“), `check-overlap` liefert `daysByYear`
- [x] **Urlaubs-PDFs: Urlaubskonto-Box zu niedrig** – zweite Wertezeile lag in allen drei PDFs auf bzw. unter dem Rahmen (Sammel-PDF 4 pt, Einzel-PDFs 2 pt); Boxen erhöht, Sammel-PDF zeigt jetzt auch „Tage“
- [x] **Zeitmodell-Historie (gültig ab):** Ein Mitarbeiter hat nur das *aktuelle* Zeitmodell (`users.time_model_id`); „ab“ (`time_tracking_start_date`) ist der Beginn der Zeiterfassung, kein Gültig-ab-Datum. Beim Zuweisen eines neuen Modells bleiben gespeicherte Tage (`time_daily_summary.target_minutes`) und Salden unverändert – aber jede spätere Neuberechnung eines vergangenen Tages (Buchung nachtragen/korrigieren/löschen, Tagesinfo, Auto-Schließen offener Tage) nimmt das Soll aus dem neuen Modell (außer bei manuellem Soll-Override), der Nacht-Job `generate_absence_entries` legt fehlende Tage der letzten 7 Tage mit dem neuen Modell an, und neu gespeicherte Urlaube rechnen ebenfalls mit dem neuen Modell. Ziel: Zuordnung Mitarbeiter → Zeitmodell mit „gültig ab“ (eigene Tabelle, Migration der heutigen Zuordnung), Tagesberechnung, Nacht-Job und Urlaubsberechnung nehmen das am jeweiligen Tag gültige Modell. Löst den Punkt „Urlaubsberechnung beachtet ‚ab‘-Datum“ mit. Bis dahin: Modell zum Monatswechsel zuweisen, Tage davor möglichst nicht mehr bearbeiten bzw. Soll danach prüfen/überschreiben
  - [x] **Schritt 1 – Grundlage:** Tabelle `user_time_models`, Übernahme ab Zeiterfassungs-Start, Verlaufseintrag beim Ändern, `utils/timeModelHistory.js`
  - [x] **Schritt 2 – Rechnen:** Tagesberechnung, Nacht-Job, Urlaubs-Sync, Urlaubstage, Terminal-Tagessoll nach dem am Tag gültigen Modell; vor dem ersten Eintrag kein Modell (Urlaub Mo–Fr, kein Soll); Nacht-Jobs wählen Mitarbeiter mit Verlaufseintrag. Testsammlung 31 Fälle, Gegenprobe gegen den alten Code rot
  - [x] **Schritt 3 – Oberfläche:** Verlauf in den Mitarbeiter-Details, „Neues Zeitmodell ab …“ mit Vorschau und Neuberechnung (auch rückwirkend), Eintrag korrigieren/löschen mit Rückfrage, Deaktivieren lässt das Modell stehen, Zeitnachweis bei Wechsel im Monat mit beiden Modellen
    - [x] **3a – Backend:** Verlauf-API mit Vorschau und Neuberechnung (Tage, Urlaube, Salden; neue Arbeitstage wie Nacht-Job, frei gewordene Tage ohne Stempel entfernt; einziger Eintrag nicht löschbar), Audit-Log, Anzeigen „heute gültig“ per `LATERAL`, Zeitnachweis mit beiden Modellen, Deaktivieren lässt das Modell stehen, Zeitmodell löschen prüft den Verlauf. Testsammlung +25 Fälle, Gegenprobe rot
    - [x] **3b – Oberfläche:** Mitarbeiter-Einstellungen (Urlaub/Zeiterfassung): Verlaufsliste statt Auswahlfeld (Auswahl nur noch beim ersten Aktivieren), „Neues Zeitmodell ab …“, Korrigieren/Löschen – jeweils Vorschau, dann „Übernehmen“; Deaktivieren ohne Modell-Entfernen. Browser-Test hell/dunkel, mobil
  - [x] **Schritt 4 – Aufräumen:** `users.time_model_id` per Migration entfernt (Anzeigen kamen schon aus dem Verlauf); Erst-Zuweisung schreibt nur noch den Verlauf, Zeitmodell löschen prüft nur den Verlauf. Prüfabfrage in Produktion vor dem Merge
- [x] **Urlaubsberechnung beachtet „ab“-Datum** (mit Zeitmodell-Verlauf Schritt 2): vor `time_tracking_start_date` (Feld „ab“ neben dem Zeitmodell) ohne Zeitmodell rechnen (Mo–Fr) – sonst verfälscht jede Neuberechnung Urlaube aus der Zeit vor dem Zeitmodell (Fall MA 13, Release 2.8.0). Kleiner Zwischenschritt bis zur Workforce-Konsolidierung (Zeitmodell-Verlauf)
- [x] **Testmaschinen endgültig löschen (Pi):** 13.10.2026 Maschinen 1–9 (alle ohne Abhängigkeiten) nach Backup über die API gelöscht (`hard_delete`, Audit-Log auf admin); übrig 31–38. Beim Löschen werden Wartungspläne/-aufgaben (inkl. Historie), Werkzeugnummernlisten, Betriebsstunden und Dokumente per CASCADE mitgelöscht – künftig vorher prüfen
- [x] **`scripts/backup.sh`:** nächtliche Backups waren leer (Cron startete ohne Repo-Ordner, kein `pipefail`) – jetzt `cd` ins Repo, `pipefail`, Prüfung auf Größe + Endmarke, Aufräumen nur nach Erfolg; Backup-Monitor im MDS prüft inhaltlich und meldet Fehler rot
- [ ] **Backup-Konzept außerhalb des Pi** (DB, Backups und Uploads liegen auf derselben SSD) – Ziel: Windows-Freigabe „MDS Backup“ auf dem Firmen-Server (SMB, im Firmen-Backup enthalten, keine Cloud-Synchronisation, ~330 GB frei, geteilt). Ebene 1+2 per restic (#194/#195), **in Betrieb seit 24.10.2026** (erster Snapshot, Monitor grün). Stand Pi 08.10.2026: OS auf SD-Karte (58 GB, 20 GB belegt), Daten auf SSD `/srv` (112 GB, 1 % belegt), Uploads 67 MB, DB-Backup ~0,7 MB/Tag
  - [x] **Ebene 1 – Datenbank:** täglichen `pg_dump` zusätzlich aufs Netzlaufwerk, dort längere Aufbewahrung (30 Tage + 12 Monate, `scripts/backup-offsite.sh`)
  - [x] **Ebene 2 – Dateien:** `/srv/mds/uploads` + `.env` vom Pi (Secrets, nicht im Repo) täglich mit Versionsständen (restic statt `rsync`, im selben Lauf)
  - [ ] **Ebene 3 – Pi-System:** Image der SD-Karte monatlich und vor größeren Änderungen (Datei aufs Netzlaufwerk oder bootfähiger Klon auf Ersatz-SD/USB)
  - [ ] **Ebene 3b – Terminals:** Images des **Zeiterfassungs-Terminals** (Raspberry Pi 4, Repo `mds-time-terminal`) und künftiger Shopfloor-Terminals – nach Einrichtung und nach Änderungen. Aufbau in drei Schichten: **gemeinsame Basis** (Raspberry Pi OS, Kiosk/X11 + Chromium, Touch/Display, Zeitzone, Updates, SSH) → **ein Image je Terminal-Typ** (Rolle, z. B. Zeit-Terminal mit Python-Dienst + NFC, Kiosk-Terminal mit MDS-URL – Typen ergeben sich aus der Architektur-Entscheidung in Phase 10) → **Konfig-Datei je Gerät** (Hostname, Terminal-ID/API-Key bzw. `.env`, Maschine/Schrank). Offene Stempel in der SQLite-Queue werden alle 30 s synchronisiert, sind also kein Dauerbestand. Ziel: defektes Terminal schnell ersetzen (Image des Typs + Konfig-Datei)
  - [x] Zugangsdaten nur in geschützter Datei auf dem Pi (`/etc/samba/creds/mds`, `root:root`, `chmod 600` – geprüft 24.10.2026). Vorerst persönlicher Benutzer; später eigener Benutzer nur mit Schreibrecht auf „MDS Backup“ (Passwortwechsel bricht sonst das Backup)
  - [x] Backup-Monitor im MDS erweitern: Netzlaufwerk-Kopie vorhanden und aktuell? (Cron-Job `backup_offsite_monitor`, liest `offsite-status.json`)
  - [ ] Wiederherstellungs-Anleitung in DEPLOYMENT.md (frischer Pi → OS, Docker, Repo, `.env`, DB, Uploads) und einmal testen – Wiederherstellung aus restic steht drin (auf homepi getestet: Dump eingespielt, Uploads/.env bitgleich), Ablauf „frischer Pi“ fehlt noch
  - [x] ~~Zwischenlösung bis dahin erwägen: Backups zusätzlich auf die SD-Karte kopieren~~ – entfällt mit dem Netzlaufwerk
- [x] **Mitarbeiter-Einstellungen mobil** (Branch `fix/mitarbeiter-einstellungen-mobil`, Variante B: Spalten ausblenden statt Karten; dazu Seitenkopf und Reiter der Urlaubsseite): Tabelle mit festen Spalten, die Details (inkl. Zeitmodell-Verlauf) sitzen in einer Tabellenzeile – unter ~700 px nur mit seitlichem Scrollen bedienbar (Karten-Layout wie in anderen Listen?)
- [x] **Audit-Log-Zeitstempel uneinheitlich** (Branch `fix/audit-log-zeitstempel`, Variante A: `timestamptz`, Altdaten nach Herkunft umgerechnet, Middleware auf zentralen Pool; Prüfung in Produktion: nur `user_time_model` war Berliner Zeit, Teile wie die Middleware UTC): Einträge der Middleware (`auditLogMiddleware`) stehen in UTC, direkt geschriebene (Default `current_timestamp`, Pool in Europe/Berlin – z. B. Teile, Zeitmodell-Verlauf) in Berliner Zeit; Spalte ist `timestamp` ohne Zeitzone. Vereinheitlichen (z. B. `timestamptz`) – vorher prüfen, wo das Audit-Log angezeigt wird
- [x] **Kalender-Monatsansicht: „+N mehr“ verdeckt** (Branch `feat/verwaltung-kalender-tabs`) (16.10.2026 nachgestellt): Tageszellen fest 96 px (`h-24` in `VacationCalendar.jsx`), Tageszahl + 3 Einträge füllen sie, „+N mehr“ ragt heraus und wird von der nächsten Kalenderzeile übermalt; an Feiertagen (Name als eigene Zeile) wird schon der dritte Eintrag verdeckt. Gewählt: **Variante 3** – feste Höhe, so viele Einträge wie passen (bei >3 zwei + „+N mehr“, an Feiertagen einer weniger), „+N mehr“ klickbar mit Liste aller Abwesenheiten des Tages (jede öffnet wie bisher)
- [x] **Kalender: Klick auf einen Tag ohne Verwaltungsrecht** (bestätigt, auch Klick auf einen Eintrag) – `VacationsPage` übergibt `onDayClick` nur mit Verwaltungsrecht, die Monatszelle ruft es ohne Prüfung auf → `TypeError` in der Browser-Konsole; mit dem Punkt oben erledigt
- [x] **Abwesenheit löschen zieht Tageswerte nicht nach** (Branch `fix/abwesenheit-tageswerte`; auch Ändern betroffen, Ablehnen/Zurückziehen nicht): `deleteVacation` löscht nur den Eintrag – Tageswerte behalten Status und Gutschrift (z. B. stornierter Urlaubstag bleibt im Zeitkonto ±0 statt fehlender Buchung), bis der Tag aus anderem Grund neu gerechnet wird. Lösung: betroffene Tage (bis heute) neu rechnen und Monatssalden nachziehen, wie beim Anlegen (`syncDailySummaryForVacation`); vorher prüfen, ob Ändern/Ablehnen/Zurückziehen dieselbe Lücke haben
- [x] **Verwaltung (Urlaub & Arbeitszeit): Tab „Mitarbeiter“ in die „Einstellungen“ verschieben** – als dritter Bereich neben „Urlaub“ und „Zeiterfassung“ (`settingsCategory` in `VacationsPage.jsx`, Panel `EmployeeSettingsPanel`). Den Link „zentral verwaltet“ in den Benutzer-Details (`pages/admin/UserDetailPage.jsx`, heute nur `/vacations/admin`) auf den neuen Ort zeigen lassen
- [x] **Verwaltung: Zurück aus dem Zeitkonto landet auf „Übersicht“ statt bei den Zeitkonten** (auch die Ansicht im Tab „Arbeitszeit“ steht jetzt in der Adresse) – Tab, Einstellungs-Bereich und -Unterpunkt sind nur Zustand der Seite (`adminTab`, `settingsCategory`, `settingsSection` per `useState`), nicht in der Adresse; „Zurück“ im Zeitkonto (`navigate(-1)` in `TimeTrackingUserDetailPage.jsx`) baut die Seite neu auf → Standard-Tab. Lösung: Tab und Bereich in die URL (`?tab=…&bereich=…` per `useSearchParams`, Tabwechsel ersetzt den Verlaufseintrag), Links von außen direkt auf den Tab. Zusammen mit dem Verschieben des Mitarbeiter-Tabs erledigen
- [x] **Zeitmodell-Verlauf, Vorschau „1 → 1 Tage“** (Branch `fix/zeitmodell-vorschau-unveraendert`): Abwesenheiten, deren Tageszahl mit altem und neuem Verlauf verschieden berechnet wird, deren gespeicherter Wert aber schon dem neuen entspricht, stehen in der Vorschau (z. B. Überstundenabbau von Mitarbeiter 13 im April) und werden beim Übernehmen neu geschrieben – `updated_at` verliert dadurch seine Aussage. Lösung: nur aufführen und schreiben, wenn der neue Wert vom gespeicherten abweicht (zusätzlich zur Bedingung alt ≠ neu aus 2.10.1)
- [ ] **Eigene DB-Pools ohne Zeitzone / `timestamp` ohne Zeitzone** (Diagnose 17.10.2026, entschieden: **schrittweise je Modul**, kein Großumbau): 35 Dateien legen eigene Pools ohne `SET timezone` an (Session im Container UTC), 47 nutzen `config/db` (Europe/Berlin); 135 Zeitspalten sind `timestamp` ohne Zeitzone (Zeiterfassung ist sauber `timestamptz`), node-pg liest sie als UTC. Folgen: (1) Datumslogik in SQL der eigenen Pools (`CURRENT_DATE`, `DATE(spalte) = CURRENT_DATE`) – Wartung (Pläne, Aufgaben, Eskalationen), Bestellungen (`sent_date`, Wareneingang), Betriebsstunden-Auswertung – rechnet zwischen 0 und 1/2 Uhr mit dem Vortag; tagsüber richtig. (2) 22 Tabellen ohne Zeitzone, die der zentrale Pool beschreibt (Kunden, Lieferanten, Verbrauchsmaterial, Rüstblätter, Prüfpläne, Werkzeuglisten, Werkzeugnummernlisten …), bekommen Berliner Uhrzeit und werden 1–2 h zu spät angezeigt (meist nur Datum → nur bei Änderungen 22–24 Uhr sichtbar); rund 8 davon werden aus beiden Pools beschrieben (gemischte Altdaten, z. B. Rüstblätter, Werkzeuglisten, Prüfpläne, Arbeitsgänge). (3) 36 Pools × 10 Verbindungen > `max_connections` 100 (bei 8 Nutzern theoretisch). **Nicht** einfach alle Pools auf `config/db` umstellen – dann bekämen die bisher sauberen UTC-Tabellen Berliner Zeit. Vorgehen: Modul beim nächsten größeren Umbau umstellen (Spalten auf `timestamptz` mit Prüfabfrage der Herkunft in Produktion, danach Pool auf `config/db`), Kandidaten Wartung (Verbrauchsmaterial-Integration) und Lager/Bestellungen (Lager-Architektur); Regeln für neuen Code in CLAUDE.md
- [x] **`scripts/restore.sh`:** nutzt `docker compose` ohne `cd` ins Repo – jetzt wie `backup.sh` abgesichert; zusätzlich Prüfung der Backup-Datei vor dem Löschen und Abbruch bei Import-Fehlern (meldete vorher trotzdem Erfolg)
- [x] **Hinweis „Neue Version verfügbar“** im Frontend (Version aus `/api/health` mit eigener vergleichen) – offene Tabs/Web-App zeigen sonst bis zum Reload die alte Version. Dazu: Reload bei `vite:preloadError`, Caddy setzt `no-store` auch für Deep-Links
- [x] **`scripts/deploy.sh`: Änderungen am `Caddyfile` kommen nicht an** (Befund 21.10.2026, getestet; Branch `fix/caddy-ordner-mount`: Variante Ordner-Mount `./caddy:/etc/caddy`, dazu Prüfung des `Caddyfile` vor dem Deploy statt Neustart bei ungültiger Konfiguration): `compose.yaml` bindet `./Caddyfile` als Einzeldatei; `git pull` ersetzt die Datei, der Container sieht weiter die alte, `caddy reload` lädt also die alte Konfiguration. Erst ein Neustart des Containers holt die neue. Bisher nie aufgefallen, weil das `Caddyfile` seit der Ersteinrichtung unverändert war. Optionen: `deploy.sh` startet Caddy neu, wenn sich das `Caddyfile` geändert hat (kurz nicht erreichbar), oder Ordner statt Datei einbinden (dann reicht `reload`). Bis dahin manuell `docker compose restart caddy`
- [x] **Caddy: fehlende Dateien unter `/assets/`** liefern per `try_files` die `index.html` mit Status 200 und Asset-Header (`immutable`, 1 Jahr) statt 404 – kosmetisch, der Reload bei `vite:preloadError` fängt es ab. Jetzt eigener `handle /assets/*` (404), Fehlerantworten mit `no-store` (Branch `fix/caddy-ordner-mount`)
- [x] **PDF-Viewer lud seinen Worker von unpkg.com** (der Teil von PDF.js, der die Zeichnungen verarbeitet) – jetzt vom eigenen Server (#222)
- [ ] **Weitere externe Adressen prüfen:** Das MDS soll ohne Internet laufen und keinen fremden Code an Kundendaten lassen. Funde im Frontend-Bundle (29.10.2026): 3D-Viewer (`online-3d-viewer`) mit `cdn.jsdelivr.net` für Draco, Rhino (`.3dm`) und IFC – STEP lädt aus `/libs/`, ob die anderen Pfade je greifen, ist nicht gemessen; `unpkg.com/chevrotain` (Diagramm-Funktion, vermutlich nie aufgerufen). Noch nicht durchsucht: Backend (Abhängigkeiten mit Netzzugriff), `index.html`/Service Worker/PWA-Manifest, Schriften und Icons. Vorgehen: Bundle und Backend nach `http(s)://` durchsuchen, im Browser je Seite mit Netzwerk-Mitschnitt (Playwright) externe Anfragen sammeln, Funde lokal ausliefern oder abschalten
- [ ] **Arbeitsgang: Zykluszeit mit zwei Nachkommastellen** (z. B. 2.61 min aus dem Seed) blockiert das Speichern des Formulars – Eingabefeld hat `step="0.1"`, der Browser meldet den Wert als ungültig, ohne sichtbare Meldung. Gefunden 29.10.2026 im Test; ob in Produktion solche Werte vorkommen, offen. Hängt mit „Operations-Zeiteinheiten“ zusammen
- [ ] **Versionsstatus je Revision wird nie gepflegt** (Befund 30.10.2026, [Agent-Spec](docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md) Abschnitt 3): `program_revisions.workflow_state_id` bleibt immer `draft`. Folgen: Der Versionsverlauf zeigt bei jeder Version „draft“ (englisch, neben dem Badge „Freigegeben“), und ein Rollback setzt jedes Programm auf „Entwurf“, auch zurück auf die freigegebene Version. Vorschlag: beim Freigeben auch den Status der Revision setzen; Rollback auf `released_revision_id` → Programm wieder „Freigegeben“; Badge übersetzen
- [ ] **Version löschen geht ins Leere** (Befund 30.10.2026): Der Papierkorb im Versionsverlauf (`RevisionsList.jsx`, Recht `part.delete`) ruft `DELETE /api/programs/:id/revisions/:revisionId` auf – den Endpunkt gibt es nicht (404). Knopf entfernen oder Endpunkt bauen; dann mit Schutz für die freigegebene und für bereitgestellte Versionen (`services/deploymentGuards.js`) und Dateien mitlöschen
- [ ] **Audit-Log ordnet Aktionspfade falsch zu** (Befund 30.10.2026): `auditLogMiddleware` nimmt bei `/api/<bereich>/<id>/<aktion>` die Aktion als Entity-Typ, z. B. `rollback`, `cmm-revisions`, `regenerate-key`, `close` mit ID 0 statt `<bereich>` mit `<id>`. Solche Einträge lassen sich dem Datensatz nicht zuordnen – betrifft auch ältere Routen. Regel ergänzen: letztes Segment keine Zahl → Aktion, Entity bleibt `<bereich>`/`<id>`
- [ ] **Terminal-API-Schlüssel im Klartext** (Befund 30.10.2026): `time_terminals.api_key` steht unverschlüsselt in der DB (der Agent-Schlüssel nur als SHA-256, #247). Auf Hash umstellen wie beim Agenten – braucht einen neuen Schlüssel in der `config.yaml` am Terminal-Pi, daher zusammen mit einem Terminal-Deploy
- [ ] **HTTPS im LAN** (Agent-Spec Abschnitt 10): Caddy spricht nur HTTP, Logins sowie Terminal- und Agent-Schlüssel gehen im Klartext durchs Netz. Interne CA oder eigenes Zertifikat; Vertrauen auf Mess-PC, Terminal-Pi und Browsern einrichten
- [ ] **Auslöser fehlt bei „nur gemessen“ beim Aktualisieren** (Befund 31.10.2026, Agent 4.8b): Ersetzt der Agent nach „Aktualisieren“ ein nach dem Lauf gespeichertes `.prg` (Antwort „nur gemessen“), meldet er `discarded_run_save`. `triggeredBy` in `services/agentReport.js` nimmt dafür `close_requested_by` – beim Aktualisieren leer, im Protokoll steht also kein Auslöser. Vorschlag: bei offener Bereitstellung (nicht `closing`) wie bei `to_device` den nehmen, der die Version festgelegt hat (`agent_deployment_programs.updated_by`)
- [ ] **Agent-Bericht kann am JSON-Limit scheitern** (Befund 31.10.2026, Agent 4.7): `express.json()` in `server.js` nimmt höchstens 100 KB an, der Bericht (`POST /api/agent/report`) darf aber bis zu 500 Dateien und 500 Transfers enthalten. Ein Eintrag hat rund 250–400 Byte, also wären schon etwa 300 Einträge zu viel. Folge: 413, der Agent meldet „Fehler“ und schickt denselben Bericht immer wieder. Heute unkritisch (eine Bereitstellung ≈ 10 Dateien, der Agent schickt höchstens 200 Transfers je Bericht). Vorschlag: für `/api/agent/report` ein eigenes Limit (z. B. 1 MB), oder die Grenzen in der Spec an 100 KB anpassen
- [x] **Download lädt den Entwurf statt der freigegebenen Version** (Befund Nutzer 30.10.2026, nach Release 2.18.0; behoben: Download = freigegebene Version, Entwurf mit eigenem Knopf): Der ZIP-Download auf der Messprogramm-Karte, in der Dateiliste und in der Übersicht sowie der NC-Download (Karte, Übersicht) holen immer die aktuelle Version (`current_revision_id`), auch wenn sie noch Entwurf ist und eine ältere freigegeben ist (`released_revision_id`, #243). Bis der Agent läuft, holt man Programme so an die Maschine bzw. den Mess-PC → Risiko, eine ungeprüfte Version zu verwenden. Der NC-Download (`GET /api/programs/:id/download`) kennt noch keine Versionswahl. Entscheidung offen, siehe Session 30.10.
- [x] **Rechte-Kategorie „Urlaub“ doppelt** (Befund Nutzer 30.10.2026; behoben: Kategorien als Schlüssel, deutsche Namen im Frontend): `vacations.approve` hat die Kategorie `Urlaub` (Migration 089), die übrigen Urlaubsrechte `vacations` (Migration 081) → in der Rollenverwaltung zwei Gruppen. Die Rollenverwaltung zeigt die Kategorie roh an; gemischt englische Schlüssel (`program`, `agent`, `vacations` …) und deutsche Namen (`Urlaub`, `Zeiterfassung`). Entscheidung offen, siehe Session 30.10.

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
- [ ] **Module ein-/ausschalten** (MDS betriebsneutral): Schalter je Modul in den Systemeinstellungen, Daten bleiben erhalten, Abhängigkeiten; zuerst Messprogramme/PC-DMIS und Agent, bestehende Module bei Bedarf. Agent-Module zentral je Gerät im MDS. Konzept: [MODULE_KONZEPT.md](docs/konzepte/MODULE_KONZEPT.md)

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

### 📋 Messmaschinen-Terminal (KMG / PC-DMIS) 📐
**Status:** 📋 Konzept · [docs/konzepte/MESSPROGRAMME_KONZEPT.md](docs/konzepte/MESSPROGRAMME_KONZEPT.md)
**Ziel:** PC-DMIS-Messprogramme im MDS versioniert und freigegeben verwalten, auf dem Mess-PC lokal bereitstellen, Änderungen sauber zurückholen

- Prinzip „Bereitstellen → Arbeiten → Abschließen“: auf dem Mess-PC liegt nur die aktuelle Arbeit, nach „Fertig“ ist das Arbeitsverzeichnis wieder leer; lokale Änderungen landen im **Eingang**, ein Mensch übernimmt sie als neue Revision
- **MDS-Agent** (C#, Tray) auf dem Mess-PC, Pull per API-Key – später auch Module NC-Transfer (Maschinen-Terminal) und TopSolid
- Ein Datenmodell für NC- und Messprogramme (`programs.kind`, `program_revision_files`, `agents`, `agent_deployments`, `program_transfers`, `program_inbox`)

**Umsetzungsschritte:**
- [x] 0 – Binär-Fix Programm-Upload (PR #215)
- [x] 1 – Migration: `programs.kind`, `program_revision_files`, `machines.measuring_equipment_id` (Freigabe über `program.release`, Maschinentyp „Messmaschine“ per Oberfläche)
- [x] 2 – Backend: Upload mehrerer Dateien je Revision (Änderungen per Hash erkannt, Rest aus der Vorversion übernommen), Download einzeln/ZIP, `.http`-Tests
- [x] 3 – Frontend: Menüpunkt „Messprogramme“ (mit „NC-Programme“), Messprogramme am Arbeitsgang (Hochladen mit Vorschau, Dateiliste, ZIP) → nutzbar ohne Agent; Test mit echten PC-DMIS-Dateien am Arbeitsplatz offen
- [ ] 4 – Agent v1: Bereitstellen + Abschließen ohne Eingang – Spec und PR-Plan: [MESSPROGRAMME_AGENT_SPEC.md](docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md) (30.10.2026)
  - [x] 4.1 Freigabe-Zeiger `programs.released_revision_id` (freigegebene Version bleibt bereitstellbar, während eine neue in Arbeit ist) – PR #243; rpi01 am 30.10.: 3 Programme, alle Entwurf, keins je freigegeben → vor dem ersten Bereitstellen freigeben
  - [x] 4.2 Migration Agent-Schema + Rechte `agent.manage`, `program.deploy` – PR #245 (Bereitstellungen hängen per CASCADE am Arbeitsgang wie die Programme)
  - [x] 4.3 Backend Agentenverwaltung, API-Schlüssel (nur Hash), `authenticateAgent` – PR #247 (Manifest liefert vorerst nur die Gerätekonfiguration)
  - [x] 4.4 Backend Bereitstellungen (Version festgehalten, Vorlagenname je Gerät eindeutig, Zielpfade gemeinsam mit ZIP, Löschschutz) – PR #249
  - [x] 4.5 Backend Agent-API (Manifest, Dateien, Bericht, Fertig) + Integrationstest mit simuliertem Agenten – PR #251 (Backend-Seite des Agenten komplett)
  - [x] 4.6 Frontend: Agenten, „Auf dem Mess-PC“, Bereitstellen/Aktualisieren/Fertig/Verwerfen – PR #253 (Bereitstellen nur am Arbeitsgang)
  - [x] 4.7 Agent (C#, Tray, .NET 4.8, eigenes privates Repo [`mds-agent`](https://github.com/mcr14410-master/mds-agent)): Grundgerüst + Bereitstellen, Gesundheitscheck, Offline – mds-agent#1, Agent 0.1.0 (braucht MDS ≥ 2.18.0); gebaut mit .NET-SDK auf homepi (`~/.dotnet`) und GitHub Actions (Windows); Ende-zu-Ende gegen MDS 2.18.1 geprüft. Vortest am master-pc gegen das Dev-MDS am 31.10. grün (Bereitstellen), dabei behoben: ini-Ausschnitt mit Frontend- statt API-Adresse (#262), klare Meldung „Antwort ist nicht vom MDS“ im Agenten (mds-agent#2). Offen: Mess-PC
  - [x] 4.8 Agent: Abschließen + Aktualisieren (Nachfrage „nur gemessen?“, Nebendateien) – mds-agent#3 (4.8a Abschließen: bearbeitet → ganze Gruppe bleibt, `.corrupt` nie löschen, Entscheidungen 31.10.) und mds-agent#4 (4.8b Aktualisieren, „Aufräumen…“); je Ende-zu-Ende gegen MDS geprüft. Agent v1 laut Spec vollständig
  - [x] Agent-Release v1.0.0 – [GitHub-Release](https://github.com/mcr14410-master/mds-agent/releases/tag/v1.0.0) mit `MDS-Agent-v1.0.0.zip` (31.10.2026); vorher Tray-Test am master-pc gegen das Dev-MDS in allen Funktionen, dabei behoben: Hinweis „wartet auf Antwort am Mess-PC“ (#265)
  - [ ] Checkliste am Mess-PC (Spec 9), an einer Kopie
- [ ] 5 – Eingang (statt Hochladen von Hand), „Änderung melden“, Nachfrage-Frist
- [ ] 6 – Excel-Protokollvorlage (`.xlsx` + `.layout.xml`) als Teil der Programmgruppe – MDS-Seite mit Schritt 2 erledigt (Paar Pflicht, gültiges XML, Name eindeutig), Rundlauf MDS → ZIP → Mess-PC am 30.10. geprüft; Agent-Seite (Vorlagenverzeichnis, Reihenfolge, Gesundheitscheck) kommt mit Schritt 4
- [ ] 7 – Erstimport vom Netzlaufwerk
- [x] Kalibrierprogramm (Taster) als zweite `.prg` in der Dateigruppe, mit dem Hauptprogramm versioniert – Rolle `calibration`, eigener Upload-Bereich (Excel-Vorlage ebenso), Protokoll-PDFs aussortiert, ZIP-Unterordner `Kalibrierung/` (Konzept 4.2a, 30.10.2026); offen: `.MiniRoutines.xml` zur Kalibrierung, falls nötig
- [ ] optional – PC-DMIS-Automation im Agenten (Ereignisse, Laufprotokoll, Inhalts-Hash ohne Laufdaten)

Offene Punkte stehen im Konzept (Abschnitt 10). Für Schritt 4 berücksichtigt (Spec): Modulliste in `agents` ([MODULE_KONZEPT.md](docs/konzepte/MODULE_KONZEPT.md) 4), Vorlagenname-Prüfung beim Bereitstellen (Rollback-Fall). Nebenbefunde aus Schritt 4 stehen unter „Offene Fixes“.

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

**NC-Programm Transfer (Kernfunktion):** – gleiches Prinzip wie beim Messmaschinen-Terminal (Bereitstellen/Abschließen, Eingang, MDS-Agent mit Steuerungs-Adapter), siehe [MESSPROGRAMME_KONZEPT.md](docs/konzepte/MESSPROGRAMME_KONZEPT.md) Abschnitt 5.4
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
- [x] NC-Viewer: Q-/QL-Parameter, `FN 9–12`-Sprünge, Text-Labels; Formeln gelten als unbekannt (#212)
- [ ] NC-Viewer am Arbeitsplatz: Rechtsklick-Eintrag einrichten, `PLANE AXIAL` und Sym-Test-Programm (`PLANE SPATIAL SPA+QL101 … SYM+`) mit echten G350-Programmen prüfen
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
- [ ] **Programmnummern-Format:** aktuell auto „OP10-001“ (OP-Code des Arbeitsgangs, nicht eindeutig) – Vorschlag: MDS vergibt `<Bauteil-Nr>-<n>` bzw. `-M<n>`, Nummer läuft unverändert bis an die Maschine, später auch nach TopSolid. Entwurf mit offenen Fragen (Namensgrenzen der Steuerungen am 30.10. geklärt; offen u. a. Bestandsprogramme, Rückweg von der Maschine): [PROGRAMMNUMMERN_KONZEPT.md](docs/konzepte/PROGRAMMNUMMERN_KONZEPT.md). Bearbeiten-Fehler und doppelte Nummern behoben (#226)

---

## 🔧 Nächste Session

Stand: [Session 30.10.2026](docs/sessions/SESSION-2026-10-30-kalibrierprogramm.md) – **v2.18.1 läuft auf dem Pi** (31.10.: Download der freigegebenen Version, Rechte-Kategorien; davor 2.18.0 am 30.10.: Messprogramme bereitstellen – MDS-Seite des Agenten, Freigabe-Zeiger), `[Unreleased]`: ini-Ausschnitt mit API-Adresse (#262), Hinweis „wartet auf Antwort am Mess-PC“ (#265)

0. **Messprogramme:** Kalibrierprogramm aus dem ZIP in PC-DMIS öffnen, Verhalten ohne `.cad` an einer Kopie prüfen (Release-Checkliste „Noch offen aus 2.17.0“) – Schritt 4 (MDS-Agent) läuft: [Spec](docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md), 4.1–4.6 gemergt, MDS-Seite komplett seit 2.18.0 auf dem Pi, Agent v1 komplett in [`mds-agent`](https://github.com/mcr14410-master/mds-agent) (4.7 Bereitstellen, 4.8a Abschließen, 4.8b Aktualisieren/Aufräumen; Vortest Bereitstellen am master-pc grün 31.10.). Agent v1.0.0 als GitHub-Release (31.10.). Als Nächstes: Agent am Mess-PC installieren und Checkliste (Spec 9) an einer Kopie; `[Unreleased]`: ini-Ausschnitt-Fix (#262) und Hinweis „wartet auf Antwort am Mess-PC“ (#265) fürs nächste Release
1. **Termine Zeiterfassung (2.9.5):** vor Weihnachten Mitarbeiter informieren (24.12./31.12. halber Urlaubstag, wer nicht kommt); am 24.12./31.12. bzw. Folgetag Tageswerte prüfen (ohne Stempel −halbes Soll als fehlende Buchung, mit halbem Urlaubstag ±0); nächste Krankmeldung nach Arbeitsbeginn ±0
2. **Time-Terminal deployen** (Terminal-Pi, `deploy.sh` dort): Chip-Wechsel-Fix (mds-time-terminal#7)
3. **Weitere Fixes** (siehe „Offene Fixes“) – DB-Pools/Zeitzonen: diagnostiziert, wird je Modul beim nächsten Umbau erledigt
4. **TopSolid-Werkzeugimport, Phase 1:** Konzept-Ist-Stand gegen Code prüfen → Spec + Plan → Migration → preview/commit-API → `.http`-Tests mit echtem Export → Frontend
5. **Backup-Konzept:** Ebene 1+2 in Betrieb (24.10.2026); offen Ebene 3 (Images Pi/Terminals), Anleitung „frischer Pi“, eigener Backup-Benutzer
6. **Verbrauchsmaterial** lokal testen und in Betrieb nehmen, Wartungs-Integration
7. **Lager-Architektur** entscheiden (vor Rohmaterial/Normteile)
8. **Handy-Tauglichkeit** (niedrige Priorität) – Befunde aus dem Handy-Test vom 28.10. in [docs/konzepte/HANDY-TEST.md](docs/konzepte/HANDY-TEST.md) (27 von 52 Seiten zu breit). Zuerst überall: Kopfzeile/Breadcrumbs inkl. doppelter Breadcrumbs auf fünf Admin-Seiten, Tab-Leisten der Detailseiten, drei abgeschnittene Tabellen (Benutzer, Verbrauchsmaterial, Operationstypen). Seitenkopf mit Knöpfen nur auf Seiten, die am Handy genutzt werden – vorher festlegen, welche; komplexe Seiten bleiben PC-Seiten
9. **Messprogramme Schritt 4** (MDS-Agent auf dem Mess-PC, Bereitstellen + Abschließen) – Umsetzung nach [Spec](docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md) Abschnitt 9, PR 4.1–4.8; siehe Phase 10 „Messmaschinen-Terminal“
10. **Repos MDS und Time-Terminal auf privat schalten** (eigene Sitzung; `mds-agent` ist schon privat): zuerst auf rpi01 und dem Terminal-Pi prüfen, wie `origin` eingerichtet ist (HTTPS/SSH), und einen Deploy-Key (nur lesen) einrichten, sonst bricht `git pull` in `deploy.sh` ab. Danach umschalten (macht der Nutzer selbst) und die CLAUDE.md anpassen („Repo ist öffentlich“). Die Regeln zu Platzhaltern und `_lokal/` bleiben, weil schon Veröffentlichtes nicht zurückgeholt werden kann
11. Kleinkram: Tags im Terminal-Repo nachtragen (bisher keine, z. B. `v0.2` auf PR #1), PI-SETUP.md im Terminal-Repo prüfen, NC-Viewer am Arbeitsplatz (Rechtsklick, G350-Programme mit `PLANE AXIAL` und QL-Parametern), auf dem Pi alten Stash (01.12.2025) sichern + entfernen und `~/mds-dist-2.6.0` löschen

---

**Letzte Aktualisierung:** 2026-10-28
