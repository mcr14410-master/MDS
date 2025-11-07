# Roadmap - Fertigungsdaten Management System

**Zeitbudget:** 30-35h/Woche
**Geschätzte Dauer:** 4-5 Monate (19 Wochen)
**Start:** Januar 2025

## 🎯 Kern-Features

**Basis-System (Phase 1-2):**
- ✅ Bauteilstammdaten & Operationen
- ✅ NC-Programme (Upload, Versionierung, Download)
- Maschinen-Verwaltung
- Workflow-System (Entwurf → Freigabe)
- QR-Codes & CAM-Integration

**Erweitert (Phase 3-4):**
- **Werkzeugverwaltung** (Lagerhaltung, Nachbestellung, Standzeit)
- **Messmittelverwaltung** (Kalibrierung, ISO/Luftfahrt-ready)
- Wartungssystem (Skill-Level, Roboter)
- Shopfloor-UI (Tablet-optimiert)
- Reports & Analytics (ISO-Audit-ready)

**Optional (Phase 5):**
- G-Code Parser (Werkzeug-Extraktion)
- Machine Monitoring (MTConnect/OPC UA)
- Mobile App & ERP-Integration

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

### ✅ Woche 6: Programme & File Upload
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** NC-Programme hochladen
**Zeitaufwand:** ~7 Stunden (Backend 3h + Frontend 4h + Bugfixes)

- [x] File Upload (Multer)
- [x] Backend: Program CRUD
- [x] Backend Testing (test-programs.http)
- [x] File Validation (15 Dateitypen)
- [x] Program Download
- [x] Frontend: Program Upload
- [x] Frontend: Programs Liste
- [x] Frontend: Program Card
- [x] Frontend: Operation Detail Page (mit Programmen)
- [x] Auto-Generierung program_number
- [x] Response Format standardisiert
- [x] Delete Button hinzugefügt

**Deliverable:** ✅ **KOMPLETT** - Programme hochladen, anzeigen, bearbeiten, löschen funktioniert!

**Bugs gefixt:**
- program_number Auto-Generierung (OP10-001 Format)
- Backend Response Format standardisiert (data statt program/programs)
- Frontend Null-Checks & Array-Validierung
- Delete Button in ProgramCard

**UI-Entscheidung:** 
- Aktuell: Variante 2 - Separate Operation Detail Page mit Programmen
- 📝 **TODO:** UI später nochmal überdenken (ggf. expandierbare Cards oder Tabs)

**Abgeschlossen am:** 2025-11-05

**Aktueller Stand (05.11.2025):**
```
✅ uploadMiddleware.js (Multer Config, 100MB, 15 Dateitypen)
✅ programsController.js (CRUD + Download + File-Hash)
✅ programsRoutes.js (7 Endpoints)
✅ test-programs.http (15 Tests)
✅ test-file-upload.http (7 Tests)
✅ server.js aktualisiert (v1.2.0)
✅ Backend Testing KOMPLETT
```

**Backend Features:**
```
✅ POST /api/programs - Programm hochladen (Multipart)
✅ GET /api/programs - Alle Programme (mit Filter)
✅ GET /api/programs/:id - Details + Revisionen
✅ GET /api/programs/:id/download - Download
✅ PUT /api/programs/:id - Metadaten ändern
✅ DELETE /api/programs/:id - Löschen (inkl. Files)
✅ File-Hash (SHA-256)
✅ Content in DB (für Syntax-Highlighting)
✅ Automatische Versionierung (1.0.0)
✅ Workflow-State (draft)
✅ CASCADE Delete
```

**Frontend noch offen:**
```
❌ ProgramsList.jsx
❌ ProgramCard.jsx
❌ ProgramUploadForm.jsx
❌ ProgramViewer.jsx (optional)
❌ Integration in PartDetailPage
```

**Abgeschlossen:** Backend komplett (05.11.2025)
**Nächster Schritt:** Frontend Components erstellen

---

