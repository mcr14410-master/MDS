/* eslint-disable camelcase */

/**
 * Migration: halbe Feiertage (Heiligabend, Silvester) zählen als halber Urlaubstag
 *
 * Bisher wurde jeder Feiertag als ganz frei gerechnet (0 Urlaubstage). Neu zählt ein
 * halber Feiertag, der laut Zeitmodell ein Arbeitstag ist, 0,5 Tage.
 *
 * Bestehende Urlaube werden NICHT komplett neu berechnet (Zeitmodelle können sich
 * geändert haben), sondern je halbem Feiertag im Zeitraum um +0,5 ergänzt
 * (calculated_days und days_by_year).
 *
 * Nur halbe Feiertage ab 01.01.2026: Für ältere Jahre ist der Übertrag schon gebucht.
 * Übersprungen (mit Warnung) werden Urlaube, die vor dem Anlegen des Feiertags
 * berechnet wurden – dort zählte der Tag schon voll (siehe Prüfabfrage in der
 * Release-Checkliste).
 */

const { countWorkingDays } = require('../src/utils/workingDays');

exports.shorthands = undefined;

const FROM_DATE = '2026-01-01';

async function collectAdjustments(pgm) {
  const result = await pgm.db.query(`
    SELECT v.id, v.calculated_days, v.days_by_year, v.created_at AS vacation_created,
           h.date::text AS holiday_date, h.created_at AS holiday_created,
           to_jsonb(tm) AS model
    FROM vacations v
    JOIN holidays h
      ON h.is_half_day = true AND h.region = 'BY'
     AND h.date BETWEEN v.start_date AND v.end_date
     AND h.date >= $1
    JOIN users u ON u.id = v.user_id
    LEFT JOIN time_models tm ON tm.id = u.time_model_id
    WHERE v.status <> 'cancelled'
    ORDER BY v.id, h.date
  `, [FROM_DATE]);

  const byVacation = new Map();
  for (const row of result.rows) {
    if (row.holiday_created > row.vacation_created) {
      console.warn(`Urlaub ${row.id}: halber Feiertag ${row.holiday_date} erst nach dem Antrag angelegt – übersprungen, bitte prüfen`);
      continue;
    }
    // Arbeitstag laut Zeitmodell? (ohne Feiertage gezählt: 1 = Arbeitstag)
    if (countWorkingDays(row.holiday_date, row.holiday_date, row.model, new Set()) !== 1) continue;

    if (!byVacation.has(row.id)) {
      byVacation.set(row.id, { days: parseFloat(row.calculated_days), byYear: { ...row.days_by_year }, delta: 0, dates: [] });
    }
    const entry = byVacation.get(row.id);
    const year = row.holiday_date.slice(0, 4);
    entry.byYear[year] = parseFloat(entry.byYear[year] || 0);
    entry.delta += 0.5;
    entry.dates.push(row.holiday_date);
  }
  return byVacation;
}

function queueUpdates(pgm, byVacation, sign) {
  for (const [id, entry] of byVacation) {
    const byYear = { ...entry.byYear };
    for (const date of entry.dates) {
      const year = date.slice(0, 4);
      byYear[year] = byYear[year] + sign * 0.5;
    }
    const days = entry.days + sign * entry.delta;
    pgm.sql(`UPDATE vacations SET calculated_days = ${days}, days_by_year = '${JSON.stringify(byYear)}'::jsonb WHERE id = ${Number(id)};`);
    console.log(`Urlaub ${id}: ${entry.days} → ${days} Tage (halbe Feiertage: ${entry.dates.join(', ')})`);
  }
}

exports.up = async (pgm) => {
  queueUpdates(pgm, await collectAdjustments(pgm), +1);
};

// Nur korrekt, solange die betroffenen Urlaube seit der Migration nicht geändert wurden
exports.down = async (pgm) => {
  queueUpdates(pgm, await collectAdjustments(pgm), -1);
};
