/**
 * Migration: Add raw material fields to operations and create operation_consumables
 */

exports.up = (pgm) => {
  // 1. Rohmaterial-Felder zu operations hinzufügen
  pgm.sql(`
    ALTER TABLE operations ADD COLUMN IF NOT EXISTS raw_material_type VARCHAR(100);
    ALTER TABLE operations ADD COLUMN IF NOT EXISTS raw_material_designation VARCHAR(100);
    ALTER TABLE operations ADD COLUMN IF NOT EXISTS raw_material_dimensions VARCHAR(255);
    ALTER TABLE operations ADD COLUMN IF NOT EXISTS raw_material_weight DECIMAL(10,3);
    ALTER TABLE operations ADD COLUMN IF NOT EXISTS raw_material_notes TEXT;

    COMMENT ON COLUMN operations.raw_material_type IS 'Rohmaterialart: Rundmaterial, Flachmaterial, Platte, Rohr, Profil, Guss, Schmiede';
    COMMENT ON COLUMN operations.raw_material_designation IS 'Werkstoffbezeichnung: AlMg4.5Mn, 1.4301, 42CrMo4, etc.';
    COMMENT ON COLUMN operations.raw_material_dimensions IS 'Abmessungen: Ø80x250, 100x50x300, etc.';
    COMMENT ON COLUMN operations.raw_material_weight IS 'Gewicht in kg';
    COMMENT ON COLUMN operations.raw_material_notes IS 'Zusätzliche Hinweise zum Rohmaterial';
  `);

  // 2. Verknüpfungstabelle für Verbrauchsmaterial
  pgm.sql(`
    CREATE TABLE operation_consumables (
      id SERIAL PRIMARY KEY,
      operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      consumable_id INTEGER NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3),
      unit VARCHAR(20),
      purpose VARCHAR(255),
      is_required BOOLEAN DEFAULT true,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(operation_id, consumable_id)
    );

    CREATE INDEX idx_op_consumables_operation ON operation_consumables(operation_id);
    CREATE INDEX idx_op_consumables_consumable ON operation_consumables(consumable_id);

    COMMENT ON TABLE operation_consumables IS 'Verknüpfung Verbrauchsmaterial zu Operationen';
    COMMENT ON COLUMN operation_consumables.quantity IS 'Benötigte Menge pro Durchlauf';
    COMMENT ON COLUMN operation_consumables.purpose IS 'Verwendungszweck bei dieser Operation';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS operation_consumables CASCADE;
    
    ALTER TABLE operations DROP COLUMN IF EXISTS raw_material_type;
    ALTER TABLE operations DROP COLUMN IF EXISTS raw_material_designation;
    ALTER TABLE operations DROP COLUMN IF EXISTS raw_material_dimensions;
    ALTER TABLE operations DROP COLUMN IF EXISTS raw_material_weight;
    ALTER TABLE operations DROP COLUMN IF EXISTS raw_material_notes;
  `);
};
