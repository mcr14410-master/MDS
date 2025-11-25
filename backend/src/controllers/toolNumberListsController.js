/**
 * Tool Number Lists Controller
 * 
 * Manages T-Number lists and their mapping to tool master data.
 * T-Numbers (e.g. T113) from NC programs are mapped to actual tools.
 */

const pool = require('../config/db');

// ============================================================================
// LISTS CRUD
// ============================================================================

/**
 * Get all tool number lists
 */
const getAllLists = async (req, res) => {
  try {
    const { include_inactive = 'false', search = '' } = req.query;
    
    let query = `
      SELECT 
        tnl.*,
        u.username as created_by_username,
        COUNT(DISTINCT tnli.id) as item_count,
        COUNT(DISTINCT mtnl.machine_id) as machine_count
      FROM tool_number_lists tnl
      LEFT JOIN users u ON u.id = tnl.created_by
      LEFT JOIN tool_number_list_items tnli ON tnli.list_id = tnl.id
      LEFT JOIN machine_tool_number_lists mtnl ON mtnl.list_id = tnl.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (include_inactive !== 'true') {
      query += ` AND tnl.is_active = true`;
    }

    if (search) {
      query += ` AND (tnl.name ILIKE $${paramCount} OR tnl.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` GROUP BY tnl.id, u.username ORDER BY tnl.name ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tool number lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool number lists'
    });
  }
};

/**
 * Get single list by ID with items
 */
const getListById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get list
    const listResult = await pool.query(`
      SELECT 
        tnl.*,
        u.username as created_by_username
      FROM tool_number_lists tnl
      LEFT JOIN users u ON u.id = tnl.created_by
      WHERE tnl.id = $1
    `, [id]);

    if (listResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    // Get items with preferred tool info
    const itemsResult = await pool.query(`
      SELECT 
        tnli.*,
        tm.article_number as preferred_article_number,
        tm.tool_name as preferred_tool_name,
        tm.manufacturer as preferred_manufacturer,
        (SELECT COUNT(*) FROM tool_number_alternatives WHERE list_item_id = tnli.id) as alternatives_count
      FROM tool_number_list_items tnli
      LEFT JOIN tool_master tm ON tm.id = tnli.preferred_tool_master_id
      WHERE tnli.list_id = $1
      ORDER BY tnli.sequence ASC, tnli.tool_number ASC
    `, [id]);

    // Get assigned machines
    const machinesResult = await pool.query(`
      SELECT 
        mtnl.*,
        m.name as machine_name,
        u.username as assigned_by_username
      FROM machine_tool_number_lists mtnl
      JOIN machines m ON m.id = mtnl.machine_id
      LEFT JOIN users u ON u.id = mtnl.assigned_by
      WHERE mtnl.list_id = $1
      ORDER BY m.name ASC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...listResult.rows[0],
        items: itemsResult.rows,
        machines: machinesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching tool number list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tool number list'
    });
  }
};

/**
 * Create new list
 */
const createList = async (req, res) => {
  try {
    const { name, description, is_active = true } = req.body;
    const userId = req.user?.id;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Name is required'
      });
    }

    const result = await pool.query(`
      INSERT INTO tool_number_lists (name, description, is_active, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name.trim(), description || null, is_active, userId]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'List created successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A list with this name already exists'
      });
    }
    console.error('Error creating tool number list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tool number list'
    });
  }
};

/**
 * Update list
 */
const updateList = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;

    const result = await pool.query(`
      UPDATE tool_number_lists
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [name, description, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'List updated successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A list with this name already exists'
      });
    }
    console.error('Error updating tool number list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tool number list'
    });
  }
};

/**
 * Delete list
 */
