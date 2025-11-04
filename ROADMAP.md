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

**Abgeschlossen am:** 2025-11-02

---

### ✅ Woche 3: Frontend Basis
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** UI läuft, Login funktioniert
**Zeitaufwand:** ~2 Stunden

- [x] React App Setup (Vite)
- [x] Login/Logout UI
- [x] Bauteile-Übersicht
- [x] Bauteile CRUD (Erstellen, Bearbeiten, Löschen)
- [x] Responsive Design (TailwindCSS)
- [x] Fehlerbehandlung
- [x] State Management (Zustand)

**Deliverable:** ✅ Basis-UI läuft auf localhost:5173

**Abgeschlossen am:** 2025-11-02

---

### ✅ Woche 4: Integration & Testing
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** Frontend ↔ Backend komplett integriert
**Zeitaufwand:** ~4 Stunden

- [x] CORS im Backend aktivieren
- [x] Frontend mit Backend verbinden
- [x] Alle CRUD-Operationen testen
- [x] Part Detail Page
- [x] Part Create/Edit Forms
- [x] Form Validation
- [x] Toast Notifications
- [x] Bug-Fixes (Login, Dashboard Stats, Toasts)
- [x] Code aufräumen

**Deliverable:** ✅ **MEILENSTEIN 1**: Lauffähiges Basis-System

**Errungenschaften:**
```
✅ CORS konfiguriert für Frontend
✅ Part Detail Page (vollständige Ansicht)
✅ Part Create/Edit Forms (mit Validierung)
✅ Toast Notification System (selbst gebaut, ohne Library)
✅ Login Fix (username statt login)
✅ Dashboard Stats Fix (snake_case Mapping)
✅ customer_id optional gemacht
✅ dimensions statt raw_material
✅ Alle CRUD-Operationen funktionieren
✅ Permission-based UI überall
✅ ~1200 Lines neuer Frontend Code
✅ 9 Bugs gefixed
```

**Abgeschlossen am:** 2025-11-03

---

## 📅 Monat 2: Kern-Features (Wochen 5-8)

### ✅ Woche 5: Operations (Arbeitsgänge)
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** Bauteile haben Arbeitsgänge

- [x] Operations Backend CRUD
- [x] Backend Testing (test-operations.http)
- [x] Frontend: Operations pro Bauteil
- [x] OP-Nummern (OP10, OP20, ...)
- [x] Maschinen-Zuweisung
- [x] Sequence Management

**Deliverable:** ✅ Teil → Operations funktioniert (Backend + Frontend komplett!)

**Aktueller Stand (04.11.2025):**
```
✅ operationsController.js (373 Zeilen)
✅ operationsRoutes.js (53 Zeilen) 
✅ server.js aktualisiert (v1.1.0)
✅ test-operations.http (626 Zeilen)
✅ Backend Testing KOMPLETT
✅ operationsStore.js (150 Zeilen)
✅ OperationsList.jsx (145 Zeilen)
✅ OperationCard.jsx (105 Zeilen)
✅ OperationForm.jsx (270 Zeilen)
✅ PartDetailPage.jsx mit Operations Tab (300 Zeilen)
✅ Frontend Testing KOMPLETT
✅ Bug-Fixes: 3 Response Format Bugs gefixt
✅ UX-Verbesserung: Zykluszeit in Minuten (Frontend-Konvertierung)
```

**Backend Features:**
```
✅ CRUD Operations (Create, Read, Update, Delete)
✅ Filter by part_id
✅ JOIN mit parts & machines
✅ Auto-Sequence Generierung (10, 20, 30...)
✅ Validierung (Pflichtfelder, Unique Constraints)
✅ Error Handling (404, 409, 401)
```

**Frontend Features:**
```
✅ Tab-System (Details / Arbeitsgänge)
✅ Operations Liste mit Sortierung (Sequence)
✅ Operation Cards mit Zeit-Formatierung
✅ Create/Edit Modal Form
✅ Validierung (OP-Nummer, OP-Name erforderlich)
✅ Permission-based UI
✅ Toast Notifications
✅ Empty State
✅ Responsive Design (3/2/1 Spalten)
✅ Zeit-Eingabe vereinheitlicht (beide Zeiten in Minuten)
```

**Abgeschlossen:** Backend + Frontend komplett (04.11.2025)
**Nächster Schritt:** Woche 6 - Programme & File Upload

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
**Ziel:** Status-Übergänge

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

