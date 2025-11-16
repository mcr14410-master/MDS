const express = require('express');
const router = express.Router();
const toolCategoriesController = require('../controllers/toolCategoriesController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// TOOL CATEGORIES
// ============================================================================

/**
 * @route   GET /api/tool-categories
 * @desc    Get all tool categories with optional filtering
 * @query   is_active, search
 * @access  Private (requires permission: tools.view)
 */
router.get('/categories', requirePermission('tools.view'), toolCategoriesController.getAllCategories);

/**
 * @route   GET /api/tool-categories/:id
 * @desc    Get single tool category by ID
 * @access  Private (requires permission: tools.view)
 */
router.get('/categories/:id', requirePermission('tools.view'), toolCategoriesController.getCategoryById);

/**
 * @route   GET /api/tool-categories/:id/subcategories
 * @desc    Get all subcategories for a specific category
 * @access  Private (requires permission: tools.view)
 */
router.get('/categories/:id/subcategories', requirePermission('tools.view'), toolCategoriesController.getSubcategoriesByCategory);

/**
 * @route   POST /api/tool-categories
 * @desc    Create new tool category
 * @access  Private (requires permission: tools.categories.manage)
 */
router.post('/categories', requirePermission('tools.categories.manage'), toolCategoriesController.createCategory);

/**
 * @route   PUT /api/tool-categories/:id
 * @desc    Update tool category
 * @access  Private (requires permission: tools.categories.manage)
 */
router.put('/categories/:id', requirePermission('tools.categories.manage'), toolCategoriesController.updateCategory);

/**
 * @route   DELETE /api/tool-categories/:id
 * @desc    Delete tool category
 * @access  Private (requires permission: tools.categories.manage)
 */
router.delete('/categories/:id', requirePermission('tools.categories.manage'), toolCategoriesController.deleteCategory);

// ============================================================================
// TOOL SUBCATEGORIES
// ============================================================================

/**
 * @route   GET /api/tool-subcategories
 * @desc    Get all tool subcategories with optional filtering
 * @query   category_id, is_active, search
 * @access  Private (requires permission: tools.view)
 */
router.get('/subcategories', requirePermission('tools.view'), toolCategoriesController.getAllSubcategories);

/**
 * @route   GET /api/tool-subcategories/:id
 * @desc    Get single tool subcategory by ID
 * @access  Private (requires permission: tools.view)
 */
router.get('/subcategories/:id', requirePermission('tools.view'), toolCategoriesController.getSubcategoryById);

/**
 * @route   POST /api/tool-subcategories
 * @desc    Create new tool subcategory
 * @access  Private (requires permission: tools.categories.manage)
 */
router.post('/subcategories', requirePermission('tools.categories.manage'), toolCategoriesController.createSubcategory);

/**
 * @route   PUT /api/tool-subcategories/:id
 * @desc    Update tool subcategory
 * @access  Private (requires permission: tools.categories.manage)
 */
router.put('/subcategories/:id', requirePermission('tools.categories.manage'), toolCategoriesController.updateSubcategory);

/**
 * @route   DELETE /api/tool-subcategories/:id
 * @desc    Delete tool subcategory
 * @access  Private (requires permission: tools.categories.manage)
 */
router.delete('/subcategories/:id', requirePermission('tools.categories.manage'), toolCategoriesController.deleteSubcategory);

module.exports = router;
