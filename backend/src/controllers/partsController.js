const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Get all parts with optional filtering
 * GET /api/parts?customer_id=1&status=active
 */
exports.getAllParts = async (req, res) => {
  try {
    const { customer_id, status, search } = req.query;
    
    let query = `
      SELECT 
        p.*,
        c.name as customer_name,
        c.customer_number,
        (SELECT COUNT(*) FROM operations WHERE part_id = p.id) as operation_count
      FROM parts p
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE p.status != 'deleted'
    `;
    const params = [];
    let paramCount = 1;

    if (customer_id) {
      query += ` AND p.customer_id = $${paramCount}`;
      params.push(customer_id);
      paramCount++;
    }

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (search) {
      query += ` AND (p.part_number ILIKE $${paramCount} OR p.part_name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ' ORDER BY p.created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      parts: result.rows
    });
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parts',
      message: error.message
    });
  }
};

/**
 * Get single part by ID
 * GET /api/parts/:id
 */
exports.getPartById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.*,
        c.name as customer_name,
        c.customer_number,
        c.email as customer_email,
        c.phone as customer_phone,
        u_created.username as created_by_username,
        u_updated.username as updated_by_username
      FROM parts p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u_created ON p.created_by = u_created.id
      LEFT JOIN users u_updated ON p.updated_by = u_updated.id
      WHERE p.id = $1 AND p.status != 'deleted'
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    // Get operations for this part
    const opsQuery = `
      SELECT 
        o.*,
        m.name as machine_name,
        m.manufacturer as machine_manufacturer
      FROM operations o
      LEFT JOIN machines m ON o.machine_id = m.id
      WHERE o.part_id = $1
      ORDER BY o.sequence, o.op_number
    `;
    const opsResult = await pool.query(opsQuery, [id]);

    // Get documents count per type
    const docsCountQuery = `
      SELECT 
        document_type,
        COUNT(*) as count
      FROM part_documents
      WHERE part_id = $1
      GROUP BY document_type
    `;
    const docsCountResult = await pool.query(docsCountQuery, [id]);
    
    const document_counts = {
      cad_model: 0,
      drawing: 0,
      other: 0,
      total: 0
    };
    docsCountResult.rows.forEach(row => {
      document_counts[row.document_type] = parseInt(row.count);
      document_counts.total += parseInt(row.count);
    });

    // Get primary CAD file info for 3D preview
    const primaryCadQuery = `
      SELECT id, original_filename, file_extension
      FROM part_documents
      WHERE part_id = $1 AND (is_primary_cad = true OR document_type = 'cad_model')
      ORDER BY is_primary_cad DESC, created_at DESC
      LIMIT 1
    `;
    const primaryCadResult = await pool.query(primaryCadQuery, [id]);

    // Get primary drawing file info
    const primaryDrawingQuery = `
      SELECT id, original_filename, file_extension
      FROM part_documents
      WHERE part_id = $1 AND (is_primary_drawing = true OR document_type = 'drawing')
      ORDER BY is_primary_drawing DESC, created_at DESC
      LIMIT 1
    `;
    const primaryDrawingResult = await pool.query(primaryDrawingQuery, [id]);

    const part = {
      ...result.rows[0],
      operations: opsResult.rows,
      document_counts,
      primary_cad_file: primaryCadResult.rows[0] || null,
      primary_drawing_file: primaryDrawingResult.rows[0] || null
    };

    res.json({
      success: true,
      part
    });
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch part',
      message: error.message
    });
  }
};

/**
 * Create new part
 * POST /api/parts
 * 
 * part_number wird automatisch generiert wenn nicht angegeben
 * Format: "Kundennummer-XXXXX" (z.B. K-001-00001)
 */
exports.createPart = async (req, res) => {
  try {
    const {
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      customer_part_number,
      cad_file_path,
      status = 'draft'
    } = req.body;

    // Validation - customer_id und part_name sind Pflicht
    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'Kunde ist erforderlich',
        required: ['customer_id', 'part_name']
      });
    }

    if (!part_name) {
      return res.status(400).json({
        success: false,
        error: 'Bezeichnung ist erforderlich',
        required: ['customer_id', 'part_name']
      });
    }

    // Kunde prüfen
    const customerResult = await pool.query(
      'SELECT id, customer_number, name FROM customers WHERE id = $1 AND is_active = true',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kunde nicht gefunden oder inaktiv'
      });
    }

    const customer = customerResult.rows[0];

    // Bauteilnummer: verwenden oder generieren
    let finalPartNumber = part_number;

    if (!finalPartNumber) {
      // Auto-Generierung
      const customerNumber = customer.customer_number || `K-${String(customer.id).padStart(3, '0')}`;
      
      // Höchste Nummer für diesen Kunden finden
      const maxNumberResult = await pool.query(`
        SELECT part_number FROM parts 
        WHERE customer_id = $1 
          AND part_number LIKE $2
          AND status != 'deleted'
        ORDER BY part_number DESC
        LIMIT 1
      `, [customer_id, `${customerNumber}-%`]);

      let nextSequence = 1;

      if (maxNumberResult.rows.length > 0) {
        const lastPartNumber = maxNumberResult.rows[0].part_number;
        const match = lastPartNumber.match(/-(\d+)$/);
        if (match) {
          nextSequence = parseInt(match[1], 10) + 1;
        }
      }

      finalPartNumber = `${customerNumber}-${String(nextSequence).padStart(5, '0')}`;
    }

    // Check if part_number already exists
    const checkQuery = 'SELECT id FROM parts WHERE part_number = $1 AND status != \'deleted\'';
    const checkResult = await pool.query(checkQuery, [finalPartNumber]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Bauteilnummer existiert bereits'
      });
    }

    const query = `
      INSERT INTO parts (
        customer_id, part_number, part_name, revision, description,
        material, dimensions, notes, weight, drawing_number,
        customer_part_number, cad_file_path, status, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $14)
      RETURNING *
    `;

    const values = [
      customer_id,
      finalPartNumber,
      part_name,
      revision || 'A',
      description || null,
      material || null,
      dimensions || null,
      notes || null,
      weight || null,
      drawing_number || null,
      customer_part_number || null,
      cad_file_path || null,
      status,
      req.user.id
    ];

    const result = await pool.query(query, values);

    // Kundennamen für Response hinzufügen
    result.rows[0].customer_name = customer.name;

    // Audit-Log erstellen
    await pool.query(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes, ip_address)
      VALUES ($1, 'part', $2, 'CREATE', $3, $4)
    `, [
      req.user.id,
      result.rows[0].id,
      JSON.stringify({ new: result.rows[0] }),
      req.ip
    ]);

    res.status(201).json({
      success: true,
      message: 'Bauteil erfolgreich erstellt',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating part:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Bauteils',
      message: error.message
    });
  }
};

