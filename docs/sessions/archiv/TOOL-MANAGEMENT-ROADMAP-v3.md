# Tool Management System - Roadmap

**Version:** 2.0  
**Erstellt:** 2025-11-12  
**Aktualisiert:** 2025-11-12  
**Geschätzte Dauer:** 2-3 Wochen (8-12 Arbeitstage)  
**Zeitbudget:** 30-35h/Woche

---

## 🎯 Projektziele

### Hauptziel
Ein universelles Lagerverwaltungssystem mit Fokus auf Werkzeuge, das später für Spannmittel, Vorrichtungen, Messmittel und Verbrauchsgüter erweitert werden kann.

### Kernkonzept
**Bestandsverwaltung nach Werkzeug-Zustand:**
- Werkzeuge werden nach Zustand gruppiert: **Neu / Gebraucht / Nachgeschliffen**
- Kein Individual-Tracking von einzelnen physischen Werkzeugen
- Gewichtete Low-Stock Berechnung basierend auf Zustand
- Einfaches Ein-/Auslagern mit Zustandsauswahl

### Funktionsumfang Phase 1 (Tools)
- ✅ Universelles 2-stufiges Lagerorte-System (Schrank/Regal → Fach/Schublade)
- ✅ Werkzeug-Stammdatenverwaltung mit Custom Fields (JSONB)
- ✅ Bestandsverwaltung nach Zustand (new/used/reground)
- ✅ Gewichtete Low-Stock Warnungen (neu=1.0, reground=0.8, used=0.5)
- ✅ Wendeschneidplatten-Kompatibilität (Many-to-Many)
- ✅ Dokumente (Fotos, Zeichnungen, Datenblätter)
- ✅ Lieferanten-Management mit Shop-URLs
- ✅ Bestellwesen (Bestellungen, Wareneingang)
- ✅ QR-Codes für Lagerorte
- ✅ Integration mit vorhandenen Tool Lists (tool_list_items)
- ✅ Verbrauchshistorie und Reports

### Spätere Erweiterungen (Future Phases)
- 🔮 Custom Fields Level 2/3 (UI zum Felder definieren)
- 🔮 Verschleiß/Defekt-Tracking (ausrangierte Werkzeuge)
- 🔮 Messmittel-Kalibrierung (eigenes Modul)
- 🔮 Automatisches Parsen von NC-Programmen (Phase 5)

---

## 📊 Datenbank-Schema

### Designentscheidung: Vereinfachtes Modell mit Zustandsverwaltung

**Kernkonzept - Bestand nach Zustand:**
Anstatt jedes physische Werkzeug einzeln zu tracken, wird der Bestand nach **Zustand gruppiert**:
- `quantity_new` - Anzahl neuer Werkzeuge
- `quantity_used` - Anzahl gebrauchter Werkzeuge  
- `quantity_reground` - Anzahl nachgeschliffener Werkzeuge

**Vorteile:**
- ✅ Einfacher als Individual-Instance Tracking
- ✅ Praktisch für tägliche Entnahme/Einlagerung
- ✅ Gewichtete Low-Stock Berechnung möglich
- ✅ Weniger Datenbankzeilen, schnellere Queries
- ✅ Realistische Abbildung des Werkstattalltags

**Architektur:**
```
storage_locations (Schränke/Regale)
  ↓
storage_compartments (Fächer/Schubladen)
  ↓
storage_items (Bestand + Zustand)
  ↓
tool_master (Stammdaten + Custom Fields)

tool_compatible_inserts (Many-to-Many für Wendeschneidplatten)
```

**Custom Fields:**
- Level 1: JSONB Feld für flexible typ-spezifische Daten
- Upgrade zu Level 2/3 in späteren Phasen (UI zum Felder definieren)

---

### 1. Storage Locations (Lagerorte - Level 1)

**Beschreibung:** Oberste Ebene der Lagerhierarchie (Schränke, Regale, etc.)

```sql
CREATE TABLE storage_locations (
  id SERIAL PRIMARY KEY,
  
  -- Identifikation
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) UNIQUE,
  description TEXT,
  
  -- Typ und Kategorie
  location_type VARCHAR(50) NOT NULL,
    -- 'cabinet' (Schrank), 'shelf_unit' (Regal), 'room' (Raum), 'area' (Bereich)
  item_category VARCHAR(50) NOT NULL,
    -- 'tools', 'fixtures', 'clamping_devices', 'measuring_equipment', 'consumables', 'mixed'
  
  -- Position
  building VARCHAR(50),
  floor VARCHAR(50),
  room VARCHAR(50),
  position_notes TEXT,
  
  -- Eigenschaften
  capacity_info TEXT,
  access_restrictions TEXT,
  responsible_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_locations_name ON storage_locations(name);
CREATE INDEX idx_storage_locations_code ON storage_locations(code);
CREATE INDEX idx_storage_locations_category ON storage_locations(item_category);
CREATE INDEX idx_storage_locations_active ON storage_locations(is_active);
```

**Beispieldaten:**
- "Werkzeugschrank WZ-01" (cabinet, tools)
- "Regal Vorrichtungen V-12" (shelf_unit, fixtures)
- "Messmittel-Raum QS" (room, measuring_equipment)

---

### 2. Storage Compartments (Fächer/Schubladen - Level 2)

**Beschreibung:** Zweite Ebene der Lagerhierarchie (Fächer, Schubladen, Bereiche innerhalb eines Schranks/Regals)

```sql
CREATE TABLE storage_compartments (
  id SERIAL PRIMARY KEY,
  
  -- Hierarchie
  location_id INTEGER NOT NULL REFERENCES storage_locations(id) ON DELETE CASCADE,
  
  -- Identifikation
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  
  -- Typ
  compartment_type VARCHAR(50) NOT NULL,
    -- 'drawer' (Schublade), 'compartment' (Fach), 'bin' (Behälter), 'section' (Bereich)
  
  -- Position/Reihenfolge
  row_number INTEGER,
  column_number INTEGER,
  sequence INTEGER NOT NULL DEFAULT 0,
  
  -- Eigenschaften
  dimensions VARCHAR(100),
  capacity_info TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique: Location + Name
  CONSTRAINT unique_compartment_per_location UNIQUE(location_id, name)
);

CREATE INDEX idx_storage_compartments_location ON storage_compartments(location_id);
CREATE INDEX idx_storage_compartments_name ON storage_compartments(name);
CREATE INDEX idx_storage_compartments_sequence ON storage_compartments(location_id, sequence);
```

**Beispieldaten:**
- WZ-01 → Schublade 1 (drawer)
- WZ-01 → Schublade 2 (drawer)
- V-12 → Fach A1 (compartment)

---

### 3. Storage Items (Bestand mit Zustandsverwaltung)

**Beschreibung:** Lagerverwaltung mit Bestand nach Werkzeug-Zustand

```sql
CREATE TABLE storage_items (
  id SERIAL PRIMARY KEY,
  
  -- Typ (Discriminator)
  item_type VARCHAR(50) NOT NULL,
    -- 'tool', 'insert', 'fixture', 'clamping_device', 'measuring_equipment', 'consumable'
  
  -- Item-spezifische ID (Foreign Key zu typ-spezifischer Tabelle)
  tool_master_id INTEGER REFERENCES tool_master(id) ON DELETE CASCADE,
  -- Später:
  -- fixture_id INTEGER REFERENCES fixtures(id) ON DELETE CASCADE,
  -- measuring_equipment_id INTEGER REFERENCES measuring_equipment(id) ON DELETE CASCADE,
  
  -- Lagerort
  compartment_id INTEGER REFERENCES storage_compartments(id) ON DELETE SET NULL,
  
  -- Bestand nach Zustand (KERN-FEATURE)
  quantity_new DECIMAL(10,2) NOT NULL DEFAULT 0,
    COMMENT 'Anzahl neuer Werkzeuge',
  quantity_used DECIMAL(10,2) NOT NULL DEFAULT 0,
    COMMENT 'Anzahl gebrauchter Werkzeuge',
  quantity_reground DECIMAL(10,2) NOT NULL DEFAULT 0,
    COMMENT 'Anzahl nachgeschliffener Werkzeuge',
  
  -- Computed: Gesamtbestand
  -- total_quantity = quantity_new + quantity_used + quantity_reground
  
  -- Einheit
  unit VARCHAR(20) NOT NULL DEFAULT 'pieces',
    -- 'pieces' (Stück), 'meters' (Meter), 'kg', 'liters', 'sets', etc.
  
  -- Bestellgrenzen
  min_quantity DECIMAL(10,2),
    COMMENT 'Mindestbestand (für einfache Warnung)',
  reorder_point DECIMAL(10,2),
    COMMENT 'Bestellpunkt (für gewichtete Warnung)',
  max_quantity DECIMAL(10,2),
    COMMENT 'Maximaler Bestand',
  
  -- Gewichtung für Low-Stock Berechnung
  weight_new DECIMAL(3,2) DEFAULT 1.0,
  weight_used DECIMAL(3,2) DEFAULT 0.5,
  weight_reground DECIMAL(3,2) DEFAULT 0.8,
    COMMENT 'Gewichtungsfaktoren für effektive Bestandsberechnung',
  
  -- Bestellinformationen
  primary_supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Low Stock Alert aktiviert?
  enable_low_stock_alert BOOLEAN NOT NULL DEFAULT false,
  
  -- QR-Code
  qr_code VARCHAR(100) UNIQUE,
    COMMENT 'QR-Code für diesen Lagerort/Item',
  
  -- Notizen
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_item_type CHECK (item_type IN ('tool', 'insert', 'fixture', 'clamping_device', 'measuring_equipment', 'consumable')),
  CONSTRAINT check_quantities_positive CHECK (
    quantity_new >= 0 AND 
    quantity_used >= 0 AND 
    quantity_reground >= 0
  ),
  CONSTRAINT check_weights_valid CHECK (
    weight_new >= 0 AND weight_new <= 1 AND
    weight_used >= 0 AND weight_used <= 1 AND
    weight_reground >= 0 AND weight_reground <= 1
  ),
  -- Ensure exactly ONE foreign key is set based on item_type
  CONSTRAINT check_single_reference CHECK (
    (item_type IN ('tool', 'insert') AND tool_master_id IS NOT NULL) OR
    (item_type NOT IN ('tool', 'insert') AND tool_master_id IS NULL)
  )
);

CREATE INDEX idx_storage_items_type ON storage_items(item_type);
CREATE INDEX idx_storage_items_tool ON storage_items(tool_master_id);
CREATE INDEX idx_storage_items_compartment ON storage_items(compartment_id);
CREATE INDEX idx_storage_items_supplier ON storage_items(primary_supplier_id);
CREATE INDEX idx_storage_items_qr ON storage_items(qr_code);
CREATE INDEX idx_storage_items_low_stock ON storage_items(enable_low_stock_alert) 
  WHERE enable_low_stock_alert = true;

COMMENT ON TABLE storage_items IS 'Lagerverwaltung mit Bestand nach Werkzeug-Zustand (new/used/reground)';

-- View für effektiven Bestand (gewichtet)
CREATE VIEW storage_items_effective_stock AS
SELECT 
  id,
  tool_master_id,
  quantity_new,
  quantity_used,
  quantity_reground,
  (quantity_new + quantity_used + quantity_reground) as total_quantity,
  (quantity_new * weight_new + 
   quantity_used * weight_used + 
   quantity_reground * weight_reground) as effective_quantity,
  reorder_point,
  CASE 
    WHEN enable_low_stock_alert AND 
         (quantity_new * weight_new + quantity_used * weight_used + quantity_reground * weight_reground) < reorder_point 
    THEN true 
    ELSE false 
  END as is_low_stock
FROM storage_items;
```

**Beispiel-Daten:**
```sql
-- 10mm Schaftfräser im Schrank WZ-01, Fach 3
tool_master_id: 1
compartment_id: 5
quantity_new: 5      -- 5 neue Fräser
quantity_used: 3     -- 3 gebrauchte Fräser
quantity_reground: 2 -- 2 nachgeschliffene Fräser
total: 10
reorder_point: 6

Effektiver Bestand:
  = (5 × 1.0) + (3 × 0.5) + (2 × 0.8)
  = 5.0 + 1.5 + 1.6
  = 8.1 "effektiv"
  
→ KEIN Low-Stock Alert (8.1 > 6)
```

---

### 4. Tool Master (Werkzeug-Stammdaten)

**Status:** Neue Tabelle (ersetzt/erweitert vorhandene `tools` Tabelle)

**Beschreibung:** Zentrale Werkzeug-Stammdaten mit Custom Fields für typ-spezifische Eigenschaften

**WICHTIG:** `tool_number` wird zu `article_number` umbenannt, da T-Nummern (z.B. T113) separat über Tool Number Lists verwaltet werden (Phase 5).
# Siehe: ROADMAP-UPDATE-NOTE.md

