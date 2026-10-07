# Session 2025-11-08 - Woche 10 KOMPLETT: Setup Sheets Backend

**Datum:** 08.11.2025  
**Dauer:** ~4 Stunden (Backend 2h + Testing/Debugging 2h)  
**Status:** ✅ **KOMPLETT**

---

## 🎯 Ziele erreicht:

### **Backend (2h):** ✅ KOMPLETT
- ✅ ROADMAP umstrukturiert (Phase 2: Work Instructions)
- ✅ Migration erstellt (2 Tabellen)
- ✅ Backend Controller (8 Endpoints)
- ✅ Routes erstellt
- ✅ DB Config erstellt
- ✅ API Tests (23 Testfälle)
- ✅ Upload-Ordner erstellt
- ✅ Server.js aktualisiert

### **Testing & Debugging (2h):** ✅ KOMPLETT
- ✅ Migration korrigiert (programs statt nc_programs)
- ✅ Controller Exports gefixt
- ✅ Auth Middleware korrigiert (authenticateToken)
- ✅ 8 SQL-Spalten korrigiert
- ✅ JOIN mit program_revisions hinzugefügt
- ✅ JOIN mit customers hinzugefügt
- ✅ Alle 23 Tests erfolgreich

---

## 📦 Neue/Geänderte Dateien:

### **Backend:**
```
backend/
├── migrations/
│   └── 1737000008000_create-setup-sheets.js    (NEU - 210 Zeilen)
├── src/
│   ├── config/
│   │   └── db.js                                (NEU - 25 Zeilen)
│   ├── controllers/
│   │   └── setupSheetsController.js             (NEU - 575 Zeilen - KORRIGIERT)
│   ├── routes/
│   │   └── setupSheetsRoutes.js                 (NEU - 112 Zeilen - KORRIGIERT)
│   └── server.js                                (GEÄNDERT - 2 Zeilen)
├── uploads/
│   └── setup-sheets/                            (NEU - Ordner)
└── test-setup-sheets.http                       (NEU - 380 Zeilen)
```

**Backend:** ~1302 Zeilen neuer Code  
**ROADMAP:** Komplett umstrukturiert (Phase 2-5)

---

## 🗄️ Datenbank-Schema:

### **Tabelle: setup_sheets**
```sql
CREATE TABLE setup_sheets (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  operation_id INTEGER NOT NULL REFERENCES operations ON DELETE CASCADE,
  machine_id INTEGER NOT NULL REFERENCES machines ON DELETE RESTRICT,
  program_id INTEGER REFERENCES programs ON DELETE SET NULL,
  
  -- Asset Relations (später)
  fixture_id INTEGER,
  clamping_device_id INTEGER,
  fixture_description TEXT,
  clamping_description TEXT,
  
  -- Nullpunkt (steuerungsspezifisch)
  control_type VARCHAR(50),  -- heidenhain, siemens, fanuc, haas, mazatrol
  preset_number INTEGER,      -- Heidenhain: 1-99
  wcs_number VARCHAR(10),     -- Fanuc/Siemens: G54-G59
  wcs_x NUMERIC(10,3),
  wcs_y NUMERIC(10,3),
  wcs_z NUMERIC(10,3),
  reference_point TEXT,
  
  -- Material
  raw_material_dimensions VARCHAR(100),
  material_specification VARCHAR(100),
  
  -- Anweisungen
  setup_instructions TEXT,
  special_notes TEXT,
  
  -- Workflow
  status VARCHAR(20) DEFAULT 'draft' NOT NULL,
  version_number VARCHAR(20) DEFAULT '1.0',
  
  -- Audit
  created_by INTEGER NOT NULL REFERENCES users,
  updated_by INTEGER REFERENCES users,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX ON setup_sheets(operation_id);
CREATE INDEX ON setup_sheets(machine_id);
CREATE INDEX ON setup_sheets(program_id);
CREATE INDEX ON setup_sheets(status);
CREATE INDEX ON setup_sheets(created_by);
```

### **Tabelle: setup_sheet_photos**
```sql
CREATE TABLE setup_sheet_photos (
  id SERIAL PRIMARY KEY,
  setup_sheet_id INTEGER NOT NULL REFERENCES setup_sheets ON DELETE CASCADE,
  
  -- File Info
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  
  -- Metadata
  caption TEXT,
  photo_type VARCHAR(50) DEFAULT 'general',  -- general, cam_screenshot, real_photo, fixture, clamping, tool_setup
  sort_order INTEGER DEFAULT 0 NOT NULL,
  
  -- Audit
  uploaded_by INTEGER NOT NULL REFERENCES users,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX ON setup_sheet_photos(setup_sheet_id);
CREATE INDEX ON setup_sheet_photos(sort_order);
CREATE INDEX ON setup_sheet_photos(uploaded_by);
```

---

## 🔧 Backend Features:

