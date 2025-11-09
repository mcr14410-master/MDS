/* eslint-disable camelcase */

/**
 * MIGRATION: Tool Management System (Phase 4, Week 13)
 * 
 * Erweitert die bestehende tools Tabelle und fügt ein komplexes
 * Lagersystem mit Bestellverwaltung hinzu.
 * 
 * Neue Tabellen:
 * 1. tool_categories - Werkzeug-Kategorien (Fräser, Bohrer, etc.)
 * 2. suppliers - Lieferanten-Stammdaten
 * 3. location_cabinets - Schränke/Räume
 * 4. location_shelves - Regale in Schränken
 * 5. location_slots - Fächer in Regalen
 * 6. tool_locations - Werkzeug-Standorte (m:n)
 * 7. tool_location_history - Bewegungs-Historie
 * 8. tool_orders - Bestellungen
 * 9. tool_order_items - Bestellpositionen
 * 10. tool_images - Werkzeug-Bilder/Dokumente
 * 
 * Erweitert:
 * - tools Tabelle (neue Felder für Lifecycle, Supplier, Category)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ========================================
  // 1. TOOL CATEGORIES (Werkzeug-Kategorien)
  // ========================================
  pgm.createTable('tool_categories', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    icon: { type: 'varchar(50)' },
    color: { type: 'varchar(7)' },
    sequence: { type: 'integer', default: 0 },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 2. SUPPLIERS (Lieferanten)
  // ========================================
  pgm.createTable('suppliers', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    contact_person: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    address: { type: 'text' },
    website: { type: 'varchar(255)' },
    delivery_time_days: { type: 'integer', default: 7 },
    payment_terms: { type: 'varchar(100)' },
    notes: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 3. TOOLS ERWEITERN (neue Felder)
  // ========================================
  pgm.addColumns('tools', {
    tool_category_id: {
      type: 'integer',
      references: 'tool_categories',
      onDelete: 'SET NULL'
    },
    preferred_supplier_id: {
      type: 'integer',
      references: 'suppliers',
      onDelete: 'SET NULL'
    },
    lifecycle_status: {
      type: 'varchar(20)',
      default: 'NEW'
    },
    total_lifetime_minutes: { type: 'integer', default: 0 },
    times_reground: { type: 'integer', default: 0 },
    max_regrinds: { type: 'integer', default: 0 },
    image_url: { type: 'varchar(500)' }
  });

  // ========================================
  // 4. LOCATION CABINETS (Schränke/Räume)
  // ========================================
  pgm.createTable('location_cabinets', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    location: { type: 'varchar(255)' },
    description: { type: 'text' },
    max_shelves: { type: 'integer', default: 10 },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 5. LOCATION SHELVES (Regale)
  // ========================================
  pgm.createTable('location_shelves', {
    id: 'id',
    cabinet_id: {
      type: 'integer',
      notNull: true,
      references: 'location_cabinets',
      onDelete: 'CASCADE'
    },
    shelf_number: { type: 'integer', notNull: true },
    description: { type: 'varchar(255)' },
    max_slots: { type: 'integer', default: 20 },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique Constraint: Ein Regal-Nummer pro Schrank nur einmal
  pgm.addConstraint('location_shelves', 'location_shelves_cabinet_shelf_unique', {
    unique: ['cabinet_id', 'shelf_number']
  });

  // ========================================
  // 6. LOCATION SLOTS (Fächer/Positionen)
  // ========================================
  pgm.createTable('location_slots', {
    id: 'id',
    shelf_id: {
      type: 'integer',
      notNull: true,
      references: 'location_shelves',
      onDelete: 'CASCADE'
    },
    slot_number: { type: 'integer', notNull: true },
    description: { type: 'varchar(255)' },
    max_quantity: { type: 'integer', default: 1 },
    is_occupied: { type: 'boolean', notNull: true, default: false },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Unique Constraint: Ein Fach-Nummer pro Regal nur einmal
  pgm.addConstraint('location_slots', 'location_slots_shelf_slot_unique', {
    unique: ['shelf_id', 'slot_number']
  });

  // ========================================
  // 7. TOOL LOCATIONS (Werkzeug-Standorte)
  // ========================================
  pgm.createTable('tool_locations', {
    id: 'id',
    tool_id: {
      type: 'integer',
      notNull: true,
      references: 'tools',
      onDelete: 'CASCADE'
    },
    slot_id: {
      type: 'integer',
      notNull: true,
      references: 'location_slots',
      onDelete: 'CASCADE'
    },
    quantity: { type: 'integer', notNull: true, default: 1 },
    condition: { type: 'varchar(20)', default: 'NEW' },
    notes: { type: 'text' },
    placed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    placed_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    removed_at: { type: 'timestamp' },
    removed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 8. TOOL LOCATION HISTORY (Bewegungs-Historie)
  // ========================================
  pgm.createTable('tool_location_history', {
    id: 'id',
    tool_id: {
      type: 'integer',
      notNull: true,
      references: 'tools',
      onDelete: 'CASCADE'
    },
    from_slot_id: {
      type: 'integer',
      references: 'location_slots',
      onDelete: 'SET NULL'
    },
    to_slot_id: {
      type: 'integer',
      references: 'location_slots',
      onDelete: 'SET NULL'
    },
    quantity: { type: 'integer', notNull: true },
    reason: { type: 'varchar(50)', notNull: true },
    notes: { type: 'text' },
    moved_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    moved_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 9. TOOL ORDERS (Bestellungen)
  // ========================================
  pgm.createTable('tool_orders', {
    id: 'id',
    order_number: { type: 'varchar(100)', notNull: true, unique: true },
    supplier_id: {
      type: 'integer',
      notNull: true,
      references: 'suppliers',
      onDelete: 'RESTRICT'
    },
    order_date: { type: 'date', notNull: true },
    expected_delivery_date: { type: 'date' },
    received_date: { type: 'date' },
    status: { type: 'varchar(20)', notNull: true, default: 'REQUESTED' },
    total_cost: { type: 'decimal(10,2)', default: 0 },
    notes: { type: 'text' },
    ordered_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    received_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 10. TOOL ORDER ITEMS (Bestellpositionen)
  // ========================================
  pgm.createTable('tool_order_items', {
    id: 'id',
    order_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_orders',
      onDelete: 'CASCADE'
    },
    tool_id: {
      type: 'integer',
      notNull: true,
      references: 'tools',
      onDelete: 'RESTRICT'
    },
    quantity_ordered: { type: 'integer', notNull: true },
    quantity_received: { type: 'integer', default: 0 },
    unit_price: { type: 'decimal(10,2)', notNull: true },
    total_price: { type: 'decimal(10,2)', notNull: true },
    notes: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 11. TOOL IMAGES (Werkzeug-Bilder/Dokumente)
  // ========================================
  pgm.createTable('tool_images', {
    id: 'id',
    tool_id: {
      type: 'integer',
      notNull: true,
      references: 'tools',
      onDelete: 'CASCADE'
    },
    filename: { type: 'varchar(255)', notNull: true },
    filepath: { type: 'varchar(500)', notNull: true },
    filesize: { type: 'integer' },
    mime_type: { type: 'varchar(100)' },
    image_type: { type: 'varchar(20)', default: 'PHOTO' },
    title: { type: 'varchar(255)' },
    description: { type: 'text' },
    is_primary: { type: 'boolean', default: false },
    sequence: { type: 'integer', default: 0 },
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // ========================================
  // 12. INTEGRATION: tool_list_items erweitern
  // ========================================
  // Foreign Key zu tools hinzufügen (tool_number wird zu tool_id)
  pgm.addColumns('tool_list_items', {
    tool_id: {
      type: 'integer',
      references: 'tools',
      onDelete: 'SET NULL'
    }
  });

  // ========================================
  // INDIZES
  // ========================================
  
  // Tool Categories
  pgm.createIndex('tool_categories', 'name');
  
  // Suppliers
  pgm.createIndex('suppliers', 'name');
  pgm.createIndex('suppliers', 'is_active');
  
  // Tools - neue Felder
  pgm.createIndex('tools', 'tool_category_id');
  pgm.createIndex('tools', 'preferred_supplier_id');
  pgm.createIndex('tools', 'lifecycle_status');
  
  // Location System
  pgm.createIndex('location_cabinets', 'name');
  pgm.createIndex('location_cabinets', 'is_active');
  pgm.createIndex('location_shelves', 'cabinet_id');
  pgm.createIndex('location_shelves', ['cabinet_id', 'shelf_number']);
  pgm.createIndex('location_slots', 'shelf_id');
  pgm.createIndex('location_slots', ['shelf_id', 'slot_number']);
  pgm.createIndex('location_slots', 'is_occupied');
  
  // Tool Locations
  pgm.createIndex('tool_locations', 'tool_id');
  pgm.createIndex('tool_locations', 'slot_id');
  pgm.createIndex('tool_locations', 'is_active');
  pgm.createIndex('tool_locations', ['tool_id', 'is_active']);
  
  // Tool Location History
  pgm.createIndex('tool_location_history', 'tool_id');
  pgm.createIndex('tool_location_history', 'moved_at');
  
  // Tool Orders
  pgm.createIndex('tool_orders', 'order_number');
  pgm.createIndex('tool_orders', 'supplier_id');
  pgm.createIndex('tool_orders', 'status');
  pgm.createIndex('tool_orders', 'order_date');
  
  // Tool Order Items
  pgm.createIndex('tool_order_items', 'order_id');
  pgm.createIndex('tool_order_items', 'tool_id');
  
  // Tool Images
  pgm.createIndex('tool_images', 'tool_id');
  pgm.createIndex('tool_images', 'image_type');
  pgm.createIndex('tool_images', 'is_primary');
  
  // Tool List Items Integration
  pgm.createIndex('tool_list_items', 'tool_id');

  // ========================================
  // SEED DATA: Standard-Kategorien
  // ========================================
  pgm.sql(`
    INSERT INTO tool_categories (name, description, icon, color, sequence) VALUES
    ('Fräser', 'Schaftfräser, Planfräser, Kugelfräser', '🔩', '#3b82f6', 1),
    ('Bohrer', 'Spiralbohrer, Zentrierbohrer', '⚙️', '#10b981', 2),
    ('Gewinde', 'Gewindebohrer, Gewindefräser', '🔧', '#8b5cf6', 3),
    ('Senker', 'Kegelsenker, Plansenker', '📐', '#f59e0b', 4),
    ('Reibahle', 'Maschinen-Reibahle, Hand-Reibahle', '🔪', '#ef4444', 5),
    ('Drehmeißel', 'Außen, Innen, Stechmeißel', '🔨', '#06b6d4', 6),
    ('Messwerkzeug', 'Taster, Messtaster', '📏', '#6b7280', 7),
    ('Sonstiges', 'Andere Werkzeuge', '🛠️', '#9ca3af', 99);
  `);
};

// ========================================
// DOWN MIGRATION
// ========================================
exports.down = (pgm) => {
  // Integration rückgängig
  pgm.dropColumns('tool_list_items', ['tool_id']);
  
  // Tabellen in umgekehrter Reihenfolge löschen
  pgm.dropTable('tool_images');
  pgm.dropTable('tool_order_items');
  pgm.dropTable('tool_orders');
  pgm.dropTable('tool_location_history');
  pgm.dropTable('tool_locations');
  pgm.dropTable('location_slots');
  pgm.dropTable('location_shelves');
  pgm.dropTable('location_cabinets');
  
  // Tools Spalten entfernen
  pgm.dropColumns('tools', [
    'tool_category_id',
    'preferred_supplier_id',
    'lifecycle_status',
    'total_lifetime_minutes',
    'times_reground',
    'max_regrinds',
    'image_url'
  ]);
  
  pgm.dropTable('suppliers');
  pgm.dropTable('tool_categories');
};
