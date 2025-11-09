# MDS Projekt - Session Übergabe
**Datum:** 2025-11-09
**Status:** Week 12 - Inspection Plans mit Toleranzberechnung
**Nächste Aufgabe:** Manuelles Abmaß-Feature implementieren

---

## 📍 Aktueller Stand

### ✅ Was ist fertig (GETESTET & FUNKTIONIERT)

1. **Week 12 - Inspection Plans Basis**
   - Backend komplett (Migration, Controller, Routes)
   - Frontend Store (inspectionPlansStore.js)
   - Haupt-Komponente (InspectionPlanTab.jsx)
   - Read-Only Komponente (InspectionPlanReadOnly.jsx)
   - Integration in OperationDetailPage.jsx
   - Tab-Reihenfolge: Programme → Werkzeuge → Einrichteblatt → **Prüfplan** → Historie

2. **ISO 286 Toleranzberechnung** ✅
   - 16 Toleranzklassen: H7, H8, H9, H11, F6, F7, G6, G7, h7, h8, h9, h11, f6, f7, g6, g7
   - Automatische IT-Wert Berechnung basierend auf Maßbereich
   - Grundabmaße für F, G, f, g
   - Format: "H7 (+0.015/0)"
   - Min/Max/Mittelwert werden berechnet und gesperrt 🔒

3. **ISO 2768 Allgemeintoleranzen** ✅
   - 4 Klassen: f (fein), m (mittel), c (grob), v (sehr grob)
   - Automatische Maßbereich-Erkennung
   - Format: "ISO2768-m (±0.2)"
   - Min/Max/Mittelwert werden berechnet und gesperrt 🔒

4. **mean_value Datenbankspalte** ✅
   - Migration: 1737000011000_add-mean-value-to-inspection-items.js
   - Trennung: nominal_value (Eingabe) vs. mean_value (berechnet)
   - Backend Controller aktualisiert
   - Frontend zeigt mean_value korrekt

### 🚧 Was ist IN ARBEIT

**Manuelles Abmaß-Feature** (noch NICHT implementiert)

**Anforderung vom User:**
```
User möchte eingeben:
- Sollmaß: 10.0
- Oberes Abmaß: +0.1
- Unteres Abmaß: -0.1

System soll berechnen:
- Max: 10.1 (10.0 + 0.1) 🔒
- Mittelwert: 10.0 🔒
- Min: 9.9 (10.0 - 0.1) 🔒
- Toleranz: "+0.1/-0.1"
```

**Wichtig:** Min/Max/Mittelwert sollen IMMER gesperrt sein, in ALLEN 3 Modi!

---

## 📂 Dateistruktur & Status

### Backend (bereits deployed)
```
backend/
├── migrations/
│   ├── 1737000010000_create-inspection-plans.js ✅
│   └── 1737000011000_add-mean-value-to-inspection-items.js ✅
├── src/
│   ├── controllers/
│   │   └── inspectionPlansController.js ✅
│   └── routes/
│       └── inspectionPlansRoutes.js ✅
└── test-inspection-plans.http ✅
```

### Frontend (bereits deployed)
```
frontend/src/
├── stores/
│   └── inspectionPlansStore.js ✅
├── components/
│   ├── InspectionPlanTab.jsx ✅ (muss aktualisiert werden!)
│   └── InspectionPlanReadOnly.jsx ✅
├── pages/
│   └── OperationDetailPage.jsx ✅
├── config/
│   └── api.js ✅
└── utils/
    └── toleranceCalculator.js ✅
```

---

## 🎯 Nächste Aufgabe: Manuelles Abmaß implementieren

### Was muss geändert werden

**Nur 1 Datei:** `frontend/src/components/InspectionPlanTab.jsx`

### Änderungen im Detail

#### 1. State erweitern
```javascript
// NEU: Abmaß-Felder für manuellen Modus
const [upperDeviation, setUpperDeviation] = useState(''); // Oberes Abmaß (+0.1)
const [lowerDeviation, setLowerDeviation] = useState(''); // Unteres Abmaß (-0.1)
```