const deleteList = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM tool_number_lists WHERE id = $1 RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    res.json({
      success: true,
      message: `List "${result.rows[0].name}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting tool number list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tool number list'
    });
  }
};

/**
 * Duplicate list with all items
 */
const duplicateList = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { new_name } = req.body;
    const userId = req.user?.id;

    await client.query('BEGIN');

    // Get original list
    const originalList = await client.query(
      'SELECT * FROM tool_number_lists WHERE id = $1',
      [id]
    );

    if (originalList.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'List not found'
      });
    }

    const original = originalList.rows[0];
    const duplicateName = new_name?.trim() || `${original.name} (Kopie)`;

    // Create new list
    const newList = await client.query(`
      INSERT INTO tool_number_lists (name, description, is_active, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [duplicateName, original.description, original.is_active, userId]);

    const newListId = newList.rows[0].id;

    // Copy items
    const items = await client.query(
      'SELECT * FROM tool_number_list_items WHERE list_id = $1',
      [id]
    );

    for (const item of items.rows) {
      const newItem = await client.query(`
        INSERT INTO tool_number_list_items 
        (list_id, tool_number, description, preferred_tool_master_id, notes, sequence)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [newListId, item.tool_number, item.description, item.preferred_tool_master_id, item.notes, item.sequence]);

      // Copy alternatives for this item
      const alternatives = await client.query(
        'SELECT * FROM tool_number_alternatives WHERE list_item_id = $1',
        [item.id]
      );

      for (const alt of alternatives.rows) {
        await client.query(`
          INSERT INTO tool_number_alternatives (list_item_id, tool_master_id, priority, notes)
          VALUES ($1, $2, $3, $4)
        `, [newItem.rows[0].id, alt.tool_master_id, alt.priority, alt.notes]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: newList.rows[0],
      message: `List duplicated as "${duplicateName}"`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A list with this name already exists'
      });
    }
    console.error('Error duplicating tool number list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to duplicate tool number list'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// LIST ITEMS CRUD
// ============================================================================

/**
 * Get items for a list
 */
const getListItems = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        tnli.*,
        tm.article_number as preferred_article_number,
        tm.tool_name as preferred_tool_name,
        tm.manufacturer as preferred_manufacturer,
        tm.manufacturer_part_number as preferred_part_number,
        tc.name as preferred_category_name
      FROM tool_number_list_items tnli
      LEFT JOIN tool_master tm ON tm.id = tnli.preferred_tool_master_id
      LEFT JOIN tool_categories tc ON tc.id = tm.category_id
      WHERE tnli.list_id = $1
      ORDER BY tnli.sequence ASC, tnli.tool_number ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching list items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list items'
    });
  }
};

/**
 * Create list item (T-Number entry)
 */
const createListItem = async (req, res) => {
  try {
    const { id } = req.params; // list_id
    const { tool_number, description, preferred_tool_master_id, notes, sequence } = req.body;

    if (!tool_number?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'tool_number is required'
      });
    }

    // Get max sequence if not provided
    let itemSequence = sequence;
    if (itemSequence == null) {  // catches both undefined and null
      const maxSeq = await pool.query(
        'SELECT COALESCE(MAX(sequence), -1) + 1 as next_seq FROM tool_number_list_items WHERE list_id = $1',
        [id]
      );
      itemSequence = maxSeq.rows[0].next_seq;
    }

    const result = await pool.query(`
      INSERT INTO tool_number_list_items 
      (list_id, tool_number, description, preferred_tool_master_id, notes, sequence)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, tool_number.trim(), description || null, preferred_tool_master_id || null, notes || null, itemSequence]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'T-Number added successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This T-Number already exists in this list'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Invalid list_id or tool_master_id'
      });
    }
    console.error('Error creating list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create list item'
    });
  }
};

/**
 * Update list item
 */
