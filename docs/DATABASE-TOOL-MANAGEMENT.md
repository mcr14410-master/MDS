# Tool Management System - Datenbankschema

**Version:** 1.0  
**Phase:** 4, Week 13  
**Datum:** 2025-11-09

---

## 📋 Übersicht

Das Tool Management System erweitert das MDS um ein professionelles Werkzeugverwaltungs-System mit:
- **Komplexem Lagersystem** (Schränke → Regale → Fächer)
- **Standort-Tracking** mit Historie
- **Lieferanten-Verwaltung**
- **Bestellmanagement** mit Status-Tracking
- **Integration** mit bestehenden Tool Lists

---

## 🗄️ Tabellen-Übersicht

### Neu hinzugefügt (10 Tabellen):
1. `tool_categories` - Werkzeug-Kategorien
2. `suppliers` - Lieferanten
3. `location_cabinets` - Schränke/Räume
4. `location_shelves` - Regale
5. `location_slots` - Fächer/Positionen
6. `tool_locations` - Werkzeug-Standorte (m:n)
7. `tool_location_history` - Bewegungs-Historie
8. `tool_orders` - Bestellungen
9. `tool_order_items` - Bestellpositionen
10. `tool_images` - Bilder/Dokumente

### Erweitert:
- `tools` - 7 neue Felder hinzugefügt
- `tool_list_items` - Foreign Key zu `tools` hinzugefügt

---

## 📊 Detaillierte Tabellen-Beschreibung

### 1. `tool_categories` - Werkzeug-Kategorien

**Zweck:** Kategorisierung der Werkzeuge (Fräser, Bohrer, etc.)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR(100) | Name der Kategorie (unique) |
| `description` | TEXT | Beschreibung |
| `icon` | VARCHAR(50) | Icon (Emoji oder Font-Awesome) |
| `color` | VARCHAR(7) | Farbe (Hex-Code) |
| `sequence` | INTEGER | Sortierung |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Standard-Kategorien:**
- Fräser 🔩 (blau)
- Bohrer ⚙️ (grün)
- Gewinde 🔧 (lila)
- Senker 📐 (orange)
- Reibahle 🔪 (rot)
- Drehmeißel 🔨 (cyan)
- Messwerkzeug 📏 (grau)
- Sonstiges 🛠️ (grau)

---

### 2. `suppliers` - Lieferanten

**Zweck:** Verwaltung von Werkzeug-Lieferanten

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR(255) | Firmenname |
| `contact_person` | VARCHAR(255) | Ansprechpartner |
| `email` | VARCHAR(255) | E-Mail |
| `phone` | VARCHAR(50) | Telefon |
| `address` | TEXT | Adresse |
| `website` | VARCHAR(255) | Website |
| `delivery_time_days` | INTEGER | Standard-Lieferzeit (Tage) |
| `payment_terms` | VARCHAR(100) | Zahlungsbedingungen |
| `notes` | TEXT | Notizen |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Beispiel-Lieferanten:**
- Hoffmann Group
- Gühring oHG
- Walter AG
- Mapal Dr. Kress KG
- Sandvik Coromant

---

### 3. `tools` - Erweiterte Werkzeug-Stammdaten

**Neue Felder:**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `tool_category_id` | INTEGER | FK zu `tool_categories` |
| `preferred_supplier_id` | INTEGER | FK zu `suppliers` (bevorzugter Lieferant) |
| `lifecycle_status` | VARCHAR(20) | Status: NEW, IN_USE, WORN, REGRIND, SCRAPPED |
| `total_lifetime_minutes` | INTEGER | Gesamt-Standzeit in Minuten (optional) |
| `times_reground` | INTEGER | Wie oft nachgeschliffen |
| `max_regrinds` | INTEGER | Max. Nachschliffe möglich |
| `image_url` | VARCHAR(500) | URL zum Haupt-Bild |

**Lifecycle Status:**
- `NEW` - Neues Werkzeug
- `IN_USE` - In Verwendung
- `WORN` - Verschlissen, muss nachgeschliffen werden
- `REGRIND` - Beim Nachschleifen
- `SCRAPPED` - Ausgemustert/verschrottet

---

### 4. `location_cabinets` - Schränke/Räume

**Zweck:** Oberste Ebene des Lagersystems (physische Schränke/Räume)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `name` | VARCHAR(100) | Name (unique, z.B. "Werkzeugschrank 1") |
| `location` | VARCHAR(255) | Standort (z.B. "Halle A, Nordwand") |
| `description` | TEXT | Beschreibung |
| `max_shelves` | INTEGER | Max. Anzahl Regale |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Beispiel:**
- "Werkzeugschrank 1" - Halle A, Nordwand (Fräswerkzeuge)
- "Werkzeugschrank 2" - Halle A, Ostwand (Bohrwerkzeuge)

