#!/usr/bin/env node

// Simple API Test Script for MDS Backend
// Run with: node test-api.js

const http = require('http');

const baseUrl = 'http://localhost:5000';
let testResults = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  log('========================================', 'cyan');
  log('   MDS Backend API Tests', 'cyan');
  log('========================================\n', 'cyan');

  try {
    // Test 1: Health Check
    log('1. Testing Health Check...', 'yellow');
    const health = await makeRequest('/api/health');
    if (health.status === 200) {
      log('   ✅ Health Check: ' + health.data.status, 'green');
      log('   Database: ' + health.data.database, 'gray');
      testResults.push({ name: 'Health Check', passed: true });
    } else {
      log('   ❌ Health Check failed!', 'red');
      testResults.push({ name: 'Health Check', passed: false });
    }

    // Test 2: Database Info
    log('\n2. Testing Database Info...', 'yellow');
    const dbInfo = await makeRequest('/api/db/info');
    if (dbInfo.status === 200) {
      log('   ✅ Database Info retrieved', 'green');
      log('   Tables: ' + dbInfo.data.tables, 'gray');
      testResults.push({ name: 'Database Info', passed: true });
    } else {
      log('   ❌ Database Info failed!', 'red');
      testResults.push({ name: 'Database Info', passed: false });
    }

    // Test 3: Login
    log('\n3. Testing Login...', 'yellow');
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };
    const login = await makeRequest('/api/auth/login', 'POST', loginData);
    let token = null;
    
    if (login.status === 200 && login.data.token) {
      log('   ✅ Login successful!', 'green');
      log('   User: ' + login.data.user.username, 'gray');
      log('   Email: ' + login.data.user.email, 'gray');
      log('   Roles: ' + login.data.user.roles.join(', '), 'gray');
      token = login.data.token;
      log('   Token received: ' + token.substring(0, 20) + '...', 'gray');
      testResults.push({ name: 'Login', passed: true });
    } else {
      log('   ❌ Login failed!', 'red');
      testResults.push({ name: 'Login', passed: false });
      throw new Error('Login failed - cannot continue');
    }

    // Test 4: Get Profile (Protected)
    log('\n4. Testing Get Profile (Protected)...', 'yellow');
    const profile = await makeRequest('/api/auth/me', 'GET', null, {
      'Authorization': 'Bearer ' + token
    });
    
    if (profile.status === 200) {
      log('   ✅ Profile retrieved successfully!', 'green');
      log('   Username: ' + profile.data.user.username, 'gray');
      log('   Email: ' + profile.data.user.email, 'gray');
      log('   Active: ' + profile.data.user.is_active, 'gray');
      log('   Roles: ' + profile.data.user.roles.join(', '), 'gray');
      log('   Permissions: ' + profile.data.user.permissions.length + ' permissions', 'gray');
      testResults.push({ name: 'Get Profile', passed: true });
    } else {
      log('   ❌ Get Profile failed!', 'red');
      testResults.push({ name: 'Get Profile', passed: false });
    }

    // Test 5: Invalid Token
    log('\n5. Testing Invalid Token...', 'yellow');
    try {
      const invalid = await makeRequest('/api/auth/me', 'GET', null, {
        'Authorization': 'Bearer invalid_token_here'
      });
      if (invalid.status === 401) {
        log('   ✅ Invalid token correctly rejected (401)', 'green');
        testResults.push({ name: 'Invalid Token Rejection', passed: true });
      } else {
        log('   ❌ Invalid token was accepted (BUG!)', 'red');
        testResults.push({ name: 'Invalid Token Rejection', passed: false });
      }
    } catch (e) {
      log('   ✅ Invalid token correctly rejected', 'green');
      testResults.push({ name: 'Invalid Token Rejection', passed: true });
    }

    // Test 6: Register New User
    log('\n6. Testing User Registration...', 'yellow');
    const timestamp = Date.now();
    const registerData = {
      username: 'testuser_' + timestamp,
      email: 'testuser_' + timestamp + '@example.com',
      password: 'test123456',
      full_name: 'Test User ' + timestamp
    };
    
    const register = await makeRequest('/api/auth/register', 'POST', registerData);
    if (register.status === 201 || register.status === 200) {
      log('   ✅ User registered successfully!', 'green');
      log('   Username: ' + register.data.user.username, 'gray');
      log('   Email: ' + register.data.user.email, 'gray');
      testResults.push({ name: 'User Registration', passed: true });
    } else {
      log('   ❌ Registration failed!', 'red');
      log('   Error: ' + JSON.stringify(register.data), 'red');
      testResults.push({ name: 'User Registration', passed: false });
    }

    // Summary
    log('\n========================================', 'cyan');
    log('   Test Summary', 'cyan');
    log('========================================', 'cyan');
    
    const passed = testResults.filter(t => t.passed).length;
    const total = testResults.length;
    
    testResults.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      const color = test.passed ? 'green' : 'red';
      log(`${icon} ${test.name}`, color);
    });
    
    log('\n' + passed + ' / ' + total + ' tests passed', passed === total ? 'green' : 'yellow');
    
    if (passed === total) {
      log('\n🎉 Week 2 - Backend API + Auth: COMPLETE!\n', 'green');
    } else {
      log('\n⚠️  Some tests failed - please review!\n', 'yellow');
    }

  } catch (error) {
    log('\n❌ Test execution failed!', 'red');
    log('Error: ' + error.message, 'red');
    log('\n⚠️  Make sure the server is running: npm run dev\n', 'yellow');
    process.exit(1);
  }
}

runTests();
