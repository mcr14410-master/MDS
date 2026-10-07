# Tool Management System - Quick Reference

**Version:** 2.0 Final  
**Datum:** 2025-11-12  
**Status:** ✅ Roadmap komplett - Bereit für Implementierung

---

## 🎯 Kern-Konzept

**Bestandsverwaltung nach Zustand:**
- Werkzeuge werden NICHT einzeln getrackt (keine Individual-IDs)
- Bestand wird nach Zustand gruppiert: **Neu / Gebraucht / Nachgeschliffen**
- Gewichtete Low-Stock Berechnung: neu=1.0, reground=0.8, used=0.5

**Beispiel:**
```
Werkzeug: 10mm Schaftfräser
Lagerort: WZ-01, Fach 3

Bestand:
  5 neu          (100% wert = 5.0)
  3 gebraucht    ( 50% wert = 1.5)
  2 nachgeschl.  ( 80% wert = 1.6)
  ─────────────────────────────
  10 gesamt      8.1 effektiv

Reorder Point: 6
Status: ✓ OK (8.1 > 6)
```

---

## 📊 Datenbank - 13 neue Tabellen

### Kern-Tabellen:
1. **storage_locations** - Schränke/Regale (Level 1)
2. **storage_compartments** - Fächer/Schubladen (Level 2)
3. **storage_items** - Bestand mit 3 Quantity-Feldern + Gewichtung
4. **tool_master** - Stammdaten mit Custom Fields (JSONB)
5. **stock_movements** - Historie mit Condition-Tracking

### Erweiterungen:
6. **tool_categories** - Erweiterbare Kategorien
7. **tool_subcategories** - Erweiterbare Unter-Kategorien
8. **tool_compatible_inserts** - Wendeschneidplatten (Many-to-Many)
9. **tool_documents** - Fotos, Zeichnungen, Datenblätter

### Bestellwesen:
10. **suppliers** - Lieferanten
11. **supplier_items** - Preise, Artikelnummern
12. **purchase_orders** - Bestellungen
13. **purchase_order_items** - Bestellpositionen

---

## 🔄 Workflows

### Entnahme (Issue):
```
1. User wählt Tool
2. Klick "Entnehmen"
3. Auswahl Zustand:
   [ ] 2x neu
   [x] 1x gebraucht
   [ ] 0x nachgeschliffen
4. Grund eingeben
5. Bestätigen
→ Bestand: 5 neu, 2 gebraucht, 2 nachgeschl.
```

### Einlagerung (Receive):
```
1. User wählt Tool
2. Klick "Einlagern"
3. Auswahl Zustand:
   [ ] 0x neu (Wareneingang)
   [ ] 0x gebraucht (Rückgabe)
   [x] 3x nachgeschliffen (vom Schleifer)
4. Grund eingeben
5. Bestätigen
→ Bestand: 5 neu, 2 gebraucht, 5 nachgeschl.
```

### Verschrottung (Scrap):
```
1. User wählt Tool
2. Klick "Verschrotten"
3. Auswahl Zustand: [x] 1x gebraucht
4. Grund: "Schneide gebrochen"
5. Bestätigen
→ Werkzeug raus aus Bestand
→ Optional: Future Feature "Scrapped Tools" Tracking
```

---

## 🚀 5 Phasen - Übersicht

| Phase | Dauer | Deliverable |
|-------|-------|-------------|
| **1** | 10-12h | Lagerorte-System (Locations, Compartments) |
| **2** | 12-14h | Tool Master + Storage + Documents + Inserts |
| **3** | 4-5h | Supplier Management |
| **4** | 6-8h | Bestellwesen (PO, Wareneingang) |
| **5** | 4-5h | Integration (Tool Lists, Reports, Dashboard) |
| **Total** | **36-44h** | **Komplett-System (2-3 Wochen)** |

---

## 🎨 UI-Highlights

