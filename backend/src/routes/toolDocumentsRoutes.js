/**
 * Tool Documents Routes
 *
 * Routes for document management (upload, download, delete)
 */

const express = require('express');
const router = express.Router();
const toolDocumentsController = require('../controllers/toolDocumentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// ============================================================================
// TOOL-SPECIFIC DOCUMENT ROUTES
// ============================================================================

/**
 * Get all documents for a tool
 * GET /api/tools/:toolId/documents
 */
router.get(
  '/tools/:toolId/documents',
  authenticateToken,
  requirePermission('tools.view'),
  toolDocumentsController.getDocumentsByTool
);

/**
 * Upload document for a tool
 * POST /api/tools/:toolId/documents/upload
 * Content-Type: multipart/form-data
 * Body: { file, document_type, description }
 */
router.post(
  '/tools/:toolId/documents/upload',
  authenticateToken,
  requirePermission('tools.documents.upload'),
  toolDocumentsController.uploadMiddleware,
  toolDocumentsController.uploadDocument
);

/**
 * Get document statistics for a tool
 * GET /api/tools/:toolId/documents/stats
 */
router.get(
  '/tools/:toolId/documents/stats',
  authenticateToken,
  requirePermission('tools.view'),
  toolDocumentsController.getDocumentStats
);

// ============================================================================
// DOCUMENT-SPECIFIC ROUTES
// ============================================================================

/**
 * Get single document by ID
 * GET /api/tool-documents/:id
 */
router.get(
  '/tool-documents/:id',
  authenticateToken,
  requirePermission('tools.view'),
  toolDocumentsController.getDocumentById
);

/**
 * Download document
 * GET /api/tool-documents/:id/download
 */
router.get(
  '/tool-documents/:id/download',
  authenticateToken,
  requirePermission('tools.view'),
  toolDocumentsController.downloadDocument
);

/**
 * Update document metadata
 * PUT /api/tool-documents/:id
 * Body: { document_type?, description? }
 */
router.put(
  '/tool-documents/:id',
  authenticateToken,
  requirePermission('tools.documents.upload'),
  toolDocumentsController.updateDocument
);

/**
 * Set document as primary (main document)
 * PUT /api/tool-documents/:id/set-primary
 */
router.put(
  '/tool-documents/:id/set-primary',
  authenticateToken,
  requirePermission('tools.documents.upload'),
  toolDocumentsController.setPrimaryDocument
);

/**
 * Delete document (soft delete + remove file)
 * DELETE /api/tool-documents/:id
 */
router.delete(
  '/tool-documents/:id',
  authenticateToken,
  requirePermission('tools.documents.delete'),
  toolDocumentsController.deleteDocument
);

module.exports = router;
