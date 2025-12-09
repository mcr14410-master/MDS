/**
 * Consumables Controller (Vereinfacht)
 * 
 * Manages consumables master data with simple status tracking
 * 
 * Routes:
 * - GET    /api/consumables              - Get all consumables
 * - GET    /api/consumables/:id          - Get consumable by ID
 * - POST   /api/consumables              - Create new consumable
 * - PUT    /api/consumables/:id          - Update consumable
 * - DELETE /api/consumables/:id          - Soft delete consumable
 */

const pool = require('../config/db');

/**
 * GET /api/consumables
 * Get all consumables with optional filters
 */
exports.getAllConsumables = async (req, res) => {
  try {
    const { 
      category_id,
      supplier_id,
      stock_status,
      is_active, 
      is_hazardous,
      search,
      sort_by = 'name',
      sort_order = 'asc',
      limit,
      offset
    } = req.query;

    let queryText = `
      SELECT 
        c.*,
        cat.name AS category_name,
        cat.icon AS category_icon,
        cat.color AS category_color,
        s.name AS supplier_name,
        s.delivery_time_days,
        (SELECT COUNT(*) FROM consumable_locations WHERE consumable_id = c.id) AS location_count,
        (SELECT COUNT(*) FROM consumable_documents WHERE consumable_id = c.id) AS document_count
      FROM consumables c
      LEFT JOIN consumable_categories cat ON c.category_id = cat.id
      LEFT JOIN suppliers s ON c.supplier_id = s.id
      WHERE c.is_deleted = false
    `;
    
    const params = [];
    let paramCount = 1;

    // Filters
    if (category_id) {
      queryText += ` AND c.category_id = $${paramCount}`;
      params.push(category_id);
      paramCount++;
    }

    if (supplier_id) {
      queryText += ` AND c.supplier_id = $${paramCount}`;
      params.push(supplier_id);
      paramCount++;
    }

    if (stock_status) {
      queryText += ` AND c.stock_status = $${paramCount}`;
      params.push(stock_status);
      paramCount++;
    }

    if (is_active !== undefined) {
      queryText += ` AND c.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (is_hazardous !== undefined) {
      queryText += ` AND c.is_hazardous = $${paramCount}`;
      params.push(is_hazardous === 'true');
      paramCount++;
    }

    if (search) {
      queryText += ` AND (
        c.name ILIKE $${paramCount} OR 
        c.article_number ILIKE $${paramCount} OR 
        c.description ILIKE $${paramCount} OR
        c.manufacturer ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    const validSortFields = ['name', 'article_number', 'category_name', 'stock_status', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const order = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    // Pagination
    if (limit) {
      queryText += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit));
      paramCount++;
    }

    if (offset) {
      queryText += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const result = await pool.query(queryText, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM consumables c WHERE c.is_deleted = false
    `;
    const countParams = [];
    let countParamNum = 1;
    
    if (category_id) {
      countQuery += ` AND c.category_id = $${countParamNum}`;
      countParams.push(category_id);
      countParamNum++;
    }
    if (stock_status) {
      countQuery += ` AND c.stock_status = $${countParamNum}`;
      countParams.push(stock_status);
      countParamNum++;
    }
    if (is_active !== undefined) {
      countQuery += ` AND c.is_active = $${countParamNum}`;
      countParams.push(is_active === 'true');
      countParamNum++;
    }
    if (search) {
      countQuery += ` AND (c.name ILIKE $${countParamNum} OR c.article_number ILIKE $${countParamNum})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      count: result.rows.length,
      total: totalCount,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching consumables:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consumables',
      error: error.message
    });
  }
};

/**
 * GET /api/consumables/:id
 * Get single consumable by ID with locations
 */
exports.getConsumableById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        c.*,
        cat.name AS category_name,
        cat.icon AS category_icon,
        cat.color AS category_color,
        s.name AS supplier_name,
        s.delivery_time_days,
        (SELECT COUNT(*) FROM consumable_documents WHERE consumable_id = c.id) AS document_count
      FROM consumables c
      LEFT JOIN consumable_categories cat ON c.category_id = cat.id
      LEFT JOIN suppliers s ON c.supplier_id = s.id
      WHERE c.id = $1 AND c.is_deleted = false
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consumable not found'
      });
    }

    const consumable = result.rows[0];

    // Get locations
    const locationsResult = await pool.query(`
      SELECT 
        cl.id,
        cl.compartment_id,
        cl.is_primary,
        cl.notes,
        sc.name AS compartment_name,
        sl.id AS location_id,
        sl.name AS location_name,
        sl.code AS location_code
      FROM consumable_locations cl
      JOIN storage_compartments sc ON sc.id = cl.compartment_id
      JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE cl.consumable_id = $1
      ORDER BY cl.is_primary DESC, sl.name, sc.name
    `, [id]);

    consumable.locations = locationsResult.rows;

    res.json({
      success: true,
      data: consumable
    });

  } catch (error) {
    console.error('Error fetching consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching consumable',
      error: error.message
    });
  }
};