---

### 5. `location_shelves` - Regale

**Zweck:** Mittlere Ebene - Regale/Ebenen innerhalb eines Schranks

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `cabinet_id` | INTEGER | FK zu `location_cabinets` |
| `shelf_number` | INTEGER | Regal-Nummer (1, 2, 3, ...) |
| `description` | VARCHAR(255) | Beschreibung (z.B. "Fräser D6-D12") |
| `max_slots` | INTEGER | Max. Anzahl Fächer |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Unique Constraint:** `(cabinet_id, shelf_number)` - Jede Regal-Nummer pro Schrank nur einmal

**Beispiel:**
- Schrank 1, Regal 1: "Fräser Klein (D6-D12)"
- Schrank 1, Regal 2: "Fräser Mittel (D12-D25)"
- Schrank 2, Regal 1: "Bohrer D2-D20"

---

### 6. `location_slots` - Fächer/Positionen

**Zweck:** Unterste Ebene - Einzelne Fächer/Positionen in einem Regal

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `shelf_id` | INTEGER | FK zu `location_shelves` |
| `slot_number` | INTEGER | Fach-Nummer (1, 2, 3, ...) |
| `description` | VARCHAR(255) | Beschreibung (optional) |
| `max_quantity` | INTEGER | Max. Werkzeuge pro Fach (default: 1) |
| `is_occupied` | BOOLEAN | Belegt/Frei (Performance-Flag) |
| `is_active` | BOOLEAN | Aktiv/Inaktiv |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Unique Constraint:** `(shelf_id, slot_number)` - Jede Fach-Nummer pro Regal nur einmal

**Vollständige Adresse:**
```
Schrank 1 → Regal 3 → Fach 15
"Werkzeugschrank 1, Regal 3, Fach 15"
```

---

### 7. `tool_locations` - Werkzeug-Standorte (m:n)

**Zweck:** Verknüpfung zwischen Werkzeugen und Standorten (Ein Werkzeug kann an mehreren Orten liegen!)

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `tool_id` | INTEGER | FK zu `tools` |
| `slot_id` | INTEGER | FK zu `location_slots` |
| `quantity` | INTEGER | Anzahl an diesem Standort |
| `condition` | VARCHAR(20) | Zustand: NEW, USED, WORN |
| `notes` | TEXT | Notizen |
| `placed_by` | INTEGER | FK zu `users` (wer platziert) |
| `placed_at` | TIMESTAMP | Wann platziert |
| `removed_at` | TIMESTAMP | Wann entfernt (NULL = noch dort) |
| `removed_by` | INTEGER | FK zu `users` (wer entfernt) |
| `is_active` | BOOLEAN | TRUE = noch dort, FALSE = entfernt |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Wichtig:** 
- `is_active = TRUE` → Werkzeug liegt noch an diesem Ort
- `is_active = FALSE` → Werkzeug wurde entfernt (Historie)

**Beispiel:**
```
Werkzeug T12345 (D10 Fräser):
- 2 Stück in Schrank 1, Regal 1, Fach 5 (NEW)
- 1 Stück in Schrank 1, Regal 1, Fach 6 (NEW)
→ Gesamt-Bestand: 3 Stück
```

---

### 8. `tool_location_history` - Bewegungs-Historie

**Zweck:** Vollständige Tracking-Historie aller Werkzeug-Bewegungen

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `tool_id` | INTEGER | FK zu `tools` |
| `from_slot_id` | INTEGER | FK zu `location_slots` (von wo) |
| `to_slot_id` | INTEGER | FK zu `location_slots` (nach wo) |
| `quantity` | INTEGER | Anzahl bewegt |
| `reason` | VARCHAR(50) | Grund der Bewegung |
| `notes` | TEXT | Notizen |
| `moved_by` | INTEGER | FK zu `users` (wer bewegt) |
| `moved_at` | TIMESTAMP | Wann bewegt |

**Reasons (Gründe):**
- `INITIAL_PLACEMENT` - Erste Einlagerung
- `MOVED` - Umgelagert
- `USED` - Entnommen für Verwendung
- `RETURNED` - Zurückgelegt
- `RESTOCKED` - Nachbestellt/aufgefüllt
- `INVENTORY` - Inventur-Korrektur
- `SCRAPPED` - Ausgemustert

**Beispiel:**
```
2025-11-09 10:30: T12345 von NULL → Schrank 1/Regal 1/Fach 5 (INITIAL_PLACEMENT)
2025-11-10 14:15: T12345 von Schrank 1/Regal 1/Fach 5 → NULL (USED)
2025-11-10 18:45: T12345 von NULL → Schrank 1/Regal 1/Fach 5 (RETURNED)
```