### ✅ Woche 7: Versionierung
**Status:** ✅ **KOMPLETT**
**Ziel:** Automatische Versionierung & Rollback (Backend + Frontend)
**Zeitaufwand:** ~8 Stunden (Backend 5h + Frontend 3h)

**Backend:**
- [x] Revision-Logic (Major.Minor.Patch)
- [x] Upload erweitern (User wählt Version-Type)
- [x] Versions-Historie Endpoint
- [x] Diff-Berechnung (Zeile-für-Zeile)
- [x] Vergleich zwischen Versionen (2 Varianten)
- [x] Rollback-Funktion (ohne Duplikate)

**Frontend:**
- [x] RevisionsList.jsx (Versions-Historie anzeigen)
- [x] DiffViewer.jsx (Unified/Split View)
- [x] ProgramUploadForm erweitert (3 Modi: Neu/Revision/Edit)
- [x] ProgramCard erweitert (Neue Version Button)
- [x] Rollback Button in UI
- [x] Delete Revision Funktion

**Deliverable:** ✅ **KOMPLETT** - Versionierung funktioniert vollständig (Backend + Frontend)!

**Backend Features:**
```
✅ POST   /api/programs/:id/revisions         - Neue Revision hochladen
✅ GET    /api/programs/:id/revisions         - Versions-Historie
✅ GET    /api/programs/:id/compare?from=X&to=Y - Versionen vergleichen (benutzerfreundlich!)
✅ GET    /api/programs/:id/revisions/:r1/compare/:r2 - Versionen vergleichen (ID-basiert)
✅ POST   /api/programs/:id/rollback?to=X     - Auf alte Version zurückrollen
```

**Frontend Features:**
```
✅ RevisionsList Component - Versionshistorie mit Badges
✅ DiffViewer Component - 2 View-Modi (Unified/Split)
✅ Upload-Modi - Neues Programm / Neue Revision / Bearbeiten
✅ Version-Type Auswahl - Major/Minor/Patch mit Change-Log
✅ Rollback Button - Mit Bestätigung
✅ Delete Revision - Mit Permission-Check
✅ UI Optimierungen - Kompakte Action-Bar
```

**Version-Logic:**
```
✅ Patch: 1.0.0 → 1.0.1 (kleine Optimierung)
✅ Minor: 1.0.0 → 1.1.0 (Werkzeug gewechselt)
✅ Major: 1.0.0 → 2.0.0 (neue Strategie)
✅ User wählt Version-Type beim Upload (default: patch)
✅ Neue Revisionen starten immer als "draft"
✅ Change-Log optional für bessere Dokumentation
```

**Diff-Berechnung:**
```
✅ Zeile-für-Zeile Vergleich
✅ Zeigt: added, removed, changed, unchanged
✅ Summary: Anzahl Änderungen
✅ 2 View-Modi: Unified (wie Git) / Split (Side-by-Side)
✅ Farbcodierung: Grün/Rot/Gelb
✅ Perfekt für NC-Programme
```

**Rollback:**
```
✅ Alte Version reaktivieren
✅ Workflow-Status wird übernommen
✅ Alle Versionen bleiben erhalten (Audit-Trail!)
✅ Beliebig hin- und herwechseln
✅ Keine Duplikate
✅ UI mit Bestätigungsdialog
```

**Bug-Fixes:**
```
✅ 16 Fixes während Entwicklung
✅ Backend-Response Format vereinheitlicht
✅ Feldnamen-Mapping (version_string, filesize, etc.)
✅ Diff-Format optimiert
✅ Alle Features getestet
```

**Abgeschlossen am:** 2025-11-05 (Backend) + 2025-11-05 (Frontend)

---

### ✅ Woche 8: Maschinen-Stammdaten
**Status:** ✅ **ABGESCHLOSSEN**
**Ziel:** Maschinenpark verwalten
**Zeitaufwand:** ~4 Stunden

