# Roadmap - Fertigungsdaten Management System

**Zeitbudget:** 30-35h/Woche
**Geschätzte Dauer:** 3-4 Monate
**Start:** Januar 2025

---

## 📅 Monat 1: Fundament + Kern (Wochen 1-4)

### ✅ Woche 1: Projekt-Setup & Datenbank
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** Datenbank-Schema steht, Migrations funktionieren
**Zeitaufwand:** ~8 Stunden

- [x] GitHub Repo angelegt
- [x] Projekt-Struktur erstellt
- [x] Dokumentation initialisiert (README, QUICKSTART, CONTRIBUTING)
- [x] PostgreSQL DB-Schema entworfen (28 Tabellen)
- [x] node-pg-migrate eingerichtet
- [x] Erste Migrations geschrieben (5 Migrations)
- [x] Seed-Daten für Tests erstellt
- [x] Express Server Basis erstellt
- [x] Health Check API implementiert

**Deliverable:** ✅ Funktionierende Datenbank mit allen Tabellen + minimaler Server

**Errungenschaften:**
```
✅ 28 Tabellen in 6 Kategorien
✅ 5 Migrations (auth, production, machines, audit, maintenance)
✅ Seeds mit 6 Rollen, 27 Permissions, 1 Admin-User
✅ Express Server läuft auf http://localhost:5000
✅ 3 API Endpoints (/api/health, /api/db/info, /)
```

**Abgeschlossen am:** 2025-11-01

---

### ✅ Woche 2: Backend Basis + Auth
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** API läuft, Login funktioniert

- [x] Express Server erweitern
- [x] JWT Auth implementieren
- [x] User/Role/Permission System
- [x] CRUD Endpoints für Bauteile
- [x] Audit-Log Middleware
- [x] API testen (Postman/Jest)
- [x] Password Hashing (bcrypt)
- [x] Auth Middleware
- [x] Error Handling verbessern

**Deliverable:** ✅ Backend API mit Auth läuft auf localhost:5000

**Errungenschaften:**
```
✅ JWT Authentication komplett (Token Generation, Verification, Expiry)
✅ User Management (Register, Login, Profile, Password Change)
✅ Auth Middleware (authenticateToken, requirePermission, requireRole)
✅ Parts CRUD API - 6 Endpoints (GET, POST, PUT, DELETE, Stats)
✅ Audit-Log System (automatisches Tracking aller Änderungen)
✅ Test-Suite (test-auth.http, test-parts.http, test-api.sh, test-api.ps1)
✅ Validierung & Error Handling
✅ Security (Permission-Checks, SQL-Injection Schutz)
✅ 7 Migrations total (5 base + 2 enhancements)
✅ Test-Customer Seeds (3 Kunden)
✅ Enhanced Parts Schema (status, updated_by, cad_file_path)
✅ API Endpoints: 10 total (4 Auth + 6 Parts)
✅ ~1500 Lines of Code
```

**Abgeschlossen am:** 2025-11-02

---

### 📋 Woche 3: Frontend Basis
**Status:** 🔜 **NEXT** - Bereit zum Start!
**Ziel:** UI läuft, Login funktioniert

- [ ] React App Setup (Vite)
- [ ] Login/Logout UI
- [ ] Bauteile-Übersicht
- [ ] Bauteile CRUD (Erstellen, Bearbeiten, Löschen)
- [ ] Responsive Design (TailwindCSS)
- [ ] Fehlerbehandlung
- [ ] State Management (Context/Zustand)

**Deliverable:** Basis-UI läuft auf localhost:3000

---

### 📋 Woche 4: Integration & Testing
**Status:** 📋 GEPLANT
**Ziel:** Frontend ↔ Backend komplett integriert

- [ ] Frontend mit Backend verbinden
- [ ] Alle CRUD-Operationen testen
- [ ] Benutzer-Rollen testen
- [ ] Bug-Fixes
- [ ] Code aufräumen
- [ ] E2E Tests

**Deliverable:** ✅ **MEILENSTEIN 1**: Lauffähiges Basis-System

---

