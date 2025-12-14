/**
 * Migration: Add op_code to operation_types
 * OP-Code wird beim Erstellen einer Operation vorausgefüllt
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE operation_types ADD COLUMN IF NOT EXISTS op_code VARCHAR(20);

    COMMENT ON COLUMN operation_types.op_code IS 'Standard OP-Code für diesen Typ (z.B. MAT, CNC-D, ETG)';

    -- Bestehende Typen mit sinnvollen Codes versehen
    UPDATE operation_types SET op_code = 'CNC-D' WHERE name = 'CNC Drehen';
    UPDATE operation_types SET op_code = 'CNC-F' WHERE name = 'CNC Fräsen';
    UPDATE operation_types SET op_code = 'CNC-S' WHERE name = 'CNC Schleifen';
    UPDATE operation_types SET op_code = 'CNC-E' WHERE name = 'CNC Erodieren';
    UPDATE operation_types SET op_code = 'MAN' WHERE name = 'Manuell';
    UPDATE operation_types SET op_code = 'MONT' WHERE name = 'Montage';
    UPDATE operation_types SET op_code = 'QS' WHERE name = 'Qualitätsprüfung';
    UPDATE operation_types SET op_code = 'WBH' WHERE name = 'Wärmebehandlung';
    UPDATE operation_types SET op_code = 'OFL' WHERE name = 'Oberflächenbehandlung';
    UPDATE operation_types SET op_code = 'EXT' WHERE name = 'Externe Bearbeitung';
    UPDATE operation_types SET op_code = 'MAT' WHERE name = 'Materialzuschnitt';
    UPDATE operation_types SET op_code = 'ETG' WHERE name = 'Entgraten';
    UPDATE operation_types SET op_code = 'SONST' WHERE name = 'Sonstige';
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE operation_types DROP COLUMN IF EXISTS op_code;
  `);
};