### Tool Detail Page - Tabs:
```
┌─────────────────────────────────────────┐
│ [Details] [Storage] [Docs] [Inserts]   │
├─────────────────────────────────────────┤
│                                         │
│  10mm Schaftfräser HSS-E TiAlN         │
│  Tool #: T001 | Category: Milling      │
│                                         │
│  ┌─ Storage Tab ────────────────────┐  │
│  │ Lagerort: WZ-01 → Fach 3         │  │
│  │                                   │  │
│  │ Bestand nach Zustand:             │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  │
│  │ 5 neu       ████████░░ 68%        │  │
│  │ 3 gebraucht ████░░░░░░ 41%        │  │
│  │ 2 nachgesch ███░░░░░░░ 27%        │  │
│  │ ────────────────────────────      │  │
│  │ Gesamt: 10  Effektiv: 8.1         │  │
│  │ Reorder: 6  Status: ✓ OK          │  │
│  │                                   │  │
│  │ [Entnehmen] [Einlagern] [QR]     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Stock Movement Modal:
```
┌─────────────────────────────────┐
│ Werkzeug entnehmen              │
├─────────────────────────────────┤
│ Zustand auswählen:              │
│                                 │
│ [Neu]  [Gebraucht]  [Nachgesch]│
│   5         3           2       │
│                                 │
│ Menge: [2] Stück                │
│                                 │
│ Grund:                          │
│ [Für Auftrag #12345 - OP10   ] │
│                                 │
│ ─────────────────────────────── │
│ Vorher: 5 neu, 3 gebraucht      │
│ Nachher: 5 neu, 1 gebraucht     │
│ Effektiv: 8.1 → 7.1             │
│                                 │
│      [Abbrechen]  [Bestätigen]  │
└─────────────────────────────────┘
```

---

## 🔧 API Endpoints - Top 10

```javascript
// Tool Master
POST   /api/tool-master              // Create mit Storage
GET    /api/tool-master/:id          // Details mit allem
GET    /api/tool-master/alerts/low-stock  // Gewichtet!

// Stock Movements
POST   /api/storage/items/:id/issue    // + condition
POST   /api/storage/items/:id/receive  // + condition
POST   /api/storage/items/:id/scrap    // + condition

// Documents
POST   /api/tool-master/:id/documents  // Upload
GET    /api/tool-master/:id/documents

// Inserts
GET    /api/tool-master/:id/compatible-inserts
POST   /api/tool-master/:id/compatible-inserts
```

---

## ✅ Wichtige Features

### Custom Fields (Level 1):
```json
{
  "point_angle": 135,
  "point_type": "split_point",
  "coolant_through": true
}
```
- JSONB Feld in tool_master
- Typ-spezifische Daten flexibel
- Upgrade zu Level 2/3 später

### QR-Codes:
- Pro storage_item generiert
- Scan → öffnet Detail + Quick Actions
- Etikettendruck

### Wendeschneidplatten:
- Insert = eigener Tool Master (item_type='insert')
- Many-to-Many Kompatibilität
- Bestand wie normales Tool

### Gewichtete Alerts:
```javascript
effective = (new × 1.0) + (used × 0.5) + (reground × 0.8)
is_low_stock = effective < reorder_point
```

---

## 🔮 Future Features

- **Custom Fields Level 2/3** (UI zum Felder definieren) - 8-16h
- **Verschleiß-Tracking** (ausrangierte Tools statistisch) - 6-8h  
- **Barcode/RFID** (Scanner-Integration) - 12-16h
- **Tool Life Analytics** (Nutzungs-Statistiken) - 16-20h
- **Tool Sets** (vordefinierte Kombinationen) - 10-12h

---

## 📝 Wichtige Entscheidungen

| Thema | Entscheidung | Grund |
|-------|--------------|-------|
| **Instance Tracking** | NEIN | Zu komplex für Werkstattalltag |
| **Zustandsverwaltung** | new/used/reground | Praktisch & ausreichend |
| **Low-Stock** | Gewichtet | Realistische Verfügbarkeit |
| **Nachschliff** | Einfacher Workflow | Kein Zwischenstatus nötig |
| **Custom Fields** | Level 1 (JSONB) | Flexibel, Upgrade später |
| **Kategorien** | Erweiterbar (UI) | Flexibel ohne Code |
| **QR-Codes** | storage_items | Direkt zu Lagerort |

---

## 🎯 Nächste Schritte

1. **Review** - Roadmap durchlesen, Feedback geben
2. **Phase 1 Start** - Lagerorte-System Backend
3. **Migrations** - Datenbank-Schema anlegen
4. **Testing** - HTTP-Tests durchführen
5. **Frontend** - UI Components bauen

---

**Dokumente:**
- 📄 TOOL-MANAGEMENT-ROADMAP-FINAL.md (2859 Zeilen, komplett)
- 📄 TOOL-MANAGEMENT-QUICK-REFERENCE.md (dieses Dokument)

**Bereit für Implementierung!** 🚀
