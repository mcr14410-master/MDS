#!/bin/bash
# MDS Erstinstallation
# Führt Migrations aus und erstellt Admin-User

set -e

echo "🚀 MDS Erstinstallation"
echo "======================="

cd ~/mds

# Prüfen ob Container laufen
if ! docker compose ps | grep -q "backend.*Up"; then
    echo "⚠️  Container starten..."
    docker compose up -d
    echo "⏳ Warte auf DB..."
    sleep 10
fi

# Migrations
echo ""
echo "📦 Führe Migrations aus..."
docker compose exec backend npm run migrate:up

# Admin-User erstellen/zurücksetzen
echo ""
echo "👤 Erstelle Admin-User..."
docker compose exec backend node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'db',
  database: 'mds',
  user: 'mds',
  password: process.env.DB_PASSWORD
});

(async () => {
  try {
    // Prüfen ob Admin existiert
    const check = await pool.query(\"SELECT id FROM users WHERE username = 'admin'\");
    
    const hash = await bcrypt.hash('admin123', 10);
    
    if (check.rows.length === 0) {
      // Admin erstellen
      await pool.query(\`
        INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active)
        SELECT 'admin', 'admin@example.com', \\\$1, 'System', 'Administrator', 
               (SELECT id FROM roles WHERE name = 'admin'), true
        WHERE EXISTS (SELECT 1 FROM roles WHERE name = 'admin')
      \`, [hash]);
      console.log('✅ Admin-User erstellt');
    } else {
      // Passwort zurücksetzen
      await pool.query(\"UPDATE users SET password_hash = \\\$1 WHERE username = 'admin'\", [hash]);
      console.log('✅ Admin-Passwort zurückgesetzt');
    }
    
    console.log('');
    console.log('╔════════════════════════════════╗');
    console.log('║  Login-Daten:                  ║');
    console.log('║  Username: admin               ║');
    console.log('║  Passwort: admin123            ║');
    console.log('╚════════════════════════════════╝');
    
  } catch (err) {
    console.error('❌ Fehler:', err.message);
  } finally {
    pool.end();
  }
})();
"

# Optional: Seed-Daten
echo ""
read -p "🌱 Test-Daten (Maschinen, Bauteile, etc.) erstellen? (j/n): " SEED
if [ "$SEED" = "j" ] || [ "$SEED" = "J" ]; then
    docker compose exec backend npm run seed
    echo "✅ Test-Daten erstellt"
fi

echo ""
echo "✅ Installation abgeschlossen!"
echo ""
echo "🌐 MDS erreichbar unter: http://$(hostname -I | awk '{print $1}'):81"
