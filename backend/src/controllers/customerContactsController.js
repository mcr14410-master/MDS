/**
 * Customer Contacts Controller
 * 
 * Manages contacts for customers (Ansprechpartner)
 * 
 * Routes:
 * - GET    /api/customers/:customerId/contacts     - Get all contacts for customer
 * - GET    /api/customers/:customerId/contacts/:id - Get contact by ID
 * - POST   /api/customers/:customerId/contacts     - Create new contact
 * - PUT    /api/customers/:customerId/contacts/:id - Update contact
 * - DELETE /api/customers/:customerId/contacts/:id - Delete contact
 */

const pool = require('../config/db');

// Department options for frontend
const DEPARTMENTS = [
  'Geschäftsführung',
  'Einkauf',
  'Qualität',
  'Technik',
  'Produktion',
  'Buchhaltung',
  'Vertrieb',
  'Logistik',
  'Sonstiges'
];

/**
 * GET /api/customers/:customerId/contacts
 * Get all contacts for a customer
 */
exports.getCustomerContacts = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { department, is_active } = req.query;

    // Check if customer exists
    const customerCheck = await pool.query(
      'SELECT id, name FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    let queryText = `
      SELECT * FROM customer_contacts
      WHERE customer_id = $1
    `;
    const params = [customerId];
    let paramCount = 2;

    if (department) {
      queryText += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (is_active !== undefined) {
      queryText += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY is_primary DESC, name ASC`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      departments: DEPARTMENTS,
      data: result.rows
    });

  } catch (error) {
    console.error('Error fetching customer contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contacts',
      error: error.message
    });
  }
};

/**
 * GET /api/customers/:customerId/contacts/:id
 * Get contact by ID
 */
exports.getContactById = async (req, res) => {
  try {
    const { customerId, id } = req.params;

    const result = await pool.query(
      `SELECT cc.*, c.name as customer_name
       FROM customer_contacts cc
       JOIN customers c ON cc.customer_id = c.id
       WHERE cc.id = $1 AND cc.customer_id = $2`,
      [id, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching contact',
      error: error.message
    });
  }
};

/**
 * POST /api/customers/:customerId/contacts
 * Create new contact
 */
exports.createContact = async (req, res) => {
  try {
    const { customerId } = req.params;
    const {
      name,
      position,
      department,
      email,
      phone,
      mobile,
      is_primary,
      notes
    } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Contact name is required'
      });
    }

    // Check if customer exists
    const customerCheck = await pool.query(
      'SELECT id FROM customers WHERE id = $1',
      [customerId]
    );

    if (customerCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // If this contact is primary, unset other primary contacts
    if (is_primary) {
      await pool.query(
        'UPDATE customer_contacts SET is_primary = false WHERE customer_id = $1',
        [customerId]
      );
    }

    const result = await pool.query(
      `INSERT INTO customer_contacts 
        (customer_id, name, position, department, email, phone, mobile, is_primary, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        customerId,
        name,
        position || null,
        department || null,
        email || null,
        phone || null,
        mobile || null,
        is_primary || false,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating contact',
      error: error.message
    });
  }
};

/**
 * PUT /api/customers/:customerId/contacts/:id
 * Update contact
 */
exports.updateContact = async (req, res) => {
  try {
    const { customerId, id } = req.params;
    const {
      name,
      position,
      department,
      email,
      phone,
      mobile,
      is_primary,
      notes,
      is_active
    } = req.body;

    // Check if contact exists
    const checkExisting = await pool.query(
      'SELECT * FROM customer_contacts WHERE id = $1 AND customer_id = $2',
      [id, customerId]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // If setting as primary, unset others first
    if (is_primary === true) {
      await pool.query(
        'UPDATE customer_contacts SET is_primary = false WHERE customer_id = $1 AND id != $2',
        [customerId, id]
      );
    }

    // Build dynamic update
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (position !== undefined) {
      updates.push(`position = $${paramCount}`);
      values.push(position);
      paramCount++;
    }
    if (department !== undefined) {
      updates.push(`department = $${paramCount}`);
      values.push(department);
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
    if (mobile !== undefined) {
      updates.push(`mobile = $${paramCount}`);
      values.push(mobile);
      paramCount++;
    }
    if (is_primary !== undefined) {
      updates.push(`is_primary = $${paramCount}`);
      values.push(is_primary);
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

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await pool.query(
      `UPDATE customer_contacts SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating contact',
      error: error.message
    });
  }
};

/**
 * DELETE /api/customers/:customerId/contacts/:id
 * Delete contact
 */
exports.deleteContact = async (req, res) => {
  try {
    const { customerId, id } = req.params;
    const { hard_delete } = req.query;

    // Check if contact exists
    const checkExisting = await pool.query(
      'SELECT * FROM customer_contacts WHERE id = $1 AND customer_id = $2',
      [id, customerId]
    );

    if (checkExisting.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    if (hard_delete === 'true') {
      await pool.query(
        'DELETE FROM customer_contacts WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Contact permanently deleted'
      });
    } else {
      // Soft delete
      await pool.query(
        'UPDATE customer_contacts SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Contact deactivated'
      });
    }

  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting contact',
      error: error.message
    });
  }
};

/**
 * GET /api/customer-contacts/departments
 * Get available department options
 */
exports.getDepartments = async (req, res) => {
  res.json({
    success: true,
    data: DEPARTMENTS
  });
};