```sql
CREATE TABLE tool_master (
  id SERIAL PRIMARY KEY,
  
  -- Identifikation
  article_number VARCHAR(50) NOT NULL UNIQUE,
    COMMENT 'Eindeutige Artikelnummer - intern oder vom Hersteller (z.B. GAR-123, T001, WZ-2024-001)',
  tool_name VARCHAR(255) NOT NULL,
    COMMENT 'Werkzeugbezeichnung',
  
  -- Kategorisierung (erweiterbar über Settings)
  category_id INTEGER REFERENCES tool_categories(id) ON DELETE SET NULL,
  subcategory_id INTEGER REFERENCES tool_subcategories(id) ON DELETE SET NULL,
  
  -- Item-Typ
  item_type VARCHAR(50) NOT NULL DEFAULT 'tool',
    -- 'tool' (normales Werkzeug), 'insert' (Wendeschneidplatte), 'accessory' (Zubehör)
  
  -- Geometrie (Standard-Felder für alle Tools)
  diameter DECIMAL(10,3),
    COMMENT 'Durchmesser in mm',
  length DECIMAL(10,2),
    COMMENT 'Gesamtlänge in mm',
  flutes INTEGER,
    COMMENT 'Anzahl Schneiden',
  
  -- Material & Beschichtung
  material VARCHAR(100),
    -- 'HSS', 'HSS-E', 'HSS-PM', 'Carbide', 'CBN', 'PCD', 'Cermet'
  coating VARCHAR(100),
    -- 'TiN', 'TiAlN', 'TiCN', 'AlCrN', 'DLC', 'Uncoated'
  substrate_grade VARCHAR(50),
    COMMENT 'Hartmetall-Sorte (z.B. K10, K20, P30)',
  hardness VARCHAR(50),
    COMMENT 'Härte (z.B. 65 HRC, 1500 HV)',
  
  -- Hersteller & Bestellung
  manufacturer VARCHAR(100),
    COMMENT 'Hersteller/Marke',
  manufacturer_part_number VARCHAR(100),
    COMMENT 'Hersteller-Artikelnummer',
  shop_url VARCHAR(500),
    COMMENT 'Direkt-Link zum Webshop',
  
  -- Kosten (Richtwert, echte Preise bei supplier_items)
  cost DECIMAL(10,2),
    COMMENT 'Richt-Preis in EUR',
  
  -- Werkzeug-Kategorie
  tool_category VARCHAR(50),
    -- 'standard', 'special', 'modified'
  
  -- Wendeschneidplatten-Info
  uses_inserts BOOLEAN DEFAULT false,
    COMMENT 'Verwendet Wendeschneidplatten?',
  
  -- Custom Fields (Level 1 - JSONB)
  custom_fields JSONB,
    COMMENT 'Typ-spezifische Felder (z.B. {"point_angle": 135, "coolant_through": true})',
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT check_item_type CHECK (item_type IN ('tool', 'insert', 'accessory')),
  CONSTRAINT check_tool_category CHECK (tool_category IN ('standard', 'special', 'modified')),
  CONSTRAINT check_diameter_positive CHECK (diameter IS NULL OR diameter > 0),
  CONSTRAINT check_length_positive CHECK (length IS NULL OR length > 0)
);

CREATE INDEX idx_tool_master_article_number ON tool_master(article_number);
CREATE INDEX idx_tool_master_name ON tool_master(tool_name);
CREATE INDEX idx_tool_master_category ON tool_master(category_id);
CREATE INDEX idx_tool_master_subcategory ON tool_master(subcategory_id);
CREATE INDEX idx_tool_master_manufacturer ON tool_master(manufacturer);
CREATE INDEX idx_tool_master_item_type ON tool_master(item_type);
CREATE INDEX idx_tool_master_active ON tool_master(is_active);
CREATE INDEX idx_tool_master_custom_fields ON tool_master USING GIN (custom_fields);

COMMENT ON TABLE tool_master IS 'Werkzeug-Stammdaten mit Custom Fields für typ-spezifische Eigenschaften';
COMMENT ON COLUMN tool_master.article_number IS 'Eindeutige Artikelnummer (nicht zu verwechseln mit T-Nummern aus NC-Programmen)';
COMMENT ON COLUMN tool_master.custom_fields IS 'JSON für typ-spezifische Daten: Bohrer (point_angle, point_type), Fräser (corner_radius, helix_angle), etc.';
```

**Custom Fields Beispiele:**

```json
// Bohrer (Drilling)
{
  "point_angle": 135,
  "point_type": "split_point",
  "coolant_through": true,
  "drill_type": "twist_drill"
}

// Fräser (Milling)
{
  "corner_radius": 0.5,
  "helix_angle": 30,
  "cutter_style": "roughing",
  "center_cutting": true
}

// Gewindewerkzeug (Threading)
{
  "thread_size": "M8",
  "thread_type": "metric",
  "thread_pitch": 1.25,
  "thread_class": "6H"
}

// Wendeschneidplatte (Insert)
{
  "insert_shape": "CNMG",
  "insert_size": "120408",
  "nose_radius": 0.8,
  "cutting_edges": 4
}
```

**Migration von alter `tools` Tabelle:**
```sql
-- Daten von tools → tool_master übernehmen
INSERT INTO tool_master (
  article_number, tool_name, diameter, length, flutes,
  material, coating, manufacturer, 
  manufacturer_part_number, cost, is_active, notes,
  created_at, updated_at
)
SELECT 
  tool_number as article_number, 
  tool_name, diameter, length, flutes,
  material, coating, manufacturer,
  order_number as manufacturer_part_number, 
  cost, is_active, notes,
  created_at, updated_at
FROM tools;

-- Alte tools Tabelle umbenennen (für Backup)
ALTER TABLE tools RENAME TO tools_legacy;
```

**Wichtige Änderungen:**
- ❌ ENTFERNT: `cutting_speed`, `feed_per_tooth`, `max_rpm` (wird im CAM verwaltet)
- ❌ ENTFERNT: `stock_quantity`, `min_stock` (jetzt in storage_items mit Zustand)
- ❌ UMBENANNT: `tool_number` → `article_number` (Verwechslung mit T-Nummern vermeiden)
- ✅ NEU: `custom_fields` (JSONB für typ-spezifische Daten)
- ✅ NEU: `category_id`, `subcategory_id` (erweiterbare Kategorien)
- ✅ NEU: `item_type` (tool/insert/accessory)
- ✅ NEU: `tool_category` (standard/special/modified)
- ✅ NEU: `shop_url` (Direkt-Link zum Webshop)
- ✅ NEU: `substrate_grade`, `hardness` (erweiterte Material-Info)

---

### 5. Tool Categories (Werkzeug-Kategorien)

**Beschreibung:** Erweiterbare Haupt-Kategorien für Werkzeuge

```sql
CREATE TABLE tool_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
    COMMENT 'Icon-Name für UI (z.B. "drill", "mill", "thread")',
  sequence INTEGER NOT NULL DEFAULT 0,
    COMMENT 'Sortier-Reihenfolge',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_categories_name ON tool_categories(name);
CREATE INDEX idx_tool_categories_sequence ON tool_categories(sequence);

-- Seed-Daten
INSERT INTO tool_categories (name, description, icon, sequence) VALUES
  ('Milling', 'Fräswerkzeuge', 'mill', 10),
  ('Drilling', 'Bohrwerkzeuge', 'drill', 20),
  ('Threading', 'Gewindewerkzeuge', 'thread', 30),
  ('Turning', 'Drehwerkzeuge', 'lathe', 40),
  ('Reaming', 'Reibahlen', 'ream', 50),
  ('Boring', 'Ausbohren', 'bore', 60),
  ('Inserts', 'Wendeschneidplatten', 'insert', 70);
```

---

### 6. Tool Subcategories (Werkzeug-Unterkategorien)

**Beschreibung:** Erweiterbare Unter-Kategorien

```sql
CREATE TABLE tool_subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES tool_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  sequence INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_subcategory_per_category UNIQUE(category_id, name)
);

CREATE INDEX idx_tool_subcategories_category ON tool_subcategories(category_id);
CREATE INDEX idx_tool_subcategories_name ON tool_subcategories(name);

-- Seed-Daten Beispiele
INSERT INTO tool_subcategories (category_id, name, sequence) VALUES
  -- Milling
  (1, 'End Mill', 10),
  (1, 'Ball Nose', 20),
  (1, 'Face Mill', 30),
  (1, 'T-Slot Cutter', 40),
  (1, 'Thread Mill', 50),
  
  -- Drilling
  (2, 'Twist Drill', 10),
  (2, 'Center Drill', 20),
  (2, 'Spot Drill', 30),
  (2, 'Deep Hole Drill', 40),
  (2, 'Countersink', 50),
  
  -- Threading
  (3, 'Tap', 10),
  (3, 'Die', 20),
  (3, 'Thread Former', 30),
  
  -- Inserts
  (7, 'CNMG', 10),
  (7, 'DNMG', 20),
  (7, 'WNMG', 30),
  (7, 'SEKT', 40);
```

---

### 7. Tool Compatible Inserts (Wendeschneidplatten-Kompatibilität)

**Beschreibung:** Many-to-Many Beziehung: Welche Inserts passen zu welchem Werkzeug

```sql
CREATE TABLE tool_compatible_inserts (
  id SERIAL PRIMARY KEY,
  
  -- Werkzeug das Inserts verwendet
  tool_master_id INTEGER NOT NULL REFERENCES tool_master(id) ON DELETE CASCADE,
  
  -- Kompatible Insert (ist auch ein tool_master mit item_type='insert')
  insert_master_id INTEGER NOT NULL REFERENCES tool_master(id) ON DELETE CASCADE,
  
  -- Anzahl benötigt
  quantity_required INTEGER NOT NULL DEFAULT 1,
    COMMENT 'Wie viele Inserts werden benötigt (z.B. 6 für Planfräser)',
  
  -- Notizen
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_tool_insert_pair UNIQUE(tool_master_id, insert_master_id),
  CONSTRAINT check_different_tools CHECK (tool_master_id != insert_master_id)
);

CREATE INDEX idx_compatible_inserts_tool ON tool_compatible_inserts(tool_master_id);
CREATE INDEX idx_compatible_inserts_insert ON tool_compatible_inserts(insert_master_id);

COMMENT ON TABLE tool_compatible_inserts IS 'Definiert welche Wendeschneidplatten zu welchem Werkzeug passen';
```

**Beispiel:**
```sql
-- Planfräser D63 (tool_master_id = 5)
-- kann SEKT 1204 (insert_master_id = 101) UND
-- kann SEKT 1205 (insert_master_id = 102) verwenden

INSERT INTO tool_compatible_inserts VALUES
  (5, 101, 6, 'Standard Insert'),
  (5, 102, 6, 'Alternative mit mehr Material');
```

---

### 8. Tool Documents (Werkzeug-Dokumente)

**Beschreibung:** Verknüpfung von Fotos, Zeichnungen, Datenblättern zu Werkzeugen

```sql
CREATE TABLE tool_documents (
  id SERIAL PRIMARY KEY,
  
  -- Verknüpfung
  tool_master_id INTEGER NOT NULL REFERENCES tool_master(id) ON DELETE CASCADE,
  
  -- Dokument-Typ
  document_type VARCHAR(50) NOT NULL,
    -- 'image' (Foto), 'drawing' (Zeichnung), 'datasheet' (Datenblatt), 'certificate' (Zertifikat)
  
  -- Datei-Info
  file_path VARCHAR(500) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size INTEGER,
    COMMENT 'Dateigröße in Bytes',
  mime_type VARCHAR(100),
  
  -- Beschreibung
  title VARCHAR(255),
  description TEXT,
  
  -- Status
  is_primary BOOLEAN DEFAULT false,
    COMMENT 'Haupt-Dokument dieses Typs (z.B. Haupt-Foto)',
  
  -- Audit
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_document_type CHECK (document_type IN ('image', 'drawing', 'datasheet', 'certificate', 'other'))
);

CREATE INDEX idx_tool_documents_tool ON tool_documents(tool_master_id);
CREATE INDEX idx_tool_documents_type ON tool_documents(document_type);
CREATE INDEX idx_tool_documents_primary ON tool_documents(is_primary) WHERE is_primary = true;

COMMENT ON TABLE tool_documents IS 'Dokumente (Fotos, Zeichnungen, Datenblätter) für Werkzeuge';
```

**Datei-Struktur:**
```
/uploads/tools/
  ├─ images/
  │   ├─ tool_5_primary.jpg
  │   └─ tool_5_detail_1.jpg
  ├─ drawings/
  │   └─ tool_5_drawing.pdf
  └─ datasheets/
      └─ tool_5_datasheet.pdf
```

---

### 9. Suppliers (Lieferanten)

**Beschreibung:** Lieferanten/Hersteller für Werkzeuge und andere Items

```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  
  -- Stammdaten
  name VARCHAR(255) NOT NULL UNIQUE,
  supplier_code VARCHAR(50) UNIQUE,
  
  -- Kontakt
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  fax VARCHAR(50),
  website VARCHAR(255),
  
  -- Adresse
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  postal_code VARCHAR(20),
  city VARCHAR(100),
  country VARCHAR(100),
  
  -- Geschäftsdaten
  tax_id VARCHAR(100),
  payment_terms VARCHAR(255),
  delivery_time_days INTEGER,
  minimum_order_value DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Bewertung
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_preferred BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_preferred ON suppliers(is_preferred);
```

---

### 10. Supplier Items (Lieferanten-Artikelnummern)

**Beschreibung:** Verknüpfung zwischen Items und Lieferanten mit Preisen und Artikelnummern

```sql
CREATE TABLE supplier_items (
  id SERIAL PRIMARY KEY,
  
  -- Verknüpfungen
  storage_item_id INTEGER NOT NULL REFERENCES storage_items(id) ON DELETE CASCADE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  -- Lieferantenspezifische Daten
  supplier_part_number VARCHAR(100),
  supplier_description TEXT,
  
  -- Preise
  unit_price DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'EUR',
  price_valid_from DATE,
  price_valid_until DATE,
  
  -- Bestellinformationen
  min_order_quantity DECIMAL(10,2),
  package_quantity DECIMAL(10,2),
  lead_time_days INTEGER,
  
  -- Status
  is_preferred BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Unique: Ein Item kann nur einmal pro Supplier sein
  CONSTRAINT unique_item_per_supplier UNIQUE(storage_item_id, supplier_id)
);

CREATE INDEX idx_supplier_items_storage ON supplier_items(storage_item_id);
CREATE INDEX idx_supplier_items_supplier ON supplier_items(supplier_id);
CREATE INDEX idx_supplier_items_preferred ON supplier_items(is_preferred);
```

---

