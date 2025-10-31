const pool = require('../config/database');

exports.getAllWerkzeuge = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM werkzeuge ORDER BY nummer');
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.getWerkzeugById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM werkzeuge WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Werkzeug nicht gefunden' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.createWerkzeug = async (req, res) => {
  try {
    const { nummer, bezeichnung, typ, durchmesser, schnittgeschwindigkeit, vorschub, hersteller, notizen } = req.body;
    
    const result = await pool.query(
      `INSERT INTO werkzeuge (nummer, bezeichnung, typ, durchmesser, schnittgeschwindigkeit, vorschub, hersteller, notizen)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [nummer, bezeichnung, typ, durchmesser, schnittgeschwindigkeit, vorschub, hersteller, notizen]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Werkzeugnummer existiert bereits' });
    }
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.updateWerkzeug = async (req, res) => {
  try {
    const { id } = req.params;
    const { nummer, bezeichnung, typ, durchmesser, schnittgeschwindigkeit, vorschub, hersteller, notizen } = req.body;
    
    const result = await pool.query(
      `UPDATE werkzeuge 
       SET nummer = $1, bezeichnung = $2, typ = $3, durchmesser = $4,
           schnittgeschwindigkeit = $5, vorschub = $6, hersteller = $7, notizen = $8,
           aktualisiert_am = CURRENT_TIMESTAMP
       WHERE id = $9 RETURNING *`,
      [nummer, bezeichnung, typ, durchmesser, schnittgeschwindigkeit, vorschub, hersteller, notizen, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Werkzeug nicht gefunden' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Werkzeugnummer existiert bereits' });
    }
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.deleteWerkzeug = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM werkzeuge WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Werkzeug nicht gefunden' });
    }
    res.json({ message: 'Werkzeug gelöscht', werkzeug: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Serverfehler' });
  }
};
