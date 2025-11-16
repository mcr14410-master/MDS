const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// ============================================================================
// TOOL CATEGORIES
// ============================================================================

/**
 * Get all tool categories with optional filters
 * GET /api/tool-categories?is_active=true&search=Mill
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { is_active, search } = req.query;

    let query = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM tool_subcategories
         WHERE category_id = c.id) as subcategories_count,
        (SELECT COUNT(*) FROM tool_subcategories
         WHERE category_id = c.id AND is_active = true) as active_subcategories_count
      FROM tool_categories c
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined && is_active !== '') {
      query += ` AND c.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND c.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY c.sequence ASC, c.name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tool categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool categories',
      message: error.message
    });
  }
};

/**
 * Get single tool category by ID
 * GET /api/tool-categories/:id
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM tool_subcategories
         WHERE category_id = c.id) as subcategories_count
      FROM tool_categories c
      WHERE c.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool category not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tool category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool category',
      message: error.message
    });
  }
};

/**
 * Create new tool category
 * POST /api/tool-categories
 */
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      description,
      icon,
      sequence = 0,
      is_active = true,
      custom_field_definitions = null
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const created_by = req.user?.id || null;

    const query = `
      INSERT INTO tool_categories (
        name, description, icon, sequence, is_active, custom_field_definitions, created_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      name, 
      description, 
      icon, 
      sequence, 
      is_active, 
      custom_field_definitions ? JSON.stringify(custom_field_definitions) : null,
      created_by
    ];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Tool category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tool category:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create tool category',
      message: error.message
    });
  }
};

/**
 * Update tool category
 * PUT /api/tool-categories/:id
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      icon,
      sequence,
      is_active,
      custom_field_definitions
    } = req.body;

    // Check if category exists
    const checkQuery = 'SELECT id FROM tool_categories WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool category not found'
      });
    }

    const query = `
      UPDATE tool_categories
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        sequence = COALESCE($4, sequence),
        is_active = COALESCE($5, is_active),
        custom_field_definitions = COALESCE($6, custom_field_definitions),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const values = [
      name, 
      description, 
      icon, 
      sequence, 
      is_active, 
      custom_field_definitions ? JSON.stringify(custom_field_definitions) : null,
      id
    ];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Tool category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tool category:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A category with this name already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update tool category',
      message: error.message
    });
  }
};

/**
 * Delete tool category
 * DELETE /api/tool-categories/:id
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const checkQuery = 'SELECT id, name FROM tool_categories WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool category not found'
      });
    }

    // Check for subcategories (will cascade delete)
    const subcategoryCheck = await pool.query(
      'SELECT COUNT(*) as count FROM tool_subcategories WHERE category_id = $1',
      [id]
    );

    const subcategoryCount = parseInt(subcategoryCheck.rows[0].count);

    // Delete category (CASCADE will delete subcategories)
    const deleteQuery = 'DELETE FROM tool_categories WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: `Tool category deleted successfully${subcategoryCount > 0 ? ` (${subcategoryCount} subcategories also deleted)` : ''}`,
      deletedSubcategories: subcategoryCount
    });
  } catch (error) {
    console.error('Error deleting tool category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool category',
      message: error.message
    });
  }
};

/**
 * Get all subcategories for a specific category
 * GET /api/tool-categories/:id/subcategories
 */
exports.getSubcategoriesByCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT id, name FROM tool_categories WHERE id = $1',
      [id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool category not found'
      });
    }

    const query = `
      SELECT
        s.*,
        c.name as category_name
      FROM tool_subcategories s
      JOIN tool_categories c ON s.category_id = c.id
      WHERE s.category_id = $1
      ORDER BY s.sequence ASC, s.name ASC
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      category: categoryCheck.rows[0],
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subcategories',
      message: error.message
    });
  }
};

// ============================================================================
// TOOL SUBCATEGORIES
// ============================================================================

/**
 * Get all tool subcategories with optional filters
 * GET /api/tool-subcategories?category_id=1&is_active=true
 */
exports.getAllSubcategories = async (req, res) => {
  try {
    const { category_id, is_active, search } = req.query;

    let query = `
      SELECT
        s.*,
        c.name as category_name,
        c.icon as category_icon
      FROM tool_subcategories s
      JOIN tool_categories c ON s.category_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (category_id) {
      query += ` AND s.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (is_active !== undefined && is_active !== '') {
      query += ` AND s.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      query += ` AND s.name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY s.category_id ASC, s.sequence ASC, s.name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tool subcategories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool subcategories',
      message: error.message
    });
  }
};

/**
 * Get single tool subcategory by ID
 * GET /api/tool-subcategories/:id
 */
exports.getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        s.*,
        c.name as category_name,
        c.icon as category_icon
      FROM tool_subcategories s
      JOIN tool_categories c ON s.category_id = c.id
      WHERE s.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool subcategory not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tool subcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool subcategory',
      message: error.message
    });
  }
};

/**
 * Create new tool subcategory
 * POST /api/tool-subcategories
 */
exports.createSubcategory = async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      sequence = 0,
      is_active = true
    } = req.body;

    // Validation
    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        error: 'category_id and name are required'
      });
    }

    // Check if category exists
    const categoryCheck = await pool.query(
      'SELECT id FROM tool_categories WHERE id = $1',
      [category_id]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool category not found'
      });
    }

    const created_by = req.user?.id || null;

    const query = `
      INSERT INTO tool_subcategories (
        category_id, name, description, sequence, is_active, created_by,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [category_id, name, description, sequence, is_active, created_by];

    const result = await pool.query(query, values);

    res.status(201).json({
      success: true,
      message: 'Tool subcategory created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating tool subcategory:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A subcategory with this name already exists in this category'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create tool subcategory',
      message: error.message
    });
  }
};

/**
 * Update tool subcategory
 * PUT /api/tool-subcategories/:id
 */
exports.updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      sequence,
      is_active
    } = req.body;

    // Check if subcategory exists
    const checkQuery = 'SELECT id FROM tool_subcategories WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool subcategory not found'
      });
    }

    const query = `
      UPDATE tool_subcategories
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        sequence = COALESCE($3, sequence),
        is_active = COALESCE($4, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;

    const values = [name, description, sequence, is_active, id];

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Tool subcategory updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating tool subcategory:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A subcategory with this name already exists in this category'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update tool subcategory',
      message: error.message
    });
  }
};

/**
 * Delete tool subcategory
 * DELETE /api/tool-subcategories/:id
 */
exports.deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if subcategory exists
    const checkQuery = 'SELECT id, name FROM tool_subcategories WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool subcategory not found'
      });
    }

    // Delete subcategory
    const deleteQuery = 'DELETE FROM tool_subcategories WHERE id = $1';
    await pool.query(deleteQuery, [id]);

    res.json({
      success: true,
      message: 'Tool subcategory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting tool subcategory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool subcategory',
      message: error.message
    });
  }
};