const updateListItem = async (req, res) => {
  try {
    const { id } = req.params; // item id
    const { tool_number, description, preferred_tool_master_id, notes, sequence } = req.body;

    const result = await pool.query(`
      UPDATE tool_number_list_items
      SET 
        tool_number = COALESCE($1, tool_number),
        description = COALESCE($2, description),
        preferred_tool_master_id = $3,
        notes = COALESCE($4, notes),
        sequence = COALESCE($5, sequence),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [tool_number, description, preferred_tool_master_id, notes, sequence, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Item updated successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This T-Number already exists in this list'
      });
    }
    console.error('Error updating list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update list item'
    });
  }
};

/**
 * Delete list item
 */
const deleteListItem = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM tool_number_list_items WHERE id = $1 RETURNING id, tool_number
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    res.json({
      success: true,
      message: `T-Number ${result.rows[0].tool_number} deleted`
    });
  } catch (error) {
    console.error('Error deleting list item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete list item'
    });
  }
};

/**
 * Reorder list items
 */
const reorderListItems = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // list_id
    const { item_ids } = req.body; // Array of item IDs in new order

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'item_ids array is required'
      });
    }

    await client.query('BEGIN');

    for (let i = 0; i < item_ids.length; i++) {
      await client.query(
        'UPDATE tool_number_list_items SET sequence = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND list_id = $3',
        [i, item_ids[i], id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Items reordered successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering list items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder items'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// ALTERNATIVES CRUD
// ============================================================================

/**
 * Get alternatives for a list item
 */
const getAlternatives = async (req, res) => {
  try {
    const { id } = req.params; // list_item_id

    const result = await pool.query(`
      SELECT 
        tna.*,
        tm.article_number,
        tm.tool_name,
        tm.manufacturer,
        tm.manufacturer_part_number,
        tc.name as category_name
      FROM tool_number_alternatives tna
      JOIN tool_master tm ON tm.id = tna.tool_master_id
      LEFT JOIN tool_categories tc ON tc.id = tm.category_id
      WHERE tna.list_item_id = $1
      ORDER BY tna.priority ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching alternatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alternatives'
    });
  }
};

/**
 * Add alternative tool
 */
