const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload-Verzeichnis für Wartungsfotos
const UPLOAD_DIR = path.join(__dirname, '../../uploads/maintenance');

// Erstelle Verzeichnis falls nicht vorhanden
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Erlaubte Bild-Typen
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Storage-Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Format: task-{taskId}-item-{itemId}-{timestamp}.{ext}
    const taskId = req.params.taskId || req.params.id || 'unknown';
    const itemId = req.params.itemId || 'general';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `task-${taskId}-item-${itemId}-${timestamp}${ext}`);
  }
});

// File-Filter
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`Dateityp nicht erlaubt. Erlaubte Typen: ${ALLOWED_EXTENSIONS.join(', ')}`),
      false
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return cb(
      new Error('Ungültiger MIME-Type. Nur Bilder erlaubt.'),
      false
    );
  }

  cb(null, true);
};

// Multer-Instanz
const maintenanceUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  }
});

// Error-Handler
const handleMaintenanceUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Datei zu groß',
        message: 'Maximale Dateigröße: 10 MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload-Fehler',
      message: err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      error: 'Validierungs-Fehler',
      message: err.message
    });
  }
  next();
};

module.exports = {
  maintenanceUpload,
  handleMaintenanceUploadError,
  UPLOAD_DIR,
  ALLOWED_EXTENSIONS
};
