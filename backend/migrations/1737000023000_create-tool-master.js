/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. TOOL MASTER TABLE
  // ============================================================================
  pgm.createTable('tool_master', {
    id: 'id',

    // Identifikation
    tool_number: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Werkzeugnummer, z.B. T001, T002, HSK-001'
    },
    tool_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Beschreibender Name'
    },

    // Kategorisierung
    category_id: {
      type: 'integer',
      references: 'tool_categories',
      onDelete: 'SET NULL',
      comment: 'Zugehörige Kategorie'
    },
    subcategory_id: {
      type: 'integer',
      references: 'tool_subcategories',
      onDelete: 'SET NULL',
      comment: 'Zugehörige Unterkategorie'
    },

    // Tool Type & Category
    item_type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'tool',
      comment: 'tool, insert, accessory'
    },
    tool_category: {
      type: 'varchar(50)',
      notNull: true,
      default: 'standard',
      comment: 'standard, special, modified'
    },

    // Geometrie (Basis-Felder)
    diameter: {
      type: 'decimal(10,3)',
      comment: 'Durchmesser in mm'
    },
    length: {
      type: 'decimal(10,2)',
      comment: 'Länge in mm'
    },
    flutes: {
      type: 'integer',
      comment: 'Anzahl Schneiden'
    },

    // Material & Coating
    material: {
      type: 'varchar(100)',
      comment: 'z.B. HSS, HSS-E, Carbide, Ceramic'
    },
    coating: {
      type: 'varchar(100)',
      comment: 'z.B. TiN, TiAlN, AlTiN, uncoated'
    },
    substrate_grade: {
      type: 'varchar(50)',
      comment: 'z.B. K20, P25 (ISO Grade)'
    },
    hardness: {
      type: 'varchar(50)',
      comment: 'z.B. 65 HRC'
    },

    // Manufacturer
    manufacturer: {
      type: 'varchar(100)',
      comment: 'Hersteller'
    },
    manufacturer_part_number: {
      type: 'varchar(100)',
      comment: 'Herstellerteilenummer'
    },
    shop_url: {
      type: 'text',
      comment: 'Link zum Hersteller/Shop'
    },
    cost: {
      type: 'decimal(10,2)',
      comment: 'Stückpreis'
    },

    // Inserts
    uses_inserts: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Verwendet dieses Tool Wendeschneidplatten?'
    },

    // Custom Fields (Level 1 - Simple JSONB)
    custom_fields: {
      type: 'jsonb',
      comment: 'Typ-spezifische Felder als JSON'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Ist das Werkzeug aktiv?'
    },
    notes: {
      type: 'text',
      comment: 'Notizen'
    },

    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der das Werkzeug erstellt hat'
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

  // ============================================================================
  // 2. INDEXES
  // ============================================================================
  pgm.createIndex('tool_master', 'tool_number');
  pgm.createIndex('tool_master', 'category_id');
  pgm.createIndex('tool_master', 'subcategory_id');
  pgm.createIndex('tool_master', 'item_type');
  pgm.createIndex('tool_master', 'manufacturer');
  pgm.createIndex('tool_master', 'is_active');

  // ============================================================================
  // 3. CONSTRAINTS
  // ============================================================================
  pgm.addConstraint('tool_master', 'check_item_type', {
    check: "item_type IN ('tool', 'insert', 'accessory')"
  });

  pgm.addConstraint('tool_master', 'check_tool_category', {
    check: "tool_category IN ('standard', 'special', 'modified')"
  });

  // ============================================================================
  // 4. COMMENT ON TABLE
  // ============================================================================
  pgm.sql(`
    COMMENT ON TABLE tool_master IS 'Stammdaten für alle Werkzeuge, Wendeschneidplatten und Zubehör';
  `);

  // ============================================================================
  // 5. SEED DATA - Example Tools
  // ============================================================================
  pgm.sql(`
    INSERT INTO tool_master (
      tool_number, tool_name, category_id, subcategory_id,
      item_type, tool_category, diameter, length, flutes,
      material, coating, substrate_grade, manufacturer,
      manufacturer_part_number, cost, uses_inserts, custom_fields
    ) VALUES
    -- T001: Milling - End Mill (Standard HSS-E)
    (
      'T001',
      'Schaftfräser D10 Z2 HSS-E TiAlN',
      (SELECT id FROM tool_categories WHERE name = 'Milling'),
      (SELECT id FROM tool_subcategories WHERE name = 'End Mill'),
      'tool',
      'standard',
      10.0,
      100.0,
      2,
      'HSS-E',
      'TiAlN',
      NULL,
      'Garant',
      'GAR-10-HSS-TiAlN',
      45.50,
      false,
      '{"corner_radius": 0.2, "helix_angle": 30, "center_cutting": true}'::jsonb
    ),

    -- T002: Drilling - Twist Drill (Standard HSS-Co)
    (
      'T002',
      'Spiralbohrer D8.5 HSS-Co DIN338',
      (SELECT id FROM tool_categories WHERE name = 'Drilling'),
      (SELECT id FROM tool_subcategories WHERE name = 'Twist Drill'),
      'tool',
      'standard',
      8.5,
      120.0,
      NULL,
      'HSS-Co',
      'TiN',
      NULL,
      'Dormer',
      'DOR-850-HSS-Co',
      12.80,
      false,
      NULL
    ),

    -- I001: Insert - SEKT (Milling Insert)
    (
      'I001',
      'SEKT 1204 AZ TiAlN',
      (SELECT id FROM tool_categories WHERE name = 'Inserts'),
      (SELECT id FROM tool_subcategories WHERE name = 'SEKT'),
      'insert',
      'standard',
      12.0,
      NULL,
      NULL,
      'Carbide',
      'TiAlN',
      'K20',
      'Sandvik',
      'SEKT1204AZ-TN',
      8.50,
      false,
      '{"insert_shape": "SEKT", "insert_size": "1204", "nose_radius": 0.4, "cutting_edges": 4}'::jsonb
    ),

    -- T003: Threading - Thread Tap (Standard HSS-E)
    (
      'T003',
      'Gewindebohrer M10x1.5 HSS-E',
      (SELECT id FROM tool_categories WHERE name = 'Threading'),
      (SELECT id FROM tool_subcategories WHERE name = 'Thread Tap'),
      'tool',
      'standard',
      10.0,
      90.0,
      NULL,
      'HSS-E',
      'TiN',
      NULL,
      'OSG',
      'OSG-M10-1.5',
      18.90,
      false,
      '{"thread_size": "M10x1.5", "thread_type": "metric"}'::jsonb
    ),

    -- T100: Special Tool - Milling (Custom Form Cutter)
    (
      'T100',
      'Spezial-Formfräser Kontur-XY',
      (SELECT id FROM tool_categories WHERE name = 'Milling'),
      (SELECT id FROM tool_subcategories WHERE name = 'Slot Mill'),
      'tool',
      'special',
      25.0,
      150.0,
      4,
      'Carbide',
      'AlTiN',
      NULL,
      'Sonderanfertigung',
      'SPECIAL-FORM-001',
      450.00,
      false,
      '{"special_profile": "custom_contour_xy", "application": "P-2024-042"}'::jsonb
    );
  `);
};

exports.down = (pgm) => {
  // Drop table with CASCADE to remove dependent objects
  pgm.dropTable('tool_master', { cascade: true });
};
