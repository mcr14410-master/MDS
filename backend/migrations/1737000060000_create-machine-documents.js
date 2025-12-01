/* eslint-disable camelcase */

/**
 * Migration: Machine Documents
 * 
 * Dokumente für Maschinen:
 * - Handbuch (manual)
 * - Schaltplan (schematic)
 * - Wartungsanleitung (maintenance_manual)
 * - Zertifikat (certificate)
 * - Sonstiges (other)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Document type ENUM
  pgm.createType('machine_document_type', [
    'manual',
    'schematic',
    'maintenance_manual',
    'certificate',
    'other'
  ]);

  // Machine Documents Tabelle
  pgm.createTable('machine_documents', {
    id: 'id',
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'CASCADE'
    },
    document_type: {
      type: 'machine_document_type',
      notNull: true
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true
    },
    file_size: {
      type: 'integer'
    },
    mime_type: {
      type: 'varchar(100)'
    },
    description: {
      type: 'text'
    },
    is_primary: {
      type: 'boolean',
      default: false
    },
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false
    },
    deleted_at: {
      type: 'timestamp'
    },
    deleted_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    }
  });

  // Indizes
  pgm.createIndex('machine_documents', 'machine_id');
  pgm.createIndex('machine_documents', 'document_type');
  pgm.createIndex('machine_documents', 'is_deleted');

  // Partial Unique Index: nur ein primary Document pro Maschine
  pgm.sql(`
    CREATE UNIQUE INDEX machine_documents_unique_primary_per_machine
    ON machine_documents (machine_id)
    WHERE is_primary = true AND is_deleted = false;
  `);
};

exports.down = (pgm) => {
  pgm.dropIndex('machine_documents', 'machine_id');
  pgm.dropIndex('machine_documents', 'document_type');
  pgm.dropIndex('machine_documents', 'is_deleted');
  pgm.sql('DROP INDEX IF EXISTS machine_documents_unique_primary_per_machine;');
  pgm.dropTable('machine_documents');
  pgm.dropType('machine_document_type');
};
