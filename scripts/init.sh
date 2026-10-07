#!/bin/bash
# MDS Erstinstallation
# Führt Migrations aus und erstellt Admin-User mit allen Permissions

set -e

echo "🚀 MDS Erstinstallation"
echo "======================="

cd ~/mds

# Verzeichnisse erstellen
echo ""
echo "📁 Erstelle Verzeichnisse..."
sudo mkdir -p /srv/mds/postgres
sudo mkdir -p /srv/mds/uploads
sudo mkdir -p /srv/mds/pgadmin
sudo chown -R 5050:5050 /srv/mds/pgadmin
echo "✅ Verzeichnisse erstellt"

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

# Permissions, Admin-User und Rollen-Zuweisung
echo ""
echo "🔐 Erstelle Permissions und Admin-User..."
docker compose exec db psql -U mds -d mds << 'EOSQL'

-- Alle benötigten Permissions einfügen
INSERT INTO permissions (name) VALUES
  ('part.read'),
  ('part.create'),
  ('part.update'),
  ('part.delete'),
  ('program.read'),
  ('program.create'),
  ('program.update'),
  ('program.delete'),
  ('program.release'),
  ('program.download'),
  ('program.upload'),
  ('machine.read'),
  ('machine.create'),
  ('machine.update'),
  ('machine.delete'),
  ('maintenance.read'),
  ('maintenance.create'),
  ('maintenance.update'),
  ('maintenance.complete'),
  ('maintenance.escalate'),
  ('maintenance.assign'),
  ('maintenance.view_all'),
  ('maintenance.manage_plans'),
  ('maintenance.view_dashboard'),
  ('maintenance.record_hours'),
  ('maintenance.resolve_escalation'),
  ('user.read'),
  ('user.create'),
  ('user.update'),
  ('user.delete'),
  ('audit.read'),
  ('report.read'),
  ('report.export'),
  ('storage.view'),
  ('storage.create'),
  ('storage.edit'),
  ('storage.delete'),
  ('tools.view'),
  ('tools.categories.manage'),
  ('tools.create'),
  ('tools.edit'),
  ('tools.delete'),
  ('stock.issue'),
  ('stock.receive'),
  ('stock.transfer'),
  ('stock.adjust'),
  ('stock.scrap'),
  ('tools.documents.upload'),
  ('tools.documents.delete')
ON CONFLICT (name) DO NOTHING;

-- Admin-Rolle alle Permissions geben
DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'admin');
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'admin';

EOSQL

echo "✅ Permissions erstellt"

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
    const hash = await bcrypt.hash('admin123', 10);
    
    // Prüfen ob Admin existiert
    const check = await pool.query(\"SELECT id FROM users WHERE username = 'admin'\");
    
    if (check.rows.length === 0) {
      // Admin erstellen
      await pool.query(\`
        INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
        VALUES ('admin', 'admin@example.com', \\\$1, 'System', 'Administrator', true)
      \`, [hash]);
      console.log('✅ Admin-User erstellt');
    } else {
      // Passwort zurücksetzen
      await pool.query(\"UPDATE users SET password_hash = \\\$1 WHERE username = 'admin'\", [hash]);
      console.log('✅ Admin-Passwort zurückgesetzt');
    }
    
    // Admin-Rolle zuweisen (user_roles Tabelle)
    await pool.query(\`
      INSERT INTO user_roles (user_id, role_id)
      SELECT u.id, r.id
      FROM users u, roles r
      WHERE u.username = 'admin' AND r.name = 'admin'
      ON CONFLICT DO NOTHING
    \`);
    console.log('✅ Admin-Rolle zugewiesen');
    
    // Ergebnis prüfen
    const permCount = await pool.query(\`
      SELECT COUNT(*) as cnt FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id WHERE r.name = 'admin'
    \`);
    console.log('✅ Admin hat ' + permCount.rows[0].cnt + ' Permissions');
    
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
echo "🌐 MDS erreichbar unter:     http://$(hostname -I | awk '{print $1}'):81"
echo "🗄️  pgAdmin erreichbar unter: http://$(hostname -I | awk '{print $1}'):5050"
echo "   (Login: admin@mds.local / admin)"
