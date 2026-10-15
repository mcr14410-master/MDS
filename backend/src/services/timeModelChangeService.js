/**
 * Zeitmodell-Verlauf ändern – Eintrag anlegen, korrigieren oder löschen, mit Vorschau und Neuberechnung
 *
 * Ablauf: Verlauf laden → Änderung im Speicher anwenden (prüfen) → Auswirkung berechnen
 * (Tage, an denen sich das gültige Modell ändert; Urlaube, deren Tage sich ändern) →
 * bei „Übernehmen“: Verlauf + users.time_model_id + Audit-Log in einer Transaktion, danach
 * Tageswerte, Urlaubstage und Monatssalden neu rechnen.
 *
 * Tage: vorhandene Tageswerte werden neu gerechnet (manuelles Soll bleibt), Tage, die ein neuer
 * Arbeitstag werden, angelegt wie vom Nacht-Job (fehlende Buchung, Urlaub, Feiertag), Tageswerte
 * ohne Stempel und ohne manuelles Soll an Tagen, die frei werden, entfernt (der Nacht-Job hätte sie
 * nicht angelegt).
 *
 * Die Neuberechnung läuft wie die bestehenden Rechenwege über den Pool, also nach dem Commit und nicht
 * in derselben Transaktion.
 */

const pool = require('../config/db');
const { toDateStr } = require('../utils/workingDays');
const { makeResolver, loadTimeModelHistory } = require('../utils/timeModelHistory');
const { computeDailySummary, updateDailySummary } = require('../controllers/timeEntriesController');
const { calculateWorkingDaysByYear } = require('../controllers/vacationsController');
const { recalculateFromMonth } = require('../controllers/timeBalancesController');

class TimeModelChangeError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const todayBerlin = () => toDateStr(new Date());
const nextDay = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
const formatDate = (dateStr) => dateStr.split('-').reverse().join('.');

// Soll laut Zeitmodell am Wochentag (ohne Feiertag/Abwesenheit)
function baseTarget(model, dateStr) {
  if (!model) return 0;
  return parseInt(model[`${DAY_KEYS[new Date(`${dateStr}T12:00:00Z`).getUTCDay()]}_minutes`]) || 0;
}

const modelInfo = (model) => (model ? { id: model.id, name: model.name } : null);

function parseDate(value, field) {
  const str = typeof value === 'string' ? value.slice(0, 10) : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str) || Number.isNaN(Date.parse(`${str}T00:00:00Z`))) {
    throw new TimeModelChangeError(400, `${field}: gültiges Datum (JJJJ-MM-TT) erforderlich`);
  }
  return str;
}

