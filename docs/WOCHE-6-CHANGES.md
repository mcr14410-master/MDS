# 📋 Woche 6 - Änderungs-Übersicht

## 🆕 Neue Dateien (5)

### **1. frontend/src/stores/programsStore.js** (180 Zeilen)
- Zustand Store für Programme
- CRUD Funktionen
- Upload mit Progress Tracking
- Download Funktion

**Wichtigste Funktionen:**
```javascript
- fetchPrograms(operationId)
- uploadProgram(formData, onUploadProgress)
- updateProgram(id, programData)
- deleteProgram(id)
- downloadProgram(id, filename)
```

---

### **2. frontend/src/components/ProgramCard.jsx** (155 Zeilen)
- Card-Component für einzelne Programme
- Zeigt: Dateiname, Name, Größe, Version, Hash, Status
- Download Button
- Edit Button (wenn Berechtigung)
- Datei-Icons je nach Extension

**Features:**
- File size formatting (B/KB/MB)
- File type icons (📄 für .nc, 📋 für .iso, etc.)
- Status Badge (Entwurf/Freigegeben/In Prüfung)
- Truncated file hash display

---

### **3. frontend/src/components/ProgramUploadForm.jsx** (300 Zeilen)
- Modal für Programm-Upload
- File-Picker mit Drag & Drop UI
- Metadaten-Formular
- Upload Progress Bar
- Edit-Mode (nur Metadaten ändern)

**Features:**
- File validation
- Auto-fill program name from filename
- Progress bar während Upload
- Form validation
- Error handling

**Unterstützte Dateitypen:**
`.nc, .mpf, .cnc, .gcode, .gc, .iso, .h, .i, .din, .spf, .sub, .txt, .text, .tap`

---

### **4. frontend/src/components/ProgramsList.jsx** (135 Zeilen)
- Liste aller Programme eines Arbeitsgangs
- Upload Button
- Empty State wenn keine Programme
- Grid Layout (3 Spalten auf Desktop)

**Features:**
- Loading State
- Error Handling
- Permission-based UI
- Auto-refresh nach Upload/Edit/Delete

---

### **5. frontend/src/pages/OperationDetailPage.jsx** (250 Zeilen)
- Neue Page für Operation-Details
- Breadcrumb Navigation
- Operation Info Header
- Tab-System (Programme / Werkzeuge / Einrichteblatt)
- ProgramsList Integration

**Features:**
- URL: `/parts/:partId/operations/:operationId`
- Breadcrumb: Bauteile → Teil → Operation
- Operation Details (OP-Nummer, Name, Maschine, Zeiten)
- Tab-Navigation
- Placeholder für zukünftige Tabs

---

## ✏️ Geänderte Dateien (4)

### **1. frontend/src/config/api.js**
**Änderung:** PROGRAMS Endpoint hinzugefügt
```javascript
// Neu:
PROGRAMS: `${API_BASE_URL}/api/programs`,
```

---

### **2. frontend/src/components/OperationCard.jsx**
**Änderungen:**
1. Import: `useNavigate` von react-router-dom
2. Prop hinzugefügt: `partId`
3. Card klickbar gemacht:
   - `cursor-pointer` CSS
   - `onClick={handleCardClick}`
   - Navigate zu `/parts/${partId}/operations/${operation.id}`
4. Edit/Delete Buttons mit `stopPropagation()`

**Neue Zeilen:**
```javascript
// Zeile 2: Import useNavigate
import { useNavigate } from 'react-router-dom';

// Zeile 5: partId prop
export default function OperationCard({ operation, onEdit, onDelete, partId }) {

// Zeile 7: useNavigate hook
const navigate = useNavigate();

// Zeile 9-11: handleCardClick
const handleCardClick = () => {
  navigate(`/parts/${partId}/operations/${operation.id}`);
};

// Zeile 13-21: handleEdit & handleDelete mit stopPropagation
const handleEdit = (e) => {
  e.stopPropagation();
  onEdit(operation);
};

const handleDelete = (e) => {
  e.stopPropagation();
  onDelete(operation);
};

// Zeile 36: cursor-pointer + onClick
<div 
  className="...cursor-pointer"
  onClick={handleCardClick}
>
```

