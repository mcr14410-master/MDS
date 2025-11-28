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
// STORAGE ITEMS - CRUD
// ============================================================================

/**
 * Get all storage items with stock info
 * GET /api/storage/items?tool_master_id=1&location_id=2&is_low_stock=true&item_type=tool&measuring_equipment_id=5
 */
exports.getAllStorageItems = async (req, res) => {
  try {
    const { tool_master_id, measuring_equipment_id, location_id, compartment_id, is_low_stock, item_type } = req.query;

    let query = `
      SELECT * FROM storage_items_with_stock si
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (tool_master_id) {
      query += ` AND si.tool_master_id = $${paramCount}`;
      params.push(parseInt(tool_master_id));
      paramCount++;
    }

    if (measuring_equipment_id) {
      query += ` AND si.measuring_equipment_id = $${paramCount}`;
      params.push(parseInt(measuring_equipment_id));
      paramCount++;
    }

    if (item_type) {
      query += ` AND si.item_type = $${paramCount}`;
      params.push(item_type);
      paramCount++;
    }

    if (location_id) {
      query += ` AND si.compartment_id IN (SELECT id FROM storage_compartments WHERE location_id = $${paramCount})`;
      params.push(parseInt(location_id));
      paramCount++;
    }

    if (compartment_id) {
      query += ` AND si.compartment_id = $${paramCount}`;
      params.push(parseInt(compartment_id));
      paramCount++;
    }

    if (is_low_stock === 'true') {
      query += ` AND si.is_low_stock = true`;
    }

    query += ' ORDER BY si.item_type, COALESCE(si.tool_name, si.equipment_name) ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching storage items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage items',
      message: error.message
    });
  }
};

/**
 * Get single storage item by ID
 * GET /api/storage/items/:id
 */
exports.getStorageItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM storage_items_with_stock WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching storage item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch storage item',
      message: error.message
    });
  }
};

/**
 * Create new storage item
 * POST /api/storage/items
 */
exports.createStorageItem = async (req, res) => {
  try {
    const {
      item_type,
      tool_master_id,
      compartment_id,
      quantity_new = 0,
      quantity_used = 0,
      quantity_reground = 0,
      weight_new = 1.0,
      weight_used = 0.5,
      weight_reground = 0.8,
      min_quantity,
      reorder_point,
      max_quantity,
      enable_low_stock_alert = false,
      notes
    } = req.body;

    // Validation
    if (!item_type || !tool_master_id || !compartment_id) {
      return res.status(400).json({
        success: false,
        error: 'item_type, tool_master_id, and compartment_id are required'
      });
    }

    // Check if item already exists for this tool/compartment (not deleted)
    const existsCheck = await pool.query(
      'SELECT id FROM storage_items WHERE tool_master_id = $1 AND compartment_id = $2 AND is_deleted = false',
      [tool_master_id, compartment_id]
    );

    if (existsCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Storage item already exists for this tool at this compartment'
      });
    }

    const query = `
      INSERT INTO storage_items (
        item_type, tool_master_id, compartment_id,
        quantity_new, quantity_used, quantity_reground,
        weight_new, weight_used, weight_reground,
        min_quantity, reorder_point, max_quantity,
        enable_low_stock_alert, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
      RETURNING *
    `;

    const values = [
      item_type, tool_master_id, compartment_id,
      quantity_new, quantity_used, quantity_reground,
      weight_new, weight_used, weight_reground,
      min_quantity, reorder_point, max_quantity,
      enable_low_stock_alert, notes, req.user.id
    ];

    const result = await pool.query(query, values);

    // Fetch complete data with joins
    const fullItem = await pool.query(`
      SELECT
        si.*,
        sl.name as location_name,
        sc.name as compartment_name,
        tm.article_number,
        tm.tool_name
      FROM storage_items_with_stock si
      LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
      LEFT JOIN storage_locations sl ON sc.location_id = sl.id
      LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
      WHERE si.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: fullItem.rows[0],
      message: 'Storage item created successfully'
    });
  } catch (error) {
    console.error('Error creating storage item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create storage item',
      message: error.message
    });
  }
};

/**
 * Update storage item
 * PUT /api/storage/items/:id
 */
