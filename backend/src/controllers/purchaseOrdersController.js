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
// PURCHASE ORDERS - CRUD
// ============================================================================

/**
 * Get all purchase orders
 * GET /api/purchase-orders
 * Query params: status, supplier_id, date_from, date_to, limit, offset
 */
exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      supplier_id,
      date_from,
      date_to,
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        po.*,
        s.name as supplier_name,
        s.supplier_code,
        u.username as created_by_username,
        COUNT(poi.id) as item_count,
        SUM(poi.quantity_ordered) as total_quantity_ordered,
        SUM(poi.quantity_received) as total_quantity_received
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND po.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (supplier_id) {
      query += ` AND po.supplier_id = $${paramCount}`;
      params.push(parseInt(supplier_id));
      paramCount++;
    }

    if (date_from) {
      query += ` AND po.order_date >= $${paramCount}`;
      params.push(date_from);
      paramCount++;
    }

    if (date_to) {
      query += ` AND po.order_date <= $${paramCount}`;
      params.push(date_to);
      paramCount++;
    }

    query += `
      GROUP BY po.id, s.name, s.supplier_code, u.username
      ORDER BY po.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(parseInt(limit));
    params.push(parseInt(offset));

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT po.id) as count
      FROM purchase_orders po
      WHERE 1=1
    `;
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND po.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (supplier_id) {
      countQuery += ` AND po.supplier_id = $${countParamCount}`;
      countParams.push(parseInt(supplier_id));
      countParamCount++;
    }

    if (date_from) {
      countQuery += ` AND po.order_date >= $${countParamCount}`;
      countParams.push(date_from);
      countParamCount++;
    }

    if (date_to) {
      countQuery += ` AND po.order_date <= $${countParamCount}`;
      countParams.push(date_to);
      countParamCount++;
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Bestellungen',
      message: error.message
    });
  }
};

/**
 * Get single purchase order by ID
 * GET /api/purchase-orders/:id
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get order with supplier info
    const orderQuery = `
      SELECT
        po.*,
        s.name as supplier_name,
        s.supplier_code,
        s.email as supplier_email,
        s.phone as supplier_phone,
        u.username as created_by_username
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      LEFT JOIN users u ON u.id = po.created_by
      WHERE po.id = $1
    `;

    // Get order items with tool info
    const itemsQuery = `
      SELECT
        poi.*,
        si.item_type,
        tm.tool_number,
        tm.tool_name,
        tm.manufacturer,
        tm.manufacturer_part_number,
        tc.name as tool_category_name,
        sc.name as compartment_name,
        sl.name as location_name
      FROM purchase_order_items poi
      LEFT JOIN storage_items si ON si.id = poi.storage_item_id
      LEFT JOIN tool_master tm ON tm.id = si.tool_master_id
      LEFT JOIN tool_categories tc ON tc.id = tm.category_id
      LEFT JOIN storage_compartments sc ON sc.id = si.compartment_id
      LEFT JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE poi.purchase_order_id = $1
      ORDER BY poi.line_number
    `;

    const [orderResult, itemsResult] = await Promise.all([
      pool.query(orderQuery, [id]),
      pool.query(itemsQuery, [id])
    ]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    const order = orderResult.rows[0];
    order.items = itemsResult.rows;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Bestellung',
      message: error.message
    });
  }
};

/**
 * Create new purchase order
 * POST /api/purchase-orders
 */
