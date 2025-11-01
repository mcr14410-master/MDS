# 🏭 PDM/MES System - Marktanalyse & Feature-Roadmap

## 📊 Executive Summary

Basierend auf der Analyse führender PDM/MES-Systeme (Predator PDM, SolidShop, Siemens NX, Autodesk Fusion, iTAC.MOM, TrakSYS) haben wir die wichtigsten Features identifiziert, die ein modernes Fertigungsdaten-Management-System auszeichnen.

---

## 🎯 Kernfunktionen führender Systeme

### 1. **Versionierung & Revision Control** ⭐⭐⭐

**Industrie-Standard:**
- WinTool Revision Control Module verwaltet und verfolgt Änderungen in NC-Programmen und Dokumenten in einer umfassenden, passwortgeschützten Benutzeroberfläche
- SolidShop verfolgt Änderungen in NC-Programmen und Fertigungsdokumenten akribisch, mit granularen Zugriffskontrollen
- Diff-Anzeige für Textdateien (G-Code)
- Automatische Versionierung bei jeder Änderung
- Rollback-Fähigkeit zu vorherigen Versionen

**Unsere Implementation:**
```sql
- program_revisions Tabelle
- Automatisches Diff-Tracking
- Major.Minor.Patch Versionierung
- Git-ähnliche History
```

---

### 2. **QR-Codes für Shopfloor** ⭐⭐⭐

**Industrie-Standard:**
- Predator PDM unterstützt QR-Codes, Barcodes und RFID-Codes zum direkten Start von Arbeitsaufträgen
- General Electric (GE) druckt QR-Codes als Aufkleber für Maschinen und Ausrüstung, die beim Scannen wichtige Informationen wie Wartungsdetails abrufen
- Katana Shop Floor App nutzt generierte QR-Codes mit eindeutigen 6-stelligen Login-Codes für den Zugriff auf Bedienerkonten

**Use Cases:**
- QR pro Bauteil → Direkt zu allen Dokumenten
- QR pro Arbeitsgang → Einrichteblatt, Aufspannfoto, NC-Programm
- QR an Maschine → Maschinenstammdaten, aktuelle Jobs
- QR für schnellen Login (Werker)

---

### 3. **Paperless Manufacturing** ⭐⭐⭐

**Industrie-Standard:**
- Predator PDM bietet eine papierlose, touchscreen-freundliche Shopfloor-Oberfläche
- Best-in-Class-Hersteller setzen 2,4x häufiger papierlose Dokumentenverwaltung ein als andere
- Digitale Arbeitsanweisungen mit Multimedia (Videos, Bilder)
- Echtzeit-Tracking ohne manuelle Zettel

**Features:**
- Tablet-optimierte UI für Werkhalle
- Offline-Fähigkeit
- Touch-freundliche Bedienung
- Elektronische Unterschriften

---

### 4. **RBAC (Role-Based Access Control)** ⭐⭐⭐

**Rollen im System:**

| Rolle | Berechtigungen |
|-------|---------------|
| **Admin** | Alle Rechte, Benutzerverwaltung, Maschinenstammdaten |
| **Programmierer** | CRUD für NC-Programme, Einrichteblätter, Release-Workflow |
| **Prüfer/QS** | Review & Freigabe, keine Bearbeitung |
| **Werker** | Read-Only freigegebene Dokumente, Upload Aufspannfotos |
| **Meister** | Read-All, Reporting, Monitoring |

---

### 5. **Audit Trail & Compliance** ⭐⭐⭐

**Industrie-Standard:**
- Predator PDM ermöglicht vollständige As-Built-Records und detaillierte Verlaufsberichte für Audits
- ISO 9001, FDA-Konformität
- CAPA (Corrective and Preventive Actions)

**Tracking:**
```sql
- Wer hat was geändert?
- Wann wurde es geändert?
- Warum wurde es geändert? (Kommentar)
- Welche Version war vorher?
- Wer hat freigegeben?
```

---

### 6. **Workflow-Management** ⭐⭐

**Status-Übergänge:**
```
Entwurf → In Prüfung → Geprüft → Freigegeben → Archiviert
```

**Features:**
- Automatische Benachrichtigungen
- Genehmigungsworkflows
- Kommentarfunktion
- Ablehnungsgründe dokumentieren

---

### 7. **CAM-Integration & File Watcher** ⭐⭐⭐

