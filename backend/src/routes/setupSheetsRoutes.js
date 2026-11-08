/**
 * Setup Sheets Routes
 * 
 * CRUD Operations für Einrichteblätter
 */

const express = require('express');
const router = express.Router();
const setupSheetsController = require('../controllers/setupSheetsController');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

// Schreiben braucht ein eigenes Recht (Spec Einrichteblatt-Freigabe 3), Lesen nur die Anmeldung
const canEdit = requirePermission('setup_sheet.update');
const multer = require('../utils/multer');
const path = require('path');
const fs = require('fs');

// ============================================================================
// Multer Config für Fotos
// ============================================================================
const uploadDir = path.join(__dirname, '../../uploads/setup-sheets');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sheetDir = path.join(uploadDir, String(req.params.id));
    fs.mkdirSync(sheetDir, { recursive: true });
    cb(null, sheetDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Nur Bilder erlauben
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(Object.assign(new Error('Nur JPG, PNG und WebP Bilder erlaubt'), { status: 400 }), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/setup-sheets
 * Liste aller Setup Sheets
 * Query params: operation_id, machine_id, status
 */
router.get('/', authenticateToken, setupSheetsController.getSetupSheets);

/**
 * GET /api/setup-sheets/:id
 * Einzelnes Setup Sheet mit Fotos
 */
router.get('/:id', authenticateToken, setupSheetsController.getSetupSheetById);

/**
 * POST /api/setup-sheets
 * Neues Setup Sheet erstellen
 */
router.post('/', authenticateToken, canEdit, setupSheetsController.createSetupSheet);

/**
 * PUT /api/setup-sheets/:id
 * Setup Sheet aktualisieren
 */
router.put('/:id', authenticateToken, canEdit, setupSheetsController.updateSetupSheet);

/**
 * DELETE /api/setup-sheets/:id
 * Setup Sheet löschen
 */
router.delete('/:id', authenticateToken, canEdit, setupSheetsController.deleteSetupSheet);

/**
 * POST /api/setup-sheets/:id/photos
 * Foto hochladen
 */
router.post(
  '/:id/photos',
  authenticateToken,
  canEdit,
  upload.single('photo'),
  setupSheetsController.uploadPhoto
);

/**
 * GET /api/setup-sheets/:id/photos/:photoId/view
 * Foto inline anzeigen (für AuthImage-Komponente)
 */
router.get(
  '/:id/photos/:photoId/view',
  authenticateToken,
  setupSheetsController.viewPhoto
);

/**
 * GET /api/setup-sheets/:id/photos/:photoId/download
 * Foto als Download ausliefern
 */
router.get(
  '/:id/photos/:photoId/download',
  authenticateToken,
  setupSheetsController.downloadPhoto
);

/**
 * PUT /api/setup-sheets/:id/photos/:photoId
 * Foto-Metadaten aktualisieren
 */
router.put(
  '/:id/photos/:photoId',
  authenticateToken,
  canEdit,
  setupSheetsController.updatePhoto
);

/**
 * DELETE /api/setup-sheets/:id/photos/:photoId
 * Foto löschen
 */
router.delete(
  '/:id/photos/:photoId',
  authenticateToken,
  canEdit,
  setupSheetsController.deletePhoto
);

// ============================================================================
// Spannmittel Zuordnungen
// ============================================================================

/**
 * POST /api/setup-sheets/:id/clamping-devices
 * Spannmittel hinzufügen
 */
router.post(
  '/:id/clamping-devices',
  authenticateToken,
  canEdit,
  setupSheetsController.addClampingDevice
);

/**
 * PUT /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel-Zuordnung aktualisieren
 */
router.put(
  '/:id/clamping-devices/:itemId',
  authenticateToken,
  canEdit,
  setupSheetsController.updateClampingDevice
);

/**
 * DELETE /api/setup-sheets/:id/clamping-devices/:itemId
 * Spannmittel entfernen
 */
router.delete(
  '/:id/clamping-devices/:itemId',
  authenticateToken,
  canEdit,
  setupSheetsController.removeClampingDevice
);

// ============================================================================
// Vorrichtungen Zuordnungen
// ============================================================================

/**
 * POST /api/setup-sheets/:id/fixtures
 * Vorrichtung hinzufügen
 */
router.post(
  '/:id/fixtures',
  authenticateToken,
  canEdit,
  setupSheetsController.addFixture
);

/**
 * PUT /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung-Zuordnung aktualisieren
 */
router.put(
  '/:id/fixtures/:itemId',
  authenticateToken,
  canEdit,
  setupSheetsController.updateFixture
);

/**
 * DELETE /api/setup-sheets/:id/fixtures/:itemId
 * Vorrichtung entfernen
 */
router.delete(
  '/:id/fixtures/:itemId',
  authenticateToken,
  canEdit,
  setupSheetsController.removeFixture
);

// ============================================================================
// Stände (Spec Einrichteblatt-Freigabe 2): Lesen für alle, Zurückgehen mit program.release
// ============================================================================

router.get('/:id/versions', authenticateToken, setupSheetsController.getVersions);
router.get('/:id/versions/:versionId', authenticateToken, setupSheetsController.getVersion);
router.get('/:id/versions/:versionId/photos/:index/view', authenticateToken, setupSheetsController.viewVersionPhoto);
router.post(
  '/:id/versions/:versionId/restore',
  authenticateToken,
  requirePermission('program.release'),
  setupSheetsController.restoreVersion
);

module.exports = router;