### 11. Purchase Orders (Bestellungen)

**Beschreibung:** Bestellungen von Items bei Lieferanten

```sql
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  
  -- Bestellnummer (auto-generiert)
  order_number VARCHAR(50) NOT NULL UNIQUE,
  
  -- Lieferant
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  
  -- Datumsangaben
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- 'draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'
  
  -- Finanzdaten
  currency VARCHAR(3) DEFAULT 'EUR',
  subtotal DECIMAL(10,2),
  tax_amount DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  
  -- Weitere Infos
  payment_terms VARCHAR(255),
  delivery_address TEXT,
  notes TEXT,
  
  -- Audit
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_order_status CHECK (
    status IN ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled')
  )
);

CREATE INDEX idx_purchase_orders_number ON purchase_orders(order_number);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
```

---

### 12. Purchase Order Items (Bestellpositionen)

**Beschreibung:** Einzelne Positionen einer Bestellung

```sql
CREATE TABLE purchase_order_items (
  id SERIAL PRIMARY KEY,
  
  -- Verknüpfungen
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  storage_item_id INTEGER NOT NULL REFERENCES storage_items(id) ON DELETE RESTRICT,
  
  -- Bestellte Menge
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  
  -- Preise
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Wareneingang
  received_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'ordered',
    -- 'ordered', 'partially_received', 'received', 'cancelled'
  
  -- Sequenz
  line_number INTEGER NOT NULL,
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_po_item_status CHECK (
    status IN ('ordered', 'partially_received', 'received', 'cancelled')
  ),
  CONSTRAINT check_quantity_positive CHECK (quantity > 0),
  CONSTRAINT check_received_not_exceeds CHECK (received_quantity <= quantity),
  CONSTRAINT unique_line_per_order UNIQUE(purchase_order_id, line_number)
);

CREATE INDEX idx_po_items_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_storage ON purchase_order_items(storage_item_id);
CREATE INDEX idx_po_items_status ON purchase_order_items(status);
```

---

### 13. Stock Movements (Bestandsbewegungen mit Zustandsverwaltung)

**Beschreibung:** Historie aller Bestandsänderungen mit Tracking des Werkzeug-Zustands

```sql
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  
  -- Item
  storage_item_id INTEGER NOT NULL REFERENCES storage_items(id) ON DELETE CASCADE,
  
  -- Bewegungsart
  movement_type VARCHAR(50) NOT NULL,
    -- 'receipt' (Wareneingang/Rückgabe), 
    -- 'issue' (Entnahme), 
    -- 'transfer' (Umbuchung zwischen Lagerorten),
    -- 'adjustment' (Korrektur/Inventur),
    -- 'scrap' (Verschrottung - aus Bestand entfernen)
  
  -- Werkzeug-Zustand (KERN-FEATURE)
  condition VARCHAR(50) NOT NULL,
    -- 'new' (neu), 'used' (gebraucht), 'reground' (nachgeschliffen)
    COMMENT 'Zustand der bewegten Werkzeuge',
  
  -- Menge
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  
  -- Bestand vorher/nachher (für diesen Zustand)
  quantity_before DECIMAL(10,2) NOT NULL,
    COMMENT 'Bestand dieses Zustands vor der Bewegung',
  quantity_after DECIMAL(10,2) NOT NULL,
    COMMENT 'Bestand dieses Zustands nach der Bewegung',
  
  -- Lagerort (von/nach bei Transfer)
  from_compartment_id INTEGER REFERENCES storage_compartments(id) ON DELETE SET NULL,
  to_compartment_id INTEGER REFERENCES storage_compartments(id) ON DELETE SET NULL,
  
  -- Referenzen (woher kommt die Bewegung?)
  reference_type VARCHAR(50),
    -- 'purchase_order' (Wareneingang), 
    -- 'production' (Produktion), 
    -- 'tool_list' (Entnahme für NC-Programm),
    -- 'regrinding' (Nachschliff),
    -- 'manual' (Manuelle Buchung)
  reference_id INTEGER,
    COMMENT 'ID der Referenz (z.B. purchase_order_id, tool_list_id)',
  
  -- Zusatzinfo
  reason TEXT,
    COMMENT 'Grund der Bewegung',
  notes TEXT,
  
  -- Wer hat die Bewegung durchgeführt?
  performed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_movement_type CHECK (
    movement_type IN ('receipt', 'issue', 'transfer', 'adjustment', 'scrap')
  ),
  CONSTRAINT check_condition CHECK (
    condition IN ('new', 'used', 'reground')
  ),
  CONSTRAINT check_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_stock_movements_item ON stock_movements(storage_item_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_condition ON stock_movements(condition);
CREATE INDEX idx_stock_movements_date ON stock_movements(performed_at);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_user ON stock_movements(performed_by);

COMMENT ON TABLE stock_movements IS 'Historie aller Bestandsbewegungen mit Werkzeug-Zustand (new/used/reground)';
```

**Beispiel-Szenarien:**

**Entnahme (gebrauchte Werkzeuge):**
```sql
INSERT INTO stock_movements (
  storage_item_id, movement_type, condition,
  quantity, unit,
  quantity_before, quantity_after,
  reference_type, reference_id,
  reason, performed_by
) VALUES (
  1, 'issue', 'used',
  2, 'pieces',
  5, 3,  -- 5 gebrauchte → 3 gebrauchte
  'tool_list', 123,
  'Entnahme für Auftrag #12345',
  1
);

-- Storage Items Update:
UPDATE storage_items 
SET quantity_used = 3 
WHERE id = 1;
```

**Rückgabe nach Nachschliff:**
```sql
INSERT INTO stock_movements (
  storage_item_id, movement_type, condition,
  quantity, unit,
  quantity_before, quantity_after,
  reference_type,
  reason, performed_by
) VALUES (
  1, 'receipt', 'reground',
  2, 'pieces',
  1, 3,  -- 1 nachgeschliffen → 3 nachgeschliffen
  'regrinding',
  'Zurück vom Schleifer - 2 Werkzeuge nachgeschliffen',
  1
);

-- Storage Items Update:
UPDATE storage_items 
SET quantity_reground = 3 
WHERE id = 1;
```

**Wareneingang (neue Werkzeuge):**
```sql
INSERT INTO stock_movements (
  storage_item_id, movement_type, condition,
  quantity, unit,
  quantity_before, quantity_after,
  reference_type, reference_id,
  reason, performed_by
) VALUES (
  1, 'receipt', 'new',
  10, 'pieces',
  5, 15,  -- 5 neue → 15 neue
  'purchase_order', 456,
  'Wareneingang Bestellung PO-2025-001',
  1
);

-- Storage Items Update:
UPDATE storage_items 
SET quantity_new = 15 
WHERE id = 1;
```

**Verschrottung (defekte Werkzeuge):**
```sql
INSERT INTO stock_movements (
  storage_item_id, movement_type, condition,
  quantity, unit,
  quantity_before, quantity_after,
  reason, performed_by
) VALUES (
  1, 'scrap', 'used',
  1, 'pieces',
  3, 2,  -- 3 gebrauchte → 2 gebrauchte (1 verschrottet)
  'Werkzeug defekt - Schneide gebrochen',
  1
);

-- Storage Items Update:
UPDATE storage_items 
SET quantity_used = 2 
WHERE id = 1;

-- Optional: Tracking verschrotteter Werkzeuge (Future Feature)
-- INSERT INTO scrapped_tools ...
```

---

## 📅 Phasen-Planung

---

## Phase 1: Lagerorte-System (Tag 1-3)

**Ziel:** Universelles 2-stufiges Lagersystem erstellen

**Zeitaufwand:** ~10-12 Stunden

### User Stories

```
Als Fertigungsleiter möchte ich:
- Schränke/Regale anlegen und verwalten können
- Jedem Schrank einen Item-Typ zuweisen (Tools, Fixtures, etc.)
- Fächer/Schubladen innerhalb eines Schranks anlegen
- Lagerorte hierarchisch durchsuchen können
- Inaktive Lagerorte ausblenden können
```

### Backend Tasks

**Migration erstellen:**
```
migrations/1737000021000_create-storage-system.js
  - storage_locations Tabelle
  - storage_compartments Tabelle
  - Indexes
```

**Controller & Routes:**
```javascript
// src/controllers/storageController.js
- getAllLocations()       // GET /api/storage/locations
- getLocationById()       // GET /api/storage/locations/:id
- createLocation()        // POST /api/storage/locations
- updateLocation()        // PUT /api/storage/locations/:id
- deleteLocation()        // DELETE /api/storage/locations/:id
- getCompartmentsByLocation() // GET /api/storage/locations/:id/compartments

- getAllCompartments()    // GET /api/storage/compartments
- getCompartmentById()    // GET /api/storage/compartments/:id
- createCompartment()     // POST /api/storage/compartments
- updateCompartment()     // PUT /api/storage/compartments/:id
- deleteCompartment()     // DELETE /api/storage/compartments/:id
```

**Validierung:**
- Name erforderlich
- Item Category gültig
- Unique Constraints
- Cascade Delete prüfen

**Permissions:**
```
- storage.view (alle Nutzer)
- storage.create (Produktionsleitung, Admin)
- storage.edit (Produktionsleitung, Admin)
- storage.delete (Admin only)
```

### Frontend Tasks

**Store:**
```javascript
// src/stores/storageStore.js
- locations: []
- compartments: []
- fetchLocations()
- fetchCompartments()
- createLocation()
- updateLocation()
- deleteLocation()
- createCompartment()
- updateCompartment()
- deleteCompartment()
```

**Components:**
```javascript
// src/pages/StorageLocationsPage.jsx
- Liste aller Schränke/Regale
- Filter nach Typ, Kategorie
- Sortierung
- Create/Edit Modal
- Delete Confirmation

// src/components/storage/LocationCard.jsx
- Anzeige eines Lagerorts
- Icon basierend auf Type
- Badge für Item Category
- Compartments Count
- Actions (Edit, Delete, View Details)

// src/components/storage/LocationForm.jsx
- Create/Edit Form für Locations
- Dropdown für Type & Category
- Felder: Name, Code, Building, Floor, Room
- Responsible User Selector
- Validation

// src/components/storage/CompartmentsList.jsx
- Liste der Fächer/Schubladen
- Grid/Table View
- Sequence Ordering
- Create/Edit inline oder Modal
- Visual Grid-Darstellung (optional)

// src/components/storage/CompartmentForm.jsx
- Create/Edit Form für Compartments
- Dropdown für Type
- Row/Column Numbers
- Dimensions
```

### Test Szenarien

```http
### CREATE Location
POST http://localhost:5000/api/storage/locations
{
  "name": "Werkzeugschrank WZ-01",
  "code": "WZ-01",
  "location_type": "cabinet",
  "item_category": "tools",
  "building": "Halle A",
  "floor": "EG",
  "room": "Fertigung"
}

### CREATE Compartments
POST http://localhost:5000/api/storage/compartments
{
  "location_id": 1,
  "name": "Schublade 1",
  "compartment_type": "drawer",
  "row_number": 1,
  "sequence": 10
}

### GET Location with Compartments
GET http://localhost:5000/api/storage/locations/1/compartments

### UPDATE Location
PUT http://localhost:5000/api/storage/locations/1
{
  "is_active": false
}

### DELETE Compartment (CASCADE zu storage_items prüfen!)
DELETE http://localhost:5000/api/storage/compartments/2
```

**Deliverable:** ✅ Vollständiges Lagerorte-System (Backend + Frontend)

---

## Phase 2: Tool Management Core (Tag 4-6)

**Ziel:** Tools mit Storage System verknüpfen, Bestandsverwaltung

**Zeitaufwand:** ~12-14 Stunden

### User Stories

```
Als Fertigungsleiter möchte ich:
- Werkzeuge mit Custom Fields (typ-spezifisch) erfassen
- Werkzeuge Kategorien und Unter-Kategorien zuordnen (erweiterbar)
- Werkzeuge einem Lagerort zuweisen können
- Den Bestand nach Zustand sehen (neu/gebraucht/nachgeschliffen)
- Gewichtete Low-Stock Warnungen erhalten (neu=1.0, reground=0.8, used=0.5)
- Bei Entnahme/Einlagerung den Zustand auswählen (neu/gebraucht/nachgeschliffen)
- Wendeschneidplatten-Kompatibilität definieren
- Werkzeuge mit Fotos, Zeichnungen, Datenblättern dokumentieren
- Werkzeuge nach Kategorie, Lagerort, Hersteller suchen
- Werkzeuge als Standard/Sonder/Modified kennzeichnen
- Inserts als separate Items verwalten
```

### Backend Tasks

**Migrations erstellen:**
```
migrations/1737000022000_create-tool-management-core.js
  - tool_categories Tabelle
  - tool_subcategories Tabelle
  - tool_master Tabelle (ersetzt tools)
  - tool_compatible_inserts Tabelle
  - tool_documents Tabelle
  - Migration: Daten von tools → tool_master
  - ALTER storage_items: neue Felder (quantity_new, quantity_used, quantity_reground, weights)
  - ALTER storage_items: QR-Code Feld
  - View: storage_items_effective_stock
```

