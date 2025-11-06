# 🏭 MDS - Manufacturing Data System

> **Professionelles Fertigungsdaten-Management für CNC-Fertigung**  
> Versionskontrolle · RBAC · Wartungsmanagement · Audit-Trail

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)](https://github.com/mcr14410-master/MDS)
[![Phase](https://img.shields.io/badge/Phase-2%20Complete-success)](./ROADMAP.md)
[![Week](https://img.shields.io/badge/Week-7%20Complete-success)](./docs/sessions/)
[![Progress](https://img.shields.io/badge/Progress-37%25-brightgreen)](./ROADMAP.md)
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

### ✅ Phase 1 - 100% Complete (Wochen 1-4 ✅)
### ✅ Phase 2 - 100% Complete (Wochen 5-7 ✅)
### 🎊 **MEILENSTEIN 2 ERREICHT!**

#### ✅ Woche 1: Datenbank-Schema (ABGESCHLOSSEN)
```
✅ 28 Tabellen in 6 Kategorien
✅ 7 Migrations (5 base + 2 enhancements)
✅ Test-Daten (Seeds) für alle Tabellen
✅ Express Server Basis
✅ 3 Test-Kunden (CUST-001, CUST-002, CUST-003)
```

#### ✅ Woche 2: Backend API + Auth (ABGESCHLOSSEN)
```
✅ JWT Authentication (Login, Register, Token Verification)
✅ User Management (4 Endpoints)
✅ Auth Middleware (Token, Permission, Role Checks)
✅ Parts CRUD API (6 Endpoints mit Permissions)
✅ Audit-Log System (automatisches Tracking)
✅ Test-Suite (test-auth.http, test-parts.http)
✅ ~1500 Lines of Code
✅ 10 API Endpoints total
```

#### ✅ Woche 3: Frontend React App (ABGESCHLOSSEN)
```
✅ React 19 + Vite Setup
✅ TailwindCSS v4 Integration
✅ Zustand State Management (Auth + Parts Stores)
✅ React Router v7 mit Protected Routes
✅ Login/Logout UI (vollständig funktional)
✅ Dashboard mit Stats Cards
✅ Parts List mit Filter & Search
✅ Permission-based Navigation
✅ Responsive Design
✅ ~900 Lines of Frontend Code
```

#### ✅ Woche 4: Integration & Testing (ABGESCHLOSSEN)
```
✅ Frontend ↔ Backend vollständig integriert
✅ Part Detail Page (vollständige Ansicht)
✅ Part Create/Edit Forms (mit Validierung)
✅ Toast Notification System (selbst gebaut)
✅ CORS konfiguriert
✅ Alle CRUD-Operationen funktionieren
✅ Permission-based UI überall
✅ 9 Bugs gefixed
✅ ~1200 Lines neuer Frontend Code
🎉 MEILENSTEIN 1 ERREICHT: Lauffähiges Basis-System
```

#### ✅ Woche 5: Operations (Arbeitsgänge) (ABGESCHLOSSEN)
```
✅ Operations Backend CRUD API (373 Zeilen)
✅ Backend Testing (626 Zeilen Test-Szenarien)
✅ Operations Frontend Components (970 Zeilen)
  ├─ operationsStore.js - State Management
  ├─ OperationCard.jsx - Card Component
  ├─ OperationsList.jsx - Liste mit Sortierung
  ├─ OperationForm.jsx - Modal Form
  └─ PartDetailPage.jsx - Tab-System erweitert
✅ Auto-Sequence Generierung (OP10, OP20, OP30...)
✅ Tab-System (Details / Arbeitsgänge)
✅ Modal Form für Create/Edit
✅ Zeit-Eingabe vereinheitlicht (beide in Minuten)
✅ Intelligente Zeit-Anzeige (30s / 3.5 Min / 2h 10m)
✅ 3 Bugs gefixed (Response Format, Infinite Loop, Create Error)
✅ Production-Ready
```

#### ✅ Woche 6: Programme & File Upload (ABGESCHLOSSEN)
```
✅ File Upload Backend (Multer Middleware)
✅ Programs CRUD API (6 Endpoints)
✅ Programs Frontend Components (1020 Zeilen)
  ├─ programsStore.js - State Management
  ├─ ProgramsList.jsx - Grid Layout
  ├─ ProgramCard.jsx - Card mit Actions
  ├─ ProgramUploadForm.jsx - Multi-Format Upload
  └─ ProgramViewer.jsx - Syntax Highlighting
✅ 15 Dateitypen (.nc, .h, .eia, .txt, etc.)
✅ File Download Funktion
✅ Auto-Generated Program Numbers (OP10-001, OP10-002...)
✅ SHA-256 Hash Calculation
✅ Tab-System in PartDetailPage erweitert
✅ Permission-based UI
✅ 15 Backend Tests erfolgreich
```

#### ✅ Woche 7: Versionierung (ABGESCHLOSSEN)
```
✅ Revision Backend API (5 Endpoints)
✅ Versioning Frontend Components (880 Zeilen)
  ├─ RevisionsList.jsx - Version History (280 Zeilen)
  ├─ DiffViewer.jsx - Visual Diff (320 Zeilen)
  ├─ ProgramUploadForm.jsx - 3 Modi (erweitert)
  └─ ProgramCard.jsx - Action Bar (erweitert)
✅ Major.Minor.Patch Versionierung (1.0.0 → 2.0.0)
✅ Diff-Berechnung (Zeile-für-Zeile)
✅ 2 View-Modi (Unified/Split)
✅ Rollback-Funktion (ohne Duplikate)
✅ Version-Type Auswahl (Major/Minor/Patch)
✅ Change-Log optional
✅ Delete Revision mit Permission
✅ Version History mit Badges
✅ 16 Bugs gefixed
✅ Production-Ready
🎉 MEILENSTEIN 2 ERREICHT: Kern-Features komplett!
```

**Arbeitszeit:** 55h investiert (8h W1 + 8h W2 + 2h W3 + 4h W4 + 9h W5 + 12h W6 + 8h W7 + 4h Docs)  
**Nächster Schritt:** Maschinen-Verwaltung (Woche 8)

[📖 Woche 1 Summary](./docs/WEEK-1-SUMMARY.md) | [📖 Woche 2 Summary](./docs/WEEK-2-COMPLETE.md) | [📖 Woche 3 Summary](./docs/WEEK-3-SUMMARY.md) | [📖 Woche 4 Summary](./docs/sessions/SESSION-2025-11-03-WEEK4.md) | [📖 Woche 5 Summary](./docs/sessions/SESSION-2025-11-04-FRONTEND.md) | [📖 Woche 6 Summary](./docs/sessions/SESSION-2025-11-05.md) | [📖 Woche 7 Summary](./docs/sessions/SESSION-2025-11-05_3.md) | [🗺️ Roadmap](./ROADMAP.md)

---

## 🏗️ Architektur

### Tech-Stack

**Backend** (Node.js)
```
Express           - REST API Framework
PostgreSQL 15+    - Relationale Datenbank
JWT               - Token-basierte Authentifizierung
node-pg-migrate   - Schema-Migration Management
Multer            - File Upload Handling (Woche 6)
Chokidar          - File System Watcher (CAM-Integration)
```

**Frontend** (React) - ✅ **Phase 1 Complete**
```
React 19          - UI Framework
Vite              - Build Tool & Dev Server
React Router v7   - Client-Side Routing
Axios             - HTTP Client
TailwindCSS v4    - Utility-First Styling
Zustand           - State Management
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

### Installation (10 Minuten)

#### Backend Setup

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

#### Frontend Setup

```bash
# In neuem Terminal-Fenster
cd frontend
npm install
npm run dev
```

**✅ Frontend läuft auf:** http://localhost:5173  
**✅ Login Page:** http://localhost:5173/login

**Standard-Login:**
```
Username: admin
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
│   │   ├── migrations/         # 7 Datenbank-Migrations
│   │   │   ├── 01_auth.js      # User/Role/Permission System
│   │   │   ├── 02_production.js# Customers/Parts/Operations
│   │   │   ├── 03_machines.js  # Maschinen & Workflow
│   │   │   ├── 04_documentation.js # Setup-Sheets & Photos
│   │   │   ├── 05_system.js    # Audit/Comments/QR/Notifications
│   │   │   ├── 06_maintenance.js   # Wartungssystem
│   │   │   └── 07_maintenance_enhancements.js
│   │   ├── controllers/
│   │   │   ├── authController.js   # Auth Endpoints
│   │   │   ├── partsController.js  # Parts CRUD
│   │   │   └── operationsController.js # Operations CRUD ✅
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── partsRoutes.js
│   │   │   └── operationsRoutes.js ✅
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js   # JWT Verification
│   │   │   └── permissionMiddleware.js
│   │   ├── config/
│   │   │   ├── database.js     # DB-Konfiguration
│   │   │   └── seeds.js        # Test-Daten
│   │   ├── server.js           # Express-Server (v1.1.0)
│   │   └── ...
│   ├── docs/
│   │   ├── DATABASE.md         # DB-Setup & Schema
│   │   ├── WEEK-1-SUMMARY.md
│   │   ├── WEEK-2-COMPLETE.md
│   │   ├── WEEK-3-SUMMARY.md
│   │   ├── AUTH-API.md
│   │   └── API-TESTING-GUIDE.md
│   ├── test-auth.http          # Auth API Tests
│   ├── test-parts.http         # Parts API Tests
│   ├── test-operations.http    # Operations API Tests ✅
│   ├── .env.example
│   └── package.json
│
├── frontend/                   # React Frontend ✅ Phase 1 Complete
│   ├── src/
│   │   ├── components/         # Reusable Components
│   │   │   ├── Layout.jsx      # Navigation & Header
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── Toaster.jsx     # Toast Notifications
│   │   │   ├── OperationCard.jsx   # Operation Card ✅
│   │   │   ├── OperationsList.jsx  # Operations List ✅
│   │   │   └── OperationForm.jsx   # Modal Form ✅
│   │   ├── pages/              # Page Components
│   │   │   ├── LoginPage.jsx   # Login UI
│   │   │   ├── DashboardPage.jsx # Dashboard mit Stats
│   │   │   ├── PartsPage.jsx   # Parts Tabelle
│   │   │   ├── PartDetailPage.jsx # Detail + Operations Tab ✅
│   │   │   └── PartFormPage.jsx # Create/Edit Forms
│   │   ├── stores/             # Zustand State Management
│   │   │   ├── authStore.js    # Authentication
│   │   │   ├── partsStore.js   # Parts Management
│   │   │   └── operationsStore.js # Operations ✅
│   │   ├── utils/              # Utilities
│   │   │   └── axios.js        # Axios Instance
│   │   ├── config/             # Configuration
│   │   │   └── api.js          # API Endpoints
│   │   ├── App.jsx             # Router Setup
│   │   └── main.jsx            # Entry Point
│   ├── .env                    # Environment Variables
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE.md         # System-Architektur
│   ├── WEEK-1-SUMMARY.md
│   ├── WEEK-2-COMPLETE.md
│   ├── WEEK-3-SUMMARY.md
│   └── sessions/               # Session-Protokolle
│       ├── SESSION-2025-11-01.md       # Woche 1
│       ├── SESSION-2025-11-02.md       # Woche 2
│       ├── SESSION-2025-11-02-WEEK3.md # Woche 3
│       ├── SESSION-2025-11-03-WEEK4.md # Woche 4
│       └── SESSION-2025-11-04-FRONTEND.md # Woche 5 ✅
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

### ✅ Phase 1 - Monat 1: Fundament (100% ✅ - Wochen 1-4)

**Woche 1: ✅ KOMPLETT** - Datenbank-Schema
- [x] 28 Tabellen entworfen
- [x] 7 Migrations geschrieben
- [x] Seeds erstellt
- [x] Dokumentation

**Woche 2: ✅ KOMPLETT** - Backend API + Auth
- [x] Express Server erweitert
- [x] JWT Authentication implementiert
- [x] User/Role/Permission System
- [x] CRUD Endpoints für Bauteile (6 Endpoints)
- [x] Audit-Log Middleware

**Woche 3: ✅ KOMPLETT** - Frontend React App
- [x] React App Setup (Vite)
- [x] Login/Logout UI
- [x] Bauteile-Übersicht
- [x] CRUD-Operationen UI
- [x] Responsive Design (TailwindCSS)
- [x] State Management (Zustand)
- [x] Protected Routes

**Woche 4: ✅ KOMPLETT** - Integration & Testing
- [x] Frontend ↔ Backend Verbindung
- [x] Part Detail/Create/Edit Pages
- [x] Form Validation
- [x] Toast Notifications
- [x] Bug-Fixes
- [x] ✅ **MEILENSTEIN 1**: Lauffähiges Basis-System

### ⏳ Phase 2 - Monat 2: Kern-Features (25% - Wochen 5-8)

**Woche 5: ✅ KOMPLETT** - Operations (Arbeitsgänge)
- [x] Operations Backend CRUD API
- [x] Backend Testing (626 Zeilen Tests)
- [x] Operations Frontend Components
- [x] Tab-System (Details / Arbeitsgänge)
- [x] Modal Form Create/Edit
- [x] Auto-Sequence (OP10, OP20, OP30...)
- [x] Zeit-Eingabe vereinheitlicht

**Woche 6: 🔜 NEXT** - Programme & File Upload
- [ ] File Upload Backend (Multer)
- [ ] Programs Backend CRUD
- [ ] Programs Frontend Components
- [ ] File Validation & Download
- [ ] Programme zu Operations verknüpfen

**Woche 7:** - Versionierung
- [ ] Git-Style Versionierung
- [ ] Diff-Berechnung
- [ ] Rollback-Funktion
- [ ] Versions-Historie

**Woche 8:** - Maschinen-Stammdaten
- [ ] Maschinen CRUD
- [ ] Steuerungstypen
- [ ] Netzwerk-Pfade
- [ ] ✅ **MEILENSTEIN 2**: Kern-Features komplett

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
| [docs/WEEK-1-SUMMARY.md](./docs/WEEK-1-SUMMARY.md) | Woche 1 Bericht | ✅ Aktuell |
| [docs/WEEK-2-COMPLETE.md](./docs/WEEK-2-COMPLETE.md) | Woche 2 Bericht | ✅ Aktuell |
| [docs/WEEK-3-SUMMARY.md](./docs/WEEK-3-SUMMARY.md) | Woche 3 Bericht | ✅ Aktuell |
| [docs/sessions/SESSION-2025-11-03-WEEK4.md](./docs/sessions/SESSION-2025-11-03-WEEK4.md) | Woche 4 Bericht | ✅ Aktuell |
| [docs/sessions/SESSION-2025-11-04-FRONTEND.md](./docs/sessions/SESSION-2025-11-04-FRONTEND.md) | Woche 5 Bericht | ✅ Aktuell |
| [backend/docs/AUTH-API.md](./backend/docs/AUTH-API.md) | Auth API Docs | ✅ Aktuell |
| [backend/docs/API-TESTING-GUIDE.md](./backend/docs/API-TESTING-GUIDE.md) | Testing Guide | ✅ Aktuell |
| [frontend/README.md](./frontend/README.md) | Frontend Dokumentation | ✅ Aktuell |

---

## 🎯 Features

### ✅ Bereits implementiert

**Woche 1 - Datenbank:**
- ✅ **Datenbank-Schema** - 28 Tabellen, vollständig normalisiert
- ✅ **Migrations-System** - Schema-Versionierung mit node-pg-migrate
- ✅ **Seed-Daten** - Test-Daten für Entwicklung
- ✅ **Audit-Trail** - Jede Änderung wird protokolliert
- ✅ **RBAC-Schema** - Granulare Berechtigungen vorbereitet

**Woche 2 - Backend API:**
- ✅ **JWT Authentication** - Login, Register, Token Verification
- ✅ **User Management** - 4 Auth Endpoints
- ✅ **Auth Middleware** - Token, Permission, Role Checks
- ✅ **Parts CRUD API** - 6 Endpoints mit Permissions
- ✅ **Audit-Log Middleware** - Automatisches Tracking

**Woche 3 - Frontend:**
- ✅ **React 19 App** - Vite Build Setup
- ✅ **Zustand State Management** - Auth + Parts Stores
- ✅ **React Router v7** - Protected Routes
- ✅ **Login/Logout UI** - Vollständig funktional
- ✅ **Dashboard** - Stats Cards + Quick Actions
- ✅ **Parts List** - Tabelle mit Filter & Search
- ✅ **TailwindCSS v4** - Responsive Design
- ✅ **Axios Integration** - Token-Interceptors

**Woche 4 - Integration:**
- ✅ **Frontend ↔ Backend** - Vollständig integriert
- ✅ **Part Detail Page** - Vollständige Bauteil-Ansicht
- ✅ **Part Create/Edit Forms** - Mit Validierung
- ✅ **Toast Notifications** - Selbst gebaut, ohne Library
- ✅ **Permission-based UI** - Überall implementiert
- ✅ **CORS** - Konfiguriert & getestet
- ✅ **Bug-Fixes** - 9 Bugs gefixed

**Woche 5 - Operations:**
- ✅ **Operations Backend API** - CRUD für Arbeitsgänge (373 Zeilen)
- ✅ **Backend Testing** - 626 Zeilen Test-Szenarien
- ✅ **Operations Frontend** - 970 Zeilen Components
- ✅ **Tab-System** - Details / Arbeitsgänge
- ✅ **Operation Cards** - Card Component mit Zeit-Formatierung
- ✅ **Modal Form** - Create/Edit mit Validierung
- ✅ **Auto-Sequence** - Automatische Nummerierung (10, 20, 30...)
- ✅ **Zeit-Eingabe** - Vereinheitlicht in Minuten
- ✅ **Sortierung** - Nach Sequence
- ✅ **Empty State** - "Noch keine Arbeitsgänge"
- ✅ **Responsive** - 3/2/1 Spalten Layout

### 📋 Geplant (Wochen 6-16)

**Programme & File Upload** (Woche 6)
- File Upload Backend (Multer)
- Programs Backend CRUD
- Programs Frontend Components
- File Validation & Download

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
Phase 1 (Fundament):    ████████████████████ 100% ✅
  └─ Woche 1:           ████████████████████ 100% ✅
  └─ Woche 2:           ████████████████████ 100% ✅
  └─ Woche 3:           ████████████████████ 100% ✅
  └─ Woche 4:           ████████████████████ 100% ✅

Phase 2 (Kern-Features):██████░░░░░░░░░░░░░░ 25%
  └─ Woche 5:           ████████████████████ 100% ✅
  └─ Woche 6:           ░░░░░░░░░░░░░░░░░░░░   0% 🔜
  └─ Woche 7:           ░░░░░░░░░░░░░░░░░░░░   0%
  └─ Woche 8:           ░░░░░░░░░░░░░░░░░░░░   0%

Gesamt-Fortschritt:     █████████████░░░░░░░ 58%
```

**Arbeitszeit investiert:** 32h / ~480h geschätzt (6.7%)  
**Geschätzte Fertigstellung:** April 2025  
**Zeitbudget:** 30-35h/Woche  
**Velocity:** ~6.4h pro Woche (sehr gut!)

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

**🎉 Phase 1 KOMPLETT + Woche 5 KOMPLETT!**

**Completed:**
- ✅ Woche 1: Datenbank-Schema (28 Tabellen, 7 Migrations)
- ✅ Woche 2: Backend API + Auth (10 Endpoints, JWT, Parts CRUD)
- ✅ Woche 3: Frontend React App (Login, Dashboard, Parts, Zustand)
- ✅ Woche 4: Integration & Testing (CRUD, Forms, Toasts, Bug-Fixes)
- ✅ Woche 5: Operations (Backend + Frontend, 2022 Zeilen Code)

**🎊 Meilensteine erreicht:**
- ✅ MEILENSTEIN 1: Lauffähiges Basis-System
- ✅ Phase 1 (Wochen 1-4): 100% Complete
- ✅ Woche 5: Operations komplett (Backend + Frontend)

**Next Steps:**
- Woche 6: Programme & File Upload
- File Upload Backend (Multer)
- Programs CRUD API
- Programs Frontend Components

**Bereit für die nächste Session?** → [Starte hier](./QUICKSTART.md)

---

<div align="center">

**⭐ Star this repo wenn es dir gefällt! ⭐**

[📖 Dokumentation](./docs/) · [🗺️ Roadmap](./ROADMAP.md) · [🐛 Issues](https://github.com/mcr14410-master/MDS/issues) · [💬 Discussions](https://github.com/mcr14410-master/MDS/discussions)

</div>
