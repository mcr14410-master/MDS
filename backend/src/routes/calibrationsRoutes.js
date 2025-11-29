/**
 * Calibrations Routes
 * 
 * Manages calibrations and certificates
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const controller = require('../controllers/calibrationsController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/certificates');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for certificate uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `cert-${req.params.id}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF, JPEG und PNG Dateien erlaubt'), false);
    }
  }
});

// All routes require authentication
router.use(authenticateToken);

// ============================================================================
// CALIBRATIONS
// ============================================================================
router.get('/', controller.getAllCalibrations);
router.get('/:id', controller.getCalibrationById);
router.post('/', controller.createCalibration);
router.put('/:id', controller.updateCalibration);
router.delete('/:id', controller.deleteCalibration);

// ============================================================================
// CERTIFICATES
// ============================================================================
router.post('/:id/certificates', upload.single('file'), controller.uploadCertificate);
router.get('/:id/certificates', controller.getCertificates);
router.delete('/certificates/:certId', controller.deleteCertificate);
router.get('/certificates/:certId/download', controller.downloadCertificate);

module.exports = router;
