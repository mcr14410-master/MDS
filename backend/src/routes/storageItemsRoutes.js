const express = require('express');
const router = express.Router();
const storageItemsController = require('../controllers/storageItemsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// MEASURING EQUIPMENT STORAGE (must be before /:id routes!)
// ============================================================================

/**
 * @route   POST /api/storage/items/measuring-equipment
 * @desc    Assign measuring equipment to storage compartment
 * @body    measuring_equipment_id, compartment_id, notes
 * @access  Private (requires permission: storage.create)
 */
router.post('/measuring-equipment', requirePermission('storage.create'), storageItemsController.assignMeasuringEquipmentToStorage);

/**
 * @route   GET /api/storage/items/measuring-equipment/:equipmentId/location
 * @desc    Get storage location for a measuring equipment
 * @access  Private (requires permission: storage.view)
 */
router.get('/measuring-equipment/:equipmentId/location', requirePermission('storage.view'), storageItemsController.getMeasuringEquipmentStorageLocation);

/**
 * @route   PUT /api/storage/items/measuring-equipment/:equipmentId/move
 * @desc    Move measuring equipment to different compartment
 * @body    compartment_id
 * @access  Private (requires permission: storage.edit)
 */
router.put('/measuring-equipment/:equipmentId/move', requirePermission('storage.edit'), storageItemsController.moveMeasuringEquipment);

/**
 * @route   DELETE /api/storage/items/measuring-equipment/:equipmentId
 * @desc    Remove measuring equipment from storage
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/measuring-equipment/:equipmentId', requirePermission('storage.delete'), storageItemsController.removeMeasuringEquipmentFromStorage);

// ============================================================================
// CLAMPING DEVICES STORAGE (must be before /:id routes!)
// ============================================================================

/**
 * @route   POST /api/storage/items/clamping-device
 * @desc    Add clamping device to storage compartment (quantity-based)
 * @body    clamping_device_id, compartment_id, quantity_new, quantity_used, notes
 * @access  Private (requires permission: storage.create)
 */
router.post('/clamping-device', requirePermission('storage.create'), storageItemsController.addClampingDeviceToStorage);

/**
 * @route   GET /api/storage/items/clamping-device/:deviceId/locations
 * @desc    Get all storage locations for a clamping device
 * @access  Private (requires permission: storage.view)
 */
router.get('/clamping-device/:deviceId/locations', requirePermission('storage.view'), storageItemsController.getClampingDeviceStorageLocations);

/**
 * @route   DELETE /api/storage/items/clamping-device/:storageItemId
 * @desc    Remove clamping device from storage location
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/clamping-device/:storageItemId', requirePermission('storage.delete'), storageItemsController.removeClampingDeviceFromStorage);

// ============================================================================
// FIXTURES STORAGE (must be before /:id routes!)
// ============================================================================

/**
 * @route   POST /api/storage/items/fixture
 * @desc    Add fixture to storage compartment (quantity-based)
 * @body    fixture_id, compartment_id, quantity_new, quantity_used, notes
 * @access  Private (requires permission: storage.create)
 */
router.post('/fixture', requirePermission('storage.create'), storageItemsController.addFixtureToStorage);

/**
 * @route   GET /api/storage/items/fixture/:fixtureId/locations
 * @desc    Get all storage locations for a fixture
 * @access  Private (requires permission: storage.view)
 */
router.get('/fixture/:fixtureId/locations', requirePermission('storage.view'), storageItemsController.getFixtureStorageLocations);

/**
 * @route   DELETE /api/storage/items/fixture/:storageItemId
 * @desc    Remove fixture from storage location
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/fixture/:storageItemId', requirePermission('storage.delete'), storageItemsController.removeFixtureFromStorage);

// ============================================================================
// COMPARTMENT ITEMS (must be before /:id routes!)
// ============================================================================

/**
 * @route   GET /api/storage/items/compartment/:compartmentId
 * @desc    Get all items in a compartment (tools + measuring equipment)
 * @query   item_type (optional filter)
 * @access  Private (requires permission: storage.view)
 */
router.get('/compartment/:compartmentId', requirePermission('storage.view'), storageItemsController.getCompartmentItems);

// ============================================================================
// STORAGE ITEMS - CRUD
// ============================================================================

/**
 * @route   GET /api/storage/items
 * @desc    Get all storage items with stock info
 * @query   tool_master_id, location_id, compartment_id, is_low_stock, item_type, measuring_equipment_id
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
