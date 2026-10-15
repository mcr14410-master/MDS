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

### Added
- Zeitmodell-Verlauf, Schritt 1 (Grundlage): Tabelle `user_time_models` (Mitarbeiter, Zeitmodell, gültig ab, angelegt von/wann; Migration `1737000117000` übernimmt jedes vorhandene Zeitmodell ab dem Zeiterfassungs-Start). Beim Ändern eines Mitarbeiters entsteht ein Verlaufseintrag – erste Zuordnung ab Zeiterfassungs-Start, spätere ab heute; Entfernen des Modells lässt den Verlauf stehen. Hilfsfunktionen in `utils/timeModelHistory.js` („Modell an Datum X“). Gerechnet wird noch mit `users.time_model_id` – die Umstellung folgt in Schritt 2
- Feste Testsammlung Zeiterfassung/Urlaub: `npm run test:integration` startet eine Wegwerf-Datenbank (Docker-Container `mds-test-db`, `127.0.0.1:5434`, Daten im RAM), spielt alle Migrationen ein und prüft die echten Rechenwege (Tagesberechnung, Nacht-Job, Urlaub anlegen inkl. Sync, Urlaubstage, Zeitnachweis-Stichtag) – 22 Fälle aus den Fixes 12.–15.10. (`tests/integration/test-zeiterfassung.js`). `npm test` startet die schnellen Tests ohne Datenbank (`tests/run-unit-tests.js`). Anleitung in `backend/tests/RUN-TESTS.md`
- `getPayrollVacation` exportiert (für die Tests)
- Zeitmodell-Verlauf, Schritt 3 (Backend): `GET /api/users/:id/time-models` (Verlauf mit gültig bis, aktuell/künftig, Wochenstunden, angelegt von), `POST …/time-models/preview` (Vorschau für Anlegen/Korrigieren/Löschen: betroffene Tage mit altem/neuem Soll und Saldo, Saldo-Änderung je Monat mit Kennzeichen „vergangener Monat“, Urlaube mit alten/neuen Tagen, erhaltene manuelle Soll-Werte – speichert nichts), `POST …/time-models` (neues Zeitmodell ab Datum, auch rückwirkend oder künftig), `PUT`/`DELETE …/time-models/:entryId` (Eintrag korrigieren/löschen; der einzige Eintrag ist nicht löschbar). Speichern rechnet den betroffenen Zeitraum neu: vorhandene Tageswerte (manuelles Soll bleibt), neue Arbeitstage werden angelegt wie vom Nacht-Job, Tageswerte ohne Stempel an Tagen, die frei werden, entfernt; Urlaubstage (genehmigt/beantragt) und Monatssalden ab dem ersten betroffenen Monat. Audit-Log `user_time_model` mit optionalem Grund (`reason`). Rechte `user.read`/`user.update`. Logik in `services/timeModelChangeService.js`
- Testsammlung: `tests/integration/test-zeitmodell-aenderung.js` (25 Fälle – rückwirkend, korrigieren, löschen, neuer Arbeitstag, künftig datiert, Prüfungen, Anzeige heute gültig, Zeitmodell löschen, Deaktivieren), `.http`-Szenarien `tests/test-user-time-models.http`

### Changed
- Zeitmodell-Verlauf, Schritt 2 (Rechnen): Tagesberechnung (`updateDailySummary`), Nacht-Job (`generateAbsenceEntries`), Urlaubs-Sync, Urlaubstage (`calculateWorkingDaysByYear`, damit auch Zeitnachweis-Stichtag) und Terminal-Tagessoll nehmen das am jeweiligen Tag gültige Zeitmodell aus `user_time_models` statt `users.time_model_id`. Vor dem ersten Verlaufseintrag gilt kein Modell: Zeiterfassung ohne Soll (Nacht-Job legt keine Tage an), Urlaub Mo–Fr – erledigt das „ab“-Datum. `countWorkingDays`/`countWorkingDaysByYear` nehmen statt eines Modells auch eine Funktion „Modell je Tag“. Nacht-Jobs wählen Mitarbeiter mit Verlaufseintrag statt mit `time_model_id`. Anzeigen (Modellname) lesen weiter `users.time_model_id`
- Zeitmodell-Verlauf, Schritt 3 (Backend): Anzeigen des Modellnamens (Terminal, Benutzer-API, Zeitkonten, Zeitmodell-Liste „Benutzer“) zeigen das heute laut Verlauf gültige Modell (`currentTimeModelJoin` in `utils/timeModelHistory.js`, Europe/Berlin) statt `users.time_model_id` – künftig datierte Einträge greifen ab ihrem Datum. `users.time_model_id` wird bis Schritt 4 auf das heute gültige Modell mitgeführt. Zeitnachweis (einzeln und alle): bei einem Wechsel im Monat beide Modelle im Kopf („A (bis 14.09.), B (ab 15.09.)“). Zeiterfassung deaktivieren bzw. `time_model_id: null` bei `PUT /api/users/:id` lässt Zeitmodell und Verlauf stehen. `updateDailySummary` aufgeteilt in `computeDailySummary` (rechnet, speichert nicht – auch für die Vorschau) und Speichern; Option `skipBalance`. `calculateWorkingDaysByYear` nimmt optional einen Resolver „Modell je Tag“
- Testsammlung: Mitarbeiter bekommen einen Verlaufseintrag ab Zeiterfassungs-Start; neue Fälle Modellwechsel im Monat (Nacht-Job, Neuberechnung, Stempeln am neuen freien Tag), Urlaub über den Wechsel, Urlaub/Nacht-Job vor dem ersten Eintrag, Terminal-Tagessoll (31 Fälle) sowie Unit-Tests „Modell je Tag“

