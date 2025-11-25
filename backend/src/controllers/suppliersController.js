/**
 * Suppliers Controller
 * 
 * Manages supplier master data (Lieferanten-Stammdaten)
 * 
 * Routes:
 * - GET    /api/suppliers          - Get all suppliers
 * - GET    /api/suppliers/:id      - Get supplier by ID
 * - POST   /api/suppliers          - Create new supplier
 * - PUT    /api/suppliers/:id      - Update supplier
 * - DELETE /api/suppliers/:id      - Delete supplier
 * - GET    /api/suppliers/:id/items - Get all items from this supplier
 */

const pool = require('../config/db');

/**
 * GET /api/suppliers
 * Get all suppliers with optional filters
 */
exports.getAllSuppliers = async (req, res) => {
  try {
    const { 
      is_active, 
      is_preferred, 
      search,
      sort_by = 'name',
      sort_order = 'asc' 
    } = req.query;

    let queryText = `
      SELECT 
        suppliers.*,
        (SELECT COUNT(*) FROM supplier_items WHERE supplier_id = suppliers.id) as item_count
      FROM suppliers
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filters
    if (is_active !== undefined) {
      queryText += ` AND suppliers.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (is_preferred !== undefined) {
      queryText += ` AND suppliers.is_preferred = $${paramCount}`;
      params.push(is_preferred === 'true');
      paramCount++;
    }

    if (search) {
      queryText += ` AND (
        suppliers.name ILIKE $${paramCount} OR 
        suppliers.supplier_code ILIKE $${paramCount} OR 
        suppliers.city ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    const validSortFields = ['name', 'supplier_code', 'city', 'rating', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'name';
    const order = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    
    queryText += ` ORDER BY ${sortField} ${order}`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching suppliers',
      error: error.message
    });
  }
};

/**
 * GET /api/suppliers/:id
 * Get supplier by ID with related data
 */
exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        suppliers.*,
        (SELECT COUNT(*) FROM supplier_items WHERE supplier_id = suppliers.id) as item_count,
        (SELECT COUNT(*) FROM supplier_items WHERE supplier_id = suppliers.id AND is_preferred = true) as preferred_item_count
      FROM suppliers
      WHERE suppliers.id = $1
    `;

    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier',
      error: error.message
    });
  }
};

/**
 * POST /api/suppliers
 * Create new supplier
 */
exports.createSupplier = async (req, res) => {
  try {
    const {
      name,
      supplier_code,
      contact_person,
      email,
      phone,
      fax,
      website,
      address_line1,
      address_line2,
      postal_code,
      city,
      country,
      tax_id,
      payment_terms,
      delivery_time_days,
      minimum_order_value,
      currency,
      rating,
      is_preferred,
      is_active,
      notes
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Supplier name is required'
      });
    }

    // Check for duplicate name
    const checkName = await pool.query(
      'SELECT id FROM suppliers WHERE name = $1',
      [name]
    );

    if (checkName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Supplier with this name already exists'
      });
    }

    // Check for duplicate supplier_code if provided
    if (supplier_code) {
      const checkCode = await pool.query(
        'SELECT id FROM suppliers WHERE supplier_code = $1',
        [supplier_code]
      );

      if (checkCode.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Supplier with this code already exists'
        });
      }
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
    }

    const queryText = `
      INSERT INTO suppliers (
        name, supplier_code, contact_person, email, phone, fax, website,
        address_line1, address_line2, postal_code, city, country,
        tax_id, payment_terms, delivery_time_days, minimum_order_value, currency,
        rating, is_preferred, is_active, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *
    `;

    const result = await pool.query(queryText, [
      name,
      supplier_code,
      contact_person,
      email,
      phone,
      fax,
      website,
      address_line1,
      address_line2,
      postal_code,
      city,
      country,
      tax_id,
      payment_terms,
      delivery_time_days,
      minimum_order_value,
      currency || 'EUR',
      rating,
      is_preferred || false,
      is_active !== undefined ? is_active : true,
      notes,
      req.user?.id
    ]);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier',
      error: error.message
    });
  }
};

