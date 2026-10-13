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

**Release 2.9.2** – keine Migrationen, keine Änderung an `compose.yaml`.

- [ ] **Nach** dem Deploy (das Backup davor läuft noch mit dem alten Skript): `sudo ./scripts/backup.sh` → in `/srv/mds/backups/backup.log` erscheint der Lauf mit „(manuell, …)“; nach der nächsten Nacht: Cron-Lauf ohne doppelte Zeilen (#138)
- [ ] Administration → Cron-Jobs: Backup-Status zeigt „neuestes: … MB von TT.MM., 02:30“ statt „(vor 0h)“ – nach dem nächsten Monitor-Lauf oder per „Ausführen“ (#138)
- [ ] Zeitnachweis des laufenden Monats exportieren: Urlaubskonto „Stand“ = heutiges Datum, künftiger Urlaub unter „Genehmigt, nach Stichtag“ (#139)
- [ ] Wiki: Artikel bearbeiten → unter „Bilder“ eine Nicht-Bild-Datei hochladen → Meldung „Nur Bilder erlaubt …“ statt „Fehler beim Hochladen“ (#143)

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
