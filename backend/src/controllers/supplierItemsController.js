/**
 * Supplier Items Controller
 * 
 * Manages the relationship between storage items and suppliers
 * with pricing and ordering information
 * 
 * Routes:
 * - GET    /api/storage/items/:id/suppliers        - Get all suppliers for an item
 * - POST   /api/supplier-items                     - Link supplier to item
 * - PUT    /api/supplier-items/:id                 - Update supplier item
 * - DELETE /api/supplier-items/:id                 - Remove supplier from item
 * - PUT    /api/supplier-items/:id/preferred       - Set as preferred supplier
 */

const pool = require('../config/db');

/**
 * GET /api/storage/items/:id/suppliers
 * Get all suppliers for a specific storage item
 */
exports.getItemSuppliers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if storage item exists
    const checkItem = await pool.query(
      'SELECT id FROM storage_items WHERE id = $1',
      [id]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Storage item not found'
      });
    }

    const queryText = `
      SELECT 
        supplier_items.*,
        suppliers.name as supplier_name,
        suppliers.supplier_code,
        suppliers.contact_person,
        suppliers.email,
        suppliers.phone,
        suppliers.website,
        suppliers.city,
        suppliers.country,
        suppliers.rating,
        suppliers.is_preferred as supplier_is_preferred,
        suppliers.delivery_time_days as supplier_delivery_time,
        suppliers.payment_terms as supplier_payment_terms,
        suppliers.is_active as supplier_is_active
      FROM supplier_items
      LEFT JOIN suppliers ON supplier_items.supplier_id = suppliers.id
      WHERE supplier_items.storage_item_id = $1
        AND supplier_items.is_active = true
      ORDER BY supplier_items.is_preferred DESC, suppliers.name ASC
    `;

    const result = await pool.query(queryText, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching item suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching item suppliers',
      error: error.message
    });
  }
};

/**
 * POST /api/supplier-items
 * Link a supplier to a storage item
 */
