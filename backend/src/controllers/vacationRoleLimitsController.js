/**
 * Vacation Role Limits Controller
 * 
 * Manages concurrent absence limits per role
 */

const pool = require('../config/db');

/**
 * Get all role limits with role details
 * GET /api/vacation-role-limits
 */
const getRoleLimits = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        vrl.id,
        vrl.role_id,
        vrl.max_concurrent,
        r.name as role_name,
        vrl.created_at,
        vrl.updated_at
      FROM vacation_role_limits vrl
      JOIN roles r ON r.id = vrl.role_id
      ORDER BY r.name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role limits:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Rollen-Limits' });
  }
};

/**
 * Get all roles (for dropdown)
 * GET /api/vacation-role-limits/roles
 */
const getAvailableRoles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.name,
        CASE WHEN vrl.id IS NOT NULL THEN true ELSE false END as has_limit
      FROM roles r
      LEFT JOIN vacation_role_limits vrl ON vrl.role_id = r.id
      ORDER BY r.name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Rollen' });
  }
};

/**
 * Create or update role limit
 * POST /api/vacation-role-limits
 * Body: { role_id, max_concurrent }
 */
const upsertRoleLimit = async (req, res) => {
  try {
    const { role_id, max_concurrent } = req.body;
    
    if (!role_id || max_concurrent === undefined) {
      return res.status(400).json({ error: 'role_id und max_concurrent sind erforderlich' });
    }
    
    if (max_concurrent < 1) {
      return res.status(400).json({ error: 'max_concurrent muss mindestens 1 sein' });
    }
    
    const result = await pool.query(`
      INSERT INTO vacation_role_limits (role_id, max_concurrent)
      VALUES ($1, $2)
      ON CONFLICT (role_id) 
      DO UPDATE SET 
        max_concurrent = $2,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [role_id, max_concurrent]);
    
    // Fetch with role name
    const fullResult = await pool.query(`
      SELECT 
        vrl.*,
        r.name as role_name
      FROM vacation_role_limits vrl
      JOIN roles r ON r.id = vrl.role_id
      WHERE vrl.id = $1
    `, [result.rows[0].id]);
    
    res.status(201).json(fullResult.rows[0]);
  } catch (error) {
    console.error('Error upserting role limit:', error);
    res.status(500).json({ error: 'Fehler beim Speichern des Rollen-Limits' });
  }
};

/**
 * Delete role limit
 * DELETE /api/vacation-role-limits/:id
 */
const deleteRoleLimit = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM vacation_role_limits WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rollen-Limit nicht gefunden' });
    }
    
    res.json({ message: 'Rollen-Limit gelöscht', deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting role limit:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Rollen-Limits' });
  }
};

/**
 * Get role limits as map for overlap checking
 * Used internally by other controllers
 */
const getRoleLimitsMap = async () => {
  const result = await pool.query(`
    SELECT role_id, max_concurrent
    FROM vacation_role_limits
  `);
  
  const map = {};
  result.rows.forEach(row => {
    map[row.role_id] = row.max_concurrent;
  });
  
  return map;
};

module.exports = {
  getRoleLimits,
  getAvailableRoles,
  upsertRoleLimit,
  deleteRoleLimit,
  getRoleLimitsMap
};