exports.updateStorageItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      weight_new,
      weight_used,
      weight_reground,
      min_quantity,
      reorder_point,
      max_quantity,
      enable_low_stock_alert,
      notes
    } = req.body;

    // Build update query dynamically
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (weight_new !== undefined) {
      fields.push(`weight_new = $${paramCount}`);
      values.push(weight_new);
      paramCount++;
    }
    if (weight_used !== undefined) {
      fields.push(`weight_used = $${paramCount}`);
      values.push(weight_used);
      paramCount++;
    }
    if (weight_reground !== undefined) {
      fields.push(`weight_reground = $${paramCount}`);
      values.push(weight_reground);
      paramCount++;
    }
    if (min_quantity !== undefined) {
      fields.push(`min_quantity = $${paramCount}`);
      values.push(min_quantity);
      paramCount++;
    }
    if (reorder_point !== undefined) {
      fields.push(`reorder_point = $${paramCount}`);
      values.push(reorder_point);
      paramCount++;
    }
    if (max_quantity !== undefined) {
      fields.push(`max_quantity = $${paramCount}`);
      values.push(max_quantity);
      paramCount++;
    }
    if (enable_low_stock_alert !== undefined) {
      fields.push(`enable_low_stock_alert = $${paramCount}`);
      values.push(enable_low_stock_alert);
      paramCount++;
    }
    if (notes !== undefined) {
      fields.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE storage_items
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    await pool.query(query, values);

    // Fetch complete data
    const fullItem = await pool.query(`
      SELECT
        si.*,
        sl.name as location_name,
        sc.name as compartment_name,
        tm.article_number,
        tm.tool_name
      FROM storage_items_with_stock si
      LEFT JOIN storage_compartments sc ON si.compartment_id = sc.id
      LEFT JOIN storage_locations sl ON sc.location_id = sl.id
      LEFT JOIN tool_master tm ON si.tool_master_id = tm.id
      WHERE si.id = $1
    `, [id]);

    res.json({
      success: true,
      data: fullItem.rows[0],
      message: 'Storage item updated successfully'
    });
  } catch (error) {
    console.error('Error updating storage item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update storage item',
      message: error.message
    });
  }
};

/**
 * Delete storage item
 * DELETE /api/storage/items/:id
 */
exports.deleteStorageItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if item exists and is not already deleted
    const existsCheck = await pool.query('SELECT id FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (existsCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    // Soft delete: set is_deleted = true, deleted_at, deleted_by
    const query = `
      UPDATE storage_items
      SET 
        is_deleted = true, 
        deleted_at = CURRENT_TIMESTAMP,
        deleted_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id
    `;

    await pool.query(query, [id, userId]);

    res.json({
      success: true,
      message: 'Storage item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting storage item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete storage item',
      message: error.message
    });
  }
};

// ============================================================================
// STOCK OPERATIONS
// ============================================================================

/**
 * Issue stock (Entnahme)
 * POST /api/storage/items/:id/issue
 */