- [x] Maschinen CRUD (Backend + Frontend)
- [x] Steuerungstypen
- [x] Netzwerk-Pfade
- [x] Programme zu Maschinen zuordnen
- [x] Filter & Search (Typ, Steuerung, Aktiv/Inaktiv)
- [x] Gruppierung nach Maschinentyp
- [x] Statistiken (Betriebsstunden, Operations, Programme)
- [x] Soft/Hard Delete
- [x] 26 API Tests erfolgreich

**Backend:**
```
✅ machinesController.js (8 Endpoints, 500 Zeilen)
✅ machinesRoutes.js (RESTful Routes)
✅ server.js Integration (Version 1.4.0)
✅ test-machines.http (26 Test-Cases)
✅ Validierung & Error Handling
✅ Numerische Felder-Sanitization
```

**Frontend:**
```
✅ machinesStore.js (Zustand Store)
✅ MachinesPage.jsx (Haupt-Seite mit Filter)
✅ MachineCard.jsx (Card Component)
✅ MachineForm.jsx (Modal-Dialog)
✅ Navigation erweitert
✅ Permissions: machine.read/create/update/delete
✅ Responsive Design
```

**Deliverable:** ✅ **MEILENSTEIN 2 ERREICHT**: Kern-Features komplett
- ✅ Bauteile-Verwaltung
- ✅ Operationen-Verwaltung
- ✅ Programme-Verwaltung (inkl. Versionierung)
- ✅ Maschinen-Verwaltung

**Abgeschlossen am:** 2025-11-06

---

## 📅 Monat 3: Workflows & Werkzeuge (Wochen 9-12)

### ✅ Woche 9: Workflow-System
**Status:** ✅ KOMPLETT
**Ziel:** Status-Übergänge (Backend + Frontend)
**Zeitaufwand:** ~3h (Backend) + ~3.5h (Frontend) = 6.5h

**Backend:**
- [x] Status-Übergänge (Entwurf → Freigabe → Archiv)
- [x] Berechtigungs-Checks (programmer/admin)
- [x] Freigabe-Workflow
- [x] History-Tracking
- [x] 4 API Endpoints
- [x] 16 Tests erfolgreich

**Frontend:**
- [x] workflowStore.js (135 Zeilen)
- [x] WorkflowStatusBadge.jsx (156 Zeilen)
- [x] WorkflowActions.jsx (211 Zeilen)
- [x] WorkflowHistory.jsx (135 Zeilen)
- [x] ProgramCard erweitern (Status-Badge integriert)
- [x] OperationDetailPage erweitern (Historie-Tab mit Programme-Historie)
- [x] ProgramsHistoryList.jsx (NEU - 175 Zeilen)
- [x] Standard-Nachrichten für Workflow-Übergänge

**Deliverable:** ✅ Komplettes Workflow-System für Programme

**Backend Features:**
```
✅ POST /api/workflow/change           - Status ändern
✅ GET  /api/workflow/states            - Alle Status
✅ GET  /api/workflow/:type/:id/history - Historie
✅ GET  /api/workflow/:type/:id/transitions - Verfügbare Übergänge
✅ 6 Workflow-Status (draft, review, approved, released, rejected, archived)
✅ Erlaubte Übergänge definiert
✅ Automatisches History-Tracking
✅ Transaction-Safety
✅ Nur programmer + admin dürfen Status ändern
✅ Standard-Nachrichten für automatische Übergänge
```

**Frontend Features:**
```
✅ Workflow-Store mit State Management
✅ Status-Badges (6 Farben, Dark Mode, 3 Größen)
✅ Action-Buttons mit Permission-Checks
✅ Modal für manuelle Gründe (reject/archive)
✅ Timeline-Historie-Ansicht
✅ Programme-Historie pro Operation
✅ Dark Mode Support überall
✅ Toast-Notifications
✅ Empty & Loading States
```