**Controller & Routes:**
```javascript
// src/controllers/toolMasterController.js (NEU - ersetzt toolsController)
- getAllTools()           // GET /api/tool-master (mit Storage Info & Zustand)
- getToolById()           // GET /api/tool-master/:id (mit Dokumenten, Inserts, Stock)
- createTool()            // POST /api/tool-master
- updateTool()            // PUT /api/tool-master/:id
- deleteTool()            // DELETE /api/tool-master/:id
- getToolsByCategory()    // GET /api/tool-master/category/:categoryId
- getToolsLowStock()      // GET /api/tool-master/alerts/low-stock (gewichtet!)

// src/controllers/toolCategoriesController.js (NEU)
- getAllCategories()      // GET /api/tool-categories
- getCategoryById()       // GET /api/tool-categories/:id
- createCategory()        // POST /api/tool-categories
- updateCategory()        // PUT /api/tool-categories/:id
- deleteCategory()        // DELETE /api/tool-categories/:id
- getSubcategories()      // GET /api/tool-categories/:id/subcategories

// src/controllers/toolSubcategoriesController.js (NEU)
- getAllSubcategories()   // GET /api/tool-subcategories
- getSubcategoryById()    // GET /api/tool-subcategories/:id
- createSubcategory()     // POST /api/tool-subcategories
- updateSubcategory()     // PUT /api/tool-subcategories/:id
- deleteSubcategory()     // DELETE /api/tool-subcategories/:id

// src/controllers/toolDocumentsController.js (NEU)
- getToolDocuments()      // GET /api/tool-master/:id/documents
- uploadDocument()        // POST /api/tool-master/:id/documents
- updateDocument()        // PUT /api/tool-documents/:id
- deleteDocument()        // DELETE /api/tool-documents/:id
- setPrimaryDocument()    // PUT /api/tool-documents/:id/set-primary

// src/controllers/toolCompatibleInsertsController.js (NEU)
- getToolInserts()        // GET /api/tool-master/:id/compatible-inserts
- addCompatibleInsert()   // POST /api/tool-master/:id/compatible-inserts
- updateCompatibleInsert()// PUT /api/tool-compatible-inserts/:id
- removeCompatibleInsert()// DELETE /api/tool-compatible-inserts/:id

// src/controllers/storageItemsController.js (ERWEITERN)
- getAllStorageItems()    // GET /api/storage/items (mit Zustand)
- getStorageItemById()    // GET /api/storage/items/:id
- createStorageItem()     // POST /api/storage/items (mit initial conditions)
- updateStorageItem()     // PUT /api/storage/items/:id
- deleteStorageItem()     // DELETE /api/storage/items/:id

// WICHTIG: Stock Movement mit Condition
- issueStock()            // POST /api/storage/items/:id/issue
  Body: { condition: 'new'|'used'|'reground', quantity: 2, reason: '...' }
- receiveStock()          // POST /api/storage/items/:id/receive
  Body: { condition: 'new'|'used'|'reground', quantity: 5, reason: '...' }
- transferStock()         // POST /api/storage/items/:id/transfer
  Body: { condition: '...', quantity: 3, to_compartment_id: 10 }
- adjustStock()           // POST /api/storage/items/:id/adjust
  Body: { condition: '...', new_quantity: 5, reason: 'Inventur' }
- scrapStock()            // POST /api/storage/items/:id/scrap
  Body: { condition: '...', quantity: 1, reason: 'Defekt' }

// QR-Code Generator
- generateQRCode()        // POST /api/storage/items/:id/generate-qr
```

**Business Logic:**

**Gewichtete Low-Stock Berechnung:**
```javascript
// Effective Stock berechnen
function calculateEffectiveStock(storageItem) {
  const effective = 
    (storageItem.quantity_new * storageItem.weight_new) +
    (storageItem.quantity_used * storageItem.weight_used) +
    (storageItem.quantity_reground * storageItem.weight_reground);
  
  const isLowStock = storageItem.enable_low_stock_alert && 
                     effective < storageItem.reorder_point;
  
  return { effective, isLowStock };
}
```

**Stock Movement mit Condition:**
```javascript
async function issueStock(storageItemId, condition, quantity, reason, userId) {
  const item = await getStorageItem(storageItemId);
  
  // Prüfe verfügbarer Bestand für diesen Zustand
  const currentQty = item[`quantity_${condition}`]; // quantity_new, quantity_used, etc.
  if (currentQty < quantity) {
    throw new Error(`Nicht genug ${condition} Werkzeuge auf Lager`);
  }
  
  // Stock Movement erstellen
  await createStockMovement({
    storage_item_id: storageItemId,
    movement_type: 'issue',
    condition: condition,
    quantity: quantity,
    quantity_before: currentQty,
    quantity_after: currentQty - quantity,
    reason: reason,
    performed_by: userId
  });
  
  // Storage Item aktualisieren
  await updateStorageItem(storageItemId, {
    [`quantity_${condition}`]: currentQty - quantity
  });
}
```

**Tool Master Creation mit Storage Item:**
```javascript
async function createToolWithStorage(toolData, storageData) {
  // 1. Tool Master erstellen
  const tool = await createToolMaster(toolData);
  
  // 2. Automatisch Storage Item erstellen
  const storageItem = await createStorageItem({
    item_type: toolData.item_type || 'tool',
    tool_master_id: tool.id,
    compartment_id: storageData.compartment_id,
    quantity_new: storageData.initial_quantity_new || 0,
    quantity_used: storageData.initial_quantity_used || 0,
    quantity_reground: storageData.initial_quantity_reground || 0,
    min_quantity: storageData.min_quantity,
    reorder_point: storageData.reorder_point,
    enable_low_stock_alert: storageData.enable_low_stock_alert || false
  });
  
  // 3. Initial Stock Movement (falls Anfangsbestand > 0)
  if (storageData.initial_quantity_new > 0) {
    await createStockMovement({
      storage_item_id: storageItem.id,
      movement_type: 'receipt',
      condition: 'new',
      quantity: storageData.initial_quantity_new,
      quantity_before: 0,
      quantity_after: storageData.initial_quantity_new,
      reference_type: 'initial_stock',
      reason: 'Erstbestand'
    });
  }
  
  return { tool, storageItem };
}
```

**Validierung:**
- tool_number unique
- category_id existiert
- condition IN ('new', 'used', 'reground')
- Zustand-Bestand >= 0
- Bei Issue: genug Bestand für gewählten Zustand

**Permissions:**
```
- tools.view (alle Nutzer)
- tools.create (Produktionsleitung, Admin)
- tools.edit (Produktionsleitung, Admin)
- tools.delete (Admin only)
- tools.categories.manage (Admin only)
- tools.documents.upload (Produktionsleitung, Admin)
- stock.issue (Werker, Produktionsleitung, Admin)
- stock.receive (Werker, Produktionsleitung, Admin)
- stock.adjust (Produktionsleitung, Admin)
```

### Frontend Tasks

**Store:**
```javascript
// src/stores/toolMasterStore.js (NEU - ersetzt toolsStore)
- tools: []
- categories: []
- subcategories: []
- lowStockTools: []
- fetchTools()
- fetchToolById()
- createTool()
- updateTool()
- deleteTool()
- fetchCategories()
- fetchSubcategories()
- createCategory()
- createSubcategory()
- getLowStockAlerts()

// src/stores/storageItemsStore.js (ERWEITERN)
- storageItems: []
- fetchStorageItems()
- getItemsByCompartment()
- issueStock()            // MIT Condition-Auswahl
- receiveStock()          // MIT Condition-Auswahl
- transferStock()
- adjustStock()
- scrapStock()
- generateQRCode()

// src/stores/toolDocumentsStore.js (NEU)
- documents: []
- fetchDocuments()
- uploadDocument()
- deleteDocument()
- setPrimaryDocument()

// src/stores/toolCompatibleInsertsStore.js (NEU)
- compatibleInserts: []
- fetchCompatibleInserts()
- addCompatibleInsert()
- removeCompatibleInsert()
```

**Pages:**
```javascript
// src/pages/ToolsPage.jsx (KOMPLETT NEU)
- Liste aller Werkzeuge
- Erweiterte Filter:
  * Kategorie (Dropdown mit Categories)
  * Unterkategorie (Dropdown mit Subcategories)
  * Location (Storage Location)
  * Item Type (Tool/Insert/Accessory)
  * Tool Category (Standard/Special/Modified)
  * Low Stock (Checkbox)
  * Hersteller (Text-Search)
- Sortierung: Name, Tool Number, Category, Stock
- Badge für Low Stock Warning (gewichtet!)
- Quick Actions: Issue, Receive, View Details
- Create Tool Button

// src/pages/ToolDetailPage.jsx (NEU)
- Tab-System:
  * Details (Stammdaten)
  * Storage (Bestand nach Zustand + Historie)
  * Documents (Fotos, Zeichnungen, Datenblätter)
  * Compatible Inserts (bei uses_inserts=true)
  * Suppliers (aus Phase 3)
- Stammdaten mit Custom Fields anzeigen
- QR-Code anzeigen
- Actions: Edit, Delete, Print QR

// src/pages/ToolCategoriesPage.jsx (NEU - Settings)
- Liste Categories & Subcategories
- Tree-View oder Table
- Add Category/Subcategory
- Edit/Delete
- Drag & Drop für Sequence
```

**Components:**

```javascript
// src/components/tools/ToolCard.jsx
- Anzeige Tool mit Badge (Item Type)
- Category & Subcategory Tags
- Storage Location Badge
- Bestand nach Zustand:
  * 5 neu | 3 gebraucht | 2 nachgeschliffen
  * Effektiver Bestand: 8.1
- Low Stock Warning Icon (gewichtet)
- Manufacturer
- Quick Actions Menu

// src/components/tools/ToolForm.jsx (KOMPLETT NEU)
- Mehrstufiges Form oder Tabs:
  
  TAB 1: Stammdaten
  - Tool Number (auto oder manuell)
  - Tool Name
  - Category Selector (Dropdown)
  - Subcategory Selector (abhängig von Category)
  - Item Type (Radio: Tool/Insert/Accessory)
  - Tool Category (Radio: Standard/Special/Modified)
  
  TAB 2: Geometrie
  - Diameter, Length, Flutes
  - Custom Fields (dynamisch basierend auf Category)
    * Rendert Input-Felder aus custom_fields JSON
  
  TAB 3: Material
  - Material (Dropdown)
  - Coating (Dropdown)
  - Substrate Grade
  - Hardness
  
  TAB 4: Hersteller
  - Manufacturer
  - Part Number
  - Shop URL
  - Cost
  
  TAB 5: Storage (optional bei Create)
  - Location Selector
  - Compartment Selector
  - Initial Stock nach Zustand:
    * Quantity New
    * Quantity Used
    * Quantity Reground
  - Min Quantity
  - Reorder Point
  - Enable Low Stock Alert
  
  TAB 6: Inserts (nur wenn uses_inserts=true)
  - Checkbox: "Uses Inserts"
  - Insert Selector (später)

// src/components/tools/CustomFieldsEditor.jsx (NEU)
- Dynamisches Rendering von Custom Fields
- Input Types: text, number, select, checkbox
- Basierend auf category_id
- JSON Editor für Power Users (optional)

// src/components/tools/StockByConditionDisplay.jsx (NEU)
- Visuelles Display:
  ┌─────────────────────────────┐
  │ 5 neu     │ 68% █████████░░ │
  │ 3 gebrcht │ 41% █████░░░░░░ │
  │ 2 nachge  │ 27% ███░░░░░░░░ │
  ├─────────────────────────────┤
  │ Gesamt: 10  Effektiv: 8.1   │
  │ Reorder: 6  Status: ✓ OK    │
  └─────────────────────────────┘
- Color-Coding:
  * Grün: Effektiv >= Reorder Point
  * Gelb: Effektiv < Reorder Point (Low Stock)
  * Rot: Gesamt < 3

// src/components/tools/StockMovementModal.jsx (KOMPLETT NEU!)
- Modal für Issue/Receive/Transfer/Adjust/Scrap
- Movement Type Selector (Tabs oder Radio)
- Condition Selector (Pills: Neu / Gebraucht / Nachgeschliffen)
  * Zeigt aktuellen Bestand für jeden Zustand
  * Disabled wenn Bestand = 0
- Quantity Input (mit Max-Validation)
- Reason/Notes Textarea
- Confirmation mit Preview:
  "Entnehme 2 gebrauchte Werkzeuge"
  Vorher: 5 neu, 3 gebraucht, 2 nachgeschliffen
  Nachher: 5 neu, 1 gebraucht, 2 nachgeschliffen
  Effektiv: 8.1 → 7.1

// src/components/tools/ToolDocumentsManager.jsx (NEU)
- Tab-System: Images | Drawings | Datasheets | Other
- Upload Button (Drag & Drop Support)
- Document Grid/List
- Actions: View, Download, Delete, Set Primary
- Primary Document Badge

// src/components/tools/DocumentUpload.jsx (NEU)
- Drag & Drop Zone
- File Type Validation
- Max Size: 10MB
- Preview für Images
- Title & Description Input
- Document Type Selector

// src/components/tools/CompatibleInsertsList.jsx (NEU)
- Liste kompatibler Inserts
- Zeigt: Insert Name, Stock, Quantity Required
- Add Insert Button (Modal mit Insert-Suche)
- Remove Button
- Link zu Insert Detail Page

// src/components/tools/InsertSelector.jsx (NEU)
- Modal für Insert-Auswahl
- Search-Bar (filtert Tools mit item_type='insert')
- Liste verfügbarer Inserts
- Quantity Required Input
- Add Button

// src/components/tools/LowStockAlertWidget.jsx (Dashboard Widget)
- Anzahl Tools unter Reorder Point (gewichtet!)
- Top 5 kritische Tools mit Effektiv-Bestand
- Grouped by Category
- Link zu Low Stock Page
- "Order All" Button (Phase 4)

// src/components/tools/QRCodeDisplay.jsx (NEU)
- QR-Code Anzeige (Canvas oder Image)
- Print Button
- Download Button (.png, .svg)
- Label Preview (für Etikettendruck)
```

**Navigation erweitern:**
```javascript
// Sidebar
- Tools
  - All Tools
  - By Category (Dropdown mit Categories)
  - Inserts
  - Low Stock Alerts
  - Settings (Categories/Custom Fields - Admin only)
```

