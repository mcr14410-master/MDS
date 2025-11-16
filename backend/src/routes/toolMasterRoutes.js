const express = require('express');
const router = express.Router();
const toolMasterController = require('../controllers/toolMasterController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// TOOL MASTER ROUTES
// ============================================================================

/**
 * @route   GET /api/tool-master
 * @desc    Get all tools with optional filters, search and pagination
 * @query   category_id, subcategory_id, item_type, tool_category, is_active, manufacturer, search, sort_by, sort_order, limit, offset
 * @access  Private (requires permission: tools.view)
 */
router.get('/', requirePermission('tools.view'), toolMasterController.getAllTools);

/**
 * @route   GET /api/tool-master/category/:categoryId
 * @desc    Get all tools for a specific category
 * @access  Private (requires permission: tools.view)
 */
router.get('/category/:categoryId', requirePermission('tools.view'), toolMasterController.getToolsByCategory);

/**
 * @route   GET /api/tool-master/alerts/low-stock
 * @desc    Get all tools with low stock (weighted calculation)
 * @query   sort_by, sort_order, limit, offset
 * @access  Private (requires permission: tools.view)
 */
router.get('/alerts/low-stock', requirePermission('tools.view'), toolMasterController.getToolsLowStock);

/**
 * @route   GET /api/tool-master/:id
 * @desc    Get single tool by ID
 * @access  Private (requires permission: tools.view)
 */
router.get('/:id', requirePermission('tools.view'), toolMasterController.getToolById);

/**
 * @route   POST /api/tool-master
 * @desc    Create new tool
 * @access  Private (requires permission: tools.create)
 */
router.post('/', requirePermission('tools.create'), toolMasterController.createTool);

/**
 * @route   PUT /api/tool-master/:id
 * @desc    Update tool
 * @access  Private (requires permission: tools.edit)
 */
router.put('/:id', requirePermission('tools.edit'), toolMasterController.updateTool);

/**
 * @route   DELETE /api/tool-master/:id
 * @desc    Delete tool (soft delete)
 * @access  Private (requires permission: tools.delete)
 */
router.delete('/:id', requirePermission('tools.delete'), toolMasterController.deleteTool);

module.exports = router;
