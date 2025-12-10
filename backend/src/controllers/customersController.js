/**
 * Customers Controller
 * 
 * Manages customer master data (Kunden-Stammdaten)
 * 
 * Routes:
 * - GET    /api/customers          - Get all customers
 * - GET    /api/customers/:id      - Get customer by ID
 * - POST   /api/customers          - Create new customer
 * - PUT    /api/customers/:id      - Update customer
 * - DELETE /api/customers/:id      - Delete customer
 * - GET    /api/customers/:id/parts - Get all parts for this customer
 */

const pool = require('../config/db');

/**
 * GET /api/customers
 * Get all customers with optional filters
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { 
      is_active, 
      search,
      sort_by = 'name',
      sort_order = 'asc' 
    } = req.query;

    let queryText = `
      SELECT 
        customers.*,
        (SELECT COUNT(*) FROM parts WHERE customer_id = customers.id AND status != 'deleted') as part_count
      FROM customers
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Filters
    if (is_active !== undefined) {
      queryText += ` AND customers.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    if (search) {
      queryText += ` AND (
        customers.name ILIKE $${paramCount} OR 
        customers.customer_number ILIKE $${paramCount} OR 
        customers.contact_person ILIKE $${paramCount} OR
        customers.email ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Sorting
    const validSortFields = ['name', 'customer_number', 'contact_person', 'created_at'];
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
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
};

/**
 * GET /api/customers/:id
 * Get customer by ID with related data
 */
exports.getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT 
        customers.*,
        (SELECT COUNT(*) FROM parts WHERE customer_id = customers.id AND status != 'deleted') as part_count
      FROM customers
      WHERE customers.id = $1
    `;

    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
};

/**
 * POST /api/customers
 * Create new customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const {
      name,
      customer_number,
      contact_person,
      email,
      phone,
      address,
      notes,
      is_active
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required'
      });
    }

    // Check for duplicate name
    const checkName = await pool.query(
      'SELECT id FROM customers WHERE name = $1',
      [name]
    );

    if (checkName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this name already exists'
      });
    }

    // Check for duplicate customer_number if provided
    if (customer_number) {
      const checkNumber = await pool.query(
        'SELECT id FROM customers WHERE customer_number = $1',
        [customer_number]
      );

      if (checkNumber.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this number already exists'
        });
      }
    }

    // Auto-generate customer_number if not provided
    let finalCustomerNumber = customer_number;
    if (!finalCustomerNumber) {
      const lastCustomer = await pool.query(
        `SELECT customer_number FROM customers 
         WHERE customer_number LIKE 'CUST-%' 
         ORDER BY customer_number DESC LIMIT 1`
      );
      
      if (lastCustomer.rows.length > 0) {
        const lastNum = parseInt(lastCustomer.rows[0].customer_number.replace('CUST-', '')) || 0;
        finalCustomerNumber = `CUST-${String(lastNum + 1).padStart(3, '0')}`;
      } else {
        finalCustomerNumber = 'CUST-001';
      }
    }

    const queryText = `
      INSERT INTO customers (
        name, customer_number, contact_person, email, phone, address, notes, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await pool.query(queryText, [
      name,
      finalCustomerNumber,
      contact_person || null,
      email || null,
      phone || null,
      address || null,
      notes || null,
      is_active !== undefined ? is_active : true
    ]);

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

/**
 * PUT /api/customers/:id
 * Update customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      customer_number,
      contact_person,
      email,
      phone,
      address,
      notes,
      is_active
    } = req.body;

    // Check if customer exists
    const checkExisting = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const existing = checkExisting.rows[0];

    // Check for duplicate name (excluding current customer)
    if (name && name !== existing.name) {
      const checkName = await pool.query(
        'SELECT id FROM customers WHERE name = $1 AND id != $2',
        [name, id]
      );

      if (checkName.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this name already exists'
        });
      }
    }

    // Check for duplicate customer_number (excluding current customer)
    if (customer_number && customer_number !== existing.customer_number) {
      const checkNumber = await pool.query(
        'SELECT id FROM customers WHERE customer_number = $1 AND id != $2',
        [customer_number, id]
      );

      if (checkNumber.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this number already exists'
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
    if (customer_number !== undefined) {
      updates.push(`customer_number = $${paramCount}`);
      values.push(customer_number);
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
    if (address !== undefined) {
      updates.push(`address = $${paramCount}`);
      values.push(address);
      paramCount++;
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      values.push(notes);
      paramCount++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    // Always update updated_at
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add ID for WHERE clause
    values.push(id);

    const queryText = `
      UPDATE customers 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(queryText, values);

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
};

/**
 * DELETE /api/customers/:id
 * Delete customer (soft delete by setting is_active = false)
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard_delete } = req.query;

    // Check if customer exists
    const checkCustomer = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [id]
    );

    if (checkCustomer.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check if customer has linked parts (only active, non-deleted parts)
    const checkLinked = await pool.query(
      "SELECT COUNT(*) as count FROM parts WHERE customer_id = $1 AND status != 'deleted'",
      [id]
    );

    const linkedCount = parseInt(checkLinked.rows[0].count);

    if (linkedCount > 0 && hard_delete === 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete customer: ${linkedCount} parts are linked to this customer`
      });
    }

    if (hard_delete === 'true') {
      // Hard delete
      await pool.query('DELETE FROM customers WHERE id = $1', [id]);

      res.json({
        success: true,
        message: 'Customer permanently deleted'
      });
    } else {
      // Soft delete (set is_active = false)
      await pool.query(
        'UPDATE customers SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Customer deactivated successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
};

/**
 * GET /api/customers/:id/parts
 * Get all parts for this customer
 */
exports.getCustomerParts = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if customer exists
    const checkCustomer = await pool.query(
      'SELECT id, name FROM customers WHERE id = $1',
      [id]
    );

    if (checkCustomer.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const queryText = `
      SELECT 
        parts.*,
        (SELECT COUNT(*) FROM operations WHERE part_id = parts.id) as operation_count
      FROM parts
      WHERE parts.customer_id = $1
      ORDER BY parts.part_number ASC
    `;

    const result = await pool.query(queryText, [id]);

    res.json({
      success: true,
      count: result.rows.length,
      customer: checkCustomer.rows[0],
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching customer parts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer parts',
      error: error.message
    });
  }
};