## 📅 Monat 2: Kern-Features (Wochen 5-8)

### 📋 Woche 5: Operations (Arbeitsgänge)
**Status:** 📋 GEPLANT
**Ziel:** Bauteile haben Arbeitsgänge

- [ ] Operations Backend CRUD
- [ ] Frontend: Operations pro Bauteil
- [ ] OP-Nummern (OP10, OP20, ...)
- [ ] Maschinen-Zuweisung
- [ ] Sequence Management

**Deliverable:** Teil → Operations funktioniert

---

### 📋 Woche 6: Programme & File Upload
**Status:** 📋 GEPLANT
**Ziel:** NC-Programme hochladen

- [ ] File Upload (Multer)
- [ ] Backend: Program CRUD
- [ ] Frontend: Program Upload
- [ ] Programm-Download
- [ ] File Validation

**Deliverable:** Programme können hochgeladen werden

---

### 📋 Woche 7: Versionierung
**Status:** 📋 GEPLANT
**Ziel:** Automatische Versionierung

- [ ] Revision-Logic (Major.Minor.Patch)
- [ ] Diff-Berechnung (Text)
- [ ] Versions-Historie anzeigen
- [ ] Rollback-Funktion
- [ ] Vergleich zwischen Versionen

**Deliverable:** Versionierung funktioniert

---

### 📋 Woche 8: Maschinen-Stammdaten
**Status:** 📋 GEPLANT
**Ziel:** Maschinenpark verwalten

- [ ] Maschinen CRUD (Backend + Frontend)
- [ ] Steuerungstypen
- [ ] Netzwerk-Pfade
- [ ] Programme zu Maschinen zuordnen

**Deliverable:** ✅ **MEILENSTEIN 2**: Kern-Features komplett

---

## 📅 Monat 3: Workflows & Wartung (Wochen 9-12)

### 📋 Woche 9: Workflow-System
**Status:** 📋 GEPLANT
**Ziel:** Status-Workflows

- [ ] Status-Übergänge (Entwurf → Freigabe)
- [ ] Berechtigungs-Checks
- [ ] Freigabe-Workflow
- [ ] Benachrichtigungen
- [ ] History-Tracking

**Deliverable:** Workflow funktioniert

---

### 📋 Woche 10: QR-Codes & File Watcher
**Status:** 📋 GEPLANT
**Ziel:** CAM-Integration

- [ ] QR-Code Generierung
- [ ] QR pro Operation
- [ ] File Watcher (chokidar)
- [ ] CAM-Ordner überwachen
- [ ] G-Code Parser
- [ ] Auto-Import Dialog

**Deliverable:** CAM → MDS funktioniert

---

### 📋 Woche 11: Wartungssystem Basis
**Status:** 📋 GEPLANT
**Ziel:** Wartungspläne

- [ ] Maintenance Plans Backend
- [ ] Wartungstypen (täglich, wöchentlich, ...)
- [ ] Fälligkeitsberechnung
- [ ] Wartungs-Historie
- [ ] Benachrichtigungen

**Deliverable:** Wartungspläne funktionieren

---

### 📋 Woche 12: Wartung Erweitert
**Status:** 📋 GEPLANT
**Ziel:** Skill-Level-System

- [ ] Skill-Level (Helfer, Bediener, Meister)
- [ ] Aufgaben-Zuweisung
- [ ] Foto-Anleitungen
- [ ] Eskalations-System
- [ ] Checklisten
- [ ] Roboter-Wartung

**Deliverable:** ✅ **MEILENSTEIN 3**: Produktiv einsetzbar!

---

## 📅 Monat 4: Feinschliff (Wochen 13-16)

### 📋 Woche 13: Shopfloor-UI
**Status:** 📋 GEPLANT
**Ziel:** Tablet-Ansicht für Werker

- [ ] Tablet-optimiertes UI
- [ ] QR-Scanner Integration
- [ ] Touch-freundliche Bedienung
- [ ] Offline-Modus (Service Worker)
- [ ] Große Buttons/Icons

**Deliverable:** Werker-Ansicht läuft