/**
 * PUT /api/suppliers/:id
 * Update supplier
 */
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      supplier_code,
      contact_person,
      email,
      phone,
      fax,
      website,
      address_line1,
      address_line2,
      postal_code,
      city,
      country,
      tax_id,
      payment_terms,
      delivery_time_days,
      minimum_order_value,
      currency,
      rating,
      is_preferred,
      is_active,
      notes
    } = req.body;

    // Check if supplier exists
    const checkExisting = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const existing = checkExisting.rows[0];

    // Check for duplicate name (excluding current supplier)
    if (name && name !== existing.name) {
      const checkName = await pool.query(
        'SELECT id FROM suppliers WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (checkName.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Supplier with this name already exists'
        });
      }
    }

    // Check for duplicate supplier_code (excluding current supplier)
    if (supplier_code && supplier_code !== existing.supplier_code) {
      const checkCode = await pool.query(
        'SELECT id FROM suppliers WHERE supplier_code = $1 AND id != $2',
        [supplier_code, id]
      );

      if (checkCode.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Supplier with this code already exists'
        });
      }
    }

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (supplier_code !== undefined) {
      updates.push(`supplier_code = $${paramCount}`);
      values.push(supplier_code);
      paramCount++;
    }
    if (contact_person !== undefined) {
      updates.push(`contact_person = $${paramCount}`);
      values.push(contact_person);
      paramCount++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    if (fax !== undefined) {
      updates.push(`fax = $${paramCount}`);
      values.push(fax);
      paramCount++;
    }
    if (website !== undefined) {
      updates.push(`website = $${paramCount}`);
      values.push(website);
      paramCount++;
    }
    if (address_line1 !== undefined) {
      updates.push(`address_line1 = $${paramCount}`);
      values.push(address_line1);
      paramCount++;
    }
    if (address_line2 !== undefined) {
      updates.push(`address_line2 = $${paramCount}`);
      values.push(address_line2);
      paramCount++;
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${paramCount}`);
      values.push(postal_code);
      paramCount++;
    }
    if (city !== undefined) {
      updates.push(`city = $${paramCount}`);
      values.push(city);
      paramCount++;
    }
    if (country !== undefined) {
      updates.push(`country = $${paramCount}`);
      values.push(country);
      paramCount++;
    }
    if (tax_id !== undefined) {
      updates.push(`tax_id = $${paramCount}`);
      values.push(tax_id);
      paramCount++;
    }
    if (payment_terms !== undefined) {
      updates.push(`payment_terms = $${paramCount}`);
      values.push(payment_terms);
      paramCount++;
    }
    if (delivery_time_days !== undefined) {
      updates.push(`delivery_time_days = $${paramCount}`);
      values.push(delivery_time_days);
      paramCount++;
    }
    if (minimum_order_value !== undefined) {
      updates.push(`minimum_order_value = $${paramCount}`);
      values.push(minimum_order_value);
      paramCount++;
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount}`);
      values.push(currency);
      paramCount++;
    }
    if (rating !== undefined) {
      updates.push(`rating = $${paramCount}`);
      values.push(rating);
      paramCount++;
    }
    if (is_preferred !== undefined) {
      updates.push(`is_preferred = $${paramCount}`);
      values.push(is_preferred);
      paramCount++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add ID for WHERE clause
    values.push(id);

    const queryText = `
      UPDATE suppliers 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(queryText, values);

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier',
      error: error.message
    });
  }
};

/**
 * DELETE /api/suppliers/:id
 * Delete supplier (soft delete by setting is_active = false)
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    // Check if supplier exists
    const checkSupplier = await pool.query(
      'SELECT * FROM suppliers WHERE id = $1',
      [id]
    );

    if (checkSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if supplier has linked items
    const checkLinked = await pool.query(
      'SELECT COUNT(*) as count FROM supplier_items WHERE supplier_id = $1',
      [id]
    );

    const linkedCount = parseInt(checkLinked.rows[0].count);

    if (linkedCount > 0 && hard_delete === 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete supplier: ${linkedCount} items are linked to this supplier`
      });
    }

    if (hard_delete === 'true') {
      // Hard delete
      await pool.query('DELETE FROM suppliers WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Supplier permanently deleted'
      });
    } else {
      // Soft delete (set is_active = false)
      await pool.query(
        'UPDATE suppliers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Supplier deactivated successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting supplier',
      error: error.message
    });
  }
};

/**
 * GET /api/suppliers/:id/items
 * Get all items from this supplier
 */
exports.getSupplierItems = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if supplier exists
    const checkSupplier = await pool.query(
      'SELECT id FROM suppliers WHERE id = $1',
      [id]
    );

    if (checkSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    const queryText = `
      SELECT 
        supplier_items.*,
        storage_items.item_type,
        storage_items.tool_master_id,
        tool_master.article_number,
        tool_master.tool_name,
        tool_master.manufacturer,
        storage_items.quantity_new,
        storage_items.quantity_used,
        storage_items.quantity_reground
      FROM supplier_items
      LEFT JOIN storage_items ON supplier_items.storage_item_id = storage_items.id
      LEFT JOIN tool_master ON storage_items.tool_master_id = tool_master.id
      WHERE supplier_items.supplier_id = $1
      ORDER BY supplier_items.created_at DESC
    `;

    const result = await pool.query(queryText, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching supplier items:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching supplier items',
      error: error.message
    });
  }
};
