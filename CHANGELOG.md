# Changelog - Fertigungsdaten Management System

Alle wichtigen Änderungen am Projekt werden hier dokumentiert.

Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Geplant für Woche 3 (Frontend Basis)
- React App Setup mit Vite
- TailwindCSS Integration
- React Router Setup
- Login/Logout UI
- Protected Routes
- Bauteile-Übersicht (Liste)
- State Management (Context API)

---

## [1.0.0-week2] - 2025-11-02

### 🎉 Phase 1, Woche 2 - ABGESCHLOSSEN (100%)

**Zeitaufwand:** ~8 Stunden  
**Status:** ✅ Alle Ziele erreicht

---

### Added - Authentication System

#### JWT Authentication
- **Token Generation** - HS256 Algorithm, 24h Expiry
- **Token Verification** - Middleware für geschützte Routes
- **Password Hashing** - bcrypt mit Salt Rounds 10
- **Security** - Input Validation, SQL Injection Protection

#### User Management Endpoints
- `POST /api/auth/register` - User Registration mit Validierung
  - Email Format Check
  - Password Strength Check (min. 6 Zeichen)
  - Duplicate User Prevention
  - Automatic Password Hashing
- `POST /api/auth/login` - User Login mit Username oder Email
  - Password Verification
  - Last Login Tracking
  - Roles & Permissions laden
  - JWT Token Response
- `GET /api/auth/me` - Get Current User Profile (Protected)
  - User mit Roles & Permissions
  - Token Required
- `POST /api/auth/change-password` - Password Change (Protected)
  - Current Password Verification
  - New Password Validation

#### Auth Middleware (`src/middleware/authMiddleware.js`)
- `authenticateToken()` - JWT Token Verification
- `requirePermission(permission)` - Permission-based Access Control
- `requireRole(role)` - Role-based Access Control

---

### Added - Parts CRUD API

#### Parts Controller (`src/controllers/partsController.js`)
- `getAllParts()` - Liste aller Bauteile mit Filter & Suche
  - Filter: customer_id, status
  - Search: part_number, part_name, description
  - Sortierung: created_at DESC
  - Includes: customer_name, operation_count
- `getPartById(id)` - Einzelnes Bauteil mit Details
  - Includes: Customer-Details
  - Includes: Operations mit Maschinen
- `createPart()` - Neues Bauteil erstellen
  - Validierung: customer_id, part_number, part_name (required)
  - Duplicate Check: part_number pro Customer
  - Customer Existence Check
  - Auto-Tracking: created_by, updated_by
- `updatePart(id)` - Bauteil aktualisieren
  - Partial Updates (COALESCE)
  - Duplicate Check bei part_number Änderung
  - Auto-Tracking: updated_by, updated_at
- `deletePart(id)` - Bauteil löschen (Soft Delete)
  - Operations Check (verhindert Löschen wenn Operations existieren)
  - Status auf 'deleted' setzen (kein echtes DELETE)
  - Auto-Tracking: updated_by, updated_at
- `getPartStats()` - Statistiken
  - Total Parts
  - Parts by Status (active, draft, archived)
  - Total Customers

#### Parts Routes (`src/routes/partsRoutes.js`)
- `GET /api/parts` - List Parts (Permission: part.read)
- `GET /api/parts/stats` - Statistics (Permission: part.read)
- `GET /api/parts/:id` - Get Part (Permission: part.read)
- `POST /api/parts` - Create Part (Permission: part.create)
- `PUT /api/parts/:id` - Update Part (Permission: part.update)
- `DELETE /api/parts/:id` - Delete Part (Permission: part.delete)

---

### Added - Audit Log System

#### Audit Log Middleware (`src/middleware/auditLogMiddleware.js`)
- `auditLog()` - Automatisches Logging aller Änderungen
  - Tracked Actions: CREATE, UPDATE, DELETE
  - Tracked Data: old_data, new_data (JSONB)
  - Tracked User: user_id, username
  - Tracked Context: ip_address, user_agent, timestamp
  - Table & Record ID Tracking
  - Nur erfolgreiche Operationen (2xx Status)
- `getAuditLogs(tableName, recordId)` - Logs für Record
- `getUserAuditLogs(userId, limit)` - Logs für User
- `getAllAuditLogs(filters)` - Alle Logs mit Filter
  - Filter: tableName, action, userId, startDate, endDate

---

### Added - Migrations & Seeds

#### Neue Migrations
- `1737000005000_seed-test-customers.js` - 3 Test-Kunden
  - Test GmbH (CUST-001)
  - Beispiel AG (CUST-002)
  - Demo Industries (CUST-003)
