const express = require('express');
const router = express.Router();
const storageItemsController = require('../controllers/storageItemsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// STORAGE ITEMS - CRUD
// ============================================================================

/**
 * @route   GET /api/storage/items
 * @desc    Get all storage items with stock info
 * @query   tool_master_id, location_id, compartment_id, is_low_stock
 * @access  Private (requires permission: storage.view)
 */
router.get('/', requirePermission('storage.view'), storageItemsController.getAllStorageItems);

/**
 * @route   GET /api/storage/items/:id
 * @desc    Get single storage item by ID
 * @access  Private (requires permission: storage.view)
 */
router.get('/:id', requirePermission('storage.view'), storageItemsController.getStorageItemById);

/**
 * @route   POST /api/storage/items
 * @desc    Create new storage item
 * @access  Private (requires permission: storage.create)
 */
router.post('/', requirePermission('storage.create'), storageItemsController.createStorageItem);

/**
 * @route   PUT /api/storage/items/:id
 * @desc    Update storage item
 * @access  Private (requires permission: storage.edit)
 */
router.put('/:id', requirePermission('storage.edit'), storageItemsController.updateStorageItem);

/**
 * @route   DELETE /api/storage/items/:id
 * @desc    Delete storage item
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/:id', requirePermission('storage.delete'), storageItemsController.deleteStorageItem);

// ============================================================================
// STOCK OPERATIONS
// ============================================================================

/**
 * @route   POST /api/storage/items/:id/issue
 * @desc    Issue stock (Entnahme)
 * @body    condition, quantity, reason, reference_type, reference_id, notes
 * @access  Private (requires permission: stock.issue)
 */
router.post('/:id/issue', requirePermission('stock.issue'), storageItemsController.issueStock);

/**
 * @route   POST /api/storage/items/:id/receive
 * @desc    Receive stock (Einlagerung)
 * @body    condition, quantity, reason, reference_type, reference_id, notes
 * @access  Private (requires permission: stock.receive)
 */
router.post('/:id/receive', requirePermission('stock.receive'), storageItemsController.receiveStock);

/**
 * @route   POST /api/storage/items/:id/transfer
 * @desc    Transfer stock (Umlagerung)
 * @body    condition, quantity, to_compartment_id, reason, notes
 * @access  Private (requires permission: stock.transfer)
 */
router.post('/:id/transfer', requirePermission('stock.transfer'), storageItemsController.transferStock);

/**
 * @route   POST /api/storage/items/:id/adjust
 * @desc    Adjust stock (Korrektur/Inventur)
 * @body    condition, new_quantity, reason, notes
 * @access  Private (requires permission: stock.adjust)
 */
router.post('/:id/adjust', requirePermission('stock.adjust'), storageItemsController.adjustStock);

/**
 * @route   POST /api/storage/items/:id/scrap
 * @desc    Scrap stock (Verschrottung)
 * @body    condition, quantity, reason, notes
 * @access  Private (requires permission: stock.scrap)
 */
router.post('/:id/scrap', requirePermission('stock.scrap'), storageItemsController.scrapStock);

// ============================================================================
// SUPPLIER RELATIONSHIPS
// ============================================================================

/**
 * @route   GET /api/storage/items/:id/suppliers
 * @desc    Get all suppliers for this storage item
 * @access  Private (requires permission: storage.view)
 */
const supplierItemsController = require('../controllers/supplierItemsController');
router.get('/:id/suppliers', requirePermission('storage.view'), supplierItemsController.getItemSuppliers);

module.exports = router;
