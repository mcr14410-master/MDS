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
 * Get all machine types
 * GET /api/machine-types?is_active=true
 */
exports.getAllTypes = async (req, res) => {
  try {
    const { is_active, search } = req.query;

    let query = `
      SELECT
        mt.*,
        (SELECT COUNT(*) FROM machines m WHERE m.machine_type_id = mt.id) as machine_count
      FROM machine_types mt
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined && is_active !== '') {
      query += ` AND mt.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND mt.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY mt.sequence ASC, mt.name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching machine types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machine types',
      message: error.message
    });
  }
};

/**
 * Get single machine type by ID
 * GET /api/machine-types/:id
 */
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT mt.*,
              (SELECT COUNT(*) FROM machines m WHERE m.machine_type_id = mt.id) as machine_count
       FROM machine_types mt WHERE mt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Machine type not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch machine type', message: error.message });
  }
};

/**
 * Create new machine type
 * POST /api/machine-types
 */
exports.createType = async (req, res) => {
  try {
    const {
      name,
      description,
      color = 'gray',
      sequence = 0,
      is_active = true,
      custom_field_definitions = []
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const created_by = req.user?.id || null;

    const result = await pool.query(
      `INSERT INTO machine_types
        (name, description, color, sequence, is_active, custom_field_definitions, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        description || null,
        color,
        sequence,
        is_active,
        JSON.stringify(custom_field_definitions || []),
        created_by
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Machine type created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A machine type with this name already exists' });
    }
    console.error('Error creating machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to create machine type', message: error.message });
  }
};

/**
 * Update machine type
 * PUT /api/machine-types/:id
 */
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      color,
      sequence,
      is_active,
      custom_field_definitions
    } = req.body;

    const checkResult = await pool.query('SELECT id FROM machine_types WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Machine type not found' });
    }

    const result = await pool.query(
      `UPDATE machine_types SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         color = COALESCE($3, color),
         sequence = COALESCE($4, sequence),
         is_active = COALESCE($5, is_active),
         custom_field_definitions = COALESCE($6, custom_field_definitions),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        name ?? null,
        description ?? null,
        color ?? null,
        sequence ?? null,
        is_active ?? null,
        custom_field_definitions !== undefined ? JSON.stringify(custom_field_definitions) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Machine type updated successfully', data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, error: 'A machine type with this name already exists' });
    }
    console.error('Error updating machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to update machine type', message: error.message });
  }
};

/**
 * Delete machine type
 * DELETE /api/machine-types/:id
 */
exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;

    const checkResult = await pool.query('SELECT id FROM machine_types WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Machine type not found' });
    }

    // Referenzen pruefen - bei Verwendung nicht loeschen
    const usage = await pool.query('SELECT COUNT(*) as count FROM machines WHERE machine_type_id = $1', [id]);
    const usageCount = parseInt(usage.rows[0].count, 10);

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Dieser Typ wird von ${usageCount} Maschine${usageCount === 1 ? '' : 'n'} verwendet und kann nicht gel\u00f6scht werden.`
      });
    }

    await pool.query('DELETE FROM machine_types WHERE id = $1', [id]);
    res.json({ success: true, message: 'Machine type deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine type:', error);
    res.status(500).json({ success: false, error: 'Failed to delete machine type', message: error.message });
  }
};
