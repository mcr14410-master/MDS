/* eslint-disable camelcase */

/**
 * Migration: Add entitlement_id to vacation_balances view
 * 
 * This allows the frontend to update specific entitlements
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Drop and recreate view with entitlement_id
  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  
  pgm.sql(`
    CREATE VIEW vacation_balances AS
    SELECT 
      ve.id as entitlement_id,
      ve.user_id,
      ve.year,
      u.username,
      COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
      r.name as role_name,
      ve.total_days,
      ve.carried_over,
      ve.adjustment,
      ve.note,
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
};

exports.down = (pgm) => {
  // Recreate original view without entitlement_id
  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  
  pgm.sql(`
    CREATE VIEW vacation_balances AS
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
};