exports.issueStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition, quantity, reason, reference_type, reference_id, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!condition || !quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition and quantity are required'
      });
    }

    if (!['new', 'used', 'reground'].includes(condition)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition must be new, used, or reground'
      });
    }

    if (quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'quantity must be positive'
      });
    }

    // Get current item
    const itemResult = await client.query('SELECT * FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    const item = itemResult.rows[0];
    const currentQty = parseFloat(item[`quantity_${condition}`]);

    // Check available quantity
    if (currentQty < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Nicht genug ${condition} Werkzeuge auf Lager. Verfügbar: ${currentQty}`
      });
    }

    const newQty = currentQty - quantity;

    // Create movement record
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after, reference_type, reference_id,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id, 'issue', condition, -quantity,
      currentQty, newQty, reference_type, reference_id,
      reason, notes, userId
    ]);

    // Update storage item
    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newQty, id]);

    await client.query('COMMIT');

    // Fetch updated item
    const updatedItem = await pool.query(`
      SELECT si.*
      FROM storage_items_with_stock si
      WHERE si.id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedItem.rows[0],
      message: `${quantity} ${condition} Werkzeuge entnommen`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error issuing stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to issue stock',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Receive stock (Einlagerung)
 * POST /api/storage/items/:id/receive
 */
exports.receiveStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition, quantity, reason, reference_type, reference_id, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!condition || !quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition and quantity are required'
      });
    }

    if (!['new', 'used', 'reground'].includes(condition)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition must be new, used, or reground'
      });
    }

    if (quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'quantity must be positive'
      });
    }

    // Get current item
    const itemResult = await client.query('SELECT * FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    const item = itemResult.rows[0];
    const currentQty = parseFloat(item[`quantity_${condition}`]);
    const newQty = currentQty + quantity;

    // Create movement record
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after, reference_type, reference_id,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id, 'receipt', condition, quantity,
      currentQty, newQty, reference_type, reference_id,
      reason, notes, userId
    ]);

    // Update storage item
    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newQty, id]);

    await client.query('COMMIT');

    // Fetch updated item
    const updatedItem = await pool.query(`
      SELECT si.*
      FROM storage_items_with_stock si
      WHERE si.id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedItem.rows[0],
      message: `${quantity} ${condition} Werkzeuge eingelagert`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error receiving stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to receive stock',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Transfer stock (Umlagerung)
 * POST /api/storage/items/:id/transfer
 */
exports.transferStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition, quantity, to_compartment_id, reason, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!condition || !quantity || !to_compartment_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition, quantity, and to_compartment_id are required'
      });
    }

    // Get source item
    const sourceResult = await client.query('SELECT * FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (sourceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Source storage item not found'
      });
    }

    const sourceItem = sourceResult.rows[0];
    const currentQty = parseFloat(sourceItem[`quantity_${condition}`]);

    if (currentQty < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nicht genug Werkzeuge auf Lager'
      });
    }

    // Check if target storage item exists
    let targetItem;
    const targetResult = await client.query(
      'SELECT * FROM storage_items WHERE tool_master_id = $1 AND compartment_id = $2',
      [sourceItem.tool_master_id, to_compartment_id]
    );

    if (targetResult.rows.length === 0) {
      // Create new storage item at target
      const createResult = await client.query(`
        INSERT INTO storage_items (
          item_type, tool_master_id, compartment_id,
          quantity_new, quantity_used, quantity_reground, created_by
        ) VALUES ($1, $2, $3, 0, 0, 0, $4)
        RETURNING *
      `, [sourceItem.item_type, sourceItem.tool_master_id, to_compartment_id, userId]);
      targetItem = createResult.rows[0];
    } else {
      targetItem = targetResult.rows[0];
    }

    const targetCurrentQty = parseFloat(targetItem[`quantity_${condition}`]);
    const sourceNewQty = currentQty - quantity;
    const targetNewQty = targetCurrentQty + quantity;

    // Create movement for source (outgoing)
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after,
        from_compartment_id, to_compartment_id,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      id, 'transfer', condition, -quantity,
      currentQty, sourceNewQty,
      sourceItem.compartment_id, to_compartment_id,
      reason, notes, userId
    ]);

    // Create movement for target (incoming)
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after,
        from_compartment_id, to_compartment_id,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [
      targetItem.id, 'transfer', condition, quantity,
      targetCurrentQty, targetNewQty,
      sourceItem.compartment_id, to_compartment_id,
      reason, notes, userId
    ]);

    // Update both items
    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [sourceNewQty, id]);

    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [targetNewQty, targetItem.id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `${quantity} ${condition} Werkzeuge umgelagert`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error transferring stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer stock',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Adjust stock (Korrektur/Inventur)
 * POST /api/storage/items/:id/adjust
 */
exports.adjustStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition, new_quantity, reason, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!condition || new_quantity === undefined) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition and new_quantity are required'
      });
    }

    if (new_quantity < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'new_quantity cannot be negative'
      });
    }

    // Get current item
    const itemResult = await client.query('SELECT * FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    const item = itemResult.rows[0];
    const currentQty = parseFloat(item[`quantity_${condition}`]);
    const difference = new_quantity - currentQty;

    // Create movement record
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, 'adjustment', condition, difference,
      currentQty, new_quantity,
      reason || 'Inventur / Bestandskorrektur', notes, userId
    ]);

    // Update storage item
    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [new_quantity, id]);

    await client.query('COMMIT');

    // Fetch updated item
    const updatedItem = await pool.query(`
      SELECT si.*
      FROM storage_items_with_stock si
      WHERE si.id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedItem.rows[0],
      message: 'Bestand korrigiert'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adjusting stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust stock',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Scrap stock (Verschrottung)
 * POST /api/storage/items/:id/scrap
 */
exports.scrapStock = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { condition, quantity, reason, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!condition || !quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'condition and quantity are required'
      });
    }

    if (quantity <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'quantity must be positive'
      });
    }

    // Get current item
    const itemResult = await client.query('SELECT * FROM storage_items WHERE id = $1 AND is_deleted = false', [id]);
    if (itemResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Storage item not found'
      });
    }

    const item = itemResult.rows[0];
    const currentQty = parseFloat(item[`quantity_${condition}`]);

    if (currentQty < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nicht genug Werkzeuge auf Lager'
      });
    }

    const newQty = currentQty - quantity;

    // Create movement record
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id, movement_type, condition, quantity,
        quantity_before, quantity_after,
        reason, notes, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      id, 'scrap', condition, -quantity,
      currentQty, newQty,
      reason || 'Verschrottung', notes, userId
    ]);

    // Update storage item
    await client.query(`
      UPDATE storage_items
      SET quantity_${condition} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newQty, id]);

    await client.query('COMMIT');

    // Fetch updated item
    const updatedItem = await pool.query(`
      SELECT si.*
      FROM storage_items_with_stock si
      WHERE si.id = $1
    `, [id]);

    res.json({
      success: true,
      data: updatedItem.rows[0],
      message: `${quantity} ${condition} Werkzeuge verschrottet`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error scrapping stock:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scrap stock',
      message: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = exports;

// ============================================================================
// MEASURING EQUIPMENT STORAGE
// ============================================================================

/**
 * Assign measuring equipment to storage compartment
 * POST /api/storage/items/measuring-equipment
 */
exports.assignMeasuringEquipmentToStorage = async (req, res) => {
  try {
    const { measuring_equipment_id, compartment_id, notes } = req.body;

    // Validation
    if (!measuring_equipment_id || !compartment_id) {
      return res.status(400).json({
        success: false,
        error: 'measuring_equipment_id und compartment_id sind erforderlich'
      });
    }

    // Check if measuring equipment exists
    const equipmentCheck = await pool.query(
      'SELECT id, inventory_number, name FROM measuring_equipment WHERE id = $1 AND deleted_at IS NULL',
      [measuring_equipment_id]
    );

    if (equipmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Messmittel nicht gefunden'
      });
    }

    // Check if already assigned to a storage location
    const existsCheck = await pool.query(
      'SELECT id FROM storage_items WHERE measuring_equipment_id = $1 AND is_deleted = false',
      [measuring_equipment_id]
    );

    if (existsCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Messmittel ist bereits einem Lagerort zugewiesen'
      });
    }

    // Check if compartment exists
    const compartmentCheck = await pool.query(
      'SELECT id FROM storage_compartments WHERE id = $1 AND is_active = true',
      [compartment_id]
    );

    if (compartmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lagerfach nicht gefunden'
      });
    }

    // Create storage item for measuring equipment
    const query = `
      INSERT INTO storage_items (
        item_type, measuring_equipment_id, compartment_id,
        quantity_new, quantity_used, quantity_reground,
        notes, created_by
      ) VALUES (
        'measuring_equipment', $1, $2,
        1, 0, 0,
        $3, $4
      )
      RETURNING *
    `;

    const result = await pool.query(query, [
      measuring_equipment_id,
      compartment_id,
      notes,
      req.user.id
    ]);

    // Fetch complete data with joins from view
    const fullItem = await pool.query(`
      SELECT * FROM storage_items_with_stock WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: fullItem.rows[0],
      message: 'Messmittel erfolgreich eingelagert'
    });
  } catch (error) {
    console.error('Error assigning measuring equipment to storage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Einlagern des Messmittels',
      message: error.message
    });
  }
};