**Bugs gefixt:**
- Database Import
- Auth Middleware Import
- Test-Workflow angepasst (File-Upload Requirement)
- Permission-Check (Rollen aus DB laden)
- SQL Query (first_name/last_name statt full_name)
- operationId als Integer parsen (ProgramsHistoryList)
- Datum-Formatierung robuster (null-checks)
- Backend-Feldnamen korrigiert (created_at, change_reason)

**Für später (Phase 4+):**
- Granulare Permissions: workflow.release, workflow.reject, workflow.archive
- Benachrichtigungen bei Status-Änderungen
- Eskalation (z.B. review > 3 Tage alt)
- **Umfangreiche Historie-Übersicht (eigene Page)**
  - Alle Workflow-Änderungen systemweit
  - Filtern nach: Entity-Type, Status, Benutzer, Datum
  - Suchen nach: Programm-Name, Grund
  - Export als CSV/PDF
  - Statistiken & Charts
- Workflow für Operations & Setup-Sheets
- Bulk-Status-Änderungen

**Abgeschlossen am:** 2025-11-07

---

### 📋 Woche 10: QR-Codes & CAM-Integration
**Status:** 📋 GEPLANT
**Ziel:** CAM-Integration mit Metadata-Extraktion

- [ ] QR-Code Generierung
- [ ] QR pro Operation
- [ ] File Watcher (chokidar)
- [ ] CAM-Ordner überwachen
- [ ] G-Code Parser (Heidenhain DIN/ISO)
- [ ] Metadata-Extraktion (Programm-Name, Werkzeuge, etc.)
- [ ] Auto-Import Dialog
- [ ] CAM-Postprozessor Anpassungen dokumentieren

**Deliverable:** CAM → MDS funktioniert automatisch

**Parser-Note:** 
- Heidenhain DIN/ISO Format
- CAM-Postprozessor wird angepasst für optimale Metadaten
- Basis für spätere Werkzeug-Extraktion

---

### 📋 Woche 11-12: Werkzeugverwaltung
**Status:** 📋 GEPLANT
**Ziel:** Werkzeug-Management mit Lagerhaltung
**Zeitaufwand:** ~12-14 Stunden (2 Wochen)

**Woche 11 - Werkzeug-Stammdaten:**
- [ ] Werkzeug-Datenbank (Tabellen)
- [ ] Werkzeugtypen (Fräser, Bohrer, Drehmeißel, etc.)
- [ ] Werkzeug-Stammdaten (Durchmesser, Länge, Hersteller)
- [ ] Standzeit-Tracking
- [ ] Backend CRUD API
- [ ] Frontend: Werkzeug-Verwaltung UI

**Woche 12 - Lagerhaltung & Verknüpfung:**
- [ ] Lager-System (Standort-Tracking komplex)
- [ ] Schränke, Fächer, Regale
- [ ] Bestandsverwaltung (Min/Max/Aktuell)
- [ ] Nachbestell-System (Vorschläge)
- [ ] Werkzeuge → Operations verknüpfen
- [ ] Lieferanten-Verwaltung
- [ ] Verschleiß-Historie

**Deliverable:** Werkzeugverwaltung Basic funktioniert

**Für später (Phase 5):**
- Automatische Werkzeug-Extraktion aus G-Code (Parser)
- Erweiterte Nachbestell-Automatik
- Werkzeug-Lebensdauer-Prognose

---

### 📋 Woche 13: Shopfloor-UI
**Status:** 📋 GEPLANT
**Ziel:** Tablet-Ansicht für Werker

- [ ] Tablet-optimiertes UI
- [ ] QR-Scanner Integration
- [ ] Touch-freundliche Bedienung
- [ ] Offline-Modus (Service Worker)
- [ ] Große Buttons/Icons
- [ ] Werkzeug-Entnahme UI

**Deliverable:** Werker-Ansicht läuft

---

### 📋 Woche 14: Messmittelverwaltung
**Status:** 📋 GEPLANT
**Ziel:** Messmittel mit Kalibrierung (ISO-kritisch!)
**Zeitaufwand:** ~6-8 Stunden

