/**
 * Tool Number Lists Routes
 * 
 * Endpoints for managing T-Number lists and mappings
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/toolNumberListsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// LISTS CRUD
// ============================================================================

// GET /api/tool-number-lists - Get all lists
router.get('/', controller.getAllLists);

// GET /api/tool-number-lists/:id - Get single list with items
router.get('/:id', controller.getListById);

// POST /api/tool-number-lists - Create new list
router.post('/', controller.createList);

// PUT /api/tool-number-lists/:id - Update list
router.put('/:id', controller.updateList);

// DELETE /api/tool-number-lists/:id - Delete list
router.delete('/:id', controller.deleteList);

// POST /api/tool-number-lists/:id/duplicate - Duplicate list
router.post('/:id/duplicate', controller.duplicateList);

// ============================================================================
// LIST ITEMS
// ============================================================================

// GET /api/tool-number-lists/:id/items - Get items for list
router.get('/:id/items', controller.getListItems);

// POST /api/tool-number-lists/:id/items - Add item to list
router.post('/:id/items', controller.createListItem);

// PUT /api/tool-number-lists/:id/items/reorder - Reorder items
router.put('/:id/items/reorder', controller.reorderListItems);

// ============================================================================
// MACHINES FOR LIST
// ============================================================================

// GET /api/tool-number-lists/:id/machines - Get machines using this list
router.get('/:id/machines', controller.getMachinesForList);

module.exports = router;
