/* eslint-disable camelcase */

/**
 * Migration: Create Vacation/Absence Management System
 * 
 * Tables:
 * - vacation_types: Types of absences (vacation, sick, training, etc.)
 * - holidays: Public holidays (auto-generated per year)
 * - vacation_entitlements: Yearly vacation allowance per user
 * - vacations: Actual absence entries
 * - vacation_settings: System settings (max concurrent, default days, etc.)
 * 
 * Views:
 * - vacation_balances: Calculated remaining vacation days
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================
  // 1. VACATION TYPES
  // ============================================
  pgm.createTable('vacation_types', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    color: { type: 'varchar(7)', notNull: true, default: '#3B82F6' }, // Hex color
    affects_balance: { type: 'boolean', notNull: true, default: true }, // Counts against vacation days
    allows_partial_day: { type: 'boolean', notNull: true, default: false }, // Allows time entries
    is_active: { type: 'boolean', notNull: true, default: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Pre-populate vacation types
  pgm.sql(`
    INSERT INTO vacation_types (name, color, affects_balance, allows_partial_day, sort_order) VALUES
    ('Urlaub', '#22C55E', true, false, 1),
    ('Krank', '#EF4444', false, false, 2),
    ('Schulung', '#8B5CF6', false, false, 3),
    ('Zeitausgleich', '#F59E0B', true, true, 4),
    ('Überstundenabbau', '#F97316', true, true, 5),
    ('Sonderurlaub', '#06B6D4', false, false, 6),
    ('Unbezahlt', '#6B7280', false, false, 7);
  `);

  // ============================================
  // 2. HOLIDAYS
  // ============================================
  pgm.createTable('holidays', {
    id: 'id',
    date: { type: 'date', notNull: true },
    name: { type: 'varchar(100)', notNull: true },
    year: { type: 'integer', notNull: true },
    region: { type: 'varchar(10)', notNull: true, default: 'BY' }, // Bavaria
    is_custom: { type: 'boolean', notNull: true, default: false }, // For manually added days
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.addConstraint('holidays', 'holidays_date_region_unique', {
    unique: ['date', 'region']
  });

  pgm.createIndex('holidays', ['year', 'region']);

  // ============================================
  // 3. VACATION ENTITLEMENTS
  // ============================================
  pgm.createTable('vacation_entitlements', {
    id: 'id',
    user_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    year: { type: 'integer', notNull: true },
    total_days: { type: 'decimal(5,2)', notNull: true, default: 30 },
    carried_over: { type: 'decimal(5,2)', notNull: true, default: 0 }, // From previous year
    adjustment: { type: 'decimal(5,2)', notNull: true, default: 0 }, // Manual adjustments
    note: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.addConstraint('vacation_entitlements', 'vacation_entitlements_user_year_unique', {
    unique: ['user_id', 'year']
  });

  // ============================================
  // 4. VACATIONS (Absences)
  // ============================================
  pgm.createTable('vacations', {
    id: 'id',
    user_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'users(id)',
      onDelete: 'CASCADE'
    },
    type_id: { 
      type: 'integer', 
      notNull: true, 
      references: 'vacation_types(id)',
      onDelete: 'RESTRICT'
    },
    start_date: { type: 'date', notNull: true },
    end_date: { type: 'date', notNull: true },
    start_time: { type: 'time' }, // For partial days (Zeitausgleich)
    end_time: { type: 'time' },   // For partial days
    calculated_days: { type: 'decimal(5,2)', notNull: true }, // Excluding weekends/holidays
    calculated_hours: { type: 'decimal(5,2)' }, // For partial days
    note: { type: 'text' },
    status: { 
      type: 'varchar(20)', 
      notNull: true, 
      default: 'approved',
      check: "status IN ('pending', 'approved', 'rejected', 'cancelled')"
    },
    created_by: { 
      type: 'integer', 
      references: 'users(id)',
      onDelete: 'SET NULL'
    },
    approved_by: { 
      type: 'integer', 
      references: 'users(id)',
      onDelete: 'SET NULL'
    },
    approved_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  pgm.createIndex('vacations', ['user_id', 'start_date', 'end_date']);
  pgm.createIndex('vacations', ['status']);

  // Check constraint: end_date >= start_date
  pgm.addConstraint('vacations', 'vacations_date_range_check', {
    check: 'end_date >= start_date'
  });

  // ============================================
  // 5. VACATION SETTINGS
  // ============================================
  pgm.createTable('vacation_settings', {
    id: 'id',
    key: { type: 'varchar(50)', notNull: true, unique: true },
    value: { type: 'text', notNull: true },
    description: { type: 'text' },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Pre-populate settings
  pgm.sql(`
    INSERT INTO vacation_settings (key, value, description) VALUES
    ('default_vacation_days', '30', 'Standard-Urlaubsanspruch pro Jahr'),
    ('max_concurrent_helper', '1', 'Max. gleichzeitig abwesende Helfer'),
    ('max_concurrent_operator', '1', 'Max. gleichzeitig abwesende Maschinenbediener'),
    ('holiday_region', 'BY', 'Region für Feiertage (BY = Bayern)'),
    ('carry_over_deadline', '03-31', 'Verfall Resturlaub (MM-DD)');
  `);

  // ============================================
  // 6. VIEW: VACATION BALANCES
  // ============================================
  pgm.sql(`
    CREATE OR REPLACE VIEW vacation_balances AS
    SELECT 
      ve.user_id,
      ve.year,
      u.username,
      COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
      r.name as role_name,
      ve.total_days,
      ve.carried_over,
      ve.adjustment,
      (ve.total_days + ve.carried_over + ve.adjustment) as available_days,
      COALESCE(used.used_days, 0) as used_days,
      (ve.total_days + ve.carried_over + ve.adjustment - COALESCE(used.used_days, 0)) as remaining_days
    FROM vacation_entitlements ve
    JOIN users u ON u.id = ve.user_id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN (
      SELECT 
        v.user_id,
        EXTRACT(YEAR FROM v.start_date) as year,
        SUM(v.calculated_days) as used_days
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.status IN ('approved', 'pending')
        AND vt.affects_balance = true
      GROUP BY v.user_id, EXTRACT(YEAR FROM v.start_date)
    ) used ON used.user_id = ve.user_id AND used.year = ve.year;
  `);

  // ============================================
  // 7. PERMISSIONS
  // ============================================
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('vacations.read', 'Abwesenheiten einsehen', 'vacations'),
    ('vacations.manage', 'Abwesenheiten verwalten (eintragen, bearbeiten, löschen)', 'vacations'),
    ('vacations.settings', 'Urlaubseinstellungen verwalten', 'vacations')
    ON CONFLICT (name) DO NOTHING;
  `);

  // Grant all vacation permissions to admin
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin' AND p.category = 'vacations'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Grant read and manage to Fertigungsleiter
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'Fertigungsleiter' AND p.name IN ('vacations.read', 'vacations.manage')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);

  // Grant read to other roles
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name IN ('CNC-Programmierer', 'Maschinenbediener') AND p.name = 'vacations.read'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  // Drop view first
  pgm.sql('DROP VIEW IF EXISTS vacation_balances;');

  // Remove permissions
  pgm.sql(`
    DELETE FROM role_permissions WHERE permission_id IN (
      SELECT id FROM permissions WHERE category = 'vacations'
    );
  `);
  pgm.sql(`DELETE FROM permissions WHERE category = 'vacations';`);

  // Drop tables in reverse order
  pgm.dropTable('vacation_settings');
  pgm.dropTable('vacations');
  pgm.dropTable('vacation_entitlements');
  pgm.dropTable('holidays');
  pgm.dropTable('vacation_types');
};
