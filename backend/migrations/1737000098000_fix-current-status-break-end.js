/* eslint-disable camelcase */

/**
 * Fix: time_current_status View - break_end als 'present' statt 'absent'
 */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.sql(`
    CREATE OR REPLACE VIEW time_current_status AS
    SELECT u.id AS user_id,
        (u.first_name || ' ' || u.last_name) AS name,
        u.rfid_chip_id,
        latest.entry_type AS last_entry_type,
        latest.timestamp AS last_entry_time,
        CASE
            WHEN latest.entry_type = 'clock_in' THEN 'present'
            WHEN latest.entry_type = 'break_end' THEN 'present'
            WHEN latest.entry_type = 'break_start' THEN 'break'
            WHEN latest.entry_type = 'clock_out' THEN 'absent'
            ELSE 'unknown'
        END AS status,
        first_in.timestamp AS first_clock_in,
        CASE
            WHEN latest.entry_type IN ('clock_in', 'break_start', 'break_end')
            THEN EXTRACT(epoch FROM (now() - first_in.timestamp)) / 60
            ELSE NULL
        END AS minutes_today
    FROM users u
    LEFT JOIN LATERAL (
        SELECT entry_type, timestamp
        FROM time_entries
        WHERE user_id = u.id AND date(timestamp) = CURRENT_DATE
        ORDER BY timestamp DESC
        LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
        SELECT timestamp
        FROM time_entries
        WHERE user_id = u.id AND date(timestamp) = CURRENT_DATE AND entry_type = 'clock_in'
        ORDER BY timestamp
        LIMIT 1
    ) first_in ON true
    WHERE u.time_tracking_enabled = true AND u.is_active = true;
  `);
};

exports.down = pgm => {
  pgm.sql(`
    CREATE OR REPLACE VIEW time_current_status AS
    SELECT u.id AS user_id,
        (u.first_name || ' ' || u.last_name) AS name,
        u.rfid_chip_id,
        latest.entry_type AS last_entry_type,
        latest.timestamp AS last_entry_time,
        CASE
            WHEN latest.entry_type = 'clock_in' THEN 'present'
            WHEN latest.entry_type = 'break_start' THEN 'break'
            WHEN latest.entry_type IN ('clock_out', 'break_end') THEN 'absent'
            ELSE 'unknown'
        END AS status,
        first_in.timestamp AS first_clock_in,
        CASE
            WHEN latest.entry_type IN ('clock_in', 'break_start', 'break_end')
            THEN EXTRACT(epoch FROM (now() - first_in.timestamp)) / 60
            ELSE NULL
        END AS minutes_today
    FROM users u
    LEFT JOIN LATERAL (
        SELECT entry_type, timestamp
        FROM time_entries
        WHERE user_id = u.id AND date(timestamp) = CURRENT_DATE
        ORDER BY timestamp DESC
        LIMIT 1
    ) latest ON true
    LEFT JOIN LATERAL (
        SELECT timestamp
        FROM time_entries
        WHERE user_id = u.id AND date(timestamp) = CURRENT_DATE AND entry_type = 'clock_in'
        ORDER BY timestamp
        LIMIT 1
    ) first_in ON true
    WHERE u.time_tracking_enabled = true AND u.is_active = true;
  `);
};
