# Inspection Plans - Toleranzarten

## Übersicht

Das Inspection Plans Modul unterstützt vier verschiedene Toleranzarten für die Qualitätskontrolle in der CNC-Fertigung:

1. **Manuell** - Freie Abmaß-Eingabe
2. **ISO 286** - Passtoleranz (Bohrungen/Wellen)
3. **ISO 2768** - Allgemeintoleranzen
4. **Form-/Lagetoleranz** - Ebenheit, Rundheit, Parallelität, etc.

---

## 1. Manuell - Abmaß-Eingabe

**Anwendung:** Maßtoleranzen wie in technischen Zeichnungen

### Eingabe:
```
Sollmaß: 10.0
Oberes Abmaß: +0.1
Unteres Abmaß: -0.1
```

### Berechnung:
```
Max = Sollmaß + Oberes Abmaß = 10.0 + 0.1 = 10.1
Min = Sollmaß + Unteres Abmaß = 10.0 + (-0.1) = 9.9
Mittelwert = (Min + Max) / 2 = 10.0
Toleranz = "+0.100/-0.100"
```

### Beispiele:

#### Symmetrische Toleranz
```
Sollmaß: 50.0
Oberes Abmaß: +0.05
Unteres Abmaß: -0.05
→ Min: 49.95, Mittel: 50.0, Max: 50.05
```

#### Asymmetrische Toleranz
```
Sollmaß: 25.0
Oberes Abmaß: +0.2
Unteres Abmaß: -0.05
→ Min: 24.95, Mittel: 25.075, Max: 25.2
```

#### Nur positive Abmaße (Bohrung)
```
Sollmaß: 10.0
Oberes Abmaß: +0.015
Unteres Abmaß: 0
→ Min: 10.0, Mittel: 10.0075, Max: 10.015
```

#### Nur negative Abmaße (Welle)
```
Sollmaß: 10.0
Oberes Abmaß: 0
Unteres Abmaß: -0.015
→ Min: 9.985, Mittel: 9.9925, Max: 10.0
```

---

## 2. ISO 286 - Passtoleranz

**Anwendung:** Passungen zwischen Bohrung und Welle

### Unterstützte Klassen:
**Bohrungen (Großbuchstaben):**
- H7, H8, H9, H11 (Grundtoleranz)
- F6, F7, G6, G7 (Übermaß)

**Wellen (Kleinbuchstaben):**
- h7, h8, h9, h11 (Grundtoleranz)
- f6, f7, g6, g7 (Untermaß)

### IT-Wert Berechnung:
```
IT = 0.45 * ∛D + 0.001 * D
Wobei: D = geometrisches Mittel des Maßbereichs
```

### Maßbereiche:
```
3-6 mm, 6-10 mm, 10-18 mm, 18-30 mm, 30-50 mm, 
50-80 mm, 80-120 mm, 120-180 mm, 180-250 mm, 250-315 mm, 
315-400 mm, 400-500 mm
```

### Beispiel H7:
```
Sollmaß: 25.0 mm (Maßbereich 18-30 mm)
D = √(18 * 30) = 23.24 mm
IT7 = 16 * (0.45 * ∛23.24 + 0.001 * 23.24) = 21 μm
Oberes Abmaß: +21 μm = +0.021 mm
Unteres Abmaß: 0 mm
→ Min: 25.0, Mittel: 25.0105, Max: 25.021
→ Toleranz: "H7 (+0.021/0)"
```

### Beispiel h7:
```
Sollmaß: 25.0 mm
IT7 = 21 μm
Oberes Abmaß: 0 mm
Unteres Abmaß: -21 μm = -0.021 mm
→ Min: 24.979, Mittel: 24.9895, Max: 25.0
→ Toleranz: "h7 (0/-0.021)"
```

---

## 3. ISO 2768 - Allgemeintoleranzen

**Anwendung:** Nicht tolerierte Maße auf Zeichnungen

### Toleranzklassen:
- **f (fein)** - Feinwerktechnik
- **m (mittel)** - Normaler Maschinenbau (Standard)
- **c (grob)** - Grobbearbeitung
- **v (sehr grob)** - Rohteilbearbeitung

### Toleranztabelle:

