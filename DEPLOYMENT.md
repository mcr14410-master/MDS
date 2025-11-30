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
│   └────┬─────┘          └────┬─────┘                        │
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
- SSD unter `/srv` gemountet
- task-app läuft bereits (Port 80)

## Installation

### 1. Projekt auf Pi kopieren

```bash
# Vom Entwicklungsrechner
scp -r mds/ pi@raspberrypi:~/mds/

# Oder mit Git
git clone <repo-url> ~/mds
cd ~/mds
```

### 2. Environment konfigurieren

```bash
cd ~/mds

# .env erstellen
cp .env.production .env

# Passwörter generieren und eintragen
nano .env
```

**Wichtig:** Sichere Passwörter setzen!
```bash
# JWT Secret generieren
openssl rand -base64 32
```

### 3. Deployment ausführen

```bash
chmod +x scripts/*.sh
./scripts/deploy.sh
```

### 4. Erstinstallation (Datenbank + Admin-User)

```bash
./scripts/init.sh
```

Das Script:
- Führt alle Migrations aus
- Erstellt Admin-User mit Passwort `admin123`
- Fragt optional nach Test-Daten

### 5. Zugriff testen

```
http://<pi-ip>:81
```

## Befehle

| Befehl | Beschreibung |
|--------|--------------|
| `docker compose up -d` | Container starten |
| `docker compose down` | Container stoppen |
| `docker compose logs -f` | Logs anzeigen |
| `docker compose logs -f backend` | Nur Backend-Logs |
| `docker compose ps` | Status anzeigen |
| `docker compose restart backend` | Backend neustarten |
| `./scripts/init.sh` | Erstinstallation (Migrations + Admin) |
| `./scripts/backup.sh` | Datenbank-Backup |
| `./scripts/restore.sh <file>` | Datenbank wiederherstellen |
| `./scripts/migrate.sh` | Migrations ausführen |

## Backup einrichten

```bash
# Cronjob für tägliches Backup um 2:00 Uhr
crontab -e

# Zeile hinzufügen:
0 2 * * * /home/pi/mds/scripts/backup.sh >> /var/log/mds-backup.log 2>&1
```

Backups werden unter `/srv/mds/backups/` gespeichert (7 Tage).

## Update-Prozess

```bash
cd ~/mds

# Neueste Version holen
git pull

# Frontend neu bauen
cd frontend && npm ci && npm run build && cd ..

# Images neu bauen und starten
docker compose build
docker compose up -d

# Migrations ausführen (falls nötig)
./scripts/migrate.sh
```

## Troubleshooting

### Container startet nicht
```bash
docker compose logs backend
docker compose logs db
```

### Datenbank-Verbindung fehlgeschlagen
```bash
# DB Container prüfen
docker compose exec db psql -U mds -d mds -c "SELECT 1"
```

### Port 81 bereits belegt
```bash
sudo lsof -i :81
# Falls nötig, Port in compose.yaml ändern
```

### Speicherplatz prüfen
```bash
df -h /srv
docker system df
```

### Logs aufräumen
```bash
docker compose logs --tail=100  # Nur letzte 100 Zeilen
docker system prune -f          # Ungenutzte Images/Container entfernen
```

## Verzeichnisstruktur

```
/srv/mds/
├── postgres/     # PostgreSQL Daten
├── uploads/      # Hochgeladene Dateien
│   ├── programs/ # NC-Programme
│   ├── photos/   # Bilder
│   └── documents/# Dokumente
└── backups/      # Datenbank-Backups
```

## Ressourcen-Verbrauch (ca.)

| Service | RAM | CPU |
|---------|-----|-----|
| PostgreSQL | ~100MB | Low |
| Backend (Node) | ~150MB | Low |
| Caddy | ~20MB | Low |
| **Gesamt MDS** | ~270MB | Low |

Bei 8GB RAM problemlos parallel zu task-app.
