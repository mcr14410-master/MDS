/**
 * Fixture Documents Routes
 * 
 * API routes for fixture document management
 */

const express = require('express');
const router = express.Router();
const fixtureDocumentsController = require('../controllers/fixtureDocumentsController');
const { authenticateToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const upload = multer({
  dest: path.join(process.env.UPLOAD_DIR || './uploads', 'temp'),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/dxf',
      'application/dwg',
      'model/step',
      'application/step',
      'application/octet-stream' // For CAD files
    ];
    
    const allowedExtensions = [
      '.pdf', '.jpg', '.jpeg', '.png', '.gif',
      '.dxf', '.dwg', '.step', '.stp', '.iges', '.igs'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Dateityp nicht erlaubt: ${ext}`), false);
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// Document routes
router.get('/:id/documents', fixtureDocumentsController.getDocuments);
router.post('/:id/documents/upload', upload.single('file'), fixtureDocumentsController.uploadDocument);
router.get('/documents/:id/download', fixtureDocumentsController.downloadDocument);
router.put('/documents/:id', fixtureDocumentsController.updateDocument);
router.delete('/documents/:id', fixtureDocumentsController.deleteDocument);

module.exports = router;
