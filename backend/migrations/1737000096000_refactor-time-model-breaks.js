/* eslint-disable camelcase */

/**
 * Refactoring: Pausen-Einstellungen zentral in Zeitmodellen
 * 
 * Änderungen:
 * - default_break_minutes → break_threshold_minutes (Pause ab X Minuten Arbeitszeit)
 * - min_break_minutes bleibt (Mindestpause)
 * - NEU: break_tolerance_minutes (Toleranz bei "Pause zu kurz")
 * - NEU: break_threshold_buffer_minutes (Puffer über Soll-Zeit hinaus)
 * 
 * Globale Pausen-Settings werden obsolet, Zeitmodell übernimmt komplett.
 */

exports.shorthands = undefined;

exports.up = pgm => {
  // 1. Umbenennen: default_break_minutes → break_threshold_minutes
  pgm.renameColumn('time_models', 'default_break_minutes', 'break_threshold_minutes');
  
  // 2. Default-Wert auf 360 (6h) setzen - ab wann Pause Pflicht
  pgm.alterColumn('time_models', 'break_threshold_minutes', {
    default: 360
  });
  
  // 3. Bestehende Werte updaten (waren 30, sollen 360 sein)
  pgm.sql(`
    UPDATE time_models 
    SET break_threshold_minutes = 360 
    WHERE break_threshold_minutes = 30 OR break_threshold_minutes IS NULL
  `);
  
  // 4. Neues Feld: Toleranz (in Minuten)
  pgm.addColumn('time_models', {
    break_tolerance_minutes: { 
      type: 'integer', 
      default: 5,
      notNull: true
    }
  });
  
  // 5. Neues Feld: Puffer über Soll-Zeit (in Minuten)
  pgm.addColumn('time_models', {
    break_threshold_buffer_minutes: { 
      type: 'integer', 
      default: 30,
      notNull: true
    }
  });
  
  // 6. Kommentar zur Dokumentation
  pgm.sql(`
    COMMENT ON COLUMN time_models.break_threshold_minutes IS 'Ab dieser Brutto-Arbeitszeit (Min) ist Pause Pflicht. Default: 360 (6h)';
    COMMENT ON COLUMN time_models.min_break_minutes IS 'Mindestpause in Minuten. Default: 30';
    COMMENT ON COLUMN time_models.break_tolerance_minutes IS 'Toleranz bei Pausenprüfung in Minuten. Default: 5';
    COMMENT ON COLUMN time_models.break_threshold_buffer_minutes IS 'Puffer über Soll-Zeit für Pausenpflicht. Default: 30';
  `);
};

exports.down = pgm => {
  // Neue Felder entfernen
  pgm.dropColumn('time_models', 'break_threshold_buffer_minutes');
  pgm.dropColumn('time_models', 'break_tolerance_minutes');
  
  // Umbenennung rückgängig
  pgm.renameColumn('time_models', 'break_threshold_minutes', 'default_break_minutes');
  
  // Default zurück
  pgm.alterColumn('time_models', 'default_break_minutes', {
    default: 30
  });
};
