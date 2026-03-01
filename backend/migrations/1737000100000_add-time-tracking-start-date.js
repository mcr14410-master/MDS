exports.up = (pgm) => {
  pgm.addColumns('users', {
    time_tracking_start_date: {
      type: 'date',
      default: null,
      comment: 'Ab welchem Datum die Zeiterfassung für diesen User gilt. Cron ignoriert Tage davor.'
    }
  });

  // Bestehende User mit aktiver Zeiterfassung: created_at als Startdatum setzen
  pgm.sql(`
    UPDATE users 
    SET time_tracking_start_date = created_at::date 
    WHERE time_tracking_enabled = TRUE AND time_model_id IS NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['time_tracking_start_date']);
};
