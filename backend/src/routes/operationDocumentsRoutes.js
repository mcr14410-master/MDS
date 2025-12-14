/**
 * Operation Documents Routes
 * API-Endpunkte für Operations-Dokumente
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/operationDocumentsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Multer für File-Upload (Memory Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50 MB
});

// Alle Routen erfordern Authentifizierung
router.use(authenticateToken);

// GET /api/operation-documents - Liste (mit ?operation_id=xxx)
router.get('/', requirePermission('part.read'), controller.getAll);

// GET /api/operation-documents/:id - Einzelnes Dokument
router.get('/:id', requirePermission('part.read'), controller.getById);

// GET /api/operation-documents/:id/download - Download
router.get('/:id/download', requirePermission('part.read'), controller.download);

// POST /api/operation-documents - Upload
router.post('/', requirePermission('part.create'), upload.single('file'), controller.upload);

// PUT /api/operation-documents/:id - Metadaten aktualisieren
router.put('/:id', requirePermission('part.update'), controller.update);

// DELETE /api/operation-documents/:id - Löschen
router.delete('/:id', requirePermission('part.delete'), controller.delete);

module.exports = router;
