const pool = require('./database');

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Bauteile Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS bauteile (
        id SERIAL PRIMARY KEY,
        zeichnungsnummer VARCHAR(100) NOT NULL UNIQUE,
        benennung VARCHAR(255) NOT NULL,
        revision VARCHAR(50),
        material VARCHAR(100),
        kunde VARCHAR(255),
        notizen TEXT,
        erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // NC-Programme Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS nc_programme (
        id SERIAL PRIMARY KEY,
        bauteil_id INTEGER REFERENCES bauteile(id) ON DELETE CASCADE,
        programmname VARCHAR(255) NOT NULL,
        bearbeitungsschritt VARCHAR(255),
        maschine VARCHAR(100),
        programmcode TEXT,
        dateiname VARCHAR(255),
        dateipfad VARCHAR(500),
        erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Einrichteblätter Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS einrichteblaetter (
        id SERIAL PRIMARY KEY,
        bauteil_id INTEGER REFERENCES bauteile(id) ON DELETE CASCADE,
        arbeitsgang VARCHAR(255) NOT NULL,
        spannmittel VARCHAR(255),
        nullpunkt VARCHAR(100),
        werkzeugliste TEXT,
        hinweise TEXT,
        erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Werkzeuge Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS werkzeuge (
        id SERIAL PRIMARY KEY,
        nummer VARCHAR(50) NOT NULL UNIQUE,
        bezeichnung VARCHAR(255) NOT NULL,
        typ VARCHAR(100),
        durchmesser DECIMAL(10,3),
        schnittgeschwindigkeit DECIMAL(10,2),
        vorschub DECIMAL(10,4),
        hersteller VARCHAR(100),
        notizen TEXT,
        erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        aktualisiert_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Aufspannfotos Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS aufspannfotos (
        id SERIAL PRIMARY KEY,
        bauteil_id INTEGER REFERENCES bauteile(id) ON DELETE CASCADE,
        aufspannung VARCHAR(255) NOT NULL,
        beschreibung TEXT,
        dateiname VARCHAR(255),
        dateipfad VARCHAR(500),
        dateityp VARCHAR(50),
        erstellt_am TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Index für Performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_bauteile_zeichnungsnummer ON bauteile(zeichnungsnummer);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_nc_programme_bauteil ON nc_programme(bauteil_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_einrichteblaetter_bauteil ON einrichteblaetter(bauteil_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_aufspannfotos_bauteil ON aufspannfotos(bauteil_id);');

    await client.query('COMMIT');
    console.log('✓ Datenbanktabellen erfolgreich erstellt');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Fehler beim Erstellen der Tabellen:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Skript ausführen
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Datenbankinitialisierung abgeschlossen');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Datenbankinitialisierung fehlgeschlagen:', err);
      process.exit(1);
    });
}

module.exports = createTables;
