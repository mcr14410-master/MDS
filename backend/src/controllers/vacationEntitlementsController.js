/**
 * Vacation Entitlements Controller
 * 
 * Manages yearly vacation allowance per user
 */

const pool = require('../config/db');

/**
 * Get all entitlements (optionally filtered by year)
 * GET /api/vacation-entitlements?year=2025
 */
const getEntitlements = async (req, res) => {
  try {
    const { year, user_id } = req.query;
    
    let query = `
      SELECT 
        ve.*,
        u.username,
        COALESCE(u.first_name || ' ' || u.last_name, u.username) as display_name,
        r.name as role_name
      FROM vacation_entitlements ve
      JOIN users u ON u.id = ve.user_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE 1=1
    `;
    const params = [];
    
    if (year) {
      params.push(year);
      query += ` AND ve.year = $${params.length}`;
    }
    
    if (user_id) {
      params.push(user_id);
      query += ` AND ve.user_id = $${params.length}`;
    }
    
    query += ' ORDER BY ve.year DESC, COALESCE(u.first_name || \' \' || u.last_name, u.username)';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching entitlements:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Urlaubsansprüche' });
  }
};

/**
 * Get vacation balances (with used/remaining calculated)
 * GET /api/vacation-entitlements/balances?year=2025
 */
const getBalances = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const result = await pool.query(
      `SELECT * FROM vacation_balances WHERE year = $1 ORDER BY display_name`,
      [year]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Urlaubssalden' });
  }
};

/**
 * Get single user's balance
 * GET /api/vacation-entitlements/balance/:userId?year=2025
 */
const getUserBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    
    const result = await pool.query(
      `SELECT * FROM vacation_balances WHERE user_id = $1 AND year = $2`,
      [userId, year]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Kein Urlaubsanspruch gefunden',
        hint: 'Erstellen Sie zuerst einen Urlaubsanspruch für dieses Jahr'
      });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Fehler beim Laden des Urlaubssaldos' });
  }
};

/**
 * Create or update entitlement for a user/year
 * POST /api/vacation-entitlements
 */
const createEntitlement = async (req, res) => {
  try {
    const { user_id, year, total_days, carried_over = 0, adjustment = 0, note } = req.body;
    
    if (!user_id || !year) {
      return res.status(400).json({ error: 'user_id und year sind erforderlich' });
    }
    
    // Get default days from settings if not provided
    let days = total_days;
    if (days === undefined) {
      const settingsResult = await pool.query(
        "SELECT value FROM vacation_settings WHERE key = 'default_vacation_days'"
      );
      days = settingsResult.rows.length > 0 ? parseFloat(settingsResult.rows[0].value) : 30;
    }
    
    const result = await pool.query(
      `INSERT INTO vacation_entitlements (user_id, year, total_days, carried_over, adjustment, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, year) DO UPDATE SET
         total_days = EXCLUDED.total_days,
         carried_over = EXCLUDED.carried_over,
         adjustment = EXCLUDED.adjustment,
         note = EXCLUDED.note,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [user_id, year, days, carried_over, adjustment, note]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating entitlement:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Urlaubsanspruchs' });
  }
};

/**
 * Update entitlement
 * PUT /api/vacation-entitlements/:id
 */
const updateEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    const { total_days, carried_over, adjustment, note } = req.body;
    
    const result = await pool.query(
      `UPDATE vacation_entitlements SET
         total_days = COALESCE($1, total_days),
         carried_over = COALESCE($2, carried_over),
         adjustment = COALESCE($3, adjustment),
         note = COALESCE($4, note),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [total_days, carried_over, adjustment, note, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Urlaubsanspruch nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating entitlement:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Urlaubsanspruchs' });
  }
};

/**
 * Delete entitlement
 * DELETE /api/vacation-entitlements/:id
 */
const deleteEntitlement = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM vacation_entitlements WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Urlaubsanspruch nicht gefunden' });
    }
    
    res.json({ message: 'Urlaubsanspruch gelöscht', entitlement: result.rows[0] });
  } catch (error) {
    console.error('Error deleting entitlement:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Urlaubsanspruchs' });
  }
};

/**
 * Initialize entitlements for all active users for a year
 * POST /api/vacation-entitlements/initialize
 */
const initializeYear = async (req, res) => {
  try {
    const { year } = req.body;
    
    if (!year) {
      return res.status(400).json({ error: 'Jahr ist erforderlich' });
    }
    
    // Get default days
    const settingsResult = await pool.query(
      "SELECT value FROM vacation_settings WHERE key = 'default_vacation_days'"
    );
    const defaultDays = settingsResult.rows.length > 0 ? parseFloat(settingsResult.rows[0].value) : 30;
    
    // Calculate carried over from previous year (remaining days)
    const previousYear = year - 1;
    
    const result = await pool.query(
      `INSERT INTO vacation_entitlements (user_id, year, total_days, carried_over)
       SELECT 
         u.id,
         $1,
         $2,
         COALESCE(vb.remaining_days, 0)
       FROM users u
       LEFT JOIN vacation_balances vb ON vb.user_id = u.id AND vb.year = $3
       WHERE u.is_active = true
       ON CONFLICT (user_id, year) DO NOTHING
       RETURNING *`,
      [year, defaultDays, previousYear]
    );
    
    res.status(201).json({
      message: `${result.rows.length} Urlaubsansprüche für ${year} erstellt`,
      entitlements: result.rows
    });
  } catch (error) {
    console.error('Error initializing year:', error);
    res.status(500).json({ error: 'Fehler beim Initialisieren der Urlaubsansprüche' });
  }
};

module.exports = {
  getEntitlements,
  getBalances,
  getUserBalance,
  createEntitlement,
  updateEntitlement,
  deleteEntitlement,
  initializeYear
};
