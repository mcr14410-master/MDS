/**
 * Migration: Create operation_documents table
 * Dokumente für Operationen (Anleitungen, Skizzen, etc.)
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE operation_documents (
      id SERIAL PRIMARY KEY,
      operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      document_type VARCHAR(50) NOT NULL DEFAULT 'other',
      title VARCHAR(255),
      description TEXT,
      original_filename VARCHAR(500) NOT NULL,
      stored_filename VARCHAR(500) NOT NULL,
      file_path VARCHAR(1000) NOT NULL,
      file_size INTEGER,
      mime_type VARCHAR(100),
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_operation_documents_operation ON operation_documents(operation_id);
    CREATE INDEX idx_operation_documents_type ON operation_documents(document_type);

    COMMENT ON TABLE operation_documents IS 'Dokumente für Operationen';
    COMMENT ON COLUMN operation_documents.document_type IS 'Typ: instruction, sketch, reference, other';
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS operation_documents CASCADE');
};