/**
 * POST /api/consumables
 * Create new consumable
 */
exports.createConsumable = async (req, res) => {
  try {
    const {
      article_number,
      name,
      category_id,
      description,
      base_unit,
      package_type,
      package_size,
      has_expiry,
      shelf_life_months,
      is_hazardous,
      hazard_symbols,
      storage_requirements,
      supplier_id,
      supplier_article_number,
      manufacturer,
      manufacturer_article_number,
      unit_price,
      package_price,
      notes,
      stock_status = 'ok'
    } = req.body;

    // Validation
    if (!name || !base_unit || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Name, Basiseinheit und Kategorie sind erforderlich'
      });
    }

    // Check for duplicate article number
    if (article_number) {
      const existingCheck = await pool.query(
        'SELECT id FROM consumables WHERE article_number = $1 AND is_deleted = false',
        [article_number]
      );
      if (existingCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Diese Artikelnummer existiert bereits'
        });
      }
    }

    const result = await pool.query(`
      INSERT INTO consumables (
        article_number, name, category_id, description,
        base_unit, package_type, package_size,
        has_expiry, shelf_life_months,
        is_hazardous, hazard_symbols, storage_requirements,
        supplier_id, supplier_article_number,
        manufacturer, manufacturer_article_number,
        unit_price, package_price,
        notes, stock_status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      article_number, name, category_id, description,
      base_unit, package_type, package_size,
      has_expiry || false, shelf_life_months,
      is_hazardous || false, hazard_symbols, storage_requirements,
      supplier_id, supplier_article_number,
      manufacturer, manufacturer_article_number,
      unit_price, package_price,
      notes, stock_status,
      req.user?.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Consumable created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating consumable',
      error: error.message
    });
  }
};

/**
 * PUT /api/consumables/:id
 * Update consumable
 */
exports.updateConsumable = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      article_number,
      name,
      category_id,
      description,
      base_unit,
      package_type,
      package_size,
      has_expiry,
      shelf_life_months,
      is_hazardous,
      hazard_symbols,
      storage_requirements,
      supplier_id,
      supplier_article_number,
      manufacturer,
      manufacturer_article_number,
      unit_price,
      package_price,
      notes,
      stock_status,
      is_active
    } = req.body;

    // Check if exists
    const existingCheck = await pool.query(
      'SELECT id FROM consumables WHERE id = $1 AND is_deleted = false',
      [id]
    );
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consumable not found'
      });
    }

    // Check for duplicate article number
    if (article_number) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM consumables WHERE article_number = $1 AND id != $2 AND is_deleted = false',
        [article_number, id]
      );
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Diese Artikelnummer existiert bereits'
        });
      }
    }

    const result = await pool.query(`
      UPDATE consumables SET
        article_number = COALESCE($1, article_number),
        name = COALESCE($2, name),
        category_id = COALESCE($3, category_id),
        description = $4,
        base_unit = COALESCE($5, base_unit),
        package_type = $6,
        package_size = $7,
        has_expiry = COALESCE($8, has_expiry),
        shelf_life_months = $9,
        is_hazardous = COALESCE($10, is_hazardous),
        hazard_symbols = $11,
        storage_requirements = $12,
        supplier_id = $13,
        supplier_article_number = $14,
        manufacturer = $15,
        manufacturer_article_number = $16,
        unit_price = $17,
        package_price = $18,
        notes = $19,
        stock_status = COALESCE($20, stock_status),
        is_active = COALESCE($21, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *
    `, [
      article_number, name, category_id, description,
      base_unit, package_type, package_size,
      has_expiry, shelf_life_months,
      is_hazardous, hazard_symbols, storage_requirements,
      supplier_id, supplier_article_number,
      manufacturer, manufacturer_article_number,
      unit_price, package_price,
      notes, stock_status, is_active,
      id
    ]);

    res.json({
      success: true,
      message: 'Consumable updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating consumable',
      error: error.message
    });
  }
};

/**
 * DELETE /api/consumables/:id
 * Soft delete consumable
 */
exports.deleteConsumable = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE consumables SET 
        is_deleted = true,
        is_active = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND is_deleted = false
      RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Consumable not found'
      });
    }

    res.json({
      success: true,
      message: 'Consumable deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting consumable',
      error: error.message
    });
  }
};
