/**
 * Consumable Documents Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/consumableDocumentsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// GET    /api/consumable-documents/:id                - Get document by ID
router.get('/:id', controller.getDocumentById);

// PUT    /api/consumable-documents/:id                - Update document metadata
router.put('/:id', controller.updateDocument);

// DELETE /api/consumable-documents/:id                - Delete document
router.delete('/:id', controller.deleteDocument);

// PUT    /api/consumable-documents/:id/primary        - Set as primary image
router.put('/:id/primary', controller.setPrimaryImage);

// GET    /api/consumable-documents/:id/download       - Download document file
router.get('/:id/download', controller.downloadDocument);

module.exports = router;
