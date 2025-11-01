# Changelog - Fertigungsdaten Management System

Alle wichtigen Änderungen am Projekt werden hier dokumentiert.

Format basiert auf [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Geplant für Woche 2 (Backend API + Auth)
- JWT Authentication (Login/Register)
- Password Hashing (bcrypt)
- User Management CRUD Endpoints
- Role & Permission Middleware
- Bauteile CRUD Endpoints
- Audit-Log Middleware
- API Testing (Jest/Supertest)

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
| **1.0.0-week1** | 2025-11-01 | ✅ Complete | Datenbank-Schema + Server |
| **Initial** | 2025-01-15 | ✅ Complete | Projekt-Setup & Planung |

---

## Progress Tracking

```
Phase 1 (Monat 1): ████░░░░░░░░░░░░░░░░ 25%
  └─ Woche 1:      ████████████████████ 100% ✅
  └─ Woche 2:      ░░░░░░░░░░░░░░░░░░░░   0% 🔜

Gesamt:            ███░░░░░░░░░░░░░░░░░ 15%
```

**Arbeitszeit:**
- Woche 1: 8h
- Gesamt: 8h / ~480h (1.67%)

**Geschätzte Fertigstellung:** April 2025

---

**Letzte Aktualisierung:** 2025-11-01  
**Nächster Meilenstein:** Phase 1, Woche 2 - Backend API + Auth
