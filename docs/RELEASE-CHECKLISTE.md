# Release-Checkliste

Release = Deployment auf den Pi. Ablauf und Versionsregeln: [CLAUDE.md](../CLAUDE.md) („Versionierung“),
Details zum Deploy-Script: [DEPLOYMENT.md](../DEPLOYMENT.md).

---

## Allgemeiner Ablauf (jedes Release)

1. Am PC: „Release machen“ (CHANGELOG, Versionen, Release-PR, Tag) – siehe CLAUDE.md
2. Auf dem Pi:
   ```bash
   cd ~/mds
   sudo ./scripts/backup.sh          # endet mit „✅ Backup erstellt und geprüft“, sonst NICHT deployen
   git status                        # muss sauber sein
   ./scripts/deploy.sh 2>&1 | tee ~/deploy-X.Y.Z.log
   ```
   `deploy.sh` sichert die DB inzwischen selbst direkt vor der Migration und baut das Frontend erst in
   `.cache/frontend-dist`. Das gilt erst ab dem Deploy **nach** dem Release, das diese Version von
   `deploy.sh` ausliefert (der laufende Deploy nutzt noch das alte Skript) – bis dahin das manuelle Backup
   oben nicht weglassen. Danach ist es optional (doppelt schadet nicht).
3. Auf `✅ Deploy abgeschlossen!` und die richtige Version im Health-Check achten
4. Geöffnete Browser-Tabs / Web-App einmal neu laden (`Strg+F5`), dann kurz prüfen: Login, „Was ist neu“, die geänderten Funktionen

**Wenn etwas schiefgeht**
| Meldung | Bedeutung / Vorgehen |
|---|---|
| `❌ Migration fehlgeschlagen` | Alte Version läuft weiter. Fehlermeldung darüber lesen |
| `npm ci` bricht ab | Lockfile passt nicht zu `package.json` → nicht mit `npm install` umgehen, Ursache klären |
| `❌ Backup fehlgeschlagen` | Noch nichts geändert, alte Version läuft weiter. Meldung von `backup.sh` darüber lesen |
| `❌ Lokale Änderungen passen nicht zum neuen Stand` / `❌ git stash fehlgeschlagen` | Alte Version läuft weiter. `git status` zeigt die Dateien, Änderungen liegen im Stash (`git stash list`) |
| `❌ Frontend-Build fehlgeschlagen` | Bisheriges Frontend bleibt, Migrationen sind aber schon gelaufen (altes Backend läuft weiter). Mit der alten `deploy.sh` (siehe oben) kann `frontend/dist` leer sein → vorher `cp -a frontend/dist ~/mds-dist-backup` und im Notfall `cp -a ~/mds-dist-backup/. frontend/dist/` |
| `❌ Health-Check fehlgeschlagen` | `docker compose logs --tail=50 backend` |
| Daten kaputt | `./scripts/restore.sh /srv/mds/backups/mds_backup_….sql.gz` |

---

## Nächstes Release – zusätzliche Schritte

Hier Prüfpunkte sammeln, die beim nächsten Deploy zusätzlich anfallen (Migrationen, Datenkorrekturen, Klicktests).