### Fixed
- Zeitmodell löschen, das nur noch im Zeitmodell-Verlauf steht: 400 mit Hinweis (betroffene Mitarbeiter) statt 500 durch den Fremdschlüssel

---

## [2.9.5] - 2026-10-15 - Halber Arbeitstag an Heiligabend/Silvester, Krank nach Arbeitsbeginn

### Für Anwender
- Heiligabend und Silvester sind halbe Arbeitstage: Bis Mittag gilt die halbe Sollzeit (z. B. 4:15 Std. bei 8:30 Std. Soll). Wer nicht kommt, trägt einen halben Urlaubstag ein – ohne Stempelung und ohne Urlaub erscheint der Tag als fehlende Buchung.
- Wer nach Arbeitsbeginn krank nach Hause geht (oder an dem Tag Urlaub, Schulung o. Ä. hat), bekommt im Zeitkonto die gearbeitete Zeit plus den Rest bis zum Soll gutgeschrieben – nicht mehr das volle Soll zusätzlich. Der Tag zeigt die Abwesenheit als Status.

### Changed
- Halbe Feiertage (24.12./31.12.) als halber Arbeitstag (`HALF_HOLIDAY_IS_WORKDAY = true` in `utils/dayAbsence.js`, mit der Buchhaltung abgestimmt): volles Soll, halbes Soll als Feiertag gutgeschrieben – ohne Stempel −halbes Soll, mit Urlaub ±0 (passt zur Urlaubsberechnung, die dort 0,5 Tage zählt). Ohne Abwesenheit kein Status „Feiertag“, sondern wie ein normaler Arbeitstag (ohne Stempel „fehlende Buchung“). Bisher: halbes Soll + halbe Gutschrift, Tag ohne Stempel ±0

### Fixed
- Teilweise Abwesenheit: Der Urlaubs-Sync füllte bis zum Soll auf (2 h gearbeitet + 6:30 Krank = ±0), die Tagesberechnung schrieb bei jeder späteren Neuberechnung (Korrektur, Tagesinfo, Auto-Abschluss, Stempeln nach der Krankmeldung) das volle Soll zusätzlich gut (+2 h). Jetzt überall Auffüllen nach dem Lohnausfallprinzip: `calculateDayAbsence` erhält die gestempelte Zeit (`workedMinutes`), Gutschrift = Soll − Feiertagsanteil − gestempelte Zeit, nie unter 0. Der Urlaubs-Sync rechnet Tage mit Stempelungen über `updateDailySummary` (vorher eigene Formel, Status blieb „complete“; `credited_minutes` wird nicht mehr geschrieben – wurde nirgends gelesen)

---

## [2.9.4] - 2026-10-14 - Mitarbeiter-Einstellungen mit Speichern

### Für Anwender
- Urlaub & Arbeitszeit → Verwaltung → Mitarbeiter: Einstellungen werden nicht mehr bei jedem Klick sofort gespeichert. „Details bearbeiten“ öffnet die Einstellungen direkt unter dem Mitarbeiter, gespeichert wird erst mit „Speichern“. Vor dem Ändern des Zeitmodells und dem Abschalten der Zeiterfassung kommt eine Rückfrage.