#### 2. Auto-Berechnung für Manuell
```javascript
useEffect(() => {
  if (toleranceMode === 'manual' && formData.nominal_value) {
    const nominal = parseFloat(formData.nominal_value);
    const upper = parseFloat(upperDeviation) || 0;
    const lower = parseFloat(lowerDeviation) || 0;
    
    if (!isNaN(nominal)) {
      const max = nominal + upper;
      const min = nominal + lower; // lower ist negativ!
      const mean = (min + max) / 2;
      const tolerance = `+${upper.toFixed(3)}/${lower >= 0 ? '+' : ''}${lower.toFixed(3)}`;
      
      setFormData(prev => ({
        ...prev,
        tolerance,
        min_value: min.toString(),
        mean_value: mean.toString(),
        max_value: max.toString()
      }));
    }
  }
}, [toleranceMode, formData.nominal_value, upperDeviation, lowerDeviation]);
```

#### 3. UI anpassen - Manuell Block
```javascript
{/* Manual */}
<div className="flex items-start gap-3">
  <input
    type="radio"
    id="tolerance-manual"
    checked={toleranceMode === 'manual'}
    onChange={() => setToleranceMode('manual')}
    className="mt-1"
  />
  <div className="flex-1">
    <label htmlFor="tolerance-manual" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
      Manuell
    </label>
    {toleranceMode === 'manual' && (
      <div className="mt-2 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Oberes Abmaß
            </label>
            <input
              type="number"
              step="0.001"
              value={upperDeviation}
              onChange={(e) => setUpperDeviation(e.target.value)}
              placeholder="+0.1"
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
              Unteres Abmaß
            </label>
            <input
              type="number"
              step="0.001"
              value={lowerDeviation}
              onChange={(e) => setLowerDeviation(e.target.value)}
              placeholder="-0.1"
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm
                       focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Calculated Tolerance Display */}
        {formData.tolerance && (
          <div className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">Berechnet:</span>
            <div className="font-mono text-sm text-gray-900 dark:text-white mt-1">
              {formData.tolerance}
            </div>
          </div>
        )}
      </div>
    )}
  </div>
</div>
```

#### 4. Min/Max/Mittel IMMER gesperrt
```javascript
<input
  type="number"
  value={formData.min_value}
  disabled={true}  // IMMER gesperrt, in ALLEN Modi!
  className="...disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
/>
```

#### 5. resetForm erweitern
```javascript
const resetForm = () => {
  setFormData({...});
  setUpperDeviation('');
  setLowerDeviation('');
  setToleranceMode('manual');
  // ...
};
```

---

## 🧪 Test-Szenarien für Manuell

### Test 1: Symmetrische Toleranz
```
Sollmaß: 10.0
Oberes Abmaß: +0.1
Unteres Abmaß: -0.1

Erwartung:
✓ Min: 9.9
✓ Mittelwert: 10.0
✓ Max: 10.1
✓ Toleranz: "+0.100/-0.100"
✓ Alle Felder gesperrt 🔒
```

### Test 2: Asymmetrische Toleranz
```
Sollmaß: 50.0
Oberes Abmaß: +0.2
Unteres Abmaß: -0.05

Erwartung:
✓ Min: 49.95
✓ Mittelwert: 50.075
✓ Max: 50.2
✓ Toleranz: "+0.200/-0.050"
```

### Test 3: Nur positive Abmaße (Bohrung)
```
Sollmaß: 10.0
Oberes Abmaß: +0.015
Unteres Abmaß: 0

Erwartung:
✓ Min: 10.0
✓ Mittelwert: 10.0075
✓ Max: 10.015
✓ Toleranz: "+0.015/0.000"
```

### Test 4: Nur negative Abmaße (Welle)
```
Sollmaß: 10.0
Oberes Abmaß: 0
Unteres Abmaß: -0.015

Erwartung:
✓ Min: 9.985
✓ Mittelwert: 9.9925
✓ Max: 10.0
✓ Toleranz: "0.000/-0.015"
```

---

## 📋 Wichtige Hinweise für nächsten Chat

### User-Präferenzen
- ✅ Nur neue/geänderte Dateien bereitstellen
- ✅ Bei kleinen Änderungen nur betroffene Zeilen zeigen
- ✅ Problem → Optionen → Fragen → Dann Code
- ✅ Keine kompletten ZIP-Archive