**Utility Functions:**
```javascript
// src/utils/stockCalculations.js
export function calculateEffectiveStock(storageItem) {
  return (
    storageItem.quantity_new * storageItem.weight_new +
    storageItem.quantity_used * storageItem.weight_used +
    storageItem.quantity_reground * storageItem.weight_reground
  );
}

export function isLowStock(storageItem) {
  if (!storageItem.enable_low_stock_alert) return false;
  const effective = calculateEffectiveStock(storageItem);
  return effective < storageItem.reorder_point;
}

export function getStockStatus(storageItem) {
  const effective = calculateEffectiveStock(storageItem);
  const total = storageItem.quantity_new + 
                storageItem.quantity_used + 
                storageItem.quantity_reground;
  
  if (!storageItem.enable_low_stock_alert) return 'ok';
  if (total < 3) return 'critical';
  if (effective < storageItem.reorder_point) return 'warning';
  return 'ok';
}
```

### Test Szenarien

```http
### =====================================
### TOOL CATEGORIES
### =====================================

### CREATE Category
POST http://localhost:5000/api/tool-categories
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "name": "Milling",
  "description": "Fräswerkzeuge",
  "icon": "mill",
  "sequence": 10
}

### CREATE Subcategory
POST http://localhost:5000/api/tool-subcategories
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "category_id": 1,
  "name": "End Mill",
  "description": "Schaftfräser",
  "sequence": 10
}

### GET All Categories with Subcategories
GET http://localhost:5000/api/tool-categories
Authorization: Bearer {{authToken}}

### =====================================
### TOOL MASTER
### =====================================

### CREATE Tool Master with Storage
POST http://localhost:5000/api/tool-master
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "tool_number": "T001",
  "tool_name": "Schaftfräser D10 Z2 HSS-E TiAlN",
  "category_id": 1,
  "subcategory_id": 1,
  "item_type": "tool",
  "tool_category": "standard",
  
  "diameter": 10.0,
  "length": 100.0,
  "flutes": 2,
  
  "material": "HSS-E",
  "coating": "TiAlN",
  "substrate_grade": null,
  "hardness": "65 HRC",
  
  "manufacturer": "Garant",
  "manufacturer_part_number": "GAR-10-HSS-TiAlN",
  "shop_url": "https://www.hoffmann-group.com/...",
  "cost": 45.50,
  
  "uses_inserts": false,
  
  "custom_fields": {
    "corner_radius": 0.2,
    "helix_angle": 30,
    "center_cutting": true
  },
  
  "storage_assignment": {
    "compartment_id": 1,
    "quantity_new": 5,
    "quantity_used": 0,
    "quantity_reground": 0,
    "min_quantity": 2,
    "reorder_point": 3,
    "enable_low_stock_alert": true,
    "weight_new": 1.0,
    "weight_used": 0.5,
    "weight_reground": 0.8
  }
}

### CREATE Insert (Wendeschneidplatte)
POST http://localhost:5000/api/tool-master
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "tool_number": "I001",
  "tool_name": "SEKT 1204 AZ TiAlN",
  "category_id": 7,
  "subcategory_id": 40,
  "item_type": "insert",
  "tool_category": "standard",
  
  "diameter": 12.0,
  "material": "Carbide",
  "coating": "TiAlN",
  "substrate_grade": "K20",
  
  "manufacturer": "Sandvik",
  "manufacturer_part_number": "SEKT1204AZ-TN",
  "cost": 8.50,
  
  "custom_fields": {
    "insert_shape": "SEKT",
    "insert_size": "1204",
    "nose_radius": 0.4,
    "cutting_edges": 4
  },
  
  "storage_assignment": {
    "compartment_id": 2,
    "quantity_new": 20,
    "min_quantity": 10,
    "reorder_point": 15,
    "enable_low_stock_alert": true
  }
}

### GET Tool with all details
GET http://localhost:5000/api/tool-master/1
Authorization: Bearer {{authToken}}

### GET Tools with Low Stock (weighted)
GET http://localhost:5000/api/tool-master/alerts/low-stock
Authorization: Bearer {{authToken}}

### =====================================
### COMPATIBLE INSERTS
### =====================================

### ADD Compatible Insert to Tool
POST http://localhost:5000/api/tool-master/1/compatible-inserts
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "insert_master_id": 2,
  "quantity_required": 6,
  "notes": "Standard Insert für Planfräser"
}

### GET Compatible Inserts for Tool
GET http://localhost:5000/api/tool-master/1/compatible-inserts
Authorization: Bearer {{authToken}}

### =====================================
### TOOL DOCUMENTS
### =====================================

### UPLOAD Image (Multipart Form)
POST http://localhost:5000/api/tool-master/1/documents
Content-Type: multipart/form-data
Authorization: Bearer {{authToken}}

# Form Data:
# - file: [actual file]
# - document_type: "image"
# - title: "Hauptfoto"
# - is_primary: true

### GET Tool Documents
GET http://localhost:5000/api/tool-master/1/documents
Authorization: Bearer {{authToken}}

### SET Primary Document
PUT http://localhost:5000/api/tool-documents/1/set-primary
Authorization: Bearer {{authToken}}

### DELETE Document
DELETE http://localhost:5000/api/tool-documents/1
Authorization: Bearer {{authToken}}

### =====================================
### STOCK MOVEMENTS - CONDITION TRACKING
### =====================================

### ISSUE Stock (Entnahme GEBRAUCHTER Werkzeuge)
POST http://localhost:5000/api/storage/items/1/issue
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "used",
  "quantity": 2,
  "reason": "Entnahme für Auftrag #12345 - OP10",
  "reference_type": "tool_list",
  "reference_id": 456
}

# Expected Response:
# {
#   "storage_item": {
#     "quantity_new": 5,      (unverändert)
#     "quantity_used": 3,     (war 5, jetzt 3)
#     "quantity_reground": 2, (unverändert)
#     "total_quantity": 10,
#     "effective_quantity": 7.1
#   },
#   "movement": { ... }
# }

### RECEIVE Stock (Rückgabe nach Nachschliff)
POST http://localhost:5000/api/storage/items/1/receive
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "reground",
  "quantity": 2,
  "reason": "Zurück vom Schleifer - 2 Werkzeuge nachgeschliffen",
  "reference_type": "regrinding"
}

# Expected Response:
# {
#   "storage_item": {
#     "quantity_new": 5,
#     "quantity_used": 3,
#     "quantity_reground": 4,  (war 2, jetzt 4)
#     "total_quantity": 12,
#     "effective_quantity": 8.7
#   },
#   "movement": { ... }
# }

### RECEIVE Stock (Wareneingang NEUER Werkzeuge)
POST http://localhost:5000/api/storage/items/1/receive
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "new",
  "quantity": 10,
  "reason": "Wareneingang Bestellung PO-2025-001",
  "reference_type": "purchase_order",
  "reference_id": 789
}

### TRANSFER Stock (Umbuchung zwischen Lagerorten)
POST http://localhost:5000/api/storage/items/1/transfer
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "new",
  "quantity": 3,
  "to_compartment_id": 5,
  "reason": "Umzug in Schrank WZ-02"
}

### ADJUST Stock (Inventur-Korrektur)
POST http://localhost:5000/api/storage/items/1/adjust
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "used",
  "new_quantity": 4,
  "reason": "Inventur 2025-01 - Soll: 4, Ist: 3"
}

### SCRAP Stock (Verschrottung defekter Werkzeuge)
POST http://localhost:5000/api/storage/items/1/scrap
Content-Type: application/json
Authorization: Bearer {{authToken}}

{
  "condition": "used",
  "quantity": 1,
  "reason": "Werkzeug defekt - Schneide gebrochen"
}

### GET Stock Movement History
GET http://localhost:5000/api/stock-movements/item/1?limit=50
Authorization: Bearer {{authToken}}

### GET Stock Movement History by Condition
GET http://localhost:5000/api/stock-movements/item/1?condition=reground
Authorization: Bearer {{authToken}}

### =====================================
### EFFECTIVE STOCK CALCULATION
### =====================================

### GET Storage Item with Effective Stock
GET http://localhost:5000/api/storage/items/1
Authorization: Bearer {{authToken}}

# Expected Response:
# {
#   "id": 1,
#   "tool_master": { ... },
#   "compartment": { ... },
#   "quantity_new": 5,
#   "quantity_used": 3,
#   "quantity_reground": 2,
#   "total_quantity": 10,
#   "effective_quantity": 8.1,  // (5×1.0) + (3×0.5) + (2×0.8)
#   "reorder_point": 6,
#   "is_low_stock": false,      // 8.1 > 6
#   "weight_new": 1.0,
#   "weight_used": 0.5,
#   "weight_reground": 0.8
# }

### =====================================
### QR CODE
### =====================================

### GENERATE QR Code for Storage Item
POST http://localhost:5000/api/storage/items/1/generate-qr
Authorization: Bearer {{authToken}}

# Response: QR-Code als Base64 oder URL

### GET Storage Item by QR Code
GET http://localhost:5000/api/storage/items/qr/WZ01-F03-T001
Authorization: Bearer {{authToken}}

### =====================================
### COMPLEX SCENARIOS
### =====================================

### Scenario: Komplett-Workflow - Vom Wareneingang bis zur Verschrottung
# 1. CREATE Tool
# 2. RECEIVE 10 neue Werkzeuge (Wareneingang)
# 3. ISSUE 3 neue Werkzeuge (Entnahme für Produktion)
# 4. Nach Gebrauch: 3 werden zu "used"
# 5. ISSUE 2 gebrauchte zum Nachschliff
# 6. RECEIVE 2 nachgeschliffene zurück
# 7. ISSUE 1 nachgeschliffenes für Produktion
# 8. SCRAP 1 gebrauchtes (defekt)
# → Endbestand: 7 neue, 0 gebrauchte, 1 nachgeschliffen = 8 gesamt
# → Effektiv: 7.8

### Scenario: Low Stock Alert (Weighted)
# Tool mit:
#   - 2 neue (2.0 effektiv)
#   - 1 gebraucht (0.5 effektiv)
#   - 1 nachgeschliffen (0.8 effektiv)
#   = 4 total, 3.3 effektiv
#   - Reorder Point: 5
# → is_low_stock = true (3.3 < 5)
```

**Deliverable:** ✅ Tools mit vollständiger Bestandsverwaltung (Backend + Frontend)

---

## Phase 3: Supplier Management (Tag 7)

**Ziel:** Lieferanten-Stammdaten und Verknüpfung mit Tools

**Zeitaufwand:** ~4-5 Stunden

### User Stories

```
Als Einkäufer möchte ich:
- Lieferanten anlegen und verwalten
- Lieferanten nach Name/Code suchen
- Bevorzugte Lieferanten markieren
- Lieferantenspezifische Artikelnummern und Preise hinterlegen
- Mehrere Lieferanten pro Werkzeug haben können
```

### Backend Tasks

**Migration erstellen:**
```
migrations/1737000023000_create-suppliers.js
  - suppliers Tabelle
  - supplier_items Tabelle
```

**Controller & Routes:**
```javascript
// src/controllers/suppliersController.js
- getAllSuppliers()       // GET /api/suppliers
- getSupplierById()       // GET /api/suppliers/:id
- createSupplier()        // POST /api/suppliers
- updateSupplier()        // PUT /api/suppliers/:id
- deleteSupplier()        // DELETE /api/suppliers/:id
- getSupplierItems()      // GET /api/suppliers/:id/items

// src/controllers/supplierItemsController.js
- getItemSuppliers()      // GET /api/storage/items/:id/suppliers
- createSupplierItem()    // POST /api/supplier-items
- updateSupplierItem()    // PUT /api/supplier-items/:id
- deleteSupplierItem()    // DELETE /api/supplier-items/:id
- setPreferredSupplier()  // PUT /api/supplier-items/:id/preferred
```

### Frontend Tasks

**Store:**
```javascript
// src/stores/suppliersStore.js
- suppliers: []
- fetchSuppliers()
- createSupplier()
- updateSupplier()
- deleteSupplier()

// src/stores/supplierItemsStore.js
- supplierItems: []
- getItemSuppliers()
- addSupplierToItem()
- updateSupplierItem()
- removeSupplierFromItem()
```

**Components:**
```javascript
// src/pages/SuppliersPage.jsx
- Liste aller Lieferanten
- Filter: Active, Preferred
- Sortierung nach Name
- Create/Edit Modal
- Actions

// src/components/suppliers/SupplierCard.jsx
- Anzeige Lieferantendaten
- Rating Display (Sterne)
- Preferred Badge
- Contact Info
- Actions

// src/components/suppliers/SupplierForm.jsx
- Stammdaten Formular
- Adresse Felder
- Kontakt Felder
- Payment Terms
- Rating Selector

// src/components/suppliers/SupplierItemsList.jsx
- Liste der Werkzeuge von diesem Lieferanten
- Preise, Artikelnummern
- Preferred Checkbox
- Quick Edit

// src/components/tools/ToolSuppliers.jsx
- Tab in Tool Detail Page
- Liste aller Lieferanten für dieses Tool
- Add Supplier Button
- Edit Prices/Part Numbers
- Set Preferred Supplier
```

### Test Szenarien

```http
### CREATE Supplier
POST http://localhost:5000/api/suppliers
{
  "name": "Garant Werkzeugfabrik",
  "supplier_code": "GAR",
  "email": "sales@garant.de",
  "phone": "+49 123 456789",
  "city": "Stuttgart",
  "country": "Deutschland",
  "payment_terms": "30 Tage netto",
  "delivery_time_days": 3,
  "is_preferred": true
}

### LINK Supplier to Tool
POST http://localhost:5000/api/supplier-items
{
  "storage_item_id": 1,
  "supplier_id": 1,
  "supplier_part_number": "GAR-10-HSS-TiAlN",
  "unit_price": 45.50,
  "currency": "EUR",
  "min_order_quantity": 1,
  "package_quantity": 1,
  "lead_time_days": 3,
  "is_preferred": true
}

### GET Tool Suppliers
GET http://localhost:5000/api/storage/items/1/suppliers
```