### Fixed
- Mitarbeiter-Einstellungen (`EmployeeSettingsPanel`): Schalter Urlaub/Zeiterfassung, Zeitmodell und „ab“-Datum speicherten sofort – ein versehentlicher Klick (z. B. Touchpad) schaltete die Zeiterfassung ab und entfernte das Zeitmodell, beim Eintippen des Datums wurden Zwischenstände gespeichert. Jetzt Übersicht ohne Eingabefelder, Bearbeiten im aufgeklappten Bereich mit Speichern/Abbrechen (nur geänderte Felder), Rückfrage bei Zeitmodell-Wechsel und Deaktivieren. Der aufgeklappte Bereich stand unter dem letzten Mitarbeiter statt unter dem gewählten. „Heute“ beim Aktivieren jetzt in Europe/Berlin (vorher UTC)

---

## [2.9.3] - 2026-10-14 - Feiertage in Urlaub und Zeiterfassung

### Für Anwender
- Das Bundesland unter Urlaub → Einstellungen → Allgemein gilt jetzt überall gleich: für Urlaubstage, Zeiterfassung und Kalender. Beim Umstellen erscheint ein Hinweis, dass bereits berechnete Werte nicht automatisch neu berechnet werden.
- Feiertage in der Zeiterfassung werden jetzt immer gleich gerechnet. Bisher konnte ein Feiertag nachträglich mit vollem Minus im Zeitkonto landen, z. B. wenn an dem Tag eine Notiz eingetragen oder gestempelt wurde. Urlaub über einen Feiertag zählt den Feiertag als Feiertag.

### Fixed
- Feiertage: Das Bundesland kam nur im Frontend aus der Einstellung „Standard-Region“ (`default_region`). Urlaubsberechnung, automatisches Erzeugen und die Feiertags-API ohne Regionsangabe rechneten fest mit „BY“; die Tagesberechnung der Zeiterfassung (`updateDailySummary`, Nacht-Job `generateAbsenceEntries`) und der Urlaubskalender filterten gar nicht nach Region – nach einmaligem Umstellen auf ein anderes Bundesland zählten dessen Feiertage dauerhaft für alle (z. B. Buß- und Bettag in Sachsen). Jetzt überall `getHolidayRegion()` (`utils/holidayRegion.js`, liest `default_region`, Rückfall „BY“). Hinweis im Einstellungsformular beim Umstellen
- Zeiterfassung, Feiertage und Abwesenheiten: drei Stellen rechneten Soll, Gutschrift und Status unterschiedlich. `updateDailySummary` (bei jeder Buchung, Korrektur, Tagesinfo, Auto-Abschluss) setzte an Feiertagen volles Soll ohne Gutschrift (−Soll im Saldo, Arbeit am Feiertag gegen volles Soll), der Urlaubs-Sync (`syncDailySummaryForVacation`) kannte keine Feiertage, der Nacht-Job (`generateAbsenceEntries`) priorisierte Feiertag vor Urlaub und kannte als einziger halbe Feiertage. Jetzt gemeinsame Regel `calculateDayAbsence` (`utils/dayAbsence.js`, Tests `tests/test-day-absence.js`): Feiertagsanteil bei „Feiertage gutschreiben“ als Ist gutgeschrieben, sonst vom Soll abgezogen (vorher −Soll); Abwesenheit mit Gutschrift füllt das restliche Soll; ganzer Feiertag hat Status „Feiertag“ auch im Urlaub. Halbe Feiertage unverändert wie bisher im Nacht-Job (`HALF_HOLIDAY_IS_WORKDAY = false`, Klärung offen)

### Removed
- Einstellung `holiday_region` (Migration `1737000116000`) – wurde nirgends gelesen

---

## [2.9.2] - 2026-10-13 - Backup-Anzeige, Zeitnachweis und Upload-Meldungen

### Für Anwender
- Der Backup-Status unter Administration → Cron-Jobs zeigt jetzt, wann das neueste Backup erstellt wurde (z. B. „von 13.10., 02:30“), statt der wenig aussagekräftigen Angabe „vor 0h“.
- Zeitnachweis für den laufenden Monat: Das Urlaubskonto zeigt den Stand von heute statt schon vom Monatsende. Urlaub, der erst noch kommt, steht unter „Genehmigt, nach Stichtag“ und zählt nicht mehr als genommen.
- Beim Hochladen von Wiki-Bildern und Fotos zu Einrichteblättern erscheint bei einem Fehler jetzt die konkrete Meldung (z. B. „Nur Bilder erlaubt“). Werkzeug-Dokumente und Verbrauchsmaterial melden sich durchgehend auf Deutsch.

