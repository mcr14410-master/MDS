const express = require('express');
const router = express.Router();
const machinesController = require('../controllers/machinesController');
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

module.exports = router;
