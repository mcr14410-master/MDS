const pool = require('../config/database');

exports.getAllNcProgramme = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT np.*, b.zeichnungsnummer, b.benennung 
      FROM nc_programme np
      LEFT JOIN bauteile b ON np.bauteil_id = b.id
      ORDER BY np.erstellt_am DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Fehler beim Abrufen der NC-Programme:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.getNcProgrammById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT np.*, b.zeichnungsnummer, b.benennung 
      FROM nc_programme np
      LEFT JOIN bauteile b ON np.bauteil_id = b.id
      WHERE np.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NC-Programm nicht gefunden' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.createNcProgramm = async (req, res) => {
  try {
    const { bauteil_id, programmname, bearbeitungsschritt, maschine, programmcode } = req.body;
    
    const result = await pool.query(
      `INSERT INTO nc_programme (bauteil_id, programmname, bearbeitungsschritt, maschine, programmcode)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [bauteil_id, programmname, bearbeitungsschritt, maschine, programmcode]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.updateNcProgramm = async (req, res) => {
  try {
    const { id } = req.params;
    const { bauteil_id, programmname, bearbeitungsschritt, maschine, programmcode } = req.body;
    
    const result = await pool.query(
      `UPDATE nc_programme 
       SET bauteil_id = $1, programmname = $2, bearbeitungsschritt = $3, 
           maschine = $4, programmcode = $5, aktualisiert_am = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [bauteil_id, programmname, bearbeitungsschritt, maschine, programmcode, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NC-Programm nicht gefunden' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};

exports.deleteNcProgramm = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM nc_programme WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NC-Programm nicht gefunden' });
    }
    res.json({ message: 'NC-Programm gelöscht', programm: result.rows[0] });
  } catch (error) {
    console.error('Fehler:', error);
    res.status(500).json({ error: 'Serverfehler' });
  }
};
