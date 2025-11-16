/**
 * Migration: Create tool_documents table
 *
 * Manages document attachments for tools (datasheets, drawings, certificates, etc.)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Create tool_documents table
  pgm.createTable('tool_documents', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    tool_master_id: {
      type: 'integer',
      notNull: true,
      references: 'tool_master',
      onDelete: 'CASCADE',
    },
    document_type: {
      type: 'varchar(50)',
      notNull: true,
      comment: 'Type of document: datasheet, drawing, certificate, manual, photo, other',
    },
    file_name: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Original filename',
    },
    file_path: {
      type: 'varchar(500)',
      notNull: true,
      comment: 'Relative path to file in uploads directory',
    },
    file_size: {
      type: 'integer',
      notNull: true,
      comment: 'File size in bytes',
    },
    mime_type: {
      type: 'varchar(100)',
      notNull: true,
      comment: 'MIME type of the file',
    },
    description: {
      type: 'text',
      notNull: false,
      comment: 'Optional description of the document',
    },
    uploaded_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'SET NULL',
    },
    uploaded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
    },
    is_deleted: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Soft delete flag',
    },
    deleted_at: {
      type: 'timestamp',
      notNull: false,
    },
    deleted_by: {
      type: 'integer',
      notNull: false,
      references: 'users',
      onDelete: 'SET NULL',
    },
  });

  // Add indexes
  pgm.createIndex('tool_documents', 'tool_master_id');
  pgm.createIndex('tool_documents', 'document_type');
  pgm.createIndex('tool_documents', 'uploaded_by');
  pgm.createIndex('tool_documents', ['is_deleted', 'tool_master_id']);

  // Add constraint for document_type
  pgm.addConstraint('tool_documents', 'tool_documents_document_type_check', {
    check: "document_type IN ('datasheet', 'drawing', 'certificate', 'manual', 'photo', 'other')",
  });

  // Add constraint for file_size (max 50MB)
  pgm.addConstraint('tool_documents', 'tool_documents_file_size_check', {
    check: 'file_size > 0 AND file_size <= 52428800', // 50MB in bytes
  });

  // Add comment to table
  pgm.sql(`
    COMMENT ON TABLE tool_documents IS 'Document attachments for tools (datasheets, drawings, certificates, manuals, photos)';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('tool_documents');
};
