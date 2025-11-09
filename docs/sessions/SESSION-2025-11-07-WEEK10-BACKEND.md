# Session 2025-11-07 - Woche 10 START: Setup Sheets Backend

**Datum:** 07.11.2025  
**Dauer:** ~2 Stunden  
**Status:** ✅ Backend KOMPLETT

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
│   │   └── setupSheetsController.js             (NEU - 520 Zeilen)
│   ├── routes/
│   │   └── setupSheetsRoutes.js                 (NEU - 85 Zeilen)
│   └── server.js                                (GEÄNDERT - 2 Zeilen)
├── uploads/
│   └── setup-sheets/                            (NEU - Ordner)
└── test-setup-sheets.http                       (NEU - 380 Zeilen)
```

**Backend:** ~1220 Zeilen neuer Code  
**ROADMAP:** Komplett umstrukturiert (Phase 2-4)

---

## 🗄️ Datenbank-Schema:

### **Tabelle: setup_sheets**
```sql
- id (PK)
- operation_id (FK → operations) - CASCADE
- machine_id (FK → machines) - RESTRICT
- program_id (FK → nc_programs) - SET NULL

-- Asset Relations (später)
- fixture_id (später FK)
- clamping_device_id (später FK)
- fixture_description (Freitext temporär)
- clamping_description (Freitext temporär)

-- Nullpunkt (steuerungsspezifisch)
- control_type (heidenhain, siemens, fanuc, haas, mazatrol)
- preset_number (Heidenhain: 1-99)
- wcs_number (Fanuc/Siemens: G54-G59)
- wcs_x, wcs_y, wcs_z
- reference_point (Text)

-- Material
- raw_material_dimensions (z.B. "100x50x20")
- material_specification (z.B. "AlMgSi1 F22")

-- Anweisungen
- setup_instructions (TEXT)
- special_notes (TEXT - Warnungen)

-- Workflow
- status (draft, review, approved, active, archived)
- version_number (vorerst einfach)

-- Audit
- created_by, updated_by
- created_at, updated_at
```

### **Tabelle: setup_sheet_photos**
```sql
- id (PK)
- setup_sheet_id (FK → setup_sheets) - CASCADE
- file_path, file_name, file_size, mime_type
- caption (Beschreibung)
- photo_type (general, cam_screenshot, real_photo, fixture, clamping, tool_setup)
- sort_order
- uploaded_by, uploaded_at
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
✅ JOIN mit operations, parts, machines, programs
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

## 📋 ROADMAP Umstrukturierung:

### **Phase 2: Work Instructions (Wochen 10-15)**
```
Woche 10: Setup Sheets (Backend + Frontend) ✅ Backend KOMPLETT
Woche 11: Tool Lists & Inspection Plans
Woche 12: Work Instructions Generator
Woche 13: Spannmittel-Verwaltung
Woche 14: Vorrichtungs-Verwaltung
Woche 15: Integration & Testing
```

### **Phase 3: Advanced Asset Management (Wochen 16-19)**
```
Woche 16-17: Werkzeugverwaltung
Woche 18: Messmittelverwaltung
Woche 19: Parser & Automation (NC-Programm Parser)
```

### **Phase 4: Shopfloor & Advanced (ab Woche 20)**
```
QR-Codes & CAM-Integration
Shopfloor-UI
Wartungssystem
```

---

## 🧪 API Tests:

**23 Testfälle in test-setup-sheets.http:**
```
✅ CRUD Tests (GET, POST, PUT, DELETE)
✅ Filter-Tests (operation_id, machine_id, status)
✅ Foto-Upload (Multipart)
✅ Foto-Metadaten Update
✅ Foto Delete
✅ Status-Workflow (draft → review → approved → active)
✅ Fehler-Tests (400, 404)
✅ Realistische Szenarien (Heidenhain, Siemens)
```

---

## 📝 Nächste Schritte:

### **Diese Woche (Woche 10):**
1. ✅ Backend Setup Sheets (KOMPLETT)
2. ⏳ Frontend Setup Sheets (TODO)
   - Setup Sheet Form
   - Foto-Upload Galerie (Drag & Drop)
   - Setup Sheet Detail-Ansicht
   - Liste/Übersicht
   - Integration in Operation Detail Page

### **Nächste Woche (Woche 11):**
- Tool Lists Backend + Frontend
- Inspection Plans Backend + Frontend

---

## 🐛 Bekannte Einschränkungen:

- **Versionierung:** Vorerst ohne (kann später erweitert werden)
- **Workflow-Integration:** Status als einfaches Feld (noch nicht mit workflow-System verknüpft)
- **Asset-Relations:** fixture_id/clamping_device_id vorerst NULL (Freitext als Übergang)
- **PDF-Export:** Noch nicht implementiert (kommt später)

---

## 💡 Design-Entscheidungen:

### **Steuerungsspezifische Nullpunkte:**
- Heidenhain: `preset_number` (1-99)
- Siemens/Fanuc: `wcs_number` (G54-G59)
- Beide: `wcs_x, wcs_y, wcs_z` + `reference_point`
- `control_type` Feld für Identifikation

### **Temporäre Freitext-Felder:**
- `fixture_description` und `clamping_description` als Übergang
- Später durch FK zu `fixtures` und `clamping_devices` ersetzen

### **Foto-Typen:**
- `general`: Allgemeines Foto
- `cam_screenshot`: Screenshot aus CAM
- `real_photo`: Reales Foto an Maschine
- `fixture`: Vorrichtungs-Foto
- `clamping`: Spannmittel-Foto
- `tool_setup`: Werkzeug-Setup Foto

---

## 🎯 Abgeschlossen:

✅ **Backend Setup Sheets komplett** (07.11.2025)
- Migration
- Controller
- Routes
- DB Config
- API Tests
- ROADMAP Update

**Nächster Schritt:** Frontend Setup Sheets (nächste Session)
