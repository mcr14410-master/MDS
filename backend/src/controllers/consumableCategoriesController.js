/**
 * Consumable Categories Controller
 * 
 * Manages consumable categories (Verbrauchsmaterial-Kategorien)
 * 
 * Routes:
 * - GET    /api/consumable-categories          - Get all categories
 * - GET    /api/consumable-categories/:id      - Get category by ID
 * - POST   /api/consumable-categories          - Create new category
 * - PUT    /api/consumable-categories/:id      - Update category
 * - DELETE /api/consumable-categories/:id      - Delete category
 */

const pool = require('../config/db');

/**
 * GET /api/consumable-categories
 * Get all categories with optional filters
 */
exports.getAllCategories = async (req, res) => {
  try {
    const { is_active, search } = req.query;

    let queryText = `
      SELECT 
        cc.*,
        (SELECT COUNT(*) FROM consumables WHERE category_id = cc.id AND is_deleted = false) as consumable_count
      FROM consumable_categories cc
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      queryText += ` AND cc.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      queryText += ` AND (cc.name ILIKE $${paramCount} OR cc.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryText += ` ORDER BY cc.sequence ASC, cc.name ASC`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching consumable categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consumable categories',
      error: error.message
    });
  }
};

/**
 * GET /api/consumable-categories/:id
 * Get category by ID
 */
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        cc.*,
        (SELECT COUNT(*) FROM consumables WHERE category_id = cc.id AND is_deleted = false) as consumable_count
      FROM consumable_categories cc
      WHERE cc.id = $1
    `;

    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching consumable category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consumable category',
      error: error.message
    });
  }
};

/**
 * POST /api/consumable-categories
 * Create new category
 */
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, sequence, is_active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check for duplicate name
    const checkName = await pool.query(
      'SELECT id FROM consumable_categories WHERE name = $1',
      [name]
    );

    if (checkName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    // Get max sequence if not provided
    let seq = sequence;
    if (seq === undefined || seq === null) {
      const maxSeq = await pool.query(
        'SELECT COALESCE(MAX(sequence), 0) + 10 as next_seq FROM consumable_categories'
      );
      seq = maxSeq.rows[0].next_seq;
    }

    const queryText = `
      INSERT INTO consumable_categories (name, description, icon, color, sequence, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await pool.query(queryText, [
      name,
      description,
      icon,
      color,
      seq,
      is_active !== undefined ? is_active : true,
      req.user?.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating consumable category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating consumable category',
      error: error.message
    });
  }
};

/**
 * PUT /api/consumable-categories/:id
 * Update category
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, sequence, is_active } = req.body;

    // Check if category exists
    const checkExisting = await pool.query(
      'SELECT * FROM consumable_categories WHERE id = $1',
      [id]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const existing = checkExisting.rows[0];

    // Check for duplicate name (excluding current)
    if (name && name !== existing.name) {
      const checkName = await pool.query(
        'SELECT id FROM consumable_categories WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (checkName.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    const queryText = `
      UPDATE consumable_categories 
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        color = COALESCE($4, color),
        sequence = COALESCE($5, sequence),
        is_active = COALESCE($6, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;

    const result = await pool.query(queryText, [
      name,
      description,
      icon,
      color,
      sequence,
      is_active,
      id
    ]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating consumable category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating consumable category',
      error: error.message
    });
  }
};

/**
 * DELETE /api/consumable-categories/:id
 * Delete category (only if no consumables linked)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const checkCategory = await pool.query(
      'SELECT * FROM consumable_categories WHERE id = $1',
      [id]
    );

    if (checkCategory.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if consumables are linked
    const checkLinked = await pool.query(
      'SELECT COUNT(*) as count FROM consumables WHERE category_id = $1 AND is_deleted = false',
      [id]
    );

    const linkedCount = parseInt(checkLinked.rows[0].count);

    if (linkedCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category: ${linkedCount} consumables are linked`
      });
    }

    await pool.query('DELETE FROM consumable_categories WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting consumable category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting consumable category',
      error: error.message
    });
  }
};
