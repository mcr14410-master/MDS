/**
 * Clamping Device Documents Routes
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/clampingDeviceDocumentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// DEVICE-SPECIFIC DOCUMENT ROUTES
// ============================================================================

/**
 * Get all documents for a clamping device
 * GET /api/clamping-devices/:deviceId/documents
 */
router.get(
  '/:deviceId/documents',
  requirePermission('storage.view'),
  controller.getDocumentsByDevice
);

/**
 * Upload document for a clamping device
 * POST /api/clamping-devices/:deviceId/documents/upload
 */
router.post(
  '/:deviceId/documents/upload',
  requirePermission('storage.create'),
  controller.uploadMiddleware,
  controller.uploadDocument
);

// ============================================================================
// DOCUMENT-SPECIFIC ROUTES (mounted under /api/clamping-device-documents)
// ============================================================================

/**
 * Get document by ID
 * GET /api/clamping-device-documents/:id
 */
router.get(
  '/documents/:id',
  requirePermission('storage.view'),
  controller.getDocumentById
);

/**
 * Download document
 * GET /api/clamping-device-documents/:id/download
 */
router.get(
  '/documents/:id/download',
  requirePermission('storage.view'),
  controller.downloadDocument
);

/**
 * Update document metadata
 * PUT /api/clamping-device-documents/:id
 */
router.put(
  '/documents/:id',
  requirePermission('storage.edit'),
  controller.updateDocument
);

/**
 * Delete document
 * DELETE /api/clamping-device-documents/:id
 */
router.delete(
  '/documents/:id',
  requirePermission('storage.delete'),
  controller.deleteDocument
);

module.exports = router;