### 🔧 Technical Debt / Refactoring-Kandidaten
- [ ] **Operations Zeit-Einheiten vereinheitlichen:** 
  - Aktuell: setup_time_minutes (Minuten) + cycle_time_seconds (Sekunden in DB, aber Minuten im Frontend)
  - Ziel: Beide in Minuten in DB speichern (cycle_time_seconds → cycle_time_minutes)
  - Aufwand: ~2h (Migration + Backend + Frontend + Tests)
  - Priorität: Low (funktioniert aktuell mit Frontend-Konvertierung)

---

## 📊 Fortschritt

```
Gesamt: █████████████░░░░░░░ 58%

Phase 1 (Monat 1): ████████████████████ 100% ✅
  └─ Woche 1:      ████████████████████ 100% ✅
  └─ Woche 2:      ████████████████████ 100% ✅
  └─ Woche 3:      ████████████████████ 100% ✅
  └─ Woche 4:      ████████████████████ 100% ✅

Phase 2 (Monat 2): ██████░░░░░░░░░░░░░░ 25%
  └─ Woche 5:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)
  └─ Woche 6:      ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 7:      ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 8:      ░░░░░░░░░░░░░░░░░░░░  0%

Phase 3 (Monat 3): ░░░░░░░░░░░░░░░░░░░░  0%
Phase 4 (Monat 4): ░░░░░░░░░░░░░░░░░░░░  0%
```

**Arbeitszeit:** 32h / ~480h geschätzt (6.7%)
**Geschätzte Fertigstellung:** April 2025  
**Aktueller Sprint:** ✅ Phase 1 KOMPLETT | ✅ Woche 5 KOMPLETT (100%)

---

## 🎉 Meilensteine erreicht

- ✅ **2025-11-01:** Woche 1 abgeschlossen - Datenbank-Schema komplett (28 Tabellen)
- ✅ **2025-11-02:** Woche 2 abgeschlossen - Backend API komplett (Auth + Parts CRUD)
- ✅ **2025-11-02:** Woche 3 abgeschlossen - Frontend React App komplett (Login + Dashboard + Parts)
- ✅ **2025-11-03:** Woche 4 abgeschlossen - Integration komplett (CRUD + Toast + Fixes)
- 🎊 **2025-11-03:** **PHASE 1 KOMPLETT - MEILENSTEIN 1 ERREICHT!**
- ✅ **2025-11-04:** Woche 5 Backend gestartet - Operations API erstellt (373 Zeilen)
- ✅ **2025-11-04:** Woche 5 Backend komplett - Operations API getestet & alle Tests erfolgreich!
- ✅ **2025-11-04:** Woche 5 Frontend komplett - Operations UI fertig (4 Components, 970 Zeilen)
- 🎊 **2025-11-04:** **WOCHE 5 KOMPLETT - Operations Frontend + Backend fertig!**
- 📜 **Next:** Woche 6 - Programme & File Upload

---

## 📈 Velocity Tracking

| Woche | Geplant | Erreicht | Status |
|-------|---------|----------|--------|
| **Woche 1** | DB-Schema | 28 Tabellen + Server | ✅ 100% |
| **Woche 2** | Backend API | Auth + Parts CRUD | ✅ 100% |
| **Woche 3** | Frontend Basis | React App + Login + Dashboard | ✅ 100% |
| **Woche 4** | Integration | CRUD + Detail + Forms + Toasts | ✅ 100% |
| **Woche 5** | Operations | Backend API + Frontend UI + Bug-Fixes | ✅ 100% |

---

## 💡 Hinweise

- **Zeitbudget:** 30-35h/Woche
- **Flexibilität:** Timeline kann angepasst werden
- **Priorisierung:** Kritische Features zuerst
- **Qualität:** Lieber langsamer aber gut!

---

## 🔧 Nächste Session

**Woche 6 Tasks - Programme & File Upload:**
1. ❌ File Upload Backend (Multer)
2. ❌ Programs CRUD API
3. ❌ Programs Frontend Components
4. ❌ File Validation (NC-Programme, G-Code)
5. ❌ Program Download Funktion
6. ❌ Programme zu Operations verknüpfen
7. ❌ Program Viewer (Optional: Syntax Highlighting)

**Nächster Schritt:** Woche 6 Backend starten (File Upload + Programs API)

**Geschätzte Zeit:** 8-10 Stunden (Backend 4-5h, Frontend 4-5h)

---

**Letzte Aktualisierung:** 2025-11-04  
**Aktueller Status:** ✅ Phase 1 KOMPLETT! 🎉 | ✅ Woche 5 KOMPLETT (Backend + Frontend)! 🚀
