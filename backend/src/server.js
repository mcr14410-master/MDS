const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/bauteile', require('./routes/bauteile'));
app.use('/api/nc-programme', require('./routes/ncProgramme'));
app.use('/api/werkzeuge', require('./routes/werkzeuge'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Fertigungsdaten Management API'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint nicht gefunden' });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Serverfehler:', err);
  res.status(500).json({ 
    error: 'Interner Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server starten
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log(`  Fertigungsdaten Management API`);
  console.log(`  Server läuft auf Port ${PORT}`);
  console.log(`  Umgebung: ${process.env.NODE_ENV || 'development'}`);
  console.log('═══════════════════════════════════════════════');
});

module.exports = app;
