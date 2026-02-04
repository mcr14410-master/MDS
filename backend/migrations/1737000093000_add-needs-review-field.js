/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns('time_daily_summary', {
    needs_review: { type: 'boolean', default: false },
    review_note: { type: 'text' }
  });

  pgm.sql('CREATE INDEX idx_time_daily_needs_review ON time_daily_summary (needs_review) WHERE needs_review = TRUE');

  // View erweitern: auch needs_review Tage anzeigen
  pgm.sql(`
    CREATE OR REPLACE VIEW time_missing_entries AS
    SELECT 
        ds.id,
        ds.user_id,
        u.first_name || ' ' || u.last_name AS name,
        ds.date,
        ds.missing_entry_types,
        ds.first_clock_in,
        ds.last_clock_out,
        ds.worked_minutes,
        ds.break_minutes,
        ds.status,
        ds.needs_review,
        ds.review_note
    FROM time_daily_summary ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.has_missing_entries = TRUE OR ds.needs_review = TRUE
    ORDER BY ds.date DESC, u.last_name, u.first_name
  `);
};

exports.down = pgm => {
  // View auf Original zurücksetzen
  pgm.sql(`
    CREATE OR REPLACE VIEW time_missing_entries AS
    SELECT 
        ds.id,
        ds.user_id,
        u.first_name || ' ' || u.last_name AS name,
        ds.date,
        ds.missing_entry_types,
        ds.first_clock_in,
        ds.last_clock_out,
        ds.worked_minutes,
        ds.break_minutes,
        ds.status
    FROM time_daily_summary ds
    JOIN users u ON ds.user_id = u.id
    WHERE ds.has_missing_entries = TRUE
    ORDER BY ds.date DESC, u.last_name, u.first_name
  `);

  pgm.sql('DROP INDEX IF EXISTS idx_time_daily_needs_review');
  pgm.dropColumns('time_daily_summary', ['needs_review', 'review_note']);
};
