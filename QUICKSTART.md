# 🚀 Quick Start Guide - MDS

> **Von 0 auf 100 in 10 Minuten!**  
> Diese Anleitung führt dich Schritt-für-Schritt durch die Installation und den ersten Start.

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Installation](#installation)
3. [Erste Schritte](#erste-schritte)
4. [Troubleshooting](#troubleshooting)
5. [Nächste Schritte](#nächste-schritte)

---

## ✅ Voraussetzungen

### Benötigte Software

| Software | Mindestversion | Download | Check |
|----------|----------------|----------|-------|
| **Node.js** | 18.0.0 | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | 9.0.0 | (mit Node.js) | `npm --version` |
| **PostgreSQL** | 15.0 | [postgresql.org](https://www.postgresql.org/download/) | `psql --version` |
| **Git** | 2.30.0 | [git-scm.com](https://git-scm.com/) | `git --version` |

### Optionale Software

| Software | Zweck | Download |
|----------|-------|----------|
| **pgAdmin 4** | Datenbank-GUI | [pgadmin.org](https://www.pgadmin.org/) |
| **Postman** | API-Testing | [postman.com](https://www.postman.com/) |
| **VS Code** | Code-Editor | [code.visualstudio.com](https://code.visualstudio.com/) |

### Versionen überprüfen

```bash
# Alle auf einmal checken
node --version && npm --version && psql --version && git --version
```

**Erwartete Ausgabe:**
```
v18.x.x
9.x.x
psql (PostgreSQL) 15.x
git version 2.x.x
```

✅ **Alles grün?** → Weiter geht's!  
❌ **Etwas fehlt?** → Software installieren und neu checken

---

## 📦 Installation

### Schritt 1: Repository klonen

```bash
# HTTPS (empfohlen für Anfänger)
git clone https://github.com/mcr14410-master/MDS.git
cd MDS

# Oder SSH (wenn eingerichtet)
git clone git@github.com:mcr14410-master/MDS.git
cd MDS
```

**Erwartete Ausgabe:**
```
Cloning into 'MDS'...
remote: Enumerating objects: 150, done.
remote: Counting objects: 100% (150/150), done.
...
```

### Schritt 2: Backend Dependencies installieren

```bash
cd backend
npm install
```

**Das dauert 1-2 Minuten...**

**Erwartete Ausgabe:**
```
added 250 packages, and audited 251 packages in 45s
```

✅ **Keine Fehler?** → Super!  
⚠️ **Warnungen sind okay!** → Ignorieren, das ist normal

### Schritt 3: Umgebungsvariablen konfigurieren

```bash
# .env-Datei aus Template erstellen
cp .env.example .env

# Mit deinem Editor öffnen (z.B.)
code .env          # VS Code
notepad .env       # Windows Notepad
nano .env          # Linux/Mac Terminal
```

**Mindest-Konfiguration (passe an!):**

```env
# Datenbank
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=mds
DATABASE_USER=postgres
DATABASE_PASSWORD=dein-passwort-hier

# Server
PORT=5000
NODE_ENV=development

# JWT (für später)
JWT_SECRET=dein-geheimes-token-hier-min-32-zeichen
JWT_EXPIRES_IN=24h
```

**💡 Tipp:** Generiere ein sicheres JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Schritt 4: Datenbank erstellen

#### Option A: Mit psql (Kommandozeile)

```bash
# PostgreSQL Shell öffnen
psql -U postgres

# In psql Shell:
CREATE DATABASE mds;
\l                    # Datenbanken auflisten (mds sollte jetzt da sein)
\q                    # Beenden
```

#### Option B: Mit pgAdmin 4 (GUI)

1. pgAdmin öffnen
2. Rechtsklick auf "Databases" → "Create" → "Database..."
3. Name: `mds`
4. Save

### Schritt 5: Migrations ausführen

```bash
# Stelle sicher, dass du im /backend Ordner bist
npm run migrate:up
```

**Erwartete Ausgabe:**
```
> mds-backend@1.0.0 migrate:up
> node-pg-migrate up

> Running migration: 20250115000001_auth.js
> Running migration: 20250115000002_production.js
> Running migration: 20250115000003_machines.js
> Running migration: 20250115000004_documentation.js
> Running migration: 20250115000005_system.js

✅ All migrations completed successfully!
```

✅ **28 Tabellen wurden erstellt!**

**Überprüfen:**
```bash
psql -U postgres -d mds -c "\dt"
```

### Schritt 6: Test-Daten laden (optional, aber empfohlen)

```bash
npm run seed
```

**Erwartete Ausgabe:**
```
🌱 Starting database seeding...
✅ Roles seeded: 4 roles
✅ Permissions seeded: 15 permissions
✅ Users seeded: 5 users
✅ Customers seeded: 3 customers
✅ Parts seeded: 5 parts
✅ Machines seeded: 4 machines
...
✅ All seeds completed successfully!
```

**Das erstellt:**
- 5 Test-Benutzer (Admin, Meister, Facharbeiter, Helfer, Lagerarbeiter)
- 3 Kunden
- 5 Bauteile
- 4 Maschinen
- + weitere Test-Daten

### Schritt 7: Backend starten

```bash
npm run dev
```

**Erwartete Ausgabe:**
```
> mds-backend@1.0.0 dev
> nodemon src/server.js

[nodemon] 2.0.x
[nodemon] watching path(s): src/**/*
[nodemon] watching extensions: js,json
[nodemon] starting `node src/server.js`

🚀 Server running on http://localhost:5000
✅ Database connected successfully
```

---

## 🎉 Erste Schritte

### Health Check

Öffne deinen Browser und gehe zu:

```
http://localhost:5000/api/health
```

**Erwartete Antwort:**
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```

✅ **"status": "ok"** → Alles läuft!

### Standard-Login

**Admin-Account:**
```
Email:    admin@example.com
Password: admin123
```

⚠️ **WICHTIG:** Ändere das Passwort nach dem ersten Login!

**Weitere Test-Accounts:** (siehe `backend/src/config/seeds.js`)
```
Meister:       meister@example.com   / meister123
Facharbeiter:  facharbeiter@example.com / facharbeiter123
Helfer:        helfer@example.com    / helfer123
Lagerarbeiter: lager@example.com     / lager123
```

### API testen mit cURL

```bash
# Health Check
curl http://localhost:5000/api/health

# Login (später, wenn Auth implementiert)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

### API testen mit Postman

1. Postman öffnen
2. New Request
3. Method: `GET`
4. URL: `http://localhost:5000/api/health`
5. Send

---

## 🐛 Troubleshooting

### Problem: "Port 5000 already in use"

**Lösung 1:** Anderen Port verwenden
```bash
# In .env
PORT=5001
```

**Lösung 2:** Prozess beenden (Windows)
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Lösung 2:** Prozess beenden (Linux/Mac)
```bash
lsof -i :5000
kill -9 <PID>
```

### Problem: "Database connection failed"

**Checklist:**
1. Ist PostgreSQL gestartet?
   ```bash
   # Windows (Services)
   services.msc → "PostgreSQL" → Running?
   
   # Linux
   sudo systemctl status postgresql
   
   # Mac
   brew services list
   ```

2. Sind die DB-Credentials richtig?
   ```bash
   psql -U postgres -d mds
   # Funktioniert das? → Credentials OK!
   ```

3. Existiert die Datenbank?
   ```bash
   psql -U postgres -c "\l" | grep mds
   ```

### Problem: "Migrations failed"

**Reset:**
```bash
# Migrations zurücksetzen
npm run migrate:down

# Neu starten
npm run migrate:up
```

**Datenbank komplett neu:**
```bash
# ⚠️ ACHTUNG: Löscht ALLE Daten!
psql -U postgres -c "DROP DATABASE IF EXISTS mds;"
psql -U postgres -c "CREATE DATABASE mds;"
npm run migrate:up
npm run seed
```

### Problem: "npm install" schlägt fehl

**Lösung:**
```bash
# Cache leeren
npm cache clean --force

# Neu installieren
rm -rf node_modules package-lock.json
npm install
```

### Problem: "Permission denied"

**Windows:** Als Administrator ausführen  
**Linux/Mac:** `sudo` verwenden oder Berechtigungen anpassen

---

## 📚 Nächste Schritte

### 1. Dokumentation lesen

- [📖 ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System-Architektur verstehen
- [📖 DATABASE.md](./backend/docs/DATABASE.md) - Datenbank-Schema im Detail
- [📖 ROADMAP.md](./ROADMAP.md) - Was kommt als nächstes?

### 2. Code erkunden

```bash
# Projekt-Struktur anschauen
tree -L 3

# Migrations anschauen
cat backend/src/migrations/01_auth.js

# Seeds anschauen
cat backend/src/config/seeds.js
```

### 3. Entwicklung starten

**Woche 2:** Backend API + JWT Auth
- Express Server erweitern
- Authentication implementieren
- CRUD Endpoints erstellen
- API-Dokumentation schreiben

**Woche 3:** Frontend Basis
- React App Setup
- Login-UI
- Bauteile-Verwaltung

### 4. Contributing

Möchtest du mithelfen?
- [📖 CONTRIBUTING.md](./CONTRIBUTING.md) lesen
- Issue erstellen
- Pull Request senden

---

## 🆘 Hilfe benötigt?

### Community

- **Issues:** [github.com/mcr14410-master/MDS/issues](https://github.com/mcr14410-master/MDS/issues)
- **Discussions:** [github.com/mcr14410-master/MDS/discussions](https://github.com/mcr14410-master/MDS/discussions)

### Häufige Fragen

**Q: Kann ich MySQL statt PostgreSQL verwenden?**  
A: Nein, das Projekt ist für PostgreSQL optimiert (JSONB, Arrays, etc.)

**Q: Läuft das auf Windows?**  
A: Ja! Alle Tools sind Windows-kompatibel.

**Q: Brauche ich Docker?**  
A: Nein, für Entwicklung nicht. Docker kommt in Woche 16 für Deployment.

**Q: Kann ich das produktiv nutzen?**  
A: Noch nicht - wir sind in Phase 1 (Development). April 2025 = Production-Ready.

---

## ✅ Checkliste

Arbeite diese Liste ab:

- [ ] Node.js 18+ installiert
- [ ] PostgreSQL 15+ installiert
- [ ] Git installiert
- [ ] Repository geklont
- [ ] Dependencies installiert (`npm install`)
- [ ] `.env` konfiguriert
- [ ] Datenbank `mds` erstellt
- [ ] Migrations ausgeführt (`npm run migrate:up`)
- [ ] Seeds geladen (`npm run seed`)
- [ ] Backend gestartet (`npm run dev`)
- [ ] Health Check erfolgreich (`http://localhost:5000/api/health`)

**Alles ✅?** → **Du bist startklar! 🚀**

---

## 🎯 Los geht's!

```bash
# Backend läuft?
npm run dev

# In neuem Terminal: Frontend (Woche 3)
cd ../frontend
npm run dev

# Öffne Browser:
# http://localhost:3000  (Frontend)
# http://localhost:5000  (Backend)
```

---

<div align="center">

**🎉 Willkommen beim MDS Projekt! 🎉**

[📖 Zurück zur README](./README.md) · [🗺️ Roadmap](./ROADMAP.md) · [🐛 Issues](https://github.com/mcr14410-master/MDS/issues)

</div>