**Release 2.13.0** – Zeitmodell-Spalte entfernt (#186, Migration `1737000120000`), `deploy.sh` abgesichert (#187), `restore.sh`, `.migrationrc.json`, Sidebar-ESLint (#188), Versionshinweis und Caddy-Header für Deep-Links (#189). **Änderung an `Caddyfile` und den Skripten** – dieser Deploy läuft noch mit der alten `deploy.sh`, also manuelles Backup (Schritt 2) und vorher `cp -a frontend/dist ~/mds-dist-backup`.

- [x] Vor dem Release (21.10.): in Produktion geprüft, dass kein Mitarbeiter ein Zeitmodell nur in `users.time_model_id` hat (0 Zeilen)
- [ ] Vor dem Deploy: einen Browser-Tab mit dem MDS (gern auf einer Unterseite wie Bauteile) offen lassen – für den Versionshinweis
- [ ] Deploy-Log: Migration `1737000120000_drop-users-time-model-id` gelaufen
- [ ] **Caddy neu starten** (nicht nur `reload`): `docker compose restart caddy` – der Container sieht nach `git pull` sonst weiter das alte `Caddyfile` (Einzeldatei als Bind-Mount behält die alte Datei; getestet 21.10.). Danach `curl -sI http://localhost:81/parts/12 | grep -i cache-control` → `no-store`
- [ ] Offener Tab von vorhin: spätestens beim Zurückwechseln zeigt er „Neue MDS-Version 2.13.0 verfügbar“, „Neu laden“ → Sidebar unten zeigt v2.13.0
- [ ] Urlaub & Arbeitszeit → Verwaltung → Einstellungen → Mitarbeiter: Zeitmodell-Spalte und Verlauf zeigen dieselben Modelle wie vorher, Speichern geht; „Zeiterfassung ab“ unverändert
- [ ] Sidebar: Menüs auf- und zuklappen, Eskalations-Abzeichen (falls vorhanden) erscheint
- [ ] Noch von 2.12.0: am Handy Urlaub & Arbeitszeit → Verwaltung → Einstellungen → Mitarbeiter – kein seitliches Wackeln der Seite, Mitarbeiter aufklappen, Zeitmodell-Verlauf und Speichern erreichbar (Test in der Firma)
- [ ] Noch von 2.11.0: bei der nächsten gelöschten oder geänderten genehmigten Abwesenheit passt der Tageswert danach (gelöschter Urlaubstag → fehlende Buchung, außer es wurde gestempelt)

---

## Erledigt: Release 2.12.0 (17.10.2026)

Kalender-Tooltip (#178), Vorschau Zeitmodell-Verlauf ohne „1 → 1“ (#179), Mitarbeiter-Einstellungen am Handy (#180), Audit-Log-Zeitstempel (#181). Deploy ohne Befund, Migration `1737000119000_audit-logs-timestamptz` gelaufen, Prüfpunkte grün (Aktivitäten-Uhrzeiten, Kalender-Tooltip). Vorab in Produktion geprüft: nur `user_time_model` (4 Einträge vom 16.10.) stand in Berliner Zeit, alles andere in UTC (auch `part` – `partsController` hat einen eigenen Pool); die erste Fassung der Migration hätte Teile-Einträge verschoben. Offen: Test am Handy (oben).

---

## Erledigt: Release 2.11.0 (16.10.2026)

Deploy ohne Befund, Migration `1737000118000_add-role-color` gelaufen. Umbenannte und selbst angelegte Rollen eingefärbt, Abzeichen in Benutzerliste und Profil passen, Klicktests Verwaltung (Einstellungen → Mitarbeiter, Zurück aus dem Zeitkonto) und Kalender („+N mehr“) bestanden.

Nacht-Lauf seit 2.10.0 kontrolliert (17.10.): `auto_close_open_days` vom 12.10. bis 17.10. jede Nacht genau einmal um 02:00, `success`, je 8 Mitarbeiter verarbeitet, keine Fehler oder Warnungen – vor und nach 2.10.0 gleich.

---

## Erledigt: Release 2.10.1 (16.10.2026)

Deploy ohne Befund. Geklärt (16.10.): Mitarbeiter 13 hatte im April die Montage frei, gerechnet wurde noch nach „Fr. frei“, ausgeglichen mit Überstundenabbau an den Montagen (Workaround) – alle Apriltage nach „Fr. frei“ gespeichert, ab Mai nach „Mo. frei“. Verlauf daher korrigiert: „Mo. frei“ ab 01.05. statt 01.04. (Vorschau 0 Tage, Saldo ±0; 27.04. nur Status Zeitausgleich → Überstundenabbau, die Art des Eintrags war später geändert worden). Überstundenabbau-Einträge bleiben stehen. Nachtrag Mitarbeiter 13: „4-Tage 32h (Fr. frei)“ ab 01.01.2026 – Vorschau „keine gespeicherten Tage oder Urlaube betroffen“, übernommen. Kontrolle: Verlauf Modell 2 ab 01.01., Modell 3 ab 01.04.; Tage vor April unverändert (21 Tage, Soll 9120 min, Saldo +777 min).

---

## Erledigt: Release 2.10.0 (16.10.2026)

Deploy ohne Befund, Migration `1737000117000` gelaufen, je Mitarbeiter mit Zeitmodell ein Verlaufseintrag ab „ab“-Datum (8 Mitarbeiter).

- Die Prüfabfrage „vor dem Release“ aus dieser Liste nutzte `user_time_models` – die Tabelle legt erst die Migration an. Richtige Fassung vor dem Deploy (das „ab“-Datum wie die Migration aus `users`):
  ```bash
  docker compose exec -T db psql -U mds mds <<'EOF'
  WITH f AS (SELECT id AS user_id, COALESCE(time_tracking_start_date, created_at::date) AS ab
             FROM users WHERE time_model_id IS NOT NULL)
  SELECT 'Tageswerte' AS art, s.user_id, f.ab, min(s.date) AS von, max(s.date) AS bis, count(*) AS anzahl
  FROM time_daily_summary s LEFT JOIN f USING (user_id)
  WHERE f.ab IS NULL OR s.date < f.ab GROUP BY s.user_id, f.ab
  UNION ALL
  SELECT 'Urlaube', v.user_id, f.ab, min(v.start_date), max(v.end_date), count(*)
  FROM vacations v JOIN f USING (user_id)
  WHERE v.status IN ('approved', 'pending') AND v.start_date < f.ab
  GROUP BY v.user_id, f.ab
  ORDER BY 1, 2;
  EOF
  ```
- Befund: Urlaub um den 02./05.01. vor dem „ab“-Datum bei 6 Mitarbeitern (nur Urlaubstage, Saldo 0 – unkritisch). **Mitarbeiter 13** („ab“ 01.04., Modell Mo. frei): 17 gestempelte Tage (+20:57 h) und 1 Überstundenabbau (−8:00) vor dem 01.04., gespeichert mit Soll nach „4-Tage 32h (Fr. frei)“ – ohne Verlaufseintrag würde eine Neuberechnung dort ohne Soll rechnen. Nachtrag des Modells ab 01.01.2026 → in der Vorschau zeigte sich ein Fehler (veraltete Abwesenheiten mitgeändert), Nachtrag abgebrochen, Fix in 2.10.1

---

## Erledigt: Release 2.9.5 (15.10.2026)

Deploy ohne Befund, keine npm-Warnung mehr. Nur Rechenlogik (Krank nach Arbeitsbeginn, halber Arbeitstag an Heiligabend/Silvester) – die fachlichen Prüfpunkte kommen später und stehen in der ROADMAP („Nächste Session“): Mitarbeiter vor Weihnachten informieren, 24.12./31.12. prüfen, nächste Krankmeldung nach Arbeitsbeginn ±0.

---

## Erledigt: Release 2.9.4 (14.10.2026)

Deploy ohne Befund, nur Frontend. Mitarbeiter-Einstellungen mit Speichern/Abbrechen bestätigt. Beim Frontend-Build einmalig `npm warn tar zlib: incorrect data check` für einen Paket-Cache-Eintrag – npm hat ihn verworfen und neu geladen, Build lief durch.

---

## Erledigt: Release 2.9.3 (14.10.2026)

Deploy ohne Befund, Migration `1737000116000` gelaufen (`holiday_region` entfernt). Prüfpunkte bestätigt: Hinweis beim Umstellen des Bundeslands, Kalender nur mit bayerischen Feiertagen, nur noch `default_region | BY`.

---

## Erledigt: Release 2.9.2 (13.10.2026)

Deploy ohne Befund, keine Migrationen. Prüfpunkte bestätigt: manuelles Backup nach dem Deploy mit „(manuell, …)“ im `backup.log`, Backup-Monitor zeigt den Zeitpunkt, Zeitnachweis des laufenden Monats mit Stand heute, Wiki-Upload mit falschem Typ zeigt konkrete Meldung. Offen: nächster Nachtlauf ohne doppelte Zeilen im Log (ROADMAP „Nächste Session“).

---

## Erledigt: Release 2.9.1 (13.10.2026)

Deploy ohne Befund, keine Migrationen; `compose.yaml` ohne `CORS_ORIGIN: "*"` übernommen. Prüfpunkte bestätigt: keine CORS-Fehler in der Browser-Konsole, Urlaubskonto/Sammel-PDF mit Jahreswechsel-Anzeige und vollständiger Konto-Box, Upload mit falschem Dateityp zeigt verständliche Meldung.

---

## Erledigt: Release 2.9.0 (12.10.2026)

Migrationen `1737000113000` bis `1737000115000` problemlos, die geänderten alten Migrationen wurden wie erwartet nicht erneut ausgeführt. Admin-Login unverändert, Zerobot-Recht den benötigten Rollen gegeben, Programm-Freigabe für `reviewer`/`supervisor` bestätigt, Klicktest Arbeitsgänge ohne Befund. `docker compose restart backend` jetzt 1,0 s (vorher 10 s bis SIGKILL).

---

## Erledigt: Release 2.8.0 (11.10.2026)

Migrationen `days_by_year` und halbe Feiertage problemlos; 2027 war noch nicht initialisiert. Warnung bei einem Urlaub über den Jahreswechsel (Mitarbeiter mit 4-Tage-Woche, Antrag vor dem Zeitmodell mit Mo–Fr berechnet) – zwei Urlaube per „Öffnen + Speichern“ neu berechnet, Urlaube aus der Zeit vor dem Zeitmodell bewusst nicht. Feiertags-Prüfabfrage ohne Treffer, Klicktests ohne Befund. Details: Session-Doku 11.10.2026.

Lese-Prüfung „gespeicherte Urlaubstage ≠ heutige Berechnung“ (für spätere Kontrollen):
```bash
docker compose exec -T backend node - <<'EOF'
const pool = require('./src/config/db');
const { calculateWorkingDaysByYear } = require('./src/controllers/vacationsController');
(async () => {
  const r = await pool.query(`SELECT v.id, v.user_id, v.start_date::text s, v.end_date::text e, v.calculated_days, v.days_by_year, v.status, vt.name typ
    FROM vacations v JOIN vacation_types vt ON vt.id = v.type_id
    WHERE v.status IN ('approved','pending') AND v.end_date >= '2026-01-01' ORDER BY v.user_id, v.start_date`);
  for (const v of r.rows) {
    const b = await calculateWorkingDaysByYear(v.user_id, v.s, v.e);
    const t = Object.values(b).reduce((a, c) => a + c, 0);
    if (Math.abs(t - parseFloat(v.calculated_days)) > 0.001)
      console.log(`#${v.id} MA ${v.user_id} ${v.typ} ${v.s}–${v.e} ${v.status}: gespeichert ${v.calculated_days} ${JSON.stringify(v.days_by_year)} | heute ${t} ${JSON.stringify(b)}`);
  }
  console.log('Prüfung fertig');
  await pool.end();
})();
EOF
```
Achtung: rechnet mit dem **aktuellen** Zeitmodell – Abweichungen bei Urlauben vor einem Modellwechsel sind erwartet.

---

## Erledigt: Release 2.7.0 (08.10.2026)

Einmalige Sonderschritte (Lockfiles eingecheckt, neuer `deploy.sh`) erfolgreich durchgeführt.
Dabei entdeckt: Die nächtlichen Backups waren seit Langem leer (Cron ohne Repo-Ordner, kein `pipefail`) –
behoben mit dem nächsten Release (`backup.sh` + Backup-Monitor). Details: Session-Doku 07./08.10.2026.
