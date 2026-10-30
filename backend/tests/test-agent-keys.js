/**
 * Tests für agentKeys (API-Schlüssel, Module, Eingaben des MDS-Agenten)
 * Ausführen: node backend/tests/test-agent-keys.js
 */
const assert = require('node:assert/strict');
const {
  generateApiKey, hashApiKey, displayPrefix, looksLikeApiKey, cleanAgentVersion, validateAgentInput,
} = require('../src/services/agentKeys');

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

test('Schlüssel: Präfix mdsa_, 32 Bytes base64url, jedes Mal anders', () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.match(a, /^mdsa_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test('Hash: SHA-256 hex, gleich für gleichen Schlüssel', () => {
  const key = generateApiKey();
  assert.match(hashApiKey(key), /^[0-9a-f]{64}$/);
  assert.equal(hashApiKey(key), hashApiKey(key));
  assert.notEqual(hashApiKey(key), hashApiKey(key + 'x'));
});

test('Anzeige: nur die ersten 12 Zeichen', () => {
  assert.equal(displayPrefix('mdsa_abcdefghijklmnop'), 'mdsa_abcdefg');
});

test('Formprüfung: fremde Header gar nicht erst suchen', () => {
  assert.equal(looksLikeApiKey(generateApiKey()), true);
  assert.equal(looksLikeApiKey(undefined), false);
  assert.equal(looksLikeApiKey(''), false);
  assert.equal(looksLikeApiKey('Bearer eyJhbGciOi…'), false);
  assert.equal(looksLikeApiKey('mdsa_kurz'), false);
  assert.equal(looksLikeApiKey('mdsa_' + 'x'.repeat(200)), false);
});

test('Agent-Version: nur Versionsform übernehmen', () => {
  assert.equal(cleanAgentVersion('1.0.0'), '1.0.0');
  assert.equal(cleanAgentVersion('1.2.0-beta+3'), '1.2.0-beta+3');
  assert.equal(cleanAgentVersion(undefined), null);
  assert.equal(cleanAgentVersion('1.0; DROP TABLE'), null);
  assert.equal(cleanAgentVersion('1'.repeat(21)), null);
});

test('Anlegen: Name Pflicht, getrimmt', () => {
  assert.deepEqual(validateAgentInput({}, true).errors, ['Name fehlt']);
  assert.deepEqual(validateAgentInput({ name: '   ' }, true).errors, ['Name fehlt']);
  assert.equal(validateAgentInput({ name: '  Mess-PC ' }, true).values.name, 'Mess-PC');
  assert.equal(validateAgentInput({ name: 'x'.repeat(101) }, true).errors.length, 1);
});

test('Ändern: nur übergebene Felder, machine_id lässt sich leeren', () => {
  assert.deepEqual(validateAgentInput({ machine_id: null }), { values: { machine_id: null }, errors: [] });
  assert.deepEqual(validateAgentInput({ machine_id: '7' }).values, { machine_id: 7 });
  assert.equal(validateAgentInput({ machine_id: 'abc' }).errors.length, 1);
  assert.deepEqual(validateAgentInput({}).values, {});
});

test('Module: nur bekannte, Doppelte zusammengefasst', () => {
  assert.deepEqual(validateAgentInput({ modules: ['cmm_sync', 'cmm_sync'] }).values.modules, ['cmm_sync']);
  assert.deepEqual(validateAgentInput({ modules: [] }).values.modules, []);
  assert.match(validateAgentInput({ modules: ['topsolid'] }).errors[0], /Unbekannte Module: topsolid/);
  assert.match(validateAgentInput({ modules: 'cmm_sync' }).errors[0], /Liste/);
});

test('Intervall 5–3600 s, is_active nur boolean', () => {
  assert.equal(validateAgentInput({ poll_interval_sec: 30 }).values.poll_interval_sec, 30);
  assert.equal(validateAgentInput({ poll_interval_sec: 4 }).errors.length, 1);
  assert.equal(validateAgentInput({ poll_interval_sec: 3601 }).errors.length, 1);
  assert.equal(validateAgentInput({ poll_interval_sec: 2.5 }).errors.length, 1);
  assert.equal(validateAgentInput({ is_active: false }).values.is_active, false);
  assert.equal(validateAgentInput({ is_active: 'false' }).errors.length, 1);
});

console.log(`\n${passed} Tests bestanden`);
