/* eslint-disable camelcase */

/**
 * Migration: Split used_days into pending_days, approved_days, taken_days
 * 
 * - taken_days: approved + end_date < today (bereits vergangen)
 * - approved_days: approved + end_date >= today (genehmigt, noch nicht vergangen)
 * - pending_days: pending (beantragt, noch nicht genehmigt)
 * - used_days: bleibt als Summe aller drei (für remaining_days Berechnung)
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
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
      COALESCE(counts.taken_days, 0) as taken_days,
      COALESCE(counts.approved_days, 0) as approved_days,
      COALESCE(counts.pending_days, 0) as pending_days,
      COALESCE(counts.taken_days, 0) + COALESCE(counts.approved_days, 0) + COALESCE(counts.pending_days, 0) as used_days,
      (ve.total_days + ve.carried_over + ve.adjustment
        - COALESCE(counts.taken_days, 0)
        - COALESCE(counts.approved_days, 0)
        - COALESCE(counts.pending_days, 0)
      ) as remaining_days
    FROM vacation_entitlements ve
    JOIN users u ON u.id = ve.user_id AND u.vacation_tracking_enabled = TRUE
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN (
      SELECT
        v.user_id,
        EXTRACT(YEAR FROM v.start_date) as year,
        SUM(CASE WHEN v.status = 'approved' AND v.end_date < CURRENT_DATE THEN v.calculated_days ELSE 0 END) as taken_days,
        SUM(CASE WHEN v.status = 'approved' AND v.end_date >= CURRENT_DATE THEN v.calculated_days ELSE 0 END) as approved_days,
        SUM(CASE WHEN v.status = 'pending' THEN v.calculated_days ELSE 0 END) as pending_days
      FROM vacations v
      JOIN vacation_types vt ON vt.id = v.type_id
      WHERE v.status IN ('approved', 'pending')
        AND vt.affects_balance = true
      GROUP BY v.user_id, EXTRACT(YEAR FROM v.start_date)
    ) counts ON counts.user_id = ve.user_id AND counts.year = ve.year
    ORDER BY ve.user_id, ve.year, ur.role_id;
  `);
};

exports.down = (pgm) => {
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
};
