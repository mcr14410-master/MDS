/**
 * Migration: Create checklists table
 * Checklisten für Operationen
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE checklists (
      id SERIAL PRIMARY KEY,
      operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      items JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(50) DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_checklists_operation ON checklists(operation_id);
    CREATE INDEX idx_checklists_status ON checklists(status);

    COMMENT ON TABLE checklists IS 'Checklisten für Operationen';
    COMMENT ON COLUMN checklists.items IS 'JSON Array: [{text: "", is_required: true, category: ""}]';
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS checklists CASCADE');
};
