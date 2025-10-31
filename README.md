# Fertigungsdaten Management System

Ein vollständiges Management-System für Fertigungsdaten mit Bauteilstammdaten, NC-Programmen, Einrichteblättern, Werkzeugen und Aufspannfotos.

## 🚀 Features

- **Bauteilstammdaten**: Verwalten von Zeichnungsnummern, Revisionen, Material, Kunden
- **NC-Programme**: Verwaltung und Verknüpfung von NC-Programmen mit Bauteilen
- **Einrichteblätter**: Digitale Einrichteblätter mit Werkzeuglisten und Spannmitteln
- **Werkzeugverwaltung**: Stammdaten für Werkzeuge mit technischen Parametern
- **Aufspannfotos**: Bildverwaltung für Rüstvorgänge
- **PostgreSQL Datenbank**: Robuste und skalierbare Datenhaltung
- **Docker Support**: Einfaches Deployment auf Raspberry Pi oder Server

## 📋 Voraussetzungen

- Node.js 18+ 
- PostgreSQL 15+
- Docker & Docker Compose (für Container-Deployment)
- Git

## 🛠️ Installation

### Lokale Entwicklung

1. **Zum Projektverzeichnis wechseln**
   ```bash
   cd C:\Users\Master\mds
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # .env anpassen (Datenbankzugangsdaten)
   npm run init-db
   npm run dev
   ```

3. **Frontend Setup** (in neuem Terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

### Docker Deployment

#### Entwicklung
```bash
docker-compose up -d
```

#### Raspberry Pi (Production)
```bash
# .env Datei mit Passwörtern erstellen
echo "DB_PASSWORD=IhrSicheresPasswort" > .env

# Container starten
docker-compose -f docker-compose.pi.yml up -d

# Datenbank initialisieren (nur beim ersten Start)
docker exec -it fertigungsdaten-backend npm run init-db
```

## 🌐 Zugriff

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

### Auf Raspberry Pi
- **Frontend**: http://raspberry-pi-ip
- **Backend API**: http://raspberry-pi-ip:5000/api

## 📁 Projektstruktur

```
mds/
├── backend/                 # Node.js Backend
│   ├── src/
│   │   ├── config/         # Datenbank-Konfiguration
│   │   ├── controllers/    # Business Logic
│   │   ├── routes/         # API Endpoints
│   │   └── server.js       # Express Server
│   ├── Dockerfile
│   └── package.json
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/     # React Komponenten
│   │   ├── services/       # API Services
│   │   ├── App.js
│   │   └── App.css
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml      # Docker Setup (Entwicklung)
├── docker-compose.pi.yml   # Docker Setup (Raspberry Pi)
└── README.md
```

## 🗄️ Datenbank-Schema

### Bauteile
- Zeichnungsnummer (unique)
- Benennung
- Revision
- Material
- Kunde
- Notizen

### NC-Programme
- Verknüpfung zu Bauteil
- Programmname
- Bearbeitungsschritt
- Maschine
- Programmcode

### Werkzeuge
- Werkzeugnummer (unique)
- Bezeichnung
- Typ
- Durchmesser
- Schnittparameter
- Hersteller

### Einrichteblätter
- Verknüpfung zu Bauteil
- Arbeitsgang
- Spannmittel
- Nullpunkt
- Werkzeugliste

## 🔧 API Endpoints

### Bauteile
- `GET /api/bauteile` - Alle Bauteile
- `GET /api/bauteile/:id` - Einzelnes Bauteil
- `GET /api/bauteile/:id/complete` - Bauteil mit allen Daten
- `GET /api/bauteile/search?q=` - Suche
- `POST /api/bauteile` - Neues Bauteil
- `PUT /api/bauteile/:id` - Bauteil aktualisieren
- `DELETE /api/bauteile/:id` - Bauteil löschen

### NC-Programme
- `GET /api/nc-programme` - Alle Programme
- `POST /api/nc-programme` - Neues Programm
- `PUT /api/nc-programme/:id` - Programm aktualisieren
- `DELETE /api/nc-programme/:id` - Programm löschen

### Werkzeuge
- `GET /api/werkzeuge` - Alle Werkzeuge
- `POST /api/werkzeuge` - Neues Werkzeug
- `PUT /api/werkzeuge/:id` - Werkzeug aktualisieren
- `DELETE /api/werkzeuge/:id` - Werkzeug löschen

## 🐳 Docker Befehle

```bash
# Container starten
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Container stoppen
docker-compose down

# Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d
docker exec -it fertigungsdaten-backend npm run init-db

# Auf Raspberry Pi
docker-compose -f docker-compose.pi.yml up -d
```

## 🔒 Sicherheit

- Ändern Sie das Standard-Datenbankpasswort in der `.env` Datei
- Verwenden Sie HTTPS in der Produktion
- Setzen Sie `NODE_ENV=production` für das Produktivsystem
- Regelmäßige Backups der PostgreSQL Datenbank

## 📦 Backup & Restore

### Backup erstellen
```bash
docker exec fertigungsdaten-db pg_dump -U postgres fertigungsdaten > backup.sql
```

### Backup wiederherstellen
```bash
docker exec -i fertigungsdaten-db psql -U postgres fertigungsdaten < backup.sql
```

## 🔄 Updates

```bash
# Code aktualisieren
git pull

# Container neu bauen
docker-compose down
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Backend startet nicht
- Prüfen Sie die Datenbankverbindung in der `.env`
- Logs prüfen: `docker logs fertigungsdaten-backend`

### Frontend zeigt Fehler
- API-URL prüfen in `frontend/.env`
- Backend erreichbar? `curl http://localhost:5000/api/health`

### Datenbank-Probleme
- Container neu starten: `docker-compose restart db`
- Logs prüfen: `docker logs fertigungsdaten-db`

## 📝 Lizenz

MIT License - Frei verwendbar für private und kommerzielle Projekte

## 👨‍💻 Entwicklung

Entwickelt für die Fertigungsindustrie mit Fokus auf CNC-Bearbeitung und Werkstattfertigung.

### In Eclipse importieren

1. File → Import → Existing Projects into Workspace
2. Wähle `C:\Users\Master\mds`
3. Projekt importieren

### Git Repository initialisieren

```bash
cd C:\Users\Master\mds
git init
git add .
git commit -m "Initial commit: Fertigungsdaten Management System"
```
