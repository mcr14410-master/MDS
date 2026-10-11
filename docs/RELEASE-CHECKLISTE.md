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

## Release 2.8.0 – zusätzliche Schritte

Gesammelt seit 2.7.1 (Migrationen `1737000111000` und `1737000112000`). Punkt „Halbe Feiertage“ **vor** dem Deploy prüfen, die übrigen danach abarbeiten, dann diesen Abschnitt nach „Erledigt“ verschieben.

- [ ] **Migration `days_by_year` (#107):** Im Deploy-Log nach Warnungen `Urlaub …: Neuberechnung … ≠ gespeichert` suchen (Urlaube über den Jahreswechsel, deren Neuberechnung von der gespeicherten Gesamtzahl abweicht – Differenz wurde dem Startjahr zugeschlagen). Resturlaub von 2–3 Mitarbeitern stichprobenartig mit dem Stand vor dem Release vergleichen
- [ ] **Feiertage nachträglich angelegt (#109):** Prüfabfrage ausführen – Treffer = Urlaube, bei deren Berechnung ein Feiertag noch fehlte (zu viele Tage abgezogen); bei Treffern gezielt neu berechnen
  ```bash
  docker compose exec -T db psql -U mds -d mds -c "SELECT v.id, v.user_id, v.start_date, v.end_date, v.calculated_days, v.status, h.date AS feiertag FROM vacations v JOIN holidays h ON h.date BETWEEN v.start_date AND v.end_date AND h.region = 'BY' WHERE h.created_at > v.created_at AND v.status IN ('approved', 'pending') ORDER BY v.start_date;"
  ```
- [ ] **Halbe Feiertage (Migration `1737000112000`):** Im Deploy-Log stehen die angepassten Urlaube (`Urlaub …: X → Y Tage`) und ggf. Warnungen `… erst nach dem Antrag angelegt – übersprungen` (diese Urlaube gezielt prüfen). **Falls 2027 schon initialisiert ist:** Der Übertrag nach 2027 wurde mit dem alten Rest 2026 gebucht und ist um die zusätzlichen halben Tage zu hoch – vor dem Deploy prüfen:
  ```bash
  docker compose exec -T db psql -U mds -d mds -c "SELECT count(*) FROM vacation_entitlements WHERE year = 2027;"
  ```
  Bei Treffern nach dem Deploy die betroffenen Mitarbeiter (Log) in der Urlaubsverwaltung bei „Übertrag 2027“ korrigieren
- [ ] **Eigene Urlaubsanträge (#108):** Mit einem Mitarbeiter-Konto ohne Verwaltungsrechte einen Antrag stellen, ändern und zurückziehen
- [ ] **Inaktive Maschinen (#110):** Alte Testmaschinen deaktivieren (Maschine → „Deaktivieren“), Auswahlfelder stichprobenartig prüfen (Arbeitsgang, Einrichteblatt, Spannmittel)
- [ ] **PDF-Exporte (#111, #114, #115):** einmal erzeugen und prüfen
  - Zeitnachweis eines abgeschlossenen Monats für einen Mitarbeiter mit Urlaub über das Monatsende bzw. Auszahlung – mit der Buchhaltung gegenprüfen (Urlaubskonto „Stand Monatsende“, Saldo neu inkl. Korrektur/Auszahlung)
  - Urlaubs-Gesamtübersicht mit „Verwaltung → Urlaub“ vergleichen (Spalte „Korr.“, Rest)
  - ein Messmittel-Datenblatt

---

## Erledigt: Release 2.7.0 (08.10.2026)

Einmalige Sonderschritte (Lockfiles eingecheckt, neuer `deploy.sh`) erfolgreich durchgeführt.
Dabei entdeckt: Die nächtlichen Backups waren seit Langem leer (Cron ohne Repo-Ordner, kein `pipefail`) –
behoben mit dem nächsten Release (`backup.sh` + Backup-Monitor). Details: Session-Doku 07./08.10.2026.
