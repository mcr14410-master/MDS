const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  
  console.log('\n=================================');
  console.log('Password Hash Generator');
  console.log('=================================');
  console.log(`Password: ${password}`);
  console.log(`Hash:     ${hash}`);
  console.log('=================================\n');
  
  // Test the hash
  const isValid = await bcrypt.compare(password, hash);
  console.log(`✅ Hash verification: ${isValid ? 'SUCCESS' : 'FAILED'}`);
  
  return hash;
}

// Generate hash for admin123
generateHash('admin123').then(() => process.exit(0));
