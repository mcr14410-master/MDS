/**
 * Database Configuration
 * PostgreSQL Pool für alle Controller
 */

const { Pool } = require('pg');
const pg = require('pg');
require('dotenv').config();

// DATE als 'YYYY-MM-DD' String belassen, nicht in JS Date-Objekt konvertieren
pg.types.setTypeParser(1082, val => val);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Set timezone for correct CURRENT_DATE/DATE() in CET/CEST
pool.on('connect', (client) => {
  client.query("SET timezone = 'Europe/Berlin'");
  console.log('✅ Database pool connected (timezone: Europe/Berlin)');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;
