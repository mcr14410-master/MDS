const express = require('express');
const router = express.Router();
const storageController = require('../controllers/storageController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// STORAGE LOCATIONS
// ============================================================================

/**
 * @route   GET /api/storage/locations
 * @desc    Get all storage locations with optional filtering
 * @query   location_type, item_category, is_active, search, building, floor, room
 * @access  Private (requires permission: storage.view)
 */
router.get('/locations', requirePermission('storage.view'), storageController.getAllLocations);

/**
 * @route   GET /api/storage/locations/:id
 * @desc    Get single storage location by ID
 * @access  Private (requires permission: storage.view)
 */
router.get('/locations/:id', requirePermission('storage.view'), storageController.getLocationById);

/**
 * @route   GET /api/storage/locations/:id/compartments
 * @desc    Get all compartments for a specific location
 * @access  Private (requires permission: storage.view)
 */
router.get('/locations/:id/compartments', requirePermission('storage.view'), storageController.getCompartmentsByLocation);

/**
 * @route   POST /api/storage/locations
 * @desc    Create new storage location
 * @access  Private (requires permission: storage.create)
 */
router.post('/locations', requirePermission('storage.create'), storageController.createLocation);

/**
 * @route   PUT /api/storage/locations/:id
 * @desc    Update storage location
 * @access  Private (requires permission: storage.edit)
 */
router.put('/locations/:id', requirePermission('storage.edit'), storageController.updateLocation);

/**
 * @route   DELETE /api/storage/locations/:id
 * @desc    Delete storage location
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/locations/:id', requirePermission('storage.delete'), storageController.deleteLocation);

// ============================================================================
// STORAGE COMPARTMENTS
// ============================================================================

/**
 * @route   GET /api/storage/compartments
 * @desc    Get all storage compartments with optional filtering
 * @query   location_id, compartment_type, is_active, search
 * @access  Private (requires permission: storage.view)
 */
router.get('/compartments', requirePermission('storage.view'), storageController.getAllCompartments);

/**
 * @route   GET /api/storage/compartments/:id
 * @desc    Get single storage compartment by ID
 * @access  Private (requires permission: storage.view)
 */
router.get('/compartments/:id', requirePermission('storage.view'), storageController.getCompartmentById);

/**
 * @route   POST /api/storage/compartments
 * @desc    Create new storage compartment
 * @access  Private (requires permission: storage.create)
 */
router.post('/compartments', requirePermission('storage.create'), storageController.createCompartment);

/**
 * @route   PUT /api/storage/compartments/:id
 * @desc    Update storage compartment
 * @access  Private (requires permission: storage.edit)
 */
router.put('/compartments/:id', requirePermission('storage.edit'), storageController.updateCompartment);

/**
 * @route   DELETE /api/storage/compartments/:id
 * @desc    Delete storage compartment
 * @access  Private (requires permission: storage.delete)
 */
router.delete('/compartments/:id', requirePermission('storage.delete'), storageController.deleteCompartment);

module.exports = router;