- `1737000006000_add-parts-status-fields.js` - Enhanced Parts Schema
  - `status` VARCHAR(50) - Status-Feld (draft, active, archived, deleted)
  - `updated_by` INTEGER - Update-Tracking
  - `cad_file_path` VARCHAR(500) - CAD-Datei Pfad
  - Index auf `status` für Performance

---

### Added - Testing Infrastructure

#### Test Files
- **test-auth.http** - Auth API Tests
  - Register Tests
  - Login Tests (Admin, Test User)
  - Profile Tests (Protected)
  - Password Change Tests
  - Validation Tests (Email, Password Strength)
  - Permission Tests
  - cURL & PowerShell Examples
- **test-parts.http** - Parts API Tests (287 Zeilen)
  - CRUD Operations (Create, Read, Update, Delete)
  - Filter Tests (customer_id, status, search)
  - Validation Tests (Required Fields, Duplicates)
  - Permission Tests
  - Complete Workflow Tests
  - cURL & PowerShell Examples
- **test-api.sh** - Bash Automated Tests
- **test-api.ps1** - PowerShell Automated Tests

---

### Changed

#### Backend Server (`src/server.js`)
- Parts Routes registriert: `app.use('/api/parts', partsRoutes)`
- Audit Log Middleware aktiviert: `app.use(auditLog)`
- Health Check aktualisiert: Phase 1, Week 2 - Backend COMPLETE
- API Endpoints Liste erweitert (10 Endpoints)

#### ROADMAP.md
- Woche 2 als ✅ ABGESCHLOSSEN markiert
- Errungenschaften detailliert (13 Punkte)
- Fortschritt: 50% Phase 1, 30% Gesamt
- Arbeitszeit: 8h → 16h
- Abschlussdatum: 2025-11-02
- Nächster Sprint: Woche 3 - Frontend

---

### Fixed

#### test-parts.http Format
- **Problem:** Variable-Zuweisung ohne Separator führte zu JSON Parse Error
  - `@workflowPartId = ...` direkt nach JSON Body
- **Lösung:** `###` Separator vor Variable-Zuweisung hinzugefügt
  - Alle Variable-Zuweisungen jetzt korrekt formatiert

#### Parts Schema Migration
- **Problem:** `parts.status` Spalte fehlte, führte zu 500 Error
- **Lösung:** Migration 6 erstellt und ausgeführt
  - `status`, `updated_by`, `cad_file_path` Spalten hinzugefügt

---

### Technical Details

#### API Architecture
- ✅ **RESTful Design** - Standard HTTP Methods (GET, POST, PUT, DELETE)
- ✅ **JWT Security** - Token-based Authentication
- ✅ **RBAC** - Role & Permission-based Access Control
- ✅ **Input Validation** - Required Fields, Format Checks
- ✅ **SQL Injection Protection** - Parameterized Queries
- ✅ **Error Handling** - Structured Error Responses (400, 401, 403, 404, 409, 500)
- ✅ **Soft Deletes** - Status='deleted' statt echtem DELETE
- ✅ **Audit Trail** - Automatisches Tracking aller Änderungen

#### Code Quality
- ✅ **Separation of Concerns** - Controller / Routes / Middleware
- ✅ **DRY Principle** - Reusable Middleware & Utils
- ✅ **Error First Callbacks** - Consistent Error Handling
- ✅ **Async/Await** - Modern JavaScript
- ✅ **Environment Variables** - Configuration via .env

---

### Documentation

#### Neue/Aktualisierte Dateien
- `backend/docs/WEEK-2-COMPLETE.md` - Woche 2 Abschlussbericht
- `backend/docs/API-TESTING-GUIDE.md` - API Testing Dokumentation
- `backend/docs/AUTH-API.md` - Auth Endpoints Dokumentation
- `test-auth.http` - Auth Tests
- `test-parts.http` - Parts Tests
- `ROADMAP.md` - Aktualisiert auf 50% Phase 1

---

### Deliverables - Woche 2

```
✅ JWT Authentication: Token Gen/Verify, Password Hashing
✅ User Management: 4 Endpoints (Register, Login, Profile, Password Change)
✅ Auth Middleware: Token, Permission, Role Checks
✅ Parts CRUD API: 6 Endpoints mit Validierung & Permissions
✅ Audit Log System: Automatisches Tracking aller Änderungen
✅ Test-Suite: test-auth.http, test-parts.http, Scripts
✅ 7 Migrations total: (5 base + 2 enhancements)
✅ 3 Test-Kunden: Seeds für Development
✅ 10 API Endpoints: 4 Auth + 6 Parts
✅ Comprehensive Tests: 50+ Test-Szenarien
```

