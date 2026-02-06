const pool = require('../config/db');

// ============================================
// Alle Einstellungen abrufen
// ============================================
const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM time_settings ORDER BY key
    `);
    
    // Als Key-Value-Objekt zurückgeben
    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = {
        value: row.value,
        description: row.description
      };
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Fehler beim Abrufen der Einstellungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Einzelne Einstellung abrufen
// ============================================
const getByKey = async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM time_settings WHERE key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einstellung nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Abrufen der Einstellung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Einstellung aktualisieren
// ============================================
const update = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    const result = await pool.query(`
      UPDATE time_settings SET
        value = $1,
        updated_at = NOW()
      WHERE key = $2
      RETURNING *
    `, [value, key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einstellung nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Einstellung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Mehrere Einstellungen gleichzeitig aktualisieren
// ============================================
const updateMultiple = async (req, res) => {
  try {
    const { settings } = req.body; // { key1: value1, key2: value2, ... }
    
    const results = [];
    for (const [key, value] of Object.entries(settings)) {
      const result = await pool.query(`
        UPDATE time_settings SET
          value = $1,
          updated_at = NOW()
        WHERE key = $2
        RETURNING *
      `, [value, key]);
      
      if (result.rows.length > 0) {
        results.push(result.rows[0]);
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Einstellungen:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Einstellung hinzufügen (für Erweiterungen)
// ============================================
const create = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    const result = await pool.query(`
      INSERT INTO time_settings (key, value, description)
      VALUES ($1, $2, $3)
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        description = COALESCE(EXCLUDED.description, time_settings.description),
        updated_at = NOW()
      RETURNING *
    `, [key, value, description]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen der Einstellung:', error);
    res.status(500).json({ error: 'Interner Serverfehler' });
  }
};

// ============================================
// Hilfsfunktion: Einstellungswert direkt abrufen
// ============================================
const getValue = async (key, defaultValue = null) => {
  try {
    const result = await pool.query(
      'SELECT value FROM time_settings WHERE key = $1',
      [key]
    );
    return result.rows[0]?.value || defaultValue;
  } catch {
    return defaultValue;
  }
};

// ============================================
// Hilfsfunktion: Boolean-Einstellung abrufen
// ============================================
const getBoolValue = async (key, defaultValue = false) => {
  const value = await getValue(key, defaultValue.toString());
  return value === 'true';
};

// ============================================
// Hilfsfunktion: Integer-Einstellung abrufen
// ============================================
const getIntValue = async (key, defaultValue = 0) => {
  const value = await getValue(key, defaultValue.toString());
  return parseInt(value) || defaultValue;
};

module.exports = {
  getAll,
  getByKey,
  update,
  updateMultiple,
  create,
  getValue,
  getBoolValue,
  getIntValue
};
