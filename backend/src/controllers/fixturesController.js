/**
 * Fixtures Controller
 * 
 * Manages fixtures (Vorrichtungen) and types
 * Mengenbasierte Lagerverwaltung, manuelle Nummerierung
 * 
 * Routes:
 * - GET    /api/fixtures/types        - Get all types
 * - GET    /api/fixtures/types/:id    - Get type by ID
 * - POST   /api/fixtures/types        - Create type
 * - PUT    /api/fixtures/types/:id    - Update type
 * - DELETE /api/fixtures/types/:id    - Delete type
 * 
 * - GET    /api/fixtures              - Get all fixtures
 * - GET    /api/fixtures/stats        - Get statistics
 * - GET    /api/fixtures/:id          - Get fixture by ID
 * - POST   /api/fixtures              - Create fixture
 * - PUT    /api/fixtures/:id          - Update fixture
 * - DELETE /api/fixtures/:id          - Soft delete fixture
 * - PATCH  /api/fixtures/:id/status   - Update status
 */

const pool = require('../config/db');

// ============================================================================
// TYPES
// ============================================================================

/**
 * GET /api/fixtures/types
 * Get all fixture types
 */
exports.getAllTypes = async (req, res) => {
  try {
    const { is_active } = req.query;

    let queryText = `
      SELECT 
        ft.*,
        (SELECT COUNT(*) FROM fixtures f 
         WHERE f.type_id = ft.id AND f.deleted_at IS NULL) as fixture_count
      FROM fixture_types ft
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (is_active !== undefined) {
      queryText += ` AND ft.is_active = $${paramCount}`;
      params.push(is_active === 'true');
      paramCount++;
    }

    queryText += ` ORDER BY ft.sort_order, ft.name`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting fixture types:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorrichtungstypen',
      error: error.message
    });
  }
};

/**
 * GET /api/fixtures/types/:id
 * Get type by ID
 */
exports.getTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        ft.*,
        (SELECT COUNT(*) FROM fixtures f 
         WHERE f.type_id = ft.id AND f.deleted_at IS NULL) as fixture_count
      FROM fixture_types ft
      WHERE ft.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtungstyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting fixture type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Vorrichtungstyps',
      error: error.message
    });
  }
};

/**
 * POST /api/fixtures/types
 * Create new type
 */
exports.createType = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      icon, 
      sort_order = 0,
      is_active = true 
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name ist erforderlich'
      });
    }

    const result = await pool.query(`
      INSERT INTO fixture_types 
        (name, description, icon, sort_order, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description, icon, sort_order, is_active]);

    res.status(201).json({
      success: true,
      message: 'Vorrichtungstyp erstellt',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Vorrichtungstyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error creating fixture type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Vorrichtungstyps',
      error: error.message
    });
  }
};

/**
 * PUT /api/fixtures/types/:id
 * Update type
 */
exports.updateType = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      description, 
      icon, 
      sort_order,
      is_active 
    } = req.body;

    const result = await pool.query(`
      UPDATE fixture_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        icon = COALESCE($3, icon),
        sort_order = COALESCE($4, sort_order),
        is_active = COALESCE($5, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, icon, sort_order, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtungstyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorrichtungstyp aktualisiert',
      data: result.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ein Vorrichtungstyp mit diesem Namen existiert bereits'
      });
    }
    console.error('Error updating fixture type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Vorrichtungstyps',
      error: error.message
    });
  }
};

/**
 * DELETE /api/fixtures/types/:id
 * Delete type (only if no fixtures use it)
 */
exports.deleteType = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if type is in use
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count FROM fixtures 
      WHERE type_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(checkResult.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        message: 'Vorrichtungstyp wird noch verwendet und kann nicht gelöscht werden'
      });
    }

    const result = await pool.query(`
      DELETE FROM fixture_types WHERE id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtungstyp nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorrichtungstyp gelöscht'
    });

  } catch (error) {
    console.error('Error deleting fixture type:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Vorrichtungstyps',
      error: error.message
    });
  }
};

// ============================================================================
// FIXTURES (Stammdaten)
// ============================================================================