**Industrie-Standard:**
- NX CAM und Autodesk Fusion bieten automatisierte NC-Programmierung mit Cloud-basiertem Post-Processing
- SolidShop integriert CAM-Programmierer und Shopfloor-Bediener mit NC-Code-Verifizierung und G-Code-gesteuerter Simulation

**Unsere Features:**
- Ordner-Überwachung (File Watcher)
- Automatische Metadaten-Extraktion:
  - Programmnummer aus Dateiname
  - Kommentare aus G-Code
  - Werkzeugliste (T1, T2, ...)
  - Maschine aus Steuerung/Header
- Dry-Run-Modus: Dialog zum Bestätigen vor Import
- Verknüpfung zu Part/Operation vorschlagen

**Metadaten-Parser:**
```javascript
// G-Code Beispiel
// O1234 (GEHAEUSE-DECKEL)
// N10 G54 (NULLPUNKT WCS1)
// N20 T1 M6 (FRAESER D10)
// N30 T2 M6 (BOHRER D8)

→ Automatisch erkannt:
- Programm: O1234
- Teil: GEHAEUSE-DECKEL
- Werkzeuge: T1 (Fräser D10), T2 (Bohrer D8)
- Nullpunkt: G54
```

---

### 8. **Machine Monitoring & DNC** ⭐⭐

**Industrie-Standard:**
- CNC-Maschinenüberwachung sammelt Echtzeitdaten über MTConnect, OPC-UA oder Ethernet/IP-Protokolle
- Predator DNC ermöglicht Download freigegebener CNC-Programme auf Maschinen mit einem Klick

**Später:**
- MTConnect/OPC UA Integration
- Maschinenstatus (Running, Idle, Alarm)
- Zykluszeiten, Werkzeugwechsel
- OEE (Overall Equipment Effectiveness)

---

### 9. **3D Backplotting & Simulation** ⭐⭐

**Industrie-Standard:**
- SolidShop bietet G-Code-gesteuerte Simulation zur Fehlervermeidung vor Maschinenstart
- Autodesk Fusion simuliert den gesamten Bearbeitungsprozess virtuell zur Identifizierung von Werkzeugkollisionen

**Optional:**
- Web-basierter G-Code Viewer
- 3D-Vorschau der Werkzeugbahn
- Kollisionserkennung

---

### 10. **Multi-Maschinenpark** ⭐⭐⭐

**Maschinentypen:**
- DMG, Hermle, Mazak, Haas, ...
- Steuerungen: Heidenhain TNC, Fanuc, Siemens 840D, ...
- Spezialisierungen: 3-Achs, 5-Achs, Drehen, Fräsdrehen

**Stammdaten:**
```sql
machines:
- Hersteller, Modell
- Steuerungstyp
- Anzahl Achsen
- Arbeitsraum (X, Y, Z)
- Spindelleistung
- Magazinplätze
- Standort in Halle
- QR-Code
```

---

### 11. **Reporting & Analytics** ⭐⭐

**Dashboards:**
- Anzahl Programme pro Status
- Häufigste Bauteile
- Durchlaufzeiten (Entwurf → Freigabe)
- Audit-Reports
- KPI-Tracking

---

## 🏗️ Erweiterte Datenbank-Architektur

### **Kern-Entitäten:**

```
Kunde (customer)
  └─ Projekt (project)
      └─ Bauteil/Part (part)
          └─ Arbeitsgang/Operation (operation) [OP10, OP20, ...]
              ├─ Programm (program) [logisch]
              │   └─ ProgrammRevision (program_revision)
              │       └─ ProgrammDatei (program_file)
              ├─ Einrichteblatt (setup_sheet)
              │   └─ SetupRevision (setup_revision)
              └─ Aufspannfoto (setup_photo)

Maschine (machine)
  ├─ Maschinentyp
  └─ Steuerung

Werkzeug (tool)
  └─ Werkzeughalter (tool_holder)

Benutzer (user)
  └─ Rolle (role)
      └─ Berechtigung (permission)

Audit-Log (audit_log)
  └─ Alle Änderungen

Workflow-Status (workflow_state)
  └─ Status-Übergänge
```

---

## 🔐 Sicherheit & Compliance

### **Auth-System:**
- JWT-basierte Authentifizierung
- Refresh Tokens
- Session Management
- 2FA (optional, später)

