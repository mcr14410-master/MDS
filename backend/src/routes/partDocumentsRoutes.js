/**
 * Part Documents Routes
 * 
 * Endpunkte für Bauteil-Dokumente (CAD, Zeichnungen, etc.)
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // mergeParams für :partId aus parent route
const multer = require('../utils/multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');
const partDocumentsController = require('../controllers/partDocumentsController');

// Temporäres Upload-Verzeichnis
const TEMP_UPLOAD_DIR = process.env.TEMP_UPLOAD_PATH || path.join(__dirname, '../../uploads/temp');

// Sicherstellen dass temp-Verzeichnis existiert
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// Multer Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Dateifilter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = [
    // CAD Models
    '.step', '.stp', '.stl', '.obj', '.iges', '.igs', '.3ds', '.gltf', '.glb', '.x_t', '.x_b', '.sat',
    // Drawings
    '.pdf', '.png', '.jpg', '.jpeg', '.tif', '.tiff', '.dxf', '.dwg', '.svg',
    // Other
    '.doc', '.docx', '.xls', '.xlsx', '.txt', '.zip', '.rar', '.7z'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Dateityp ${ext} nicht erlaubt`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100 MB
  }
});

// Alle Routes authentifiziert
router.use(authenticateToken);

/**
 * GET /api/parts/:partId/documents
 * Alle Dokumente eines Bauteils
 */
router.get('/', partDocumentsController.getPartDocuments);

/**
 * POST /api/parts/:partId/documents
 * Dokument hochladen
 */
router.post('/', requirePermission('part.update'), upload.single('file'), partDocumentsController.uploadDocument); // Recht vor multer: ohne Recht keine Datei ablegen

/**
 * GET /api/parts/:partId/documents/:documentId/download
 * Dokument herunterladen
 */
router.get('/:documentId/download', partDocumentsController.downloadDocument);

/**
 * GET /api/parts/:partId/documents/:documentId/view
 * Dokument im Browser anzeigen (Vorschau)
 */
router.get('/:documentId/view', partDocumentsController.viewDocument);

/**
 * PATCH /api/parts/:partId/documents/:documentId
 * Dokument-Metadaten aktualisieren
 */
router.patch('/:documentId', requirePermission('part.update'), partDocumentsController.updateDocument);

/**
 * DELETE /api/parts/:partId/documents/:documentId
 * Dokument löschen
 */
router.delete('/:documentId', requirePermission('part.update'), partDocumentsController.deleteDocument);

/**
 * POST /api/parts/:partId/documents/:documentId/set-primary
 * Als primäres CAD-Model setzen
 */
router.post('/:documentId/set-primary', requirePermission('part.update'), partDocumentsController.setPrimaryCad);

/**
 * POST /api/parts/:partId/documents/:documentId/set-primary-drawing
 * Als primäre Zeichnung setzen
 */
router.post('/:documentId/set-primary-drawing', requirePermission('part.update'), partDocumentsController.setPrimaryDrawing);

// Error Handler für Multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Datei zu groß (max. 100 MB)'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload-Fehler: ${err.message}`
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  next();
});

module.exports = router;
