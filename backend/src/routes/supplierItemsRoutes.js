/**
 * Supplier Items Routes
 * 
 * Routes for managing relationships between storage items and suppliers
 */

const express = require('express');
const router = express.Router();
const supplierItemsController = require('../controllers/supplierItemsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   POST /api/supplier-items
 * @desc    Link a supplier to a storage item
 * @access  Private
 */
router.post('/', supplierItemsController.createSupplierItem);

/**
 * @route   PUT /api/supplier-items/:id
 * @desc    Update supplier item relationship
 * @access  Private
 */
router.put('/:id', supplierItemsController.updateSupplierItem);

/**
 * @route   DELETE /api/supplier-items/:id
 * @desc    Remove supplier from item
 * @access  Private
 */
router.delete('/:id', supplierItemsController.deleteSupplierItem);

/**
 * @route   PUT /api/supplier-items/:id/preferred
 * @desc    Set this supplier as preferred for the item
 * @access  Private
 */
router.put('/:id/preferred', supplierItemsController.setPreferredSupplier);

module.exports = router;
