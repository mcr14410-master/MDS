const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Erlaubte Datei-Typen für NC-Programme
const ALLOWED_EXTENSIONS = [
  '.nc',   // Standard NC
  '.mpf',  // Siemens
  '.spf',  // Siemens Subprogramm
  '.h',    // Heidenhain
  '.eia',  // EIA/ISO
  '.txt',  // Text/Generic
  '.cnc',  // Generic CNC
  '.tap',  // G-Code
  '.gcode',// G-Code
  '.fan',  // Fanuc
  '.min',  // Mazatrol
  '.prg',  // Program
  '.pim',  // Program
  '.din',  // DIN/ISO
  '.iso',  // ISO
];

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'application/octet-stream',
  'application/x-nc-program',
  'application/x-gcode',
];

// Upload-Verzeichnis sicherstellen
const UPLOAD_DIR = path.join(__dirname, '../../uploads/programs');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage-Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Eindeutiger Filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    // Dateiname säubern (Leerzeichen, Sonderzeichen)
    const cleanBasename = basename.replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${uniqueSuffix}-${cleanBasename}${ext}`);
  }
});

// File-Filter (Validierung)
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Prüfe Extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(
        `Dateityp nicht erlaubt. Erlaubte Typen: ${ALLOWED_EXTENSIONS.join(', ')}`
      ),
      false
    );
  }

  // Prüfe MIME-Type (optional, da viele NC-Programme als text/plain kommen)
  // Wir erlauben alle, solange die Extension stimmt
  
  cb(null, true);
};

// Multer-Instanz mit Konfiguration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  }
});

// Error-Handler für Multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Datei zu groß',
        details: 'Maximale Dateigröße: 100 MB'
      });
    }
    return res.status(400).json({
      error: 'Upload-Fehler',
      details: err.message
    });
  } else if (err) {
    return res.status(400).json({
      error: 'Validierungs-Fehler',
      details: err.message
    });
  }
  next();
};

module.exports = {
  upload,
  handleMulterError,
  ALLOWED_EXTENSIONS,
  UPLOAD_DIR
};
