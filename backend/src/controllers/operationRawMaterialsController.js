/**
 * Operation Raw Materials Controller
 * Verwaltet Rohmaterial-Informationen für Operationen
 */

const db = require('../config/db');

/**
 * GET /api/operation-raw-materials/:operationId
 * Rohmaterial-Daten einer Operation
 */
exports.get = async (req, res) => {
  try {
    const { operationId } = req.params;

    const result = await db.query(`
      SELECT 
        id,
        raw_material_type,
        raw_material_designation,
        raw_material_dimensions,
        raw_material_weight,
        raw_material_notes
      FROM operations
      WHERE id = $1
    `, [operationId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching raw material:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Rohmaterial-Daten',
      error: error.message
    });
  }
};

/**
 * PUT /api/operation-raw-materials/:operationId
 * Rohmaterial-Daten aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { operationId } = req.params;
    const { 
      raw_material_type,
      raw_material_designation,
      raw_material_dimensions,
      raw_material_weight,
      raw_material_notes
    } = req.body;

    const result = await db.query(`
      UPDATE operations SET
        raw_material_type = $1,
        raw_material_designation = $2,
        raw_material_dimensions = $3,
        raw_material_weight = $4,
        raw_material_notes = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING 
        id,
        raw_material_type,
        raw_material_designation,
        raw_material_dimensions,
        raw_material_weight,
        raw_material_notes
    `, [
      raw_material_type || null,
      raw_material_designation || null,
      raw_material_dimensions || null,
      raw_material_weight || null,
      raw_material_notes || null,
      operationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Operation nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Rohmaterial-Daten aktualisiert',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Rohmaterial-Daten',
      error: error.message
    });
  }
};
