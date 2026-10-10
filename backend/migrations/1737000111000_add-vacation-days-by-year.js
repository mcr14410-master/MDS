/* eslint-disable camelcase */

/**
 * Migration: Urlaub über den Jahreswechsel
 *
 * - vacations.days_by_year (JSONB): Arbeitstage je Kalenderjahr, z. B. {"2026": 8, "2027": 4}
 *   calculated_days bleibt die Gesamtzahl
 * - Backfill: Urlaube innerhalb eines Jahres → {Jahr: calculated_days};
 *   jahresübergreifende werden je Jahr neu berechnet (Gesamtzahl bleibt erhalten)
 * - vacation_balances summiert den Anteil des jeweiligen Jahres statt nach Startjahr
 */

const { countWorkingDaysByYear } = require('../src/utils/workingDays');

exports.shorthands = undefined;

const BALANCES_VIEW_BY_START_YEAR = `
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
`;

const BALANCES_VIEW_BY_YEAR_SHARE = `
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
      d.key::int as year,
      SUM(CASE WHEN v.status = 'approved' AND v.end_date < CURRENT_DATE THEN d.value::numeric ELSE 0 END) as taken_days,
      SUM(CASE WHEN v.status = 'approved' AND v.end_date >= CURRENT_DATE THEN d.value::numeric ELSE 0 END) as approved_days,
      SUM(CASE WHEN v.status = 'pending' THEN d.value::numeric ELSE 0 END) as pending_days
    FROM vacations v
    JOIN vacation_types vt ON vt.id = v.type_id
    CROSS JOIN LATERAL jsonb_each_text(v.days_by_year) d
    WHERE v.status IN ('approved', 'pending')
      AND vt.affects_balance = true
    GROUP BY v.user_id, d.key::int
  ) counts ON counts.user_id = ve.user_id AND counts.year = ve.year
  ORDER BY ve.user_id, ve.year, ur.role_id;
`;

exports.up = async (pgm) => {
  // Jahresübergreifende Urlaube sofort lesen und je Jahr neu berechnen
  // (pgm.db.query läuft direkt, pgm.sql/addColumn erst nach up() in Reihenfolge)
  const spanning = await pgm.db.query(`
    SELECT v.id, v.start_date::text AS start_date, v.end_date::text AS end_date, v.calculated_days,
           to_jsonb(tm) AS model
    FROM vacations v
    JOIN users u ON u.id = v.user_id
    LEFT JOIN time_models tm ON tm.id = u.time_model_id
    WHERE EXTRACT(YEAR FROM v.start_date) <> EXTRACT(YEAR FROM v.end_date)
  `);

  const spanningUpdates = [];
  for (const v of spanning.rows) {
    const holidaysResult = await pgm.db.query(
      `SELECT date::text AS date FROM holidays WHERE date >= $1 AND date <= $2 AND region = 'BY'`,
      [v.start_date, v.end_date]
    );
    const holidays = new Set(holidaysResult.rows.map(h => h.date));
    const byYear = countWorkingDaysByYear(v.start_date, v.end_date, v.model, holidays);

    // Gesamtzahl bleibt wie gespeichert (Zeitmodell kann sich seitdem geändert haben):
    // Differenz geht ins Startjahr
    const total = Object.values(byYear).reduce((sum, d) => sum + d, 0);
    const diff = parseFloat(v.calculated_days) - total;
    if (diff !== 0) {
      const startYear = v.start_date.slice(0, 4);
      byYear[startYear] = Math.max(0, byYear[startYear] + diff);
      console.warn(`Urlaub ${v.id}: Neuberechnung ${total} ≠ gespeichert ${v.calculated_days}, Differenz ins Jahr ${startYear}`);
    }
    spanningUpdates.push({ id: Number(v.id), byYear });
  }

  pgm.addColumn('vacations', {
    days_by_year: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
      comment: 'Arbeitstage je Kalenderjahr, z. B. {"2026": 8, "2027": 4}',
    },
  });

  // Urlaube innerhalb eines Jahres
  pgm.sql(`
    UPDATE vacations
    SET days_by_year = jsonb_build_object(EXTRACT(YEAR FROM start_date)::int::text, calculated_days)
    WHERE EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM end_date);
  `);

  for (const { id, byYear } of spanningUpdates) {
    pgm.sql(`UPDATE vacations SET days_by_year = '${JSON.stringify(byYear)}'::jsonb WHERE id = ${id};`);
  }

  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  pgm.sql(BALANCES_VIEW_BY_YEAR_SHARE);
};

exports.down = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS vacation_balances;`);
  pgm.sql(BALANCES_VIEW_BY_START_YEAR);
  pgm.dropColumn('vacations', 'days_by_year');
};
