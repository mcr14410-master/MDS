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

## Release 2.9.0 – zusätzliche Schritte

Gesammelt seit 2.8.0 (Migrationen `1737000113000` bis `1737000115000`; geändert, aber in Produktion bereits gelaufen und daher ohne Wirkung: `1737000005000`, `1737000020000`, `1737000023000`, `1737000094000`). Nach dem Deploy abarbeiten, dann diesen Abschnitt nach „Erledigt“ verschieben.

- [ ] **Migrationen:** Im Deploy-Log laufen `1737000113000` (Berechtigungen Werkzeuge/Lager/Bestand), `1737000114000` (Rolle admin erhält alle Berechtigungen) und `1737000115000` (`zerobot.manage`) ohne Fehler durch. 113 und 114 ändern in Produktion nichts (über `init.sh` schon vorhanden)
- [ ] **Login:** Admin-Login unverändert
- [ ] **Zerobot:** `zerobot.manage` hat nach dem Deploy nur die Rolle `admin` → in der Benutzerverwaltung den Rollen geben, die Zerobot-Parameter, Maschinen und Backen bearbeiten sollen. Danach als admin einen Parameter ändern und zurücksetzen
- [ ] **Programm-Freigabe:** Statuswechsel prüft jetzt `program.release` statt der Rolle `programmer` – damit dürfen auch `reviewer` und `supervisor` freigeben. Gewollt? Sonst Recht in der Benutzerverwaltung anpassen. Einmal einen Statuswechsel testen
- [ ] **Arbeitsgänge (Klicktest):** Bauteil mit mehreren Arbeitsgängen öffnen, „Alle öffnen“; je Arbeitsgang Programme, Einrichteblatt und Prüfplan mit der Erwartung vergleichen. Falls in letzter Zeit Einrichteblätter, Prüfmerkmale oder Programmzuordnungen unerwartet verschwunden oder vertauscht waren: Audit-Log der betroffenen Arbeitsgänge ansehen (der Fehler konnte Aktionen am falschen Arbeitsgang auslösen)
- [ ] **Backend-Neustart:** `docker compose restart backend` sollte in ~1 s fertig sein (vorher 10 s bis SIGKILL)
- [ ] **Hinweis `init.sh`:** setzt das Admin-Passwort nicht mehr bei jedem Lauf zurück; Admin-Reset nur noch mit `ADMIN_PASSWORD_RESET=1 ./scripts/init.sh`

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