exports.createOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      supplier_id,
      order_date,
      expected_delivery_date,
      notes,
      internal_notes,
      items = []
    } = req.body;

    // Validation
    if (!supplier_id) {
      return res.status(400).json({
        success: false,
        error: 'Lieferant ist erforderlich'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mindestens eine Position ist erforderlich'
      });
    }

    await client.query('BEGIN');

    // Calculate total
    const total_amount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
    }, 0);

    // Create order (order_number auto-generated by trigger)
    const orderQuery = `
      INSERT INTO purchase_orders (
        supplier_id,
        order_date,
        expected_delivery_date,
        total_amount,
        notes,
        internal_notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const orderResult = await client.query(orderQuery, [
      supplier_id,
      order_date || new Date().toISOString().split('T')[0],
      expected_delivery_date,
      total_amount,
      notes,
      internal_notes,
      req.user.id
    ]);

    const order = orderResult.rows[0];

    // Create order items
    const itemsInserted = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const line_total = parseFloat(item.quantity) * parseFloat(item.unit_price);

      const itemQuery = `
        INSERT INTO purchase_order_items (
          purchase_order_id,
          storage_item_id,
          line_number,
          quantity_ordered,
          unit,
          unit_price,
          line_total,
          condition_received,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const itemResult = await client.query(itemQuery, [
        order.id,
        item.storage_item_id,
        item.line_number || (i + 1),
        item.quantity,
        item.unit || 'pieces',
        item.unit_price,
        line_total,
        item.condition_received || 'new',
        item.notes
      ]);

      itemsInserted.push(itemResult.rows[0]);
    }

    await client.query('COMMIT');

    // Fetch complete order with items
    const completeOrder = await pool.query(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [order.id]
    );

    res.status(201).json({
      success: true,
      data: {
        ...completeOrder.rows[0],
        items: itemsInserted
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen der Bestellung',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update purchase order
 * PUT /api/purchase-orders/:id
 * Note: Can only update draft orders
 */
exports.updateOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const {
      supplier_id,
      order_date,
      expected_delivery_date,
      notes,
      internal_notes,
      items
    } = req.body;

    // Check if order exists and is draft
    const checkQuery = `
      SELECT status FROM purchase_orders WHERE id = $1
    `;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Nur Entwürfe können bearbeitet werden'
      });
    }

    await client.query('BEGIN');

    // Update order
    const updateQuery = `
      UPDATE purchase_orders
      SET
        supplier_id = COALESCE($1, supplier_id),
        order_date = COALESCE($2, order_date),
        expected_delivery_date = COALESCE($3, expected_delivery_date),
        notes = COALESCE($4, notes),
        internal_notes = COALESCE($5, internal_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;

    await client.query(updateQuery, [
      supplier_id,
      order_date,
      expected_delivery_date,
      notes,
      internal_notes,
      id
    ]);

    // Update items if provided
    if (items && Array.isArray(items)) {
      // Delete existing items
      await client.query('DELETE FROM purchase_order_items WHERE purchase_order_id = $1', [id]);

      // Calculate new total
      const total_amount = items.reduce((sum, item) => {
        return sum + (parseFloat(item.quantity) * parseFloat(item.unit_price));
      }, 0);

      // Update total
      await client.query(
        'UPDATE purchase_orders SET total_amount = $1 WHERE id = $2',
        [total_amount, id]
      );

      // Insert new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const line_total = parseFloat(item.quantity) * parseFloat(item.unit_price);

        await client.query(`
          INSERT INTO purchase_order_items (
            purchase_order_id,
            storage_item_id,
            line_number,
            quantity_ordered,
            unit,
            unit_price,
            line_total,
            condition_received,
            notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id,
          item.storage_item_id,
          item.line_number || (i + 1),
          item.quantity,
          item.unit || 'pieces',
          item.unit_price,
          line_total,
          item.condition_received || 'new',
          item.notes
        ]);
      }
    }

    await client.query('COMMIT');

    // Fetch updated order
    const result = await pool.query(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Bestellung',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete purchase order
 * DELETE /api/purchase-orders/:id
 * Note: Can only delete draft orders
 */
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists and is draft
    const checkQuery = `
      SELECT status FROM purchase_orders WHERE id = $1
    `;
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    if (checkResult.rows[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Nur Entwürfe können gelöscht werden'
      });
    }

    // Delete order (items will be deleted by CASCADE)
    await pool.query('DELETE FROM purchase_orders WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Bestellung gelöscht'
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Bestellung',
      message: error.message
    });
  }
};

