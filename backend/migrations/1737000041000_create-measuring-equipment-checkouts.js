/* eslint-disable camelcase */

/**
 * Migration: Create measuring_equipment_checkouts table
 * 
 * Entnahme-System für Messmittel
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('measuring_equipment_checkouts', {
    id: 'id',
    
    equipment_id: {
      type: 'integer',
      notNull: true,
      references: 'measuring_equipment(id)',
      onDelete: 'CASCADE',
      comment: 'Referenz auf Messmittel'
    },
    
    // Entnahme
    checked_out_by: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      comment: 'Wer hat entnommen'
    },
    checked_out_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP'),
      comment: 'Entnahmezeitpunkt'
    },
    purpose: {
      type: 'text',
      comment: 'Verwendungszweck'
    },
    work_order_number: {
      type: 'varchar(100)',
      comment: 'Auftragsnummer'
    },
    expected_return_date: {
      type: 'date',
      comment: 'Geplante Rückgabe'
    },
    
    // Rückgabe
    returned_at: {
      type: 'timestamptz',
      comment: 'Rückgabezeitpunkt'
    },
    returned_by: {
      type: 'integer',
      references: 'users(id)',
      comment: 'Wer hat zurückgegeben'
    },
    return_condition: {
      type: 'varchar(20)',
      comment: 'Zustand bei Rückgabe: ok, damaged, needs_calibration'
    },
    return_notes: {
      type: 'text',
      comment: 'Bemerkungen zur Rückgabe'
    },
    
    // Audit
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('CURRENT_TIMESTAMP')
    }
  });

  // Check constraint für return_condition
  pgm.sql(`
    ALTER TABLE measuring_equipment_checkouts 
    ADD CONSTRAINT chk_return_condition 
    CHECK (return_condition IS NULL OR return_condition IN ('ok', 'damaged', 'needs_calibration'))
  `);

  // Indizes
  pgm.createIndex('measuring_equipment_checkouts', 'equipment_id');
  pgm.createIndex('measuring_equipment_checkouts', 'checked_out_by');
  pgm.createIndex('measuring_equipment_checkouts', 'equipment_id', {
    name: 'idx_me_checkouts_active',
    where: 'returned_at IS NULL'
  });

  // Tabellen-Kommentar
  pgm.sql(`COMMENT ON TABLE measuring_equipment_checkouts IS 'Entnahme-Historie für Messmittel'`);
};

exports.down = (pgm) => {
  pgm.dropTable('measuring_equipment_checkouts');
};
