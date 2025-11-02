# 🚀 Quick Start Guide - MDS

> **Von 0 auf 100 in 15 Minuten!**  
> Diese Anleitung führt dich Schritt-für-Schritt durch die Installation von Backend UND Frontend.

**Status:** ✅ Phase 1, Woche 3 Complete - Frontend läuft!

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Backend Installation](#backend-installation)
3. [Frontend Installation](#frontend-installation)
4. [Erste Schritte](#erste-schritte)
5. [Troubleshooting](#troubleshooting)
6. [Nächste Schritte](#nächste-schritte)

---

## ✅ Voraussetzungen

### Benötigte Software

| Software | Mindestversion | Download | Check |
|----------|----------------|----------|-------|
| **Node.js** | 18.0.0 | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | 10.0.0 | (mit Node.js) | `npm --version` |
| **PostgreSQL** | 15.0 | [postgresql.org](https://www.postgresql.org/download/) | `psql --version` |
| **Git** | 2.30.0 | [git-scm.com](https://git-scm.com/) | `git --version` |

### Optionale Software

| Software | Zweck | Download |
|----------|-------|----------|
| **pgAdmin 4** | Datenbank-GUI | [pgadmin.org](https://www.pgadmin.org/) |
| **VS Code** | Code-Editor (empfohlen) | [code.visualstudio.com](https://code.visualstudio.com/) |
| **VS Code REST Client** | API-Testing | VS Code Extension |

### Versionen überprüfen

```bash
# Alle auf einmal checken
node --version && npm --version && psql --version && git --version
```

**Erwartete Ausgabe:**
```
v18.x.x (oder höher)
10.x.x (oder höher)
psql (PostgreSQL) 15.x
git version 2.x.x
```

✅ **Alles grün?** → Weiter geht's!  
❌ **Etwas fehlt?** → Software installieren und neu checken

---

## 📦 Backend Installation

### Schritt 1: Repository klonen

```bash
# HTTPS (empfohlen)
git clone https://github.com/mcr14410-master/MDS.git
cd MDS

# Oder SSH (wenn eingerichtet)
git clone git@github.com:mcr14410-master/MDS.git
cd MDS
```

**Erwartete Ausgabe:**
```
Cloning into 'MDS'...
remote: Enumerating objects: 200, done.
...
```

### Schritt 2: Backend Dependencies

```bash
cd backend
npm install
```

**Das dauert 1-2 Minuten...**

**Erwartete Ausgabe:**
```
added 250+ packages, and audited 251 packages in 45s
```

⚠️ **Warnungen sind okay!** Ignorieren, das ist normal.

### Schritt 3: Umgebungsvariablen

```bash
# .env-Datei aus Template erstellen
cp .env.example .env

# Mit deinem Editor öffnen
code .env          # VS Code
notepad .env       # Windows
nano .env          # Linux/Mac
```

**Mindest-Konfiguration:**

```env
# Datenbank
DATABASE_URL=postgresql://mds_admin:mds_secure_password_2024@localhost:5432/mds
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mds
DB_USER=mds_admin
DB_PASSWORD=mds_secure_password_2024

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_EXPIRY=24h
```

💡 **Tipp:** Generiere ein sicheres JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Schritt 4: Datenbank erstellen

#### PostgreSQL User & Datenbank

```bash
# PostgreSQL Shell öffnen
sudo -u postgres psql
# Oder auf Windows/Mac einfach: psql -U postgres

# In psql Shell - Befehle der Reihe nach:
CREATE DATABASE mds;
CREATE USER mds_admin WITH ENCRYPTED PASSWORD 'mds_secure_password_2024';
GRANT ALL PRIVILEGES ON DATABASE mds TO mds_admin;
\c mds
GRANT ALL ON SCHEMA public TO mds_admin;
\q
```

**Oder mit pgAdmin 4 (GUI):**
1. pgAdmin öffnen
2. Rechtsklick auf "Databases" → "Create" → "Database..."
3. Name: `mds`, Owner: `postgres`
4. Save

### Schritt 5: Migrations ausführen

```bash
# Stelle sicher, dass du im /backend Ordner bist
npm run migrate up
```

**Erwartete Ausgabe:**
```
> Running migration 1737000000000_create-auth-system.js
> Running migration 1737000001000_create-parts-operations.js
> Running migration 1737000002000_create-machines-programs.js
> Running migration 1737000003000_create-audit-log.js
> Running migration 1737000004000_create-maintenance-system.js
> Running migration 1737000005000_seed-test-customers.js
> Running migration 1737000006000_add-parts-status-fields.js

✅ 7 Migrations executed successfully!
```

✅ **28 Tabellen wurden erstellt!**

**Überprüfen:**
```bash
psql -U mds_admin -d mds -c "\dt"
```

### Schritt 6: Test-Daten laden

```bash
npm run seed
```

**Das erstellt:**
- ✅ 6 Rollen (Admin, Programmer, Reviewer, Operator, Helper, Supervisor)
- ✅ 27 Permissions
- ✅ 1 Admin-User (admin@example.com / admin123)
- ✅ 3 Test-Kunden (CUST-001, CUST-002, CUST-003)
- ✅ 6 Workflow-Status

### Schritt 7: Backend starten

```bash
npm run dev
```

**Erwartete Ausgabe:**
```
> mds-backend@1.0.0 dev
> nodemon src/server.js

[nodemon] starting `node src/server.js`

🚀 MDS Backend Server
📦 Version: 1.0.0
🌍 Environment: development
🔌 Port: 5000

✅ Database connected
✅ Server running on http://localhost:5000

Available Endpoints:
  GET  /                    - Root endpoint
  GET  /api/health          - Health check
  GET  /api/db/info         - Database info
  POST /api/auth/register   - User registration
  POST /api/auth/login      - User login
  GET  /api/auth/me         - Get current user
  POST /api/auth/change-password - Change password
  GET  /api/parts           - List all parts
  GET  /api/parts/stats     - Parts statistics
  GET  /api/parts/:id       - Get single part
  POST /api/parts           - Create part
  PUT  /api/parts/:id       - Update part
  DELETE /api/parts/:id     - Delete part
```

✅ **Backend läuft auf:** http://localhost:5000

---

## 🎨 Frontend Installation

### Schritt 1: Frontend Dependencies

**In einem NEUEN Terminal-Fenster:**

```bash
# Vom MDS Root-Verzeichnis
cd frontend
npm install
```

**Das dauert auch 1-2 Minuten...**

**Erwartete Ausgabe:**
```
added 180+ packages, and audited 187 packages in 30s
```

### Schritt 2: Frontend Environment

Die `.env` Datei existiert bereits mit:

```env
# API Configuration
VITE_API_URL=http://localhost:5000
```

✅ **Passt schon!** Keine Änderung nötig.

### Schritt 3: Frontend starten

```bash
npm run dev
```

**Erwartete Ausgabe:**
```
> mds-frontend@1.0.0 dev
> vite

  VITE v7.1.12  ready in 312 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ **Frontend läuft auf:** http://localhost:5173

---

## 🎉 Erste Schritte

### 1. Health Check (Backend)

Browser öffnen: http://localhost:5000/api/health

**Erwartete Antwort:**
```json
{
  "status": "ok",
  "message": "MDS Backend API - Phase 1, Week 3 - Frontend COMPLETE",
  "timestamp": "2025-11-02T12:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "environment": "development"
}
```

✅ **"status": "ok"** → Backend läuft perfekt!

### 2. Frontend öffnen

Browser öffnen: http://localhost:5173

Du solltest die **Login-Seite** sehen! 🎨

### 3. Login testen

**Standard-Login:**
```
Username: admin
(oder Email: admin@example.com)
Passwort: admin123
```

Nach Login solltest du das **Dashboard** sehen mit:
- 👋 Willkommen zurück, admin!
- 📊 Stats Cards (Bauteile, Aktiv, Entwurf, Kunden)
- ⚡ Quick Actions
- 👤 User Info

### 4. Bauteile anschauen

Klicke auf **"Bauteile"** in der Navigation oder in den Quick Actions.

Du solltest eine Tabelle sehen (leer, weil noch keine Parts erstellt wurden).

✅ **Alles funktioniert!**

---

## 🧪 API Testing

### Mit VS Code REST Client

1. VS Code öffnen
2. Extension installieren: "REST Client"
3. Dateien öffnen:
   - `backend/test-auth.http`
   - `backend/test-parts.http`
4. Auf "Send Request" klicken

**test-auth.http Beispiel:**
```http
### Login as Admin
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "login": "admin",
  "password": "admin123"
}
```

### Mit cURL

```bash
# Health Check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"admin123"}'
```

---

## 🛠 Troubleshooting

### Problem: Backend - "Port 5000 already in use"

**Lösung 1:** Anderen Port verwenden
```bash
# In backend/.env
PORT=5001
```

**Lösung 2:** Prozess beenden
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :5000
kill -9 <PID>
```

### Problem: Frontend - "Port 5173 already in use"

**Lösung:** Vite wählt automatisch einen anderen Port (5174, 5175, etc.)

### Problem: "CORS Error" im Browser

**Symptom:** Browser Console zeigt:
```
Access to XMLHttpRequest at 'http://localhost:5000/api/...' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Lösung:** CORS muss im Backend aktiviert werden (Woche 4!)

```bash
# Im backend/ Ordner
npm install cors

# In src/server.js hinzufügen (ganz oben):
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

### Problem: "Database connection failed"

**Checklist:**

1. **PostgreSQL läuft?**
   ```bash
   # Windows: services.msc → "PostgreSQL" → Running?
   # Linux: sudo systemctl status postgresql
   # Mac: brew services list
   ```

2. **Credentials richtig?**
   ```bash
   psql -U mds_admin -d mds
   # Funktioniert? → Credentials OK!
   ```

3. **Datenbank existiert?**
   ```bash
   psql -U postgres -c "\l" | grep mds
   ```

### Problem: "Migrations failed"

**Reset:**
```bash
npm run migrate down
npm run migrate up
```

**Datenbank komplett neu:**
```bash
# ⚠️ ACHTUNG: Löscht ALLE Daten!
psql -U postgres -c "DROP DATABASE IF EXISTS mds;"
psql -U postgres -c "CREATE DATABASE mds;"
psql -U postgres -c "CREATE USER mds_admin WITH ENCRYPTED PASSWORD 'mds_secure_password_2024';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE mds TO mds_admin;"
npm run migrate up
npm run seed
```

### Problem: Frontend - Weißer Bildschirm

**Lösung 1:** Browser-Console öffnen (F12) und Fehler prüfen

**Lösung 2:** Frontend neu bauen
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Problem: "Login failed" im Frontend

**Checklist:**
1. Backend läuft? → http://localhost:5000/api/health
2. CORS aktiviert? (siehe oben)
3. Credentials richtig? (admin / admin123)
4. Browser Console Fehler prüfen (F12)

---

## 📚 Nächste Schritte

### Woche 4: Integration & Testing

**Was kommt als nächstes:**
- ✅ CORS Backend aktivieren (siehe Troubleshooting oben)
- ✅ Part Detail Page (`/parts/:id`)
- ✅ Part Create/Edit Forms
- ✅ Form Validation (React Hook Form)
- ✅ Toast Notifications
- ✅ Loading Skeletons
- ✅ Bug Fixes & Polish

### Dokumentation lesen

- 📖 [README.md](./README.md) - Projekt-Übersicht
- 📖 [ROADMAP.md](./ROADMAP.md) - 16-Wochen Plan
- 📖 [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System-Architektur
- 📖 [DATABASE.md](./backend/docs/DATABASE.md) - DB-Schema
- 📖 [WEEK-2-COMPLETE.md](./backend/docs/WEEK-2-COMPLETE.md) - Backend Docs
- 📖 [Frontend README](./frontend/README.md) - Frontend Docs
- 📖 [SESSION-2025-11-02-WEEK3.md](./docs/sessions/SESSION-2025-11-02-WEEK3.md) - Woche 3 Bericht

### Code erkunden

```bash
# Backend Struktur
tree backend/src -L 2

# Frontend Struktur
tree frontend/src -L 2

# Stores anschauen (Zustand State Management)
cat frontend/src/stores/authStore.js
cat frontend/src/stores/partsStore.js

# Pages anschauen
cat frontend/src/pages/LoginPage.jsx
cat frontend/src/pages/DashboardPage.jsx
```

### Development Workflow

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Browser:**
- Frontend: http://localhost:5173
- Backend Health: http://localhost:5000/api/health

**Hot Reload:** Beide Server unterstützen Hot Module Replacement!

---

## ✅ Checkliste

Arbeite diese Liste ab:

**Voraussetzungen:**
- [ ] Node.js 18+ installiert
- [ ] PostgreSQL 15+ installiert
- [ ] Git installiert

**Backend:**
- [ ] Repository geklont
- [ ] Backend Dependencies installiert (`cd backend && npm install`)
- [ ] `.env` konfiguriert
- [ ] Datenbank `mds` erstellt
- [ ] User `mds_admin` erstellt
- [ ] Migrations ausgeführt (`npm run migrate up`)
- [ ] Seeds geladen (`npm run seed`)
- [ ] Backend gestartet (`npm run dev`)
- [ ] Health Check erfolgreich (http://localhost:5000/api/health)

**Frontend:**
- [ ] Frontend Dependencies installiert (`cd frontend && npm install`)
- [ ] Frontend gestartet (`npm run dev`)
- [ ] Login-Seite lädt (http://localhost:5173)
- [ ] Login funktioniert (admin / admin123)
- [ ] Dashboard wird angezeigt
- [ ] Bauteile-Seite lädt

**Optional (Woche 4):**
- [ ] CORS Backend aktiviert
- [ ] API-Tests funktionieren (test-auth.http, test-parts.http)

**Alles ✅?** → **Du bist startklar! 🚀**

---

## 🆘 Hilfe benötigt?

### Community

- **Issues:** [github.com/mcr14410-master/MDS/issues](https://github.com/mcr14410-master/MDS/issues)
- **Discussions:** [github.com/mcr14410-master/MDS/discussions](https://github.com/mcr14410-master/MDS/discussions)

### Häufige Fragen

**Q: Welche Ports werden verwendet?**  
A: Backend = 5000, Frontend = 5173

**Q: Kann ich MySQL statt PostgreSQL verwenden?**  
A: Nein, das Projekt ist für PostgreSQL optimiert (JSONB, Arrays, etc.)

**Q: Läuft das auf Windows?**  
A: Ja! Alle Tools sind Windows-kompatibel.

**Q: Brauche ich Docker?**  
A: Nein, für Entwicklung nicht. Docker kommt in Woche 16 für Deployment.

**Q: Muss ich CORS aktivieren?**  
A: Ja, für Frontend ↔ Backend Kommunikation. Siehe Troubleshooting oben.

**Q: Kann ich das produktiv nutzen?**  
A: Noch nicht - wir sind in Phase 1 (Development). April 2025 = Production-Ready.

**Q: Wo finde ich die API-Dokumentation?**  
A: Backend Endpoints sind in `test-auth.http` und `test-parts.http` dokumentiert.

---

## 🎯 Quick Commands

**Backend:**
```bash
cd backend
npm run dev          # Dev Server starten
npm run migrate up   # Migrations ausführen
npm run migrate down # Migrations zurückrollen
npm run seed        # Test-Daten laden
```

**Frontend:**
```bash
cd frontend
npm run dev         # Dev Server starten
npm run build       # Production Build
npm run preview     # Build Preview
```

**Database:**
```bash
psql -U mds_admin -d mds              # DB Shell
psql -U mds_admin -d mds -c "\dt"     # Tabellen auflisten
psql -U mds_admin -d mds -c "SELECT * FROM users;" # Query
```

---

## 🎉 Du hast es geschafft!

```
✅ Backend läuft auf Port 5000
✅ Frontend läuft auf Port 5173
✅ Login funktioniert
✅ Dashboard wird angezeigt
✅ Phase 1, Woche 3 COMPLETE!
```

**Nächster Schritt:** [ROADMAP.md](./ROADMAP.md) - Was kommt in Woche 4?

---

<div align="center">

**🎉 Willkommen beim MDS Projekt! 🎉**

[📖 Zurück zur README](./README.md) · [🗺️ Roadmap](./ROADMAP.md) · [🐛 Issues](https://github.com/mcr14410-master/MDS/issues)

**Made with ❤️ by mcr14410-master & Claude**

</div>
