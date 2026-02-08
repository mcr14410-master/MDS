/* eslint-disable camelcase */

/**
 * Migration: Mehrere NFC-Karten/Tags pro User
 * 
 * - Neue Tabelle: user_rfid_chips (1:n Beziehung zu users)
 * - Bestehende rfid_chip_id Daten migrieren
 * - View time_current_status aktualisieren (rfid_chip_id entfernen)
 * - Spalte users.rfid_chip_id entfernen
 */

exports.shorthands = undefined;

exports.up = pgm => {
  // 1. Neue Tabelle erstellen
  pgm.createTable('user_rfid_chips', {
    id: { type: 'serial', primaryKey: true },
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE'
    },
    chip_uid: {
      type: 'varchar(100)',
      notNull: true,
      unique: true
    },
    label: {
      type: 'varchar(100)',
      comment: 'Bezeichnung z.B. "Schlüsselanhänger", "Karte blau"'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Index für schnelle Suche nach chip_uid
  pgm.createIndex('user_rfid_chips', 'chip_uid', {
    name: 'idx_user_rfid_chips_uid'
  });

  // Index für User-Zuordnung
  pgm.createIndex('user_rfid_chips', 'user_id', {
    name: 'idx_user_rfid_chips_user'
  });

  // 2. Bestehende Daten migrieren
  pgm.sql(`
    INSERT INTO user_rfid_chips (user_id, chip_uid, label, is_active)
    SELECT id, rfid_chip_id, 'Hauptkarte', TRUE
    FROM users
    WHERE rfid_chip_id IS NOT NULL AND rfid_chip_id != ''
  `);

  // 3. View DROPPEN, Spalte entfernen, View neu erstellen - alles als SQL
  pgm.sql(`
    DROP VIEW IF EXISTS time_current_status;
    
    ALTER TABLE users DROP COLUMN IF EXISTS rfid_chip_id;
    
    CREATE VIEW time_current_status AS
    SELECT u.id AS user_id,
        (u.first_name || ' ' || u.last_name) AS name,
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
  // Alles als SQL für garantierte Reihenfolge
  pgm.sql(`
    ALTER TABLE users ADD COLUMN rfid_chip_id varchar(50) UNIQUE;

    UPDATE users u
    SET rfid_chip_id = c.chip_uid
    FROM (
      SELECT DISTINCT ON (user_id) user_id, chip_uid
      FROM user_rfid_chips
      WHERE is_active = TRUE
      ORDER BY user_id, created_at ASC
    ) c
    WHERE u.id = c.user_id;

    DROP VIEW IF EXISTS time_current_status;

    CREATE VIEW time_current_status AS
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

  // Tabelle löschen
  pgm.dropTable('user_rfid_chips');
};