### **API Endpoints (8):**
```
GET    /api/setup-sheets                      - Liste (Filter: operation_id, machine_id, status)
GET    /api/setup-sheets/:id                  - Details + Fotos
POST   /api/setup-sheets                      - Erstellen
PUT    /api/setup-sheets/:id                  - Aktualisieren
DELETE /api/setup-sheets/:id                  - Löschen

POST   /api/setup-sheets/:id/photos           - Foto hochladen (Multipart)
PUT    /api/setup-sheets/:id/photos/:photoId  - Foto-Metadaten aktualisieren
DELETE /api/setup-sheets/:id/photos/:photoId  - Foto löschen
```

### **Features:**
```
✅ CRUD Operations (Create, Read, Update, Delete)
✅ Filter nach operation_id, machine_id, status
✅ JOIN mit operations, parts, machines, programs, customers
✅ JOIN mit program_revisions für Versionen
✅ Steuerungsspezifische Nullpunkte (Heidenhain/Siemens/Fanuc)
✅ Foto-Upload (JPG, PNG, WebP bis 20MB)
✅ Foto-Typen (CAM Screenshot, Real Photo, Fixture, Clamping, Tool Setup)
✅ Sort-Order für Fotos
✅ CASCADE Delete (Fotos werden mit gelöscht)
✅ Validation (Pflichtfelder)
✅ Error Handling (400, 404, 500)
✅ Authentication (JWT)
```

---

## 🐛 Bugs gefunden & gefixt:

### **Bug 1: Migration - Tabellenname falsch**
```
Problem: references 'nc_programs'
Lösung:  references 'programs'
```

### **Bug 2: Controller Exports fehlend**
```
Problem: Funktionen mit exports.xyz definiert, aber kein module.exports
Lösung:  module.exports am Ende hinzugefügt
```

### **Bug 3: Auth Middleware - Falscher Funktionsname**
```
Problem: const { authenticate } = require(...)
Lösung:  const { authenticateToken } = require(...)
Datei:   setupSheetsRoutes.js (9 Stellen geändert)
```

### **Bug 4-11: SQL Spaltenname-Fehler**

**Operations Tabelle:**
```
Problem: o.operation_name, o.operation_number
Lösung:  o.op_name as operation_name, o.op_number as operation_number
Stellen: 2x (getSetupSheets, getSetupSheetById)
```

**Machines Tabelle:**
```
Problem: m.machine_name, m.machine_number
Lösung:  m.name as machine_name, m.serial_number as machine_number
Stellen: 2x (getSetupSheets, getSetupSheetById)
```

**Programs Tabelle:**
```
Problem: prog.version_string, prog.file_name
Lösung:  Zusätzlicher JOIN mit program_revisions
         rev.version_string, rev.filename
Stellen: 2x (getSetupSheets, getSetupSheetById)
```

**Parts Tabelle:**
```
Problem: p.customer_name (Spalte existiert nicht)
Lösung:  Zusätzlicher JOIN mit customers
         LEFT JOIN customers c ON p.customer_id = c.id
         c.name as customer_name
Stellen: 1x (getSetupSheetById)
```

### **Bug 12: JOIN-Reihenfolge**
```
Problem: program_revisions JOIN nach users JOIN
Lösung:  Korrekte Reihenfolge:
         1. JOIN operations, parts, machines
         2. LEFT JOIN customers
         3. LEFT JOIN programs
         4. LEFT JOIN program_revisions
         5. LEFT JOIN users (created_by)
         6. LEFT JOIN users (updated_by)
```

### **Bug 13: Foreign Key Constraint**
```
Problem: Test verwendet program_id=2 (existiert nicht)
Lösung:  program_id ist optional (NULL erlaubt)
         Test angepasst oder gültige ID verwenden
```

---

## 🧪 API Tests:

**23 Testfälle in test-setup-sheets.http:**
```
✅ Test 1:  Login (Token holen)
✅ Test 2:  GET Liste (alle)
✅ Test 3:  GET Liste (filter by operation_id)
✅ Test 4:  GET Liste (filter by machine_id)
✅ Test 5:  GET Liste (filter by status)
✅ Test 6:  POST Erstellen (Minimal)
✅ Test 7:  POST Erstellen (Komplett - Heidenhain)
✅ Test 8:  POST Erstellen (Siemens)
✅ Test 9:  GET Details (mit ID)
✅ Test 10: PUT Aktualisieren
✅ Test 11: POST Foto hochladen (CAM Screenshot)
✅ Test 12: POST Foto hochladen (Real Photo)
✅ Test 13: PUT Foto-Metadaten aktualisieren
✅ Test 14: DELETE Foto löschen
✅ Test 15: PUT Status ändern (approved)
✅ Test 16: PUT Status ändern (active)
✅ Test 17: DELETE Setup Sheet löschen
✅ Test 18: POST ohne operation_id (400 Error)
✅ Test 19: POST ohne machine_id (400 Error)
✅ Test 20: GET nicht existierende ID (404)
✅ Test 21: PUT nicht existierende ID (404)
✅ Test 22: DELETE nicht existierende ID (404)
✅ Test 23: Workflow-Test (draft→review→approved→active)
```

