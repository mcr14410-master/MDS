# MDS Deployment auf Raspberry Pi 5

## Übersicht

MDS läuft parallel zur task-app auf Port **81**.

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi 5                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   task-app :80          MDS :81                             │
│   ┌──────────┐          ┌──────────┐                        │
│   │  Caddy   │          │  Caddy   │                        │
│   └────┬─────┘          └────┬─────┘                        │
│        │                     │                              │
│   ┌────┴─────┐          ┌────┴─────┐                        │
│   │ Backend  │          │ Backend  │                        │
│   │ (Java)   │          │ (Node)   │                        │
│   └────┬─────┘          └────┴─────┘                        │
│        │                     │                              │
│   ┌────┴─────┐          ┌────┴─────┐                        │
│   │PostgreSQL│          │PostgreSQL│                        │
│   └──────────┘          └──────────┘                        │
│        │                     │                              │
│   /srv/postgres         /srv/mds/postgres                   │
│                                                             │
│                    SSD (/srv)                               │
└─────────────────────────────────────────────────────────────┘
```

## Voraussetzungen

- Raspberry Pi 5 mit 8GB RAM
- Docker & Docker Compose installiert
- Git installiert
- SSD unter `/srv` gemountet
- task-app läuft bereits (Port 80)

---

## Erstinstallation

### 1. Repository klonen

```bash
cd ~
git clone https://github.com/DEIN-USER/mds.git
cd ~/mds
```

### 2. Environment konfigurieren

```bash
# .env aus Vorlage erstellen
cp .env.production.example .env

# Passwörter setzen
nano .env
```

**Inhalt der .env:**
```env
DB_PASSWORD=DEIN_SICHERES_DB_PASSWORT
JWT_SECRET=DEIN_ZUFAELLIGER_SECRET_KEY
```

**Tipp:** JWT Secret generieren:
```bash
openssl rand -base64 32
```

### 3. Deploy ausführen

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

Das Script macht automatisch:
- Verzeichnisse unter `/srv/mds/` erstellen
- Frontend im Docker-Container bauen
- Backend-Image bauen
- Alle Container starten

### 4. Datenbank initialisieren

```bash
./scripts/init.sh
```

Das Script:
- Führt alle Migrations aus (legen auch alle Berechtigungen an)
- Setzt beim ersten Lauf das Admin-Passwort `admin123`; ein bestehendes Passwort bleibt unverändert
- Fragt optional nach Test-Daten (Maschinen, Bauteile, etc.)

### 5. Fertig!

```
http://<pi-ip>:81

