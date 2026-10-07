# Lagerverwaltung - Zwei-Systeme-Architektur

**Erstellt:** 2025-12-05  
**Status:** Konzept / Diskussionsgrundlage  
**Ziel:** Klare Trennung zwischen Mengen-Artikeln und Einzelstück-Assets

---

## 1. Übersicht

### Grundidee: Zwei unterschiedliche Domänen

Die Lagerverwaltung hat zwei fundamental unterschiedliche Anwendungsfälle:

| Aspekt | INVENTORY (Mengen) | ASSETS (Einzelstücke) |
|--------|-------------------|----------------------|
| **Frage** | "Wie viele haben wir?" | "Wo ist dieses eine Gerät?" |
| **Tracking** | Summe pro Lagerort | Jedes Stück einzeln |
| **Buchung** | +/- Menge | Status-Wechsel |
| **Beispiel** | 50 Fräser, 200L Kühlmittel | Messschieber SN-12345 |
| **Alerts** | Low-Stock, MHD | Kalibrierung fällig |
| **Bestellung** | Ja (Nachbestellung) | Selten (Neuanschaffung) |

### Architektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    STORAGE LOCATIONS                            │
│              (Lagerorte + Fächer - GEMEINSAM)                   │
│                                                                 │
│   storage_locations ──► storage_compartments                    │
│   (Schrank, Regal)      (Fach, Schublade)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────┐
│     INVENTORY SYSTEM     │    │      ASSET SYSTEM        │
│     (Mengenbasiert)      │    │    (Einzelstücke)        │
│         ── NEU ──        │    │   ── BESTEHT SCHON ──    │
├──────────────────────────┤    ├──────────────────────────┤
│ □ Tools (Werkzeuge)      │    │ ☑ Messmittel             │
│ □ Consumables (VM)       │    │ ☑ Fixtures               │
│ □ Raw Materials (RM)     │    │ ☑ Spannmittel            │
│ □ Standard Parts (NT)    │    │                          │
├──────────────────────────┤    ├──────────────────────────┤
│ inventory_items          │    │ measuring_equipment      │
│ inventory_stock          │    │ fixtures                 │
│ inventory_transactions   │    │ clamping_devices         │
├──────────────────────────┤    ├──────────────────────────┤
│ • quantity (Menge)       │    │ • status (Enum)          │
│ • Buchungen (+/-)        │    │ • checkout/return        │
│ • Chargen & MHD          │    │ • Kalibrierung           │
│ • Bestellsystem          │    │ • Inventar-Nummern       │
│ • Low-Stock Alerts       │    │ • 1 Stück = 1 Datensatz  │
│ • Expiry Alerts          │    │                          │
└──────────────────────────┘    └──────────────────────────┘
```

### Was ändert sich?

| Bereich | Aktuell | Neu |
|---------|---------|-----|
| **Tools** | tool_master + storage_items | → inventory_items (type='tool') |
| **Consumables** | consumables + consumable_stock | → inventory_items (type='consumable') |
| **Rohmaterial** | (geplant separat) | → inventory_items (type='raw_material') |
| **Normteile** | (geplant separat) | → inventory_items (type='standard_part') |
| **Messmittel** | measuring_equipment | ✓ Bleibt unverändert |
| **Fixtures** | fixtures | ✓ Bleibt unverändert |
| **Spannmittel** | clamping_devices | ✓ Bleibt unverändert |
| **Bestellsystem** | 4+ FK-Spalten | → 1 FK (inventory_item_id) |

---

## 2. Datenbankschema - Inventory System

### 2.1 Kategorien

```sql
-- Kategorien für alle Inventory-Typen
CREATE TABLE inventory_categories (
    id SERIAL PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL,  -- 'tool', 'consumable', 'raw_material', 'standard_part'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT 'gray',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(item_type, name)
);