### Changed
- `scripts/backup.sh`: Bei manuellem Aufruf im Terminal landet die Ausgabe zusätzlich in `backup.log` (Kennzeichnung „(manuell, Benutzer)“) – bisher schrieb nur der Cron-Lauf über die Umleitung in der Crontab ins Log, die Backups vor einem Deploy fehlten dort. Cron-Aufruf unverändert (keine TTY → keine doppelten Zeilen)
- Backup-Monitor (Cron-Jobs-Seite): „neuestes: … MB von TT.MM., HH:MM“ (Europe/Berlin) statt „(vor Xh)“ – die Prüfung läuft 30 min nach dem Backup, das gerundete Alter war immer 0; ohne Datum im Ergebnis weiter das Alter (Rückfall)
- `npm run dev:init`: Die verdeckte Passwortabfrage steht jetzt in einem deutlich abgesetzten Block („Admin-Passwort festlegen – Eingabe wird nicht angezeigt“) – nach den npm-Kopfzeilen ging sie leicht unter

### Fixed
- Zeitnachweis-PDF (Einzel und Sammel): Stichtag des Urlaubskontos war immer das Monatsende – im laufenden Monat stand z. B. am 13.10. schon „Stand 31.10.“, und „Genommen bis 31.10.“ enthielt künftigen genehmigten Urlaub. Stichtag jetzt Monatsende, höchstens heute (Europe/Berlin, `toDateStr`); vergangene Monate unverändert (`getPayrollVacation`)
- Upload-Fehlermeldungen: Wiki-Bilder (`WikiArticleForm`) zeigten immer nur „Fehler beim Hochladen“, Einrichteblatt-Fotos (`SetupSheetPhotos`) gar nichts – jetzt die Meldung aus der Antwort. Werkzeug-Dokumente und Verbrauchsmaterial meldeten einen falschen Dateityp auf Englisch; `consumableDocumentsController` komplett übersetzt (alle Antworten), Werkzeug-Meldung nennt jetzt auch die erlaubten Textdateien (TXT, CSV)

---

## [2.9.1] - 2026-10-13 - Urlaubsanzeige und Fehlerbehandlung

### Für Anwender
- Urlaub über den Jahreswechsel wird jetzt überall gleich angezeigt: die Tage des gewählten Jahres und daneben der Rest im anderen Jahr, z. B. „5 T (+2 in 2027)“ statt „5 von 7 T“ – im Urlaubskonto, in „Mein Bereich“ und in den Urlaubs-PDFs.
- Beim Beantragen oder Eintragen zeigt die Vorschau, wie sich die Tage auf die Jahre verteilen, z. B. „7 Arbeitstage (5 in 2026, 2 in 2027)“. Dasselbe steht bei offenen und eigenen Anträgen.
- In den Urlaubs-PDFs überdeckte der Rahmen des Urlaubskontos die untere Zeile (Genommen, Genehmigt, Beantragt, Rest) – jetzt ist sie wieder vollständig lesbar.
- Wer eine Datei mit nicht erlaubtem Dateityp hochlädt, bekommt jetzt überall die passende Meldung (z. B. „Nur Bilder erlaubt“) statt eines allgemeinen Serverfehlers.

### Changed
- Urlaub über den Jahreswechsel, einheitliche Anzeige aus `days_by_year`: neuer Helper `frontend/src/utils/vacationDays.js` (`formatDaysInYear`, `formatOtherYears`, `formatYearSplit`) für Detail-Modal (Urlaubskonto), Mein Bereich, Offene Anträge, Meine Anträge und Antragsformular; `POST /api/vacations/check-overlap` liefert zusätzlich `daysByYear`. PDFs (`vacationReportsController`): Spalte „Tage“ zeigt den Anteil im Berichtsjahr, darunter klein die übrigen Jahre – nur diese Zeilen werden höher
- Detail-Modal (Urlaubskonto): „von …, Datum“ der Genehmigung wird bei Platzmangel gekürzt (voller Text als Tooltip) statt unter die Tagesangabe zu laufen