---

### 9. `tool_orders` - Bestellungen

**Zweck:** Verwaltung von Werkzeug-Bestellungen

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `order_number` | VARCHAR(100) | Bestellnummer (unique) |
| `supplier_id` | INTEGER | FK zu `suppliers` |
| `order_date` | DATE | Bestelldatum |
| `expected_delivery_date` | DATE | Voraussichtliches Lieferdatum |
| `received_date` | DATE | Tatsächliches Lieferdatum |
| `status` | VARCHAR(20) | Status der Bestellung |
| `total_cost` | DECIMAL(10,2) | Gesamtkosten |
| `notes` | TEXT | Notizen |
| `ordered_by` | INTEGER | FK zu `users` (wer bestellt) |
| `received_by` | INTEGER | FK zu `users` (wer empfangen) |
| `created_at` | TIMESTAMP | Erstelldatum |
| `updated_at` | TIMESTAMP | Änderungsdatum |

**Status-Workflow:**
```
REQUESTED → ORDERED → PARTIAL → RECEIVED
                  ↓
              CANCELLED
```

**Status-Beschreibung:**
- `REQUESTED` - Anforderung erstellt, noch nicht bestellt
- `ORDERED` - Bei Lieferant bestellt
- `PARTIAL` - Teillieferung erhalten
- `RECEIVED` - Vollständig erhalten
- `CANCELLED` - Storniert

---

### 10. `tool_order_items` - Bestellpositionen

**Zweck:** Einzelne Positionen einer Bestellung

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `order_id` | INTEGER | FK zu `tool_orders` |
| `tool_id` | INTEGER | FK zu `tools` |
| `quantity_ordered` | INTEGER | Bestellte Menge |
| `quantity_received` | INTEGER | Erhaltene Menge |
| `unit_price` | DECIMAL(10,2) | Stückpreis |
| `total_price` | DECIMAL(10,2) | Gesamtpreis (quantity × unit_price) |
| `notes` | TEXT | Notizen |
| `created_at` | TIMESTAMP | Erstelldatum |

**Beispiel:**
```
Bestellung B-2025-001:
- 5× T12345 (D10 Fräser) à 89,50€ = 447,50€
- 3× T20001 (D8.5 Bohrer) à 45,00€ = 135,00€
→ Gesamt: 582,50€
```

---

### 11. `tool_images` - Werkzeug-Bilder/Dokumente

**Zweck:** Verwaltung von Bildern und Dokumenten zu Werkzeugen

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | SERIAL | Primary Key |
| `tool_id` | INTEGER | FK zu `tools` |
| `filename` | VARCHAR(255) | Dateiname |
| `filepath` | VARCHAR(500) | Dateipfad |
| `filesize` | INTEGER | Dateigröße (Bytes) |
| `mime_type` | VARCHAR(100) | MIME-Type |
| `image_type` | VARCHAR(20) | Typ des Bildes |
| `title` | VARCHAR(255) | Titel |
| `description` | TEXT | Beschreibung |
| `is_primary` | BOOLEAN | Haupt-Bild? |
| `sequence` | INTEGER | Sortierung |
| `uploaded_by` | INTEGER | FK zu `users` |
| `created_at` | TIMESTAMP | Erstelldatum |

**Image Types:**
- `PHOTO` - Foto des Werkzeugs
- `DRAWING` - Technische Zeichnung
- `DATASHEET` - Datenblatt (PDF)
- `MANUAL` - Bedienungsanleitung

---

### 12. `tool_list_items` - Integration (ERWEITERT)

**Neue Felder:**

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `tool_id` | INTEGER | FK zu `tools` (verknüpft T-Nummer mit Stammdaten) |

**Beispiel:**
```
Tool List Item:
- tool_number: "T12345" (String, wie bisher)
- tool_id: 42 (FK zu tools) ← NEU!
→ Zugriff auf vollständige Stammdaten, Standort, Lieferant, etc.
```

---

## 🔗 Beziehungen

### Hierarchie Lagersystem:
```
location_cabinets (Schränke)
    ↓ 1:n
location_shelves (Regale)
    ↓ 1:n
location_slots (Fächer)
    ↓ n:m
tools (über tool_locations)
```

### Komplette Adresse:
```sql
SELECT 
  c.name AS cabinet,
  s.shelf_number,
  sl.slot_number,
  t.tool_number,
  tl.quantity
FROM tool_locations tl
JOIN location_slots sl ON tl.slot_id = sl.id
JOIN location_shelves s ON sl.shelf_id = s.id
JOIN location_cabinets c ON s.cabinet_id = c.id
JOIN tools t ON tl.tool_id = t.id
WHERE tl.is_active = true;
```