**Deliverable:** ✅ Vollständiges Lieferanten-Management

---

## Phase 4: Bestellwesen (Tag 8-9)

**Ziel:** Bestellungen erstellen, Wareneingang buchen

**Zeitaufwand:** ~6-8 Stunden

### User Stories

```
Als Einkäufer möchte ich:
- Bestellungen bei Lieferanten erstellen
- Mehrere Werkzeuge in einer Bestellung zusammenfassen
- Bestellstatus verfolgen (Draft → Sent → Confirmed → Received)
- Wareneingang buchen und Bestand automatisch erhöhen
- Bestellhistorie einsehen
```

### Backend Tasks

**Migration erstellen:**
```
migrations/1737000024000_create-purchase-orders.js
  - purchase_orders Tabelle
  - purchase_order_items Tabelle
  - stock_movements Tabelle
```

**Controller & Routes:**
```javascript
// src/controllers/purchaseOrdersController.js
- getAllOrders()          // GET /api/purchase-orders
- getOrderById()          // GET /api/purchase-orders/:id
- createOrder()           // POST /api/purchase-orders
- updateOrder()           // PUT /api/purchase-orders/:id
- deleteOrder()           // DELETE /api/purchase-orders/:id
- sendOrder()             // POST /api/purchase-orders/:id/send
- receiveOrder()          // POST /api/purchase-orders/:id/receive
- receiveOrderItem()      // POST /api/purchase-orders/:id/items/:itemId/receive

// src/controllers/stockMovementsController.js
- getMovementsByItem()    // GET /api/stock-movements/item/:id
- getMovementsByDate()    // GET /api/stock-movements/date/:from/:to
- createMovement()        // POST /api/stock-movements (manual adjustments)
```

**Business Logic:**
- Auto-generate order_number (PO-YYYY-NNNN)
- Status Workflow: draft → sent → confirmed → partially_received → received
- Wareneingang: stock_movements erstellen + storage_items.quantity erhöhen
- Partial Receiving: purchase_order_items.received_quantity tracken

### Frontend Tasks

**Store:**
```javascript
// src/stores/purchaseOrdersStore.js
- orders: []
- fetchOrders()
- createOrder()
- updateOrder()
- sendOrder()
- receiveOrder()
- receivePartial()

// src/stores/stockMovementsStore.js
- movements: []
- fetchMovements()
- getMovementsByItem()
- createManualAdjustment()
```

**Components:**
```javascript
// src/pages/PurchaseOrdersPage.jsx
- Liste aller Bestellungen
- Filter: Status, Supplier, Date Range
- Create Order Button
- Status Badges

// src/pages/PurchaseOrderDetailPage.jsx
- Bestellkopf (Order Number, Supplier, Dates, Status)
- Positionen-Tabelle
- Actions: Send, Receive, Edit, Cancel
- Status Timeline

// src/components/purchase/OrderForm.jsx
- Supplier Selector
- Order Date, Expected Delivery
- Items Table (Add/Remove Rows)
- Item Selector (Storage Items)
- Quantity, Unit Price, Total
- Notes

// src/components/purchase/ReceiveOrderModal.jsx
- Liste aller Positionen
- Quantity to Receive Input (per Item)
- Partial/Full Receiving
- Actual Delivery Date
- Notes
- Confirmation

// src/components/purchase/OrderStatusBadge.jsx
- Status Badge mit Farbe
- Icon basierend auf Status

// src/components/tools/StockMovementsHistory.jsx
- Tabelle aller Bewegungen für ein Tool
- Filter: Type, Date Range
- Spalten: Date, Type, Quantity, Before/After, User, Reason
- Export CSV
```

### Test Szenarien

```http
### CREATE Purchase Order (Draft)
POST http://localhost:5000/api/purchase-orders
{
  "supplier_id": 1,
  "order_date": "2025-01-15",
  "expected_delivery_date": "2025-01-18",
  "notes": "Dringend!",
  "items": [
    {
      "storage_item_id": 1,
      "quantity": 10,
      "unit": "pieces",
      "unit_price": 45.50,
      "line_number": 1
    },
    {
      "storage_item_id": 2,
      "quantity": 5,
      "unit": "pieces",
      "unit_price": 120.00,
      "line_number": 2
    }
  ]
}

### SEND Order (Status: draft → sent)
POST http://localhost:5000/api/purchase-orders/1/send

### RECEIVE Order (Full)
POST http://localhost:5000/api/purchase-orders/1/receive
{
  "actual_delivery_date": "2025-01-18",
  "items": [
    { "line_id": 1, "received_quantity": 10 },
    { "line_id": 2, "received_quantity": 5 }
  ]
}

### RECEIVE Partial
POST http://localhost:5000/api/purchase-orders/1/items/1/receive
{
  "received_quantity": 5,
  "notes": "Teillieferung, Rest folgt"
}

### GET Stock Movements for Tool
GET http://localhost:5000/api/stock-movements/item/1
```

**Deliverable:** ✅ Vollständiges Bestellwesen mit Wareneingang

---

## Phase 5: Tool Number Lists & Integration (Tag 10-12)
# Siehe: ROADMAP-UPDATE-NOTE.md
**Ziel:** T-Nummern-Verwaltung + Verknüpfung mit Tool Lists + Reports + Dashboard

**Zeitaufwand:** ~12-15 Stunden (erweitert von 4-5h)

### Hintergrund: T-Nummern vs. Artikelnummern

**Problem:** 
- NC-Programme verwenden T-Nummern (z.B. T113 = "Fräser D10 Z2")
- Eine T-Nummer kann mehrere Werkzeuge passen (verschiedene Hersteller)
- T-Nummern sind nicht eindeutig zu einem Werkzeug
- Maschinen können unterschiedliche T-Nummern-Systeme verwenden

**Lösung: Tool Number Lists**
- Listen-basiertes System (z.B. "Standard-Fräsen", "Aluminium-Spezial")
- Jede Liste definiert T-Nummern mit bevorzugtem Werkzeug + Alternativen
- Listen können mehreren Maschinen zugeordnet werden
- Maschinen können mehrere Listen haben (aktivierbar in Einstellungen)

### User Stories

```
Als Fertigungsleiter möchte ich:
- Listen mit T-Nummern erstellen und verwalten
- Für jede T-Nummer ein bevorzugtes Werkzeug definieren
- Alternative Werkzeuge mit Prioritäten hinterlegen
- Listen aktivierbar in Maschinen-Einstellungen machen
- Beim Parsen von NC-Programmen automatisch Tool Lists befüllen
- Warnungen sehen wenn T-Nummern nicht zugeordnet sind
- Reports: Bestandswert, Verbrauch, Low Stock
- Dashboard Widgets für Überblick
```

### Backend Tasks

**Migrations erstellen:**
```
migrations/1737000025000_create-tool-number-lists.js
  - tool_number_lists Tabelle
  - tool_number_list_items Tabelle
  - tool_number_alternatives Tabelle
  - machine_tool_number_lists Tabelle
  - ALTER tool_list_items: ADD tool_master_id (NULL)
```

**Datenbank-Schema:**

```sql
-- ============================================================================
-- Tool Number Lists System
-- ============================================================================

-- 1. Listen-Container
CREATE TABLE tool_number_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
    COMMENT 'Listen-Name (z.B. "Standard-Fräsen", "Aluminium-Spezial")',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_number_lists_name ON tool_number_lists(name);
CREATE INDEX idx_tool_number_lists_active ON tool_number_lists(is_active);

-- 2. T-Nummern innerhalb einer Liste
CREATE TABLE tool_number_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL REFERENCES tool_number_lists(id) ON DELETE CASCADE,
  tool_number VARCHAR(50) NOT NULL,
    COMMENT 'T-Nummer aus NC-Programm (z.B. T113)',
  description VARCHAR(255),
    COMMENT 'Beschreibung (z.B. "Fräser D10 Z2")',
  preferred_tool_master_id INTEGER REFERENCES tool_master(id) ON DELETE SET NULL,
    COMMENT 'Bevorzugtes Werkzeug für diese T-Nummer',
  notes TEXT,
  sequence INTEGER DEFAULT 0,
    COMMENT 'Sortier-Reihenfolge',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_tnumber_per_list UNIQUE(list_id, tool_number)
);

CREATE INDEX idx_tnlist_items_list ON tool_number_list_items(list_id);
CREATE INDEX idx_tnlist_items_tnumber ON tool_number_list_items(tool_number);
CREATE INDEX idx_tnlist_items_preferred ON tool_number_list_items(preferred_tool_master_id);
CREATE INDEX idx_tnlist_items_sequence ON tool_number_list_items(list_id, sequence);

-- 3. Alternative Werkzeuge pro T-Nummer
CREATE TABLE tool_number_alternatives (
  id SERIAL PRIMARY KEY,
  list_item_id INTEGER NOT NULL REFERENCES tool_number_list_items(id) ON DELETE CASCADE,
  tool_master_id INTEGER NOT NULL REFERENCES tool_master(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
    COMMENT 'Priorität: 0=erste Alternative, 1=zweite, etc.',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_alt_per_item UNIQUE(list_item_id, tool_master_id)
);

CREATE INDEX idx_tn_alternatives_item ON tool_number_alternatives(list_item_id);
CREATE INDEX idx_tn_alternatives_tool ON tool_number_alternatives(tool_master_id);
CREATE INDEX idx_tn_alternatives_priority ON tool_number_alternatives(list_item_id, priority);

-- 4. Maschinen → Listen Zuordnung (Many-to-Many)
CREATE TABLE machine_tool_number_lists (
  id SERIAL PRIMARY KEY,
  machine_id INTEGER NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  list_id INTEGER NOT NULL REFERENCES tool_number_lists(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
    COMMENT 'Liste für diese Maschine aktiv?',
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_machine_list UNIQUE(machine_id, list_id)
);

CREATE INDEX idx_machine_tnlists_machine ON machine_tool_number_lists(machine_id);
CREATE INDEX idx_machine_tnlists_list ON machine_tool_number_lists(list_id);
CREATE INDEX idx_machine_tnlists_active ON machine_tool_number_lists(is_active) 
  WHERE is_active = true;

COMMENT ON TABLE tool_number_lists IS 'Listen mit T-Nummern-Definitionen';
COMMENT ON TABLE tool_number_list_items IS 'T-Nummern mit bevorzugtem Werkzeug';
COMMENT ON TABLE tool_number_alternatives IS 'Alternative Werkzeuge für T-Nummern';
COMMENT ON TABLE machine_tool_number_lists IS 'Zuordnung Listen zu Maschinen (aktivierbar)';

-- ============================================================================
-- Tool List Items Erweiterung
-- ============================================================================

ALTER TABLE tool_list_items 
  ADD COLUMN tool_master_id INTEGER REFERENCES tool_master(id) ON DELETE SET NULL;

CREATE INDEX idx_tool_list_items_tool_master ON tool_list_items(tool_master_id);

COMMENT ON COLUMN tool_list_items.tool_master_id IS 
  'Optional: Verknüpfung zu Werkzeug-Stammdaten. Wenn gesetzt, werden Daten aus tool_master gezogen.';
```

**Controller & Routes:**

```javascript
// src/controllers/toolNumberListsController.js (NEU)
- getAllLists()              // GET /api/tool-number-lists
- getListById()              // GET /api/tool-number-lists/:id
- createList()               // POST /api/tool-number-lists
- updateList()               // PUT /api/tool-number-lists/:id
- deleteList()               // DELETE /api/tool-number-lists/:id
- duplicateList()            // POST /api/tool-number-lists/:id/duplicate

// List Items Management
- getListItems()             // GET /api/tool-number-lists/:id/items
- createListItem()           // POST /api/tool-number-lists/:id/items
- updateListItem()           // PUT /api/tool-number-list-items/:id
- deleteListItem()           // DELETE /api/tool-number-list-items/:id
- reorderListItems()         // PUT /api/tool-number-lists/:id/items/reorder

// Alternatives Management
- getAlternatives()          // GET /api/tool-number-list-items/:id/alternatives
- addAlternative()           // POST /api/tool-number-list-items/:id/alternatives
- updateAlternative()        // PUT /api/tool-number-alternatives/:id
- removeAlternative()        // DELETE /api/tool-number-alternatives/:id
- reorderAlternatives()      // PUT /api/tool-number-list-items/:id/alternatives/reorder

// Machine Assignment
- assignListToMachine()      // POST /api/machines/:id/tool-number-lists
- toggleListForMachine()     // PUT /api/machines/:id/tool-number-lists/:listId/toggle
- unassignListFromMachine()  // DELETE /api/machines/:id/tool-number-lists/:listId
- getListsForMachine()       // GET /api/machines/:id/tool-number-lists
- getMachinesForList()       // GET /api/tool-number-lists/:id/machines

// Parser Integration
- parseNCProgram()           // POST /api/programs/:id/parse-tools
- findToolMapping()          // GET /api/machines/:id/tool-mapping/:toolNumber
- autoFillToolList()         // POST /api/tool-lists/:id/auto-fill

// src/controllers/reportsController.js (NEU)
- getInventoryValue()        // GET /api/reports/inventory-value
- getLowStockReport()        // GET /api/reports/low-stock
- getConsumptionReport()     // GET /api/reports/consumption
- getPurchaseHistory()       // GET /api/reports/purchase-history
- getToolUsageReport()       // GET /api/reports/tool-usage
```

**Business Logic:**

