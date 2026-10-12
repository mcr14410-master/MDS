# Session 11./12. Oktober 2026 – Dev-DB, Rechte, Arbeitsgänge, Release 2.9.0

**PRs:** #118 – #129 (alle gemergt) · **Release 2.9.0** auf dem Pi (Tag `v2.9.0`) · außerdem task-app#39, mds-time-terminal#6 · Arbeit auf dem Dev-Server `homepi`

Ausgangspunkt war die Einrichtung des Dev-Servers: Eine frisch aufgesetzte Datenbank war ohne Handarbeit nicht nutzbar. Beim Beheben kamen der Reihe nach Rechte-, Rollen- und Frontend-Fehler zum Vorschein, die auch die Produktion betrafen.

---

## Erledigt

| PR | Inhalt |
|---|---|
| #118 | **Frische Dev-DB ohne Handarbeit:** `npm run seed` brach mit 42P10 ab (`ON CONFLICT` auf entfernten Constraint) und war nicht wiederholbar → `WHERE NOT EXISTS`; neues `npm run dev:init` (Admin-Passwort, Rolle admin, alle Rechte); Migration `113` legt `tools.*`/`storage.*`/`stock.*` an (gab es nur über `init.sh`); Admin-Passwort-Doku korrigiert (Hash der ersten Migration passt nicht zu `admin123`); Platzhalter statt echter Firmennamen im Seed |
| #119 | **Testdaten nur noch über den Seed:** Migrationen `005`/`020`/`023` geleert (frisch migrierte DB enthält nur Stammdaten und `admin`); Seed erweitert um Werkzeugstamm, Rüstblatt, Werkzeugliste, Prüfplan, Testbenutzer je Rolle nur mit `SEED_TEST_USER_PASSWORD` und nie in Produktion |
| #120 | **Berechtigungen nur per Migration:** Migration `114` gibt der Rolle admin alle Rechte (gleicht `050`/`079`/`091` aus, die Rechte nicht oder an falsche Rollennamen vergaben); `init.sh` ohne eigene Rechte-Liste, Admin-Passwort nur beim ersten Lauf bzw. mit `ADMIN_PASSWORD_RESET=1`, Fehler brechen ab |
| #121 | **Zerobot** ließ sich von niemandem bearbeiten (`requirePermission('admin')`, Berechtigung existierte nicht) → `zerobot.manage` (Migration `115`) |
| #122 | ROADMAP-Fix-Liste ergänzt |
| #123 | Migration `094` lief über den App-Pool (`DB_*`) statt über `pgm` |
| #124 | **Backend fährt sauber herunter:** SIGTERM-Handler schloss den HTTP-Server nie → `docker stop` wartete 10 s bis SIGKILL; jetzt `server.close()`, beide DB-Pools, Notbremse 8 s |
| #125 | Seed: Standardrechte der Standardrollen (`config/devRoleDefaults.js`, Vorlage Produktion) für realistische Testbenutzer |
| #126 | **Workflow per Berechtigung:** Programm-Statuswechsel prüfte die Rolle `programmer` statt `program.release` (Buttons dagegen `part.update`); Standardrollen umbenenn- und löschbar, nur `admin` geschützt |
| #127 | **Arbeitsgänge zeigten Daten anderer Arbeitsgänge:** Programme, Einrichteblätter und Prüfpläne lagen je in einem gemeinsamen Store-Feld; die zuletzt geladene Antwort erschien unter allen Arbeitsgängen (inkl. Download-, Workflow- und Löschen-Buttons) → Daten je Arbeitsgang |
| #128 | Release 2.9.0 |
| #129 | Release-Checkliste: 2.9.0 erledigt |

Außerhalb des MDS: **task-app#39** (`backend/mvnw` ausführbar), **mds-time-terminal#6** (NFC-Mock-Modus auf dem Pi 5 ohne `lgpio` statt Absturz).

## Release 2.9.0 auf dem Pi

- Backup, Deploy ohne Befund; Migrationen `113` – `115` gelaufen, die geänderten alten Migrationen wie erwartet nicht erneut
- Zerobot-Recht den benötigten Rollen gegeben, Programm-Freigabe für `reviewer`/`supervisor` bestätigt, Klicktest Arbeitsgänge ohne Befund
- `docker compose restart backend` 1,0 s statt 10 s (beim Deploy selbst noch das alte Verhalten – dort wurde 2.8.0 gestoppt)

## Entscheidungen

- **Frisch migrierte DB ist leer** (Stammdaten + `admin`), Testdaten nur über `npm run seed`. Alte Migrationen inhaltlich geleert statt einer Lösch-Migration – gelaufene DBs bleiben unberührt, keine Gefahr für Produktionsdaten
- **Berechtigungen nur per Migration und nur an `admin`.** Andere Rollen werden in Produktion über die Benutzerverwaltung gepflegt; eine Migration würde dort ungewollt Rechte hinzufügen. Standardrechte für Dev/Test stehen im Seed
- **Code prüft Rechte, nicht Rollennamen** (Zerobot, Workflow) – einzige Ausnahme bleibt `admin`
- Workflow: `program.release` für alle Statuswechsel (feinere Aufteilung hätte nur eine Rolle ohne Benutzer betroffen)
- Stores je Arbeitsgang statt Filtern – Filtern allein hätte Arbeitsgänge weiter leer erscheinen lassen

## Hinweise / Lehren

- **Zustand-Stores:** Mehrere gleichzeitig eingebundene Komponenten teilen sich Store-Felder. Listen, die zu einem Elternobjekt gehören (Arbeitsgang, Bauteil …), immer nach dessen ID ablegen. Zugeklappte Akkordeon-Inhalte bleiben eingebunden (nur per CSS versteckt) und laden trotzdem
- **Migrationen nur über `pgm`** (Regel in CLAUDE.md). Für Tests mit einer Wegwerf-DB `DATABASE_URL` **und** `DB_*` setzen – Migration `094` lief sonst gegen die Dev-DB (ohne Schaden, nur `IF NOT EXISTS`)
- **Admin-Passwort zurücksetzen** nur noch mit `ADMIN_PASSWORD_RESET=1 ./scripts/init.sh`
- **UI-Tests gegen eine Wegwerf-DB:** zweite Vite-Instanz mit `VITE_API_URL` auf das Test-Backend; CORS ist in `server.js` fest auf `http://localhost:5173` (Fix-Liste)
- Test-Backends mit echten Upload-Ordnern nie über 03:30 laufen lassen (Aufräum-Job für verwaiste Dateien) bzw. `FS_GC_DRY_RUN=true`
- Nach „ist gemergt“ den PR-Status hart prüfen, bevor Branches gelöscht werden – ein gelöschter Remote-Branch hat #127 kurzzeitig geschlossen (wieder geöffnet, kein Verlust)

## Offen

Siehe ROADMAP „Offene Fixes“ (neu: CORS aus `.env` lesen, Rollen deaktivieren/Farben je Rolle) und „Nächste Session“.
