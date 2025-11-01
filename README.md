# 🏭 MDS - Manufacturing Data System

> **Professionelles Fertigungsdaten-Management für CNC-Fertigung**  
> Versionskontrolle · RBAC · Wartungsmanagement · Audit-Trail

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com/mcr14410-master/MDS)
[![Phase](https://img.shields.io/badge/Phase-1%20Fundament-blue)](./ROADMAP.md)
[![Week](https://img.shields.io/badge/Week-1%20Complete-success)](./docs/sessions/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

---

## 🎯 Was ist MDS?

MDS (Manufacturing Data System) ist ein modernes Fertigungsdaten-Management-System für kleine bis mittlere CNC-Fertigungsbetriebe. Es kombiniert klassisches PDM mit modernen DevOps-Praktiken und bietet:

- **🔄 Git-Style Versionierung** für NC-Programme
- **🔐 RBAC** - Role-Based Access Control mit Berechtigungsmanagement
- **📋 Workflow-Engine** - Draft → Review → Release Pipeline
- **🔧 Wartungssystem** mit Skill-Level-Support (Helfer → Bediener → Meister)
- **📱 QR-Codes** für schnellen Shopfloor-Zugriff per Tablet/Smartphone
- **📊 Audit-Trail** - vollständige Rückverfolgbarkeit aller Änderungen
- **🔗 CAM-Integration** - automatischer Import über File Watcher
- **🏭 Multi-Maschinen** - Verwaltung des gesamten Maschinenparks

---

## 📊 Aktueller Status

### Phase 1, Woche 1 ✅ ABGESCHLOSSEN

**Datenbank-Schema komplett fertiggestellt!**

```
✅ 28 Tabellen in 5 Kategorien entworfen
✅ 5 Migrations geschrieben (01-auth bis 05-system)
✅ Migrations-System (node-pg-migrate) eingerichtet
✅ Test-Daten (Seeds) für alle Tabellen erstellt
✅ Vollständige Dokumentation (DATABASE.md)
```

**Arbeitszeit:** 6h investiert  
**Nächster Schritt:** Backend API + JWT Auth (Woche 2)

[📖 Detaillierte Wochenübersicht](./backend/docs/WEEK-1-SUMMARY.md) | [🗺️ Vollständige Roadmap](./ROADMAP.md)

---

## 🏗️ Architektur

### Tech-Stack

**Backend** (Node.js)
```
Express           - REST API Framework
PostgreSQL 15+    - Relationale Datenbank
JWT               - Token-basierte Authentifizierung
node-pg-migrate   - Schema-Migration Management
Multer            - File Upload Handling
Chokidar          - File System Watcher (CAM-Integration)
```

**Frontend** (React) - *Start in Woche 3*
```
React 18          - UI Framework
React Router      - Client-Side Routing
Axios             - HTTP Client
TailwindCSS       - Utility-First Styling
```

**Deployment**
```
Docker            - Containerisierung
Docker Compose    - Multi-Container Orchestrierung
nginx             - Reverse Proxy & Static File Serving
Raspberry Pi      - Edge Computing Support
```

### Datenbank-Schema

**28 Tabellen organisiert in 6 Kategorien:**

| Kategorie | Tabellen | Beschreibung |
|-----------|----------|--------------|
| **🔐 Auth** | 5 | Users, Roles, Permissions, User-Roles, Role-Permissions |
| **🏭 Produktion** | 5 | Customers, Parts, Operations, Programs, Program-Revisions |
| **🤖 Maschinen** | 3 | Machines, Tools, Workflow-States |
| **📝 Dokumentation** | 2 | Setup-Sheets, Setup-Photos |
| **🔧 Wartung** | 6 | Types, Plans, Tasks, Checklist-Items, Completions, Photos |
| **⚙️ System** | 4 | Audit-Logs, Comments, QR-Codes, Notifications |

**Features:**
- ✅ Vollständige Fremdschlüssel-Beziehungen
- ✅ Automatische Timestamps (created_at, updated_at)
- ✅ Soft-Deletes für sichere Datenlöschung
- ✅ Indizes für Performance-Optimierung
- ✅ JSON-Felder für flexible Metadaten

[📖 Vollständige Schema-Dokumentation](./backend/docs/DATABASE.md)

---

## 🚀 Quick Start

### Voraussetzungen

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 15+ ([Download](https://www.postgresql.org/download/))
- **Git** ([Download](https://git-scm.com/))

### Installation (5 Minuten)

```bash
# 1. Repository klonen
git clone https://github.com/mcr14410-master/MDS.git
cd MDS

# 2. Backend-Dependencies installieren
cd backend
npm install

# 3. Umgebungsvariablen konfigurieren
cp .env.example .env
# .env bearbeiten (DB-Credentials anpassen)

# 4. Datenbank erstellen
psql -U postgres
CREATE DATABASE mds;
\q

# 5. Migrations ausführen
npm run migrate:up

# 6. Test-Daten laden (optional)
npm run seed

# 7. Backend starten
npm run dev
```

**✅ Backend läuft auf:** http://localhost:5000  
**✅ Health Check:** http://localhost:5000/api/health

**Standard-Login:**
```
Email:    admin@example.com
Password: admin123
⚠️ WICHTIG: Nach erstem Login ändern!
```

[📖 Detaillierte Installationsanleitung](./QUICKSTART.md)

---

## 📁 Projekt-Struktur

```
MDS/
├── backend/                    # Node.js Backend
│   ├── src/
│   │   ├── migrations/         # 5 Datenbank-Migrations (01-05)
│   │   │   ├── 01_auth.js      # User/Role/Permission System
│   │   │   ├── 02_production.js# Customers/Parts/Operations
│   │   │   ├── 03_machines.js  # Maschinen & Workflow
│   │   │   ├── 04_documentation.js # Setup-Sheets & Photos
│   │   │   └── 05_system.js    # Audit/Comments/QR/Notifications
│   │   ├── config/
│   │   │   ├── database.js     # DB-Konfiguration
│   │   │   └── seeds.js        # Test-Daten (20+ Datensätze)
│   │   ├── server.js           # Express-Server (Woche 2)
│   │   └── ...
│   ├── docs/
│   │   ├── DATABASE.md         # DB-Setup & Schema-Dokumentation
│   │   ├── WEEK-1-SUMMARY.md   # Woche 1 Zusammenfassung
│   │   └── API.md              # API-Dokumentation (Woche 2)
│   ├── .env.example            # Umgebungsvariablen-Template
│   ├── .migrationrc.json       # Migration-Konfiguration
│   └── package.json
│
├── frontend/                   # React Frontend (Woche 3)
│   └── (noch nicht erstellt)
│
├── docs/
│   ├── ARCHITECTURE.md         # System-Architektur & Features
│   └── sessions/               # Session-Protokolle
│       ├── SESSION-2025-01-15.md
│       └── TEMPLATE.md
│
├── README.md                   # Diese Datei
├── QUICKSTART.md               # Schnellstart-Anleitung
├── ROADMAP.md                  # 16-Wochen Detailplan
├── CHANGELOG.md                # Alle Änderungen protokolliert
├── CONTRIBUTING.md             # Contribution Guidelines
├── .gitignore
└── LICENSE
```

---

## 🗺️ Roadmap

### ✅ Phase 1 - Monat 1: Fundament (Wochen 1-4)

**Woche 1: ✅ KOMPLETT** - Datenbank-Schema
- [x] 28 Tabellen entworfen
- [x] 5 Migrations geschrieben
- [x] Seeds erstellt
- [x] Dokumentation

**Woche 2: 📋 GEPLANT** - Backend API + Auth
- [ ] Express Server aufsetzen
- [ ] JWT Authentication implementieren
- [ ] User/Role/Permission System
- [ ] CRUD Endpoints für Bauteile
- [ ] Audit-Log Middleware

**Woche 3: 📋 GEPLANT** - Frontend Basis
- [ ] React App Setup
- [ ] Login/Logout UI
- [ ] Bauteile-Übersicht
- [ ] CRUD-Operationen
- [ ] Responsive Design

**Woche 4: 📋 GEPLANT** - Integration & Testing
- [ ] Frontend ↔ Backend Verbindung
- [ ] End-to-End Tests
- [ ] Bug-Fixes
- [ ] ✅ **MEILENSTEIN 1**: Lauffähiges Basis-System

### 📋 Phase 2 - Monat 2: Kern-Features (Wochen 5-8)

- Operations Management
- NC-Programme mit Versionierung
- File Upload System
- Maschinenpark-Verwaltung

### 📋 Phase 3 - Monat 3: Workflows & Wartung (Wochen 9-12)

- Workflow-System (Draft → Review → Release)
- QR-Code Generation
- File Watcher (CAM-Integration)
- Wartungssystem

### 📋 Phase 4 - Monat 4: Feinschliff (Wochen 13-16)

- Shopfloor-UI (Tablet-optimiert)
- Einrichteblätter & Foto-Management
- Reports & Analytics
- Production Deployment

[📖 Vollständige 16-Wochen Roadmap](./ROADMAP.md)

---

## 📖 Dokumentation

| Dokument | Beschreibung | Status |
|----------|--------------|--------|
| [QUICKSTART.md](./QUICKSTART.md) | Schnellstart-Anleitung | ✅ Aktuell |
| [ROADMAP.md](./ROADMAP.md) | 16-Wochen Detailplan | ✅ Aktuell |
| [CHANGELOG.md](./CHANGELOG.md) | Alle Änderungen | ✅ Aktuell |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contribution Guidelines | ✅ Aktuell |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System-Architektur | ✅ Aktuell |
| [backend/docs/DATABASE.md](./backend/docs/DATABASE.md) | Datenbank-Setup | ✅ Aktuell |
| [backend/docs/WEEK-1-SUMMARY.md](./backend/docs/WEEK-1-SUMMARY.md) | Woche 1 Bericht | ✅ Aktuell |
| [backend/docs/API.md](./backend/docs/API.md) | API-Dokumentation | 📋 Woche 2 |

---

## 🎯 Features

### ✅ Bereits implementiert (Woche 1)

- ✅ **Datenbank-Schema** - 28 Tabellen, vollständig normalisiert
- ✅ **Migrations-System** - Schema-Versionierung mit node-pg-migrate
- ✅ **Seed-Daten** - Test-Daten für Entwicklung
- ✅ **Audit-Trail** - Jede Änderung wird protokolliert
- ✅ **RBAC-Schema** - Granulare Berechtigungen vorbereitet

### 📋 Geplant (Wochen 2-16)

**Backend API** (Woche 2)
- JWT Authentication
- User/Role/Permission Management
- CRUD Endpoints
- Audit-Log Middleware

**Frontend** (Woche 3)
- React 18 SPA
- Login/Logout Flow
- Bauteile-Verwaltung
- Responsive Design

**Versionierung** (Woche 7)
- Git-Style für NC-Programme
- Diff-Berechnung
- Rollback-Funktion
- Versions-Historie

**Wartung** (Wochen 11-12)
- Wartungspläne
- Skill-Level-System
- Foto-Anleitungen
- Eskalations-System

**CAM-Integration** (Woche 10)
- File Watcher (TopSolid)
- Auto-Import Dialog
- G-Code Parser

**Shopfloor** (Woche 13)
- QR-Code Scanner
- Tablet-optimiertes UI
- Touch-Bedienung
- Offline-Modus

[🗺️ Vollständige Feature-Liste](./ROADMAP.md)

---

## 🤝 Contributing

Dieses Projekt wird aktiv entwickelt. Contributions sind willkommen!

### Wie kann ich helfen?

1. **Code-Review** - Feedback zu Code & Architektur
2. **Testing** - Features testen & Bugs melden
3. **Dokumentation** - Verbesserungen & Übersetzungen
4. **Features** - Neue Features vorschlagen/implementieren

### Workflow

```bash
# 1. Fork & Clone
git clone https://github.com/YOUR-USERNAME/MDS.git

# 2. Branch erstellen
git checkout -b feature/mein-feature

# 3. Änderungen machen
# ... code, code, code ...

# 4. Commit & Push
git commit -m "feat: mein tolles Feature"
git push origin feature/mein-feature

# 5. Pull Request erstellen
```

[📖 Detaillierte Contribution Guidelines](./CONTRIBUTING.md)

---

## 📊 Projekt-Status

```
Phase 1 (Fundament):    ████░░░░░░░░░░░░░░░░ 20%
  └─ Woche 1:           ████████████████████ 100% ✅

Gesamt-Fortschritt:     █░░░░░░░░░░░░░░░░░░░  5%
```

**Arbeitszeit investiert:** 6h / ~480h geschätzt  
**Geschätzte Fertigstellung:** April 2025  
**Zeitbudget:** 30-35h/Woche

---

## 👨‍💻 Team

**Entwickler:** [mcr14410-master](https://github.com/mcr14410-master)  
**KI-Assistent:** Claude (Anthropic)

---

## 📝 Lizenz

MIT License - siehe [LICENSE](./LICENSE) für Details.

**Kommerzielle Nutzung:** ✅ Erlaubt  
**Modification:** ✅ Erlaubt  
**Distribution:** ✅ Erlaubt  
**Private Use:** ✅ Erlaubt

---

## 🙏 Acknowledgments

**Inspiriert von:**
- Predator PDM
- SolidShop
- iTAC.MOM
- Siemens Teamcenter

**Built with:**
- Node.js
- PostgreSQL
- React
- Docker

**Entwickelt für:**
- Kleine bis mittlere CNC-Fertigungsbetriebe
- Luftfahrt-zertifizierte Produktion
- ISO 9001 konforme Fertigung

---

## 💬 Support & Kontakt

- **Issues:** [GitHub Issues](https://github.com/mcr14410-master/MDS/issues)
- **Discussions:** [GitHub Discussions](https://github.com/mcr14410-master/MDS/discussions)
- **Email:** [mcr14410.master@example.com](mailto:mcr14410.master@example.com)

---

## 🚀 Status

**🎉 Phase 1, Woche 1 - ABGESCHLOSSEN!**

**Next Steps:**
- Woche 2: Backend API + JWT Auth
- Express Server Setup
- User Authentication
- CRUD Endpoints

**Bereit für die nächste Session?** → [Starte hier](./QUICKSTART.md)

---

<div align="center">

**⭐ Star this repo wenn es dir gefällt! ⭐**

[📖 Dokumentation](./docs/) · [🗺️ Roadmap](./ROADMAP.md) · [🐛 Issues](https://github.com/mcr14410-master/MDS/issues) · [💬 Discussions](https://github.com/mcr14410-master/MDS/discussions)

</div>
