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

  // 5. Beispielwerkzeuge (früher hier) kommen seit 2026-10 über `npm run seed`
};

exports.down = (pgm) => {
  // Drop table with CASCADE to remove dependent objects
  pgm.dropTable('tool_master', { cascade: true });
};
