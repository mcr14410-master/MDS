/**
 * Migration: Create Zerobot Configuration System
 * 
 * Stores configurable parameters for Zerobot position calculator:
 * - Global parameters (common to all machines)
 * - Machine-specific parameters (per machine)
 * - Jaw heights (Backenhöhen)
 */

exports.up = async (pgm) => {
  // Main configuration table
  pgm.createTable('zerobot_config', {
    id: { type: 'serial', primaryKey: true },
    config_type: { 
      type: 'varchar(50)', 
      notNull: true,
      comment: 'Type: global, machine, jaw'
    },
    config_key: { 
      type: 'varchar(100)', 
      notNull: true,
      comment: 'Parameter key/identifier'
    },
    config_value: { 
      type: 'decimal(10,2)', 
      notNull: true,
      comment: 'Numeric value'
    },
    machine_name: { 
      type: 'varchar(100)',
      comment: 'Machine name for machine-specific params, NULL for global'
    },
    display_name: { 
      type: 'varchar(100)',
      comment: 'Display name for UI'
    },
    description: { 
      type: 'text',
      comment: 'Description/explanation of parameter'
    },
    sort_order: {
      type: 'integer',
      default: 0,
      comment: 'Sort order for UI display'
    },
    created_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Unique constraint for config_type + config_key + machine_name
  pgm.addConstraint('zerobot_config', 'uq_zerobot_config_key', {
    unique: ['config_type', 'config_key', 'machine_name']
  });

  // Index for faster lookups
  pgm.createIndex('zerobot_config', 'config_type');

  // ============================================
  // SEED DATA: Global Parameters
  // ============================================
  const globalParams = [
    { key: 'StartX', value: -305, display: 'Rack Startpunkt X', desc: 'X-Startposition des Racks', sort: 1 },
    { key: 'WinkelB', value: 30, display: 'Auflagewinkel Breite', desc: 'Breite der Auflagewinkel', sort: 2 },
    { key: 'RackSa', value: 50, display: 'Rack Sicherheitsabstand', desc: 'Zusätzlicher Sicherheitsabstand Rack', sort: 3 },
    { key: 'GreiferSa', value: 10, display: 'Greifer Sicherheitsabstand', desc: 'Zusätzlicher Sicherheitsabstand Greifer', sort: 4 },
    { key: 'WinkelS', value: 14, display: 'Winkelabstand-Berechnungswert', desc: 'Wert für Berechnung des empfohlenen Auflagewinkelabstands', sort: 5 },
    { key: 'SaRack', value: 2, display: 'Sicherheitsabstand Rack Aufnahme', desc: 'Sicherheitsabstand bei Rack-Aufnahmeposition', sort: 6 },
    { key: 'AbstandZ', value: 50, display: 'Abstand Befestigungsschrauben Z', desc: 'Abstand zwischen Befestigungsschrauben in Z-Richtung', sort: 7 },
    { key: 'VersatzX', value: 2.5, display: 'X-Versatz Kleinteile', desc: 'Zusätzlicher X-Versatz für Kleinteile', sort: 8 }
  ];

  for (const p of globalParams) {
    pgm.sql(`
      INSERT INTO zerobot_config (config_type, config_key, config_value, display_name, description, sort_order)
      VALUES ('global', '${p.key}', ${p.value}, '${p.display}', '${p.desc}', ${p.sort})
    `);
  }

  // ============================================
  // SEED DATA: Jaw Heights (Backenhöhen)
  // ============================================
  const jawParams = [
    { key: 'B80', value: 159.25, display: 'Backen B80', desc: 'Backenhöhe für B80', sort: 1 },
    { key: 'B120', value: 134.25, display: 'Backen B120', desc: 'Backenhöhe für B120', sort: 2 },
    { key: 'B120_EW', value: 154.25, display: 'Backen B120 + EW', desc: 'Backenhöhe für B120 mit Erhöhungswinkel', sort: 3 }
  ];

  for (const p of jawParams) {
    pgm.sql(`
      INSERT INTO zerobot_config (config_type, config_key, config_value, display_name, description, sort_order)
      VALUES ('jaw', '${p.key}', ${p.value}, '${p.display}', '${p.desc}', ${p.sort})
    `);
  }

  // ============================================
  // SEED DATA: Machine-Specific Parameters - Grob G350
  // ============================================
  const grobParams = [
    { key: 'e', value: 294, display: 'Auflagewinkel Anschlagpunkt Y', desc: 'Y-Position des Auflagewinkel-Anschlagpunkts', sort: 1 },
    { key: 'a', value: 300, display: 'Auflagewinkel Länge', desc: 'Länge der Auflagewinkel', sort: 2 },
    { key: 'VersatzZ', value: 27.3, display: 'Rack Versatz Z', desc: 'Z-Versatz für Rack-Position', sort: 3 }
  ];

  for (const p of grobParams) {
    pgm.sql(`
      INSERT INTO zerobot_config (config_type, config_key, config_value, machine_name, display_name, description, sort_order)
      VALUES ('machine', '${p.key}', ${p.value}, 'Grob G350', '${p.display}', '${p.desc}', ${p.sort})
    `);
  }

  // ============================================
  // SEED DATA: Machine-Specific Parameters - Hermle C22
  // ============================================
  const hermleParams = [
    { key: 'e', value: 209, display: 'Auflagewinkel Anschlagpunkt Y', desc: 'Y-Position des Auflagewinkel-Anschlagpunkts', sort: 1 },
    { key: 'a', value: 215, display: 'Auflagewinkel Länge', desc: 'Länge der Auflagewinkel', sort: 2 },
    { key: 'VersatzZ', value: 25.7, display: 'Rack Versatz Z', desc: 'Z-Versatz für Rack-Position', sort: 3 }
  ];

  for (const p of hermleParams) {
    pgm.sql(`
      INSERT INTO zerobot_config (config_type, config_key, config_value, machine_name, display_name, description, sort_order)
      VALUES ('machine', '${p.key}', ${p.value}, 'Hermle C22', '${p.display}', '${p.desc}', ${p.sort})
    `);
  }
};

exports.down = async (pgm) => {
  pgm.dropTable('zerobot_config');
};
