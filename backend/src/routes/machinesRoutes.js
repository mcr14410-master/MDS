const express = require('express');
const router = express.Router();
const machinesController = require('../controllers/machinesController');
const toolNumberListsController = require('../controllers/toolNumberListsController');
const machineDocumentsController = require('../controllers/machineDocumentsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/machines
 * @desc    Get all machines with optional filtering
 * @query   machine_type, control_type, is_active, search
 * @access  Private
 */
router.get('/', machinesController.getAllMachines);

/**
 * @route   GET /api/machines/:id
 * @desc    Get single machine by ID
 * @access  Private
 */
router.get('/:id', machinesController.getMachineById);

/**
 * @route   GET /api/machines/:id/stats
 * @desc    Get machine statistics
 * @access  Private
 */
router.get('/:id/stats', machinesController.getMachineStats);

/**
 * @route   GET /api/machines/:id/operations
 * @desc    Get all operations for a machine
 * @access  Private
 */
router.get('/:id/operations', machinesController.getMachineOperations);

/**
 * @route   POST /api/machines
 * @desc    Create new machine
 * @access  Private (requires permission: machines.create)
 */
router.post('/', machinesController.createMachine);

/**
 * @route   PUT /api/machines/:id
 * @desc    Update machine
 * @access  Private (requires permission: machines.update)
 */
router.put('/:id', machinesController.updateMachine);

/**
 * @route   DELETE /api/machines/:id
 * @desc    Delete/deactivate machine
 * @query   hard_delete=true (optional)
 * @access  Private (requires permission: machines.delete)
 */
router.delete('/:id', machinesController.deleteMachine);

// ============================================================================
// TOOL NUMBER LISTS ASSIGNMENT
// ============================================================================

/**
 * @route   GET /api/machines/:machineId/tool-number-lists
 * @desc    Get all tool number lists assigned to a machine
 * @access  Private
 */
router.get('/:machineId/tool-number-lists', toolNumberListsController.getListsForMachine);

/**
 * @route   POST /api/machines/:machineId/tool-number-lists
 * @desc    Assign a tool number list to a machine
 * @body    { list_id, is_active }
 * @access  Private
 */
router.post('/:machineId/tool-number-lists', toolNumberListsController.assignListToMachine);

/**
 * @route   PUT /api/machines/:machineId/tool-number-lists/:listId/toggle
 * @desc    Toggle tool number list active status for machine
 * @access  Private
 */
router.put('/:machineId/tool-number-lists/:listId/toggle', toolNumberListsController.toggleListForMachine);

/**
 * @route   DELETE /api/machines/:machineId/tool-number-lists/:listId
 * @desc    Unassign a tool number list from a machine
 * @access  Private
 */
router.delete('/:machineId/tool-number-lists/:listId', toolNumberListsController.unassignListFromMachine);

/**
 * @route   GET /api/machines/:machineId/tool-mapping/:toolNumber
 * @desc    Find tool mapping for a T-Number on a machine
 * @access  Private
 */
router.get('/:machineId/tool-mapping/:toolNumber', toolNumberListsController.findToolMapping);

/**
 * @route   POST /api/machines/:machineId/tool-mapping/bulk
 * @desc    Bulk lookup tool mappings for multiple T-Numbers
 * @body    { tool_numbers: ['T1', 'T2', ...] }
 * @access  Private
 */
router.post('/:machineId/tool-mapping/bulk', toolNumberListsController.findToolMappingsBulk);

// ============================================================================
// MACHINE DOCUMENTS
// ============================================================================

/**
 * @route   GET /api/machines/:machineId/documents
 * @desc    Get all documents for a machine
 * @access  Private
 */
router.get('/:machineId/documents', machineDocumentsController.getDocumentsByMachine);

/**
 * @route   GET /api/machines/:machineId/documents/stats
 * @desc    Get document statistics for a machine
 * @access  Private
 */
router.get('/:machineId/documents/stats', machineDocumentsController.getDocumentStats);

/**
 * @route   POST /api/machines/:machineId/documents/upload
 * @desc    Upload document to a machine
 * @access  Private
 */
router.post('/:machineId/documents/upload', 
  machineDocumentsController.uploadMiddleware, 
  machineDocumentsController.uploadDocument
);

module.exports = router;