/**
 * Remove measuring equipment from storage
 * DELETE /api/storage/items/measuring-equipment/:equipmentId
 */
exports.removeMeasuringEquipmentFromStorage = async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const userId = req.user.id;

    // Find storage item for this equipment
    const itemResult = await pool.query(
      'SELECT id FROM storage_items WHERE measuring_equipment_id = $1 AND is_deleted = false',
      [equipmentId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Messmittel ist keinem Lagerort zugewiesen'
      });
    }

    // Soft delete
    await pool.query(`
      UPDATE storage_items
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
      WHERE id = $1
    `, [itemResult.rows[0].id, userId]);

    res.json({
      success: true,
      message: 'Messmittel aus Lager entfernt'
    });
  } catch (error) {
    console.error('Error removing measuring equipment from storage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Entfernen des Messmittels',
      message: error.message
    });
  }
};

/**
 * Move measuring equipment to different compartment
 * PUT /api/storage/items/measuring-equipment/:equipmentId/move
 */
exports.moveMeasuringEquipment = async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const { compartment_id } = req.body;

    if (!compartment_id) {
      return res.status(400).json({
        success: false,
        error: 'compartment_id ist erforderlich'
      });
    }

    // Find storage item for this equipment
    const itemResult = await pool.query(
      'SELECT id FROM storage_items WHERE measuring_equipment_id = $1 AND is_deleted = false',
      [equipmentId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Messmittel ist keinem Lagerort zugewiesen'
      });
    }

    // Check if compartment exists
    const compartmentCheck = await pool.query(
      'SELECT id FROM storage_compartments WHERE id = $1 AND is_active = true',
      [compartment_id]
    );

    if (compartmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lagerfach nicht gefunden'
      });
    }

    // Update compartment
    await pool.query(`
      UPDATE storage_items
      SET compartment_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [compartment_id, itemResult.rows[0].id]);

    // Fetch updated data
    const fullItem = await pool.query(`
      SELECT * FROM storage_items_with_stock WHERE id = $1
    `, [itemResult.rows[0].id]);

    res.json({
      success: true,
      data: fullItem.rows[0],
      message: 'Messmittel umgelagert'
    });
  } catch (error) {
    console.error('Error moving measuring equipment:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Umlagern',
      message: error.message
    });
  }
};

// ============================================================================
// CLAMPING DEVICES STORAGE
// ============================================================================

/**
 * Add clamping device to storage (quantity-based, unlike measuring equipment)
 * POST /api/storage/items/clamping-device
 */
exports.addClampingDeviceToStorage = async (req, res) => {
  try {
    const { 
      clamping_device_id, 
      compartment_id, 
      quantity_new = 0,
      quantity_used = 0,
      quantity_reground = 0,
      notes 
    } = req.body;

    // Validation
    if (!clamping_device_id || !compartment_id) {
      return res.status(400).json({
        success: false,
        error: 'clamping_device_id und compartment_id sind erforderlich'
      });
    }

    const totalQuantity = parseInt(quantity_new) + parseInt(quantity_used) + parseInt(quantity_reground);
    if (totalQuantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Mindestens eine Menge muss größer als 0 sein'
      });
    }

    // Check if clamping device exists
    const deviceCheck = await pool.query(
      'SELECT id, inventory_number, name FROM clamping_devices WHERE id = $1 AND deleted_at IS NULL',
      [clamping_device_id]
    );

    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Spannmittel nicht gefunden'
      });
    }

    // Check if compartment exists
    const compartmentCheck = await pool.query(
      'SELECT id FROM storage_compartments WHERE id = $1 AND is_active = true',
      [compartment_id]
    );

    if (compartmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lagerfach nicht gefunden'
      });
    }

    // Check if already exists at this compartment - if so, update quantities
    const existsCheck = await pool.query(
      'SELECT id, quantity_new, quantity_used, quantity_reground FROM storage_items WHERE clamping_device_id = $1 AND compartment_id = $2 AND is_deleted = false',
      [clamping_device_id, compartment_id]
    );

    let result;
    if (existsCheck.rows.length > 0) {
      // Update existing entry - add to quantities
      result = await pool.query(`
        UPDATE storage_items SET
          quantity_new = quantity_new + $1,
          quantity_used = quantity_used + $2,
          quantity_reground = quantity_reground + $3,
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING *
      `, [quantity_new, quantity_used, quantity_reground, notes, existsCheck.rows[0].id]);
    } else {
      // Create new storage item
      result = await pool.query(`
        INSERT INTO storage_items (
          item_type, clamping_device_id, compartment_id,
          quantity_new, quantity_used, quantity_reground,
          notes, created_by
        ) VALUES (
          'clamping_device', $1, $2,
          $3, $4, $5,
          $6, $7
        )
        RETURNING *
      `, [clamping_device_id, compartment_id, quantity_new, quantity_used, quantity_reground, notes, req.user.id]);
    }

    // Fetch complete data with joins
    const fullItem = await pool.query(`
      SELECT 
        si.*,
        sc.code as compartment_code,
        sc.name as compartment_name,
        sl.name as location_name,
        sl.id as location_id
      FROM storage_items si
      JOIN storage_compartments sc ON si.compartment_id = sc.id
      JOIN storage_locations sl ON sc.location_id = sl.id
      WHERE si.id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: fullItem.rows[0],
      message: existsCheck.rows.length > 0 ? 'Bestand erhöht' : 'Spannmittel eingelagert'
    });
  } catch (error) {
    console.error('Error adding clamping device to storage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Einlagern des Spannmittels',
      message: error.message
    });
  }
};

