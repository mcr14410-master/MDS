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
3. Auf `✅ Deploy abgeschlossen!` und die richtige Version im Health-Check achten
4. Geöffnete Browser-Tabs / Web-App einmal neu laden (`Strg+F5`), dann kurz prüfen: Login, „Was ist neu“, die geänderten Funktionen

**Wenn etwas schiefgeht**
| Meldung | Bedeutung / Vorgehen |
|---|---|
| `❌ Migration fehlgeschlagen` | Alte Version läuft weiter. Fehlermeldung darüber lesen |
| `npm ci` bricht ab | Lockfile passt nicht zu `package.json` → nicht mit `npm install` umgehen, Ursache klären |
| Frontend-Build bricht ab | `frontend/dist` kann leer sein → vorher `cp -a frontend/dist ~/mds-dist-backup` und im Notfall `cp -a ~/mds-dist-backup/. frontend/dist/` |
| `❌ Health-Check fehlgeschlagen` | `docker compose logs --tail=50 backend` |
| Daten kaputt | `./scripts/restore.sh /srv/mds/backups/mds_backup_….sql.gz` |

---

## Nächstes Release – zusätzliche Schritte

Hier Prüfpunkte sammeln, die beim nächsten Deploy zusätzlich anfallen (Migrationen, Datenkorrekturen, Klicktests).

**Nächstes Release** – Inhalt bisher: Testsammlung (nur Entwicklung), Zeitmodell-Verlauf Schritt 1 (Migration `1737000117000`), Schritt 2 (gerechnet wird mit dem am Tag gültigen Modell, vor dem „ab“-Datum ohne Modell) und Schritt 3 Backend (Verlauf-API mit Vorschau/Neuberechnung, Anzeigen „heute gültig“, Zeitnachweis mit beiden Modellen). Schritt 3 Oberfläche sollte mit ins selbe Release.

- [ ] **Vor dem Release** Prüfabfrage (nur lesend) – Tageswerte und Urlaube vor dem ersten Verlaufseintrag. Gespeicherte Werte ändern sich nicht, aber eine spätere Neuberechnung ergäbe dort Soll 0 bzw. Urlaub Mo–Fr. Tageswerte ohne Verlauf (`ab` leer) = Mitarbeiter ohne Zeitmodell. Bei Treffern vor dem Release besprechen:
  ```bash
  docker compose exec -T db psql -U mds mds <<'EOF'
  WITH f AS (SELECT user_id, min(valid_from) AS ab FROM user_time_models GROUP BY user_id)
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
- [ ] Deploy-Log: Migration `1737000117000_create-user-time-models` gelaufen
- [ ] Kontrolle (nur lesend): `docker compose exec -T db psql -U mds mds -c "SELECT user_id, time_model_id, valid_from FROM user_time_models ORDER BY user_id;"` – je Mitarbeiter mit Zeitmodell ein Eintrag ab seinem „ab“-Datum
- [ ] Nach dem ersten Nacht-Lauf (02:00/02:15): Cron-Protokoll – gleiche Anzahl Mitarbeiter verarbeitet wie vorher, keine Fehler
- [ ] Klicktest: Terminal-Info eines Mitarbeiters zeigt das Tagessoll wie bisher
- [ ] Klicktest: Terminal-Liste, Zeitkonten und Zeitmodell-Liste zeigen dieselben Modellnamen wie vorher (jetzt aus dem Verlauf)
- [ ] Klicktest: Zeitnachweis eines Mitarbeiters ohne Wechsel – Kopfzeile „Zeitmodell: …“ wie bisher

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
