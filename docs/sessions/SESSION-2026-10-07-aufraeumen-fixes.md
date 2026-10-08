# Session 07. Oktober 2026 (Abend) – Aufräumen, Roadmap, Fixes

**PRs:** #89 – #95 (alle gemergt) · **Kein Release** – nächstes Release 2.7.0 mit Sonderschritten (siehe unten)

---

## Erledigt

| PR | Inhalt |
|---|---|
| #89 | Repo aufgeräumt: Konzepte aus dem Root nach `docs/konzepte/` (`ARCHITECTURE.md` → `MARKTANALYSE.md`), erledigte Feature-Dokus nach `docs/archiv/`, 46 alte Session-Dokus nach `docs/sessions/archiv/`, `test-programs*.http` / `test-parts*.http` zusammengeführt |
| #90 | README neu (693 → 133 Zeilen, ohne Fortschrittsangaben), `QUICKSTART.md` + `CONTRIBUTING.md` entfernt |
| #91 | ROADMAP aufgeräumt (915 → 469 Zeilen): Abschnitt „Offene Fixes“, Lager-Architektur als offene Entscheidung (A/B/C), Rohmaterial/Normteile in die Ideen, Shopfloor-Terminals (Phase 10) vor Auftragsverwaltung (Phase 11), NC-Parser in „TopSolid-Integration & NC-Programme“, Erledigtes ins Archiv |
| #92 | **Urlaub:** Urlaubstage nach Zeitmodell (Arbeitstag = Soll > 0, ohne Modell Mo–Fr) – freie Tage bei 4-Tage-Woche wurden abgezogen. Zeitmodell-Formular: Checkbox „Arbeitstag“ je Wochentag inkl. Sa/So. Bestehende Einträge nicht neu berechnet |
| #93 | **Custom-Fields:** „Option hinzufügen“ bei Dropdown stürzte ab (`Trash2` nicht importiert, auch Werkzeug-Kategorien); gleicher Fehler im Verbrauchsmaterial-Upload (`X`) |
| #94 | **`deploy.sh`:** Migration vor dem Umschalten (`docker compose run --rm` mit neuem Image), Abbruch bei Fehler – alte Version läuft weiter; strenger Health-Check; `init.sh` ausführbar |
| #95 | **Lockfiles** eingecheckt, `npm ci` in Dockerfile und Deploy; ESLint `react/jsx-no-undef`; [Release-Checkliste](../RELEASE-CHECKLISTE.md) |

## Entscheidungen

- **Arbeitstag = Soll-Zeit > 0** – eine Regel für Zeiterfassung und Urlaub, keine eigenen Aktiv-Spalten (Checkbox ist nur Bedienung)
- Teilzeit mit **wechselndem** freien Tag bleibt Workaround → Workforce-Konsolidierung (Technical Debt)
- Lager-Architektur bleibt offen, Entscheidung **vor** Rohmaterial/Normteile
- Deploy-Backup vor Migration (Option C) nur notiert, nicht umgesetzt

## Tests (alle selbst durchgeführt)

- Urlaub: 12 Unit-Tests (`backend/tests/test-working-days.js`, auch `TZ=UTC`), 12 API-Szenarien mit temporärem 4-Tage-Modell, Gegenprobe gegen alten Code (8× rot), Browser-Test Zeitmodell-Formular
- Custom-Fields: Absturz reproduziert, nach Fix Maschinentypen / Werkzeug-Kategorien / Verbrauchsmaterial-Upload im Browser geprüft, Scan aller `.jsx` auf fehlende Imports
- `deploy.sh`: Harness mit Stubs (ok / Migration-Fehler / Health-Fehler) in isolierter Kopie
- Lockfiles: `npm ci` in sauberen Kopien, `docker build backend` lokal (x86), ESLint vorher/nachher gleich (270 Fehler / 118 Warnungen)

## Hinweise / Lehren

- **Test-Harness unter Git Bash:** Windows-Pfade (`C:/…`) in `PATH` werden am Doppelpunkt zerlegt → Stubs greifen nicht. POSIX-Pfade (`/c/…`) verwenden und Skripte mit Seiteneffekten (git, docker) nur in einer Kopie **ohne `.git`** testen. (Beim ersten Versuch hat das echte `deploy.sh` per Autostash gestasht – vollständig wiederhergestellt.)
- `gh pr create` lieferte zeitweise HTTP 500 von GitHub → PR im Browser angelegt; später ging es wieder
- ESLint erkennt ohne `eslint-plugin-react` keine fehlenden JSX-Komponenten – jetzt per `react/jsx-no-undef` abgedeckt

## Offen

- **Release 2.7.0** nach [docs/RELEASE-CHECKLISTE.md](../RELEASE-CHECKLISTE.md): DB- + Frontend-Backup, alte ungetrackte Lockfiles auf dem Pi löschen, einmal manuell `git pull`, dann `deploy.sh`; danach Nachkontrolle (4-Tage-Urlaubsvorschau, Checkbox „Arbeitstag“, Dropdown-Optionen)
- Fix-Liste (ROADMAP „Offene Fixes“): ESLint aufräumen (inkl. `Sidebar.jsx`), `deploy.sh` Backup vor Migration / Frontend-Build in Temp-Ordner / `git stash pop || true`, `.migrationrc.json`, `backup.sh` ohne `pipefail`
- Aus der Vorsession weiter offen: `_lokal/topsolid/` privat sichern, NC-Viewer-Rechtsklick am Arbeitsplatz, PI-SETUP.md im Terminal-Repo prüfen

## Nächste Session