/**
 * Get all storage locations for a clamping device
 * GET /api/storage/items/clamping-device/:deviceId/locations
 */
exports.getClampingDeviceStorageLocations = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const result = await pool.query(`
      SELECT 
        si.id as storage_item_id,
        si.quantity_new,
        si.quantity_used,
        si.quantity_reground,
        (si.quantity_new + si.quantity_used + si.quantity_reground) as total_quantity,
        si.notes,
        sc.id as compartment_id,
        sc.code as compartment_code,
        sc.name as compartment_name,
        sl.id as location_id,
        sl.name as location_name,
        sl.code as location_code
      FROM storage_items si
      JOIN storage_compartments sc ON si.compartment_id = sc.id
      JOIN storage_locations sl ON sc.location_id = sl.id
      WHERE si.clamping_device_id = $1 AND si.is_deleted = false
      ORDER BY sl.name, sc.code
    `, [deviceId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting clamping device storage locations:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Lagerorte',
      message: error.message
    });
  }
};

/**
 * Remove clamping device from storage location
 * DELETE /api/storage/items/clamping-device/:storageItemId
 */
exports.removeClampingDeviceFromStorage = async (req, res) => {
  try {
    const { storageItemId } = req.params;
    const userId = req.user.id;

    // Check if exists
    const itemResult = await pool.query(
      'SELECT id FROM storage_items WHERE id = $1 AND item_type = $2 AND is_deleted = false',
      [storageItemId, 'clamping_device']
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Lagerort-Eintrag nicht gefunden'
      });
    }

    // Soft delete
    await pool.query(`
      UPDATE storage_items
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2
      WHERE id = $1
    `, [storageItemId, userId]);

    res.json({
      success: true,
      message: 'Lagerort-Eintrag entfernt'
    });
  } catch (error) {
    console.error('Error removing clamping device from storage:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Entfernen',
      message: error.message
    });
  }
};