---

### Statistics

**Code:**
- Controllers: ~1,200 Zeilen (authController.js, partsController.js)
- Routes: ~100 Zeilen (authRoutes.js, partsRoutes.js)
- Middleware: ~450 Zeilen (authMiddleware.js, auditLogMiddleware.js)
- Utilities: ~200 Zeilen (jwt.js, password.js)
- Tests: ~600 Zeilen (test-auth.http, test-parts.http)
- **Gesamt: ~2,550 Zeilen Code**

**Dokumentation:**
- API Docs: ~300 Zeilen
- Test Guides: ~200 Zeilen
- Week 2 Summary: ~300 Zeilen
- **Gesamt: ~800 Zeilen Dokumentation**

**API:**
- Public Endpoints: 4 (/, /health, /db/info, /register, /login)
- Protected Endpoints: 6 (Parts CRUD, Profile, Password Change)
- **Total: 10 Endpoints**

**Datenbank:**
- Migrations: 7 (5 base + 2 new)
- Test-Kunden: 3
- Parts Schema: +3 Spalten (status, updated_by, cad_file_path)

**Zeitaufwand:**
- JWT Auth Implementation: ~2h
- Parts CRUD API: ~3h
- Audit Log System: ~1h
- Testing: ~1h
- Documentation: ~1h
- **Gesamt: ~8h**

---

### Next Steps - Woche 3

**Frontend Basis mit React:**
1. React App Setup (Vite)
2. TailwindCSS Integration
3. React Router Setup
4. Login/Logout UI
5. Protected Routes Component
6. Bauteile-Übersicht (Tabelle)
7. State Management (Context API)
8. API Integration (Axios/Fetch)

**Geschätzte Zeit:** 6-8 Stunden  
**Deliverable:** Funktionsfähiges Frontend mit Login & Parts-Liste

---

## [1.0.0-week1] - 2025-11-01

### 🎉 Phase 1, Woche 1 - ABGESCHLOSSEN (100%)

**Zeitaufwand:** ~8 Stunden  
**Status:** ✅ Alle Ziele erreicht

---

### Added - Dokumentation

#### Neue Dokumente
- **README.md** - Komplett überarbeitet mit professionellem Layout
  - Badges (Status, Phase, License)
  - Übersichtliche Tabellen für Tech-Stack & Schema
  - Quick Start Guide
  - Projekt-Struktur Visualisierung
  - Feature-Übersicht mit Status
- **QUICKSTART.md** - Step-by-step Installationsanleitung (~500 Zeilen)
  - Voraussetzungen-Check
  - 7-Schritte Installation
  - Troubleshooting Section
  - FAQ
- **CONTRIBUTING.md** - Contribution Guidelines (~600 Zeilen)
  - Code of Conduct
  - Workflow & Branch-Naming
  - Coding Standards (Airbnb Style)
  - Commit Message Convention (Conventional Commits)
  - Pull Request Process
- **LICENSE** - MIT License für kommerzielle Nutzung
- **docs/sessions/SESSION-2025-11-01.md** - Kompletter Session-Bericht

---

### Added - Datenbank

#### Schema (28 Tabellen in 6 Kategorien)

**Auth & Users (7 Tabellen):**
- `users` - Benutzer mit Authentifizierung
- `roles` - Rollen (Admin, Programmer, Reviewer, Operator, Helper, Supervisor)
- `permissions` - Granulare Berechtigungen (27 Stück)
- `user_roles` - Many-to-Many: User ↔ Roles
- `role_permissions` - Many-to-Many: Roles ↔ Permissions
- `password_resets` - Password-Reset Tokens (für Woche 2)
- `sessions` - Login-Sessions (für Woche 2)

**Produktion (3 Tabellen):**
- `customers` - Kunden-Stammdaten
- `parts` - Bauteile mit Revisions-Tracking
- `operations` - Arbeitsgänge (OP10, OP20, ...)

**Maschinen & Programme (8 Tabellen):**
- `machines` - CNC-Maschinen mit technischen Daten
- `programs` - NC-Programme (logisch)
- `program_revisions` - Git-Style Versionierung (Major.Minor.Patch)
- `workflow_states` - Status-Workflow (Draft → Released)
- `tools` - Werkzeug-Stammdaten
- `setup_sheets` - Einrichteblätter
- `setup_photos` - Aufspannfotos