### Fixed
- Urlaubs-PDFs: In der Box „Urlaubskonto“ lag die zweite Wertezeile (Genommen/Genehmigt/Beantragt/Rest) auf bzw. unter dem Rahmen – Sammel-PDF (`exportAll`) um 4 pt, „Mein Jahr“ und „Mitarbeiter“ um 2 pt. Boxen erhöht (75 → 85, 85 → 93, mit Korrektur 95 → 100), folgender Inhalt rückt mit; im Sammel-PDF stehen die Werte jetzt wie in den anderen PDFs mit „Tage“
- Globaler Fehler-Handler (`server.js`) antwortete bei jedem Fehler mit 500 und gab `err.message` heraus. Jetzt: Status aus dem Fehler (body-parser: kaputtes JSON 400, Body zu groß 413, unbekannter Zeichensatz 415), `MulterError` 413 bzw. 400, deutsche Meldungen für JSON-Fehler; 4xx mit Meldung in `error` und `message` (Stores lesen teils das eine, teils das andere), 500 nur noch `Interner Serverfehler` – Details im Log. Die Dateifilter der Uploads ohne eigenen Fehler-Handler (Kalibrierungen, Vorrichtungs-, Kunden-, Spannmittel-, Maschinen-, Werkzeug-Dokumente, Einrichteblatt-Fotos, Verbrauchsmaterial, Wiki-Bilder) setzen `status = 400` – ihre Meldungen kamen bisher als 500 an
- CORS war fest auf `http://localhost:5173` eingetragen, `CORS_ORIGIN` wurde nicht gelesen. Jetzt aus `CORS_ORIGIN` (mehrere Adressen kommagetrennt, ohne Variable wie bisher `http://localhost:5173`); `"*"` oder ein leerer Wert wird mit Warnung im Log abgelehnt. `CORS_ORIGIN: "*"` aus `compose.yaml` entfernt – in Produktion laufen Frontend und API über Caddy unter derselben Adresse, Verhalten unverändert. `backend/.env.example`: 3000 → 5173

---

## [2.9.0] - 2026-10-12 - Arbeitsgänge, Rollen und Rechte

### Für Anwender
- Unter Bauteil → Arbeitsgänge zeigt jeder Arbeitsgang jetzt nur noch seine eigenen NC-Programme, Einrichteblätter und Prüfpläne. Bisher konnten bei mehreren Arbeitsgängen Einträge eines anderen Arbeitsgangs erscheinen oder ein Arbeitsgang fälschlich leer aussehen.
- Den Status eines NC-Programms (z. B. Freigabe) dürfen jetzt alle ändern, deren Rolle das Recht „Programme freigeben“ hat – bisher ging das nur mit der Rolle „programmer“.
- Im Zerobot-Rechner lassen sich Parameter, Maschinen und Backen wieder bearbeiten. Das Recht dazu („Zerobot-Parameter, Maschinen und Backen verwalten“) kann in der Benutzerverwaltung jeder Rolle gegeben werden.
- Administratoren können die vorgegebenen Rollen jetzt umbenennen und löschen, sobald ihnen niemand mehr zugeordnet ist.

### Added
- `npm run dev:init` (`backend/src/config/dev-init.js`): macht eine frisch migrierte Entwicklungs-DB benutzbar – setzt das Passwort von `admin` (verdeckte Eingabe oder `DEV_ADMIN_PASSWORD`, legt den User bei Bedarf an), weist die Rolle `admin` zu und gibt ihr alle vorhandenen Berechtigungen; wiederholbar, verweigert `NODE_ENV=production`
- Migration `1737000113000_add-tool-storage-stock-permissions`: legt `tools.*`, `storage.*` und `stock.*` (16 Berechtigungen, bisher nur in `scripts/init.sh`) an und weist sie der Rolle `admin` zu; in Produktion ohne Wirkung (`ON CONFLICT DO NOTHING`), `down` bewusst leer
- Migration `1737000114000_grant-all-permissions-to-admin`: Rolle `admin` erhält alle vorhandenen Berechtigungen – gleicht Migrationen aus, die ihre Rechte nicht (`maintenance.*`, `time_tracking.manage/settings`) oder an nicht existierende Rollennamen (`measuring.*` an `Administrator`) vergeben haben; in Produktion ohne Wirkung, `down` bewusst leer
- Migration `1737000115000_add-zerobot-manage-permission`: Berechtigung `zerobot.manage` (Zerobot-Parameter, Maschinen und Backen verwalten), der Rolle `admin` zugewiesen
- Seed: Standardrechte für die Standardrollen `helper`, `operator`, `programmer`, `reviewer`, `supervisor` (`backend/src/config/devRoleDefaults.js`, Vorlage: Zuordnung der Produktion), damit Testbenutzer auf einer frischen DB wie im Betrieb arbeiten; nie bei `NODE_ENV=production`. CLAUDE.md: Migrationen vergeben Rechte nur an `admin`