**NC-Programm Parser Integration:**
```javascript
async function parseAndMapTools(programId) {
  const program = await getProgram(programId);
  const operation = await getOperation(program.operation_id);
  const machine = operation.machine;
  
  // 1. Parse NC-Programm (extrahiert T-Nummern)
  const parsedTools = await parseNCFile(program.file_path);
  // → ['T113', 'T5', 'T22']
  
  // 2. Hole aktive Listen für diese Maschine
  const activeLists = await getActiveToolNumberListsForMachine(machine.id);
  
  // 3. Für jede T-Nummer: Suche Mapping
  const toolListItems = [];
  const warnings = [];
  
  for (const tNumber of parsedTools) {
    let mapping = null;
    
    // Durchsuche alle aktiven Listen
    for (const list of activeLists) {
      mapping = await findToolNumberInList(list.id, tNumber);
      if (mapping) break;
    }
    
    if (mapping && mapping.preferred_tool_master_id) {
      // ✅ T-Nummer mit Werkzeug gefunden
      const toolMaster = await getToolMaster(mapping.preferred_tool_master_id);
      
      toolListItems.push({
        tool_number: tNumber,
        tool_master_id: toolMaster.id,
        description: toolMaster.tool_name,
        manufacturer: toolMaster.manufacturer,
        order_number: toolMaster.manufacturer_part_number,
        tool_type: toolMaster.category?.name,
        // tool_holder bleibt leer (programm-spezifisch)
      });
    } else {
      // ⚠️ T-Nummer nicht gefunden
      warnings.push({
        tool_number: tNumber,
        message: `T-Nummer ${tNumber} nicht in aktiven Listen der Maschine ${machine.name} gefunden`,
        lists_checked: activeLists.map(l => l.name)
      });
      
      // Erstelle trotzdem Eintrag (ohne tool_master_id)
      toolListItems.push({
        tool_number: tNumber,
        description: 'Unbekannt - bitte zuordnen',
        tool_master_id: null
      });
    }
  }
  
  return { toolListItems, warnings };
}
```

**Tool Mapping Lookup:**
```javascript
async function findToolMapping(machineId, toolNumber) {
  // Hole aktive Listen für Maschine
  const lists = await db.query(`
    SELECT tnl.id, tnl.name, tnli.*, tm.*
    FROM tool_number_lists tnl
    JOIN machine_tool_number_lists mtnl ON mtnl.list_id = tnl.id
    JOIN tool_number_list_items tnli ON tnli.list_id = tnl.id
    LEFT JOIN tool_master tm ON tm.id = tnli.preferred_tool_master_id
    WHERE mtnl.machine_id = $1 
      AND mtnl.is_active = true
      AND tnli.tool_number = $2
    ORDER BY tnl.id ASC
    LIMIT 1
  `, [machineId, toolNumber]);
  
  if (lists.rows.length === 0) return null;
  
  const item = lists.rows[0];
  
  // Hole Alternativen
  const alternatives = await db.query(`
    SELECT tna.*, tm.*
    FROM tool_number_alternatives tna
    JOIN tool_master tm ON tm.id = tna.tool_master_id
    WHERE tna.list_item_id = $1
    ORDER BY tna.priority ASC
  `, [item.id]);
  
  return {
    list_name: item.name,
    tool_number: item.tool_number,
    description: item.description,
    preferred_tool: item.preferred_tool_master_id ? {
      id: item.id,
      article_number: item.article_number,
      tool_name: item.tool_name,
      // ... weitere Felder
    } : null,
    alternatives: alternatives.rows
  };
}
```

**Validierung:**
- Listen-Name unique
- T-Nummer unique pro Liste
- preferred_tool_master_id existiert
- priority >= 0
- Maschine + Liste Kombination unique

**Permissions:**
```
- tool_number_lists.view (alle Nutzer)
- tool_number_lists.create (Produktionsleitung, Admin)
- tool_number_lists.edit (Produktionsleitung, Admin)
- tool_number_lists.delete (Admin only)
- tool_number_lists.assign (Produktionsleitung, Admin)
- programs.parse (Werker, Produktionsleitung, Admin)
```

### Frontend Tasks

**Store:**
```javascript
// src/stores/toolNumberListsStore.js (NEU)
- lists: []
- listItems: []
- alternatives: []
- fetchLists()
- fetchListById()
- createList()
- updateList()
- deleteList()
- duplicateList()
- fetchListItems()
- createListItem()
- updateListItem()
- deleteListItem()
- reorderListItems()
- fetchAlternatives()
- addAlternative()
- removeAlternative()
- reorderAlternatives()

// src/stores/machineToolNumberListsStore.js (NEU)
- machineLists: []
- fetchMachineToolNumberLists()
- assignListToMachine()
- toggleListForMachine()
- unassignListFromMachine()

// src/stores/reportsStore.js (NEU)
- reports: {}
- fetchInventoryValue()
- fetchLowStockReport()
- fetchConsumptionReport()
- fetchPurchaseHistory()
- fetchToolUsageReport()
```

**Pages:**
```javascript
// src/pages/ToolNumberListsPage.jsx (NEU)
- Liste aller Tool Number Lists
- Create List Button
- Cards mit:
  * Listen-Name
  * Anzahl T-Nummern
  * Anzahl zugeordneter Maschinen
  * Actions: Edit, Duplicate, Delete, Assign Machines
- Filter: Active/Inactive

// src/pages/ToolNumberListDetailPage.jsx (NEU)
- Tab-System:
  * T-Nummern (Liste mit Edit/Delete)
  * Maschinen (welche Maschinen verwenden diese Liste)
- Header mit List Info
- Add T-Number Button
- Bulk Actions: Import CSV, Export

// src/pages/ReportsPage.jsx (NEU)
- Tab-System:
  * Inventory Value (Bestandswert)
  * Low Stock (Kritische Bestände)
  * Consumption (Verbrauch)
  * Purchase History (Bestellhistorie)
  * Tool Usage (Werkzeug-Nutzung)
- Date Range Picker
- Export Buttons (CSV, PDF)
- Charts (Recharts)

// Maschinen-Einstellungen erweitern
// src/pages/MachineDetailPage.jsx (ERWEITERN)
- Neuer Tab: "Werkzeugnummern"
- Liste aktiver + inaktiver Listen
- Toggle-Switches zum Aktivieren/Deaktivieren
- Preview: T-Nummern der aktivierten Listen
```

**Components:**

```javascript
// src/components/tool-number-lists/ToolNumberListCard.jsx (NEU)
- Listen-Karte mit Info
- Name, Beschreibung
- Badge: Anzahl T-Nummern
- Badge: Anzahl Maschinen
- Actions: Edit, Duplicate, Delete

// src/components/tool-number-lists/ToolNumberListForm.jsx (NEU)
// src/components/tool-number-lists/ToolNumberItemsList.jsx (NEU)
// src/components/tool-number-lists/ToolNumberItemForm.jsx (NEU)
// src/components/tool-number-lists/AlternativesList.jsx (NEU)
// src/components/tool-number-lists/AlternativeSelector.jsx (NEU)
// src/components/tool-number-lists/MachineAssignmentModal.jsx (NEU)

// src/components/machines/MachineToolNumberListsTab.jsx (NEU)
// src/components/machines/ToolNumberListToggle.jsx (NEU)

// src/components/programs/ParseToolsButton.jsx (NEU)
// src/components/programs/ParseResultsModal.jsx (NEU)

// src/components/reports/InventoryValueReport.jsx (NEU)
// src/components/reports/LowStockReport.jsx (NEU)
// src/components/reports/ConsumptionReport.jsx (NEU)
// src/components/reports/PurchaseHistoryReport.jsx (NEU)

// src/components/dashboard/LowStockWidget.jsx (NEU)
// src/components/dashboard/InventoryValueWidget.jsx (NEU)
// src/components/dashboard/RecentOrdersWidget.jsx (NEU)
```

**Deliverable:** ✅ Tool Number Lists System + Parser Integration + Reports + Dashboard

---

## 🎯 Zusammenfassung Deliverables

| Phase | Zeitaufwand | Deliverable |
|-------|-------------|-------------|
| **Phase 1** | 10-12h | Lagerorte-System (Locations, Compartments) |
| **Phase 2** | 12-14h | Tool Master + Storage (Zustand) + Documents + Inserts |
| **Phase 3** | 4-5h | Supplier Management (Stammdaten, Verknüpfung) |
| **Phase 4** | 6-8h | Bestellwesen (Purchase Orders, Receiving) |
| **Phase 5** | 12-15h | Tool Number Lists + Parser + Reports + Dashboard |
| **GESAMT** | **44-54h** | **Vollständiges Tool Management System** |

---

## 📊 Datenbank-Übersicht

**Neue Tabellen (13):**
1. ✅ `storage_locations` (Schränke/Regale - Level 1)
2. ✅ `storage_compartments` (Fächer/Schubladen - Level 2)
3. ✅ `storage_items` (Bestand mit Zustandsverwaltung: new/used/reground)
4. ✅ `tool_master` (Werkzeug-Stammdaten mit Custom Fields)
5. ✅ `tool_categories` (Erweiterbare Haupt-Kategorien)
6. ✅ `tool_subcategories` (Erweiterbare Unter-Kategorien)
7. ✅ `tool_compatible_inserts` (Wendeschneidplatten-Kompatibilität)
8. ✅ `tool_documents` (Fotos, Zeichnungen, Datenblätter)
9. ✅ `suppliers` (Lieferanten)
10. ✅ `supplier_items` (Item-Supplier Verknüpfung mit Preisen)
11. ✅ `purchase_orders` (Bestellungen)
12. ✅ `purchase_order_items` (Bestellpositionen)
13. ✅ `stock_movements` (Bestandsbewegungen mit Zustand)

**Ersetzte Tabellen:**
- ❌ `tools` → ✅ `tool_master` (komplett überarbeitet)

**Vorhandene Tabellen (verwendet):**
- ✅ `tool_lists` / `tool_list_items` (Integration in Phase 5)
- ✅ `users` (Foreign Keys für created_by, performed_by, etc.)
- ✅ `audit_log` (automatisch über Middleware)

---

## 🔧 Technische Entscheidungen

### Backend
- **Node.js 20+** / Express
- **PostgreSQL** (node-pg-migrate)
- **JWT Auth** (bereits vorhanden)
- **Multer** für Image Upload
- **Permissions:** storage.view, storage.create, storage.edit, storage.delete

### Frontend
- **React 19** / Vite
- **TailwindCSS** (Dark Theme)
- **Zustand** für State Management
- **React Router** für Navigation
- **Recharts** für Reports/Charts

### File Uploads
- Werkzeug-Fotos in `/uploads/tools/images/`
- Max 5MB per Image
- Formats: JPG, PNG, WEBP

---

## 🚀 Nächste Schritte nach Tool Management

1. **Messmittel-Verwaltung (Measuring Equipment)**
   - Eigenes Modul mit Kalibrierungs-Management
   - Zertifikate, Prüfprotokolle
   - ISO/Luftfahrt Compliance Features
   - Erinnerungen für Kalibrierung

2. **Fixtures & Clamping Devices**
   - storage_items.item_type = 'fixture'
   - Neue Tabelle `fixtures` mit spezifischen Feldern
   - Integration mit Setup Sheets

3. **Consumables (Verbrauchsgüter)**
   - storage_items.item_type = 'consumable'
   - Automatische Nachbestellung
   - Verbrauchshistorie

4. **G-Code Parser (Phase 5)**
   - Automatisches Extrahieren von Werkzeugen aus NC-Programmen
   - Mapping zu storage_items
   - Auto-Fill für Tool Lists

---

## ✅ Getroffene Design-Entscheidungen

### Bestandsverwaltung
- **ENTSCHIEDEN:** Kein Individual-Instance Tracking
- **STATTDESSEN:** Bestand gruppiert nach Zustand (new/used/reground)
- **GRUND:** Einfacher, praktischer für Werkstattalltag
- **VORTEIL:** Schnelle Entnahme/Einlagerung ohne komplexe ID-Verwaltung

### Low-Stock Berechnung
- **ENTSCHIEDEN:** Gewichtete Berechnung
- **FORMEL:** `effective = (new × 1.0) + (used × 0.5) + (reground × 0.8)`
- **GRUND:** Realistische Bewertung der Verfügbarkeit
- **BEISPIEL:** 2 neue + 4 gebrauchte = 4.0 effektiv (nicht 6)

### Wendeschneidplatten
- **ENTSCHIEDEN:** Einfache Kompatibilitäts-Verknüpfung
- **NICHT:** Assembly-Tracking (welcher Insert in welchem Fräser)
- **STATTDESSEN:** Many-to-Many Liste kompatibler Inserts
- **GRUND:** Ausreichend für Bestellwesen, kein Tracking-Overhead

### Custom Fields
- **ENTSCHIEDEN:** Level 1 (JSONB) für Phase 1
- **UPGRADE:** Level 2/3 als Future Feature
- **GRUND:** JSONB ist flexibel genug, UI-System kommt später
- **VORTEIL:** Schneller Start, erweiterbar

### Nachschliff-Workflow
- **ENTSCHIEDEN:** Einfacher Workflow ohne Zwischenstatus
- **ABLAUF:** Entnahme (used) → extern → Einlagerung (reground)
- **NICHT:** Status "in_regrinding"
- **GRUND:** Vereinfachung, verschlissene Tools = raus aus Bestand

### QR-Codes
- **ENTSCHIEDEN:** QR für storage_items (nicht tool_master)
- **INHALT:** Storage Item ID + Location Info
- **NUTZEN:** Direkt zu Lagerort navigieren

### Tool-Kategorien
- **ENTSCHIEDEN:** Erweiterbar über Settings-UI
- **NICHT:** Hart-codiert im Code
- **TABELLEN:** tool_categories + tool_subcategories
- **VORTEIL:** Flexibel anpassbar ohne Code-Änderung

