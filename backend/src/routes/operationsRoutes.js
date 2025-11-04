const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/operations - Get all operations (with optional filtering)
 * Permission: part.read
 * Query params: ?part_id=1
 */
router.get('/', 
  requirePermission('part.read'),
  operationsController.getAllOperations
);

/**
 * GET /api/operations/:id - Get single operation by ID
 * Permission: part.read
 */
router.get('/:id', 
  requirePermission('part.read'),
  operationsController.getOperationById
);

/**
 * POST /api/operations - Create new operation
 * Permission: part.create
 */
router.post('/', 
  requirePermission('part.create'),
  operationsController.createOperation
);

/**
 * PUT /api/operations/:id - Update existing operation
 * Permission: part.update
 */
router.put('/:id', 
  requirePermission('part.update'),
  operationsController.updateOperation
);

/**
 * DELETE /api/operations/:id - Delete operation
 * Permission: part.delete
 */
router.delete('/:id', 
  requirePermission('part.delete'),
  operationsController.deleteOperation
);

module.exports = router;