/**
 * Update existing part
 * PUT /api/parts/:id
 */
exports.updatePart = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      customer_part_number,
      cad_file_path,
      status
    } = req.body;

    // Get old part data for audit log
    const oldPartQuery = 'SELECT * FROM parts WHERE id = $1 AND status != \'deleted\'';
    const oldPartResult = await pool.query(oldPartQuery, [id]);

    if (oldPartResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    const oldPart = oldPartResult.rows[0];

    // Check if new part_number already exists for another part
    if (part_number) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM parts WHERE part_number = $1 AND id != $2 AND status != \'deleted\'',
        [part_number, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Part number already exists'
        });
      }
    }

    const query = `
      UPDATE parts SET
        customer_id = COALESCE($1, customer_id),
        part_number = COALESCE($2, part_number),
        part_name = COALESCE($3, part_name),
        revision = COALESCE($4, revision),
        description = COALESCE($5, description),
        material = COALESCE($6, material),
        dimensions = COALESCE($7, dimensions),
        notes = COALESCE($8, notes),
        weight = COALESCE($9, weight),
        drawing_number = COALESCE($10, drawing_number),
        customer_part_number = COALESCE($11, customer_part_number),
        cad_file_path = COALESCE($12, cad_file_path),
        status = COALESCE($13, status),
        updated_by = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
    `;

    const values = [
      customer_id,
      part_number,
      part_name,
      revision,
      description,
      material,
      dimensions,
      notes,
      weight,
      drawing_number,
      customer_part_number,
      cad_file_path,
      status,
      req.user.id,
      id
    ];

    const result = await pool.query(query, values);

    // Audit-Log erstellen
    await pool.query(`
      INSERT INTO audit_logs (user_id, entity_type, entity_id, action, changes, ip_address)
      VALUES ($1, 'part', $2, 'UPDATE', $3, $4)
    `, [
      req.user.id,
      id,
      JSON.stringify({ 
        old: {
          part_number: oldPart.part_number,
          part_name: oldPart.part_name,
          customer_id: oldPart.customer_id,
          customer_part_number: oldPart.customer_part_number,
          revision: oldPart.revision,
          material: oldPart.material,
          dimensions: oldPart.dimensions,
          description: oldPart.description,
          notes: oldPart.notes,
          status: oldPart.status
        }, 
        new: {
          part_number: result.rows[0].part_number,
          part_name: result.rows[0].part_name,
          customer_id: result.rows[0].customer_id,
          customer_part_number: result.rows[0].customer_part_number,
          revision: result.rows[0].revision,
          material: result.rows[0].material,
          dimensions: result.rows[0].dimensions,
          description: result.rows[0].description,
          notes: result.rows[0].notes,
          status: result.rows[0].status
        }
      }),
      req.ip
    ]);

    res.json({
      success: true,
      message: 'Part updated successfully',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update part',
      message: error.message
    });
  }
};

