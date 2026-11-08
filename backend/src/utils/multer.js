/**
 * multer mit richtigen Dateinamen – überall statt require('multer') verwenden
 *
 * multer 1.4.5 / busboy 1.6 liefern `originalname` als latin1: Aus „Rückseite.jpg“ wird „RÃ¼ckseite.jpg“.
 * Dieser Helfer hängt vor jeden Datei-Filter eine Umrechnung nach UTF-8. Der Filter läuft vor der
 * Speicherung, damit sehen Filter, Speicher-Callbacks und Controller schon den richtigen Namen.
 * Sonst verhält er sich wie multer (diskStorage, memoryStorage, MulterError …).
 */
const multer = require('multer');

/**
 * latin1 gelesenen UTF-8-Namen zurückwandeln. Nur wenn das Ergebnis gültiges UTF-8 ist,
 * sonst Name unverändert lassen (ASCII oder schon richtig).
 */
function decodeOriginalName(name) {
  if (typeof name !== 'string' || !/[\u0080-ÿ]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

function mdsMulter(options = {}) {
  const ownFilter = options.fileFilter;
  return multer({
    ...options,
    fileFilter(req, file, cb) {
      file.originalname = decodeOriginalName(file.originalname);
      if (ownFilter) return ownFilter(req, file, cb);
      return cb(null, true);
    },
  });
}

Object.assign(mdsMulter, multer, { decodeOriginalName });

module.exports = mdsMulter;
