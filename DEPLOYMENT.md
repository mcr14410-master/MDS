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
- Führt alle Migrations aus
- Erstellt Admin-User mit Passwort `admin123`
- Fragt optional nach Test-Daten (Maschinen, Bauteile, etc.)

### 5. Fertig!

```
http://<pi-ip>:81

Login: admin / admin123
```

**⚠️ Wichtig:** Passwort nach erstem Login ändern!

---

## Updates

Updates sind einfach - ein Befehl:

```bash
cd ~/mds
./scripts/deploy.sh
```

Das Script macht automatisch:
1. `git pull` mit Autostash (lokale Änderungen werden gesichert)
2. Frontend im Container neu bauen
3. Backend-Image neu bauen
4. Container neu starten (Caddy reload ohne Downtime)
5. Health-Check

### Nach DB-Änderungen (neue Migrations)

```bash
./scripts/deploy.sh
docker compose exec backend npm run migrate:up
```

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
./scripts/backup.sh
```

### Automatisches Backup (Cronjob)

```bash
crontab -e

# Täglich um 2:00 Uhr:
0 2 * * * /home/pi/mds/scripts/backup.sh >> /var/log/mds-backup.log 2>&1
```

Backups werden unter `/srv/mds/backups/` gespeichert (7 Tage aufbewahrt).

### Backup wiederherstellen

```bash
./scripts/restore.sh /srv/mds/backups/mds_backup_XXXXXXXX_XXXXXX.sql.gz
```

---

## Troubleshooting

### Container startet nicht

```bash
docker compose logs backend
docker compose logs db
```

### Login funktioniert nicht

```bash
# Admin-Passwort zurücksetzen
./scripts/init.sh
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
├── Caddyfile             # Reverse Proxy
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
./scripts/backup.sh

# Admin-Reset
./scripts/init.sh
```