**Audit & System (4 Tabellen):**
- `audit_logs` - Vollständiger Audit-Trail
- `comments` - Polymorphe Kommentare
- `qr_codes` - QR-Code Management
- `notifications` - Benachrichtigungssystem

**Wartung (6 Tabellen):**
- `maintenance_types` - Wartungstypen mit Skill-Level
- `maintenance_plans` - Wartungspläne pro Maschine
- `maintenance_tasks` - Einzelne Wartungsaufgaben
- `maintenance_checklist_items` - Checklisten
- `maintenance_task_completions` - Erledigte Aufgaben
- `maintenance_photos` - Wartungs-Foto-Dokumentation

#### Migrations (5 Dateien)
- `1737000000000_create-auth-system.js` - Auth & RBAC
- `1737000001000_create-parts-operations.js` - Produktion
- `1737000002000_create-machines-programs.js` - Maschinen & Programme
- `1737000003000_create-audit-log.js` - Audit & System
- `1737000004000_create-maintenance-system.js` - Wartung

#### Seeds (Test-Daten)
- 6 Rollen mit Beschreibungen
- 27 Permissions in 7 Kategorien
- 1 Admin-User (admin@example.com / admin123)
- 6 Workflow-Status (draft, review, approved, released, rejected, archived)
- Alle User-Role und Role-Permission Zuweisungen

---

### Added - Backend

#### Express Server (`src/server.js`)
- Basic Express Setup mit Middleware (CORS, JSON, URLEncoded)
- PostgreSQL Connection Pool
- 3 API Endpoints:
  - `GET /` - Root endpoint mit Projekt-Info
  - `GET /api/health` - Health Check mit DB-Test
  - `GET /api/db/info` - Datenbank-Statistiken (Tabellen, Users, Roles, Permissions)
- Error Handler (404 & 500)
- Graceful Shutdown
- Umfangreiche Console-Ausgabe beim Start

---

### Changed

- **ROADMAP.md** - Woche 1 als abgeschlossen markiert
  - Status: ✅ ABGESCHLOSSEN
  - Fortschrittsbalken aktualisiert (15% Gesamt, 25% Phase 1)
  - Woche 2 als "Next" markiert
  - Neue Sections: Meilensteine, Velocity Tracking
- **.env.example** - Template für Umgebungsvariablen
- **package.json** - Scripts für Migrations und Seeds

---

### Fixed

#### Datenbank - Circular Dependencies
- **Problem:** `operations.machine_id` referenzierte `machines` vor deren Erstellung
  - **Lösung:** Spalte ohne Foreign Key erstellt, FK in Migration 3 nachträglich hinzugefügt
- **Problem:** `programs.current_revision_id` referenzierte `program_revisions` vor deren Erstellung
  - **Lösung:** Spalte ohne Foreign Key erstellt, FK nach `program_revisions` Erstellung hinzugefügt

#### Konfiguration
- **.migrationrc.json** - Relativer Pfad (`./src/migrations` statt `src/migrations`)
- **.env** - DATABASE_URL Password korrigiert (mds_admin statt postgres)
- **Migrations-Ordner** - Von `src/migrations/` nach `migrations/` kopiert für Kompatibilität

#### PostgreSQL Setup
- User `mds_admin` mit korrekten Berechtigungen
- Schema `public` Grants für mds_admin
- Datenbank `mds` erfolgreich erstellt

---

### Technical Details

#### Schema-Features
- ✅ **Git-Style Versionierung** für NC-Programme (Major.Minor.Patch)
- ✅ **RBAC** - 6 Rollen, 27 Permissions, flexible Zuordnung
- ✅ **Workflow-System** - 6 Status mit Farben & Icons
- ✅ **Audit-Trail** - JSONB für Changes, vollständig rückverfolgbar
- ✅ **Skill-Level** - Wartungen nach Schwierigkeit (Helper → Operator → Supervisor)
- ✅ **QR-Codes** - Vorbereitet für Shopfloor-Integration
- ✅ **Soft-Deletes** - `is_active` Flag statt echtem Löschen
- ✅ **Timestamps** - created_at, updated_at auf allen wichtigen Tabellen
- ✅ **Performance** - 50+ Indizes für optimierte Queries

#### Foreign Keys
- Alle Beziehungen mit `ON DELETE CASCADE` oder `ON DELETE SET NULL`
- Referentielle Integrität vollständig gewährleistet
- Circular Dependencies elegant gelöst

#### Conventions
- **Snake_case** für Datenbank (PostgreSQL Standard)
- **camelCase** für JavaScript/Node.js
- **Semantic Versioning** für Programme (1.0.0)
- **Conventional Commits** für Git

