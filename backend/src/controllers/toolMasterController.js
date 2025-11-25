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
// TOOL MASTER
// ============================================================================

/**
 * Get all tools with optional filters, search and pagination
 * GET /api/tool-master?category_id=1&search=Fräser&item_type=tool&limit=20&offset=0
 */
exports.getAllTools = async (req, res) => {
  try {
    const {
      category_id,
      subcategory_id,
      item_type,
      tool_category,
      is_active,
      is_low_stock,
      manufacturer,
      search,
      sort_by = 'article_number',
      sort_order = 'ASC',
      limit = 20,
      offset = 0
    } = req.query;

    // Use VIEW instead of manual JOINs - much simpler!
    let query = `
      SELECT *
      FROM tools_with_stock
      WHERE is_deleted = false
    `;
    const params = [];
    let paramCount = 1;

    // Filters
    if (category_id) {
      query += ` AND category_id = $${paramCount}`;
      params.push(parseInt(category_id));
      paramCount++;
    }

    if (subcategory_id) {
      query += ` AND subcategory_id = $${paramCount}`;
      params.push(parseInt(subcategory_id));
      paramCount++;
    }

    if (item_type) {
      query += ` AND item_type = $${paramCount}`;
      params.push(item_type);
      paramCount++;
    }

    if (tool_category) {
      query += ` AND tool_category = $${paramCount}`;
      params.push(tool_category);
      paramCount++;
    }

    if (is_active !== undefined && is_active !== '') {
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (is_low_stock !== undefined && is_low_stock === 'true') {
      query += ` AND is_low_stock = true`;
      // No param needed, it's a boolean column
    }

    if (manufacturer) {
      query += ` AND manufacturer ILIKE $${paramCount}`;
      params.push(`%${manufacturer}%`);
      paramCount++;
    }

    // Search (article_number OR tool_name)
    if (search) {
      query += ` AND (article_number ILIKE $${paramCount} OR tool_name ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count for pagination
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Sorting - now includes stock fields!
    const allowedSortFields = [
      'article_number', 
      'tool_name', 
      'category_name', 
      'created_at', 
      'cost', 
      'diameter',
      'effective_stock',
      'total_stock',
      'is_low_stock'
    ];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'article_number';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Pagination
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tools',
      message: error.message
    });
  }
};

/**
 * Get single tool by ID
 * GET /api/tool-master/:id
 */
exports.getToolById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT
        tm.*,
        tc.name as category_name,
        tc.icon as category_icon,
        ts.name as subcategory_name,
        u.username as created_by_username
      FROM tool_master tm
      LEFT JOIN tool_categories tc ON tm.category_id = tc.id
      LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
      LEFT JOIN users u ON tm.created_by = u.id
      WHERE tm.id = $1 AND tm.is_deleted = false
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool',
      message: error.message
    });
  }
};

/**
 * Create new tool
 * POST /api/tool-master
 */
exports.createTool = async (req, res) => {
  try {
    const {
      article_number,
      tool_name,
      category_id,
      subcategory_id,
      item_type = 'tool',
      tool_category = 'standard',
      diameter,
      length,
      flutes,
      material,
      coating,
      substrate_grade,
      hardness,
      manufacturer,
      manufacturer_part_number,
      shop_url,
      cost,
      uses_inserts = false,
      custom_fields,
      is_active = true,
      notes
    } = req.body;

    // Validation
    if (!article_number || !tool_name) {
      return res.status(400).json({
        success: false,
        error: 'article_number and tool_name are required'
      });
    }

    // Validate item_type
    const validItemTypes = ['tool', 'insert', 'accessory'];
    if (!validItemTypes.includes(item_type)) {
      return res.status(400).json({
        success: false,
        error: 'item_type must be one of: tool, insert, accessory'
      });
    }

    // Validate tool_category
    const validToolCategories = ['standard', 'special', 'modified'];
    if (!validToolCategories.includes(tool_category)) {
      return res.status(400).json({
        success: false,
        error: 'tool_category must be one of: standard, special, modified'
      });
    }

    // Validate positive numbers
    if (diameter && diameter < 0) {
      return res.status(400).json({
        success: false,
        error: 'diameter must be a positive number'
      });
    }
    if (length && length < 0) {
      return res.status(400).json({
        success: false,
        error: 'length must be a positive number'
      });
    }
    if (cost && cost < 0) {
      return res.status(400).json({
        success: false,
        error: 'cost must be a positive number'
      });
    }

    // Check if category exists
    if (category_id) {
      const catCheck = await pool.query(
        'SELECT id FROM tool_categories WHERE id = $1',
        [category_id]
      );
      if (catCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category_id'
        });
      }
    }

    // Check if subcategory exists and belongs to category
    if (subcategory_id) {
      const subCatCheck = await pool.query(
        'SELECT id FROM tool_subcategories WHERE id = $1' +
        (category_id ? ' AND category_id = $2' : ''),
        category_id ? [subcategory_id, category_id] : [subcategory_id]
      );
      if (subCatCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subcategory_id or subcategory does not belong to the specified category'
        });
      }
    }

    // Convert custom_fields to JSON if provided
    const customFieldsJson = custom_fields ? JSON.stringify(custom_fields) : null;

    const query = `
      INSERT INTO tool_master (
        article_number, tool_name, category_id, subcategory_id,
        item_type, tool_category, diameter, length, flutes,
        material, coating, substrate_grade, hardness,
        manufacturer, manufacturer_part_number, shop_url, cost,
        uses_inserts, custom_fields, is_active, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
      )
      RETURNING *
    `;

    const values = [
      article_number, tool_name, category_id, subcategory_id,
      item_type, tool_category, diameter, length, flutes,
      material, coating, substrate_grade, hardness,
      manufacturer, manufacturer_part_number, shop_url, cost,
      uses_inserts, customFieldsJson, is_active, notes, req.user.id
    ];

    const result = await pool.query(query, values);

    // Fetch complete data with joins
    const fullToolQuery = `
      SELECT
        tm.*,
        tc.name as category_name,
        tc.icon as category_icon,
        ts.name as subcategory_name,
        u.username as created_by_username
      FROM tool_master tm
      LEFT JOIN tool_categories tc ON tm.category_id = tc.id
      LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
      LEFT JOIN users u ON tm.created_by = u.id
      WHERE tm.id = $1 AND tm.is_deleted = false
    `;
    const fullTool = await pool.query(fullToolQuery, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: fullTool.rows[0],
      message: 'Tool created successfully'
    });
  } catch (error) {
    console.error('Error creating tool:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A tool with this article_number already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create tool',
      message: error.message
    });
  }
};

/**
 * Update tool
 * PUT /api/tool-master/:id
 */
exports.updateTool = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      article_number,
      tool_name,
      category_id,
      subcategory_id,
      item_type,
      tool_category,
      diameter,
      length,
      flutes,
      material,
      coating,
      substrate_grade,
      hardness,
      manufacturer,
      manufacturer_part_number,
      shop_url,
      cost,
      uses_inserts,
      custom_fields,
      is_active,
      notes
    } = req.body;

    // Check if tool exists
    const existsCheck = await pool.query('SELECT id FROM tool_master WHERE id = $1 AND is_deleted = false', [id]);
    if (existsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }

    // Validate item_type if provided
    if (item_type) {
      const validItemTypes = ['tool', 'insert', 'accessory'];
      if (!validItemTypes.includes(item_type)) {
        return res.status(400).json({
          success: false,
          error: 'item_type must be one of: tool, insert, accessory'
        });
      }
    }

    // Validate tool_category if provided
    if (tool_category) {
      const validToolCategories = ['standard', 'special', 'modified'];
      if (!validToolCategories.includes(tool_category)) {
        return res.status(400).json({
          success: false,
          error: 'tool_category must be one of: standard, special, modified'
        });
      }
    }

    // Validate positive numbers
    if (diameter !== undefined && diameter < 0) {
      return res.status(400).json({
        success: false,
        error: 'diameter must be a positive number'
      });
    }
    if (length !== undefined && length < 0) {
      return res.status(400).json({
        success: false,
        error: 'length must be a positive number'
      });
    }
    if (cost !== undefined && cost < 0) {
      return res.status(400).json({
        success: false,
        error: 'cost must be a positive number'
      });
    }

    // Check if category exists
    if (category_id) {
      const catCheck = await pool.query(
        'SELECT id FROM tool_categories WHERE id = $1',
        [category_id]
      );
      if (catCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category_id'
        });
      }
    }

    // Check if subcategory exists
    if (subcategory_id) {
      const subCatCheck = await pool.query(
        'SELECT id FROM tool_subcategories WHERE id = $1',
        [subcategory_id]
      );
      if (subCatCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid subcategory_id'
        });
      }
    }

    // Convert custom_fields to JSON if provided
    const customFieldsJson = custom_fields ? JSON.stringify(custom_fields) : undefined;

    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (article_number !== undefined) {
      fields.push(`article_number = $${paramCount}`);
      values.push(article_number);
      paramCount++;
    }
    if (tool_name !== undefined) {
      fields.push(`tool_name = $${paramCount}`);
      values.push(tool_name);
      paramCount++;
    }
    if (category_id !== undefined) {
      fields.push(`category_id = $${paramCount}`);
      values.push(category_id);
      paramCount++;
    }
    if (subcategory_id !== undefined) {
      fields.push(`subcategory_id = $${paramCount}`);
      values.push(subcategory_id);
      paramCount++;
    }
    if (item_type !== undefined) {
      fields.push(`item_type = $${paramCount}`);
      values.push(item_type);
      paramCount++;
    }
    if (tool_category !== undefined) {
      fields.push(`tool_category = $${paramCount}`);
      values.push(tool_category);
      paramCount++;
    }
    if (diameter !== undefined) {
      fields.push(`diameter = $${paramCount}`);
      values.push(diameter);
      paramCount++;
    }
    if (length !== undefined) {
      fields.push(`length = $${paramCount}`);
      values.push(length);
      paramCount++;
    }
    if (flutes !== undefined) {
      fields.push(`flutes = $${paramCount}`);
      values.push(flutes);
      paramCount++;
    }
    if (material !== undefined) {
      fields.push(`material = $${paramCount}`);
      values.push(material);
      paramCount++;
    }
    if (coating !== undefined) {
      fields.push(`coating = $${paramCount}`);
      values.push(coating);
      paramCount++;
    }
    if (substrate_grade !== undefined) {
      fields.push(`substrate_grade = $${paramCount}`);
      values.push(substrate_grade);
      paramCount++;
    }
    if (hardness !== undefined) {
      fields.push(`hardness = $${paramCount}`);
      values.push(hardness);
      paramCount++;
    }
    if (manufacturer !== undefined) {
      fields.push(`manufacturer = $${paramCount}`);
      values.push(manufacturer);
      paramCount++;
    }
    if (manufacturer_part_number !== undefined) {
      fields.push(`manufacturer_part_number = $${paramCount}`);
      values.push(manufacturer_part_number);
      paramCount++;
    }
    if (shop_url !== undefined) {
      fields.push(`shop_url = $${paramCount}`);
      values.push(shop_url);
      paramCount++;
    }
    if (cost !== undefined) {
      fields.push(`cost = $${paramCount}`);
      values.push(cost);
      paramCount++;
    }
    if (uses_inserts !== undefined) {
      fields.push(`uses_inserts = $${paramCount}`);
      values.push(uses_inserts);
      paramCount++;
    }
    if (customFieldsJson !== undefined) {
      fields.push(`custom_fields = $${paramCount}`);
      values.push(customFieldsJson);
      paramCount++;
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    if (notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    // Always update updated_at
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 1) { // Only updated_at
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Add id to values
    values.push(id);

    const query = `
      UPDATE tool_master
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    await pool.query(query, values);

    // Fetch complete data with joins
    const fullToolQuery = `
      SELECT
        tm.*,
        tc.name as category_name,
        tc.icon as category_icon,
        ts.name as subcategory_name,
        u.username as created_by_username
      FROM tool_master tm
      LEFT JOIN tool_categories tc ON tm.category_id = tc.id
      LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
      LEFT JOIN users u ON tm.created_by = u.id
      WHERE tm.id = $1 AND tm.is_deleted = false
    `;
    const fullTool = await pool.query(fullToolQuery, [id]);

    res.json({
      success: true,
      data: fullTool.rows[0],
      message: 'Tool updated successfully'
    });
  } catch (error) {
    console.error('Error updating tool:', error);

    // Check for unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A tool with this article_number already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update tool',
      message: error.message
    });
  }
};