/**
 * Get all items in a compartment (tools + measuring equipment)
 * GET /api/storage/compartments/:compartmentId/items
 */
exports.getCompartmentItems = async (req, res) => {
  try {
    const { compartmentId } = req.params;
    const { item_type } = req.query;

    let query = `
      SELECT * FROM storage_items_with_stock
      WHERE compartment_id = $1
    `;
    const params = [compartmentId];

    if (item_type) {
      query += ` AND item_type = $2`;
      params.push(item_type);
    }

    query += ` ORDER BY item_type, COALESCE(tool_name, equipment_name)`;

    const result = await pool.query(query, params);

    // Separate by type for easier frontend handling
    const tools = result.rows.filter(r => r.item_type !== 'measuring_equipment');
    const measuringEquipment = result.rows.filter(r => r.item_type === 'measuring_equipment');

    res.json({
      success: true,
      data: {
        all: result.rows,
        tools: tools,
        measuring_equipment: measuringEquipment,
        counts: {
          total: result.rows.length,
          tools: tools.length,
          measuring_equipment: measuringEquipment.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching compartment items:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Lagerartikel',
      message: error.message
    });
  }
};

/**
 * Get storage location for a measuring equipment
 * GET /api/storage/items/measuring-equipment/:equipmentId/location
 */
exports.getMeasuringEquipmentStorageLocation = async (req, res) => {
  try {
    const { equipmentId } = req.params;

    const result = await pool.query(`
      SELECT * FROM storage_items_with_stock
      WHERE measuring_equipment_id = $1 AND is_active = true
    `, [equipmentId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'Messmittel ist keinem Lagerort zugewiesen'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching measuring equipment storage location:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Lagerorts',
      message: error.message
    });
  }
};
