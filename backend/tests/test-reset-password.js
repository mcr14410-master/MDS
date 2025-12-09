// test-reset-password-simple.js
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'mds_admin',
  host: 'localhost',
  database: 'mds',
  password: 'mds_admin',
  port: 5432,
});

async function resetPassword() {
  const username = 'admin';
  const newPassword = 'admin123';
  
  console.log('Checking users table structure...');
  const columnsResult = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);
  
  console.log('Available columns:', columnsResult.rows.map(r => r.column_name).join(', '));
  console.log('');
  
  console.log('Hashing password with bcryptjs...');
  const hash = await bcrypt.hash(newPassword, 10);
  console.log('New hash:', hash);
  console.log('');
  
  console.log('Updating user password...');
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username, email',
    [hash, username]
  );
  
  if (result.rows.length === 0) {
    console.log('❌ User "admin" not found!');
    console.log('');
    console.log('Available users:');
    const allUsers = await pool.query('SELECT id, username, email, is_active FROM users');
    console.table(allUsers.rows);
  } else {
    console.log('✅ Password updated successfully!');
    console.log('User:', result.rows[0]);
    console.log('');
    console.log('═══════════════════════════════');
    console.log('Login credentials:');
    console.log('  Username:', username);
    console.log('  Password:', newPassword);
    console.log('═══════════════════════════════');
  }
  
  await pool.end();
}

resetPassword().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});