const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fertigungsdaten',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('connect', () => {
  console.log('✓ Datenbankverbindung hergestellt');
});

pool.on('error', (err) => {
  console.error('Unerwarteter Datenbankfehler:', err);
  process.exit(-1);
});

module.exports = pool;