### Projekt-Kontext
- **Fertigungsleiter** mit CNC-Kenntnissen, kein IT-Profi
- **Luft-/Raumfahrt Zertifizierung** (Audit-Trails wichtig)
- **3 Hilfskräfte** nutzen das System
- **TopSolid CAM** im Einsatz
- **Heidenhain TNC, Siemens, Mazatrol** Steuerungen

### Tech-Stack
- Backend: Node.js + Express + PostgreSQL
- Frontend: React 19 + Vite + TailwindCSS + Zustand
- Deployment: Docker auf Raspberry Pi

### Arbeitsweise
- **Incremental Development** (wöchentliche Phasen)
- **Testing vor Fortschritt** (sehr wichtig!)
- **Dokumentation für Archiv** (Session-Docs, Git-Messages)
- **Dark Theme** überall

---

## 🎯 Konkrete Aufgabe für nächsten Chat

**Ziel:** Manuelles Abmaß-Feature implementieren

**Schritte:**
1. `InspectionPlanTab.jsx` öffnen
2. Änderungen wie oben beschrieben durchführen
3. Nur die aktualisierte Datei bereitstellen
4. Test-Anweisungen geben

**Erwartetes Ergebnis:**
```
User kann eingeben:
- Sollmaß: 10.0
- Oberes Abmaß: +0.1
- Unteres Abmaß: -0.1

System berechnet:
- Max: 10.1 🔒
- Mittelwert: 10.0 🔒
- Min: 9.9 🔒
- Toleranz: "+0.1/-0.1"

Min/Max/Mittel sind in ALLEN 3 Modi gesperrt!
```

---

## 📚 Referenz-Dateien im Output

Alle aktuellen Dateien sind in `/mnt/user-data/outputs/`:

### Komplett & Aktuell
- `InspectionPlanTab.jsx` (29 KB) - **MUSS AKTUALISIERT WERDEN**
- `InspectionPlanReadOnly.jsx` (6.1 KB) - ✅ fertig
- `inspectionPlansController.js` (11 KB) - ✅ fertig
- `inspectionPlansStore.js` (6.0 KB) - ✅ fertig
- `toleranceCalculator.js` (7.8 KB) - ✅ fertig
- `1737000011000_add-mean-value-to-inspection-items.js` (748 B) - ✅ deployed

### Dokumentation
- `README_MEAN_VALUE_COLUMN.md` - mean_value Spalte erklärt
- `README_TOLERANCE_UPDATE.md` - ISO-Toleranzen erklärt
- `README_WEEK12_FRONTEND.md` - Week 12 Übersicht
- `SESSION_WEEK12_FRONTEND.md` - Session-Dokumentation

---

## ⚠️ Wichtige Erinnerungen

1. **Database Migration bereits ausgeführt?**
   - Falls nicht: `npm run migrate up` im Backend

2. **Alle Modi (Manuell/ISO286/ISO2768):**
   - Min/Max/Mittelwert IMMER gesperrt (disabled)
   - Nur Eingabefelder sind editierbar

3. **Toleranz-String Format:**
   - Manuell: "+0.100/-0.100"
   - ISO 286: "H7 (+0.015/0)"
   - ISO 2768: "ISO2768-m (±0.2)"

4. **User testet sehr gründlich:**
   - Verschiedene Sollmaße
   - Symmetrische & asymmetrische Toleranzen
   - Positive/negative Abmaße

---

## 🚀 Quick Start für nächsten Chat

```
Hi Claude! Bitte lies diese Übergabe-Datei:
HANDOVER_WEEK12_MANUAL_DEVIATION.md

Aufgabe: Manuelles Abmaß-Feature in InspectionPlanTab.jsx implementieren.

User möchte eingeben können:
- Oberes Abmaß: +0.1
- Unteres Abmaß: -0.1

System soll Min/Max/Mittel automatisch berechnen und sperren.

Kannst du die aktualisierte InspectionPlanTab.jsx erstellen?
```

---

**Status:** ✅ Übergabe-Dokument vollständig
**Nächster Schritt:** Manuelles Abmaß implementieren
**Geschätzter Aufwand:** ~30 Minuten (1 Datei ändern)