/**
 * Delete tool (soft delete by setting is_active = false)
 * DELETE /api/tool-master/:id
 */
exports.deleteTool = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if tool exists and is not already deleted
    const existsCheck = await pool.query('SELECT id FROM tool_master WHERE id = $1 AND is_deleted = false', [id]);
    if (existsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found'
      });
    }

    // Soft delete: set is_deleted = true, deleted_at, deleted_by
    const query = `
      UPDATE tool_master
      SET 
        is_deleted = true, 
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, article_number, tool_name
    `;

    const result = await pool.query(query, [id, userId]);

    res.json({
      success: true,
      message: 'Tool deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool',
      message: error.message
    });
  }
};

/**
 * Get tools by category
 * GET /api/tool-master/category/:categoryId
 */
exports.getToolsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { is_active = 'true', limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT
        tm.*,
        tc.name as category_name,
        tc.icon as category_icon,
        ts.name as subcategory_name,
        u.username as created_by_username
      FROM tool_master tm
      LEFT JOIN tool_categories tc ON tm.category_id = tc.id
      LEFT JOIN tool_subcategories ts ON tm.subcategory_id = ts.id
      LEFT JOIN users u ON tm.created_by = u.id
      WHERE tm.category_id = $1 AND tm.is_deleted = false
    `;
    const params = [categoryId];
    let paramCount = 2;

    if (is_active !== undefined && is_active !== '') {
      query += ` AND tm.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add pagination
    query += ` ORDER BY tm.article_number ASC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching tools by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tools by category',
      message: error.message
    });
  }
};

/**
 * Get all tools with low stock (weighted calculation)
 * GET /api/tool-master/alerts/low-stock
 */
exports.getToolsLowStock = async (req, res) => {
  try {
    const {
      sort_by = 'effective_stock',
      sort_order = 'ASC',
      limit = 50,
      offset = 0
    } = req.query;

    // Query tools with is_low_stock = true using the VIEW
    let query = `
      SELECT *
      FROM tools_with_stock
      WHERE is_low_stock = true
        AND is_deleted = false
        AND is_active = true
    `;

    // Sorting
    const allowedSortFields = [
      'article_number', 
      'tool_name', 
      'category_name',
      'effective_stock',
      'total_stock',
      'reorder_point'
    ];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'effective_stock';
    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Pagination
    query += ` LIMIT $1 OFFSET $2`;

    const result = await pool.query(query, [parseInt(limit), parseInt(offset)]);

    // Get total count
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM tools_with_stock
      WHERE is_low_stock = true
        AND is_deleted = false
        AND is_active = true
    `);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + result.rows.length < parseInt(countResult.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Error fetching low stock tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock tools',
      message: error.message
    });
  }
};

module.exports = exports;
