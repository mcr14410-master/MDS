#!/bin/bash
# MDS Erstinstallation
# Führt Migrations aus (inkl. aller Permissions) und legt den Admin-User an.
# Ein bestehender Admin behält sein Passwort. Zurücksetzen auf admin123 nur ausdrücklich:
#   ADMIN_PASSWORD_RESET=1 ./scripts/init.sh

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

# Migrations (legen auch alle Permissions an und weisen sie der Rolle admin zu)
echo ""
echo "📦 Führe Migrations aus..."
docker compose exec backend npm run migrate:up

# Admin-User anlegen bzw. prüfen
echo ""
echo "👤 Prüfe Admin-User..."
docker compose exec -e ADMIN_PASSWORD_RESET="${ADMIN_PASSWORD_RESET:-}" backend node -e "
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
    let showLogin = false;

    // Prüfen ob Admin existiert und noch den Platzhalter-Hash aus der ersten Migration hat
    // (Passwort unbekannt, also noch nicht eingerichtet)
    const check = await pool.query(\`
      SELECT id, password_hash = '\$2a\$10\$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa' AS uninitialized
      FROM users WHERE username = 'admin'
    \`);

    if (check.rows.length === 0) {
      // Admin erstellen
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(\`
        INSERT INTO users (username, email, password_hash, first_name, last_name, is_active)
        VALUES ('admin', 'admin@example.com', \\\$1, 'System', 'Administrator', true)
      \`, [hash]);
      console.log('✅ Admin-User erstellt');
      showLogin = true;
    } else if (check.rows[0].uninitialized || process.env.ADMIN_PASSWORD_RESET === '1') {
      // Erstes Passwort setzen bzw. nur auf ausdrücklichen Wunsch zurücksetzen
      const hash = await bcrypt.hash('admin123', 10);
      await pool.query(\"UPDATE users SET password_hash = \\\$1 WHERE username = 'admin'\", [hash]);
      console.log(check.rows[0].uninitialized
        ? '✅ Admin-Passwort gesetzt'
        : '✅ Admin-Passwort zurückgesetzt (ADMIN_PASSWORD_RESET=1)');
      showLogin = true;
    } else {
      console.log('✅ Admin-User existiert – Passwort unverändert');
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
      SELECT
        (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON rp.role_id = r.id WHERE r.name = 'admin') AS cnt,
        (SELECT COUNT(*) FROM permissions) AS total
    \`);
    console.log('✅ Admin hat ' + permCount.rows[0].cnt + ' von ' + permCount.rows[0].total + ' Permissions');

    if (showLogin) {
      console.log('');
      console.log('╔════════════════════════════════╗');
      console.log('║  Login-Daten:                  ║');
      console.log('║  Username: admin               ║');
      console.log('║  Passwort: admin123            ║');
      console.log('╚════════════════════════════════╝');
      console.log('⚠️  Passwort nach dem ersten Login ändern!');
    }

  } catch (err) {
    console.error('❌ Fehler:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
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