| Maßbereich | f | m | c | v |
|------------|---|---|---|---|
| 0.5-3 mm | ±0.05 | ±0.1 | ±0.2 | - |
| 3-6 mm | ±0.05 | ±0.1 | ±0.3 | ±0.5 |
| 6-30 mm | ±0.1 | ±0.2 | ±0.5 | ±1.0 |
| 30-120 mm | ±0.15 | ±0.3 | ±0.8 | ±1.5 |
| 120-400 mm | ±0.2 | ±0.5 | ±1.2 | ±2.5 |
| 400-1000 mm | ±0.3 | ±0.8 | ±2.0 | ±4.0 |

### Beispiel ISO2768-m:
```
Sollmaß: 50.0 mm (Maßbereich 30-120 mm)
Toleranz: ±0.3 mm
→ Min: 49.7, Mittel: 50.0, Max: 50.3
→ Toleranz: "ISO2768-m (±0.3)"
```

---

## 4. Form-/Lagetoleranz

**Anwendung:** Ebenheit, Rundheit, Parallelität, Rechtwinkligkeit, Konzentrizität, etc.

### Besonderheit:
Form- und Lagetoleranzen haben **kein Sollmaß**, sondern nur einen **Maximalwert**.

### Beispiele:

#### Ebenheit
```
Maß/Merkmal: Ebenheit Oberfläche A
Toleranzwert: 0.2 mm
→ Nur Max: 0.2
→ Keine Min/Mittel-Werte
→ Toleranz: "0.2"
```

#### Rundheit
```
Maß/Merkmal: Rundheit Durchmesser Ø50
Toleranzwert: 0.05 mm
→ Nur Max: 0.05
→ Toleranz: "0.05"
```

#### Parallelität
```
Maß/Merkmal: Parallelität Fläche B zu A
Toleranzwert: 0.1 mm
→ Nur Max: 0.1
→ Toleranz: "0.1"
```

### Backend-Speicherung:
```javascript
{
  nominal_value: null,    // Kein Sollmaß!
  min_value: null,        // Kein Min
  mean_value: null,       // Kein Mittelwert
  max_value: 0.2,         // Toleranzwert
  tolerance: "0.2"        // Toleranz-String
}
```

### UI-Unterschiede:

**Maßtoleranz (Manuell/ISO 286/ISO 2768):**
```
Durchmesser Bohrung
Sollmaß: 10.0 • +0.100/-0.100
Min: 9.9 | Mittel: 10.0 | Max: 10.1
```

**Form-/Lagetoleranz:**
```
Ebenheit Oberfläche A
Toleranz: 0.2
Maximalwert: 0.2
```

---

## Automatische Erkennung beim Bearbeiten

Das System erkennt beim Bearbeiten automatisch den Toleranz-Typ:

### Logik:
```javascript
if (!item.nominal_value && item.max_value) {
  // Form-/Lagetoleranz
  toleranceMode = 'form_position'
} else if (item.nominal_value && item.max_value && item.min_value) {
  // Maßtoleranz mit Abmaßen
  toleranceMode = 'manual'
  // Abmaße zurückrechnen:
  upper = max - nominal
  lower = min - nominal
}
```

### Beispiele:

**Gespeichert:** 
```
nominal_value: null, max_value: 0.2
```
**Beim Bearbeiten:**
- Modus "Form-/Lagetoleranz" wird automatisch aktiviert ✅
- Sollmaß-Feld ausgeblendet ✅
- Toleranzwert befüllt: 0.2 ✅

**Gespeichert:**
```
nominal_value: 25, min_value: 24.9, max_value: 25.1
```
**Beim Bearbeiten:**
- Modus "Manuell" wird automatisch aktiviert ✅
- Oberes Abmaß: +0.1 (25.1 - 25) ✅
- Unteres Abmaß: -0.1 (24.9 - 25) ✅

---

## Design-Prinzipien

### 1. Min/Max/Mittelwert immer gesperrt
In **ALLEN** Modi sind die berechneten Werte read-only (disabled).

**Grund:** 
- Verhindert Inkonsistenzen
- Klare Datenquelle (berechnet vs. eingegeben)
- User kann nicht versehentlich falsche Werte eingeben

### 2. Bedingtes Field-Rendering
Nicht benötigte Felder werden **ausgeblendet**, nicht nur deaktiviert.

**Beispiel Form-/Lagetoleranz:**
- Sollmaß-Feld: ❌ ausgeblendet
- Abmaß-Felder: ❌ ausgeblendet
- Min/Mittel-Felder: ❌ ausgeblendet
- Nur Toleranzwert: ✅ sichtbar

**Grund:**
- Cleaner UI
- Weniger visuelle Ablenkung
- Fokus auf relevante Felder

