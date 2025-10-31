const pool = require('../config/database');

// Alle Bauteile abrufen
exports.getAllBauteile = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM bauteile ORDER BY zeichnungsnummer'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der Bauteile:', error);
    res.status(500).json({ error: 'Serverfehler beim Abrufen der Bauteile' });
  }
};

// Bauteil nach ID abrufen
exports.getBauteilById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM bauteile WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bauteil nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Abrufen des Bauteils:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

// Bauteil mit allen zugehörigen Daten abrufen
exports.getBauteilComplete = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Bauteil
    const bauteil = await client.query('SELECT * FROM bauteile WHERE id = $1', [id]);
    if (bauteil.rows.length === 0) {
      return res.status(404).json({ error: 'Bauteil nicht gefunden' });
    }
    
    // NC-Programme
    const ncProgramme = await client.query(
      'SELECT * FROM nc_programme WHERE bauteil_id = $1 ORDER BY bearbeitungsschritt',
      [id]
    );
    
    // Einrichteblätter
    const einrichteblaetter = await client.query(
      'SELECT * FROM einrichteblaetter WHERE bauteil_id = $1 ORDER BY arbeitsgang',
      [id]
    );
    
    // Aufspannfotos
    const aufspannfotos = await client.query(
      'SELECT * FROM aufspannfotos WHERE bauteil_id = $1 ORDER BY erstellt_am DESC',
      [id]
    );
    
    await client.query('COMMIT');
    
    res.json({
      ...bauteil.rows[0],
      nc_programme: ncProgramme.rows,
      einrichteblaetter: einrichteblaetter.rows,
      aufspannfotos: aufspannfotos.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Abrufen der vollständigen Bauteilinformationen:', error);
    res.status(500).json({ error: 'Serverfehler' });
  } finally {
    client.release();
  }
};

// Neues Bauteil erstellen
exports.createBauteil = async (req, res) => {
  try {
    const { zeichnungsnummer, benennung, revision, material, kunde, notizen } = req.body;
    
    const result = await pool.query(
      `INSERT INTO bauteile (zeichnungsnummer, benennung, revision, material, kunde, notizen)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [zeichnungsnummer, benennung, revision, material, kunde, notizen]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Zeichnungsnummer existiert bereits' });
    }
    console.error('Fehler beim Erstellen des Bauteils:', error);
    res.status(500).json({ error: 'Serverfehler beim Erstellen des Bauteils' });
  }
};

// Bauteil aktualisieren
exports.updateBauteil = async (req, res) => {
  try {
    const { id } = req.params;
    const { zeichnungsnummer, benennung, revision, material, kunde, notizen } = req.body;
    
    const result = await pool.query(
      `UPDATE bauteile 
       SET zeichnungsnummer = $1, benennung = $2, revision = $3, 
           material = $4, kunde = $5, notizen = $6, 
           aktualisiert_am = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [zeichnungsnummer, benennung, revision, material, kunde, notizen, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bauteil nicht gefunden' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Zeichnungsnummer existiert bereits' });
    }
    console.error('Fehler beim Aktualisieren des Bauteils:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

// Bauteil löschen
exports.deleteBauteil = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM bauteile WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bauteil nicht gefunden' });
    }
    
    res.json({ message: 'Bauteil erfolgreich gelöscht', bauteil: result.rows[0] });
  } catch (error) {
    console.error('Fehler beim Löschen des Bauteils:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

// Bauteile suchen
exports.searchBauteile = async (req, res) => {
  try {
    const { q } = req.query;
    
    const result = await pool.query(
      `SELECT * FROM bauteile 
       WHERE zeichnungsnummer ILIKE $1 
          OR benennung ILIKE $1 
          OR material ILIKE $1 
          OR kunde ILIKE $1
       ORDER BY zeichnungsnummer`,
      [`%${q}%`]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler bei der Suche:', error);
    res.status(500).json({ error: 'Serverfehler bei der Suche' });
  }
};
