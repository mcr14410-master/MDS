/**
 * Tests für agentReport (Bericht des MDS-Agenten prüfen, Statuswechsel ableiten)
 * Ausführen: node backend/tests/test-agent-report.js
 */
const assert = require('node:assert/strict');
const {
  validRelPath, validateReport, nextStatus, triggeredBy, LIMITS,
} = require('../src/services/agentReport');

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

const OWN = new Set([1, 2]);
const NOW = new Date('2026-11-02T10:00:00+01:00');
const HASH = 'a'.repeat(64);
const UUID1 = '11111111-1111-4111-8111-111111111111';
const file = (over = {}) => ({ target: 'program_dir', rel_path: 'TEIL-0001\\M1\\M1.prg', deployment_id: 1, file_id: 10, local_hash: HASH, state: 'current', ...over });
const transfer = (over = {}) => ({ client_id: UUID1, deployment_id: 1, file_id: 10, filename: 'M1.prg', direction: 'to_device', result: 'ok', file_hash: HASH, occurred_at: '2026-11-02T09:00:00+01:00', ...over });

test('Pfad: relativ, ohne Laufwerk und ohne ..', () => {
  assert.equal(validRelPath('TEIL-0001\\M1\\Kalibrierung\\M1_KAL.prg'), true);
  assert.equal(validRelPath('M1.xlsx'), true);
  assert.equal(validRelPath('C:\\Windows\\x'), false);
  assert.equal(validRelPath('\\\\server\\share\\x'), false);
  assert.equal(validRelPath('/etc/passwd'), false);
  assert.equal(validRelPath('TEIL\\..\\..\\x'), false);
  assert.equal(validRelPath('TEIL\\\\x'), false);
  assert.equal(validRelPath(''), false);
  assert.equal(validRelPath('x'.repeat(501)), false);
});

test('Leerer Bericht ist gültig', () => {
  const { report, ignored } = validateReport({}, OWN, NOW);
  assert.deepEqual(report, { files: [], transfers: [], deployments: [], warnings: [] });
  assert.deepEqual(ignored, []);
});

test('Dateien: gültige übernommen, fehlerhafte einzeln verworfen', () => {
  const { report, ignored } = validateReport({
    files: [
      file(),
      file({ rel_path: '..\\x' }),
      file({ state: 'kaputt' }),
      file({ target: 'desktop' }),
      file({ deployment_id: 99 }),
      file({ local_hash: 'xyz' }),
      file({ file_id: 'abc' }),
      'Unsinn',
    ],
  }, OWN, NOW);
  assert.equal(report.files.length, 1);
  assert.deepEqual(ignored.map(i => i.reason),
    ['ungültiger Pfad', 'unbekannter Zustand', 'unbekanntes Ziel', 'fremde Bereitstellung', 'ungültiger Hash', 'ungültige ID', 'kein Objekt']);
});

test('Dateien: gleicher Pfad (ohne Groß-/Kleinschreibung) nur einmal, der letzte gilt', () => {
  const { report } = validateReport({ files: [file({ state: 'pending' }), file({ rel_path: 'teil-0001\\m1\\M1.PRG', state: 'run_saved' })] }, OWN, NOW);
  assert.equal(report.files.length, 1);
  assert.equal(report.files[0].state, 'run_saved');
});

test('Dateien: fremde Datei ohne Bereitstellung und ohne file_id erlaubt (unknown)', () => {
  const { report } = validateReport({ files: [file({ deployment_id: null, file_id: null, state: 'unknown', local_hash: null })] }, OWN, NOW);
  assert.equal(report.files[0].state, 'unknown');
});

test('Transfers: UUID Pflicht, doppelte client_id im Bericht verworfen, Zeit nicht in der Zukunft', () => {
  const { report, ignored } = validateReport({
    transfers: [
      transfer(),
      transfer(),
      transfer({ client_id: 'nicht-uuid' }),
      transfer({ client_id: '22222222-2222-4222-8222-222222222222', direction: 'gelöscht' }),
      transfer({ client_id: '33333333-3333-4333-8333-333333333333', occurred_at: '2027-01-01T00:00:00Z' }),
      transfer({ client_id: '44444444-4444-4444-8444-444444444444', occurred_at: 'gestern' }),
    ],
  }, OWN, NOW);
  assert.equal(report.transfers.length, 2);
  assert.equal(report.transfers[1].occurred_at.getTime(), NOW.getTime());
  assert.deepEqual(ignored.map(i => i.reason),
    ['client_id doppelt im Bericht', 'client_id fehlt oder ist keine UUID', 'unbekannte Richtung', 'occurred_at fehlt oder ungültig']);
});

