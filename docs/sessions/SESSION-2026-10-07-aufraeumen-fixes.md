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