const addAlternative = async (req, res) => {
  try {
    const { id } = req.params; // list_item_id
    const { tool_master_id, priority, notes } = req.body;

    if (!tool_master_id) {
      return res.status(400).json({
        success: false,
        error: 'tool_master_id is required'
      });
    }

    // Get max priority if not provided
    let altPriority = priority;
    if (altPriority == null) {  // catches both undefined and null
      const maxPri = await pool.query(
        'SELECT COALESCE(MAX(priority), -1) + 1 as next_pri FROM tool_number_alternatives WHERE list_item_id = $1',
        [id]
      );
      altPriority = maxPri.rows[0].next_pri;
    }

    const result = await pool.query(`
      INSERT INTO tool_number_alternatives (list_item_id, tool_master_id, priority, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, tool_master_id, altPriority, notes || null]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Alternative added successfully'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This tool is already an alternative for this T-Number'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Invalid list_item_id or tool_master_id'
      });
    }
    console.error('Error adding alternative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add alternative'
    });
  }
};

/**
 * Update alternative
 */
const updateAlternative = async (req, res) => {
  try {
    const { id } = req.params; // alternative id
    const { priority, notes } = req.body;

    const result = await pool.query(`
      UPDATE tool_number_alternatives
      SET priority = COALESCE($1, priority), notes = COALESCE($2, notes)
      WHERE id = $3
      RETURNING *
    `, [priority, notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alternative not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Alternative updated successfully'
    });
  } catch (error) {
    console.error('Error updating alternative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alternative'
    });
  }
};

/**
 * Remove alternative
 */
const removeAlternative = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tool_number_alternatives WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alternative not found'
      });
    }

    res.json({
      success: true,
      message: 'Alternative removed successfully'
    });
  } catch (error) {
    console.error('Error removing alternative:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove alternative'
    });
  }
};

/**
 * Reorder alternatives
 */
const reorderAlternatives = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // list_item_id
    const { alternative_ids } = req.body;

    if (!Array.isArray(alternative_ids) || alternative_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'alternative_ids array is required'
      });
    }

    await client.query('BEGIN');

    for (let i = 0; i < alternative_ids.length; i++) {
      await client.query(
        'UPDATE tool_number_alternatives SET priority = $1 WHERE id = $2 AND list_item_id = $3',
        [i, alternative_ids[i], id]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Alternatives reordered successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reordering alternatives:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reorder alternatives'
    });
  } finally {
    client.release();
  }
};

// ============================================================================
// MACHINE ASSIGNMENT
// ============================================================================

/**
 * Get lists assigned to a machine
 */
const getListsForMachine = async (req, res) => {
  try {
    const { machineId } = req.params;

    const result = await pool.query(`
      SELECT 
        mtnl.*,
        tnl.name as list_name,
        tnl.description as list_description,
        tnl.is_active as list_is_active,
        u.username as assigned_by_username,
        (SELECT COUNT(*) FROM tool_number_list_items WHERE list_id = tnl.id) as item_count
      FROM machine_tool_number_lists mtnl
      JOIN tool_number_lists tnl ON tnl.id = mtnl.list_id
      LEFT JOIN users u ON u.id = mtnl.assigned_by
      WHERE mtnl.machine_id = $1
      ORDER BY tnl.name ASC
    `, [machineId]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching machine lists:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch machine lists'
    });
  }
};

/**
 * Get machines for a list
 */
const getMachinesForList = async (req, res) => {
  try {
    const { id } = req.params; // list_id

    const result = await pool.query(`
      SELECT 
        mtnl.*,
        m.name as machine_name,
        m.manufacturer as machine_manufacturer,
        m.control_type,
        u.username as assigned_by_username
      FROM machine_tool_number_lists mtnl
      JOIN machines m ON m.id = mtnl.machine_id
      LEFT JOIN users u ON u.id = mtnl.assigned_by
      WHERE mtnl.list_id = $1
      ORDER BY m.name ASC
    `, [id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching list machines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch list machines'
    });
  }
};

/**
 * Assign list to machine
 */
const assignListToMachine = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { list_id, is_active = true } = req.body;
    const userId = req.user?.id;

    if (!list_id) {
      return res.status(400).json({
        success: false,
        error: 'list_id is required'
      });
    }

    const result = await pool.query(`
      INSERT INTO machine_tool_number_lists (machine_id, list_id, is_active, assigned_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [machineId, list_id, is_active, userId]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'List assigned to machine'
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'This list is already assigned to this machine'
      });
    }
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Invalid machine_id or list_id'
      });
    }
    console.error('Error assigning list to machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign list to machine'
    });
  }
};

/**
 * Toggle list active status for machine
 */
const toggleListForMachine = async (req, res) => {
  try {
    const { machineId, listId } = req.params;

    const result = await pool.query(`
      UPDATE machine_tool_number_lists
      SET is_active = NOT is_active
      WHERE machine_id = $1 AND list_id = $2
      RETURNING *
    `, [machineId, listId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: `List ${result.rows[0].is_active ? 'activated' : 'deactivated'} for machine`
    });
  } catch (error) {
    console.error('Error toggling list for machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle list'
    });
  }
};

/**
 * Unassign list from machine
 */
const unassignListFromMachine = async (req, res) => {
  try {
    const { machineId, listId } = req.params;

    const result = await pool.query(`
      DELETE FROM machine_tool_number_lists 
      WHERE machine_id = $1 AND list_id = $2
      RETURNING id
    `, [machineId, listId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found'
      });
    }

    res.json({
      success: true,
      message: 'List unassigned from machine'
    });
  } catch (error) {
    console.error('Error unassigning list from machine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unassign list'
    });
  }
};

// ============================================================================
// TOOL MAPPING (for NC program parsing)
// ============================================================================

/**
 * Find tool mapping for a T-Number on a specific machine
 */