// ============================================================================
// PURCHASE ORDERS - STATUS TRANSITIONS
// ============================================================================

/**
 * Send order to supplier
 * POST /api/purchase-orders/:id/send
 * Status: draft → sent
 * Recalculates expected_delivery_date based on current date + lead time
 */
exports.sendOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;

    // Get order with supplier info and items
    const orderQuery = `
      SELECT 
        po.*,
        s.delivery_time_days as supplier_delivery_time
      FROM purchase_orders po
      LEFT JOIN suppliers s ON s.id = po.supplier_id
      WHERE po.id = $1
    `;
    const orderResult = await client.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'draft') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Nur Entwürfe können versendet werden'
      });
    }

    // Get items with their supplier lead times
    const itemsQuery = `
      SELECT 
        poi.storage_item_id,
        si.lead_time_days as item_lead_time
      FROM purchase_order_items poi
      LEFT JOIN supplier_items si ON si.storage_item_id = poi.storage_item_id 
                                  AND si.supplier_id = $2
      WHERE poi.purchase_order_id = $1
    `;
    const itemsResult = await client.query(itemsQuery, [id, order.supplier_id]);

    // Calculate lead time: max of supplier default or any item lead time
    let leadTimeDays = order.supplier_delivery_time || 0;
    
    if (itemsResult.rows.length > 0) {
      const itemLeadTimes = itemsResult.rows
        .map(item => item.item_lead_time || 0)
        .filter(time => time > 0);
      
      if (itemLeadTimes.length > 0) {
        const maxItemLeadTime = Math.max(...itemLeadTimes);
        leadTimeDays = Math.max(leadTimeDays, maxItemLeadTime);
      }
    }

    // Calculate expected delivery date: current date + lead time
    const expectedDeliveryDate = leadTimeDays > 0 
      ? `CURRENT_DATE + INTERVAL '${leadTimeDays} days'`
      : 'CURRENT_DATE';

    // Update status and recalculate expected_delivery_date
    const updateQuery = `
      UPDATE purchase_orders
      SET
        status = 'sent',
        sent_date = CURRENT_DATE,
        expected_delivery_date = ${expectedDeliveryDate},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await client.query(updateQuery, [id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Bestellung versendet'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Versenden der Bestellung',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Receive full order
 * POST /api/purchase-orders/:id/receive
 * Status: sent/confirmed → received
 * Updates stock for all items
 */
exports.receiveOrder = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { actual_delivery_date, items = [] } = req.body;

    // Check current status
    const checkQuery = `
      SELECT po.*, poi.id as item_id, poi.storage_item_id, poi.quantity_ordered, poi.condition_received
      FROM purchase_orders po
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.id = $1
    `;
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bestellung nicht gefunden'
      });
    }

    const order = checkResult.rows[0];
    if (!['sent', 'confirmed', 'partially_received'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Bestellung kann nicht empfangen werden'
      });
    }

    await client.query('BEGIN');

    // Process each item
    for (const orderItem of checkResult.rows) {
      // Find received quantity for this item
      const receivedItem = items.find(i => i.item_id === orderItem.item_id);
      const quantity_to_receive = receivedItem 
        ? parseFloat(receivedItem.quantity_received) 
        : parseFloat(orderItem.quantity_ordered);

      // Update storage_items quantity based on condition
      const condition = orderItem.condition_received || 'new';
      const quantityField = `quantity_${condition}`;

      await client.query(`
        UPDATE storage_items
        SET ${quantityField} = ${quantityField} + $1
        WHERE id = $2
      `, [quantity_to_receive, orderItem.storage_item_id]);

      // Create stock movement
      await client.query(`
        INSERT INTO stock_movements (
          storage_item_id,
          movement_type,
          condition,
          quantity,
          reference_type,
          reference_id,
          reason,
          performed_by,
          performed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        orderItem.storage_item_id,
        'receipt',
        condition,
        quantity_to_receive,
        'purchase_order',
        id,
        `Wareneingang Bestellung ${order.order_number}`,
        req.user.id,
        actual_delivery_date || new Date()
      ]);

      // Update purchase_order_items
      await client.query(`
        UPDATE purchase_order_items
        SET quantity_received = quantity_received + $1
        WHERE id = $2
      `, [quantity_to_receive, orderItem.item_id]);
    }

    // Update order status
    await client.query(`
      UPDATE purchase_orders
      SET
        status = 'received',
        actual_delivery_date = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [actual_delivery_date || new Date().toISOString().split('T')[0], id]);

    await client.query('COMMIT');

    // Fetch updated order
    const result = await pool.query(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Wareneingang gebucht'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error receiving purchase order:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Wareneingang',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Receive partial order item
 * POST /api/purchase-orders/:orderId/items/:itemId/receive
 * Status: sent/confirmed → partially_received
 */
exports.receiveOrderItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { orderId, itemId } = req.params;
    const { quantity_received, notes } = req.body;

    if (!quantity_received || quantity_received <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Menge muss größer als 0 sein'
      });
    }

    // Get order and item info
    const query = `
      SELECT
        po.status as order_status,
        po.order_number,
        poi.storage_item_id,
        poi.quantity_ordered,
        poi.quantity_received as already_received,
        poi.condition_received
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      WHERE poi.id = $1 AND po.id = $2
    `;
    const result = await client.query(query, [itemId, orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Position nicht gefunden'
      });
    }

    const item = result.rows[0];

    // Check if quantity is valid
    const remaining = parseFloat(item.quantity_ordered) - parseFloat(item.already_received);
    if (parseFloat(quantity_received) > remaining) {
      return res.status(400).json({
        success: false,
        error: `Maximal ${remaining} können empfangen werden`
      });
    }

    await client.query('BEGIN');

    // Update storage_items
    const condition = item.condition_received || 'new';
    const quantityField = `quantity_${condition}`;

    await client.query(`
      UPDATE storage_items
      SET ${quantityField} = ${quantityField} + $1
      WHERE id = $2
    `, [quantity_received, item.storage_item_id]);

    // Create stock movement
    await client.query(`
      INSERT INTO stock_movements (
        storage_item_id,
        movement_type,
        condition,
        quantity,
        reference_type,
        reference_id,
        reason,
        notes,
        performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      item.storage_item_id,
      'receipt',
      condition,
      quantity_received,
      'purchase_order',
      orderId,
      `Teillieferung Bestellung ${item.order_number}`,
      notes,
      req.user.id
    ]);

    // Update purchase_order_items
    await client.query(`
      UPDATE purchase_order_items
      SET
        quantity_received = quantity_received + $1,
        notes = COALESCE($2, notes)
      WHERE id = $3
    `, [quantity_received, notes, itemId]);

    // Check if order should be marked as partially_received or received
    const itemsQuery = `
      SELECT
        SUM(quantity_ordered) as total_ordered,
        SUM(quantity_received) as total_received
      FROM purchase_order_items
      WHERE purchase_order_id = $1
    `;
    const itemsResult = await client.query(itemsQuery, [orderId]);
    const totals = itemsResult.rows[0];

    let newStatus = 'partially_received';
    if (parseFloat(totals.total_received) >= parseFloat(totals.total_ordered)) {
      newStatus = 'received';
    }

    await client.query(`
      UPDATE purchase_orders
      SET
        status = $1,
        actual_delivery_date = CASE 
          WHEN $1 = 'received' THEN CURRENT_DATE 
          ELSE actual_delivery_date 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newStatus, orderId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Teillieferung gebucht'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error receiving order item:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Buchen der Teillieferung',
      message: error.message
    });
  } finally {
    client.release();
  }
};

module.exports = exports;