### Fixed
- `npm run seed` brach mit 42P10 ab: `ON CONFLICT (part_id, op_number)` auf `operations`, der Constraint wurde in Migration `1737000072000` entfernt. Arbeitsgänge, Programm und Wartungsplan jetzt per `WHERE NOT EXISTS` – ein zweiter Lauf erzeugt keine Duplikate mehr (vorher Arbeitsgänge, Programm/Revision, Wartungsplan/Checkliste doppelt)
- Zerobot-Rechner: Parameter ändern sowie Maschinen und Backen anlegen/löschen lieferte für alle Benutzer 403 – auch für den Admin. Die Routen verlangten `requirePermission('admin')`, eine Berechtigung `admin` gab es nie. Sie verlangen jetzt `zerobot.manage`; die Seite blendet die Bearbeiten-Funktionen über dieselbe Berechtigung ein statt über die Rolle `admin`
- Migration `1737000094000_create-cron-job-logs` nutzte den App-Pool (`src/config/db`, Variablen `DB_*`) statt der Verbindung von node-pg-migrate – bei abweichender Konfiguration landete `cron_job_logs` in einer anderen DB, außerdem lief sie außerhalb der Migrations-Transaktion. Jetzt `pgm.sql` mit identischem Schema; bereits migrierte DBs sind nicht betroffen. CLAUDE.md: Regel „Migrationen nur über `pgm`“
- Backend beendete sich nach SIGTERM nicht: der Handler stoppte nur die Cron-Jobs und schloss einen der beiden DB-Pools, der HTTP-Server blieb offen – `docker stop` wartete jedes Mal 10 s bis zum SIGKILL, und der Pool war schon zu, während noch Anfragen ankamen. Jetzt in dieser Reihenfolge: Cron stoppen, `server.close()` (laufende Anfragen werden fertig), beide Pools (`server.js` und `config/db`) schließen, `exit 0`; gilt auch für SIGINT. Notbremse nach 8 s mit `exit 1`
- Programm-Workflow: `POST /api/workflow/change` prüfte die Rolle `programmer` statt einer Berechtigung – eigene Rollen konnten den Status nie ändern, und ein Umbenennen der Rolle hätte die Freigabe für alle außer admin gesperrt. Jetzt `requirePermission('program.release')`; die Workflow-Buttons erscheinen ebenfalls nur noch mit `program.release` (vorher `part.update` – Buttons sichtbar, Aktion 403)
- **Arbeitsgänge zeigten Daten anderer Arbeitsgänge** (Bauteil → Arbeitsgänge): `programsStore`, `setupSheetsStore` und `inspectionPlansStore` hielten je eine gemeinsame Liste bzw. einen gemeinsamen Prüfplan für alle Arbeitsgänge. Weil auch zugeklappte Arbeitsgänge eingebunden bleiben und laden, erschien die zuletzt eintreffende Antwort unter allen – z. B. das Programm eines anderen Arbeitsgangs mit Download- und Workflow-Buttons, das Einrichteblatt von OP10 unter OP20 mit „Löschen“, der Prüfplan von OP20 unter OP10; „Nach oben/unten“ im Prüfplan schickte dabei die Merkmale des angezeigten (falschen) Plans. Jetzt Daten je Arbeitsgang (`programsByOperation`, `setupSheetsByOperation`, `inspectionPlanByOperation` mit Lade-/Fehlerstatus je Arbeitsgang). Außerdem: Detailansicht eines Einrichteblatts nur, wenn das geladene zum geöffneten passt; Kopfzeile im Einrichteblatt-Formular nur mit passendem Arbeitsgang; Programmhistorie las nach dem Laden die alte Liste

### Changed
- Seed: echte Firmennamen und Kontaktdaten bei Kunden und Lieferanten durch Platzhalter ersetzt (`KD00001`–`KD00003`, `*.example`)
- Seed erweitert um 5 Einträge im Werkzeugstamm (aus Migration `1737000023000`), Rüstblatt, Werkzeugliste und Prüfplan für das Beispielteil sowie optional je Rolle einen Testbenutzer (`programmer1`, `reviewer1`, `operator1`, `helper1`) – nur mit `SEED_TEST_USER_PASSWORD`, nie bei `NODE_ENV=production`. Die Audit-Beispiele aus Migration `1737000020000` werden bewusst nicht übernommen
- README/`backend/docs/DATABASE.md`: Admin-Passwort `admin123` stimmte nicht (Hash der ersten Migration passt nicht dazu); Ablauf `migrate:up` → `dev:init` → `seed` dokumentiert, Hinweis dass `scripts/init.sh` das Admin-Passwort bei jedem Lauf zurücksetzt
- `scripts/init.sh`: legt keine Berechtigungen mehr an (doppelte Liste entfernt, das übernehmen die Migrationen, die `deploy.sh` bei jedem Deploy ausführt). Admin-Passwort `admin123` nur noch beim ersten Lauf (Admin neu bzw. noch mit dem Platzhalter-Hash aus der ersten Migration); ein bestehendes Passwort bleibt, Zurücksetzen nur mit `ADMIN_PASSWORD_RESET=1`. Fehler beim Anlegen des Admins brechen das Skript jetzt ab (vorher Exit 0 und „Installation abgeschlossen“). DEPLOYMENT.md, README, `backend/docs/DATABASE.md` angepasst
- CLAUDE.md: Regel „Berechtigungen nur per Migration, in derselben Migration der Rolle `admin` zuweisen“
- Rollenverwaltung: Standardrollen (`programmer`, `reviewer`, `operator`, `helper`, `supervisor`) lassen sich umbenennen und – ohne zugeordnete Benutzer – löschen; geschützt bleibt nur `admin` (Frontend und `DELETE /api/roles/:id`)

