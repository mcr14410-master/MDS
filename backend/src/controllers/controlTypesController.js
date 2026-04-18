const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all control types
 * GET /api/control-types?is_active=true
 */
exports.getAllTypes = async (req, res) => {
  try {
    const { is_active, search } = req.query;

    let query = `
      SELECT
        ct.*,
        (SELECT COUNT(*) FROM machines m WHERE m.control_type_id = ct.id) as machine_count
      FROM control_types ct
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined && is_active !== '') {
      query += ` AND ct.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND ct.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY ct.sequence ASC, ct.name ASC';

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching control types:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch control types', message: error.message });
  }
};

/**
 * Get single control type by ID
 * GET /api/control-types/:id
 */
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM control_types WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Control type not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching control type:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch control type', message: error.message });
  }
};

/**
 * Create new control type
 * POST /api/control-types
 */
exports.createType = async (req, res) => {
  try {
    const { name, description, color = 'gray', sequence = 0, is_active = true } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const created_by = req.user?.id || null;

    const result = await pool.query(
      `INSERT INTO control_types (name, description, color, sequence, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description || null, color, sequence, is_active, created_by]
    );

    res.status(201).json({
      success: true,
      message: 'Control type created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A control type with this name already exists' });
    }
    console.error('Error creating control type:', error);
    res.status(500).json({ success: false, error: 'Failed to create control type', message: error.message });
  }
};

/**
 * Update control type
 * PUT /api/control-types/:id
 */
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, sequence, is_active } = req.body;

    const checkResult = await pool.query('SELECT id FROM control_types WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Control type not found' });
    }

    const result = await pool.query(
      `UPDATE control_types SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         color = COALESCE($3, color),
         sequence = COALESCE($4, sequence),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name ?? null, description ?? null, color ?? null, sequence ?? null, is_active ?? null, id]
    );

    res.json({ success: true, message: 'Control type updated successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A control type with this name already exists' });
    }
    console.error('Error updating control type:', error);
    res.status(500).json({ success: false, error: 'Failed to update control type', message: error.message });
  }
};

/**
 * Delete control type
 * DELETE /api/control-types/:id
 */
exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query('SELECT id FROM control_types WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Control type not found' });
    }

    const usage = await pool.query('SELECT COUNT(*) as count FROM machines WHERE control_type_id = $1', [id]);
    const usageCount = parseInt(usage.rows[0].count, 10);

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Diese Steuerung wird von ${usageCount} Maschine${usageCount === 1 ? '' : 'n'} verwendet und kann nicht gel\u00f6scht werden.`
      });
    }

    await pool.query('DELETE FROM control_types WHERE id = $1', [id]);
    res.json({ success: true, message: 'Control type deleted successfully' });
  } catch (error) {
    console.error('Error deleting control type:', error);
    res.status(500).json({ success: false, error: 'Failed to delete control type', message: error.message });
  }
};
