/**
 * Tool Lists Controller
 * 
 * Manages tool lists for NC programs.
 * Each program has one tool list with multiple tool items.
 * 
 * Features:
 * - Get tool list for a program
 * - Create/update tool list items
 * - Delete tool list items
 * - Reorder items
 */

const db = require('../config/db');

// ============================================================================
// GET Tool List for Program
// ============================================================================
const getToolListByProgram = async (req, res) => {
  try {
    const { programId } = req.params;

    // Check if program exists
    const programResult = await db.query(
      'SELECT id FROM programs WHERE id = $1',
      [programId]
    );

    if (programResult.rows.length === 0) {
      return res.status(404).json({ error: 'Program not found' });
    }

    // Get or create tool list
    let toolList = await db.query(
      'SELECT * FROM tool_lists WHERE program_id = $1',
      [programId]
    );

    if (toolList.rows.length === 0) {
      // Create empty tool list if it doesn't exist
      const newList = await db.query(
        'INSERT INTO tool_lists (program_id, created_by) VALUES ($1, $2) RETURNING *',
        [programId, req.user?.id || null]
      );
      toolList = newList;
    }

    const toolListId = toolList.rows[0].id;

    // Get tool list items
    const items = await db.query(
      `SELECT * FROM tool_list_items 
       WHERE tool_list_id = $1 
       ORDER BY sequence ASC`,
      [toolListId]
    );

    res.json({
      data: {
        id: toolListId,
        program_id: parseInt(programId),
        items: items.rows
      }
    });
  } catch (error) {
    console.error('Error fetching tool list:', error);
    res.status(500).json({ error: 'Failed to fetch tool list' });
  }
};

// ============================================================================
// CREATE Tool List Item
// ============================================================================
const createToolListItem = async (req, res) => {
  try {
    const { programId } = req.params;
    const {
      tool_number,
      description,
      tool_type,
      manufacturer,
      order_number,
      tool_holder,
      tool_life_info,
      notes,
      sequence
    } = req.body;

    // Validation
    if (!tool_number) {
      return res.status(400).json({ error: 'Tool number is required' });
    }

    // Get or create tool list
    let toolList = await db.query(
      'SELECT id FROM tool_lists WHERE program_id = $1',
      [programId]
    );

    let toolListId;
    if (toolList.rows.length === 0) {
      const newList = await db.query(
        'INSERT INTO tool_lists (program_id, created_by) VALUES ($1, $2) RETURNING id',
        [programId, req.user?.id || null]
      );
      toolListId = newList.rows[0].id;
    } else {
      toolListId = toolList.rows[0].id;
    }

    // Auto-generate sequence if not provided
    let itemSequence = sequence;
    if (!itemSequence) {
      const maxSeq = await db.query(
        'SELECT COALESCE(MAX(sequence), 0) + 10 as next_seq FROM tool_list_items WHERE tool_list_id = $1',
        [toolListId]
      );
      itemSequence = maxSeq.rows[0].next_seq;
    }

    // Insert tool item
    const result = await db.query(
      `INSERT INTO tool_list_items 
       (tool_list_id, tool_number, description, tool_type, manufacturer, 
        order_number, tool_holder, tool_life_info, notes, sequence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        toolListId,
        tool_number,
        description || null,
        tool_type || null,
        manufacturer || null,
        order_number || null,
        tool_holder || null,
        tool_life_info || null,
        notes || null,
        itemSequence
      ]
    );

    res.status(201).json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error creating tool list item:', error);
    res.status(500).json({ error: 'Failed to create tool list item' });
  }
};

// ============================================================================
// UPDATE Tool List Item
// ============================================================================
const updateToolListItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const {
      tool_number,
      description,
      tool_type,
      manufacturer,
      order_number,
      tool_holder,
      tool_life_info,
      notes,
      sequence
    } = req.body;

    // Check if item exists
    const existing = await db.query(
      'SELECT id FROM tool_list_items WHERE id = $1',
      [itemId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Tool list item not found' });
    }

    // Update item
    const result = await db.query(
      `UPDATE tool_list_items 
       SET tool_number = COALESCE($1, tool_number),
           description = COALESCE($2, description),
           tool_type = COALESCE($3, tool_type),
           manufacturer = COALESCE($4, manufacturer),
           order_number = COALESCE($5, order_number),
           tool_holder = COALESCE($6, tool_holder),
           tool_life_info = COALESCE($7, tool_life_info),
           notes = COALESCE($8, notes),
           sequence = COALESCE($9, sequence),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        tool_number,
        description,
        tool_type,
        manufacturer,
        order_number,
        tool_holder,
        tool_life_info,
        notes,
        sequence,
        itemId
      ]
    );

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating tool list item:', error);
    res.status(500).json({ error: 'Failed to update tool list item' });
  }
};

// ============================================================================
// DELETE Tool List Item
// ============================================================================
const deleteToolListItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await db.query(
      'DELETE FROM tool_list_items WHERE id = $1 RETURNING *',
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tool list item not found' });
    }

    res.json({ message: 'Tool list item deleted successfully' });
  } catch (error) {
    console.error('Error deleting tool list item:', error);
    res.status(500).json({ error: 'Failed to delete tool list item' });
  }
};

// ============================================================================
// REORDER Tool List Items
// ============================================================================
const reorderToolListItems = async (req, res) => {
  try {
    const { programId } = req.params;
    const { items } = req.body; // Array of { id, sequence }

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    // Get tool list
    const toolList = await db.query(
      'SELECT id FROM tool_lists WHERE program_id = $1',
      [programId]
    );

    if (toolList.rows.length === 0) {
      return res.status(404).json({ error: 'Tool list not found' });
    }

    // Update sequences in transaction
    await db.query('BEGIN');

    for (const item of items) {
      await db.query(
        'UPDATE tool_list_items SET sequence = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [item.sequence, item.id]
      );
    }

    await db.query('COMMIT');

    res.json({ message: 'Tool list items reordered successfully' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error reordering tool list items:', error);
    res.status(500).json({ error: 'Failed to reorder tool list items' });
  }
};

module.exports = {
  getToolListByProgram,
  createToolListItem,
  updateToolListItem,
  deleteToolListItem,
  reorderToolListItems
};