### **Berechtigungen:**
```javascript
permissions = {
  'part.create': ['admin', 'programmer'],
  'part.read': ['*'], // alle
  'part.update': ['admin', 'programmer'],
  'part.delete': ['admin'],
  'program.release': ['admin', 'reviewer'],
  'photo.upload': ['admin', 'programmer', 'operator']
}
```

### **Audit-Trail:**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  action VARCHAR(20), -- CREATE, UPDATE, DELETE, APPROVE
  changes JSONB, -- Alte und neue Werte
  reason TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📱 UI-Konzepte

### **1. Programmierer-Ansicht**
- Komplex, viele Features
- Datei-Upload (Drag & Drop)
- Inline-Editing
- Diff-Viewer
- Versionsgraph

### **2. Werker-Ansicht (Shopfloor)**
- **Einfach & Touch-optimiert**
- Große Buttons
- QR-Scanner integriert
- Nur freigegebene Dokumente
- Download-Buttons für NC-Programme
- Foto-Upload von Aufspannungen
- Offline-Fähigkeit

### **3. Admin-Dashboard**
- Benutzer

verwaltung
- System-Statistiken
- Audit-Logs durchsuchen
- Maschinenstammdaten

---

## 🚀 Phasen-Plan

### **Phase 2A: Erweiterte Datenbank** (2-3 Wochen)
```
✅ Neue Tabellen:
   - customers, projects
   - operations (Arbeitsgänge)
   - program_revisions
   - machines, controllers
   - users, roles, permissions
   - audit_log
   - workflow_states

✅ Migrations-System (node-pg-migrate)
✅ Seed-Daten für Test
```

### **Phase 2B: Backend API** (2-3 Wochen)
```
✅ Auth-System (JWT)
✅ RBAC Middleware
✅ CRUD für alle Entitäten
✅ File Upload (Multer)
✅ Audit-Log automatisch
✅ Versionierung
✅ Workflow-Übergänge
```

### **Phase 2C: Frontend Basis** (3-4 Wochen)
```
✅ Login/Logout
✅ Rollenbasierte Navigation
✅ Erweiterte Bauteil-Ansicht mit Operations
✅ Programm-Upload & Management
✅ Versionsverlauf anzeigen
✅ Einrichteblatt-Editor
✅ Foto-Upload
```

### **Phase 3: Workflows & QR** (2-3 Wochen)
```
✅ Status-Workflows
✅ Freigabe-Prozess
✅ QR-Code Generierung
✅ QR-Scanner Integration
✅ Benachrichtigungen
✅ Diff-Viewer (Text)
```

### **Phase 4: Shopfloor UI** (2 Wochen)
```
✅ Tablet-optimierte Oberfläche
✅ QR-Login für Werker
✅ Touch-freundlich
✅ Große Icons
✅ Offline-Mode (Service Worker)
```

### **Phase 5: File Watcher & Parser** (2-3 Wochen)
```
✅ Ordner-Überwachung (chokidar)
✅ G-Code Parser
✅ Metadaten-Extraktion
✅ Auto-Verknüpfung vorschlagen
✅ Import-Dialog
```

### **Phase 6: Reporting** (1-2 Wochen)
```
✅ Dashboard-Widgets
✅ KPI-Tracking
✅ Audit-Reports
✅ Excel-Export
✅ PDF-Generation
```

### **Phase 7: Advanced** (nach Bedarf)
```
⭐ MTConnect/OPC UA
⭐ Machine Monitoring
⭐ DNC Integration
⭐ 3D Backplotting
⭐ ERP-Integration
⭐ Mobile App (React Native)
```

---

## 💻 Tech-Stack Empfehlung

### **Backend:**
```javascript
- Node.js + Express
- PostgreSQL (Primary)
- Redis (Caching, Sessions) - optional
- JWT (Auth)
- Multer (File Upload)
- chokidar (File Watcher)
- node-pg-migrate (Migrations)
```

### **Frontend:**
```javascript
- React 18
- React Router (Multi-Page)
- Axios
- TailwindCSS oder MUI
- react-qr-code (QR Generation)
- html5-qrcode (QR Scanner)
- react-diff-viewer (Diff-Anzeige)
- Chart.js (Dashboards)
```

### **Deployment:**
```
- Docker (wie gehabt)
- nginx (Reverse Proxy)
- PM2 (Node.js Process Manager)
- PostgreSQL 15+
```

---

## 📊 Datenbank-Größenordnung