**Messmittel-Stammdaten:**
- [ ] Messmittel-Datenbank (Tabellen)
- [ ] Messmitteltypen (Messschieber, Lehrdorn, Bügelmessschraube, etc.)
- [ ] Stammdaten (Hersteller, Seriennummer, Messbereich)
- [ ] Backend CRUD API
- [ ] Frontend: Messmittel-Verwaltung UI

**Kalibrierungs-Management (ISO/Luftfahrt):**
- [ ] Kalibrierungs-Daten (Datum, Intervall, Zertifikat)
- [ ] PDF-Upload (Kalibrierungs-Zertifikat)
- [ ] Status-System (OK / Überfällig / Gesperrt)
- [ ] Alarm-System (Email bei Ablauf)
- [ ] Kalibrierungs-Historie (Audit-Trail)
- [ ] Nächste Kalibrierung automatisch berechnen

**Lagerhaltung & Entnahme:**
- [ ] Lager-System komplex (Standort-Tracking)
- [ ] Schränke, Fächer (wie Werkzeuge)
- [ ] Entnahme-Verwaltung (Wer? Wann? Für welchen Auftrag?)
- [ ] Rückgabe-System
- [ ] Verfügbarkeits-Check
- [ ] Messmittel → Programme/Operations zuweisen

**Deliverable:** Messmittel-Verwaltung mit Kalibrierung funktioniert

**ISO/Luftfahrt Features:**
- Nur kalibrierte Messmittel verwendbar
- Gesperrte Messmittel (überfällig) nicht entnehmbar
- Vollständiger Audit-Trail
- Export für Audits (PDF Reports)

---

### 📋 Woche 15: Einrichteblätter & Fotos
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

**Deliverable:** Wartungssystem komplett

---

## 📅 Monat 4: Messmittel & Reports (Wochen 13-16)

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

### 📋 Woche 15: Einrichteblätter & Fotos
**Status:** 📋 GEPLANT
**Ziel:** Komplette Dokumentation

- [ ] Setup Sheets Backend/Frontend
- [ ] Setup Photos Upload
- [ ] PDF-Generierung
- [ ] Foto-Upload (Aufspannfotos)
- [ ] Download-Funktion
- [ ] Werkzeug-Zuordnung im Einrichteblatt
- [ ] Messmittel-Zuordnung im Einrichteblatt

**Deliverable:** Dokumentation komplett

---

### 📋 Woche 16: Reports & Analytics
**Status:** 📋 GEPLANT
**Ziel:** Komplette Dokumentation

- [ ] Setup Sheets Backend/Frontend
- [ ] Setup Photos Upload
- [ ] PDF-Generierung
- [ ] Foto-Upload
- [ ] Download-Funktion

**Deliverable:** Dokumentation komplett

---

### 📋 Woche 16: Reports & Analytics
**Status:** 📋 GEPLANT
**Ziel:** Dashboards & ISO-Reports

- [ ] Dashboard für Meister
- [ ] Statistiken (Teile, Programme, Werkzeuge, Messmittel)
- [ ] Wartungs-Reports
- [ ] Programm-Statistiken
- [ ] Kalibrierungs-Report (ISO/Luftfahrt)
- [ ] Werkzeug-Bestandsreport
- [ ] Audit-Trail Export (PDF/Excel)
- [ ] Export (PDF/Excel)

**Deliverable:** ✅ **MEILENSTEIN 3**: ISO-ready! Werkzeuge, Messmittel & Reports komplett

---

## 📅 Monat 4-5: Wartung & Deployment (Wochen 17-19)

### 📋 Woche 17: Wartungssystem Basis
**Status:** 📋 GEPLANT
**Ziel:** Wartungspläne

- [ ] Maintenance Plans Backend
- [ ] Wartungstypen (täglich, wöchentlich, ...)
- [ ] Fälligkeitsberechnung
- [ ] Wartungs-Historie
- [ ] Benachrichtigungen

