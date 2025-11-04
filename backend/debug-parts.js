// backend/debug-parts.js
// Quick test script to check parts in database

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkParts() {
  try {
    console.log('🔍 Checking database for parts...\n');

    // Check parts count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM parts');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📦 Parts in database: ${count}\n`);

    if (count === 0) {
      console.log('⚠️  Database is empty! No parts found.\n');
      console.log('💡 Solutions:');
      console.log('   1. Create a test part via API:');
      console.log('      POST http://localhost:5000/api/parts');
      console.log('   2. Or use the frontend "Neues Bauteil" button\n');
    } else {
      // Show parts
      const result = await pool.query(`
        SELECT 
          id, part_number, part_name, status, 
          customer_id, created_at 
        FROM parts 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      console.log('📋 Latest parts:');
      console.table(result.rows);
    }

    // Check customers
    const customersResult = await pool.query('SELECT COUNT(*) as count FROM customers');
    const customerCount = parseInt(customersResult.rows[0].count);
    console.log(`\n👥 Customers in database: ${customerCount}`);

    if (customerCount === 0) {
      console.log('\n⚠️  No customers found!');
      console.log('💡 You need at least one customer to create parts.');
      console.log('   Run: npm run seed\n');
    } else {
      const customers = await pool.query('SELECT id, name, customer_number FROM customers LIMIT 3');
      console.log('\n👥 Available customers:');
      console.table(customers.rows);
    }

    pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    pool.end();
  }
}

checkParts();
