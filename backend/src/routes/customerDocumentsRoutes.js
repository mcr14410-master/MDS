/**
 * Customer Documents Routes
 *
 * Routen fuer das Hoch-/Herunterladen und Verwalten von Kundendokumenten.
 *
 * Unter /api/customers/:customerId/documents:
 *   GET    ... - Liste der Dokumente
 *   POST   ... /upload - Upload
 *
 * Unter /api/customer-documents/:id:
 *   GET    ... /download - Download
 *   GET    ... /view     - Inline-Anzeige (AuthImage/Lightbox)
 *   PUT    ...           - Metadaten-Update (Typ, Beschreibung, is_primary)
 *   DELETE ...           - Loeschen
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/customerDocumentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// ---- Customer-spezifisch (wird unter /api/customers/... gemounted) ----
router.get(
  '/:customerId/documents',
  requirePermission('part.read'),
  controller.getDocumentsByCustomer
);

router.post(
  '/:customerId/documents/upload',
  requirePermission('part.create'),
  controller.uploadMiddleware,
  controller.uploadDocument
);

// ---- Dokument-spezifisch (wird unter /api/customer-documents/... gemounted) ----
router.get(
  '/documents/:id/download',
  requirePermission('part.read'),
  controller.downloadDocument
);

router.get(
  '/documents/:id/view',
  requirePermission('part.read'),
  controller.viewDocument
);

router.put(
  '/documents/:id',
  requirePermission('part.update'),
  controller.updateDocument
);

router.delete(
  '/documents/:id',
  requirePermission('part.delete'),
  controller.deleteDocument
);

module.exports = router;