Login: admin / admin123
```

**⚠️ Wichtig:** Passwort nach erstem Login ändern!

---

## Updates

> Vor einem Release: [docs/RELEASE-CHECKLISTE.md](docs/RELEASE-CHECKLISTE.md) – das nächste Release (2.7.0) hat einmalige Zusatzschritte.

Updates sind einfach - ein Befehl:

```bash
cd ~/mds
./scripts/deploy.sh
```

Das Script macht automatisch:
1. `git pull` mit Autostash (lokale Änderungen werden gesichert)
2. Backend-Image neu bauen (die laufende Version bleibt dabei aktiv)
3. **Datenbank-Migrationen** mit dem neuen Image in einem Einmal-Container
4. Frontend im Container neu bauen
5. Container neu starten – erst jetzt geht die neue Version live (Caddy reload ohne Downtime)
6. Health-Check (bis zu 30 s) – erst danach erscheint „✅ Deploy abgeschlossen!“

**Schlägt eine Migration fehl**, bricht das Script mit `❌ Migration fehlgeschlagen` und der Fehlermeldung ab.
Backend und Frontend laufen dann in der bisherigen Version weiter. Migration korrigieren und erneut deployen.

**Schlägt der Health-Check fehl**, endet das Script mit `❌ Health-Check fehlgeschlagen` –
dann `docker compose logs --tail=50 backend` prüfen.

Migrationen einzeln (ohne Deploy): `./scripts/migrate.sh`

---

## Scripts

| Script | Beschreibung |
|--------|--------------|
| `./scripts/deploy.sh` | **Haupt-Script** - Git pull, Build, Deploy |
| `./scripts/init.sh` | Erstinstallation - Migrations + Admin-User |
| `./scripts/backup.sh` | Datenbank-Backup erstellen |
| `./scripts/restore.sh <file>` | Datenbank wiederherstellen |
| `./scripts/migrate.sh` | Nur Migrations ausführen |

---

## Docker-Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `docker compose ps` | Status anzeigen |
| `docker compose logs -f` | Alle Logs |
| `docker compose logs -f backend` | Nur Backend-Logs |
| `docker compose restart backend` | Backend neustarten |
| `docker compose down` | Alles stoppen |
| `docker compose up -d` | Alles starten |

---

## Backup einrichten

### Manuelles Backup

```bash
cd ~/mds && sudo ./scripts/backup.sh
```
`sudo`, weil `/srv/mds/backups` root gehört. Das Script prüft jedes Backup (Mindestgröße + pg_dump-Endmarke
`PostgreSQL database dump complete`); ein unvollständiges Backup wird verworfen, es endet mit `❌` und Exit 1.
Alte Backups werden nur nach einem erfolgreichen Backup gelöscht.

### Automatisches Backup (Cronjob)

Eintrag in der **root**-Crontab (`sudo crontab -e`):
```
30 2 * * * /home/rpi01/mds/scripts/backup.sh >> /srv/mds/backups/backup.log 2>&1
```
Das Script wechselt selbst in den Repo-Ordner (Cron startet in `/root`). Log prüfen:
`tail -20 /srv/mds/backups/backup.log`

Backups werden unter `/srv/mds/backups/` gespeichert (7 Tage aufbewahrt).
Im MDS prüft der Cron-Job **Backup-Status** (Administration → Automatische Aufgaben, täglich 03:00),
ob das neueste Backup vollständig und höchstens 26 h alt ist – sonst wird der Lauf rot als Fehler angezeigt.

### Backup wiederherstellen

```bash
./scripts/restore.sh /srv/mds/backups/mds_backup_XXXXXXXX_XXXXXX.sql.gz
```

---

## Backup aufs Netzlaufwerk

DB, Backups und Uploads liegen auf derselben SSD. `scripts/backup-offsite.sh` sichert deshalb jede Nacht
den neuesten geprüften DB-Dump, `/srv/mds/uploads` und die `.env` (Secrets, nicht im Repo) per **restic**
auf eine Windows-Freigabe im Firmennetz. Die Freigabe ist nur während der Sicherung eingebunden.
restic verschlüsselt, speichert gleiche Daten nur einmal und hält **30 Tage täglich + 12 Monate** vor;
sonntags prüft es das Repository und liest dabei 10 % der Daten.

> **Ohne das restic-Passwort ist das Backup wertlos.** Es liegt auf dem Pi in `/root/.mds-restic-password`
> und muss zusätzlich an einen zweiten Ort (Passwort-Safe der Firma, Ausdruck im Tresor) – stirbt der Pi,
> braucht man genau dieses Passwort.

### Einrichten (einmalig, als root)

1. Pakete (`cifs-utils` ist schon da):
   ```bash
   sudo apt install restic
   ```
2. Zugangsdaten für die Freigabe in `/etc/samba/creds/mds` (`root:root`, `chmod 600`):
   ```
   username=BENUTZER
   password=…
   domain=FIRMA
   ```
   Ein persönlicher Benutzer geht, aber: Ändert sich sein Passwort, bricht das Backup (der Monitor meldet es rot),
   und der Pi hält Zugangsdaten, die mehr können als nötig. Besser später ein eigener Benutzer, der nur in
   „MDS Backup“ schreiben darf – dann nur diese Datei anpassen.
3. Einhängepunkt und `/etc/fstab`-Eintrag (`\040` = Leerzeichen im Freigabenamen, `noauto` = nur auf Anforderung):
   ```bash
   sudo mkdir -p /mnt/mds-offsite
   ```
   ```
   //SERVER/MDS\040Backup /mnt/mds-offsite cifs noauto,_netdev,credentials=/etc/samba/creds/mds,uid=0,gid=0,file_mode=0600,dir_mode=0700,iocharset=utf8 0 0
   ```
   Test: `sudo mount /mnt/mds-offsite && ls /mnt/mds-offsite && sudo umount /mnt/mds-offsite`
4. restic-Passwort erzeugen, **an den zweiten Ort übertragen**, Repository anlegen:
   ```bash
   sudo sh -c 'umask 077; head -c 32 /dev/urandom | base64 > /root/.mds-restic-password'
   sudo cat /root/.mds-restic-password
   sudo mount /mnt/mds-offsite
   sudo restic init -r /mnt/mds-offsite/restic --password-file /root/.mds-restic-password
   sudo umount /mnt/mds-offsite
   ```
5. Erster Lauf von Hand, endet mit `✅ Netzlaufwerk-Backup fertig: Snapshot …`:
   ```bash
   cd ~/mds && sudo ./scripts/backup-offsite.sh
   ```
6. Eintrag in der **root**-Crontab (`sudo crontab -e`), nach `backup.sh` um 02:30:
   ```
   45 2 * * * /home/rpi01/mds/scripts/backup-offsite.sh >> /srv/mds/backups/backup-offsite.log 2>&1
   ```

Nach jedem Lauf schreibt das Skript `/srv/mds/backups/offsite-status.json`. Im MDS prüft der Cron-Job
**Netzlaufwerk-Backup** (Administration → Automatische Aufgaben, täglich 03:05), ob der letzte Lauf erfolgreich
und höchstens 26 h alt ist – sonst rot mit der Meldung des Skripts. Log: `tail -40 /srv/mds/backups/backup-offsite.log`

### Snapshots ansehen und wiederherstellen

```bash
sudo mount /mnt/mds-offsite
R="-r /mnt/mds-offsite/restic --password-file /root/.mds-restic-password"
sudo restic $R snapshots                                   # Liste mit Datum und ID
sudo restic $R ls latest | grep mds_backup_                # welcher Dump steckt drin
sudo restic $R restore latest --target /tmp/mds-restore    # oder statt latest eine ID
sudo umount /mnt/mds-offsite
```

Im Zielordner liegen die Dateien unter ihrem Originalpfad (`/tmp/mds-restore/srv/mds/…`, `…/home/rpi01/mds/.env`).
- **Datenbank:** `./scripts/restore.sh /tmp/mds-restore/srv/mds/backups/mds_backup_….sql.gz`
- **Uploads:** einzelne Dateien zurückkopieren; komplett: `sudo rsync -a /tmp/mds-restore/srv/mds/uploads/ /srv/mds/uploads/`
- **`.env`:** nur bei einem neu aufgesetzten Pi zurückkopieren

**Pi tot:** Das Repository lässt sich auch an einem Windows-PC öffnen – `restic.exe` (einzelne Datei von
github.com/restic/restic/releases) mit `-r "\\SERVER\MDS Backup\restic"` und dem restic-Passwort.

---

## Troubleshooting

### Container startet nicht

```bash
docker compose logs backend
docker compose logs db
```

### Login funktioniert nicht

```bash
# Admin-Passwort auf admin123 zurücksetzen (danach sofort ändern)
ADMIN_PASSWORD_RESET=1 ./scripts/init.sh
```

### Datenbank-Verbindung fehlgeschlagen

```bash
docker compose exec db psql -U mds -d mds -c "SELECT 1"
```

### Port 81 bereits belegt

```bash
sudo lsof -i :81
# Port in compose.yaml ändern falls nötig
```

### Speicherplatz prüfen

```bash
df -h /srv
docker system df
docker system prune -f  # Aufräumen
```

### Frontend-Änderungen werden nicht angezeigt

```bash
# Browser-Cache leeren (Strg+Shift+R)
# Oder Caddy neustarten:
docker compose restart caddy
```

---

## Verzeichnisstruktur

```
~/mds/                    # Git Repository
├── .env                  # Lokale Konfiguration (nicht im Git!)
├── compose.yaml          # Docker Compose
├── caddy/Caddyfile       # Reverse Proxy (Ordner eingebunden, damit `caddy reload` Änderungen sieht)
├── scripts/              # Deploy & Maintenance Scripts
├── backend/              # Node.js Backend
└── frontend/             # React Frontend

/srv/mds/                 # Persistente Daten (SSD)
├── postgres/             # PostgreSQL Daten
├── uploads/              # Hochgeladene Dateien
│   ├── programs/         # NC-Programme
│   ├── photos/           # Bilder
│   └── documents/        # Dokumente
└── backups/              # Datenbank-Backups
```

---

## Ressourcen-Verbrauch

| Service | RAM | CPU |
|---------|-----|-----|
| PostgreSQL | ~100MB | Low |
| Backend (Node) | ~150MB | Low |
| Caddy | ~20MB | Low |
| **Gesamt MDS** | ~270MB | Low |

Bei 8GB RAM problemlos parallel zu task-app.

---

## Quick Reference

```bash
# Update
cd ~/mds && ./scripts/deploy.sh

# Status
docker compose ps

# Logs
docker compose logs -f backend

# Backup
sudo ./scripts/backup.sh

# Admin-Reset (Passwort auf admin123)
ADMIN_PASSWORD_RESET=1 ./scripts/init.sh
```
