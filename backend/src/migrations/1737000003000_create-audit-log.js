/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Audit-Log Tabelle - für vollständige Rückverfolgbarkeit
  pgm.createTable('audit_logs', {
    id: 'id',
    user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    entity_type: { type: 'varchar(50)', notNull: true }, // part, program, operation, etc.
    entity_id: { type: 'integer', notNull: true },
    action: { type: 'varchar(20)', notNull: true }, // CREATE, UPDATE, DELETE, APPROVE, RELEASE, etc.
    changes: { type: 'jsonb' }, // Alte und neue Werte
    reason: { type: 'text' }, // Grund für Änderung
    ip_address: { type: 'inet' },
    user_agent: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indizes für schnelle Abfragen
  pgm.createIndex('audit_logs', 'user_id');
  pgm.createIndex('audit_logs', 'entity_type');
  pgm.createIndex('audit_logs', 'entity_id');
  pgm.createIndex('audit_logs', 'action');
  pgm.createIndex('audit_logs', 'created_at');
  pgm.createIndex('audit_logs', ['entity_type', 'entity_id']); // Für Entity-History
  pgm.createIndex('audit_logs', ['user_id', 'created_at']); // Für User-Activity

  // Kommentare-Tabelle - für Diskussionen an Programmen, Bauteilen, etc.
  pgm.createTable('comments', {
    id: 'id',
    entity_type: { type: 'varchar(50)', notNull: true },
    entity_id: { type: 'integer', notNull: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    parent_id: {
      type: 'integer',
      references: 'comments',
      onDelete: 'CASCADE'
    }, // Für verschachtelte Kommentare
    content: { type: 'text', notNull: true },
    is_resolved: { type: 'boolean', default: false },
    resolved_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    resolved_at: { type: 'timestamp' },
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

  pgm.createIndex('comments', ['entity_type', 'entity_id']);
  pgm.createIndex('comments', 'user_id');
  pgm.createIndex('comments', 'parent_id');
  pgm.createIndex('comments', 'created_at');

  // QR-Codes Tabelle - für Tracking und schnellen Zugriff
  pgm.createTable('qr_codes', {
    id: 'id',
    entity_type: { type: 'varchar(50)', notNull: true },
    entity_id: { type: 'integer', notNull: true },
    qr_code: { type: 'varchar(255)', notNull: true, unique: true }, // UUID oder Hash
    qr_data: { type: 'text', notNull: true }, // URL oder JSON
    qr_image_path: { type: 'varchar(500)' }, // Gespeichertes PNG
    description: { type: 'varchar(255)' },
    scan_count: { type: 'integer', default: 0 },
    last_scanned_at: { type: 'timestamp' },
    last_scanned_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    is_active: { type: 'boolean', default: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('qr_codes', 'qr_code');
  pgm.createIndex('qr_codes', ['entity_type', 'entity_id']);

  // Notifikationen-Tabelle
  pgm.createTable('notifications', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    type: { type: 'varchar(50)', notNull: true }, // info, warning, error, success
    title: { type: 'varchar(255)', notNull: true },
    message: { type: 'text', notNull: true },
    entity_type: { type: 'varchar(50)' },
    entity_id: { type: 'integer' },
    action_url: { type: 'varchar(500)' }, // Link zum Objekt
    is_read: { type: 'boolean', default: false },
    read_at: { type: 'timestamp' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.createIndex('notifications', 'user_id');
  pgm.createIndex('notifications', 'is_read');
  pgm.createIndex('notifications', ['user_id', 'is_read']);
  pgm.createIndex('notifications', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('notifications');
  pgm.dropTable('qr_codes');
  pgm.dropTable('comments');
  pgm.dropTable('audit_logs');
};
