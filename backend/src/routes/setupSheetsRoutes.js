/**
 * Setup Sheets Routes
 * 
 * CRUD Operations für Einrichteblätter
 */

const express = require('express');
const router = express.Router();
const setupSheetsController = require('../controllers/setupSheetsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// ============================================================================
// Multer Config für Fotos
// ============================================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/setup-sheets/');
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
    cb(new Error('Nur JPG, PNG und WebP Bilder erlaubt'), false);
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
router.post('/', authenticateToken, setupSheetsController.createSetupSheet);

/**
 * PUT /api/setup-sheets/:id
 * Setup Sheet aktualisieren
 */
router.put('/:id', authenticateToken, setupSheetsController.updateSetupSheet);

/**
 * DELETE /api/setup-sheets/:id
 * Setup Sheet löschen
 */
router.delete('/:id', authenticateToken, setupSheetsController.deleteSetupSheet);

/**
 * POST /api/setup-sheets/:id/photos
 * Foto hochladen
 */
router.post(
  '/:id/photos',
  authenticateToken,
  upload.single('photo'),
  setupSheetsController.uploadPhoto
);

/**
 * PUT /api/setup-sheets/:id/photos/:photoId
 * Foto-Metadaten aktualisieren
 */
router.put(
  '/:id/photos/:photoId',
  authenticateToken,
  setupSheetsController.updatePhoto
);

/**
 * DELETE /api/setup-sheets/:id/photos/:photoId
 * Foto löschen
 */
router.delete(
  '/:id/photos/:photoId',
  authenticateToken,
  setupSheetsController.deletePhoto
);

module.exports = router;