const findToolMapping = async (req, res) => {
  try {
    const { machineId, toolNumber } = req.params;

    // Find in active lists for this machine
    const result = await pool.query(`
      SELECT 
        tnl.id as list_id,
        tnl.name as list_name,
        tnli.id as item_id,
        tnli.tool_number,
        tnli.description,
        tnli.preferred_tool_master_id,
        tm.article_number,
        tm.tool_name,
        tm.manufacturer,
        tm.manufacturer_part_number,
        tc.name as category_name
      FROM tool_number_lists tnl
      JOIN machine_tool_number_lists mtnl ON mtnl.list_id = tnl.id
      JOIN tool_number_list_items tnli ON tnli.list_id = tnl.id
      LEFT JOIN tool_master tm ON tm.id = tnli.preferred_tool_master_id
      LEFT JOIN tool_categories tc ON tc.id = tm.category_id
      WHERE mtnl.machine_id = $1 
        AND mtnl.is_active = true
        AND tnl.is_active = true
        AND tnli.tool_number = $2
      ORDER BY tnl.id ASC
      LIMIT 1
    `, [machineId, toolNumber]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `T-Number ${toolNumber} not found in active lists for this machine`
      });
    }

    const mapping = result.rows[0];

    // Get alternatives
    const alternatives = await pool.query(`
      SELECT 
        tna.*,
        tm.article_number,
        tm.tool_name,
        tm.manufacturer,
        tm.manufacturer_part_number
      FROM tool_number_alternatives tna
      JOIN tool_master tm ON tm.id = tna.tool_master_id
      WHERE tna.list_item_id = $1
      ORDER BY tna.priority ASC
    `, [mapping.item_id]);

    res.json({
      success: true,
      data: {
        ...mapping,
        alternatives: alternatives.rows
      }
    });
  } catch (error) {
    console.error('Error finding tool mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find tool mapping'
    });
  }
};

/**
 * Bulk lookup tool mappings for multiple T-Numbers
 */
const findToolMappingsBulk = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { tool_numbers } = req.body;

    if (!Array.isArray(tool_numbers) || tool_numbers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'tool_numbers array is required'
      });
    }

    const result = await pool.query(`
      SELECT 
        tnli.tool_number,
        tnli.description,
        tnli.preferred_tool_master_id,
        tm.article_number,
        tm.tool_name,
        tm.manufacturer,
        tnl.name as list_name
      FROM tool_number_lists tnl
      JOIN machine_tool_number_lists mtnl ON mtnl.list_id = tnl.id
      JOIN tool_number_list_items tnli ON tnli.list_id = tnl.id
      LEFT JOIN tool_master tm ON tm.id = tnli.preferred_tool_master_id
      WHERE mtnl.machine_id = $1 
        AND mtnl.is_active = true
        AND tnl.is_active = true
        AND tnli.tool_number = ANY($2)
    `, [machineId, tool_numbers]);

    // Create map and track found/missing
    const found = {};
    result.rows.forEach(row => {
      found[row.tool_number] = row;
    });

    const missing = tool_numbers.filter(tn => !found[tn]);

    res.json({
      success: true,
      data: {
        mappings: found,
        missing: missing,
        found_count: Object.keys(found).length,
        missing_count: missing.length
      }
    });
  } catch (error) {
    console.error('Error finding tool mappings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find tool mappings'
    });
  }
};

module.exports = {
  // Lists
  getAllLists,
  getListById,
  createList,
  updateList,
  deleteList,
  duplicateList,
  // Items
  getListItems,
  createListItem,
  updateListItem,
  deleteListItem,
  reorderListItems,
  // Alternatives
  getAlternatives,
  addAlternative,
  updateAlternative,
  removeAlternative,
  reorderAlternatives,
  // Machine Assignment
  getListsForMachine,
  getMachinesForList,
  assignListToMachine,
  toggleListForMachine,
  unassignListFromMachine,
  // Tool Mapping
  findToolMapping,
  findToolMappingsBulk
};
