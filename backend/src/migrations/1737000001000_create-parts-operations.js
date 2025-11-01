/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Kunden-Tabelle
  pgm.createTable('customers', {
    id: 'id',
    name: { type: 'varchar(255)', notNull: true },
    customer_number: { type: 'varchar(50)', unique: true },
    contact_person: { type: 'varchar(255)' },
    email: { type: 'varchar(255)' },
    phone: { type: 'varchar(50)' },
    address: { type: 'text' },
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

  // Bauteile-Tabelle
  pgm.createTable('parts', {
    id: 'id',
    customer_id: {
      type: 'integer',
      references: 'customers',
      onDelete: 'SET NULL'
    },
    part_number: { type: 'varchar(100)', notNull: true, unique: true },
    part_name: { type: 'varchar(255)', notNull: true },
    revision: { type: 'varchar(50)' },
    material: { type: 'varchar(100)' },
    drawing_number: { type: 'varchar(100)' },
    weight: { type: 'decimal(10,3)' }, // kg
    dimensions: { type: 'varchar(100)' }, // z.B. "100x50x25"
    description: { type: 'text' },
    notes: { type: 'text' },
    is_active: { type: 'boolean', notNull: true, default: true },
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

  // Arbeitsgänge-Tabelle (Operations)
  pgm.createTable('operations', {
    id: 'id',
    part_id: {
      type: 'integer',
      notNull: true,
      references: 'parts',
      onDelete: 'CASCADE'
    },
    op_number: { type: 'varchar(20)', notNull: true }, // OP10, OP20, etc.
    op_name: { type: 'varchar(255)', notNull: true },
    machine_id: {
      type: 'integer',
      references: 'machines', // Forward reference - wird in nächster Migration erstellt
      onDelete: 'SET NULL'
    },
    setup_time_minutes: { type: 'integer' },
    cycle_time_seconds: { type: 'decimal(10,2)' },
    description: { type: 'text' },
    notes: { type: 'text' },
    sequence: { type: 'integer', notNull: true, default: 0 }, // Reihenfolge
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

  // Unique Constraint: Ein Teil kann nicht zweimal die gleiche OP-Nummer haben
  pgm.addConstraint('operations', 'operations_part_op_unique', {
    unique: ['part_id', 'op_number']
  });

  // Indizes
  pgm.createIndex('customers', 'customer_number');
  pgm.createIndex('customers', 'name');
  pgm.createIndex('parts', 'part_number');
  pgm.createIndex('parts', 'customer_id');
  pgm.createIndex('parts', 'created_by');
  pgm.createIndex('operations', 'part_id');
  pgm.createIndex('operations', 'machine_id');
  pgm.createIndex('operations', ['part_id', 'sequence']); // Für sortierte Abfragen
};

exports.down = (pgm) => {
  pgm.dropTable('operations');
  pgm.dropTable('parts');
  pgm.dropTable('customers');
};
