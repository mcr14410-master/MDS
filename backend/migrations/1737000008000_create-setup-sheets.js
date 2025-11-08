/**
 * Migration: Setup Sheets & Photos
 * 
 * Setup Sheets = Einrichteblätter für Operationen
 * - Maschine, Teil, Operation, Programm
 * - Nullpunkt (steuerungsspezifisch)
 * - Material-Info
 * - Anweisungen, Warnungen
 * - Fotos (1-6)
 * - Spannmittel/Vorrichtungen (später DB-Verknüpfung)
 */

exports.up = async (pgm) => {
  // ============================================================================
  // TABLE: setup_sheets
  // ============================================================================
  pgm.createTable('setup_sheets', {
    id: 'id',
    
    // ========== Relations ==========
    operation_id: {
      type: 'integer',
      notNull: true,
      references: 'operations',
      onDelete: 'CASCADE'
    },
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'RESTRICT'
    },
    program_id: {
      type: 'integer',
      notNull: false,
      references: 'programs',
      onDelete: 'SET NULL',
      comment: 'Verknüpfung zur Programm-Version'
    },
    
    // ========== Asset Relations (später) ==========
    fixture_id: {
      type: 'integer',
      notNull: false,
      comment: 'Vorrichtung (später FK zu fixtures)'
    },
    clamping_device_id: {
      type: 'integer',
      notNull: false,
      comment: 'Spannmittel (später FK zu clamping_devices)'
    },
    
    // ========== Temporary Text Fields ==========
    fixture_description: {
      type: 'text',
      notNull: false,
      comment: 'Vorrichtung Freitext (bis fixtures Tabelle existiert)'
    },
    clamping_description: {
      type: 'text',
      notNull: false,
      comment: 'Spannmittel Freitext (bis clamping_devices Tabelle existiert)'
    },
    
    // ========== Nullpunkt / WCS (steuerungsspezifisch) ==========
    control_type: {
      type: 'varchar(50)',
      notNull: false,
      comment: 'heidenhain, siemens, fanuc, haas, mazatrol'
    },
    preset_number: {
      type: 'integer',
      notNull: false,
      comment: 'Preset-Nummer (Heidenhain: 1-99)'
    },
    wcs_number: {
      type: 'varchar(10)',
      notNull: false,
      comment: 'WCS (Fanuc/Siemens: G54-G59)'
    },
    wcs_x: {
      type: 'numeric(10,3)',
      notNull: false,
      comment: 'X-Koordinate des Nullpunkts'
    },
    wcs_y: {
      type: 'numeric(10,3)',
      notNull: false,
      comment: 'Y-Koordinate des Nullpunkts'
    },
    wcs_z: {
      type: 'numeric(10,3)',
      notNull: false,
      comment: 'Z-Koordinate des Nullpunkts'
    },
    reference_point: {
      type: 'text',
      notNull: false,
      comment: 'Beschreibung des Referenzpunkts (z.B. "Oberkante Rohteil, Mitte Bohrung")'
    },
    
    // ========== Material-Info ==========
    raw_material_dimensions: {
      type: 'varchar(100)',
      notNull: false,
      comment: 'Rohmaß (z.B. "100x50x20")'
    },
    material_specification: {
      type: 'varchar(100)',
      notNull: false,
      comment: 'Material-Spezifikation (z.B. "AlMgSi1 F22")'
    },
    
    // ========== Anweisungen ==========
    setup_instructions: {
      type: 'text',
      notNull: false,
      comment: 'Schritt-für-Schritt Einricht-Anweisungen'
    },
    special_notes: {
      type: 'text',
      notNull: false,
      comment: 'Besonderheiten, Warnungen, kritische Hinweise'
    },
    
    // ========== Workflow ==========
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'draft',
      comment: 'draft, review, approved, active, archived'
    },
    
    // ========== Version (später) ==========
    version_number: {
      type: 'varchar(20)',
      notNull: false,
      default: '1.0',
      comment: 'Version (vorerst einfach, später erweitern)'
    },
    
    // ========== Audit ==========
    created_by: {
      type: 'integer',
      notNull: true,
      references: 'users'
    },
    updated_by: {
      type: 'integer',
      notNull: false,
      references: 'users'
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

  // Indexes
  pgm.createIndex('setup_sheets', 'operation_id');
  pgm.createIndex('setup_sheets', 'machine_id');
  pgm.createIndex('setup_sheets', 'program_id');
  pgm.createIndex('setup_sheets', 'status');
  pgm.createIndex('setup_sheets', 'created_by');

  // ============================================================================
  // TABLE: setup_sheet_photos
  // ============================================================================
  pgm.createTable('setup_sheet_photos', {
    id: 'id',
    
    // ========== Relations ==========
    setup_sheet_id: {
      type: 'integer',
      notNull: true,
      references: 'setup_sheets',
      onDelete: 'CASCADE'
    },
    
    // ========== File Info ==========
    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Relativer Pfad zur Datei'
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original-Dateiname'
    },
    file_size: {
      type: 'integer',
      notNull: true,
      comment: 'Dateigröße in Bytes'
    },
    mime_type: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'MIME-Type (image/jpeg, image/png)'
    },
    
    // ========== Metadata ==========
    caption: {
      type: 'text',
      notNull: false,
      comment: 'Beschreibung/Caption des Fotos'
    },
    photo_type: {
      type: 'varchar(50)',
      notNull: false,
      default: 'general',
      comment: 'general, cam_screenshot, real_photo, fixture, clamping, tool_setup'
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Reihenfolge der Anzeige'
    },
    
    // ========== Audit ==========
    uploaded_by: {
      type: 'integer',
      notNull: true,
      references: 'users'
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indexes
  pgm.createIndex('setup_sheet_photos', 'setup_sheet_id');
  pgm.createIndex('setup_sheet_photos', 'sort_order');
  pgm.createIndex('setup_sheet_photos', 'uploaded_by');

  // ============================================================================
  // COMMENTS
  // ============================================================================
  pgm.sql(`
    COMMENT ON TABLE setup_sheets IS 'Einrichteblätter für Operationen';
    COMMENT ON TABLE setup_sheet_photos IS 'Fotos zu Einrichteblättern (CAM Screenshots, Real Photos)';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('setup_sheet_photos');
  pgm.dropTable('setup_sheets');
};