---

## 📈 Verwendungs-Beispiele

### 1. Wo liegt Werkzeug T12345?

```sql
SELECT 
  c.name || ', Regal ' || s.shelf_number || ', Fach ' || sl.slot_number AS location,
  tl.quantity,
  tl.condition
FROM tool_locations tl
JOIN tools t ON tl.tool_id = t.id
JOIN location_slots sl ON tl.slot_id = sl.id
JOIN location_shelves s ON sl.shelf_id = s.id
JOIN location_cabinets c ON s.cabinet_id = c.id
WHERE t.tool_number = 'T12345' AND tl.is_active = true;
```

### 2. Welche Werkzeuge müssen nachbestellt werden?

```sql
SELECT 
  t.tool_number,
  t.tool_name,
  t.stock_quantity,
  t.min_stock,
  s.name AS preferred_supplier
FROM tools t
LEFT JOIN suppliers s ON t.preferred_supplier_id = s.id
WHERE t.stock_quantity <= t.min_stock AND t.is_active = true
ORDER BY (t.min_stock - t.stock_quantity) DESC;
```

### 3. Alle Werkzeuge in Schrank 1, Regal 3

```sql
SELECT 
  sl.slot_number,
  t.tool_number,
  t.tool_name,
  tl.quantity,
  tl.condition
FROM location_slots sl
JOIN location_shelves s ON sl.shelf_id = s.id
LEFT JOIN tool_locations tl ON sl.id = tl.slot_id AND tl.is_active = true
LEFT JOIN tools t ON tl.tool_id = t.id
WHERE s.cabinet_id = 1 AND s.shelf_number = 3
ORDER BY sl.slot_number;
```

### 4. Historie eines Werkzeugs

```sql
SELECT 
  tlh.moved_at,
  COALESCE(c_from.name || ', R' || s_from.shelf_number || ', F' || sl_from.slot_number, 'Extern') AS from_location,
  COALESCE(c_to.name || ', R' || s_to.shelf_number || ', F' || sl_to.slot_number, 'Extern') AS to_location,
  tlh.quantity,
  tlh.reason,
  u.username AS moved_by
FROM tool_location_history tlh
JOIN tools t ON tlh.tool_id = t.id
LEFT JOIN users u ON tlh.moved_by = u.id
LEFT JOIN location_slots sl_from ON tlh.from_slot_id = sl_from.id
LEFT JOIN location_shelves s_from ON sl_from.shelf_id = s_from.id
LEFT JOIN location_cabinets c_from ON s_from.cabinet_id = c_from.id
LEFT JOIN location_slots sl_to ON tlh.to_slot_id = sl_to.id
LEFT JOIN location_shelves s_to ON sl_to.shelf_id = s_to.id
LEFT JOIN location_cabinets c_to ON s_to.cabinet_id = c_to.id
WHERE t.tool_number = 'T12345'
ORDER BY tlh.moved_at DESC;
```

---

## 🔍 Indizes

Alle wichtigen Felder sind indiziert für Performance:

**Performance-kritische Indizes:**
- `tools(tool_number)` - Suche nach Werkzeug-Nummer
- `tool_locations(tool_id, is_active)` - Aktuelle Standorte
- `location_slots(is_occupied)` - Freie Fächer finden
- `tool_orders(status)` - Offene Bestellungen

---

## ⚠️ Wichtige Regeln

### 1. Standort-Tracking:
- `is_active = TRUE` in `tool_locations` bedeutet: Werkzeug liegt AKTUELL dort
- Beim Entfernen: `is_active = FALSE` setzen + `removed_at` + `removed_by`
- IMMER Historie-Eintrag in `tool_location_history` erstellen!

### 2. Bestandsverwaltung:
- `tools.stock_quantity` ist die SUMME aller aktiven `tool_locations.quantity`
- Bei Änderungen in `tool_locations` → `stock_quantity` aktualisieren!

### 3. Bestellungen:
- Status-Übergänge nur vorwärts: REQUESTED → ORDERED → PARTIAL/RECEIVED
- Bei Wareneingang: `tool_order_items.quantity_received` erhöhen
- Automatisch `tools.stock_quantity` erhöhen
- Automatisch Werkzeug einlagern (neuer `tool_locations` Eintrag)

---

## 📊 Statistiken

**Seed-Daten umfassen:**
- 5 Lieferanten
- 8 Werkzeug-Kategorien
- 19 Werkzeuge
- 2 Schränke
- 14 Regale
- 310 Fächer
- 10 Werkzeug-Standorte
- 10 Historie-Einträge

---

**Dokumentation erstellt:** 2025-11-09  
**Phase:** 4, Week 13, Teil 1  
**Status:** ✅ Datenbankschema komplett
