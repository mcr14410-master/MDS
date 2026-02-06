/**
 * Vacation Types Controller
 * 
 * CRUD for absence types (Urlaub, Krank, Schulung, etc.)
 */

const pool = require('../config/db');

/**
 * Get all vacation types
 * GET /api/vacation-types
 */
const getVacationTypes = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    
    let query = 'SELECT * FROM vacation_types';
    if (includeInactive !== 'true') {
      query += ' WHERE is_active = true';
    }
    query += ' ORDER BY sort_order, name';
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching vacation types:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Abwesenheitstypen' });
  }
};

/**
 * Get single vacation type
 * GET /api/vacation-types/:id
 */
const getVacationType = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM vacation_types WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheitstyp nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching vacation type:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Abwesenheitstyps' });
  }
};

/**
 * Create vacation type
 * POST /api/vacation-types
 */
const createVacationType = async (req, res) => {
  try {
    const { 
      name, 
      color = '#3B82F6', 
      affects_balance = true, 
      allows_partial_day = false,
      single_day_only = false,
      credits_target_hours = true,
      requires_approval = false,
      direct_entry_only = false,
      sort_order = 0
    } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }
    
    const result = await pool.query(
      `INSERT INTO vacation_types (name, color, affects_balance, allows_partial_day, single_day_only, credits_target_hours, requires_approval, direct_entry_only, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, color, affects_balance, allows_partial_day, single_day_only, credits_target_hours, requires_approval, direct_entry_only, sort_order]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ein Typ mit diesem Namen existiert bereits' });
    }
    console.error('Error creating vacation type:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Abwesenheitstyps' });
  }
};

/**
 * Update vacation type
 * PUT /api/vacation-types/:id
 */
const updateVacationType = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      color, 
      affects_balance, 
      allows_partial_day, 
      single_day_only,
      credits_target_hours,
      requires_approval,
      direct_entry_only,
      is_active, 
      sort_order 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE vacation_types SET
         name = COALESCE($1, name),
         color = COALESCE($2, color),
         affects_balance = COALESCE($3, affects_balance),
         allows_partial_day = COALESCE($4, allows_partial_day),
         single_day_only = COALESCE($5, single_day_only),
         credits_target_hours = COALESCE($6, credits_target_hours),
         requires_approval = COALESCE($7, requires_approval),
         direct_entry_only = COALESCE($8, direct_entry_only),
         is_active = COALESCE($9, is_active),
         sort_order = COALESCE($10, sort_order),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [name, color, affects_balance, allows_partial_day, single_day_only, credits_target_hours, requires_approval, direct_entry_only, is_active, sort_order, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheitstyp nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Ein Typ mit diesem Namen existiert bereits' });
    }
    console.error('Error updating vacation type:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Abwesenheitstyps' });
  }
};

/**
 * Delete vacation type
 * DELETE /api/vacation-types/:id
 */
const deleteVacationType = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if type is in use
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM vacations WHERE type_id = $1',
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Typ wird verwendet',
        hint: 'Deaktivieren Sie den Typ stattdessen (is_active = false)'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM vacation_types WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Abwesenheitstyp nicht gefunden' });
    }
    
    res.json({ message: 'Abwesenheitstyp gelöscht', type: result.rows[0] });
  } catch (error) {
    console.error('Error deleting vacation type:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Abwesenheitstyps' });
  }
};

module.exports = {
  getVacationTypes,
  getVacationType,
  createVacationType,
  updateVacationType,
  deleteVacationType
};
