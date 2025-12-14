/**
 * Migration: Create work_instructions table
 * Arbeitsanweisungen für Operationen
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE work_instructions (
      id SERIAL PRIMARY KEY,
      operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      steps JSONB DEFAULT '[]'::jsonb,
      version INTEGER DEFAULT 1,
      status VARCHAR(50) DEFAULT 'draft',
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_work_instructions_operation ON work_instructions(operation_id);
    CREATE INDEX idx_work_instructions_status ON work_instructions(status);
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS work_instructions CASCADE');
};