test('Grenzen: zu viele Einträge → Rest beim nächsten Bericht', () => {
  const many = Array.from({ length: LIMITS.files + 3 }, (_, i) => file({ rel_path: `T\\M\\f${i}.pdf` }));
  const { report, ignored } = validateReport({ files: many }, OWN, NOW);
  assert.equal(report.files.length, LIMITS.files);
  assert.match(ignored[0].reason, /Rest beim nächsten Bericht/);
});

test('Bereitstellungen: nur eigene, activity_at gekappt; Warnungen und Selbsttest', () => {
  const { report, ignored } = validateReport({
    deployments: [{ id: 1, activity_at: '2026-11-02T09:30:00+01:00' }, { id: 2, closed: true }, { id: 99 }],
    warnings: [{ code: 'conflict', deployment_id: 1, text: 'Vorlage liegt schon da' }, { text: '' }],
    self_test: { program_dir_ok: true, template_dir_writable: false },
  }, OWN, NOW);
  assert.deepEqual(report.deployments.map(d => [d.id, d.closed]), [[1, false], [2, true]]);
  assert.equal(ignored.filter(i => i.kind === 'deployments').length, 1);
  assert.deepEqual(report.warnings.map(w => w.code), ['conflict', 'self_test']);
  assert.match(report.warnings[1].text, /template_dir_writable/);
});

test('Status: requested → active erst, wenn alle Soll-Dateien current oder run_saved', () => {
  const d = { status: 'requested' };
  assert.equal(nextStatus(d, [10, 11], [{ file_id: 10, state: 'current' }], false).status, null);
  assert.equal(nextStatus(d, [10, 11], [{ file_id: 10, state: 'current' }, { file_id: 11, state: 'locked' }], false).status, null);
  assert.equal(nextStatus(d, [10, 11], [{ file_id: 10, state: 'current' }, { file_id: 11, state: 'run_saved' }], false).status, 'active');
  assert.equal(nextStatus(d, [], [], false).status, null);
});

test('Status: closing → closed nur ohne verwaltete, bearbeitete oder beschädigte Dateien', () => {
  const d = { status: 'closing' };
  assert.equal(nextStatus(d, [10], [], true).status, 'closed');
  assert.equal(nextStatus(d, [10], [{ file_id: null, state: 'unknown' }], true).status, 'closed');
  assert.equal(nextStatus(d, [10], [{ file_id: 10, state: 'modified' }], true).status, null);
  assert.equal(nextStatus(d, [10], [{ file_id: null, state: 'corrupt' }], true).status, null);
  assert.match(nextStatus(d, [10], [{ file_id: 10, state: 'locked' }], true).warning, /bleibt beim Abschließen/);
  assert.equal(nextStatus(d, [10], [], false).status, null);
});

test('Status: closed gemeldet, aber nicht beim Abschließen → ignoriert mit Warnung', () => {
  const r = nextStatus({ status: 'active' }, [10], [], true);
  assert.equal(r.status, null);
  assert.match(r.warning, /nicht beim Abschließen/);
});

test('Auslöser im Protokoll', () => {
  const d = { requested_by: 1, close_requested_by: 2, discard_local_by: 3 };
  assert.equal(triggeredBy('to_device', d), 1);
  assert.equal(triggeredBy('to_device', d, 7), 7);
  assert.equal(triggeredBy('removed', d), 2);
  assert.equal(triggeredBy('discarded_run_save', d), 2);
  assert.equal(triggeredBy('discarded', d), 3);
  assert.equal(triggeredBy('removed', { ...d, close_requested_by: null }), null);
  assert.equal(triggeredBy('to_device', null), null);
});

console.log(`\n${passed} Tests bestanden`);