async function loadModel(timeModelId) {
  const id = parseInt(timeModelId);
  if (!id) throw new TimeModelChangeError(400, 'Zeitmodell erforderlich');
  const result = await pool.query('SELECT row_to_json(tm) AS model FROM time_models tm WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new TimeModelChangeError(404, 'Zeitmodell nicht gefunden');
  return result.rows[0].model;
}

/**
 * Änderung im Speicher anwenden und prüfen
 * @param {number} userId
 * @param {{ action: 'create'|'update'|'delete', entryId?: number, timeModelId?: number, validFrom?: string }} change
 * @returns {{ user, before, after, oldEntry, newEntry, from }} from = frühester betroffener Tag
 */
async function planChange(userId, change) {
  const userResult = await pool.query(
    'SELECT id, first_name, last_name, time_tracking_enabled, time_tracking_start_date FROM users WHERE id = $1',
    [userId]
  );
  if (userResult.rows.length === 0) throw new TimeModelChangeError(404, 'Benutzer nicht gefunden');
  const user = userResult.rows[0];

  const before = await loadTimeModelHistory(userId);
  let after;
  let oldEntry = null;
  let newEntry = null;
  let from;

  if (change.action === 'create') {
    const validFrom = parseDate(change.validFrom, 'Gültig ab');
    const model = await loadModel(change.timeModelId);
    if (before.some(e => e.valid_from === validFrom)) {
      throw new TimeModelChangeError(409, `Ab ${formatDate(validFrom)} gibt es schon einen Eintrag – bitte diesen korrigieren`);
    }
    const current = makeResolver(before)(validFrom);
    if (current && current.id === model.id) {
      throw new TimeModelChangeError(400, `Am ${formatDate(validFrom)} gilt bereits „${model.name}“`);
    }
    newEntry = { id: null, time_model_id: model.id, valid_from: validFrom, model };
    after = [...before, newEntry];
    from = validFrom;
  } else if (change.action === 'update' || change.action === 'delete') {
    oldEntry = before.find(e => e.id === parseInt(change.entryId));
    if (!oldEntry) throw new TimeModelChangeError(404, 'Verlaufseintrag nicht gefunden');

    if (change.action === 'delete') {
      if (before.length === 1) {
        throw new TimeModelChangeError(400, 'Der einzige Eintrag kann nicht gelöscht werden – bitte korrigieren');
      }
      after = before.filter(e => e !== oldEntry);
      from = oldEntry.valid_from;
    } else {
      const validFrom = change.validFrom !== undefined ? parseDate(change.validFrom, 'Gültig ab') : oldEntry.valid_from;
      const model = change.timeModelId !== undefined ? await loadModel(change.timeModelId) : oldEntry.model;
      if (validFrom === oldEntry.valid_from && model.id === oldEntry.time_model_id) {
        throw new TimeModelChangeError(400, 'Keine Änderung');
      }
      if (before.some(e => e !== oldEntry && e.valid_from === validFrom)) {
        throw new TimeModelChangeError(409, `Ab ${formatDate(validFrom)} gibt es schon einen anderen Eintrag`);
      }
      newEntry = { ...oldEntry, time_model_id: model.id, valid_from: validFrom, model };
      after = before.map(e => (e === oldEntry ? newEntry : e));
      from = validFrom < oldEntry.valid_from ? validFrom : oldEntry.valid_from;
    }
  } else {
    throw new TimeModelChangeError(400, 'Unbekannte Aktion');
  }

  after.sort((a, b) => (a.valid_from < b.valid_from ? -1 : 1));
  return { user, before, after, oldEntry, newEntry, from };
}

/**
 * Auswirkung einer geplanten Änderung (liest nur)
 * @returns {{ days, vacations, months, summary }} days: alle Tage, an denen sich das gültige Modell ändert
 *          und die einen Tageswert haben bzw. bekommen ({ date, action: recalc|create|delete, changed, … })
 */
async function computeImpact(userId, plan) {
  const today = todayBerlin();
  const oldAt = makeResolver(plan.before);
  const newAt = makeResolver(plan.after);
  const startDate = plan.user.time_tracking_start_date ? toDateStr(plan.user.time_tracking_start_date) : null;

  const days = [];
  if (plan.from <= today) {
    const summaries = await pool.query(`
      SELECT date, target_minutes, worked_minutes, overtime_minutes, status, target_override_minutes
      FROM time_daily_summary WHERE user_id = $1 AND date >= $2 AND date <= $3
    `, [userId, plan.from, today]);
    const existing = new Map(summaries.rows.map(r => [toDateStr(r.date), r]));

    for (let d = plan.from; d <= today; d = nextDay(d)) {
      const oldModel = oldAt(d);
      const newModel = newAt(d);
      if ((oldModel?.id ?? null) === (newModel?.id ?? null)) continue;

      const row = existing.get(d);
      let action;
      if (row) {
        action = 'recalc';
      } else if (d < today && plan.user.time_tracking_enabled && (!startDate || d >= startDate)
                 && baseTarget(newModel, d) > 0) {
        action = 'create';
      } else {
        continue;
      }

      const sim = await computeDailySummary(userId, new Date(`${d}T12:00:00`), { modelAt: newAt });
      if (action === 'recalc' && !sim.hasTargetOverride && sim.entryCount === 0 && baseTarget(newModel, d) === 0) {
        action = 'delete';
      }

      const oldValues = row
        ? { target: row.target_minutes, overtime: row.overtime_minutes, status: row.status }
        : null;
      const newValues = action === 'delete'
        ? null
        : { target: sim.target_minutes, overtime: sim.overtime_minutes, status: sim.status };
      const changed = action !== 'recalc'
        || oldValues.target !== newValues.target || oldValues.overtime !== newValues.overtime
        || oldValues.status !== newValues.status;

      days.push({
        date: d,
        action,
        changed,
        has_target_override: !!row && row.target_override_minutes !== null,
        old_model: modelInfo(oldModel),
        new_model: modelInfo(newModel),
        old: oldValues,
        new: newValues,
      });
    }
  }

  // Saldo-Änderung je Monat
  const monthMap = new Map();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const m = monthMap.get(key) || { month: key, days: 0, overtime_delta: 0 };
    if (day.changed) m.days++;
    m.overtime_delta += (day.new?.overtime || 0) - (day.old?.overtime || 0);
    monthMap.set(key, m);
  }
  const currentMonth = today.slice(0, 7);
  const months = [...monthMap.values()]
    .filter(m => m.days > 0)
    .map(m => ({ ...m, is_past: m.month < currentMonth }));

  // Urlaube/Abwesenheiten (genehmigt oder beantragt), deren Tage sich ändern
  const vacations = [];
  const vacResult = await pool.query(`
    SELECT v.id, v.start_date, v.end_date, v.status, v.calculated_days, v.days_by_year, vt.name AS type_name
    FROM vacations v
    JOIN vacation_types vt ON vt.id = v.type_id
    WHERE v.user_id = $1 AND v.status IN ('approved', 'pending') AND v.end_date >= $2
    ORDER BY v.start_date
  `, [userId, plan.from]);
  for (const v of vacResult.rows) {
    const start = toDateStr(v.start_date);
    const end = toDateStr(v.end_date);
    const newByYear = await calculateWorkingDaysByYear(userId, start, end, undefined, newAt);
    const newDays = Object.values(newByYear).reduce((sum, n) => sum + n, 0);
    const oldByYear = v.days_by_year || {};
    const sameByYear = Object.keys({ ...oldByYear, ...newByYear })
      .every(y => parseFloat(oldByYear[y] || 0) === parseFloat(newByYear[y] || 0));
    if (sameByYear && parseFloat(v.calculated_days) === newDays) continue;
    vacations.push({
      id: v.id,
      type: v.type_name,
      status: v.status,
      start_date: start,
      end_date: end,
      old_days: parseFloat(v.calculated_days),
      new_days: newDays,
      new_days_by_year: newByYear,
    });
  }

  const changedDays = days.filter(d => d.changed);
  return {
    days,
    vacations,
    months,
    summary: {
      from: plan.from,
      changed_days: changedDays.length,
      created_days: days.filter(d => d.action === 'create').length,
      deleted_days: days.filter(d => d.action === 'delete').length,
      kept_overrides: days.filter(d => d.has_target_override).length,
      overtime_delta: months.reduce((sum, m) => sum + m.overtime_delta, 0),
      past_months: months.filter(m => m.is_past).map(m => m.month),
      vacations: vacations.length,
    },
  };
}