**Deliverable:** Wartungspläne funktionieren

---

### 📋 Woche 18: Wartung Erweitert
**Status:** 📋 GEPLANT
**Ziel:** Skill-Level-System

- [ ] Skill-Level (Helfer, Bediener, Meister)
- [ ] Aufgaben-Zuweisung
- [ ] Foto-Anleitungen
- [ ] Eskalations-System
- [ ] Checklisten
- [ ] Roboter-Wartung

**Deliverable:** Wartungssystem komplett

---

### 📋 Woche 19: Deployment & Optimierung
**Status:** 📋 GEPLANT
**Ziel:** Dashboards

- [ ] Dashboard für Meister
- [ ] Statistiken
- [ ] Wartungs-Reports
- [ ] Programm-Statistiken
- [ ] Export (PDF/Excel)

**Deliverable:** Reporting funktioniert

---

### 📋 Woche 19: Deployment & Optimierung
**Status:** 📋 GEPLANT
**Ziel:** Production-Ready

- [ ] Docker-Setup optimieren
- [ ] Raspberry Pi Deployment
- [ ] Backup-Strategie
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Schulungs-Material
- [ ] ISO-Checkliste finalisieren

**Deliverable:** ✅ **MEILENSTEIN 4**: System ist FERTIG + ISO-ready!

---

## 🎯 Phase 5: Advanced Features (Optional, nach Monat 5)

### Erweiterte Werkzeug-Features
- [ ] Automatische Werkzeug-Extraktion aus G-Code
- [ ] Erweiterte Nachbestell-Automatik
- [ ] Werkzeug-Lebensdauer-Prognose (KI)
- [ ] Integration mit Werkzeugvoreinstellgerät

### Erweiterte Messmittel-Features
- [ ] 3D-Messmaschinen Integration
- [ ] Automatische Messprotokolle
- [ ] SPC (Statistical Process Control)

### Weitere Features
- [ ] Machine Monitoring (MTConnect/OPC UA)
- [ ] DNC-Integration
- [ ] 3D G-Code Viewer
- [ ] Mobile App (React Native)
- [ ] ERP-Integration
- [ ] Erweiterte Analytics mit KI
**Status:** 📋 GEPLANT
**Ziel:** Production-Ready

- [ ] Docker-Setup optimieren
- [ ] Raspberry Pi Deployment
- [ ] Backup-Strategie
- [ ] Performance-Optimierung
- [ ] Dokumentation vervollständigen
- [ ] Schulungs-Material

**Deliverable:** ✅ **MEILENSTEIN 4**: System ist FERTIG!

## 🎯 Phase 5: Advanced Features (Optional, nach Monat 5)

### 🔧 Technical Debt / Refactoring-Kandidaten
- [ ] **Operations Zeit-Einheiten vereinheitlichen:** 
  - Aktuell: setup_time_minutes (Minuten) + cycle_time_seconds (Sekunden in DB, aber Minuten im Frontend)
  - Ziel: Beide in Minuten in DB speichern (cycle_time_seconds → cycle_time_minutes)
  - Aufwand: ~2h (Migration + Backend + Frontend + Tests)
  - Priorität: Low (funktioniert aktuell mit Frontend-Konvertierung)

- [ ] **Program Number Format überdenken:**
  - Aktuell: Auto-generiert als "OP10-001", "OP10-002", etc.
  - Überlegungen: Anderes Format? Manuell editierbar? Prefix/Suffix?
  - Aufwand: ~1h (Backend Logik anpassen)
  - Priorität: Low (funktioniert aktuell gut)

- [ ] **Werkzeug-Extraktion aus G-Code:**
  - Parser für Heidenhain DIN/ISO entwickeln
  - Automatische Werkzeugliste aus NC-Programm
  - TODO später: CAM-Postprozessor Dokumentation
  - Aufwand: ~8h (Parser + Tests)
  - Priorität: Medium (Phase 5 Feature)