/**
 * GET /api/fixtures
 * Get all fixtures with optional filters
 */
exports.getAll = async (req, res) => {
  try {
    const { 
      type_id, 
      status, 
      part_id,
      operation_id,
      machine_id,
      search,
      include_deleted = 'false'
    } = req.query;

    let queryText = `
      SELECT * FROM fixtures_with_stock
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    // Typ-Filter
    if (type_id) {
      queryText += ` AND type_id = $${paramCount}`;
      params.push(type_id);
      paramCount++;
    }

    // Status-Filter
    if (status) {
      queryText += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Bauteil-Filter
    if (part_id) {
      queryText += ` AND part_id = $${paramCount}`;
      params.push(part_id);
      paramCount++;
    }

    // Operation-Filter
    if (operation_id) {
      queryText += ` AND operation_id = $${paramCount}`;
      params.push(operation_id);
      paramCount++;
    }

    // Maschinen-Filter
    if (machine_id) {
      queryText += ` AND machine_id = $${paramCount}`;
      params.push(machine_id);
      paramCount++;
    }

    // Suche
    if (search) {
      queryText += ` AND (
        fixture_number ILIKE $${paramCount} 
        OR name ILIKE $${paramCount}
        OR notes ILIKE $${paramCount}
        OR type_name ILIKE $${paramCount}
        OR part_number ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    queryText += ` ORDER BY fixture_number`;

    const result = await pool.query(queryText, params);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting fixtures:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorrichtungen',
      error: error.message
    });
  }
};

/**
 * GET /api/fixtures/stats
 * Get fixture statistics
 */
exports.getStats = async (req, res) => {
  try {
    // Gesamt und nach Status
    const statusResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE deleted_at IS NULL) as total,
        COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active,
        COUNT(*) FILTER (WHERE status = 'in_repair' AND deleted_at IS NULL) as in_repair,
        COUNT(*) FILTER (WHERE status = 'retired' AND deleted_at IS NULL) as retired
      FROM fixtures
    `);

    // Nach Typ
    const byTypeResult = await pool.query(`
      SELECT 
        ft.id,
        ft.name,
        ft.icon,
        COUNT(f.id) as count
      FROM fixture_types ft
      LEFT JOIN fixtures f ON f.type_id = ft.id AND f.deleted_at IS NULL
      WHERE ft.is_active = true
      GROUP BY ft.id, ft.name, ft.icon
      ORDER BY ft.sort_order
    `);

    // Mit Zuordnung
    const assignmentResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE part_id IS NOT NULL) as with_part,
        COUNT(*) FILTER (WHERE operation_id IS NOT NULL) as with_operation,
        COUNT(*) FILTER (WHERE machine_id IS NOT NULL) as with_machine,
        COUNT(*) FILTER (WHERE part_id IS NULL AND operation_id IS NULL AND machine_id IS NULL) as unassigned
      FROM fixtures
      WHERE deleted_at IS NULL
    `);

    res.json({
      success: true,
      data: {
        ...statusResult.rows[0],
        by_type: byTypeResult.rows,
        assignments: assignmentResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Error getting fixture stats:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken',
      error: error.message
    });
  }
};

/**
 * GET /api/fixtures/:id
 * Get fixture by ID with full details
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT * FROM fixtures_with_stock WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    // Lagerorte laden
    const storageResult = await pool.query(`
      SELECT 
        si.*,
        sc.name as compartment_name,
        sc.code as compartment_code,
        sl.name as location_name,
        sl.code as location_code,
        sl.id as location_id,
        sl.building,
        sl.room
      FROM storage_items si
      JOIN storage_compartments sc ON sc.id = si.compartment_id
      JOIN storage_locations sl ON sl.id = sc.location_id
      WHERE si.fixture_id = $1
        AND si.is_deleted = false
      ORDER BY sl.name, sc.name
    `, [id]);

    // Dokumente laden
    const docsResult = await pool.query(`
      SELECT * FROM fixture_documents
      WHERE fixture_id = $1
      ORDER BY document_type, created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        storage_locations: storageResult.rows,
        documents: docsResult.rows
      }
    });

  } catch (error) {
    console.error('Error getting fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorrichtung',
      error: error.message
    });
  }
};

/**
 * POST /api/fixtures
 * Create new fixture
 */
