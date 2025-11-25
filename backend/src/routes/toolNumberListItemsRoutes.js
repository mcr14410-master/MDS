/**
 * Tool Number List Items Routes
 * 
 * Endpoints for managing T-Number entries within lists
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/toolNumberListsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// ITEM CRUD
// ============================================================================

// PUT /api/tool-number-list-items/:id - Update item
router.put('/:id', controller.updateListItem);

// DELETE /api/tool-number-list-items/:id - Delete item
router.delete('/:id', controller.deleteListItem);

// ============================================================================
// ALTERNATIVES
// ============================================================================

// GET /api/tool-number-list-items/:id/alternatives - Get alternatives
router.get('/:id/alternatives', controller.getAlternatives);

// POST /api/tool-number-list-items/:id/alternatives - Add alternative
router.post('/:id/alternatives', controller.addAlternative);

// PUT /api/tool-number-list-items/:id/alternatives/reorder - Reorder alternatives
router.put('/:id/alternatives/reorder', controller.reorderAlternatives);

module.exports = router;