- [ ] **Messmittel-Entnahme Optimierung:**
  - Barcode/RFID für schnelle Entnahme
  - Mobile App für Entnahme
  - Aufwand: ~12h
  - Priorität: Low (Phase 5 Feature)

---

## 📊 Fortschritt

```
Gesamt: ██████████░░░░░░░░░░ 47% (9 von 19 Wochen)

Phase 1 (Monat 1): ████████████████████ 100% ✅
  └─ Woche 1:      ████████████████████ 100% ✅
  └─ Woche 2:      ████████████████████ 100% ✅
  └─ Woche 3:      ████████████████████ 100% ✅
  └─ Woche 4:      ████████████████████ 100% ✅

Phase 2 (Monat 2): ████████████████████ 100% ✅ (4 von 4 Wochen)
  └─ Woche 5:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)
  └─ Woche 6:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)
  └─ Woche 7:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)
  └─ Woche 8:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)

Phase 3 (Monat 3): █████░░░░░░░░░░░░░░░ 25% (1 von 4 Wochen)
  └─ Woche 9:      ████████████████████ 100% ✅ (Workflow-System komplett!)
  └─ Woche 10:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 11:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 12:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 8:      ████████████████████ 100% ✅ (Backend + Frontend komplett!)

Phase 3 (Monat 3): ░░░░░░░░░░░░░░░░░░░░  0% (0 von 4 Wochen)
  └─ Woche 9:      ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 10:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 11-12:  ░░░░░░░░░░░░░░░░░░░░  0% (Werkzeuge)

Phase 4 (Monat 4): ░░░░░░░░░░░░░░░░░░░░  0% (0 von 4 Wochen)
  └─ Woche 13:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 14:     ░░░░░░░░░░░░░░░░░░░░  0% (Messmittel)
  └─ Woche 15:     ░░░░░░░░░░░░░░░░░░░░  0%
  └─ Woche 16:     ░░░░░░░░░░░░░░░░░░░░  0%

Phase 5 (Monat 5): ░░░░░░░░░░░░░░░░░░░░  0% (0 von 3 Wochen)
  └─ Woche 17-18:  ░░░░░░░░░░░░░░░░░░░░  0% (Wartung)
  └─ Woche 19:     ░░░░░░░░░░░░░░░░░░░░  0% (Deployment)
```

**Arbeitszeit:** ~59h / ~570h geschätzt (10.4%)
**Geschätzte Fertigstellung:** Mai 2025  
**Aktueller Sprint:** 🎊 **PHASE 2 KOMPLETT!** | ✅ Wochen 5-8 ALLE KOMPLETT | 🎉 **MEILENSTEIN 2 ERREICHT!**

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
- ✅ **2025-11-05:** Woche 6 Backend gestartet - File Upload Middleware erstellt
- ✅ **2025-11-05:** Woche 6 Backend komplett - Programs API fertig (CRUD + Download + 15 Tests)
- ✅ **2025-11-05:** Woche 6 Frontend komplett - Programs UI fertig (5 Components, 1020 Zeilen)
- 🎊 **2025-11-05:** **WOCHE 6 KOMPLETT - Programme hochladen, anzeigen, bearbeiten, löschen!**
- ✅ **2025-11-05:** Woche 7 Backend gestartet - Versionierung geplant
- ✅ **2025-11-05:** Woche 7 Backend komplett - Versionierung API fertig (5 neue Endpoints)
- ✅ **2025-11-05:** Woche 7 Frontend gestartet - RevisionsList + DiffViewer
- ✅ **2025-11-05:** Woche 7 Frontend komplett - Versionierung UI fertig (2 Components, 16 Bug-Fixes)
- 🎊 **2025-11-05:** **WOCHE 7 KOMPLETT - Vollständige Versionierung (Major/Minor/Patch + Diff + Rollback)!**
- ✅ **2025-11-06:** Woche 8 Backend gestartet - Maschinen-Verwaltung geplant
- ✅ **2025-11-06:** Woche 8 Backend komplett - Machines API fertig (8 Endpoints + 26 Tests)
- ✅ **2025-11-06:** Woche 8 Frontend komplett - Machines UI fertig (3 Components + Filter + Gruppierung)
- 🐛 **2025-11-06:** 3 Bugs gefunden und behoben (Permissions, Filter, Numerische Felder)
- 🎊 **2025-11-06:** **WOCHE 8 KOMPLETT - Maschinen-Verwaltung fertig!**
- 🎉 **2025-11-06:** **PHASE 2 KOMPLETT - MEILENSTEIN 2 ERREICHT!**
  - ✅ Bauteile-Verwaltung
  - ✅ Operationen-Verwaltung
  - ✅ Programme-Verwaltung (inkl. Versionierung)
  - ✅ Maschinen-Verwaltung
