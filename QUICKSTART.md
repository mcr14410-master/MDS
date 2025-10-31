# 🚀 Schnellstart-Anleitung

## Windows Entwicklung

### 1. Setup ausführen
```cmd
cd C:\Users\Master\mds
setup.bat
```

### 2. Datenbank starten
```cmd
docker-compose up -d db
```

### 3. Datenbank initialisieren
```cmd
cd backend
npm run init-db
```

### 4. Backend starten
```cmd
cd backend
npm run dev
```

### 5. Frontend starten (neues Terminal)
```cmd
cd frontend
npm start
```

### Zugriff
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

---

## Raspberry Pi Deployment

### Voraussetzungen auf dem Pi
```bash
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose installieren
sudo apt-get install docker-compose -y
```

### Option 1: Automatisches Deployment (von Windows)
```bash
# Git Bash oder WSL verwenden
cd C:\Users\Master\mds
bash deploy-pi.sh raspberrypi.local pi
```

### Option 2: Manuelles Deployment
1. **Projekt zum Pi kopieren**
   ```bash
   scp -r C:\Users\Master\mds pi@raspberrypi.local:~/
   ```

2. **Auf dem Pi**
   ```bash
   cd ~/mds
   
   # Umgebungsvariablen setzen
   echo "DB_PASSWORD=$(openssl rand -base64 32)" > .env
   
   # Container starten
   docker-compose -f docker-compose.pi.yml up -d
   
   # Datenbank initialisieren (beim ersten Start)
   docker exec fertigungsdaten-backend npm run init-db
   ```

3. **Zugriff**
   - Frontend: http://[raspberry-pi-ip]
   - Backend: http://[raspberry-pi-ip]:5000/api

---

## Nützliche Befehle

### Docker
```bash
# Container Status
docker-compose ps

# Logs anzeigen
docker-compose logs -f

# Container neu starten
docker-compose restart

# Container stoppen
docker-compose down

# Alles neu bauen
docker-compose up -d --build
```

### Datenbank
```bash
# Backup erstellen
docker exec fertigungsdaten-db pg_dump -U postgres fertigungsdaten > backup_$(date +%Y%m%d).sql

# Backup wiederherstellen
docker exec -i fertigungsdaten-db psql -U postgres fertigungsdaten < backup.sql

# Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d
docker exec fertigungsdaten-backend npm run init-db
```

### Entwicklung
```bash
# Backend Tests
cd backend
npm test

# Frontend Build
cd frontend
npm run build
```

---

## Eclipse Integration

1. **Projekt importieren**
   - File → Import → Existing Projects into Workspace
   - Root directory: `C:\Users\Master\mds`
   - Finish

2. **Node.js Support** (optional)
   - Help → Eclipse Marketplace
   - Suche: "Wild Web Developer"
   - Install

3. **Git Integration**
   - Rechtsklick auf Projekt → Team → Share Project
   - Git Repository auswählen

---

## Troubleshooting

### Port bereits belegt
```bash
# Windows: Port 3000 oder 5000 prüfen
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Pi: Port prüfen
sudo lsof -i :80
sudo lsof -i :5000
```

### Container startet nicht
```bash
# Logs prüfen
docker logs fertigungsdaten-backend
docker logs fertigungsdaten-db

# Container neu bauen
docker-compose down
docker-compose up -d --build
```

### Datenbank-Verbindungsfehler
1. Prüfe `.env` Datei
2. Prüfe ob PostgreSQL läuft: `docker ps`
3. Teste Verbindung: `docker exec fertigungsdaten-db psql -U postgres -c "SELECT 1"`

---

## Produktiv-Deployment Checkliste

- [ ] `.env` mit sicheren Passwörtern erstellen
- [ ] `NODE_ENV=production` setzen
- [ ] CORS-Origin auf tatsächliche Domain setzen
- [ ] Reverse Proxy (nginx) für HTTPS einrichten
- [ ] Automatische Backups konfigurieren
- [ ] Firewall-Regeln einrichten
- [ ] Log-Rotation einrichten
- [ ] Monitoring einrichten (z.B. Uptime Kuma)

---

## Kurzbefehle für schnelles Arbeiten

```bash
# Terminal im Projekt öffnen
cd C:\Users\Master\mds

# Oder noch kürzer
cd ~\mds    # In PowerShell
```
