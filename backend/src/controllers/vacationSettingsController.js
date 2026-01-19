/**
 * Vacation Settings Controller
 * 
 * Key-value settings for vacation system
 */

const pool = require('../config/db');

/**
 * Get all settings
 * GET /api/vacation-settings
 */
const getSettings = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vacation_settings ORDER BY key'
    );
    
    // Convert to object for easier frontend use
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        id: row.id,
        value: row.value,
        description: row.description
      };
    });
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
};

/**
 * Get single setting
 * GET /api/vacation-settings/:key
 */
const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM vacation_settings WHERE key = $1',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einstellung nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellung' });
  }
};

/**
 * Update setting
 * PUT /api/vacation-settings/:key
 */
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'value ist erforderlich' });
    }
    
    const result = await pool.query(
      `UPDATE vacation_settings SET
        value = $1,
        description = COALESCE($2, description),
        updated_at = CURRENT_TIMESTAMP
      WHERE key = $3
      RETURNING *`,
      [String(value), description, key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einstellung nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellung' });
  }
};

/**
 * Update multiple settings at once
 * PUT /api/vacation-settings
 * Body: { default_vacation_days: '30', max_concurrent_helper: '2' }
 */
const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    const updated = [];
    
    for (const [key, value] of Object.entries(settings)) {
      const result = await pool.query(
        `UPDATE vacation_settings SET
          value = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE key = $2
        RETURNING *`,
        [String(value), key]
      );
      
      if (result.rows.length > 0) {
        updated.push(result.rows[0]);
      }
    }
    
    res.json({ 
      message: `${updated.length} Einstellungen aktualisiert`,
      settings: updated
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen' });
  }
};

/**
 * Create new setting (admin only)
 * POST /api/vacation-settings
 */
const createSetting = async (req, res) => {
  try {
    const { key, value, description } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({ error: 'key und value sind erforderlich' });
    }
    
    const result = await pool.query(
      `INSERT INTO vacation_settings (key, value, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [key, String(value), description]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Einstellung existiert bereits' });
    }
    console.error('Error creating setting:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Einstellung' });
  }
};

/**
 * Delete setting
 * DELETE /api/vacation-settings/:key
 */
const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await pool.query(
      'DELETE FROM vacation_settings WHERE key = $1 RETURNING *',
      [key]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Einstellung nicht gefunden' });
    }
    
    res.json({ message: 'Einstellung gelöscht', setting: result.rows[0] });
  } catch (error) {
    console.error('Error deleting setting:', error);
    res.status(500).json({ error: 'Fehler beim Löschen der Einstellung' });
  }
};

module.exports = {
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
  createSetting,
  deleteSetting
};