**Alle Tests erfolgreich!** ✅

---

## 📊 Datenbank-Struktur gelernt:

### **Tatsächliche Spaltennamen:**

**operations:**
- `op_name` (nicht operation_name)
- `op_number` (nicht operation_number)
- `sequence` ✓
- `machine_id` ✓

**machines:**
- `name` (nicht machine_name)
- `serial_number` (kein machine_number)
- `manufacturer`, `model`, `machine_type`
- `control_type` ✓

**programs:**
- `program_number` ✓
- `program_name` ✓
- `operation_id` ✓
- `current_revision_id` → FK zu program_revisions

**program_revisions:**
- `program_id` → FK zu programs
- `version_string` (z.B. "1.0.0")
- `version_major`, `version_minor`, `version_patch`
- `filename` (nicht file_name)
- `filepath` (nicht file_path)

**parts:**
- `part_number` ✓
- `part_name` ✓
- `customer_id` → FK zu customers (nicht customer_name!)

**customers:**
- `name`
- `customer_number`
- `contact_person`, `email`, `phone`

---

## 📋 ROADMAP Update:

### **Phase 2: Work Instructions (Wochen 10-15)**

**Woche 10: Setup Sheets** ✅ **KOMPLETT**
```
Backend:
✅ Migration (2 Tabellen)
✅ Controller (8 Endpoints, 575 Zeilen)
✅ Routes (112 Zeilen)
✅ API Tests (23 Tests)
✅ Alle Tests erfolgreich

Frontend:
⏳ Setup Sheet Form
⏳ Foto-Upload Galerie
⏳ Setup Sheet Detail-Ansicht
⏳ Liste/Übersicht
⏳ Integration in Operation Detail Page
```

**Woche 11: Tool Lists & Inspection Plans** 📋 GEPLANT
```
Tool Lists (Werkzeugliste):
- Datenbank-Tabellen (tool_lists + tool_list_items)
- Backend CRUD API
- Frontend Form
- Spalten: T-Nr | Beschreibung | Hersteller | Bestellnr | Zusatzinfo

Inspection Plans (Messanweisung):
- Datenbank-Tabellen (inspection_plans + inspection_plan_items)
- Backend CRUD API
- Frontend Form
- Spalten: Prüfmaß | Toleranz | Min | Max | Messmittel | Anweisung
```

**Woche 12: Work Instructions Generator** 📋 GEPLANT
```
- Generator API Endpoint
- Smart Templates (Vorbefüllung)
- Auto-Fill aus vorhandenen Daten
- Wizard-UI (Step-by-Step)
- PDF-Export vorbereiten
```

---

## 📝 Nächste Schritte:

### **Sofort möglich:**

**Option A: Frontend Setup Sheets** (empfohlen)
- Setup Sheet Form
- Foto-Upload mit Drag & Drop
- Detail-Ansicht
- Integration in Operation Detail Page
- Geschätzter Aufwand: 4-6 Stunden

**Option B: Tool Lists & Inspection Plans Backend**
- 2 neue Tabellen-Paare
- CRUD APIs
- Testing
- Geschätzter Aufwand: 4-6 Stunden

**Option C: NC-Programme analysieren**
- 2 Beispiel-Programme hochladen
- Struktur analysieren (Nullpunkte, Werkzeuge)
- Vorbereitung für Parser (Woche 19)

---

## 💡 Lessons Learned:

### **Datenbank-Struktur:**
1. **Nie Spaltennamen annehmen** - immer prüfen!
2. **JOIN-Reihenfolge wichtig** - logische Abhängigkeiten beachten
3. **Foreign Keys prüfen** - gültige IDs verwenden oder NULL erlauben

### **Node.js/Express:**
1. **exports.xyz vs module.exports** - beide können kombiniert werden
2. **Middleware-Namen prüfen** - authenticate vs authenticateToken
3. **Controller-Debugging** - console.log hilft bei undefined functions

### **Debugging-Strategie:**
1. **Systematisch vorgehen** - ein Fehler nach dem anderen
2. **Error-Messages genau lesen** - Zeilennummern, Spaltennamen
3. **SQL-Hints beachten** - PostgreSQL gibt gute Hinweise
4. **Screenshots helfen** - Tabellenstruktur visuell prüfen

---

## 🎯 Abgeschlossen:

✅ **Backend Setup Sheets komplett** (08.11.2025)
- Migration
- Controller (mit allen Korrekturen)
- Routes
- DB Config
- API Tests
- ROADMAP Update
- Systematisches Debugging
- Dokumentation

**Nächster Schritt:** Frontend Setup Sheets (Woche 10 weiter) oder Tool Lists Backend (Woche 11 start)

---

## 🚀 Status:

**Phase 1 (Wochen 1-9):** ✅ 100% KOMPLETT  
**Phase 2 Woche 10:** ✅ Backend 100% | ⏳ Frontend 0%  
**Gesamtfortschritt:** ~55% (11 von 19+ Wochen)

**Nächstes Ziel:** Woche 10 Frontend oder Woche 11 Backend
