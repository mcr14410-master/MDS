/**
 * Migration: Setup Sheet - Spannmittel & Vorrichtungen Integration
 * 
 * Erweitert Setup Sheets um Many-to-Many Zuordnungen zu:
 * - Spannmittel (clamping_devices)
 * - Vorrichtungen (fixtures)
 * 
 * Die bestehenden Freitextfelder (fixture_description, clamping_description)
 * bleiben für zusätzliche Notizen erhalten.
 */

exports.up = async (pgm) => {
  // ============================================================================
  // 1. TABELLE: setup_sheet_clamping_devices
  // ============================================================================
  pgm.createTable('setup_sheet_clamping_devices', {
    id: 'id',
    
    setup_sheet_id: {
      type: 'integer',
      notNull: true,
      references: 'setup_sheets',
      onDelete: 'CASCADE',
      comment: 'Zugehöriges Setup Sheet'
    },
    
    clamping_device_id: {
      type: 'integer',
      notNull: true,
      references: 'clamping_devices',
      onDelete: 'CASCADE',
      comment: 'Zugeordnetes Spannmittel'
    },
    
    quantity: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Anzahl benötigt'
    },
    
    notes: {
      type: 'text',
      comment: 'Zusätzliche Hinweise zur Verwendung'
    },
    
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Reihenfolge der Anzeige'
    },
    
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Unique constraint: Ein Spannmittel kann nur einmal pro Setup Sheet zugeordnet sein
  pgm.addConstraint('setup_sheet_clamping_devices', 'unique_setup_clamping', {
    unique: ['setup_sheet_id', 'clamping_device_id']
  });

  pgm.createIndex('setup_sheet_clamping_devices', 'setup_sheet_id');
  pgm.createIndex('setup_sheet_clamping_devices', 'clamping_device_id');

  // ============================================================================
  // 2. TABELLE: setup_sheet_fixtures
  // ============================================================================
  pgm.createTable('setup_sheet_fixtures', {
    id: 'id',
    
    setup_sheet_id: {
      type: 'integer',
      notNull: true,
      references: 'setup_sheets',
      onDelete: 'CASCADE',
      comment: 'Zugehöriges Setup Sheet'
    },
    
    fixture_id: {
      type: 'integer',
      notNull: true,
      references: 'fixtures',
      onDelete: 'CASCADE',
      comment: 'Zugeordnete Vorrichtung'
    },
    
    quantity: {
      type: 'integer',
      notNull: true,
      default: 1,
      comment: 'Anzahl benötigt'
    },
    
    notes: {
      type: 'text',
      comment: 'Zusätzliche Hinweise zur Verwendung'
    },
    
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Reihenfolge der Anzeige'
    },
    
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Unique constraint: Eine Vorrichtung kann nur einmal pro Setup Sheet zugeordnet sein
  pgm.addConstraint('setup_sheet_fixtures', 'unique_setup_fixture', {
    unique: ['setup_sheet_id', 'fixture_id']
  });

  pgm.createIndex('setup_sheet_fixtures', 'setup_sheet_id');
  pgm.createIndex('setup_sheet_fixtures', 'fixture_id');

  // ============================================================================
  // 3. VIEWS für einfache Abfragen
  // ============================================================================
  
  // View: Setup Sheet Spannmittel mit Details
  pgm.createView('setup_sheet_clamping_devices_view', {}, `
    SELECT 
      sscd.id,
      sscd.setup_sheet_id,
      sscd.clamping_device_id,
      sscd.quantity,
      sscd.notes,
      sscd.sort_order,
      sscd.created_at,
      cd.inventory_number,
      cd.name as clamping_device_name,
      cd.status as clamping_device_status,
      cdt.name as type_name,
      cdt.icon as type_icon,
      u.username as created_by_name
    FROM setup_sheet_clamping_devices sscd
    JOIN clamping_devices cd ON cd.id = sscd.clamping_device_id
    LEFT JOIN clamping_device_types cdt ON cdt.id = cd.type_id
    LEFT JOIN users u ON u.id = sscd.created_by
    WHERE cd.deleted_at IS NULL
  `);

  // View: Setup Sheet Vorrichtungen mit Details
  pgm.createView('setup_sheet_fixtures_view', {}, `
    SELECT 
      ssf.id,
      ssf.setup_sheet_id,
      ssf.fixture_id,
      ssf.quantity,
      ssf.notes,
      ssf.sort_order,
      ssf.created_at,
      f.fixture_number,
      f.name as fixture_name,
      f.status as fixture_status,
      ft.name as type_name,
      ft.icon as type_icon,
      u.username as created_by_name
    FROM setup_sheet_fixtures ssf
    JOIN fixtures f ON f.id = ssf.fixture_id
    LEFT JOIN fixture_types ft ON ft.id = f.type_id
    LEFT JOIN users u ON u.id = ssf.created_by
    WHERE f.deleted_at IS NULL
  `);

  // ============================================================================
  // 4. COMMENTS
  // ============================================================================
  pgm.sql(`
    COMMENT ON TABLE setup_sheet_clamping_devices IS 'Zuordnung Spannmittel zu Setup Sheets (Many-to-Many)';
    COMMENT ON TABLE setup_sheet_fixtures IS 'Zuordnung Vorrichtungen zu Setup Sheets (Many-to-Many)';
  `);
};

exports.down = async (pgm) => {
  pgm.dropView('setup_sheet_fixtures_view', { ifExists: true });
  pgm.dropView('setup_sheet_clamping_devices_view', { ifExists: true });
  pgm.dropTable('setup_sheet_fixtures');
  pgm.dropTable('setup_sheet_clamping_devices');
};