const entryForAudit = (e) => (e ? { id: e.id, time_model_id: e.time_model_id, time_model_name: e.model?.name, valid_from: e.valid_from } : null);

/**
 * Vorschau: geplante Änderung + Auswirkung, nichts wird gespeichert
 */
async function previewChange(userId, change) {
  const plan = await planChange(userId, change);
  const impact = await computeImpact(userId, plan);
  return {
    action: change.action,
    old_entry: entryForAudit(plan.oldEntry),
    new_entry: entryForAudit(plan.newEntry),
    summary: impact.summary,
    months: impact.months,
    days: impact.days.filter(d => d.changed),
    vacations: impact.vacations,
  };
}

/**
 * Änderung speichern und betroffene Tage, Urlaube und Salden neu rechnen
 * @param {{ actorId?: number, ipAddress?: string, reason?: string }} meta
 */
async function applyChange(userId, change, meta = {}) {
  const plan = await planChange(userId, change);
  const impact = await computeImpact(userId, plan);
  const today = todayBerlin();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (change.action === 'create') {
      const r = await client.query(`
        INSERT INTO user_time_models (user_id, time_model_id, valid_from, created_by)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [userId, plan.newEntry.time_model_id, plan.newEntry.valid_from, meta.actorId || null]);
      plan.newEntry.id = r.rows[0].id;
    } else if (change.action === 'update') {
      await client.query(
        'UPDATE user_time_models SET time_model_id = $2, valid_from = $3 WHERE id = $1',
        [plan.oldEntry.id, plan.newEntry.time_model_id, plan.newEntry.valid_from]
      );
    } else {
      await client.query('DELETE FROM user_time_models WHERE id = $1', [plan.oldEntry.id]);
    }

    // users.time_model_id bis Schritt 4 mitführen: Modell, das heute gilt
    await client.query('UPDATE users SET time_model_id = $2, updated_at = NOW() WHERE id = $1',
      [userId, makeResolver(plan.after)(today)?.id ?? null]);

    await client.query(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes, reason, ip_address)
      VALUES ($1, 'user_time_model', $2, $3, $4, $5, $6)
    `, [
      meta.actorId || null,
      userId,
      change.action.toUpperCase(),
      JSON.stringify({
        before: entryForAudit(plan.oldEntry),
        after: entryForAudit(plan.newEntry),
        recalculated: impact.summary,
      }),
      meta.reason || null,
      meta.ipAddress || null,
    ]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      throw new TimeModelChangeError(409, 'Für dieses Datum gibt es schon einen Eintrag');
    }
    throw err;
  } finally {
    client.release();
  }

  // Tageswerte
  for (const day of impact.days) {
    if (day.action === 'delete') {
      await pool.query('DELETE FROM time_daily_summary WHERE user_id = $1 AND date = $2', [userId, day.date]);
    } else {
      await updateDailySummary(userId, new Date(`${day.date}T12:00:00`), { skipBalance: true });
    }
  }

  // Urlaubstage
  for (const v of impact.vacations) {
    await pool.query(
      'UPDATE vacations SET calculated_days = $2, days_by_year = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [v.id, v.new_days, v.new_days_by_year]
    );
  }

  // Monatssalden ab dem ersten betroffenen Monat bis heute
  if (impact.days.length > 0) {
    const [year, month] = impact.days[0].date.split('-').map(Number);
    await recalculateFromMonth(userId, year, month);
  }

  return {
    entry: entryForAudit(plan.newEntry),
    summary: impact.summary,
  };
}

module.exports = { TimeModelChangeError, previewChange, applyChange, planChange, computeImpact };
