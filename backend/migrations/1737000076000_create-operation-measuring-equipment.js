/**
 * Migration: Create operation_measuring_equipment table
 * Verknüpfung von Messmitteln zu Operationen
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE operation_measuring_equipment (
      id SERIAL PRIMARY KEY,
      operation_id INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      measuring_equipment_id INTEGER NOT NULL REFERENCES measuring_equipment(id) ON DELETE CASCADE,
      purpose VARCHAR(255),
      is_required BOOLEAN DEFAULT true,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      
      UNIQUE(operation_id, measuring_equipment_id)
    );

    CREATE INDEX idx_op_meas_equip_operation ON operation_measuring_equipment(operation_id);
    CREATE INDEX idx_op_meas_equip_equipment ON operation_measuring_equipment(measuring_equipment_id);

    COMMENT ON TABLE operation_measuring_equipment IS 'Verknüpfung Messmittel zu Operationen';
    COMMENT ON COLUMN operation_measuring_equipment.purpose IS 'Verwendungszweck bei dieser Operation';
    COMMENT ON COLUMN operation_measuring_equipment.is_required IS 'Pflicht-Messmittel oder optional';
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS operation_measuring_equipment CASCADE');
};