### 3. Null-Werte im Backend
Nicht verwendete Felder werden als `null` gespeichert, **nicht** als `0` oder leerer String.

**Grund:**
- Klare Unterscheidung "nicht vorhanden" vs. "Wert = 0"
- Datenbankintegrität
- Einfachere Abfragen

---

## Technische Implementierung

### State Management
```javascript
const [toleranceMode, setToleranceMode] = useState('manual');
// Werte: 'manual', 'iso286', 'iso2768', 'form_position'

// Nur für Manual-Modus:
const [upperDeviation, setUpperDeviation] = useState('');
const [lowerDeviation, setLowerDeviation] = useState('');
```

### Auto-Berechnungen

**Manual-Modus:**
```javascript
useEffect(() => {
  if (toleranceMode === 'manual' && formData.nominal_value) {
    const nominal = parseFloat(formData.nominal_value);
    const upper = parseFloat(upperDeviation) || 0;
    const lower = parseFloat(lowerDeviation) || 0;
    
    const max = nominal + upper;
    const min = nominal + lower;
    const mean = (min + max) / 2;
    
    // Update formData...
  }
}, [toleranceMode, formData.nominal_value, upperDeviation, lowerDeviation]);
```

**Form-/Lage-Modus:**
```javascript
useEffect(() => {
  if (toleranceMode === 'form_position') {
    // Clear nominal, min, mean
    setFormData(prev => ({
      ...prev,
      nominal_value: '',
      min_value: '',
      mean_value: ''
    }));
  }
}, [toleranceMode]);
```

---

## Best Practices

### Wann welche Toleranzart verwenden?

#### Manuell
- ✅ Sondermaße mit spezifischen Abmaßen
- ✅ Asymmetrische Toleranzen
- ✅ Wenn ISO 286/2768 nicht passt

#### ISO 286
- ✅ Passungen (Bohrung/Welle)
- ✅ Standardmaße mit definierten Toleranzklassen
- ✅ Austauschbare Teile

#### ISO 2768
- ✅ Nicht tolerierte Maße auf Zeichnung
- ✅ Allgemeine Werkstattgenauigkeit
- ✅ Schnelle Toleranzzuweisung

#### Form-/Lagetoleranz
- ✅ Ebenheit von Flächen
- ✅ Rundheit von Bohrungen/Wellen
- ✅ Parallelität, Rechtwinkligkeit
- ✅ Konzentrizität, Koaxialität
- ✅ Positionstoleranzen

---

## Prüfprotokoll-Verwendung

### Maßtoleranz (Messwerte zwischen Min und Max)
```
Sollmaß: 25.0 • +0.100/-0.100
Min: 24.9 | Mittel: 25.0 | Max: 25.1

Gemessene Werte: 24.95, 25.02, 24.98, 25.01
→ Alle im Toleranzbereich ✅
```

### Form-/Lagetoleranz (Messwert ≤ Max)
```
Ebenheit Oberfläche A
Maximalwert: 0.2

Gemessener Wert: 0.15 mm
→ Im Toleranzbereich ✅ (0.15 < 0.2)
```

---

## Zukünftige Erweiterungen

### Mögliche Features:
1. **Toleranz-Symbole:** ⊥ ∥ ⌭ ⊕ ◎ für Form-/Lagetoleranzen
2. **Bezugssystem:** Bezugselemente für Lagetoleranzen (A, B, C)
3. **Toleranz-Vorlagen:** Häufig verwendete Toleranzen speichern
4. **GD&T Integration:** Vollständige ISO 1101 Unterstützung
5. **3D-Visualisierung:** Toleranzen am 3D-Modell visualisieren

---

## Zusammenfassung

Das Inspection Plans Modul bietet **vollständige Unterstützung** für:

✅ **4 Toleranzarten** - Abdeckt alle Anwendungsfälle
✅ **ISO-konform** - ISO 286, ISO 2768 korrekt implementiert
✅ **Intuitive UI** - Bedingtes Rendering, klare Strukturen
✅ **Automatisiert** - Auto-Berechnungen, Erkennung beim Bearbeiten
✅ **Flexibel** - Von Feinwerktechnik bis Grobbearbeitung
✅ **Luftfahrt-ready** - Audit-Trails, vollständige Dokumentation

**Perfekt für:**
- CNC-Fertigung
- Luft- und Raumfahrt (EN 9100)
- Qualitätskontrolle (ISO 9001)
- Technische Dokumentation