-- Beispiel-Daten
INSERT INTO inventory_categories (item_type, name, color) VALUES
    -- Tools
    ('tool', 'Fräser', 'blue'),
    ('tool', 'Bohrer', 'blue'),
    ('tool', 'Wendeschneidplatten', 'blue'),
    ('tool', 'Gewindewerkzeuge', 'blue'),
    -- Consumables
    ('consumable', 'Kühlschmierstoffe', 'amber'),
    ('consumable', 'Reiniger', 'amber'),
    ('consumable', 'Öle & Fette', 'amber'),
    ('consumable', 'Schleifmittel', 'amber'),
    -- Raw Materials
    ('raw_material', 'Aluminium', 'green'),
    ('raw_material', 'Stahl', 'green'),
    ('raw_material', 'Titan', 'green'),
    ('raw_material', 'Kunststoff', 'green'),
    -- Standard Parts
    ('standard_part', 'Schrauben', 'purple'),
    ('standard_part', 'Muttern', 'purple'),
    ('standard_part', 'Stifte & Bolzen', 'purple'),
    ('standard_part', 'O-Ringe & Dichtungen', 'purple');
```

### 2.2 Haupt-Tabelle: inventory_items

```sql
-- Zentrale Artikeltabelle für alle mengenbasierten Lagertypen
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    
    -- Typ-Unterscheidung
    item_type VARCHAR(50) NOT NULL,  -- 'tool', 'consumable', 'raw_material', 'standard_part'
    
    -- Gemeinsame Stammdaten
    name VARCHAR(255) NOT NULL,
    article_number VARCHAR(100),
    description TEXT,
    category_id INTEGER REFERENCES inventory_categories(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    manufacturer VARCHAR(100),
    
    -- Einheiten & Mengen
    base_unit VARCHAR(20) NOT NULL DEFAULT 'Stück',  -- Stück, Liter, kg, m, etc.
    min_quantity DECIMAL(10,2) DEFAULT 0,
    
    -- Gebinde (optional, hauptsächlich für Consumables)
    package_type VARCHAR(50),        -- Kanister, Karton, Palette
    package_size DECIMAL(10,2),      -- Inhalt pro Gebinde
    
    -- Preise
    unit_price DECIMAL(10,2),        -- Preis pro base_unit
    package_price DECIMAL(10,2),     -- Preis pro Gebinde
    
    -- Bild
    image_path VARCHAR(500),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX idx_inv_items_type ON inventory_items(item_type);
CREATE INDEX idx_inv_items_category ON inventory_items(category_id);
CREATE INDEX idx_inv_items_supplier ON inventory_items(supplier_id);
CREATE INDEX idx_inv_items_article ON inventory_items(article_number);
CREATE INDEX idx_inv_items_active ON inventory_items(is_active) WHERE is_active = true;
```

### 2.3 Typ-spezifische Erweiterungen (1:1)

```sql
-- ═══════════════════════════════════════════════════════════════
-- WERKZEUGE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE inventory_tool_details (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Geometrie
    tool_type VARCHAR(50),           -- Schaftfräser, Bohrer, WSP, etc.
    diameter DECIMAL(10,3),          -- mm
    length DECIMAL(10,2),            -- mm
    cutting_length DECIMAL(10,2),    -- mm
    shank_diameter DECIMAL(10,3),    -- mm
    number_of_flutes INTEGER,
    helix_angle DECIMAL(5,2),
    corner_radius DECIMAL(6,3),
    
    -- Material & Beschichtung
    material VARCHAR(50),            -- VHM, HSS, PKD, CBN
    coating VARCHAR(50),             -- TiAlN, TiN, DLC, AlCrN
    
    -- Eigenschaften
    coolant_through BOOLEAN DEFAULT false,
    max_regrinds INTEGER DEFAULT 0,
    expected_tool_life_minutes INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- VERBRAUCHSMATERIAL
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE inventory_consumable_details (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Eigenschaften
    consumable_type VARCHAR(50),     -- Kühlmittel, Öl, Reiniger
    concentration_percent DECIMAL(5,2),
    viscosity VARCHAR(50),
    
    -- Gefahrstoffe
    is_hazardous BOOLEAN DEFAULT false,
    hazard_statements TEXT[],        -- H-Sätze
    ghs_symbols TEXT[],              -- GHS01-GHS09
    signal_word VARCHAR(20),         -- Gefahr, Achtung
    
    -- Haltbarkeit
    has_expiry BOOLEAN DEFAULT false,
    shelf_life_months INTEGER,
    storage_temp_min INTEGER,
    storage_temp_max INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- ROHMATERIAL
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE inventory_raw_material_details (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Material
    material_group VARCHAR(50),      -- Aluminium, Stahl, Titan
    material_grade VARCHAR(50),      -- EN AW-7075, 1.4301, Ti6Al4V
    material_standard VARCHAR(50),   -- DIN, EN, ASTM
    density DECIMAL(6,3),            -- g/cm³
    
    -- Form & Abmessungen (Standard)
    form VARCHAR(50),                -- Rundstab, Flachstab, Platte, Rohr
    standard_diameter DECIMAL(10,2), -- mm (für Rundmaterial)
    standard_width DECIMAL(10,2),    -- mm (für Flachmaterial)
    standard_height DECIMAL(10,2),   -- mm (für Flachmaterial)
    standard_length DECIMAL(10,2),   -- mm (Standard-Länge)
    wall_thickness DECIMAL(10,2),    -- mm (für Rohre)
    
    -- Zertifikate
    requires_certificate BOOLEAN DEFAULT false,
    certificate_type VARCHAR(50),    -- 3.1, 3.2
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- NORMTEILE
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE inventory_standard_part_details (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL UNIQUE REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    -- Norm
    din_number VARCHAR(50),          -- DIN 912
    iso_number VARCHAR(50),          -- ISO 4762
    standard_designation VARCHAR(100),
    
    -- Maße
    thread_size VARCHAR(20),         -- M6, M8x1
    length DECIMAL(10,2),            -- mm
    width_across_flats DECIMAL(10,2),-- Schlüsselweite
    
    -- Material & Festigkeit
    material VARCHAR(50),            -- A2, A4, 8.8, 10.9
    strength_class VARCHAR(20),
    surface_finish VARCHAR(50),      -- verzinkt, blank
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2.4 Bestand

```sql
-- Gemeinsame Bestandstabelle
CREATE TABLE inventory_stock (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    compartment_id INTEGER NOT NULL REFERENCES storage_compartments(id),
    
    -- Bestand
    quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10,3) DEFAULT 0,
    
    -- Charge (für Consumables, Rohmaterial)
    batch_number VARCHAR(100),
    
    -- Haltbarkeit
    expiry_date DATE,
    production_date DATE,
    
    -- Für Rohmaterial: Tatsächliche Abmessungen dieses Stücks
    -- (kann von Standard abweichen, z.B. angeschnittene Stange)
    actual_length DECIMAL(10,2),
    actual_width DECIMAL(10,2),
    actual_height DECIMAL(10,2),
    actual_diameter DECIMAL(10,2),
    
    -- Zertifikat (Rohmaterial)
    certificate_number VARCHAR(100),
    certificate_path VARCHAR(500),
    
    -- Status
    status VARCHAR(20) DEFAULT 'available',  -- available, reserved, quarantine
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique: Ein Artikel kann mehrfach im Fach sein (verschiedene Chargen)
    UNIQUE(inventory_item_id, compartment_id, COALESCE(batch_number, ''))
);

CREATE INDEX idx_inv_stock_item ON inventory_stock(inventory_item_id);
CREATE INDEX idx_inv_stock_compartment ON inventory_stock(compartment_id);
CREATE INDEX idx_inv_stock_expiry ON inventory_stock(expiry_date) WHERE expiry_date IS NOT NULL;
```

### 2.5 Transaktionen

```sql
CREATE TABLE inventory_transactions (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id),
    stock_id INTEGER REFERENCES inventory_stock(id),
    compartment_id INTEGER REFERENCES storage_compartments(id),
    
    -- Typ
    transaction_type VARCHAR(20) NOT NULL,
    -- 'receipt'      Wareneingang
    -- 'issue'        Entnahme
    -- 'adjustment'   Korrektur/Inventur
    -- 'transfer_out' Umlagerung (Quelle)
    -- 'transfer_in'  Umlagerung (Ziel)
    -- 'scrap'        Verschrottung
    -- 'maintenance'  Wartungsverbrauch
    
    -- Menge (positiv = Zugang, negativ = Abgang)
    quantity DECIMAL(10,3) NOT NULL,
    quantity_before DECIMAL(10,3),
    quantity_after DECIMAL(10,3),
    
    -- Referenz
    reference_type VARCHAR(50),      -- 'purchase_order', 'maintenance_task', etc.
    reference_id INTEGER,
    batch_number VARCHAR(100),
    
    -- Transfer-Verknüpfung
    related_transaction_id INTEGER REFERENCES inventory_transactions(id),
    
    -- Details
    reason TEXT,
    unit_cost DECIMAL(10,2),
    
    performed_by INTEGER REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_trans_item ON inventory_transactions(inventory_item_id);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_trans_date ON inventory_transactions(performed_at);
```

### 2.6 Dokumente

```sql
CREATE TABLE inventory_documents (
    id SERIAL PRIMARY KEY,
    inventory_item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    
    document_type VARCHAR(50) NOT NULL,
    -- 'datasheet', 'safety_datasheet', 'certificate', 'drawing', 'image', 'manual'
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    
    version VARCHAR(20),
    valid_until DATE,
    
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_inv_docs_item ON inventory_documents(inventory_item_id);
```

### 2.7 Bestellsystem (vereinfacht!)

```sql
-- VORHER: 4+ Spalten
-- storage_item_id, consumable_id, raw_material_id, standard_part_id, item_type

-- NACHHER: 1 Spalte
ALTER TABLE purchase_order_items 
    ADD COLUMN inventory_item_id INTEGER REFERENCES inventory_items(id);

-- Später: Alte Spalten entfernen
-- ALTER TABLE purchase_order_items 
--     DROP COLUMN storage_item_id,
--     DROP COLUMN consumable_id,
--     DROP COLUMN item_type;
```

### 2.8 Views

```sql
-- Gesamtbestand pro Artikel
CREATE OR REPLACE VIEW inventory_stock_summary AS
SELECT 
    i.id,
    i.item_type,
    i.name,
    i.article_number,
    i.base_unit,
    i.min_quantity,
    ic.name AS category_name,
    ic.color AS category_color,
    COALESCE(SUM(s.quantity), 0) AS total_stock,
    COALESCE(SUM(s.reserved_quantity), 0) AS reserved_stock,
    COUNT(DISTINCT s.compartment_id) AS location_count
FROM inventory_items i
LEFT JOIN inventory_stock s ON s.inventory_item_id = i.id AND s.status = 'available'
LEFT JOIN inventory_categories ic ON ic.id = i.category_id
WHERE i.is_active = true
GROUP BY i.id, ic.name, ic.color;

-- Low-Stock Alerts
CREATE OR REPLACE VIEW inventory_low_stock_alerts AS
SELECT * FROM inventory_stock_summary
WHERE min_quantity > 0 AND total_stock < min_quantity
ORDER BY (min_quantity - total_stock) DESC;

-- Expiry Alerts (90 Tage)
CREATE OR REPLACE VIEW inventory_expiry_alerts AS
SELECT 
    i.id AS inventory_item_id,
    i.item_type,
    i.name,
    s.id AS stock_id,
    s.batch_number,
    s.quantity,
    s.expiry_date,
    s.expiry_date - CURRENT_DATE AS days_until_expiry,
    sl.name AS location_name,
    sc.name AS compartment_name
FROM inventory_stock s
JOIN inventory_items i ON i.id = s.inventory_item_id
JOIN storage_compartments sc ON sc.id = s.compartment_id
JOIN storage_locations sl ON sl.id = sc.location_id
WHERE s.expiry_date IS NOT NULL
  AND s.expiry_date <= CURRENT_DATE + INTERVAL '90 days'
  AND s.quantity > 0
ORDER BY s.expiry_date ASC;
```

---

## 3. Backend-Struktur

### 3.1 Controller (einer für alle!)

```
backend/src/controllers/
├── inventoryController.js           # CRUD für inventory_items
├── inventoryStockController.js      # Stock-Buchungen
├── inventoryCategoriesController.js # Kategorien
├── inventoryDocumentsController.js  # Dokumente
└── inventoryAlertsController.js     # Low-Stock, Expiry
```

### 3.2 Routes

```javascript
// routes/inventoryRoutes.js
router.get('/',                    getItems);        // ?type=tool&category_id=5
router.get('/:id',                 getItemById);     // inkl. Details
router.post('/',                   createItem);
router.put('/:id',                 updateItem);
router.delete('/:id',              deleteItem);

// Stock
router.get('/:id/stock',           getStock);
router.post('/:id/stock',          createStock);
router.post('/:id/stock/:stockId/book', bookTransaction);

// Documents
router.get('/:id/documents',       getDocuments);
router.post('/:id/documents',      uploadDocument);

// Categories (alle Typen)
router.get('/categories',          getCategories);   // ?type=consumable
router.post('/categories',         createCategory);

// Alerts
router.get('/alerts/low-stock',    getLowStockAlerts);
router.get('/alerts/expiry',       getExpiryAlerts);
```

### 3.3 Beispiel: getItemById mit Details

```javascript
exports.getItemById = async (req, res) => {
  const { id } = req.params;
  
  // Basis-Daten
  const item = await pool.query(`
    SELECT i.*, ic.name AS category_name, s.name AS supplier_name
    FROM inventory_items i
    LEFT JOIN inventory_categories ic ON ic.id = i.category_id
    LEFT JOIN suppliers s ON s.id = i.supplier_id
    WHERE i.id = $1
  `, [id]);
  
  if (!item.rows[0]) return res.status(404).json({ error: 'Nicht gefunden' });
  
  const result = item.rows[0];
  
  // Typ-spezifische Details dynamisch laden
  const detailsTable = {
    'tool': 'inventory_tool_details',
    'consumable': 'inventory_consumable_details',
    'raw_material': 'inventory_raw_material_details',
    'standard_part': 'inventory_standard_part_details'
  }[result.item_type];
  
  if (detailsTable) {
    const details = await pool.query(
      `SELECT * FROM ${detailsTable} WHERE inventory_item_id = $1`, [id]
    );
    result.details = details.rows[0] || null;
  }
  
  res.json(result);
};
```

---

## 4. Frontend-Struktur

### 4.1 Store

```javascript
// stores/inventoryStore.js
export const useInventoryStore = create((set, get) => ({
  items: [],
  currentItem: null,
  categories: [],
  loading: false,
  
  // Filter
  filters: { type: null, category_id: null, search: '' },
  
  // Aktionen (für ALLE Typen!)
  fetchItems: async (type) => { ... },
  fetchItemById: async (id) => { ... },
  createItem: async (data) => { ... },
  updateItem: async (id, data) => { ... },
  deleteItem: async (id) => { ... },
  
  // Stock
  bookStock: async (itemId, stockId, data) => { ... },
  
  // Categories
  fetchCategories: async (type) => { ... },
}));
```

### 4.2 Komponenten

```
frontend/src/
├── pages/
│   ├── InventoryPage.jsx            # Tabs: Tools | VM | RM | NT
│   └── InventoryDetailPage.jsx      # Gemeinsame Detail-Seite
│
├── components/inventory/
│   ├── InventoryList.jsx            # Gemeinsame Liste
│   ├── InventoryForm.jsx            # Gemeinsames Formular
│   ├── InventoryStockTab.jsx        # Bestand & Buchungen
│   ├── InventoryDocumentsTab.jsx    # Dokumente
│   ├── InventoryHistoryTab.jsx      # Transaktions-Historie
│   │
│   ├── details/                     # Typ-spezifische Formulare
│   │   ├── ToolDetailsForm.jsx
│   │   ├── ConsumableDetailsForm.jsx
│   │   ├── RawMaterialDetailsForm.jsx
│   │   └── StandardPartDetailsForm.jsx
│   │
│   └── shared/
│       ├── StockBookingModal.jsx    # Buchungs-Dialog
│       ├── StockCard.jsx            # Bestand-Karte
│       └── CategoryBadge.jsx        # Kategorie-Badge
```

### 4.3 InventoryPage mit Tabs

```jsx
const tabs = [
  { id: 'tool', label: 'Werkzeuge', icon: Wrench, color: 'blue' },
  { id: 'consumable', label: 'Verbrauchsmat.', icon: Droplets, color: 'amber' },
  { id: 'raw_material', label: 'Rohmaterial', icon: Layers, color: 'green' },
  { id: 'standard_part', label: 'Normteile', icon: Cog, color: 'purple' },
];

// Gemeinsame Liste, gemeinsame Filter, gemeinsame Aktionen
// Nur item_type als Parameter unterscheidet
```

---

## 5. Asset-System (BLEIBT UNVERÄNDERT)

Diese Tabellen/Module bleiben wie sie sind:

| Modul | Tabelle | Besonderheiten |
|-------|---------|----------------|
| **Messmittel** | measuring_equipment | Checkout/Return, Kalibrierung, Verfügbarkeit |
| **Fixtures** | fixtures | Status, Inventar-Nummer, Wartung |
| **Spannmittel** | clamping_devices | Status, Inventar-Nummer |

**Keine Änderungen nötig** - das System funktioniert bereits gut für Einzelstück-Tracking.

### Lagerort als gemeinsame Basis

```sql
-- Ein Fach kann BEIDES enthalten:
storage_compartments
  │
  ├── inventory_stock            (Mengen: Tools, VM, RM, NT)
  │     └── quantity = 50
  │
  ├── measuring_equipment_storage (Asset: Einzelstück)
  │     └── equipment_id = 123
  │
  ├── fixture_storage            (Asset: Einzelstück)
  │     └── fixture_id = 456
  │
  └── clamping_device_storage    (Asset: Einzelstück)
        └── device_id = 789
```

---

## 6. Migration

### 6.1 Schrittplan

```
Phase 1: Vorbereitung (1h)
├── Neue Tabellen erstellen (inventory_*)
├── Kategorien anlegen
└── Views erstellen

Phase 2: Consumables migrieren (2h)
├── consumables → inventory_items (type='consumable')
├── consumable_categories → inventory_categories  
├── consumable_stock → inventory_stock
├── consumable_transactions → inventory_transactions
└── consumable_documents → inventory_documents

Phase 3: Tools migrieren (3h)
├── tool_master → inventory_items (type='tool')
├── storage_items → inventory_stock
└── tool_transactions → inventory_transactions

Phase 4: Bestellsystem anpassen (2h)
├── purchase_order_items.inventory_item_id füllen
├── Backend anpassen
└── Frontend anpassen

Phase 5: Frontend umstellen (6h)
├── Neue InventoryPage mit Tabs
├── inventoryStore erstellen
├── Gemeinsame Komponenten
└── Typ-spezifische Detail-Forms

Phase 6: Cleanup (1h)
├── Alte Tabellen archivieren
├── Alte Frontend-Komponenten entfernen
└── Nach 30 Tagen: Alte Tabellen löschen
```

### 6.2 Beispiel: Consumables migrieren

```sql
-- 1. Kategorien übertragen
INSERT INTO inventory_categories (item_type, name, color, description)
SELECT 'consumable', name, color, description 
FROM consumable_categories;

-- 2. Items übertragen
INSERT INTO inventory_items (
  item_type, name, article_number, description, category_id, 
  supplier_id, manufacturer, base_unit, min_quantity,
  package_type, package_size, unit_price, package_price,
  image_path, is_active, notes, created_at, created_by
)
SELECT 
  'consumable', c.name, c.article_number, c.description,
  (SELECT ic.id FROM inventory_categories ic 
   WHERE ic.item_type = 'consumable' 
   AND ic.name = (SELECT cc.name FROM consumable_categories cc WHERE cc.id = c.category_id)),
  c.supplier_id, c.manufacturer, c.base_unit, c.min_quantity,
  c.package_type, c.package_size, c.unit_price, c.package_price,
  c.image_path, c.is_active, c.notes, c.created_at, c.created_by
FROM consumables c;

-- 3. Details übertragen
INSERT INTO inventory_consumable_details (
  inventory_item_id, consumable_type, is_hazardous, has_expiry, shelf_life_months
)
SELECT 
  (SELECT ii.id FROM inventory_items ii 
   WHERE ii.item_type = 'consumable' AND ii.article_number = c.article_number),
  c.consumable_type, c.is_hazardous, c.has_expiry, c.shelf_life_months
FROM consumables c;

-- 4. Stock übertragen
INSERT INTO inventory_stock (
  inventory_item_id, compartment_id, quantity, batch_number, expiry_date
)
SELECT 
  (SELECT ii.id FROM inventory_items ii 
   WHERE ii.item_type = 'consumable' AND ii.article_number = c.article_number),
  cs.compartment_id, cs.quantity, cs.batch_number, cs.expiry_date
FROM consumable_stock cs
JOIN consumables c ON c.id = cs.consumable_id;

-- 5. Transaktionen, Dokumente analog...
```

---

## 7. Aufwandsschätzung

### Einmalige Umstellung

| Aufgabe | Stunden |
|---------|---------|
| DB Schema + Views | 2h |
| Migration Consumables | 2h |
| Migration Tools | 3h |
| Backend Controller | 4h |
| Frontend Store + Pages | 6h |
| Bestellsystem anpassen | 2h |
| Testing & Bugfixes | 3h |
| **Gesamt** | **~22h** |

### Pro neue Kategorie (danach)

| Aufgabe | Stunden |
|---------|---------|
| Kategorien anlegen | 0.5h |
| Detail-Tabelle (SQL) | 0.5h |
| Detail-Form (React) | 2h |
| Testing | 1h |
| **Gesamt** | **~4h** |

### Vergleich: ROI

| Szenario | Aktuell (separat) | Generisch |
|----------|-------------------|-----------|
| 2 Kategorien (Tools, VM) | Schon implementiert | 22h Umbau |
| +1 Kategorie (RM) | +25h = 25h | +4h = 26h |
| +2 Kategorien (RM, NT) | +50h = 50h | +8h = 30h |
| **Break-even** | - | **Bei 3. Kategorie** |

→ Ab der 3. Kategorie (Rohmaterial) spart das generische System Zeit!

---

## 8. Zusammenfassung

### Zwei Systeme, klare Trennung

| System | Kategorien | Logik |
|--------|------------|-------|
| **INVENTORY** | Tools, Consumables, Rohmaterial, Normteile | Mengen, Buchungen, Bestellungen |
| **ASSETS** | Messmittel, Fixtures, Spannmittel | Einzelstücke, Status, Checkout |

### Gemeinsame Basis

- **storage_locations** + **storage_compartments** für beide Systeme
- Ein Fach kann sowohl Inventory-Stock als auch Assets enthalten

### Vorteile

1. ✅ **Klare Domänen:** Mengen ≠ Einzelstücke
2. ✅ **Weniger Code:** Ein Controller/Store/Page für 4 Kategorien
3. ✅ **Einfache Erweiterung:** +4h statt +25h pro Kategorie
4. ✅ **Einheitliche UX:** Gleiche Bedienung für alle Mengen-Artikel
5. ✅ **Assets bleiben:** Kein Umbau für funktionierende Module
6. ✅ **Bestellsystem simpel:** Eine FK-Spalte statt vier

### Nächste Schritte

1. [ ] Konzept reviewen
2. [ ] Test-Branch erstellen: `feature/inventory-system`
3. [ ] DB-Schema aufsetzen (ohne Migration)
4. [ ] Einen Controller als PoC
5. [ ] Entscheidung: Vollständige Migration?

---

*Dokument für MDS-Projekt. Stand: 2025-12-05*
