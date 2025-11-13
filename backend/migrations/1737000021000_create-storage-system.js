/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================================
  // 1. STORAGE LOCATIONS (Lagerorte - Level 1)
  // ============================================================================
  pgm.createTable('storage_locations', {
    id: 'id',

    // Identifikation
    name: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Name des Lagerorts (z.B. "Werkzeugschrank WZ-01")'
    },
    code: {
      type: 'varchar(50)',
      unique: true,
      comment: 'Code/Kurzbezeichnung (z.B. "WZ-01")'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung des Lagerorts'
    },

    // Typ und Kategorie
    location_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'cabinet (Schrank), shelf_unit (Regal), room (Raum), area (Bereich)'
    },
    item_category: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'tools, fixtures, clamping_devices, measuring_equipment, consumables, mixed'
    },

    // Position
    building: {
      type: 'varchar(50)',
      comment: 'Gebäude (z.B. "Halle A")'
    },
    floor: {
      type: 'varchar(50)',
      comment: 'Etage/Stockwerk (z.B. "EG", "1. OG")'
    },
    room: {
      type: 'varchar(50)',
      comment: 'Raum/Bereich (z.B. "Fertigung", "Lager")'
    },
    position_notes: {
      type: 'text',
      comment: 'Zusätzliche Positionsangaben'
    },

    // Eigenschaften
    capacity_info: {
      type: 'text',
      comment: 'Informationen zur Kapazität'
    },
    access_restrictions: {
      type: 'text',
      comment: 'Zugriffsbeschränkungen (z.B. "Nur Schichtleiter")'
    },
    responsible_user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'Verantwortlicher User für diesen Lagerort'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Ist der Lagerort aktiv?'
    },
    notes: {
      type: 'text',
      comment: 'Allgemeine Notizen'
    },

    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der den Lagerort erstellt hat'
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

  // Indizes für storage_locations
  pgm.createIndex('storage_locations', 'name');
  pgm.createIndex('storage_locations', 'code');
  pgm.createIndex('storage_locations', 'item_category');
  pgm.createIndex('storage_locations', 'is_active');
  pgm.createIndex('storage_locations', 'responsible_user_id');

  // Check Constraint für location_type
  pgm.addConstraint('storage_locations', 'check_location_type', {
    check: "location_type IN ('cabinet', 'shelf_unit', 'room', 'area')"
  });

  // Check Constraint für item_category
  pgm.addConstraint('storage_locations', 'check_item_category', {
    check: "item_category IN ('tools', 'fixtures', 'clamping_devices', 'measuring_equipment', 'consumables', 'mixed')"
  });

  // ============================================================================
  // 2. STORAGE COMPARTMENTS (Fächer/Schubladen - Level 2)
  // ============================================================================
  pgm.createTable('storage_compartments', {
    id: 'id',

    // Hierarchie
    location_id: {
      type: 'integer',
      notNull: true,
      references: 'storage_locations',
      onDelete: 'CASCADE',
      comment: 'Zugehöriger Lagerort (Parent)'
    },

    // Identifikation
    name: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'Name des Fachs/Schublade (z.B. "Schublade 1")'
    },
    code: {
      type: 'varchar(50)',
      comment: 'Code/Kurzbezeichnung (z.B. "S1")'
    },
    description: {
      type: 'text',
      comment: 'Beschreibung des Fachs'
    },

    // Typ
    compartment_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'drawer (Schublade), compartment (Fach), bin (Behälter), section (Bereich)'
    },

    // Position/Reihenfolge
    row_number: {
      type: 'integer',
      comment: 'Zeile/Reihe (z.B. bei Grid-Layout)'
    },
    column_number: {
      type: 'integer',
      comment: 'Spalte (z.B. bei Grid-Layout)'
    },
    sequence: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Sortierreihenfolge'
    },

    // Eigenschaften
    dimensions: {
      type: 'varchar(100)',
      comment: 'Abmessungen (z.B. "50x30x10 cm")'
    },
    capacity_info: {
      type: 'text',
      comment: 'Informationen zur Kapazität'
    },

    // Status
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true,
      comment: 'Ist das Fach aktiv?'
    },
    notes: {
      type: 'text',
      comment: 'Notizen zum Fach'
    },

    // Audit
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'User der das Fach erstellt hat'
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

  // Indizes für storage_compartments
  pgm.createIndex('storage_compartments', 'location_id');
  pgm.createIndex('storage_compartments', 'name');
  pgm.createIndex('storage_compartments', ['location_id', 'sequence']);
  pgm.createIndex('storage_compartments', 'is_active');

  // Check Constraint für compartment_type
  pgm.addConstraint('storage_compartments', 'check_compartment_type', {
    check: "compartment_type IN ('drawer', 'compartment', 'bin', 'section')"
  });

  // Unique Constraint: Location + Name
  pgm.addConstraint('storage_compartments', 'unique_compartment_per_location', {
    unique: ['location_id', 'name']
  });

  // Comment auf Tabellen
  pgm.sql(`
    COMMENT ON TABLE storage_locations IS 'Lagerorte (Schränke, Regale, Räume) - Level 1 der Lagerhierarchie';
    COMMENT ON TABLE storage_compartments IS 'Fächer/Schubladen innerhalb eines Lagerorts - Level 2 der Lagerhierarchie';
  `);
};

exports.down = (pgm) => {
  // Drop in umgekehrter Reihenfolge (wegen Foreign Keys)
  pgm.dropTable('storage_compartments', { cascade: true });
  pgm.dropTable('storage_locations', { cascade: true });
};