### Removed
- Testdaten aus Migrationen: `1737000005000_seed-test-customers` und `1737000020000_seed-comprehensive-testdata` sind jetzt leer (`up`/`down` ohne Wirkung), in `1737000023000_create-tool-master` entfallen die Beispielwerkzeuge. Eine frisch migrierte DB enthält nur noch Stammdaten und den User `admin`; Testdaten kommen ausschließlich über `npm run seed` (in Produktion optional über `scripts/init.sh`). Bereits migrierte DBs sind nicht betroffen – node-pg-migrate führt gelaufene Migrationen nicht erneut aus

---

## [2.8.0] - 2026-10-11 - Urlaubsberechnung und eigene Anträge

### Für Anwender
- Eigene Urlaubsanträge lassen sich unter „Mein Bereich“ → „Meine Anträge“ jetzt selbst ändern oder zurückziehen, solange sie noch nicht genehmigt sind.
- Urlaubstage werden genauer berechnet: Urlaub über den Jahreswechsel wird auf beide Jahre aufgeteilt, Feiertage werden immer berücksichtigt, und Heiligabend und Silvester zählen als halber Urlaubstag.
- Zeitnachweise zeigen das Urlaubskonto zum Ende des gewählten Monats und berücksichtigen Korrekturen und Auszahlungen; auch die Urlaubs-PDFs enthalten jetzt Korrekturen am Anspruch.
- In der Urlaubsverwaltung passt der Resturlaub immer zum angezeigten Jahr, das sich direkt neben „Resturlaub“ wechseln lässt.
- Deaktivierte Maschinen werden in Auswahlfeldern nicht mehr angeboten, und ein Fehler beim Erstellen eines PDFs startet das MDS nicht mehr neu.

### Added
- Eigene Urlaubsanträge bearbeiten/zurückziehen: `PUT /api/vacations/:id/own` (Art, Zeitraum, Uhrzeit, Notiz; nur eigene, Status `pending`/`rejected`, abgelehnte werden dabei erneut eingereicht) und `POST /api/vacations/:id/withdraw` (setzt Status `cancelled`), beide mit `vacations.read`; Buttons „Bearbeiten“ und „Zurückziehen“ in „Meine Anträge“, `.http`-Szenarien EA-1 bis EA-15
- `countWorkingDaysByYear` in `utils/workingDays.js` + 6 Tests; `.http`-Szenarien JW-1 bis JW-18 in `test-vacations.http`

### Changed
- `GET /api/vacations` liefert zurückgezogene Anträge (`cancelled`) nur noch bei ausdrücklichem `status=cancelled`; „Meine Anträge“ aktualisiert nach Aktionen auch Saldo und Abwesenheiten
- ROADMAP: Idee „Texte gestalten (Rich-Text-Editor)“, Fix-Liste um Urlaub über den Jahreswechsel, eigene Anträge bearbeiten, deaktivierte Maschinen in Auswahllisten, Wartungspläne kopieren, Rollenfarben/-deaktivierung und Berechtigungen per Migration ergänzt

