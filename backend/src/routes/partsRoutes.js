const express = require('express');
const router = express.Router();
const partsController = require('../controllers/partsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/parts/stats - Get part statistics
 * Permission: part.read
 */
router.get('/stats', 
  requirePermission('part.read'),
  partsController.getPartStats
);

/**
 * GET /api/parts - Get all parts (with filtering)
 * Permission: part.read
 * Query params: ?customer_id=1&status=active&search=text
 */
router.get('/', 
  requirePermission('part.read'),
  partsController.getAllParts
);

/**
 * GET /api/parts/:id - Get single part by ID
 * Permission: part.read
 */
router.get('/:id', 
  requirePermission('part.read'),
  partsController.getPartById
);

/**
 * POST /api/parts - Create new part
 * Permission: part.create
 */
router.post('/', 
  requirePermission('part.create'),
  partsController.createPart
);

/**
 * PUT /api/parts/:id - Update existing part
 * Permission: part.update
 */
router.put('/:id', 
  requirePermission('part.update'),
  partsController.updatePart
);

/**
 * DELETE /api/parts/:id - Delete part (soft delete)
 * Permission: part.delete
 */
router.delete('/:id', 
  requirePermission('part.delete'),
  partsController.deletePart
);

module.exports = router;