exports.createSupplierItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      storage_item_id,
      supplier_id,
      supplier_part_number,
      supplier_description,
      unit_price,
      currency,
      price_valid_from,
      price_valid_until,
      min_order_quantity,
      package_quantity,
      lead_time_days,
      is_preferred,
      is_active,
      notes
    } = req.body;

    // Validation
    if (!storage_item_id || !supplier_id) {
      return res.status(400).json({
        success: false,
        message: 'Storage item ID and supplier ID are required'
      });
    }

    // Check if storage item exists
    const checkItem = await client.query(
      'SELECT id FROM storage_items WHERE id = $1',
      [storage_item_id]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Storage item not found'
      });
    }

    // Check if supplier exists
    const checkSupplier = await client.query(
      'SELECT id FROM suppliers WHERE id = $1',
      [supplier_id]
    );

    if (checkSupplier.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Check if relationship already exists
    const checkExisting = await client.query(
      'SELECT id FROM supplier_items WHERE storage_item_id = $1 AND supplier_id = $2',
      [storage_item_id, supplier_id]
    );

    if (checkExisting.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This supplier is already linked to this item'
      });
    }

    await client.query('BEGIN');

    // If is_preferred is true, unset other preferred suppliers for this item
    if (is_preferred) {
      await client.query(
        'UPDATE supplier_items SET is_preferred = false WHERE storage_item_id = $1',
        [storage_item_id]
      );
    }

    const insertText = `
      INSERT INTO supplier_items (
        storage_item_id, supplier_id, supplier_part_number, supplier_description,
        unit_price, currency, price_valid_from, price_valid_until,
        min_order_quantity, package_quantity, lead_time_days,
        is_preferred, is_active, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `;

    const insertResult = await client.query(insertText, [
      storage_item_id,
      supplier_id,
      supplier_part_number,
      supplier_description,
      unit_price,
      currency || 'EUR',
      price_valid_from,
      price_valid_until,
      min_order_quantity,
      package_quantity,
      lead_time_days,
      is_preferred || false,
      is_active !== undefined ? is_active : true,
      notes,
      req.user?.id
    ]);

    await client.query('COMMIT');

    // Fetch full data with supplier info
    const fullDataQuery = `
      SELECT 
        supplier_items.*,
        suppliers.name as supplier_name,
        suppliers.supplier_code,
        suppliers.email,
        suppliers.phone
      FROM supplier_items
      LEFT JOIN suppliers ON supplier_items.supplier_id = suppliers.id
      WHERE supplier_items.id = $1
    `;

    const fullDataResult = await client.query(fullDataQuery, [insertResult.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Supplier linked to item successfully',
      data: fullDataResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating supplier item',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/supplier-items/:id
 * Update supplier item relationship
 */
exports.updateSupplierItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      supplier_part_number,
      supplier_description,
      unit_price,
      currency,
      price_valid_from,
      price_valid_until,
      min_order_quantity,
      package_quantity,
      lead_time_days,
      is_preferred,
      is_active,
      notes
    } = req.body;

    // Check if supplier item exists
    const checkExisting = await client.query(
      'SELECT * FROM supplier_items WHERE id = $1',
      [id]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier item relationship not found'
      });
    }

    const existing = checkExisting.rows[0];

    await client.query('BEGIN');

    // If is_preferred is true, unset other preferred suppliers for this item
    if (is_preferred && !existing.is_preferred) {
      await client.query(
        'UPDATE supplier_items SET is_preferred = false WHERE storage_item_id = $1 AND id != $2',
        [existing.storage_item_id, id]
      );
    }

    // Build dynamic UPDATE query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (supplier_part_number !== undefined) {
      updates.push(`supplier_part_number = $${paramCount}`);
      values.push(supplier_part_number);
      paramCount++;
    }
    if (supplier_description !== undefined) {
      updates.push(`supplier_description = $${paramCount}`);
      values.push(supplier_description);
      paramCount++;
    }
    if (unit_price !== undefined) {
      updates.push(`unit_price = $${paramCount}`);
      values.push(unit_price);
      paramCount++;
    }
    if (currency !== undefined) {
      updates.push(`currency = $${paramCount}`);
      values.push(currency);
      paramCount++;
    }
    if (price_valid_from !== undefined) {
      updates.push(`price_valid_from = $${paramCount}`);
      values.push(price_valid_from);
      paramCount++;
    }
    if (price_valid_until !== undefined) {
      updates.push(`price_valid_until = $${paramCount}`);
      values.push(price_valid_until);
      paramCount++;
    }
    if (min_order_quantity !== undefined) {
      updates.push(`min_order_quantity = $${paramCount}`);
      values.push(min_order_quantity);
      paramCount++;
    }
    if (package_quantity !== undefined) {
      updates.push(`package_quantity = $${paramCount}`);
      values.push(package_quantity);
      paramCount++;
    }
    if (lead_time_days !== undefined) {
      updates.push(`lead_time_days = $${paramCount}`);
      values.push(lead_time_days);
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
      UPDATE supplier_items 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    await client.query(queryText, values);

    await client.query('COMMIT');

    // Fetch full data with supplier info
    const fullDataQuery = `
      SELECT 
        supplier_items.*,
        suppliers.name as supplier_name,
        suppliers.supplier_code,
        suppliers.email,
        suppliers.phone
      FROM supplier_items
      LEFT JOIN suppliers ON supplier_items.supplier_id = suppliers.id
      WHERE supplier_items.id = $1
    `;

    const fullDataResult = await client.query(fullDataQuery, [id]);

    res.json({
      success: true,
      message: 'Supplier item updated successfully',
      data: fullDataResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating supplier item',
      error: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/supplier-items/:id
 * Remove supplier from item
 */
exports.deleteSupplierItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if supplier item exists
    const checkItem = await pool.query(
      'SELECT id FROM supplier_items WHERE id = $1',
      [id]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier item relationship not found'
      });
    }

    // Delete the relationship
    await pool.query('DELETE FROM supplier_items WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Supplier removed from item successfully'
    });

  } catch (error) {
    console.error('Error deleting supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting supplier item',
      error: error.message
    });
  }
};

/**
 * PUT /api/supplier-items/:id/preferred
 * Set this supplier as preferred for the item
 */
exports.setPreferredSupplier = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Check if supplier item exists
    const checkItem = await client.query(
      'SELECT * FROM supplier_items WHERE id = $1',
      [id]
    );

    if (checkItem.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Supplier item relationship not found'
      });
    }

    const supplierItem = checkItem.rows[0];

    await client.query('BEGIN');

    // Unset all other preferred suppliers for this item
    await client.query(
      'UPDATE supplier_items SET is_preferred = false WHERE storage_item_id = $1',
      [supplierItem.storage_item_id]
    );

    // Set this one as preferred
    await client.query(
      'UPDATE supplier_items SET is_preferred = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    // Fetch full data
    const fullDataQuery = `
      SELECT 
        supplier_items.*,
        suppliers.name as supplier_name,
        suppliers.supplier_code
      FROM supplier_items
      LEFT JOIN suppliers ON supplier_items.supplier_id = suppliers.id
      WHERE supplier_items.id = $1
    `;

    const fullDataResult = await client.query(fullDataQuery, [id]);

    res.json({
      success: true,
      message: 'Preferred supplier set successfully',
      data: fullDataResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting preferred supplier:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting preferred supplier',
      error: error.message
    });
  } finally {
    client.release();
  }
};
