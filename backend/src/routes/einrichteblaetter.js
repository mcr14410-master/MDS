const express = require('express');
const router = express.Router();
const { Einrichteblatt, Bauteil } = require('../models');

// GET alle Einrichteblätter
router.get('/', async (req, res) => {
  try {
    const { bauteilId } = req.query;
    const where = bauteilId ? { bauteilId } : {};

    const einrichteblaetter = await Einrichteblatt.findAll({
      where,
      include: [{ model: Bauteil, as: 'bauteil' }],
      order: [['createdAt', 'DESC']]
    });

    res.json(einrichteblaetter);
  } catch (error) {
    console.error('Fehler beim Abrufen der Einrichteblätter:', error);
    res.status(500).json({ error: 'Fehler beim Abrufen der Einrichteblätter' });
  }
});

// POST neues Einrichteblatt
router.post('/', async (req, res) => {
  try {
    const einrichteblatt = await Einrichteblatt.create(req.body);
    res.status(201).json(einrichteblatt);
  } catch (error) {
    console.error('Fehler beim Erstellen des Einrichteblatts:', error);
    res.status(400).json({ error: error.message });
  }
});

// PUT Einrichteblatt aktualisieren
router.put('/:id', async (req, res) => {
  try {
    const einrichteblatt = await Einrichteblatt.findByPk(req.params.id);
    
    if (!einrichteblatt) {
      return res.status(404).json({ error: 'Einrichteblatt nicht gefunden' });
    }

    await einrichteblatt.update(req.body);
    res.json(einrichteblatt);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Einrichteblatts:', error);
    res.status(400).json({ error: error.message });
  }
});

// DELETE Einrichteblatt
router.delete('/:id', async (req, res) => {
  try {
    const einrichteblatt = await Einrichteblatt.findByPk(req.params.id);
    
    if (!einrichteblatt) {
      return res.status(404).json({ error: 'Einrichteblatt nicht gefunden' });
    }

    await einrichteblatt.destroy();
    res.json({ message: 'Einrichteblatt erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Einrichteblatts:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Einrichteblatts' });
  }
});

module.exports = router;