1. **Release 2.7.0** nach Checkliste (auf Zuruf „Release machen“)
2. Danach: restliche Fixes **oder** TopSolid-Werkzeugimport Phase 1 (siehe ROADMAP „Nächste Session“)

---

## Nachtrag 08. Oktober 2026 – Releases 2.7.0 + 2.7.1, Backup-Fund

**PRs:** #97 – #100 · **Releases:** v2.7.0 und v2.7.1 deployt (Tags gepusht)

| PR | Inhalt |
|---|---|
| #97 | Sicherheits-Updates ohne Breaking Changes (`npm audit fix`): express 4.22.3 (kritische Lücke `proxy-addr`), axios, vite, react-router-dom u. a.; Lücken Backend 16 → 5, Frontend 29 → 9 |
| #98 | Release **v2.7.0** – Urlaub nach Zeitmodell & sicherer Deploy |
| #99 | **Nacht-Backups waren leer** → `backup.sh` (Repo-Ordner, `pipefail`, Prüfung Größe + Endmarke, Aufräumen nur nach Erfolg) + Backup-Monitor im MDS prüft inhaltlich und meldet Fehler rot |
| #100 | Release **v2.7.1** – Datensicherung repariert |

### Deploy 2.7.0 auf dem Pi (per Remote Control vom Firmenlaptop begleitet)
- Sonderschritte nach Checkliste: Backup, Frontend-Sicherung, altes ungetracktes `frontend/package-lock.json` (vom 29.01.) gelöscht, manuell `git pull`, dann `deploy.sh` → Migrationen ok, Health 2.7.0, Nachkontrolle ok
- Offene Tabs / Web-App zeigten erst nach Reload die neue Version (normal für SPA) → Idee „Neue Version verfügbar“ auf der Fix-Liste

### Backup-Fund
- `backup.sh` lief per **root-Crontab** (`30 2 * * *`) in `/root` → `no configuration file provided`, `pg_dump` lief nie, `gzip` schrieb **20-Byte-Dateien**, ohne `pipefail` trotzdem „✅“. `backup.log` mit über 1200 Zeilen – über lange Zeit **kein brauchbares Backup**
- Der Backup-Monitor im MDS zeigte dabei „✓ 9 Backups, neuestes 0.0 MB“ (prüfte nur Existenz + Alter)
- Manuelles Backup vor dem Deploy ins Home-Verzeichnis (`~/mds_backup_vor_2.7.0.sql.gz`, 711 KB, 101 Tabellen, Endmarke ok)
- Nach #99: `git pull` + `sudo ./scripts/backup.sh` → 712 KB geprüft, leere Dateien entfernt; nach Deploy 2.7.1 Monitor grün „✓ 2/2 gültig“
- Endmarke: neuere `pg_dump` schreiben nach „dump complete“ noch `\unrestrict <Schlüssel>` – normal

### Offen
- **Morgen:** `tail -4 /srv/mds/backups/backup.log` → erster Nachtlauf mit „✅ … geprüft“; Monitor 03:00 grün
- **Backup-Konzept** in 3 Ebenen (DB, Uploads + `.env`, Pi-Image) aufs Netzlaufwerk – Ziel klären; Details auf der Fix-Liste
- `restore.sh` wie `backup.sh` absichern; Stash vom 01.12.2025 auf dem Pi sichern + entfernen; `~/mds-dist-2.6.0` löschen, wenn 2.7.x stabil
- Restliche Fix-Liste (ESLint aufräumen, Major-Updates multer/exceljs/chokidar, Fehler-Handler 400 statt 500, `deploy.sh`-Kleinkram, Hinweis „Neue Version verfügbar“)

### Später am 08.10. – Planung und Ideen (PRs #102 – #105)

| PR | Inhalt |
|---|---|
| #102 | Backup-Konzept Ebene 3b: Images der Terminals (Zeit-Terminal, künftige Shopfloor-Terminals) |
| #103 | Phase 10: Architektur je Terminal-Typ als offene Entscheidung (Kiosk-Browser / lokaler Dienst + Web-Oberfläche / eigene App); Maschinen-Terminal braucht voraussichtlich lokalen Dienst. Backup 3b: Basis → Image je Typ → Konfig je Gerät |
| #104 | Gestaltungsidee Maschinen-Terminal angelehnt an TNC 640 (Statuszeile, Betriebsarten, Softkeys, Touch + F-Tasten) + [klickbares Mockup](https://claude.ai/artifact/14mBps9zgedsokXc6YB1of) |
| #105 | Idee Rich-Text-Editor; Fix-Liste: Urlaub über Jahreswechsel, eigene Anträge bearbeiten, deaktivierte Maschinen, Wartungspläne kopieren, Rollenfarben, Berechtigungen per Migration; überholte Skripte `seed-storage-permissions.js` / `test-reset-password.js` entfernt (→ `init.sh`) |

- Remote Control für den Pi-Deploy vom Firmenlaptop aus hat gut funktioniert (Ausgaben per Screenshot/Kopie direkt in die Session); danach wieder ausgeschaltet
- Mockup ist privat; zum Zeigen erst über das Teilen-Menü freigeben

## Nächste Session

1. **Backup-Kontrolle:** `tail -4 /srv/mds/backups/backup.log` (erste Nachtläufe mit „✅ … geprüft“), Backup-Status im MDS grün
2. **Urlaub über den Jahreswechsel** (Fix-Liste) – falsche Zahlen im Urlaubskonto, vor dem nächsten Jahreswechsel lösen
3. Danach: eigene Anträge bearbeiten / deaktivierte Maschinen, oder TopSolid-Werkzeugimport Phase 1
4. Sobald das Netzlaufwerk geklärt ist: Backup-Konzept umsetzen
