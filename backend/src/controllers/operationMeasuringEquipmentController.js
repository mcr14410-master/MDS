/**
 * Operation Measuring Equipment Controller
 * Verwaltet Messmittel-Zuordnungen zu Operationen
 */

const db = require('../config/db');

/**
 * GET /api/operation-measuring-equipment?operation_id=xxx
 * Alle Messmittel einer Operation
 */
exports.getByOperation = async (req, res) => {
  try {
    const { operation_id } = req.query;

    if (!operation_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id ist erforderlich'
      });
    }

    const result = await db.query(`
      SELECT 
        ome.id,
        ome.operation_id,
        ome.measuring_equipment_id,
        ome.purpose,
        ome.is_required,
        ome.notes,
        ome.created_at,
        me.inventory_number,
        me.name,
        me.manufacturer,
        me.model,
        me.serial_number,
        me.measuring_range_min,
        me.measuring_range_max,
        me.resolution,
        me.accuracy,
        me.unit,
        me.status as equipment_status,
        me.next_calibration_date,
        met.name as type_name,
        met.icon as type_icon,
        u.username as created_by_name
      FROM operation_measuring_equipment ome
      JOIN measuring_equipment me ON ome.measuring_equipment_id = me.id
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      LEFT JOIN users u ON ome.created_by = u.id
      WHERE ome.operation_id = $1
      ORDER BY ome.is_required DESC, me.name
    `, [operation_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching operation measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Messmittel',
      error: error.message
    });
  }
};

/**
 * GET /api/operation-measuring-equipment/available?operation_id=xxx
 * Verfügbare Messmittel (noch nicht zugeordnet)
 */
exports.getAvailable = async (req, res) => {
  try {
    const { operation_id, search } = req.query;

    if (!operation_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id ist erforderlich'
      });
    }

    let query = `
      SELECT 
        me.id,
        me.inventory_number,
        me.name,
        me.manufacturer,
        me.model,
        me.measuring_range_min,
        me.measuring_range_max,
        me.resolution,
        me.unit,
        me.status,
        met.name as type_name,
        met.icon as type_icon
      FROM measuring_equipment me
      LEFT JOIN measuring_equipment_types met ON me.type_id = met.id
      WHERE me.status = 'active'
        AND me.id NOT IN (
          SELECT measuring_equipment_id FROM operation_measuring_equipment WHERE operation_id = $1
        )
    `;
    const params = [operation_id];

    if (search) {
      query += ` AND (
        me.name ILIKE $2 
        OR me.inventory_number ILIKE $2
        OR me.manufacturer ILIKE $2
        OR met.name ILIKE $2
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY met.name, me.name LIMIT 50`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verfügbaren Messmittel',
      error: error.message
    });
  }
};

/**
 * POST /api/operation-measuring-equipment
 * Messmittel zu Operation hinzufügen
 */
exports.add = async (req, res) => {
  try {
    const { operation_id, measuring_equipment_id, purpose, is_required, notes } = req.body;
    const userId = req.user?.id;

    if (!operation_id || !measuring_equipment_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id und measuring_equipment_id sind erforderlich'
      });
    }

    // Prüfen ob bereits zugeordnet
    const existing = await db.query(
      'SELECT id FROM operation_measuring_equipment WHERE operation_id = $1 AND measuring_equipment_id = $2',
      [operation_id, measuring_equipment_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Messmittel bereits zugeordnet'
      });
    }

    const result = await db.query(`
      INSERT INTO operation_measuring_equipment 
        (operation_id, measuring_equipment_id, purpose, is_required, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      operation_id,
      measuring_equipment_id,
      purpose || '',
      is_required !== false,
      notes || '',
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Messmittel zugeordnet',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding operation measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zuordnen des Messmittels',
      error: error.message
    });
  }
};

/**
 * PUT /api/operation-measuring-equipment/:id
 * Zuordnung aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { purpose, is_required, notes } = req.body;

    const result = await db.query(`
      UPDATE operation_measuring_equipment SET
        purpose = COALESCE($1, purpose),
        is_required = COALESCE($2, is_required),
        notes = COALESCE($3, notes)
      WHERE id = $4
      RETURNING *
    `, [purpose, is_required, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Zuordnung aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating operation measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
    });
  }
};

/**
 * DELETE /api/operation-measuring-equipment/:id
 * Zuordnung entfernen
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM operation_measuring_equipment WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Zuordnung nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Messmittel-Zuordnung entfernt'
    });
  } catch (error) {
    console.error('Error removing operation measuring equipment:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen',
      error: error.message
    });
  }
};