---

### **3. frontend/src/components/OperationsList.jsx**
**Änderung:** `partId` an OperationCard übergeben

**Geänderte Zeile (122-128):**
```javascript
// Alt:
<OperationCard
  key={operation.id}
  operation={operation}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// Neu:
<OperationCard
  key={operation.id}
  operation={operation}
  partId={partId}  // ← NEU
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

---

### **4. frontend/src/App.jsx**
**Änderungen:**
1. Import: `OperationDetailPage`
2. Route hinzugefügt für Operation Detail

**Neue Zeilen:**
```javascript
// Zeile 11: Import
import OperationDetailPage from './pages/OperationDetailPage';

// Zeile 89-97: Neue Route (nach parts/:id/edit)
{/* Operation Detail Route */}
<Route 
  path="/parts/:partId/operations/:operationId" 
  element={
    <ProtectedRoute requiredPermission="part.read">
      <OperationDetailPage />
    </ProtectedRoute>
  } 
/>
```

---

## 🔗 Zusammenhang der Components

```
App.jsx
  └─ Route: /parts/:partId/operations/:operationId
       └─ OperationDetailPage
            ├─ Breadcrumb (Link zurück zu Part)
            ├─ Operation Header (Details)
            └─ Tab: Programme
                 └─ ProgramsList
                      ├─ Header + Upload Button
                      └─ Grid of ProgramCards
                           ├─ ProgramCard (Download, Edit)
                           └─ ProgramUploadForm (Modal)

PartDetailPage
  └─ Tab: Arbeitsgänge
       └─ OperationsList
            └─ OperationCard (klickbar)
                 → Navigate to OperationDetailPage
```

---

## 📡 Backend API (bereits fertig)

Keine Backend-Änderungen nötig - alles fertig seit letzter Session!

**Endpoints:**
```
POST   /api/programs              # Upload
GET    /api/programs?operation_id # List
GET    /api/programs/:id          # Details
GET    /api/programs/:id/download # Download
PUT    /api/programs/:id          # Update
DELETE /api/programs/:id          # Delete
```

---

## 🎨 UI/UX Features

### **Design-Entscheidungen:**
- ✅ Programme sind pro Operation organisiert
- ✅ Separate Detail Page (statt expandierbare Cards)
- ✅ Tab-System für zukünftige Erweiterungen
- ✅ Breadcrumb Navigation
- ✅ Empty States mit Call-to-Action
- ✅ Loading States mit Spinner
- ✅ Error States mit Error Messages
- ✅ Permission-based UI (Buttons nur wenn Berechtigung)

### **Interaktionen:**
- Click auf Operation Card → Navigate zu Detail Page
- Click auf "Programm hochladen" → Upload Modal
- Click auf Download Icon → File Download
- Click auf Edit Icon → Edit Modal (nur Metadaten)
- Upload mit Progress Bar
- Auto-refresh nach CRUD Operations

---

## 📊 Code-Statistik

**Neue Zeilen Code:**
```
programsStore.js:           180 Zeilen
ProgramCard.jsx:            155 Zeilen
ProgramUploadForm.jsx:      300 Zeilen
ProgramsList.jsx:           135 Zeilen
OperationDetailPage.jsx:    250 Zeilen
─────────────────────────────────────
Gesamt neu:                1020 Zeilen

Geändert:                    20 Zeilen
─────────────────────────────────────
TOTAL:                     1040 Zeilen
```

**Dateien:**
```
Neu:        5 Dateien
Geändert:   4 Dateien
─────────────────────
TOTAL:      9 Dateien
```

---

## ✅ Ready for Testing!

Alles ist bereit zum Testen. Siehe **WOCHE-6-INSTALL.md** für Anweisungen! 🚀