---

### 📋 Woche 14: Einrichteblätter & Fotos
**Status:** 📋 GEPLANT
**Ziel:** Komplette Dokumentation

- [ ] Setup Sheets Backend/Frontend
- [ ] Setup Photos Upload
- [ ] PDF-Generierung
- [ ] Foto-Upload
- [ ] Download-Funktion

**Deliverable:** Dokumentation komplett

---

### 📋 Woche 15: Reports & Analytics
**Status:** 📋 GEPLANT
**Ziel:** Dashboards

- [ ] Dashboard für Meister
- [ ] Statistiken
- [ ] Wartungs-Reports
- [ ] Programm-Statistiken
- [ ] Export (PDF/Excel)

**Deliverable:** Reporting funktioniert

---

### 📋 Woche 16: Deployment & Optimierung
**Status:** 📋 GEPLANT
**Ziel:** Production-Ready

- [ ] Docker-Setup optimieren
- [ ] Raspberry Pi Deployment
- [ ] Backup-Strategie
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Schulungs-Material

**Deliverable:** ✅ **MEILENSTEIN 4**: System ist FERTIG!

---

## 🎯 Zukünftige Erweiterungen (Nach Monat 4)

### Phase 5: Advanced Features
- [ ] Machine Monitoring (MTConnect/OPC UA)
- [ ] DNC-Integration
- [ ] 3D G-Code Viewer
- [ ] Mobile App (React Native)
- [ ] ERP-Integration
- [ ] Erweiterte Analytics mit KI

---

## 📊 Fortschritt

```
Gesamt: ██████░░░░░░░░░░░░░░ 30%

Phase 1 (Monat 1): ██████████░░░░░░░░░░ 50%
  └─ Woche 1:      ████████████████████ 100% ✅
  └─ Woche 2:      ████████████████████ 100% ✅
  └─ Woche 3:      ░░░░░░░░░░░░░░░░░░░░   0% 🔜
  └─ Woche 4:      ░░░░░░░░░░░░░░░░░░░░   0%

Phase 2 (Monat 2): ░░░░░░░░░░░░░░░░░░░░  0%
Phase 3 (Monat 3): ░░░░░░░░░░░░░░░░░░░░  0%
Phase 4 (Monat 4): ░░░░░░░░░░░░░░░░░░░░  0%
```

**Arbeitszeit:** 16h / ~480h geschätzt  
**Geschätzte Fertigstellung:** April 2025  
**Aktueller Sprint:** Woche 3 - Frontend React App

---

## 🎉 Meilensteine erreicht

- ✅ **2025-11-01:** Woche 1 abgeschlossen - Datenbank-Schema komplett (28 Tabellen)
- ✅ **2025-11-02:** Woche 2 abgeschlossen - Backend API komplett (Auth + Parts CRUD + Audit Log)
- 🔜 **Next:** Woche 3 - Frontend React App mit TailwindCSS

---

## 📈 Velocity Tracking

| Woche | Geplant | Erreicht | Status |
|-------|---------|----------|--------|
| **Woche 1** | DB-Schema | 28 Tabellen + Server | ✅ 100% |
| **Woche 2** | Backend API | Auth + Parts CRUD + Audit | ✅ 100% |
| **Woche 3** | Frontend Basis | - | 🔜 Next |

---

## 💡 Hinweise

- **Zeitbudget:** 30-35h/Woche
- **Flexibilität:** Timeline kann angepasst werden
- **Priorisierung:** Kritische Features zuerst
- **Qualität:** Lieber langsamer aber gut!

---

## 📝 Nächste Session

**Woche 3 Tasks:**
1. React App Setup mit Vite
2. TailwindCSS Integration
3. React Router Setup
4. Login/Logout UI
5. Protected Routes
6. Bauteile-Übersicht (Liste)
7. State Management (Context API)

**Geschätzte Zeit:** 6-8 Stunden

---

**Letzte Aktualisierung:** 2025-11-02  
**Aktueller Status:** ✅ Woche 2 komplett | 🔜 Woche 3 bereit zum Start
