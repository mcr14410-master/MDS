/**
 * Tool Compatible Inserts Routes
 *
 * Routes for managing compatible insert relationships
 */

const express = require('express');
const router = express.Router();
const toolCompatibleInsertsController = require('../controllers/toolCompatibleInsertsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// ============================================================================
// TOOL-SPECIFIC COMPATIBLE INSERTS ROUTES
// ============================================================================

/**
 * Get all compatible inserts for a tool
 * GET /api/tools/:toolId/compatible-inserts
 */
router.get(
  '/tools/:toolId/compatible-inserts',
  authenticateToken,
  requirePermission('tools.view'),
  toolCompatibleInsertsController.getCompatibleInsertsByTool
);

/**
 * Add compatible insert to tool
 * POST /api/tools/:toolId/compatible-inserts
 * Body: { insert_tool_master_id, is_preferred?, quantity_per_tool?, notes? }
 */
router.post(
  '/tools/:toolId/compatible-inserts',
  authenticateToken,
  requirePermission('tools.edit'),
  toolCompatibleInsertsController.addCompatibleInsert
);

/**
 * Get available inserts (not yet linked to this tool)
 * GET /api/tools/:toolId/available-inserts
 * Query: { search?, is_active? }
 */
router.get(
  '/tools/:toolId/available-inserts',
  authenticateToken,
  requirePermission('tools.view'),
  toolCompatibleInsertsController.getAvailableInserts
);

// ============================================================================
// INSERT-SPECIFIC ROUTES
// ============================================================================

/**
 * Get all tools that use a specific insert
 * GET /api/inserts/:insertId/compatible-tools
 */
router.get(
  '/inserts/:insertId/compatible-tools',
  authenticateToken,
  requirePermission('tools.view'),
  toolCompatibleInsertsController.getToolsByInsert
);

// ============================================================================
// COMPATIBILITY RECORD ROUTES
// ============================================================================

/**
 * Get single compatibility record
 * GET /api/tool-compatible-inserts/:id
 */
router.get(
  '/tool-compatible-inserts/:id',
  authenticateToken,
  requirePermission('tools.view'),
  toolCompatibleInsertsController.getCompatibleInsertById
);

/**
 * Update compatible insert relationship
 * PUT /api/tool-compatible-inserts/:id
 * Body: { is_preferred?, quantity_per_tool?, notes? }
 */
router.put(
  '/tool-compatible-inserts/:id',
  authenticateToken,
  requirePermission('tools.edit'),
  toolCompatibleInsertsController.updateCompatibleInsert
);

/**
 * Delete compatible insert relationship (soft delete)
 * DELETE /api/tool-compatible-inserts/:id
 */
router.delete(
  '/tool-compatible-inserts/:id',
  authenticateToken,
  requirePermission('tools.delete'),
  toolCompatibleInsertsController.deleteCompatibleInsert
);

module.exports = router;
