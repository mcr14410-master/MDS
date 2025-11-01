/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Maschinen-Tabelle
  pgm.createTable('machines', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    manufacturer: { type: 'varchar(100)' }, // DMG Mori, Hermle, Mazak, etc.
    model: { type: 'varchar(100)' },
    serial_number: { type: 'varchar(100)' },
    machine_type: { type: 'varchar(50)' }, // milling, turning, mill-turn, etc.
    control_type: { type: 'varchar(50)' }, // Heidenhain, Fanuc, Siemens, Mazatrol
    control_version: { type: 'varchar(50)' },
    num_axes: { type: 'integer' }, // 3, 4, 5
    workspace_x: { type: 'decimal(10,2)' }, // mm
    workspace_y: { type: 'decimal(10,2)' },
    workspace_z: { type: 'decimal(10,2)' },
    spindle_power: { type: 'decimal(10,2)' }, // kW
    max_rpm: { type: 'integer' },
    tool_capacity: { type: 'integer' }, // Anzahl Werkzeugplätze
    location: { type: 'varchar(100)' }, // Standort in Halle
    network_path: { type: 'varchar(255)' }, // SMB-Share Pfad
    postprocessor_name: { type: 'varchar(100)' }, // Für CAM
    notes: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    operating_hours: { type: 'integer', default: 0 }, // Betriebsstunden
    last_maintenance: { type: 'date' },
    next_maintenance: { type: 'date' },
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

  // Workflow-Status Tabelle (für Programme, Einrichteblätter, etc.)
  pgm.createTable('workflow_states', {
    id: 'id',
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' },
    color: { type: 'varchar(7)' }, // Hex-Farbe für UI, z.B. #10b981
    icon: { type: 'varchar(50)' }, // Icon-Name
    sequence: { type: 'integer', notNull: true }, // Reihenfolge im Workflow
    is_final: { type: 'boolean', notNull: true, default: false }, // End-Status?
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Programme-Tabelle (logisches Programm)
  pgm.createTable('programs', {
    id: 'id',
    operation_id: {
      type: 'integer',
      notNull: true,
      references: 'operations',
      onDelete: 'CASCADE'
    },
    program_number: { type: 'varchar(50)', notNull: true },
    program_name: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    current_revision_id: {
      type: 'integer',
      references: 'program_revisions',
      onDelete: 'SET NULL'
    },
    workflow_state_id: {
      type: 'integer',
      notNull: true,
      references: 'workflow_states',
      onDelete: 'RESTRICT'
    },
    created_by: {
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

  // Programm-Revisionen Tabelle (Versionierung)
  pgm.createTable('program_revisions', {
    id: 'id',
    program_id: {
      type: 'integer',
      notNull: true,
      references: 'programs',
      onDelete: 'CASCADE'
    },
    version_major: { type: 'integer', notNull: true, default: 1 },
    version_minor: { type: 'integer', notNull: true, default: 0 },
    version_patch: { type: 'integer', notNull: true, default: 0 },
    version_string: { type: 'varchar(20)', notNull: true }, // "1.0.0"
    filename: { type: 'varchar(255)', notNull: true },
    filepath: { type: 'varchar(500)', notNull: true },
    filesize: { type: 'integer' }, // bytes
    file_hash: { type: 'varchar(64)' }, // SHA-256
    mime_type: { type: 'varchar(100)' },
    content: { type: 'text' }, // G-Code Inhalt für Diff
    diff_from_previous: { type: 'text' }, // Diff zur vorherigen Version
    comment: { type: 'text' }, // Änderungskommentar
    is_cam_original: { type: 'boolean', default: false }, // Vom CAM oder optimiert?
    optimized_by_user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    workflow_state_id: {
      type: 'integer',
      notNull: true,
      references: 'workflow_states',
      onDelete: 'RESTRICT'
    },
    released_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    released_at: { type: 'timestamp' },
    created_by: {
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

  // Werkzeuge-Tabelle
  pgm.createTable('tools', {
    id: 'id',
    tool_number: { type: 'varchar(50)', notNull: true, unique: true },
    tool_name: { type: 'varchar(255)', notNull: true },
    tool_type: { type: 'varchar(50)' }, // end_mill, drill, boring, etc.
    diameter: { type: 'decimal(10,3)' }, // mm
    length: { type: 'decimal(10,2)' }, // mm
    flutes: { type: 'integer' },
    material: { type: 'varchar(50)' }, // HSS, VHM, etc.
    coating: { type: 'varchar(50)' }, // TiN, TiAlN, etc.
    manufacturer: { type: 'varchar(100)' },
    order_number: { type: 'varchar(100)' },
    cutting_speed: { type: 'decimal(10,2)' }, // m/min
    feed_per_tooth: { type: 'decimal(10,4)' }, // mm/U
    max_rpm: { type: 'integer' },
    cost: { type: 'decimal(10,2)' }, // €
    stock_quantity: { type: 'integer', default: 0 },
    min_stock: { type: 'integer', default: 0 },
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

  // Einrichteblätter-Tabelle
  pgm.createTable('setup_sheets', {
    id: 'id',
    operation_id: {
      type: 'integer',
      notNull: true,
      references: 'operations',
      onDelete: 'CASCADE'
    },
    title: { type: 'varchar(255)', notNull: true },
    fixture_description: { type: 'text' }, // Spannmittel
    zero_point: { type: 'varchar(100)' }, // X, Y, Z
    tool_list: { type: 'text' }, // Werkzeugliste als Text
    special_notes: { type: 'text' },
    setup_instructions: { type: 'text' },
    safety_notes: { type: 'text' },
    estimated_setup_time: { type: 'integer' }, // Minuten
    workflow_state_id: {
      type: 'integer',
      notNull: true,
      references: 'workflow_states',
      onDelete: 'RESTRICT'
    },
    created_by: {
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

  // Aufspannfotos-Tabelle
  pgm.createTable('setup_photos', {
    id: 'id',
    operation_id: {
      type: 'integer',
      notNull: true,
      references: 'operations',
      onDelete: 'CASCADE'
    },
    filename: { type: 'varchar(255)', notNull: true },
    filepath: { type: 'varchar(500)', notNull: true },
    filesize: { type: 'integer' },
    mime_type: { type: 'varchar(100)' },
    title: { type: 'varchar(255)' },
    description: { type: 'text' },
    view_angle: { type: 'varchar(50)' }, // front, top, side, etc.
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

  // Indizes
  pgm.createIndex('machines', 'name');
  pgm.createIndex('machines', 'machine_type');
  pgm.createIndex('machines', 'is_active');
  pgm.createIndex('programs', 'operation_id');
  pgm.createIndex('programs', 'program_number');
  pgm.createIndex('programs', 'workflow_state_id');
  pgm.createIndex('program_revisions', 'program_id');
  pgm.createIndex('program_revisions', ['program_id', 'version_major', 'version_minor', 'version_patch']);
  pgm.createIndex('tools', 'tool_number');
  pgm.createIndex('tools', 'tool_type');
  pgm.createIndex('setup_sheets', 'operation_id');
  pgm.createIndex('setup_photos', 'operation_id');
  pgm.createIndex('setup_photos', ['operation_id', 'sequence']);

  // Standard Workflow-Status einfügen
  pgm.sql(`
    INSERT INTO workflow_states (name, description, color, icon, sequence, is_final) VALUES
    ('draft', 'Entwurf - in Bearbeitung', '#06b6d4', 'FileEdit', 1, false),
    ('review', 'In Prüfung', '#f59e0b', 'FileSearch', 2, false),
    ('approved', 'Geprüft - wartet auf Freigabe', '#10b981', 'FileCheck', 3, false),
    ('released', 'Freigegeben - produktiv nutzbar', '#10b981', 'CheckCircle', 4, true),
    ('rejected', 'Abgelehnt', '#ef4444', 'XCircle', 5, true),
    ('archived', 'Archiviert', '#6b7280', 'Archive', 6, true);
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('setup_photos');
  pgm.dropTable('setup_sheets');
  pgm.dropTable('tools');
  pgm.dropTable('program_revisions');
  
  // Current revision constraint entfernen
  pgm.sql('ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_current_revision_id_fkey');
  pgm.dropTable('programs');
  
  pgm.dropTable('workflow_states');
  pgm.dropTable('machines');
};
