// seed-storage-permissions.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'mds_admin',
  host: 'localhost',
  database: 'mds',
  password: 'mds_admin',
  port: 5432,
});

async function seedStoragePermissions() {
  try {
    console.log('Adding storage permissions...');
    
    // 1. Permissions erstellen
    const permissions = [
      { name: 'storage.view', description: 'Lagerorte anzeigen' },
      { name: 'storage.create', description: 'Lagerorte erstellen' },
      { name: 'storage.edit', description: 'Lagerorte bearbeiten' },
      { name: 'storage.delete', description: 'Lagerorte löschen' }
    ];
    
    for (const perm of permissions) {
      const result = await pool.query(
        `INSERT INTO permissions (name, description) 
         VALUES ($1, $2) 
         ON CONFLICT (name) DO NOTHING
         RETURNING id, name`,
        [perm.name, perm.description]
      );
      
      if (result.rows.length > 0) {
        console.log('✅ Created:', result.rows[0].name);
      } else {
        console.log('ℹ️  Already exists:', perm.name);
      }
    }
    
    // 2. Admin-Rolle finden
    const roleResult = await pool.query(
      `SELECT id, name FROM roles WHERE name ILIKE '%admin%' LIMIT 1`
    );
    
    if (roleResult.rows.length === 0) {
      console.log('❌ Admin role not found!');
      await pool.end();
      return;
    }
    
    const adminRoleId = roleResult.rows[0].id;
    console.log('\nAdmin role found:', roleResult.rows[0].name, '(ID:', adminRoleId + ')');
    
    // 3. Admin alle Storage-Permissions geben
    console.log('\nAssigning permissions to admin role...');
    const assignResult = await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions WHERE name LIKE 'storage.%'
       ON CONFLICT (role_id, permission_id) DO NOTHING
       RETURNING permission_id`,
      [adminRoleId]
    );
    
    console.log('✅ Assigned', assignResult.rows.length, 'permissions to admin role');
    
    // 4. Verifizieren
    console.log('\nVerifying storage permissions:');
    const verifyResult = await pool.query(
      `SELECT p.name, p.description 
       FROM permissions p
       WHERE p.name LIKE 'storage.%'
       ORDER BY p.name`
    );
    
    console.table(verifyResult.rows);
    
    console.log('\n✅ Storage permissions setup complete!');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

seedStoragePermissions();
