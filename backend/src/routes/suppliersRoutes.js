/**
 * Suppliers Routes
 * 
 * Routes for managing supplier master data
 */

const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliersController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/suppliers
 * @desc    Get all suppliers with optional filters
 * @access  Private
 * @query   {boolean} is_active - Filter by active status
 * @query   {boolean} is_preferred - Filter by preferred status  
 * @query   {string} search - Search in name, code, city
 * @query   {string} sort_by - Sort field (name, supplier_code, city, rating, created_at)
 * @query   {string} sort_order - Sort order (asc, desc)
 */
router.get('/', suppliersController.getAllSuppliers);

/**
 * @route   GET /api/suppliers/:id
 * @desc    Get supplier by ID
 * @access  Private
 */
router.get('/:id', suppliersController.getSupplierById);

/**
 * @route   POST /api/suppliers
 * @desc    Create new supplier
 * @access  Private
 */
router.post('/', suppliersController.createSupplier);

/**
 * @route   PUT /api/suppliers/:id
 * @desc    Update supplier
 * @access  Private
 */
router.put('/:id', suppliersController.updateSupplier);

/**
 * @route   DELETE /api/suppliers/:id
 * @desc    Delete supplier (soft delete by default)
 * @access  Private
 * @query   {boolean} hard_delete - Permanently delete if true
 */
router.delete('/:id', suppliersController.deleteSupplier);

/**
 * @route   GET /api/suppliers/:id/items
 * @desc    Get all items from this supplier
 * @access  Private
 */
router.get('/:id/items', suppliersController.getSupplierItems);

module.exports = router;
