/* eslint-disable camelcase */

/**
 * Migration: Add vacation_tracking_enabled field to users
 * 
 * Allows excluding specific users from vacation management
 * (e.g. external contractors, part-time workers, etc.)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Add column to users table
  pgm.addColumn('users', {
    vacation_tracking_enabled: {
      type: 'boolean',
      notNull: true,
      default: true
    }
  });

  // Add comment
  pgm.sql(`
    COMMENT ON COLUMN users.vacation_tracking_enabled IS 
    'If false, user is excluded from vacation management (balances, calendar, etc.)';
  `);

  // Update vacation_balances view to filter by vacation_tracking_enabled
  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  
  pgm.sql(`
    CREATE VIEW vacation_balances AS
    SELECT DISTINCT ON (ve.user_id, ve.year)
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
    JOIN users u ON u.id = ve.user_id AND u.vacation_tracking_enabled = true
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
    ) used ON used.user_id = ve.user_id AND used.year = ve.year
    ORDER BY ve.user_id, ve.year, ur.role_id;
  `);
};

exports.down = (pgm) => {
  // Restore view without filter
  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  
  pgm.sql(`
    CREATE VIEW vacation_balances AS
    SELECT DISTINCT ON (ve.user_id, ve.year)
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
    ) used ON used.user_id = ve.user_id AND used.year = ve.year
    ORDER BY ve.user_id, ve.year, ur.role_id;
  `);

  pgm.dropColumn('users', 'vacation_tracking_enabled');
};
