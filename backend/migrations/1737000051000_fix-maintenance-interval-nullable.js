/* eslint-disable camelcase */

/**
 * Fix: interval_type nullable machen
 * 
 * Betriebsstunden-basierte Wartungspläne haben kein interval_type,
 * nur interval_hours. Daher muss interval_type nullable sein.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // interval_type nullable machen
  pgm.alterColumn('maintenance_plans', 'interval_type', {
    notNull: false
  });
  
  // interval_value auch nullable (falls nur Betriebsstunden verwendet werden)
  pgm.alterColumn('maintenance_plans', 'interval_value', {
    notNull: false
  });
};

exports.down = (pgm) => {
  // Zurück auf NOT NULL (nur wenn keine NULL-Werte existieren)
  pgm.alterColumn('maintenance_plans', 'interval_type', {
    notNull: true,
    default: 'days'
  });
  
  pgm.alterColumn('maintenance_plans', 'interval_value', {
    notNull: true,
    default: 1
  });
};
