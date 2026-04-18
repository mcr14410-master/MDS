/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ========================================================================
  // 1. machine_types Tabelle (mit Custom-Field-Definitions)
  // ========================================================================
  pgm.createTable('machine_types', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    icon: { type: 'varchar(50)' },
    sequence: { type: 'integer', notNull: true, default: 0 },
    is_active: { type: 'boolean', notNull: true, default: true },
    custom_field_definitions: { type: 'jsonb' },
    created_by: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });
  pgm.createIndex('machine_types', 'custom_field_definitions', { method: 'gin' });
  pgm.sql("ALTER TABLE machine_types ALTER COLUMN custom_field_definitions SET DEFAULT '[]'::jsonb");

  // ========================================================================
  // 2. control_types Tabelle (Lookup fuer Steuerungen)
  // ========================================================================
  pgm.createTable('control_types', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    color: { type: 'varchar(20)', default: 'gray' },
    sequence: { type: 'integer', notNull: true, default: 0 },
    is_active: { type: 'boolean', notNull: true, default: true },
    created_by: { type: 'integer' },
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('current_timestamp') }
  });

  // ========================================================================
  // 3. machines Tabelle erweitern (Legacy-Spalten bleiben vorerst)
  // ========================================================================
  pgm.addColumns('machines', {
    machine_type_id: { type: 'integer', references: 'machine_types', onDelete: 'SET NULL' },
    control_type_id: { type: 'integer', references: 'control_types', onDelete: 'SET NULL' },
    custom_fields: { type: 'jsonb' },
    year_built: { type: 'integer' }
  });
  pgm.createIndex('machines', 'custom_fields', { method: 'gin' });
  pgm.sql("ALTER TABLE machines ALTER COLUMN custom_fields SET DEFAULT '{}'::jsonb");

  // ========================================================================
  // 4. Default machine_types seeden (mit Custom-Field-Definitions)
  // ========================================================================
  const baseFields = [
    { key: 'num_axes', label: 'Achsen', type: 'number', required: false, min: 1, max: 10, step: 1 },
    { key: 'workspace_x', label: 'Arbeitsraum X', type: 'number', unit: 'mm', required: false, min: 0, step: 1 },
    { key: 'workspace_y', label: 'Arbeitsraum Y', type: 'number', unit: 'mm', required: false, min: 0, step: 1 },
    { key: 'workspace_z', label: 'Arbeitsraum Z', type: 'number', unit: 'mm', required: false, min: 0, step: 1 },
    { key: 'spindle_power', label: 'Spindelleistung', type: 'number', unit: 'kW', required: false, min: 0, step: 0.1 },
    { key: 'max_rpm', label: 'Max. Drehzahl', type: 'number', unit: 'U/min', required: false, min: 0, step: 100 },
    { key: 'tool_capacity', label: 'Werkzeugpl\u00e4tze', type: 'number', required: false, min: 0, step: 1 }
  ];

  const pick = (keys) => baseFields.filter((f) => keys.includes(f.key));

  const defs = {
    milling: baseFields,
    turning: pick(['num_axes', 'workspace_x', 'workspace_z', 'spindle_power', 'max_rpm', 'tool_capacity']),
    millturn: baseFields,
    grinding: pick(['workspace_x', 'workspace_y', 'workspace_z', 'spindle_power', 'max_rpm']),
    edm: pick(['workspace_x', 'workspace_y', 'workspace_z']),
    other: []
  };

  const esc = (obj) => JSON.stringify(obj).replace(/'/g, "''");

  pgm.sql(`
    INSERT INTO machine_types (name, icon, sequence, custom_field_definitions) VALUES
      ('Fr\u00e4sen',      'cog',        1, '${esc(defs.milling)}'::jsonb),
      ('Drehen',      'rotate-cw',  2, '${esc(defs.turning)}'::jsonb),
      ('Dreh-Fr\u00e4sen', 'git-merge',  3, '${esc(defs.millturn)}'::jsonb),
      ('Schleifen',   'zap',        4, '${esc(defs.grinding)}'::jsonb),
      ('Erodieren',   'flame',      5, '${esc(defs.edm)}'::jsonb),
      ('Sonstige',    'box',       99, '${esc(defs.other)}'::jsonb)
    ON CONFLICT (name) DO NOTHING
  `);

  // ========================================================================
  // 5. Default control_types seeden
  // ========================================================================
  pgm.sql(`
    INSERT INTO control_types (name, color, sequence) VALUES
      ('Heidenhain', 'blue',   1),
      ('Siemens',    'green',  2),
      ('Fanuc',      'yellow', 3),
      ('Mazatrol',   'purple', 4),
      ('Haas',       'red',    5)
    ON CONFLICT (name) DO NOTHING
  `);

  // Weitere Steuerungen aus bestehenden Daten uebernehmen
  pgm.sql(`
    INSERT INTO control_types (name, color, sequence)
    SELECT DISTINCT m.control_type, 'gray', 99
    FROM machines m
    WHERE m.control_type IS NOT NULL
      AND m.control_type <> ''
      AND NOT EXISTS (SELECT 1 FROM control_types ct WHERE ct.name = m.control_type)
  `);

  // ========================================================================
  // 6. Legacy-Werte auf FKs mappen
  // ========================================================================
  pgm.sql(`
    UPDATE machines SET machine_type_id = (
      SELECT id FROM machine_types WHERE name = CASE machines.machine_type
        WHEN 'milling'   THEN 'Fr\u00e4sen'
        WHEN 'turning'   THEN 'Drehen'
        WHEN 'mill-turn' THEN 'Dreh-Fr\u00e4sen'
        WHEN 'grinding'  THEN 'Schleifen'
        WHEN 'edm'       THEN 'Erodieren'
        ELSE 'Sonstige'
      END
    )
    WHERE machine_type IS NOT NULL
  `);

  pgm.sql(`
    UPDATE machines SET control_type_id = ct.id
    FROM control_types ct
    WHERE machines.control_type = ct.name
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('machines', 'custom_fields', { ifExists: true });
  pgm.dropColumns('machines', ['machine_type_id', 'control_type_id', 'custom_fields', 'year_built']);
  pgm.dropTable('control_types');
  pgm.dropTable('machine_types');
};