### Fixed
- Zeitnachweis-PDFs (`exportPayrollPDF`, `exportPayrollAllPDF`): Urlaubskasten las `vacation_balances` und damit den Stand zum Druckdatum (genommen/genehmigt nach `CURRENT_DATE`, alle geplanten Tage vom Rest abgezogen). Jetzt Stichtag Monatsende (`getPayrollVacation`): genommen = genehmigter Urlaub bis Stichtag (über das Monatsende anteilig), Rest = Verfügbar − genommen, danach genehmigt/beantragt als Info; Korrektur angezeigt. „Saldo neu“ ohne Korrektur/Auszahlung des Monats – jetzt Saldo Vormonat + Überstunden + `adjustment_minutes` − `payout_minutes` aus `time_balances` mit eigenen Zeilen (`getPayrollTimeAccount`). Kästen beider Exporte in `drawPayrollBoxes` zusammengeführt
- Urlaubs-PDFs: Mitarbeiter-PDF (`exportMyYear`) und Gesamt-PDF (`exportAll`) rechneten „Verfügbar“/„Rest“ ohne `adjustment`. Alle drei Urlaubs-PDFs lesen den Saldo jetzt aus der View `vacation_balances` (wie die Oberfläche) statt aus je eigenen Teilabfragen; Korrektur wird angezeigt (Kasten: „Korrektur“ wenn ≠ 0 und „Verfügbar“, Gesamttabelle: Spalte „Korr.“)
- Urlaubsverwaltung: Salden blieben nach einem Jahreswechsel im Kalender auf dem Jahr des Seitenaufrufs (nur `initialize` lud sie), und Einstellungen → Urlaubsansprüche überschrieb sie mit dem dort gewählten Jahr – Überschrift, Detail-Modal und Export zeigten ein anderes Jahr als Salden-Karten und Kacheln. `vacationsStore`: `balancesYear`, veraltete Antworten werden verworfen, `setFilters` lädt Salden bei Jahreswechsel nach; Verwaltung lädt nach, wenn `balancesYear` ≠ angezeigtes Jahr. Jahreswechsel-Pfeile neben „Resturlaub“, Kacheln mit Jahr beschriftet
- Urlaubstage: halbe Feiertage (`is_half_day`, Heiligabend/Silvester) zählten als ganz frei (0 Tage), die Zeiterfassung rechnet dort aber mit halbem Soll. Jetzt 0,5 Tage, wenn laut Zeitmodell Arbeitstag (`countWorkingDays`/`countWorkingDaysByYear` mit Parameter `halfDayHolidays`). Migration `1737000112000` ergänzt bestehende Urlaube mit halben Feiertagen ab 01.01.2026 um je +0,5 (`calculated_days`, `days_by_year`; ältere Jahre unverändert, Urlaube mit erst später angelegtem Feiertag werden übersprungen und gemeldet); 5 Unit-Tests, `.http`-Szenarien HT-1/HT-2
- PDF-Exporte: Fehler nach `doc.pipe(res)` führten im `catch` zu `res.status(500).json()` auf eine bereits laufende Antwort → `ERR_STREAM_WRITE_AFTER_END`, Absturz des Backend-Prozesses. Neu `utils/pdfResponse.js` (`pipePdf`, `abortPdfResponse`: Stream abkoppeln, Verbindung abbrechen) in allen 11 gestreamten PDF-Endpunkten (Urlaub 3, Zeitnachweis/Zeitsalden 3, Reports 3, Messmittel 2); Test `backend/tests/test-pdf-response.js`
- Maschinen-Auswahl: Bearbeiten-Formulare blendeten eine zugeordnete, inzwischen deaktivierte Maschine aus (Anzeige „Keine Maschine“, obwohl zugeordnet), Rüstblatt und Wartungsplan boten inaktive Maschinen an. Neue Hilfsfunktion `selectableMachines` (aktive + bereits zugeordnete, Zusatz „(inaktiv)“) in Arbeitsgang, Einrichteblatt, Spannmittel, Vorrichtung, Wiki, Wartungsplan; Filter der Wartungsplan-Liste markiert inaktive. Vorrichtungs-Formular zeigte vor jeder Maschine „: “ (nicht vorhandenes Feld `machine.machine_id`)
- Urlaubstage: Feiertage eines Jahres wurden erst beim Aufruf des Kalenders erzeugt (`GET /api/holidays`). Fehlten sie bei der Berechnung, zählten Feiertage als Urlaubstage – dauerhaft gespeichert, auch nach späterem Erzeugen/Initialisieren. Jetzt erzeugt `calculateWorkingDaysByYear` fehlende Jahre vorab (`ensureHolidaysForYear`), für Anlegen, Antrag, Bearbeiten, erneutes Einreichen und Vorschau; `.http`-Szenarien FT-1 bis FT-3
- Urlaub über den Jahreswechsel: Tage werden je Kalenderjahr aufgeteilt (neue Spalte `vacations.days_by_year`, Migration mit Backfill). `vacation_balances`, Übertrag beim Initialisieren, die drei PDF-Reports sowie die Jahresfilter von `GET /api/vacations` und `/my-requests` rechnen mit dem Anteil des Jahres statt nach Startjahr; Listen liefern `days_in_year`
- Terminal-Benutzerinfo (`/api/time-tracking/entries/user-info`): Resturlaub war immer leer – Abfrage auf nicht existierende View `vacation_balances_view`

### Removed
- `backend/tests/seed-storage-permissions.js` und `test-reset-password.js` – überholt durch `scripts/init.sh` (legt Berechtigungen an, setzt Admin-Passwort zurück); enthielten fest eingetragene Zugangsdaten der Entwicklungs-DB

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
