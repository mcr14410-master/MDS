const express = require('express');
const router = express.Router();
const partsController = require('../controllers/partsController');
const partDocumentsController = require('../controllers/partDocumentsController');
const partDocumentsRoutes = require('./partDocumentsRoutes');
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
 * POST /api/parts/generate-number - Generate next part number for customer
 * Permission: part.create
 */
router.post('/generate-number',
  requirePermission('part.create'),
  partsController.generatePartNumber
);

/**
 * GET /api/parts/:id/cad-file/:filename - Serve primary CAD file for 3D viewer
 * Der Dateiname in der URL ermöglicht dem 3D-Viewer das Format zu erkennen
 * Permission: part.read
 */
router.get('/:id/cad-file/:filename',
  requirePermission('part.read'),
  (req, res, next) => {
    req.params.partId = req.params.id;
    next();
  },
  partDocumentsController.serveCadFile
);

/**
 * GET /api/parts/:id/cad-file - Serve primary CAD file (ohne Dateinamen)
 * Permission: part.read
 */
router.get('/:id/cad-file',
  requirePermission('part.read'),
  (req, res, next) => {
    req.params.partId = req.params.id;
    next();
  },
  partDocumentsController.serveCadFile
);

/**
 * GET /api/parts/:id/history - Get part change history from audit log
 * Permission: part.read
 */
router.get('/:id/history',
  requirePermission('part.read'),
  partsController.getPartHistory
);

/**
 * Part Documents sub-routes
 * /api/parts/:partId/documents/*
 */
router.use('/:partId/documents', partDocumentsRoutes);

/**
 * GET /api/parts/:id - Get single part by ID
 * Permission: part.read
 * WICHTIG: Diese generische Route muss NACH den spezifischeren Routes kommen!
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