/**
 * Delete part
 * DELETE /api/parts/:id
 */
exports.deletePart = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if part exists
    const checkQuery = 'SELECT id FROM parts WHERE id = $1 AND status != \'deleted\'';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Part not found'
      });
    }

    // Check if part has operations
    const opsCheck = await pool.query('SELECT COUNT(*) as count FROM operations WHERE part_id = $1', [id]);
    const operationCount = parseInt(opsCheck.rows[0].count);

    if (operationCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete part with existing operations',
        message: `This part has ${operationCount} operation(s). Delete operations first.`
      });
    }

    // Soft delete: Update status to 'deleted' instead of hard delete
    const query = `
      UPDATE parts 
      SET 
        status = 'deleted',
        updated_by = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING id, part_number, part_name
    `;

    const result = await pool.query(query, [req.user.id, id]);

    res.json({
      success: true,
      message: 'Part deleted successfully',
      part: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete part',
      message: error.message
    });
  }
};

/**
 * Get part statistics
 * GET /api/parts/stats
 */
exports.getPartStats = async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_parts,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_parts,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_parts,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_parts,
        COUNT(CASE WHEN status = 'obsolete' THEN 1 END) as obsolete_parts,
        COUNT(DISTINCT customer_id) as total_customers
      FROM parts
      WHERE status != 'deleted'
    `;

    const result = await pool.query(statsQuery);

    res.json({
      success: true,
      stats: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching part stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
};

/**
 * Generate next part number for a customer
 * POST /api/parts/generate-number
 * Body: { customer_id: number }
 * 
 * Format: "K-XXX-YYYYY" where:
 * - K-XXX = customer_number (e.g., K-001)
 * - YYYYY = 5-digit sequential number per customer
 */
exports.generatePartNumber = async (req, res) => {
  try {
    const { customer_id } = req.body;

    if (!customer_id) {
      return res.status(400).json({
        success: false,
        error: 'customer_id ist erforderlich'
      });
    }

    // Kunde und Kundennummer holen
    const customerResult = await pool.query(
      'SELECT id, customer_number, name FROM customers WHERE id = $1 AND is_active = true',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kunde nicht gefunden oder inaktiv'
      });
    }

    const customer = customerResult.rows[0];
    const customerNumber = customer.customer_number || `K-${String(customer.id).padStart(3, '0')}`;

    // Höchste Bauteilnummer für diesen Kunden finden
    // Format: "K-XXX-YYYYY" - wir extrahieren YYYYY
    const maxNumberResult = await pool.query(`
      SELECT part_number FROM parts 
      WHERE customer_id = $1 
        AND part_number LIKE $2
        AND status != 'deleted'
      ORDER BY part_number DESC
      LIMIT 1
    `, [customer_id, `${customerNumber}-%`]);

    let nextSequence = 1;

    if (maxNumberResult.rows.length > 0) {
      const lastPartNumber = maxNumberResult.rows[0].part_number;
      // Extrahiere die letzte Sequenznummer
      const match = lastPartNumber.match(/-(\d+)$/);
      if (match) {
        nextSequence = parseInt(match[1], 10) + 1;
      }
    }

    // Neue Bauteilnummer generieren
    const newPartNumber = `${customerNumber}-${String(nextSequence).padStart(5, '0')}`;

    res.json({
      success: true,
      part_number: newPartNumber,
      customer_number: customerNumber,
      sequence: nextSequence
    });
  } catch (error) {
    console.error('Error generating part number:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Generieren der Bauteilnummer',
      message: error.message
    });
  }
};

/**
 * Get part history
 * GET /api/parts/:id/history
 */
exports.getPartHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Prüfen ob Bauteil existiert
    const partCheck = await pool.query(
      'SELECT id FROM parts WHERE id = $1',
      [id]
    );

    if (partCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bauteil nicht gefunden'
      });
    }

    // Audit-Log für dieses Bauteil abrufen
    const query = `
      SELECT 
        al.*,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = 'part' AND al.entity_id = $1
      ORDER BY al.created_at DESC
      LIMIT 100
    `;

    const result = await pool.query(query, [id]);

    res.json({
      success: true,
      history: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching part history:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Historie',
      message: error.message
    });
  }
};