### Dokumenten-Verwaltung
- **ENTSCHIEDEN:** Separate tool_documents Tabelle
- **NICHT:** Nur file_path in tool_master
- **GRUND:** Multiple Dokumente pro Typ, Metadaten, Historie
- **FEATURES:** Primary Flag, Upload-Tracking

---

## 🎉 Erfolgskriterien

**Das Tool Management System gilt als erfolgreich wenn:**
- ✅ Alle Werkzeuge haben definierten Lagerort mit Zustand (new/used/reground)
- ✅ Gewichtete Low Stock Alerts funktionieren zuverlässig
- ✅ Entnahme/Einlagerung mit Zustandsauswahl ist intuitiv (< 30 Sekunden)
- ✅ QR-Code Scan führt direkt zu Storage Item Detail
- ✅ Bestellprozess ist nachvollziehbar und tracebar
- ✅ Wareneingang erhöht automatisch den Bestand (condition=new)
- ✅ Integration mit Tool Lists funktioniert nahtlos
- ✅ Stock Movement Historie ist vollständig und nachvollziehbar
- ✅ Custom Fields (JSONB) werden korrekt gespeichert/angezeigt
- ✅ Wendeschneidplatten-Kompatibilität ist leicht zu pflegen
- ✅ Reports liefern verwertbare Daten (Bestandswert, Verbrauch)
- ✅ UI ist intuitiv und schnell (< 2 Sekunden Ladezeit)
- ✅ Keine Daten-Inkonsistenzen zwischen Zuständen
- ✅ Kategorien können im UI verwaltet werden (ohne Code-Änderung)
- ✅ Dokumente (Fotos, Zeichnungen) sind einfach zu uploaden/verwalten

---

---

## 🔮 Future Features & Upgrades

### Custom Fields Level 2 & 3

**Level 2 - Field Definition System:**
```
Tabelle: tool_field_definitions
- Felder im UI definieren (Name, Type, Required, Options)
- Auto-generierte Formulare
- Validierung basierend auf Definition
- Zuweisung zu Categories

Beispiel:
Category "Drilling" → Felder:
  - point_angle (number, required, options: [90, 118, 135])
  - point_type (select, options: ['standard', 'split_point', 'multi_facet'])
  - coolant_through (boolean)
```

**Level 3 - Advanced Field System:**
```
- Conditional Fields (Feld X nur wenn Y = Z)
- Field Dependencies
- Custom Validations (Regex, Min/Max)
- Field Groups
- Multi-Language Support
```

**Aufwand:** Level 2: ~8h, Level 3: ~16h  
**Priorität:** Medium (wenn Custom Fields häufig erweitert werden)

---

### Verschleiß & Defekt Tracking

**Ziel:** Ausrangierte/defekte Werkzeuge tracken für Statistik

```sql
CREATE TABLE scrapped_tools (
  id SERIAL PRIMARY KEY,
  tool_master_id INTEGER REFERENCES tool_master(id),
  condition VARCHAR(50),  -- 'new', 'used', 'reground'
  quantity DECIMAL(10,2),
  scrap_reason VARCHAR(100),
    -- 'broken', 'worn_out', 'obsolete', 'damaged'
  detailed_reason TEXT,
  scrapped_by INTEGER REFERENCES users(id),
  scrapped_at TIMESTAMP,
  cost_value DECIMAL(10,2)
);

-- Reports:
- Verschleiß-Rate pro Tool-Typ
- Kosten durch Ausschuss
- Häufigste Defekte
- Tool-Lebensdauer Statistiken
```

**Features:**
- Button "Scrap" mit Grund-Auswahl
- Verschrottungs-Historie pro Tool
- Report: Monatliche Ausschuss-Kosten
- Warnung bei hoher Ausschuss-Rate

**Aufwand:** ~6-8h  
**Priorität:** Low (Nice to have)

---

### Supplier Items List Component (Enhanced)

**Ziel:** Erweiterte Verwaltung von Items pro Lieferant mit Power-User Features

**Features:**

**1. Quick Edit / Inline Editing:**
- Direkte Bearbeitung in der Tabelle (ohne Modal)
- Click-to-Edit für Preis, Artikelnummer, Lieferzeit
- Instant Save mit visueller Bestätigung
- Undo-Funktion für letzte Änderung

**2. Bulk Operations:**
```
Bulk Edit:
- Mehrere Items auswählen (Checkbox)
- Preis ändern: +10%, -5%, oder fixer Wert
- Lieferzeit anpassen: alle auf X Tage
- Currency wechseln: alle EUR → USD
- Status ändern: Aktiv/Inaktiv toggle

Bulk Actions:
- Bulk Delete mit Bestätigung
- Bulk Set Preferred
- Bulk Export (Excel/CSV)
```

**3. Erweiterte Filter & Sortierung:**
- Live-Suche über alle Felder
- Filter: Bevorzugt, Mit/Ohne Preis, Aktiv/Inaktiv
- Multi-Sortierung (z.B. erst Kategorie, dann Preis)
- Gruppierung nach Kategorie/Preis-Range
- Saved Filter Sets

**4. Preis-Management:**
```
Preis-Historie:
- Tracking aller Preisänderungen
- Visualisierung (Chart)
- Vergleich: Aktuell vs. Vor 6 Monaten
- Preis-Alarm bei Änderung >X%

Preis-Vergleich:
- Zeige günstigsten Lieferanten pro Tool
- Zeige Preis-Spread (Min/Max/Avg)
- Empfehlungen bei besseren Alternativen
```

**5. Export & Reports:**
```
Export-Formate:
- Excel (mit Formeln & Formatierung)
- CSV (für Import in andere Systeme)
- PDF Preisliste (druckbar)

Reports:
- Gesamt-Einkaufswert nach Lieferant
- Top 10 teuerste Tools
- Durchschnittliche Lieferzeit
- Items ohne Preis/Artikelnummer
```

**6. Stock-Integration:**
- Zeige aktuellen Bestand direkt in Liste
- Low-Stock Indicator
- Quick-Order Button (erstellt Bestellung)
- Empfohlene Nachbestell-Menge berechnen

**7. Smart Features:**
```
Auto-Complete:
- Artikelnummern von anderen Tools vorschlagen
- Preis-Vorschlag basierend auf ähnlichen Tools
- Copy-Paste aus Excel/CSV

Validierung:
- Warnungen bei ungewöhnlichen Preisen
- Duplikat-Erkennung (gleicher Artikel, gleicher Lieferant)
- Vollständigkeits-Check (fehlende Pflichtfelder)
```

**UI Component Struktur:**
```
SupplierItemsList.jsx
├── SupplierItemsTable.jsx (Haupt-Tabelle)
│   ├── InlineEditCell.jsx (Editierbare Zelle)
│   ├── BulkSelectHeader.jsx (Select All Checkbox)
│   └── ItemRow.jsx (Einzelne Zeile)
├── SupplierItemsFilters.jsx (Filter-Bar)
├── BulkActionsToolbar.jsx (Bulk-Operations)
├── PriceHistoryModal.jsx (Preis-Historie)
├── ExportModal.jsx (Export-Optionen)
└── QuickOrderModal.jsx (Schnell-Bestellung)
```

**Use Cases:**
1. **Preisliste Update:** Lieferant schickt neue Preise → Bulk Edit alle Items
2. **Lieferanten-Vergleich:** Welcher Lieferant ist günstigster für Drehteile?
3. **Nachbestellung:** Low-Stock Items filtern → Bestellung erstellen
4. **Excel Export:** Preisliste für Buchhaltung exportieren
5. **Audit:** Items ohne Preis/Artikelnummer finden und ergänzen

**Technische Details:**
```javascript
// API Erweiterungen
GET /api/suppliers/:id/items?include_stock=true&include_history=true
PUT /api/supplier-items/bulk-update
POST /api/supplier-items/bulk-delete
GET /api/supplier-items/export?format=excel

// State Management
- React Query für Caching & Optimistic Updates
- Undo/Redo Stack für Bulk-Operationen
- Debounced Auto-Save bei Inline-Edit
```

**Aufwand:** ~16-20h
- Basic Inline Edit & Bulk Select: ~4h
- Filter & Sortierung: ~3h
- Preis-Historie & Charts: ~4h
- Export-Funktionen: ~3h
- Stock-Integration: ~3h
- Testing & Polish: ~3h

**Priorität:** Medium
- **Low** wenn <50 Items pro Lieferant
- **Medium** wenn >50 Items pro Lieferant
- **High** wenn häufige Preis-Updates oder Bulk-Operationen nötig

**Voraussetzungen:**
- Phase 3 Supplier Management abgeschlossen ✓
- Tool Suppliers Tab implementiert ✓

**Alternative:** 
Statt eigenem Component könnte man auch ein bestehendes Data-Grid Library nutzen (z.B. AG-Grid, TanStack Table) für schnellere Implementierung mit weniger Custom-Code.

---

### Barcode/RFID Integration

**Ziel:** Schnelle Entnahme/Einlagerung per Scanner

**Hardware:**
- Barcode-Scanner (USB/Bluetooth)
- Oder: RFID-Reader
- Etikettendrucker für QR-Codes

**Software:**
- Barcode-Scan Input Field
- Auto-Submit nach Scan
- Beep-Feedback bei Erfolg/Fehler
- Mobile-First UI für Tablet am Lagerort

**Workflow:**
```
1. User: Scan QR-Code am Lagerort
   → Öffnet Storage Item Detail
2. User: Klick "Entnehmen"
3. User: Wählt Zustand (new/used/reground)
4. User: Scan eigenes Badge (User-Auth)
5. System: Bucht automatisch aus
```

**Aufwand:** ~12-16h  
**Priorität:** Medium (große Zeitersparnis bei vielen Transaktionen)

---

### Tool Life & Usage Analytics

**Ziel:** Tracking wie lange/oft Tools im Einsatz sind

**Features:**
- Verknüpfung mit NC-Programmen: Welche Tools in welchen Jobs?
- Laufzeit-Schätzung basierend auf Zykluszeiten
- Statistik: Top 10 meistgenutzte Tools
- Einsatz-Historie: Wann wurde Tool verwendet?
- Empfehlung: "Tool T001 ist seit 6 Monaten nicht verwendet worden"

**Aufwand:** ~16-20h  
**Priorität:** Medium (erfordert Integration mit Produktion)

---

### Multi-Location Support

**Ziel:** Mehrere Standorte/Werke verwalten

**Schema:**
```sql
ALTER TABLE storage_locations ADD COLUMN site_id INTEGER REFERENCES sites(id);

CREATE TABLE sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  address TEXT,
  is_main BOOLEAN
);
```

**Features:**
- Site-Selector in Navigation
- Transfer zwischen Standorten
- Separate Low-Stock Alerts pro Standort
- Konsolidierte Berichte über alle Standorte

**Aufwand:** ~8-10h  
**Priorität:** Low (nur wenn mehrere Standorte)

---

### Tool Sets & Kits

**Ziel:** Vordefinierte Werkzeug-Sets für bestimmte Jobs

**Schema:**
```sql
CREATE TABLE tool_sets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  for_material VARCHAR(100),  -- 'Aluminum', 'Steel', 'Titanium'
  for_operation VARCHAR(100)  -- 'Roughing', 'Finishing'
);

CREATE TABLE tool_set_items (
  id SERIAL PRIMARY KEY,
  tool_set_id INTEGER REFERENCES tool_sets(id),
  tool_master_id INTEGER REFERENCES tool_master(id),
  quantity INTEGER,
  sequence INTEGER
);
```

**Use Case:**
```
Set: "Aluminium Fräsen Komplett"
  - 1x Schrupp-Fräser D16
  - 1x Schlicht-Fräser D10
  - 1x Radiusfräser R1
  - 2x Bohrer D8.5
  - 1x Gewindebohrer M10

Button: "Ganzes Set entnehmen"
```

**Aufwand:** ~10-12h  
**Priorität:** Medium (Zeitersparnis bei wiederkehrenden Jobs)

---

### External Regrinding Service Integration

**Ziel:** Nachschliff-Service tracken (extern)

**Features:**
- Status: "at_regrinding" (beim Schleifer)
- Externe Lieferanten als "Regrinding Service"
- Track: Datum rausgeschickt, Erwartete Rückkehr
- Kosten pro Nachschliff
- Regrinding-Historie pro Tool

**Workflow:**
```
1. Entnahme: condition='used', reference_type='regrinding_out'
2. Status: Tool ist "beim Schleifer"
3. Nach 2 Wochen: Rückkehr
4. Einlagerung: condition='reground', reference_type='regrinding_in'
5. Rechnung: Kosten erfassen
```

**Aufwand:** ~6-8h  
**Priorität:** Low (nur wenn häufiger Nachschliff extern)

---

## 📝 Zusammenfassung Future Features

| Feature | Aufwand | Priorität | Nutzen |
|---------|---------|-----------|--------|
| Custom Fields Level 2 | 8h | Medium | Flexibles Datenmodell |
| Custom Fields Level 3 | 16h | Low | Advanced Features |
| Verschleiß-Tracking | 6-8h | Low | Kosten-Analyse |
| Supplier Items List | 16-20h | Medium | Power-User Features, Bulk-Ops |
| Barcode/RFID | 12-16h | Medium | Schnelle Transaktionen |
| Tool Life Analytics | 16-20h | Medium | Optimierung |
| Multi-Location | 8-10h | Low | Mehrere Standorte |
| Tool Sets | 10-12h | Medium | Zeitersparnis |
| Regrinding Service | 6-8h | Low | Externes Tracking |

**Gesamtaufwand:** 98-132h (weitere ~4-5 Wochen)

---

**Letzte Aktualisierung:** 2024-11-16  
**Status:** 📋 ROADMAP KOMPLETT + Phase 3 (Supplier Management) FERTIG  
**Nächster Schritt:** Phase 4 aus Haupt-Roadmap oder weitere Tool Management Features
