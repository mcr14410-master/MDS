# Release-Checkliste

Release = Deployment auf den Pi. Ablauf und Versionsregeln: [CLAUDE.md](../CLAUDE.md) („Versionierung“),
Details zum Deploy-Script: [DEPLOYMENT.md](../DEPLOYMENT.md).

---

## ⚠️ Nächstes Release (voraussichtlich 2.7.0) – einmalige Besonderheiten

Seit 2.6.0 hat sich der **Deploy-Ablauf selbst** geändert. Deshalb diesmal Schritt für Schritt, nicht nur `./scripts/deploy.sh`.

**Was sich geändert hat**
- `deploy.sh` migriert jetzt **vor** dem Umschalten und bricht bei Fehlern ab; die bisherige Version läuft dann weiter
- `package-lock.json` (Backend + Frontend) sind jetzt im Repo; Backend-Image und Frontend-Build nutzen `npm ci` → exakt die getesteten Paketversionen
- `scripts/init.sh` ist jetzt ausführbar
- Abhängigkeiten auf Patch-/Minor-Stand gebracht (u. a. express, axios, vite, react-router-dom) – Sicherheitslücken ohne Breaking Changes geschlossen
- Keine neuen DB-Migrationen seit 2.6.0, keine Änderungen an `compose.yaml`, `Caddyfile`, `.env`

### Am Entwicklungs-PC
1. „Release machen“: Version bestimmen (Features seit 2.6.0 → **2.7.0**), CHANGELOG `[Unreleased]` → `[2.7.0] - Datum - Kurztitel`, Version in `backend/package.json` + `frontend/package.json`, Release-PR
2. Nach Merge: annotierter Tag `v2.7.0` auf den Merge-Commit, Push nach Freigabe

### Auf dem Pi
```bash
cd ~/mds

# 1. Sicherheits-Backup der Datenbank (Größe prüfen – darf nicht wenige Bytes sein)
./scripts/backup.sh

# 1b. Aktuelles Frontend sichern (Rückfall, falls der Frontend-Build abbricht)
rm -rf ~/mds-dist-2.6.0 && cp -a frontend/dist ~/mds-dist-2.6.0

# 2. Ausgangslage prüfen
git status
git stash list
```
- `git status` zeigt vermutlich **ungetrackte** `backend/package-lock.json` und `frontend/package-lock.json` (früher lokal erzeugt). Die würden mit den jetzt eingecheckten Dateien kollidieren → löschen:
```bash
rm -f backend/package-lock.json frontend/package-lock.json
```
- Zeigt `git status` **weitere** lokale Änderungen: erst klären, nicht blind löschen.
- Alte `deploy-autostash`-Einträge in `git stash list`: ansehen (`git stash show -p stash@{0}`), danach ggf. `git stash drop`.

```bash
# 3. Neuen Stand holen – einmal von Hand, weil sich deploy.sh selbst geändert hat
git pull

# 4. Skripte ausführbar?  (alle sollten -rwx… zeigen)
ls -l scripts/*.sh
# falls nicht:  chmod +x scripts/*.sh

# 5. Deploy – Ausgabe zusätzlich in eine Datei, damit nichts vorbeirauscht
./scripts/deploy.sh 2>&1 | tee ~/deploy-2.7.0.log
```
`npm warn deprecated …` und `N vulnerabilities` sind Warnungen, kein Fehler (Updates laufen bewusst über eigene PRs).

**Was beim Deploy zu erwarten ist**
- Backend-Image: `npm ci` statt `npm install` – beim ersten Mal ohne Cache etwas länger
- Migrationen: `No migrations to run!` → `✅ Migrations erfolgreich`
- Frontend: `[container] npm ci` → `npm run build`
- Zum Schluss Health-Check mit Version **2.7.0** und `✅ Deploy abgeschlossen!`

**Wenn etwas schiefgeht**
| Meldung | Bedeutung / Vorgehen |
|---|---|
| `❌ Migration fehlgeschlagen` | Alte Version läuft weiter. Fehlermeldung darüber lesen (diesmal nicht erwartet, da keine neuen Migrationen) |
| `npm ci` bricht ab (Backend-Build oder `[container]`) | Lockfile passt nicht zu `package.json` → Ausgabe sichern, nicht mit `npm install` umgehen. Backend: alte Version läuft weiter. Frontend: siehe nächste Zeile |
| Frontend-Build bricht ab | Backend läuft noch in 2.6.0, aber `frontend/dist` kann leer sein → Seite lädt nicht. Gesichertes Frontend zurückkopieren: `cp -a ~/mds-dist-2.6.0/. frontend/dist/` (Inhalt kopieren, Ordner nicht ersetzen – Caddy hängt am Ordner). Danach Ausgabe des Builds sichern und Ursache klären |
| `❌ Health-Check fehlgeschlagen` | `docker compose logs --tail=50 backend` ansehen |
| Daten kaputt (sehr unwahrscheinlich) | Backup aus Schritt 1: `./scripts/restore.sh /srv/mds/backups/mds_backup_….sql.gz` |

### Nach dem Deploy prüfen
- [ ] Sidebar zeigt **v2.7.0**, „Was ist neu“ zeigt den Eintrag 2.7.0
- [ ] Urlaub: Vorschau „X Arbeitstag(e)“ bei einem Mitarbeiter mit 4-Tage-Woche (freier Tag zählt nicht mit)
- [ ] Zeitmodell bearbeiten: Haken „Arbeitstag“ je Wochentag sichtbar – **nicht speichern**, wenn nichts geändert werden soll
- [ ] Maschinentyp → Felder → Dropdown → „Option hinzufügen“: kein Absturz (Abbrechen, nicht speichern)
- [ ] `git status` sauber, `git stash list` ohne neuen `deploy-autostash`
- [ ] NC-Viewer am Arbeitsplatz: Rechtsklick-Eintrag einrichten (`tools/nc-viewer/launcher`)

Danach diesen Abschnitt auf „erledigt“ setzen bzw. entfernen.

---

## Allgemeiner Ablauf (jedes Release)

1. Am PC: „Release machen“ (CHANGELOG, Versionen, Release-PR, Tag) – siehe CLAUDE.md
2. Auf dem Pi: `cd ~/mds && ./scripts/backup.sh && ./scripts/deploy.sh 2>&1 | tee ~/deploy.log`
3. Auf `✅ Deploy abgeschlossen!` und die richtige Version im Health-Check achten
4. Kurz im MDS prüfen: Login, „Was ist neu“, die geänderten Funktionen
