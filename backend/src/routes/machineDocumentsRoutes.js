const express = require('express');
const router = express.Router();
const machineDocumentsController = require('../controllers/machineDocumentsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/machine-documents/types
 * @desc    Get document type labels
 * @access  Private
 */
router.get('/types', machineDocumentsController.getDocumentTypes);

/**
 * @route   GET /api/machine-documents/:id
 * @desc    Get single document by ID
 * @access  Private
 */
router.get('/:id', machineDocumentsController.getDocumentById);

/**
 * @route   GET /api/machine-documents/:id/download
 * @desc    Download document file
 * @access  Private
 */
router.get('/:id/download', machineDocumentsController.downloadDocument);

/**
 * @route   GET /api/machine-documents/:id/view
 * @desc    View document inline (for images)
 * @access  Private
 */
router.get('/:id/view', machineDocumentsController.viewDocument);

/**
 * @route   PUT /api/machine-documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.put('/:id', machineDocumentsController.updateDocument);

/**
 * @route   PUT /api/machine-documents/:id/set-primary
 * @desc    Set document as primary
 * @access  Private
 */
router.put('/:id/set-primary', machineDocumentsController.setPrimaryDocument);

/**
 * @route   DELETE /api/machine-documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete('/:id', machineDocumentsController.deleteDocument);

module.exports = router;
