/**
 * Zeitmodell-Verlauf (Tabelle user_time_models)
 *
 * Jeder Eintrag gilt ab valid_from bis zum Tag vor dem nächsten Eintrag; vor dem ersten Eintrag
 * gilt kein Modell (Urlaubsberechnung dann Mo–Fr, Zeiterfassung ohne Soll).
 *
 * `db` ist der Pool oder ein Client innerhalb einer Transaktion.
 */

const pool = require('../config/db');
const { toDateStr } = require('./workingDays');

const todayBerlin = () => toDateStr(new Date());

/**
 * Reine Auswahl: Eintrag, der am Datum gilt (Einträge in beliebiger Reihenfolge)
 * @param {Array<{valid_from: string}>} entries
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {object|null}
 */
function pickEntryForDate(entries, dateStr) {
  let best = null;
  for (const e of entries) {
    const from = toDateStr(e.valid_from);
    if (from <= dateStr && (!best || from > toDateStr(best.valid_from))) best = e;
  }
  return best;
}

/**
 * Zeitmodell (Zeile aus time_models), das am Datum gilt, oder null
 */
async function getTimeModelAt(userId, dateStr, db = pool) {
  const result = await db.query(`
    SELECT tm.*
    FROM user_time_models utm
    JOIN time_models tm ON tm.id = utm.time_model_id
    WHERE utm.user_id = $1 AND utm.valid_from <= $2
    ORDER BY utm.valid_from DESC
    LIMIT 1
  `, [userId, dateStr]);
  return result.rows[0] || null;
}

/**
 * Für Schleifen über viele Tage: lädt den Verlauf einmal, liefert (dateStr) => Zeitmodell | null
 */
async function loadTimeModelResolver(userId, db = pool) {
  const result = await db.query(`
    SELECT utm.valid_from, tm.*
    FROM user_time_models utm
    JOIN time_models tm ON tm.id = utm.time_model_id
    WHERE utm.user_id = $1
  `, [userId]);
  const entries = result.rows;
  return (dateStr) => {
    const entry = pickEntryForDate(entries, toDateStr(dateStr));
    if (!entry) return null;
    const { valid_from, ...model } = entry; // eslint-disable-line no-unused-vars
    return model;
  };
}

/**
 * Zuordnung eintragen. Ohne validFrom: erste Zuordnung ab Zeiterfassungs-Start (sonst heute),
 * jede weitere ab heute. Gilt am Stichtag schon dasselbe Modell, passiert nichts.
 * @returns {object|null} angelegter/geänderter Eintrag, null wenn unverändert
 */
async function recordTimeModelAssignment({ userId, timeModelId, validFrom, createdBy }, db = pool) {
  if (!validFrom) {
    const existing = await db.query('SELECT 1 FROM user_time_models WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rows.length === 0) {
      const user = await db.query('SELECT time_tracking_start_date FROM users WHERE id = $1', [userId]);
      validFrom = user.rows[0]?.time_tracking_start_date || todayBerlin();
    } else {
      validFrom = todayBerlin();
    }
  }
  validFrom = toDateStr(validFrom);

  const entries = (await db.query(
    'SELECT time_model_id, valid_from FROM user_time_models WHERE user_id = $1', [userId]
  )).rows;
  const current = pickEntryForDate(entries, validFrom);
  if (current && current.time_model_id === Number(timeModelId)) return null;

  const result = await db.query(`
    INSERT INTO user_time_models (user_id, time_model_id, valid_from, created_by)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, valid_from) DO UPDATE
      SET time_model_id = EXCLUDED.time_model_id, created_by = EXCLUDED.created_by, created_at = NOW()
    RETURNING *
  `, [userId, timeModelId, validFrom, createdBy || null]);
  return result.rows[0];
}

module.exports = { pickEntryForDate, getTimeModelAt, loadTimeModelResolver, recordTimeModelAssignment };