- ✅ **2025-11-07:** Woche 9 Backend gestartet - Workflow-System geplant
- ✅ **2025-11-07:** Woche 9 Backend komplett - Workflow API fertig (4 Endpoints + 16 Tests)
- ✅ **2025-11-07:** Woche 9 Frontend gestartet - Workflow Components erstellt
- ✅ **2025-11-07:** Woche 9 Frontend komplett - Workflow UI fertig (5 Components + 812 Zeilen)
- ✅ **2025-11-07:** Operations Historie-Tab erstellt - Programme-Historie pro Operation
- 🐛 **2025-11-07:** 4 Bugs gefunden und behoben (operationId parsing, date formatting, field names)
- 🎊 **2025-11-07:** **WOCHE 9 KOMPLETT - Workflow-System mit Historie fertig!**

---

## 📈 Velocity Tracking

| Woche | Geplant | Erreicht | Status |
|-------|---------|----------|--------|
| **Woche 1** | DB-Schema | 28 Tabellen + Server | ✅ 100% |
| **Woche 2** | Backend API | Auth + Parts CRUD | ✅ 100% |
| **Woche 3** | Frontend Basis | React App + Login + Dashboard | ✅ 100% |
| **Woche 4** | Integration | CRUD + Detail + Forms + Toasts | ✅ 100% |
| **Woche 5** | Operations | Backend API + Frontend UI + Bug-Fixes | ✅ 100% |
| **Woche 6** | Programme & Upload | Backend + Frontend + Bugfixes | ✅ 100% |
| **Woche 7** | Versionierung | Backend (5 Endpoints) + Frontend (2 Components) | ✅ 100% |
| **Woche 8** | Maschinen-Stammdaten | Backend (8 Endpoints) + Frontend (3 Components) + 3 Bugfixes | ✅ 100% |
| **Woche 9** | Workflow-System | Backend (4 Endpoints) + Frontend (5 Components) + Historie-Tab | ✅ 100% |

---

## 💡 Hinweise

- **Zeitbudget:** 30-35h/Woche
- **Flexibilität:** Timeline kann angepasst werden
- **Priorisierung:** Kritische Features zuerst
- **Qualität:** Lieber langsamer aber gut!

---

## 🔧 Nächste Session

**Woche 10 Tasks - QR-Codes & CAM-Integration:**
1. ❌ QR-Code Generierung pro Operation
2. ❌ File Watcher (chokidar) für CAM-Ordner
3. ❌ G-Code Parser (Heidenhain DIN/ISO)
4. ❌ Metadata-Extraktion aus NC-Programmen
5. ❌ Auto-Import Dialog

**Nächster Schritt:** Woche 10 - QR-Codes & CAM-Integration

**Status:** Phase 2 KOMPLETT ✅ | Woche 8 KOMPLETT ✅ | Nächster Sprint: Phase 3

---

**Letzte Aktualisierung:** 2025-11-06  
**Aktueller Status:** 🎉 **Phase 1 & 2 KOMPLETT!** | ✅ Wochen 1-8 ALLE KOMPLETT! | 🎊 **MEILENSTEIN 2 ERREICHT!** 🚀
