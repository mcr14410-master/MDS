/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Maschinen-Tabelle
  pgm.createTable('machines', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    manufacturer: { type: 'varchar(100)' },
    model: { type: 'varchar(100)' },
    serial_number: { type: 'varchar(100)' },
    machine_type: { type: 'varchar(50)' },
    control_type: { type: 'varchar(50)' },
    control_version: { type: 'varchar(50)' },
    num_axes: { type: 'integer' },
    workspace_x: { type: 'decimal(10,2)' },
    workspace_y: { type: 'decimal(10,2)' },
    workspace_z: { type: 'decimal(10,2)' },
    spindle_power: { type: 'decimal(10,2)' },
    max_rpm: { type: 'integer' },
    tool_capacity: { type: 'integer' },
    location: { type: 'varchar(100)' },
    network_path: { type: 'varchar(255)' },
    postprocessor_name: { type: 'varchar(100)' },
    notes: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
    operating_hours: { type: 'integer', default: 0 },
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

  // Foreign Key für operations.machine_id hinzufügen
  pgm.addConstraint('operations', 'operations_machine_id_fkey', {
    foreignKeys: {
      columns: 'machine_id',
      references: 'machines(id)',
      onDelete: 'SET NULL'
    }
  });

  // Workflow-Status Tabelle
  pgm.createTable('workflow_states', {
    id: 'id',
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' },
    color: { type: 'varchar(7)' },
    icon: { type: 'varchar(50)' },
    sequence: { type: 'integer', notNull: true },
    is_final: { type: 'boolean', notNull: true, default: false },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Programme-Tabelle (OHNE current_revision_id Foreign Key - kommt später!)
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
    current_revision_id: { type: 'integer' }, // Foreign key wird später hinzugefügt
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

  // Programm-Revisionen Tabelle
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
    version_string: { type: 'varchar(20)', notNull: true },
    filename: { type: 'varchar(255)', notNull: true },
    filepath: { type: 'varchar(500)', notNull: true },
    filesize: { type: 'integer' },
    file_hash: { type: 'varchar(64)' },
    mime_type: { type: 'varchar(100)' },
    content: { type: 'text' },
    diff_from_previous: { type: 'text' },
    comment: { type: 'text' },
    is_cam_original: { type: 'boolean', default: false },
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

  // JETZT Foreign Key für programs.current_revision_id hinzufügen
  pgm.addConstraint('programs', 'programs_current_revision_id_fkey', {
    foreignKeys: {
      columns: 'current_revision_id',
      references: 'program_revisions(id)',
      onDelete: 'SET NULL'
    }
  });

  // Werkzeuge-Tabelle
  pgm.createTable('tools', {
    id: 'id',
    tool_number: { type: 'varchar(50)', notNull: true, unique: true },
    tool_name: { type: 'varchar(255)', notNull: true },
    tool_type: { type: 'varchar(50)' },
    diameter: { type: 'decimal(10,3)' },
    length: { type: 'decimal(10,2)' },
    flutes: { type: 'integer' },
    material: { type: 'varchar(50)' },
    coating: { type: 'varchar(50)' },
    manufacturer: { type: 'varchar(100)' },
    order_number: { type: 'varchar(100)' },
    cutting_speed: { type: 'decimal(10,2)' },
    feed_per_tooth: { type: 'decimal(10,4)' },
    max_rpm: { type: 'integer' },
    cost: { type: 'decimal(10,2)' },
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
  pgm.dropTable('tools');
  
  // Foreign Key zuerst entfernen
  pgm.dropConstraint('programs', 'programs_current_revision_id_fkey', { ifExists: true });
  
  pgm.dropTable('program_revisions');
  pgm.dropTable('programs');
  pgm.dropTable('workflow_states');
  
  // Foreign Key wieder entfernen
  pgm.dropConstraint('operations', 'operations_machine_id_fkey', { ifExists: true });
  
  pgm.dropTable('machines');
};
