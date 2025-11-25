/**
 * Tool Compatible Inserts Controller
 *
 * Manages compatibility relationships between tools and inserts (Wendeschneidplatten)
 */

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
// CRUD OPERATIONS
// ============================================================================

/**
 * Get all compatible inserts for a tool
 * GET /api/tools/:toolId/compatible-inserts
 */
exports.getCompatibleInsertsByTool = async (req, res) => {
  const client = await pool.connect();
  try {
    const { toolId } = req.params;

    const query = `
      SELECT
        tci.*,
        tm.article_number as insert_article_number,
        tm.tool_name as insert_tool_name,
        tm.manufacturer as insert_manufacturer,
        tm.manufacturer_part_number as insert_part_number,
        tm.diameter as insert_diameter,
        tm.coating as insert_coating,
        tm.is_active as insert_is_active,
        u.username as created_by_username,
        -- Get storage info for the insert
        COALESCE(SUM(si.quantity_new), 0) as insert_stock_new,
        COALESCE(SUM(si.quantity_used), 0) as insert_stock_used,
        COALESCE(SUM(si.quantity_reground), 0) as insert_stock_reground
      FROM tool_compatible_inserts tci
      JOIN tool_master tm ON tm.id = tci.insert_tool_master_id
      LEFT JOIN users u ON u.id = tci.created_by
      LEFT JOIN storage_items si ON si.tool_master_id = tm.id AND si.is_deleted = false
      WHERE tci.tool_master_id = $1 AND tci.is_deleted = false
      GROUP BY tci.id, tm.id, u.username
      ORDER BY tci.is_preferred DESC, tm.article_number ASC
    `;

    const result = await client.query(query, [toolId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('getCompatibleInsertsByTool error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der kompatiblen Wendeschneidplatten',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get all tools that use a specific insert
 * GET /api/inserts/:insertId/compatible-tools
 */
exports.getToolsByInsert = async (req, res) => {
  const client = await pool.connect();
  try {
    const { insertId } = req.params;

    const query = `
      SELECT
        tci.*,
        tm.article_number,
        tm.tool_name,
        tm.item_type,
        tm.is_active,
        u.username as created_by_username
      FROM tool_compatible_inserts tci
      JOIN tool_master tm ON tm.id = tci.tool_master_id
      LEFT JOIN users u ON u.id = tci.created_by
      WHERE tci.insert_tool_master_id = $1 AND tci.is_deleted = false
      ORDER BY tm.article_number ASC
    `;

    const result = await client.query(query, [insertId]);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('getToolsByInsert error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der kompatiblen Werkzeuge',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get single compatibility record
 * GET /api/tool-compatible-inserts/:id
 */
exports.getCompatibleInsertById = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const query = `
      SELECT
        tci.*,
        tm_tool.article_number as article_number,
        tm_tool.tool_name as tool_name,
        tm_insert.article_number as insert_article_number,
        tm_insert.tool_name as insert_tool_name,
        u.username as created_by_username
      FROM tool_compatible_inserts tci
      JOIN tool_master tm_tool ON tm_tool.id = tci.tool_master_id
      JOIN tool_master tm_insert ON tm_insert.id = tci.insert_tool_master_id
      LEFT JOIN users u ON u.id = tci.created_by
      WHERE tci.id = $1 AND tci.is_deleted = false
    `;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kompatibilitätseintrag nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('getCompatibleInsertById error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Kompatibilitätseintrags',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Add compatible insert to tool
 * POST /api/tools/:toolId/compatible-inserts
 */
exports.addCompatibleInsert = async (req, res) => {
  const client = await pool.connect();
  try {
    const { toolId } = req.params;
    const { insert_tool_master_id, is_preferred, quantity_per_tool, notes } = req.body;
    const userId = req.user.id;

    // Validation
    if (!insert_tool_master_id) {
      return res.status(400).json({
        success: false,
        error: 'insert_tool_master_id ist erforderlich'
      });
    }

    if (parseInt(toolId) === parseInt(insert_tool_master_id)) {
      return res.status(400).json({
        success: false,
        error: 'Ein Werkzeug kann nicht mit sich selbst kompatibel sein'
      });
    }

    await client.query('BEGIN');

    // Verify tool exists
    const toolCheck = await client.query(
      'SELECT id FROM tool_master WHERE id = $1 AND is_deleted = false',
      [toolId]
    );

    if (toolCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Werkzeug nicht gefunden'
      });
    }

    // Verify insert exists and is actually an insert
    const insertCheck = await client.query(
      "SELECT id, item_type FROM tool_master WHERE id = $1 AND is_deleted = false",
      [insert_tool_master_id]
    );

    if (insertCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Wendeschneidplatte nicht gefunden'
      });
    }

    if (insertCheck.rows[0].item_type !== 'insert') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Das ausgewählte Werkzeug ist keine Wendeschneidplatte (item_type muss "insert" sein)'
      });
    }

    // Check for existing mapping (including soft-deleted ones)
    const existingCheck = await client.query(
      `SELECT id, is_deleted FROM tool_compatible_inserts
       WHERE tool_master_id = $1 AND insert_tool_master_id = $2`,
      [toolId, insert_tool_master_id]
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      if (existing.is_deleted) {
        // Restore soft-deleted record
        const restoreQuery = `
          UPDATE tool_compatible_inserts
          SET is_deleted = false,
              deleted_at = NULL,
              deleted_by = NULL,
              is_preferred = $1,
              quantity_per_tool = $2,
              notes = $3,
              created_by = $4,
              created_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *
        `;
        const result = await client.query(restoreQuery, [
          is_preferred || false,
          quantity_per_tool || 1,
          notes || null,
          userId,
          existing.id
        ]);

        await client.query('COMMIT');

        // Fetch complete record
        const selectQuery = `
          SELECT
            tci.*,
            tm.article_number as insert_article_number,
            tm.tool_name as insert_tool_name,
            u.username as created_by_username
          FROM tool_compatible_inserts tci
          JOIN tool_master tm ON tm.id = tci.insert_tool_master_id
          LEFT JOIN users u ON u.id = tci.created_by
          WHERE tci.id = $1
        `;
        const fullRecord = await client.query(selectQuery, [existing.id]);

        return res.status(201).json({
          success: true,
          message: 'Kompatible Wendeschneidplatte erfolgreich hinzugefügt',
          data: fullRecord.rows[0]
        });
      } else {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          error: 'Diese Wendeschneidplatte ist bereits mit dem Werkzeug verknüpft'
        });
      }
    }

    // Insert new compatibility record
    const insertQuery = `
      INSERT INTO tool_compatible_inserts (
        tool_master_id,
        insert_tool_master_id,
        is_preferred,
        quantity_per_tool,
        notes,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      toolId,
      insert_tool_master_id,
      is_preferred || false,
      quantity_per_tool || 1,
      notes || null,
      userId
    ]);

    await client.query('COMMIT');

    // Fetch complete record
    const selectQuery = `
      SELECT
        tci.*,
        tm.article_number as insert_article_number,
        tm.tool_name as insert_tool_name,
        u.username as created_by_username
      FROM tool_compatible_inserts tci
      JOIN tool_master tm ON tm.id = tci.insert_tool_master_id
      LEFT JOIN users u ON u.id = tci.created_by
      WHERE tci.id = $1
    `;
    const fullRecord = await client.query(selectQuery, [result.rows[0].id]);

    res.status(201).json({
      success: true,
      message: 'Kompatible Wendeschneidplatte erfolgreich hinzugefügt',
      data: fullRecord.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('addCompatibleInsert error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Hinzufügen der Wendeschneidplatte',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Update compatible insert relationship
 * PUT /api/tool-compatible-inserts/:id
 */
exports.updateCompatibleInsert = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { is_preferred, quantity_per_tool, notes } = req.body;

    // Check if record exists
    const checkQuery = 'SELECT id FROM tool_compatible_inserts WHERE id = $1 AND is_deleted = false';
    const checkResult = await client.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kompatibilitätseintrag nicht gefunden'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (is_preferred !== undefined) {
      updates.push(`is_preferred = $${paramCount++}`);
      values.push(is_preferred);
    }

    if (quantity_per_tool !== undefined) {
      updates.push(`quantity_per_tool = $${paramCount++}`);
      values.push(quantity_per_tool);
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Keine Felder zum Aktualisieren angegeben'
      });
    }

    values.push(id);

    const updateQuery = `
      UPDATE tool_compatible_inserts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await client.query(updateQuery, values);

    // Fetch complete record
    const selectQuery = `
      SELECT
        tci.*,
        tm.article_number as insert_article_number,
        tm.tool_name as insert_tool_name,
        u.username as created_by_username
      FROM tool_compatible_inserts tci
      JOIN tool_master tm ON tm.id = tci.insert_tool_master_id
      LEFT JOIN users u ON u.id = tci.created_by
      WHERE tci.id = $1
    `;
    const fullRecord = await client.query(selectQuery, [id]);

    res.status(200).json({
      success: true,
      message: 'Kompatibilitätseintrag erfolgreich aktualisiert',
      data: fullRecord.rows[0]
    });
  } catch (error) {
    console.error('updateCompatibleInsert error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren des Kompatibilitätseintrags',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Delete compatible insert relationship (soft delete)
 * DELETE /api/tool-compatible-inserts/:id
 */
exports.deleteCompatibleInsert = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const query = `
      UPDATE tool_compatible_inserts
      SET is_deleted = true, deleted_at = CURRENT_TIMESTAMP, deleted_by = $1
      WHERE id = $2 AND is_deleted = false
      RETURNING id
    `;

    const result = await client.query(query, [userId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Kompatibilitätseintrag nicht gefunden'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Kompatibilitätseintrag erfolgreich gelöscht'
    });
  } catch (error) {
    console.error('deleteCompatibleInsert error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Kompatibilitätseintrags',
      message: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get available inserts (not yet linked to this tool)
 * GET /api/tools/:toolId/available-inserts
 */
exports.getAvailableInserts = async (req, res) => {
  const client = await pool.connect();
  try {
    const { toolId } = req.params;
    const { search, is_active } = req.query;

    // Build query to find inserts that are NOT already linked
    let query = `
      SELECT
        tm.id,
        tm.article_number,
        tm.tool_name,
        tm.manufacturer,
        tm.manufacturer_part_number,
        tm.diameter,
        tm.coating,
        tm.is_active,
        COALESCE(SUM(si.quantity_new), 0) as stock_new,
        COALESCE(SUM(si.quantity_used), 0) as stock_used,
        COALESCE(SUM(si.quantity_reground), 0) as stock_reground
      FROM tool_master tm
      LEFT JOIN storage_items si ON si.tool_master_id = tm.id AND si.is_deleted = false
      WHERE tm.item_type = 'insert'
        AND tm.is_deleted = false
        AND tm.id NOT IN (
          SELECT insert_tool_master_id
          FROM tool_compatible_inserts
          WHERE tool_master_id = $1 AND is_deleted = false
        )
    `;

    const params = [toolId];
    let paramCount = 2;

    if (search) {
      query += ` AND (
        tm.article_number ILIKE $${paramCount} OR
        tm.tool_name ILIKE $${paramCount} OR
        tm.manufacturer ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (is_active !== undefined && is_active !== '') {
      query += ` AND tm.is_active = $${paramCount}`;
      params.push(is_active === 'true' || is_active === '1');
      paramCount++;
    }

    query += `
      GROUP BY tm.id
      ORDER BY tm.article_number ASC
      LIMIT 100
    `;

    const result = await client.query(query, params);

    res.status(200).json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('getAvailableInserts error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der verfügbaren Wendeschneidplatten',
      message: error.message
    });
  } finally {
    client.release();
  }
};
