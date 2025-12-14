/**
 * Operation Consumables Controller
 * Verwaltet Verbrauchsmaterial-Zuordnungen zu Operationen
 */

const db = require('../config/db');

/**
 * GET /api/operation-consumables?operation_id=xxx
 * Alle Verbrauchsmaterialien einer Operation
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
        oc.id,
        oc.operation_id,
        oc.consumable_id,
        oc.quantity,
        oc.unit,
        oc.purpose,
        oc.is_required,
        oc.notes,
        oc.created_at,
        c.article_number,
        c.name,
        c.description as consumable_description,
        c.base_unit,
        c.package_type,
        c.package_size,
        c.is_hazardous,
        cc.name as category_name,
        cc.icon as category_icon,
        u.username as created_by_name
      FROM operation_consumables oc
      JOIN consumables c ON oc.consumable_id = c.id
      LEFT JOIN consumable_categories cc ON c.category_id = cc.id
      LEFT JOIN users u ON oc.created_by = u.id
      WHERE oc.operation_id = $1
      ORDER BY oc.is_required DESC, c.name
    `, [operation_id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching operation consumables:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verbrauchsmaterialien',
      error: error.message
    });
  }
};

/**
 * GET /api/operation-consumables/available?operation_id=xxx&search=xxx
 * Verfügbare Verbrauchsmaterialien (noch nicht zugeordnet)
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

    // Nur suchen wenn mindestens 2 Zeichen
    if (!search || search.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const result = await db.query(`
      SELECT 
        c.id,
        c.article_number,
        c.name,
        c.base_unit,
        c.package_type,
        c.package_size,
        c.is_hazardous,
        cc.name as category_name,
        cc.icon as category_icon
      FROM consumables c
      LEFT JOIN consumable_categories cc ON c.category_id = cc.id
      WHERE c.is_active = true
        AND c.id NOT IN (
          SELECT consumable_id FROM operation_consumables WHERE operation_id = $1
        )
        AND (
          c.name ILIKE $2 
          OR c.article_number ILIKE $2
          OR cc.name ILIKE $2
        )
      ORDER BY cc.name, c.name
      LIMIT 50
    `, [operation_id, `%${search}%`]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching available consumables:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der verfügbaren Verbrauchsmaterialien',
      error: error.message
    });
  }
};

/**
 * POST /api/operation-consumables
 * Verbrauchsmaterial zu Operation hinzufügen
 */
exports.add = async (req, res) => {
  try {
    const { operation_id, consumable_id, quantity, unit, purpose, is_required, notes } = req.body;
    const userId = req.user?.id;

    if (!operation_id || !consumable_id) {
      return res.status(400).json({
        success: false,
        message: 'operation_id und consumable_id sind erforderlich'
      });
    }

    // Prüfen ob bereits zugeordnet
    const existing = await db.query(
      'SELECT id FROM operation_consumables WHERE operation_id = $1 AND consumable_id = $2',
      [operation_id, consumable_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Verbrauchsmaterial bereits zugeordnet'
      });
    }

    const result = await db.query(`
      INSERT INTO operation_consumables 
        (operation_id, consumable_id, quantity, unit, purpose, is_required, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      operation_id,
      consumable_id,
      quantity || null,
      unit || null,
      purpose || '',
      is_required !== false,
      notes || '',
      userId
    ]);

    res.status(201).json({
      success: true,
      message: 'Verbrauchsmaterial zugeordnet',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding operation consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Zuordnen des Verbrauchsmaterials',
      error: error.message
    });
  }
};

/**
 * PUT /api/operation-consumables/:id
 * Zuordnung aktualisieren
 */
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, unit, purpose, is_required, notes } = req.body;

    const result = await db.query(`
      UPDATE operation_consumables SET
        quantity = COALESCE($1, quantity),
        unit = COALESCE($2, unit),
        purpose = COALESCE($3, purpose),
        is_required = COALESCE($4, is_required),
        notes = COALESCE($5, notes)
      WHERE id = $6
      RETURNING *
    `, [quantity, unit, purpose, is_required, notes, id]);

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
    console.error('Error updating operation consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
    });
  }
};

/**
 * DELETE /api/operation-consumables/:id
 * Zuordnung entfernen
 */
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM operation_consumables WHERE id = $1 RETURNING *',
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
      message: 'Verbrauchsmaterial-Zuordnung entfernt'
    });
  } catch (error) {
    console.error('Error removing operation consumable:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen',
      error: error.message
    });
  }
};
