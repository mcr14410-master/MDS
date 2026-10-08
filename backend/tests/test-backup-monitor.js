/**
 * Tests für backupMonitor (Größe, Endmarke, Alter, Fehlerfälle)
 * Ausführen: node backend/tests/test-backup-monitor.js
 */
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { checkBackupStatus, validateBackup, END_MARKER } = require('../src/services/backupMonitor');

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

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-09T03:00:00Z');

// Zufallsdaten, damit gzip die Mindestgröße nicht wegkomprimiert
const body = () => crypto.randomBytes(30000).toString('base64');
const VALID = () => `-- PostgreSQL database dump\n${body()}\n-- ${END_MARKER}\n\n\\unrestrict abc\n`;
const NO_MARKER = () => `-- PostgreSQL database dump\n${body()}\n`;

const tempDirs = [];
function makeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mds-backup-test-'));
  tempDirs.push(dir);
  for (const f of files) {
    const p = path.join(dir, f.name);
    fs.writeFileSync(p, f.raw !== undefined ? f.raw : zlib.gzipSync(f.content));
    const t = new Date(NOW - f.ageHours * HOUR);
    fs.utimesSync(p, t, t);
  }
  return dir;
}
const EMPTY_GZ = zlib.gzipSync(''); // 20 Bytes – wie die kaputten Nacht-Backups

console.log('validateBackup');

test('vollständiger Dump ist gültig', () => {
  const dir = makeDir([{ name: 'mds_backup_a.sql.gz', content: VALID(), ageHours: 1 }]);
  const p = path.join(dir, 'mds_backup_a.sql.gz');
  assert.equal(validateBackup(p, fs.statSync(p).size).valid, true);
});

test('leere gzip-Datei (20 Bytes) ist ungültig', () => {
  const dir = makeDir([{ name: 'mds_backup_a.sql.gz', raw: EMPTY_GZ, ageHours: 1 }]);
  const p = path.join(dir, 'mds_backup_a.sql.gz');
  const r = validateBackup(p, fs.statSync(p).size);
  assert.equal(r.valid, false);
  assert.match(r.reason, /zu klein/);
});

test('Dump ohne Endmarke ist ungültig', () => {
  const dir = makeDir([{ name: 'mds_backup_a.sql.gz', content: NO_MARKER(), ageHours: 1 }]);
  const p = path.join(dir, 'mds_backup_a.sql.gz');
  assert.match(validateBackup(p, fs.statSync(p).size).reason, /Endmarke/);
});

test('kaputte gzip-Datei ist ungültig (kein Absturz)', () => {
  const dir = makeDir([{ name: 'mds_backup_a.sql.gz', raw: crypto.randomBytes(20000), ageHours: 1 }]);
  const p = path.join(dir, 'mds_backup_a.sql.gz');
  assert.match(validateBackup(p, fs.statSync(p).size).reason, /nicht lesbar/);
});

console.log('checkBackupStatus');

test('aktuelles gültiges Backup → ok', () => {
  const dir = makeDir([
    { name: 'mds_backup_new.sql.gz', content: VALID(), ageHours: 1 },
    { name: 'mds_backup_old.sql.gz', raw: EMPTY_GZ, ageHours: 25 },
  ]);
  const r = checkBackupStatus(dir, NOW);
  assert.equal(r.status, 'ok');
  assert.equal(r.backup_count, 2);
  assert.equal(r.valid_count, 1);
  assert.equal(r.latest.name, 'mds_backup_new.sql.gz');
});

test('neuestes Backup leer → Fehler, nennt letztes gültiges', () => {
  const dir = makeDir([
    { name: 'mds_backup_new.sql.gz', raw: EMPTY_GZ, ageHours: 1 },
    { name: 'mds_backup_old.sql.gz', content: VALID(), ageHours: 25 },
  ]);
  assert.throws(() => checkBackupStatus(dir, NOW), /ungültig: mds_backup_new.*zu klein.*Letztes gültiges Backup: mds_backup_old/);
});

test('nur leere Backups (Zustand bis 2.7.0) → Fehler „Letztes gültiges: keins“', () => {
  const dir = makeDir([1, 25, 49].map((h, i) => ({ name: `mds_backup_${i}.sql.gz`, raw: EMPTY_GZ, ageHours: h })));
  assert.throws(() => checkBackupStatus(dir, NOW), /Letztes gültiges Backup: keins/);
});

test('gültiges Backup älter als 26 h → Fehler', () => {
  const dir = makeDir([{ name: 'mds_backup_a.sql.gz', content: VALID(), ageHours: 30 }]);
  assert.throws(() => checkBackupStatus(dir, NOW), /30 h alt/);
});

test('keine Backups → Fehler', () => {
  const dir = makeDir([]);
  assert.throws(() => checkBackupStatus(dir, NOW), /Keine Backups gefunden/);
});

test('Verzeichnis fehlt (Volume nicht gemountet) → Fehler', () => {
  assert.throws(() => checkBackupStatus(path.join(os.tmpdir(), 'gibt-es-nicht-mds'), NOW), /Backup-Verzeichnis .* nicht gefunden/);
});

console.log(`\n${passed} Tests bestanden`);