**Beispiel-Kalkulation:**
```
- 500 Bauteile
- Ø 4 Operationen pro Bauteil = 2.000 Ops
- Ø 2 Programme pro Operation = 4.000 Programme
- Ø 5 Revisionen pro Programm = 20.000 Versionen
- Ø 50KB pro NC-Programm = 1GB
- Ø 3 Fotos pro Operation = 6.000 Fotos
- Ø 2MB pro Foto = 12GB

→ Total: ~15-20GB (sehr gut handhabbar)
```

---

## 🎨 Design-System

**Farben:**
```css
--primary: #1e3c72 (Dunkelblau)
--secondary: #2563eb (Hellblau)
--success: #10b981 (Grün - Freigegeben)
--warning: #f59e0b (Gelb - In Prüfung)
--danger: #ef4444 (Rot - Abgelehnt)
--info: #06b6d4 (Cyan - Entwurf)
```

**Status-Badges:**
- 🟦 Entwurf (Draft)
- 🟨 In Prüfung (Review)
- 🟩 Freigegeben (Released)
- 🟥 Abgelehnt (Rejected)
- ⬜ Archiviert (Archived)

---

## 🔄 Migrations-Strategie

**Tools:**
```bash
npm install node-pg-migrate
```

**Beispiel Migration:**
```javascript
// migrations/001_add_operations.js
exports.up = (pgm) => {
  pgm.createTable('operations', {
    id: 'id',
    part_id: {
      type: 'integer',
      references: 'parts',
      onDelete: 'CASCADE'
    },
    op_number: { type: 'varchar(20)', notNull: true },
    op_name: { type: 'varchar(255)', notNull: true },
    machine_id: { type: 'integer', references: 'machines' },
    setup_time_min: { type: 'integer' },
    cycle_time_sec: { type: 'decimal(10,2)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
  
  pgm.createIndex('operations', 'part_id');
};

exports.down = (pgm) => {
  pgm.dropTable('operations');
};
```

---

## 📈 ROI & Benefits

**Industrie-Benchmarks:**
- iTAC und TrakSYS zeigen ROIs von über 400% in drei Jahren
- Proficy Smart Factory kann die Gesamtbetriebskosten über fünf Jahre um bis zu 30% senken
- PMI-basierte automatisierte NC-Programmierung spart bis zu 90% der Programmierzeit

**Unsere Ziele:**
- ✅ 50% weniger Suchzeit nach Dokumenten
- ✅ 80% weniger Papierkram
- ✅ 100% Rückverfolgbarkeit (Audit-Trail)
- ✅ 30% schnellere Freigabe-Prozesse
- ✅ 0% falsche NC-Programme an Maschinen

---

## 🎯 Quick Wins (erste 4 Wochen)

1. **Woche 1-2:** Datenbank-Schema + Migrations
2. **Woche 3:** Auth-System + RBAC
3. **Woche 4:** Basis-UI mit Operations & Programmen

**Ergebnis:** Lauffähiges System mit:
- ✅ Login
- ✅ Bauteile → Operationen → Programme
- ✅ File Upload
- ✅ Basis-Versionierung
- ✅ Audit-Log

---

## 🚦 Entscheidungspunkte

**JETZT entscheiden:**
1. Migration oder Neubau der DB?
   - ✅ **Empfehlung:** Vollständiger Neubau mit Migrations
   
2. Auth-System selbst oder OAuth?
   - ✅ **Empfehlung:** Eigenes JWT-System (Unabhängigkeit)
   
3. Monorepo oder getrennte Repos?
   - ✅ **Empfehlung:** Monorepo (einfacher für Solo/kleines Team)

4. TypeScript oder JavaScript?
   - ✅ **Empfehlung:** JavaScript (schneller Start, später migrieren)

---

## 📚 Referenz-Implementierungen

**Inspirationsquellen:**
1. **Predator PDM** - Workflow & QR-Codes
2. **SolidShop** - CAM-Integration & G-Code Editor
3. **iTAC.MOM** - Modular Design
4. **NX CAM / Fusion 360** - CAM-Workflows
5. **Katana MRP** - Shopfloor UX

---

## ✅ Next Steps

**Soll ich jetzt:**
1. ✅ Vollständiges DB-Schema erstellen (SQL + Migrations)?
2. ✅ Backend-Struktur mit Auth aufbauen?
3. ✅ Proof-of-Concept für File-Upload + Versionierung?

**Deine Entscheidung!** Womit sollen wir anfangen? 🚀
