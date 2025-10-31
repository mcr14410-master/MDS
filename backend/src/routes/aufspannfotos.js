const express = require('express');
const router = express.Router();
const { Aufspannfoto, Bauteil } = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload-Verzeichnis erstellen
const uploadDir = 'uploads/aufspannfotos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nur Bilddateien sind erlaubt!'));
    }
  }
});

// GET alle Aufspannfotos
router.get('/', async (req, res) => {
  try {
    const { bauteilId } = req.query;
    const where = bauteilId ? { bauteilId } : {};

    const fotos = await Aufspannfoto.findAll({
      where,
      include: [{ model: Bauteil, as: 'bauteil' }],
      order: [['createdAt', 'DESC']]
    });

    res.json(fotos);
  } catch (error) {
    console.error('Fehler beim Abrufen der Aufspannfotos:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Aufspannfotos' });
  }
});

// POST neues Aufspannfoto mit Upload
router.post('/', upload.single('bild'), async (req, res) => {
  try {
    const fotoData = {
      ...req.body,
      bildUrl: req.file ? `/uploads/aufspannfotos/${req.file.filename}` : null,
      dateiname: req.file ? req.file.filename : null
    };

    const foto = await Aufspannfoto.create(fotoData);
    res.status(201).json(foto);
  } catch (error) {
    console.error('Fehler beim Erstellen des Aufspannfotos:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT Aufspannfoto aktualisieren
router.put('/:id', upload.single('bild'), async (req, res) => {
  try {
    const foto = await Aufspannfoto.findByPk(req.params.id);
    
    if (!foto) {
      return res.status(404).json({ error: 'Aufspannfoto nicht gefunden' });
    }

    const updateData = { ...req.body };
    
    if (req.file) {
      // Altes Bild löschen
      if (foto.dateiname) {
        const oldPath = path.join(uploadDir, foto.dateiname);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      
      updateData.bildUrl = `/uploads/aufspannfotos/${req.file.filename}`;
      updateData.dateiname = req.file.filename;
    }

    await foto.update(updateData);
    res.json(foto);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Aufspannfotos:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE Aufspannfoto
router.delete('/:id', async (req, res) => {
  try {
    const foto = await Aufspannfoto.findByPk(req.params.id);
    
    if (!foto) {
      return res.status(404).json({ error: 'Aufspannfoto nicht gefunden' });
    }

    // Bilddatei löschen
    if (foto.dateiname) {
      const filePath = path.join(uploadDir, foto.dateiname);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await foto.destroy();
    res.json({ message: 'Aufspannfoto erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Aufspannfotos:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Aufspannfotos' });
  }
});

module.exports = router;
