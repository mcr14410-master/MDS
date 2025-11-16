const express = require('express');
const router = express.Router();
const stockMovementsController = require('../controllers/stockMovementsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

/**
 * @route   GET /api/stock-movements/item/:id
 * @desc    Get movements by storage item
 * @query   limit, offset
 * @access  Private (requires permission: storage.view)
 */
router.get('/item/:id', requirePermission('storage.view'), stockMovementsController.getMovementsByItem);

/**
 * @route   GET /api/stock-movements/stats
 * @desc    Get movement statistics
 * @query   date_from, date_to, tool_master_id
 * @access  Private (requires permission: storage.view)
 */
router.get('/stats', requirePermission('storage.view'), stockMovementsController.getMovementStats);

/**
 * @route   GET /api/stock-movements/:id
 * @desc    Get single movement by ID
 * @access  Private (requires permission: storage.view)
 */
router.get('/:id', requirePermission('storage.view'), stockMovementsController.getMovementById);

/**
 * @route   GET /api/stock-movements
 * @desc    Get all movements with optional filters
 * @query   movement_type, condition, tool_master_id, performed_by, date_from, date_to, limit, offset
 * @access  Private (requires permission: storage.view)
 */
router.get('/', requirePermission('storage.view'), stockMovementsController.getAllMovements);

module.exports = router;