---

### Documentation

#### Neue/Aktualisierte Dateien
- `README.md` - 400+ Zeilen, professionell
- `QUICKSTART.md` - 500+ Zeilen, detailliert
- `CONTRIBUTING.md` - 600+ Zeilen, umfassend
- `ROADMAP.md` - Aktualisiert mit Woche 1 Status
- `CHANGELOG.md` - Diese Datei
- `LICENSE` - MIT License
- `docs/sessions/SESSION-2025-11-01.md` - Session-Bericht
- `backend/docs/DATABASE.md` - DB-Setup Guide (aus vorheriger Session)
- `backend/docs/WEEK-1-SUMMARY.md` - Wochenbericht (aus vorheriger Session)

---

### Deliverables - Woche 1

```
✅ Datenbank-Schema: 28 Tabellen, 5 Migrations
✅ Test-Daten: Seeds mit allen Stammdaten
✅ Express Server: Läuft auf http://localhost:5000
✅ API Endpoints: 3 Endpoints implementiert
✅ Dokumentation: README, QUICKSTART, CONTRIBUTING
✅ License: MIT
✅ Session-Log: Vollständig dokumentiert
```

---

### Statistics

**Code:**
- Migrations: ~1,500 Zeilen SQL/JavaScript
- Seeds: ~500 Zeilen JavaScript
- Server: ~150 Zeilen JavaScript
- Tests: 0 (Woche 2)

**Dokumentation:**
- README.md: ~400 Zeilen
- QUICKSTART.md: ~500 Zeilen
- CONTRIBUTING.md: ~600 Zeilen
- Session-Logs: ~400 Zeilen
- Gesamt: ~1,900 Zeilen Dokumentation

**Datenbank:**
- Tabellen: 28
- Spalten: ~300
- Foreign Keys: ~40
- Indizes: ~50
- Constraints: ~60

**Zeitaufwand:**
- Dokumentation: ~2h
- Datenbank-Schema: ~3h
- Migrations & Seeds: ~2h
- Troubleshooting: ~1h
- **Gesamt: ~8h**

---

### Next Steps - Woche 2

**Backend API + Authentication:**
1. JWT Authentication (Login/Register)
2. Password Hashing (bcrypt)
3. User Management Endpoints
4. Auth Middleware
5. Role & Permission Checks
6. Bauteile CRUD API
7. Audit-Log Middleware
8. API Testing

**Geschätzte Zeit:** 6-8 Stunden  
**Deliverable:** Vollständig funktionsfähiges Backend mit Auth

---

## [Initial] - 2025-01-15

### Added - Projekt-Initialisierung

- GitHub Repository: https://github.com/mcr14410-master/MDS
- Projekt-Struktur erstellt
- README.md (erste Version)
- ROADMAP.md (16 Wochen Detailplan)
- CHANGELOG.md initialisiert
- docs/ARCHITECTURE.md (aus Analyse übernommen)
- docs/sessions/ Ordner mit Template

### Decisions

- **Tech-Stack:** Node.js + PostgreSQL + React + Docker
- **Timeline:** 3-4 Monate
- **Zeitbudget:** 30-35h/Woche
- **Arbeitsweise:** Claude schreibt Code, User testet
- **Lizenz:** MIT (gewerblich nutzbar)

### Time Investment

~2h (Planung & Dokumentation)

---

## Version History

| Version | Datum | Status | Beschreibung |
|---------|-------|--------|--------------|
| **1.0.0-week2** | 2025-11-02 | ✅ Complete | Backend API + Auth + Parts CRUD |
| **1.0.0-week1** | 2025-11-01 | ✅ Complete | Datenbank-Schema + Server |
| **Initial** | 2025-01-15 | ✅ Complete | Projekt-Setup & Planung |

---

## Progress Tracking

```
Phase 1 (Monat 1): ██████████░░░░░░░░░░ 50%
  └─ Woche 1:      ████████████████████ 100% ✅
  └─ Woche 2:      ████████████████████ 100% ✅
  └─ Woche 3:      ░░░░░░░░░░░░░░░░░░░░   0% 🔜

Gesamt:            ██████░░░░░░░░░░░░░░ 30%
```

**Arbeitszeit:**
- Woche 1: 8h
- Woche 2: 8h
- Gesamt: 16h / ~480h (3.33%)

**Geschätzte Fertigstellung:** April 2025

---

**Letzte Aktualisierung:** 2025-11-02  
**Nächster Meilenstein:** Phase 1, Woche 3 - Frontend React App
