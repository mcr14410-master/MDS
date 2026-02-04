/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  // ============================================
  // Tabelle: time_models (Arbeitszeitmodelle)
  // ============================================
  pgm.createTable('time_models', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true },
    description: { type: 'text' },
    
    // Soll-Stunden pro Wochentag (in Minuten, NULL = frei)
    monday_minutes: { type: 'integer', default: 510 },    // 8,5h = 510 Min
    tuesday_minutes: { type: 'integer', default: 510 },
    wednesday_minutes: { type: 'integer', default: 510 },
    thursday_minutes: { type: 'integer', default: 510 },
    friday_minutes: { type: 'integer', default: 360 },    // 6h = 360 Min
    saturday_minutes: { type: 'integer', default: null },
    sunday_minutes: { type: 'integer', default: null },
    
    // Pausenregelung
    default_break_minutes: { type: 'integer', default: 30 },
    min_break_minutes: { type: 'integer', default: 30 },
    
    // Optionale Einstellungen
    core_time_start: { type: 'time' },
    core_time_end: { type: 'time' },
    flex_time_start: { type: 'time' },
    flex_time_end: { type: 'time' },
    
    is_default: { type: 'boolean', default: false },
    is_active: { type: 'boolean', default: true },
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  // Standard-Modell einfügen
  pgm.sql(`
    INSERT INTO time_models (name, description, is_default) VALUES 
    ('Vollzeit 40h', 'Standard: Mo-Do 8,5h, Fr 6h', TRUE)
  `);

  // ============================================
  // Tabelle: time_terminals (Terminal-Geräte)
  // ============================================
  pgm.createTable('time_terminals', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true },
    location: { type: 'varchar(200)' },
    
    hardware_id: { type: 'varchar(100)', unique: true },
    ip_address: { type: 'varchar(45)' },
    
    is_active: { type: 'boolean', default: true },
    last_heartbeat: { type: 'timestamptz' },
    last_sync: { type: 'timestamptz' },
    
    settings: { type: 'jsonb', default: '{}' },
    
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  // ============================================
  // Erweiterung: users Tabelle
  // ============================================
  pgm.addColumns('users', {
    rfid_chip_id: { type: 'varchar(50)', unique: true },
    pin_code: { type: 'varchar(10)' },
    time_tracking_enabled: { type: 'boolean', default: false },
    time_model_id: { 
      type: 'integer', 
      references: 'time_models',
      onDelete: 'SET NULL'
    },
    time_balance_carryover: { type: 'integer', default: 0 }
  });

  // ============================================
  // Tabelle: time_entries (Stempelungen)
  // ============================================
  pgm.createTable('time_entries', {
    id: 'id',
    user_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'users',
      onDelete: 'CASCADE'
    },
    
    entry_type: { type: 'varchar(20)', notNull: true },
    timestamp: { type: 'timestamptz', notNull: true },
    
    source: { type: 'varchar(20)', default: 'terminal' },
    terminal_id: { 
      type: 'integer', 
      references: 'time_terminals',
      onDelete: 'SET NULL'
    },
    
    is_correction: { type: 'boolean', default: false },
    correction_reason: { type: 'text' },
    corrected_by: { 
      type: 'integer', 
      references: 'users',
      onDelete: 'SET NULL'
    },
    original_entry_id: { 
      type: 'integer', 
      references: 'time_entries',
      onDelete: 'SET NULL'
    },
    
    offline_created: { type: 'boolean', default: false },
    synced_at: { type: 'timestamptz' },
    
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  // Check constraint für entry_type
  pgm.sql(`
    ALTER TABLE time_entries ADD CONSTRAINT valid_entry_type 
    CHECK (entry_type IN ('clock_in', 'clock_out', 'break_start', 'break_end'))
  `);

  // Indizes für schnelle Abfragen
  pgm.sql('CREATE INDEX idx_time_entries_user_timestamp ON time_entries (user_id, timestamp)');
  pgm.sql('CREATE INDEX idx_time_entries_timestamp ON time_entries (timestamp)');

  // ============================================
  // Tabelle: time_daily_summary (Tagesübersicht)
  // ============================================
  pgm.createTable('time_daily_summary', {
    id: 'id',
    user_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'users',
      onDelete: 'CASCADE'
    },
    date: { type: 'date', notNull: true },
    
    target_minutes: { type: 'integer', notNull: true, default: 0 },
    worked_minutes: { type: 'integer', default: 0 },
    break_minutes: { type: 'integer', default: 0 },
    overtime_minutes: { type: 'integer', default: 0 },
    
    status: { type: 'varchar(20)', default: 'incomplete' },
    
    first_clock_in: { type: 'timestamptz' },
    last_clock_out: { type: 'timestamptz' },
    
    has_missing_entries: { type: 'boolean', default: false },
    missing_entry_types: { type: 'text[]' },
    
    vacation_id: { 
      type: 'integer', 
      references: 'vacations',
      onDelete: 'SET NULL'
    },
    holiday_id: { 
      type: 'integer', 
      references: 'holidays',
      onDelete: 'SET NULL'
    },
    
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  pgm.addConstraint('time_daily_summary', 'unique_user_date', {
    unique: ['user_id', 'date']
  });

  pgm.sql("CREATE INDEX idx_time_daily_user_date ON time_daily_summary (user_id, date)");

  // ============================================
  // Tabelle: time_balances (Zeitkonto-Saldo)
  // ============================================
  pgm.createTable('time_balances', {
    id: 'id',
    user_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'users',
      onDelete: 'CASCADE'
    },
    
    balance_minutes: { type: 'integer', default: 0 },
    
    year: { type: 'integer', notNull: true },
    month: { type: 'integer', notNull: true },
    
    target_minutes: { type: 'integer', default: 0 },
    worked_minutes: { type: 'integer', default: 0 },
    overtime_minutes: { type: 'integer', default: 0 },
    
    adjustment_minutes: { type: 'integer', default: 0 },
    adjustment_reason: { type: 'text' },
    payout_minutes: { type: 'integer', default: 0 },
    payout_date: { type: 'date' },
    
    carryover_minutes: { type: 'integer', default: 0 },
    
    created_at: { type: 'timestamptz', default: pgm.func('NOW()') },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  pgm.addConstraint('time_balances', 'unique_user_year_month', {
    unique: ['user_id', 'year', 'month']
  });

  // ============================================
  // Tabelle: time_settings (Globale Einstellungen)
  // ============================================
  pgm.createTable('time_settings', {
    id: 'id',
    key: { type: 'varchar(100)', notNull: true, unique: true },
    value: { type: 'text' },
    description: { type: 'text' },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') }
  });

  // Standard-Einstellungen einfügen
  pgm.sql(`
    INSERT INTO time_settings (key, value, description) VALUES
    ('overtime_limit_enabled', 'false', 'Überstunden-Obergrenze aktiv'),
    ('overtime_limit_minutes', '2400', 'Max. Überstunden (40h = 2400 Min)'),
    ('overtime_warning_minutes', '1800', 'Warnung ab (30h = 1800 Min)'),
    ('min_break_threshold_minutes', '360', 'Ab dieser Arbeitszeit Pause nötig (6h)'),
    ('min_break_minutes', '30', 'Mindestpause in Minuten'),
    ('auto_break_deduct', 'false', 'Pause automatisch abziehen wenn vergessen'),
    ('auto_break_after_minutes', '360', 'Nach X Minuten automatisch Pause abziehen'),
    ('tolerance_minutes', '5', 'Toleranz für pünktlich in Minuten'),
    ('terminal_timeout_seconds', '30', 'Terminal Display-Timeout'),
    ('terminal_sound_enabled', 'true', 'Terminal Sounds aktiviert'),
    ('absence_credits_target', 'true', 'Bei Urlaub/Krank Soll-Stunden gutschreiben'),
    ('data_retention_years', '10', 'Aufbewahrungsdauer in Jahren')
  `);

  // ============================================
  // View: Aktuelle Anwesenheit
  // ============================================
  pgm.sql(`
    CREATE OR REPLACE VIEW time_current_status AS
    SELECT 
        u.id AS user_id,
        u.first_name || ' ' || u.last_name AS name,
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
            THEN EXTRACT(EPOCH FROM (NOW() - first_in.timestamp)) / 60
            ELSE NULL
        END AS minutes_today
        
    FROM users u
    LEFT JOIN LATERAL (
        SELECT entry_type, timestamp 
        FROM time_entries 
        WHERE user_id = u.id AND DATE(timestamp) = CURRENT_DATE
        ORDER BY timestamp DESC LIMIT 1
    ) latest ON TRUE
    LEFT JOIN LATERAL (
        SELECT timestamp 
        FROM time_entries 
        WHERE user_id = u.id AND DATE(timestamp) = CURRENT_DATE AND entry_type = 'clock_in'
        ORDER BY timestamp ASC LIMIT 1
    ) first_in ON TRUE
    WHERE u.time_tracking_enabled = TRUE AND u.is_active = TRUE
  `);

  // ============================================
  // View: Fehlbuchungen
  // ============================================
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

  // ============================================
  // View: Zeitmodell mit berechneter Wochenstundenzahl
  // ============================================
  pgm.sql(`
    CREATE OR REPLACE VIEW time_models_with_weekly AS
    SELECT 
        *,
        COALESCE(monday_minutes, 0) + 
        COALESCE(tuesday_minutes, 0) + 
        COALESCE(wednesday_minutes, 0) + 
        COALESCE(thursday_minutes, 0) + 
        COALESCE(friday_minutes, 0) + 
        COALESCE(saturday_minutes, 0) + 
        COALESCE(sunday_minutes, 0) AS weekly_minutes
    FROM time_models
  `);

  // ============================================
  // Permissions für Zeiterfassung
  // ============================================
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('time_tracking.view_own', 'Eigene Stempelungen und Zeitkonto einsehen', 'Zeiterfassung'),
    ('time_tracking.manage', 'Alle Zeiten einsehen, Korrekturen vornehmen, Fehlbuchungen bearbeiten', 'Zeiterfassung'),
    ('time_tracking.settings', 'Zeitmodelle, globale Einstellungen, Auszahlungen verwalten', 'Zeiterfassung')
    ON CONFLICT (name) DO NOTHING
  `);

  // Standard-Berechtigungen für Admin-Rolle
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Admin' 
    AND p.name IN ('time_tracking.view_own', 'time_tracking.manage', 'time_tracking.settings')
    ON CONFLICT DO NOTHING
  `);

  // view_own für alle Rollen (außer evtl. System-Rollen)
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE p.name = 'time_tracking.view_own'
    ON CONFLICT DO NOTHING
  `);
};

exports.down = pgm => {
  // Views entfernen
  pgm.sql('DROP VIEW IF EXISTS time_models_with_weekly');
  pgm.sql('DROP VIEW IF EXISTS time_missing_entries');
  pgm.sql('DROP VIEW IF EXISTS time_current_status');
  
  // Permissions entfernen
  pgm.sql(`
    DELETE FROM role_permissions 
    WHERE permission_id IN (
      SELECT id FROM permissions WHERE name LIKE 'time_tracking.%'
    )
  `);
  pgm.sql(`DELETE FROM permissions WHERE name LIKE 'time_tracking.%'`);
  
  // Tabellen entfernen (Reihenfolge beachten wegen FK)
  pgm.dropTable('time_balances');
  pgm.dropTable('time_daily_summary');
  pgm.dropTable('time_entries');
  pgm.dropTable('time_settings');
  pgm.dropTable('time_terminals');
  
  // User-Spalten entfernen
  pgm.dropColumns('users', [
    'rfid_chip_id',
    'pin_code', 
    'time_tracking_enabled',
    'time_model_id',
    'time_balance_carryover'
  ]);
  
  pgm.dropTable('time_models');
};