exports.create = async (req, res) => {
  try {
    const { 
      fixture_number,
      name,
      type_id,
      part_id,
      operation_id,
      machine_id,
      status = 'active',
      notes
    } = req.body;

    const userId = req.user?.id;

    // Validierung
    if (!fixture_number || !type_id) {
      return res.status(400).json({
        success: false,
        message: 'Vorrichtungsnummer und Typ sind erforderlich'
      });
    }

    // Prüfen ob Nummer bereits existiert
    const checkResult = await pool.query(`
      SELECT id FROM fixtures WHERE fixture_number = $1
    `, [fixture_number]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Vorrichtungsnummer "${fixture_number}" existiert bereits`
      });
    }

    const result = await pool.query(`
      INSERT INTO fixtures (
        fixture_number, name, type_id, 
        part_id, operation_id, machine_id,
        status, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      RETURNING *
    `, [
      fixture_number, name, type_id,
      part_id || null, operation_id || null, machine_id || null,
      status, notes, userId
    ]);

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM fixtures_with_stock WHERE id = $1
    `, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Vorrichtung erstellt',
      data: fullResult.rows[0]
    });

  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Vorrichtungsnummer existiert bereits'
      });
    }
    console.error('Error creating fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Vorrichtung',
      error: error.message
    });
  }
};

/**
 * PUT /api/fixtures/:id
 * Update fixture
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fixture_number,
      name,
      type_id,
      part_id,
      operation_id,
      machine_id,
      notes
    } = req.body;

    const userId = req.user?.id;

    // Wenn fixture_number geändert wird, Duplikat prüfen
    if (fixture_number) {
      const checkResult = await pool.query(`
        SELECT id FROM fixtures WHERE fixture_number = $1 AND id != $2
      `, [fixture_number, id]);

      if (checkResult.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: `Vorrichtungsnummer "${fixture_number}" existiert bereits`
        });
      }
    }

    const result = await pool.query(`
      UPDATE fixtures SET
        fixture_number = COALESCE($1, fixture_number),
        name = $2,
        type_id = COALESCE($3, type_id),
        part_id = $4,
        operation_id = $5,
        machine_id = $6,
        notes = $7,
        updated_by = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND deleted_at IS NULL
      RETURNING *
    `, [
      fixture_number, name, type_id,
      part_id, operation_id, machine_id,
      notes, userId, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM fixtures_with_stock WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Vorrichtung aktualisiert',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Vorrichtung',
      error: error.message
    });
  }
};

/**
 * DELETE /api/fixtures/:id
 * Soft delete fixture
 */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const result = await pool.query(`
      UPDATE fixtures SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_by = $1
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Vorrichtung gelöscht'
    });

  } catch (error) {
    console.error('Error deleting fixture:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Vorrichtung',
      error: error.message
    });
  }
};

/**
 * PATCH /api/fixtures/:id/status
 * Update status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const validStatuses = ['active', 'in_repair', 'retired'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(`
      UPDATE fixtures SET
        status = $1,
        updated_by = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND deleted_at IS NULL
      RETURNING *
    `, [status, userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Vorrichtung nicht gefunden'
      });
    }

    // Mit View-Daten zurückgeben
    const fullResult = await pool.query(`
      SELECT * FROM fixtures_with_stock WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Status aktualisiert',
      data: fullResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating fixture status:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Status',
      error: error.message
    });
  }
};

/**
 * GET /api/fixtures/check-number/:number
 * Check if fixture number is available
 */
exports.checkNumber = async (req, res) => {
  try {
    const { number } = req.params;

    const result = await pool.query(`
      SELECT id, fixture_number FROM fixtures WHERE fixture_number = $1
    `, [number]);

    res.json({
      success: true,
      available: result.rows.length === 0,
      existing: result.rows[0] || null
    });

  } catch (error) {
    console.error('Error checking fixture number:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Prüfen der Vorrichtungsnummer',
      error: error.message
    });
  }
};
