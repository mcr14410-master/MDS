/**
 * Inspection Plans Controller
 * 
 * Manages inspection plans (Messanweisungen/Prüfpläne) for operations
 * Week 12 - Phase 3 + Tolerance Calculation Enhancement
 */

const pool = require('../config/db');

/**
 * GET /api/operations/:operationId/inspection-plan
 * Get inspection plan for an operation (auto-creates if not exists)
 */
const getInspectionPlan = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { operationId } = req.params;

    // Verify operation exists
    const operationCheck = await client.query(
      'SELECT id FROM operations WHERE id = $1',
      [operationId]
    );

    if (operationCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    // Try to get existing inspection plan
    let result = await client.query(
      `SELECT ip.*, 
              creator.username as created_by_name,
              updater.username as updated_by_name
       FROM inspection_plans ip
       LEFT JOIN users creator ON ip.created_by = creator.id
       LEFT JOIN users updater ON ip.updated_by = updater.id
       WHERE ip.operation_id = $1`,
      [operationId]
    );

    // Auto-create if not exists
    if (result.rows.length === 0) {
      const createResult = await client.query(
        `INSERT INTO inspection_plans (operation_id, created_by)
         VALUES ($1, $2)
         RETURNING *`,
        [operationId, req.user.id]
      );

      result = await client.query(
        `SELECT ip.*, 
                creator.username as created_by_name,
                updater.username as updated_by_name
         FROM inspection_plans ip
         LEFT JOIN users creator ON ip.created_by = creator.id
         LEFT JOIN users updater ON ip.updated_by = updater.id
         WHERE ip.id = $1`,
        [createResult.rows[0].id]
      );
    }

    const inspectionPlan = result.rows[0];

    // Get all items with measuring equipment info
    const itemsResult = await client.query(
      `SELECT 
        ipi.*,
        me.inventory_number as equipment_inventory_number,
        me.name as equipment_name,
        me.calibration_status as equipment_calibration_status
       FROM inspection_plan_items ipi
       LEFT JOIN measuring_equipment_with_status me ON ipi.measuring_equipment_id = me.id
       WHERE ipi.inspection_plan_id = $1
       ORDER BY ipi.sequence_number ASC, ipi.id ASC`,
      [inspectionPlan.id]
    );

    res.json({
      ...inspectionPlan,
      items: itemsResult.rows
    });

  } catch (error) {
    console.error('Error fetching inspection plan:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/operations/:operationId/inspection-plan
 * Update inspection plan notes
 */
const updateInspectionPlan = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { operationId } = req.params;
    const { notes } = req.body;

    // Get or create inspection plan
    let planResult = await client.query(
      'SELECT id FROM inspection_plans WHERE operation_id = $1',
      [operationId]
    );

    let planId;

    if (planResult.rows.length === 0) {
      // Create new plan
      const createResult = await client.query(
        `INSERT INTO inspection_plans (operation_id, notes, created_by, updated_by)
         VALUES ($1, $2, $3, $3)
         RETURNING id`,
        [operationId, notes, req.user.id]
      );
      planId = createResult.rows[0].id;
    } else {
      // Update existing plan
      planId = planResult.rows[0].id;
      await client.query(
        `UPDATE inspection_plans 
         SET notes = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [notes, req.user.id, planId]
      );
    }

    // Return updated plan with items
    const result = await client.query(
      `SELECT ip.*, 
              creator.username as created_by_name,
              updater.username as updated_by_name
       FROM inspection_plans ip
       LEFT JOIN users creator ON ip.created_by = creator.id
       LEFT JOIN users updater ON ip.updated_by = updater.id
       WHERE ip.id = $1`,
      [planId]
    );

    const itemsResult = await client.query(
      `SELECT 
        ipi.*,
        me.inventory_number as equipment_inventory_number,
        me.name as equipment_name,
        me.calibration_status as equipment_calibration_status
       FROM inspection_plan_items ipi
       LEFT JOIN measuring_equipment_with_status me ON ipi.measuring_equipment_id = me.id
       WHERE ipi.inspection_plan_id = $1
       ORDER BY ipi.sequence_number ASC, ipi.id ASC`,
      [planId]
    );

    res.json({
      ...result.rows[0],
      items: itemsResult.rows
    });

  } catch (error) {
    console.error('Error updating inspection plan:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/operations/:operationId/inspection-plan/items
 * Add new inspection item
 */
const addInspectionItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { operationId } = req.params;
    const {
      measurement_description,
      tolerance,
      min_value,
      max_value,
      nominal_value,
      mean_value,
      measuring_tool,
      measuring_equipment_id,
      instruction
    } = req.body;

    // Validation
    if (!measurement_description || measurement_description.trim() === '') {
      return res.status(400).json({ message: 'Measurement description is required' });
    }

    // Get or create inspection plan
    let planResult = await client.query(
      'SELECT id FROM inspection_plans WHERE operation_id = $1',
      [operationId]
    );

    let planId;

    if (planResult.rows.length === 0) {
      // Create new plan
      const createResult = await client.query(
        `INSERT INTO inspection_plans (operation_id, created_by)
         VALUES ($1, $2)
         RETURNING id`,
        [operationId, req.user.id]
      );
      planId = createResult.rows[0].id;
    } else {
      planId = planResult.rows[0].id;
    }

    // Get next sequence number
    const seqResult = await client.query(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
       FROM inspection_plan_items
       WHERE inspection_plan_id = $1`,
      [planId]
    );
    const nextSequence = seqResult.rows[0].next_seq;

    // Insert new item
    const result = await client.query(
      `INSERT INTO inspection_plan_items (
        inspection_plan_id, sequence_number,
        measurement_description, tolerance,
        min_value, max_value, nominal_value, mean_value,
        measuring_tool, measuring_equipment_id, instruction
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        planId, nextSequence,
        measurement_description, tolerance,
        min_value, max_value, nominal_value, mean_value,
        measuring_tool, measuring_equipment_id || null, instruction
      ]
    );

    // Return with equipment info if linked
    if (measuring_equipment_id) {
      const itemWithEquipment = await client.query(
        `SELECT 
          ipi.*,
          me.inventory_number as equipment_inventory_number,
          me.name as equipment_name,
          me.calibration_status as equipment_calibration_status
         FROM inspection_plan_items ipi
         LEFT JOIN measuring_equipment_with_status me ON ipi.measuring_equipment_id = me.id
         WHERE ipi.id = $1`,
        [result.rows[0].id]
      );
      res.status(201).json(itemWithEquipment.rows[0]);
    } else {
      res.status(201).json(result.rows[0]);
    }

  } catch (error) {
    console.error('Error adding inspection item:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * PUT /api/inspection-plan-items/:itemId
 * Update inspection item
 */
const updateInspectionItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { itemId } = req.params;
    const {
      measurement_description,
      tolerance,
      min_value,
      max_value,
      nominal_value,
      mean_value,
      measuring_tool,
      measuring_equipment_id,
      instruction
    } = req.body;

    // Validation
    if (!measurement_description || measurement_description.trim() === '') {
      return res.status(400).json({ message: 'Measurement description is required' });
    }

    const result = await client.query(
      `UPDATE inspection_plan_items
       SET measurement_description = $1,
           tolerance = $2,
           min_value = $3,
           max_value = $4,
           nominal_value = $5,
           mean_value = $6,
           measuring_tool = $7,
           measuring_equipment_id = $8,
           instruction = $9,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        measurement_description, tolerance,
        min_value, max_value, nominal_value, mean_value,
        measuring_tool, measuring_equipment_id || null, instruction,
        itemId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inspection item not found' });
    }

    // Return with equipment info
    const itemWithEquipment = await client.query(
      `SELECT 
        ipi.*,
        me.inventory_number as equipment_inventory_number,
        me.name as equipment_name,
        me.calibration_status as equipment_calibration_status
       FROM inspection_plan_items ipi
       LEFT JOIN measuring_equipment_with_status me ON ipi.measuring_equipment_id = me.id
       WHERE ipi.id = $1`,
      [itemId]
    );

    res.json(itemWithEquipment.rows[0]);

  } catch (error) {
    console.error('Error updating inspection item:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * DELETE /api/inspection-plan-items/:itemId
 * Delete inspection item
 */
const deleteInspectionItem = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { itemId } = req.params;

    const result = await client.query(
      'DELETE FROM inspection_plan_items WHERE id = $1 RETURNING inspection_plan_id',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inspection item not found' });
    }

    res.json({ message: 'Inspection item deleted' });

  } catch (error) {
    console.error('Error deleting inspection item:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * POST /api/operations/:operationId/inspection-plan/reorder
 * Reorder inspection items
 */
const reorderInspectionItems = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { operationId } = req.params;
    const { item_ids } = req.body;

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ message: 'item_ids array is required' });
    }

    // Get inspection plan
    const planResult = await client.query(
      'SELECT id FROM inspection_plans WHERE operation_id = $1',
      [operationId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({ message: 'Inspection plan not found' });
    }

    await client.query('BEGIN');

    // Update sequence numbers
    for (let i = 0; i < item_ids.length; i++) {
      await client.query(
        `UPDATE inspection_plan_items
         SET sequence_number = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 AND inspection_plan_id = $3`,
        [i + 1, item_ids[i], planResult.rows[0].id]
      );
    }

    await client.query('COMMIT');

    // Return reordered items
    const itemsResult = await client.query(
      `SELECT * FROM inspection_plan_items
       WHERE inspection_plan_id = $1
       ORDER BY sequence_number ASC`,
      [planResult.rows[0].id]
    );

    res.json(itemsResult.rows);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering inspection items:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getInspectionPlan,
  updateInspectionPlan,
  addInspectionItem,
  updateInspectionItem,
  deleteInspectionItem,
  reorderInspectionItems
};
