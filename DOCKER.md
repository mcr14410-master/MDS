# 🐳 Docker Konfigurationen

Dieses Projekt hat verschiedene Docker-Compose-Dateien für unterschiedliche Szenarien:

## 📋 Übersicht

### `docker-compose.dev.yml` - Lokale Entwicklung ⭐ EMPFOHLEN
**Für Windows-Entwicklung mit lokaler PostgreSQL**

- ❌ Keine PostgreSQL im Container
- ✅ Nutzt deine lokale PostgreSQL-Installation
- ✅ Backend + Frontend optional in Docker
- ✅ Schneller, weniger Ressourcen

**Verwendung:**
```bash
# NICHT nötig - nutze npm direkt!
cd backend
npm run dev

cd frontend
npm start
```

---

### `docker-compose.full.yml` - Vollständig mit DB
**Falls du doch alles in Docker haben willst**

- ✅ PostgreSQL Container
- ✅ Backend Container  
- ✅ Frontend Container
- ⚠️ Port 5432 muss frei sein!

**Verwendung:**
```bash
docker-compose -f docker-compose.full.yml up -d
docker exec fertigungsdaten-backend npm run init-db
```

---

### `docker-compose.pi.yml` - Raspberry Pi Produktion 🍓
**Für Deployment auf dem Raspberry Pi**

- ✅ PostgreSQL Container (optimiert für ARM)
- ✅ Backend Container
- ✅ Frontend Container (nginx auf Port 80)
- ✅ Production-ready
- ✅ Automatische Restarts
- ✅ Volume für persistente Daten

**Verwendung auf dem Pi:**
```bash
cd ~/mds
echo "DB_PASSWORD=$(openssl rand -base64 32)" > .env
docker-compose -f docker-compose.pi.yml up -d
docker exec fertigungsdaten-backend npm run init-db
```

---

## 🎯 Empfohlener Workflow

### Lokal entwickeln (Windows):
1. PostgreSQL lokal nutzen (läuft eh schon)
2. Backend: `npm run dev` 
3. Frontend: `npm start`
4. **Kein Docker nötig!** ✨

### Auf Pi deployen:
```bash
bash deploy-pi.sh raspberry-pi-ip
```

Fertig! 🚀

---

## 🔧 Datenbank-Verbindung

### Lokal (backend/.env):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fertigungsdaten
DB_USER=postgres
DB_PASSWORD=dein_lokales_passwort
```

### Docker (automatisch):
Wird über docker-compose gesetzt, keine manuelle Konfiguration nötig!

---

## 💾 Daten-Persistenz

- **Lokal**: Deine normale PostgreSQL-Datenbank
- **Docker**: Volume `postgres_data` (überlebt Container-Neustarts)

---

## ❓ Welche Datei wofür?

| Szenario | Datei | DB |
|----------|-------|-----|
| 🖥️ Entwicklung Windows | - (kein Docker) | Lokal |
| 🐳 Alles in Docker | docker-compose.full.yml | Container |
| 🍓 Raspberry Pi | docker-compose.pi.yml | Container |
| 🚀 Deploy zum Pi | deploy-pi.sh | Container |
