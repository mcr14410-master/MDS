/**
 * Zeitmodell-Verlauf eines Mitarbeiters (user_time_models)
 *
 * GET    /api/users/:id/time-models                 Verlauf
 * POST   /api/users/:id/time-models/preview         Vorschau { action, entry_id?, time_model_id?, valid_from? }
 * POST   /api/users/:id/time-models                 Neues Zeitmodell ab … { time_model_id, valid_from, reason? }
 * PUT    /api/users/:id/time-models/:entryId        Eintrag korrigieren { time_model_id?, valid_from?, reason? }
 * DELETE /api/users/:id/time-models/:entryId        Eintrag löschen { reason? }
 *
 * Speichern rechnet betroffene Tage, Urlaube und Salden neu (services/timeModelChangeService).
 */

const pool = require('../config/db');
const { toDateStr } = require('../utils/workingDays');
const { TimeModelChangeError, previewChange, applyChange } = require('../services/timeModelChangeService');

function handleError(res, error, context) {
  if (error instanceof TimeModelChangeError) {
    return res.status(error.status).json({ error: error.message });
  }
  console.error(`Zeitmodell-Verlauf (${context}):`, error);
  return res.status(500).json({ error: 'Interner Serverfehler' });
}

const getHistory = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const result = await pool.query(`
      SELECT utm.id, utm.time_model_id, utm.valid_from, utm.created_at,
             tm.name AS time_model_name, tm.weekly_minutes,
             cb.first_name || ' ' || cb.last_name AS created_by_name,
             LEAD(utm.valid_from) OVER (ORDER BY utm.valid_from) - 1 AS valid_to
      FROM user_time_models utm
      JOIN time_models_with_weekly tm ON tm.id = utm.time_model_id
      LEFT JOIN users cb ON cb.id = utm.created_by
      WHERE utm.user_id = $1
      ORDER BY utm.valid_from
    `, [userId]);
    const today = toDateStr(new Date());
    const entries = result.rows.map(r => {
      const validFrom = toDateStr(r.valid_from);
      const validTo = r.valid_to ? toDateStr(r.valid_to) : null;
      return {
        ...r,
        valid_from: validFrom,
        valid_to: validTo,
        is_current: validFrom <= today && (!validTo || validTo >= today),
        is_future: validFrom > today,
      };
    });
    res.json(entries);
  } catch (error) {
    handleError(res, error, 'laden');
  }
};

const preview = async (req, res) => {
  try {
    const { action, entry_id, time_model_id, valid_from } = req.body;
    const result = await previewChange(parseInt(req.params.id), {
      action, entryId: entry_id, timeModelId: time_model_id, validFrom: valid_from,
    });
    res.json(result);
  } catch (error) {
    handleError(res, error, 'Vorschau');
  }
};

const meta = (req) => ({ actorId: req.user?.id, ipAddress: req.ip, reason: req.body?.reason });

const create = async (req, res) => {
  try {
    const { time_model_id, valid_from } = req.body;
    const result = await applyChange(parseInt(req.params.id), {
      action: 'create', timeModelId: time_model_id, validFrom: valid_from,
    }, meta(req));
    res.status(201).json(result);
  } catch (error) {
    handleError(res, error, 'anlegen');
  }
};

const update = async (req, res) => {
  try {
    const { time_model_id, valid_from } = req.body;
    const result = await applyChange(parseInt(req.params.id), {
      action: 'update', entryId: req.params.entryId, timeModelId: time_model_id, validFrom: valid_from,
    }, meta(req));
    res.json(result);
  } catch (error) {
    handleError(res, error, 'korrigieren');
  }
};

const remove = async (req, res) => {
  try {
    const result = await applyChange(parseInt(req.params.id), {
      action: 'delete', entryId: req.params.entryId,
    }, meta(req));
    res.json(result);
  } catch (error) {
    handleError(res, error, 'löschen');
  }
};

module.exports = { getHistory, preview, create, update, remove };
