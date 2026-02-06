const pool = require('../config/db');

// Alle Zeitmodelle abrufen
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tm.*,
        COALESCE(tm.monday_minutes, 0) + 
        COALESCE(tm.tuesday_minutes, 0) + 
        COALESCE(tm.wednesday_minutes, 0) + 
        COALESCE(tm.thursday_minutes, 0) + 
        COALESCE(tm.friday_minutes, 0) + 
        COALESCE(tm.saturday_minutes, 0) + 
        COALESCE(tm.sunday_minutes, 0) AS weekly_minutes,
        (SELECT COUNT(*) FROM users WHERE time_model_id = tm.id) AS user_count
      FROM time_models tm
      ORDER BY tm.is_default DESC, tm.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zeitmodelle:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Einzelnes Zeitmodell abrufen
const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        tm.*,
        COALESCE(tm.monday_minutes, 0) + 
        COALESCE(tm.tuesday_minutes, 0) + 
        COALESCE(tm.wednesday_minutes, 0) + 
        COALESCE(tm.thursday_minutes, 0) + 
        COALESCE(tm.friday_minutes, 0) + 
        COALESCE(tm.saturday_minutes, 0) + 
        COALESCE(tm.sunday_minutes, 0) AS weekly_minutes
      FROM time_models tm
      WHERE tm.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zeitmodell nicht gefunden' });
    }
    
    // Zugewiesene Benutzer abrufen
    const users = await pool.query(`
      SELECT id, first_name || ' ' || last_name as name 
      FROM users WHERE time_model_id = $1 
      ORDER BY last_name, first_name
    `, [id]);
    
    res.json({ ...result.rows[0], users: users.rows });
  } catch (error) {
    console.error('Fehler beim Abrufen des Zeitmodells:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Zeitmodell erstellen
const create = async (req, res) => {
  try {
    const {
      name,
      description,
      monday_minutes,
      tuesday_minutes,
      wednesday_minutes,
      thursday_minutes,
      friday_minutes,
      saturday_minutes,
      sunday_minutes,
      default_break_minutes,
      min_break_minutes,
      core_time_start,
      core_time_end,
      flex_time_start,
      flex_time_end,
      is_default
    } = req.body;

    // Wenn als Standard markiert, andere Standard-Markierungen entfernen
    if (is_default) {
      await pool.query('UPDATE time_models SET is_default = FALSE WHERE is_default = TRUE');
    }

    const result = await pool.query(`
      INSERT INTO time_models (
        name, description,
        monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes,
        friday_minutes, saturday_minutes, sunday_minutes,
        default_break_minutes, min_break_minutes,
        core_time_start, core_time_end, flex_time_start, flex_time_end,
        is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      name, description,
      monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes,
      friday_minutes, saturday_minutes, sunday_minutes,
      default_break_minutes || 30, min_break_minutes || 30,
      core_time_start || null, core_time_end || null,
      flex_time_start || null, flex_time_end || null,
      is_default || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen des Zeitmodells:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Zeitmodell aktualisieren
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      monday_minutes,
      tuesday_minutes,
      wednesday_minutes,
      thursday_minutes,
      friday_minutes,
      saturday_minutes,
      sunday_minutes,
      default_break_minutes,
      min_break_minutes,
      core_time_start,
      core_time_end,
      flex_time_start,
      flex_time_end,
      is_default,
      is_active
    } = req.body;

    // Wenn als Standard markiert, andere Standard-Markierungen entfernen
    if (is_default) {
      await pool.query('UPDATE time_models SET is_default = FALSE WHERE is_default = TRUE AND id != $1', [id]);
    }

    const result = await pool.query(`
      UPDATE time_models SET
        name = COALESCE($1, name),
        description = $2,
        monday_minutes = $3,
        tuesday_minutes = $4,
        wednesday_minutes = $5,
        thursday_minutes = $6,
        friday_minutes = $7,
        saturday_minutes = $8,
        sunday_minutes = $9,
        default_break_minutes = COALESCE($10, default_break_minutes),
        min_break_minutes = COALESCE($11, min_break_minutes),
        core_time_start = $12,
        core_time_end = $13,
        flex_time_start = $14,
        flex_time_end = $15,
        is_default = COALESCE($16, is_default),
        is_active = COALESCE($17, is_active),
        updated_at = NOW()
      WHERE id = $18
      RETURNING *
    `, [
      name, description,
      monday_minutes, tuesday_minutes, wednesday_minutes, thursday_minutes,
      friday_minutes, saturday_minutes, sunday_minutes,
      default_break_minutes, min_break_minutes,
      core_time_start, core_time_end,
      flex_time_start, flex_time_end,
      is_default, is_active,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zeitmodell nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Zeitmodells:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Zeitmodell löschen
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prüfen ob Benutzer zugewiesen sind
    const usersCheck = await pool.query(
      'SELECT COUNT(*) FROM users WHERE time_model_id = $1',
      [id]
    );
    
    if (parseInt(usersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Zeitmodell kann nicht gelöscht werden, da noch Benutzer zugewiesen sind' 
      });
    }

    const result = await pool.query(
      'DELETE FROM time_models WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zeitmodell nicht gefunden' });
    }

    res.json({ message: 'Zeitmodell gelöscht', deleted: result.rows[0] });
  } catch (error) {
    console.error('Fehler beim Löschen des Zeitmodells:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Standard-Zeitmodell abrufen
const getDefault = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM time_models WHERE is_default = TRUE LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kein Standard-Zeitmodell definiert' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Abrufen des Standard-Zeitmodells:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// Minuten für einen bestimmten Wochentag ermitteln
const getMinutesForDay = (model, dayOfWeek) => {
  // dayOfWeek: 0 = Sonntag, 1 = Montag, ..., 6 = Samstag
  const dayMap = {
    0: model.sunday_minutes,
    1: model.monday_minutes,
    2: model.tuesday_minutes,
    3: model.wednesday_minutes,
    4: model.thursday_minutes,
    5: model.friday_minutes,
    6: model.saturday_minutes
  };
  return dayMap[dayOfWeek] || 0;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getDefault,
  getMinutesForDay
};
