/**
 * Tests für den Ablauf „Übernehmen“ des Altbestand-Imports (Wiederaufnahme, Freigabe)
 * Modul liegt im Frontend (reines ES-Modul): frontend/src/utils/legacyImport/runImport.js
 * Die MDS-Schnittstellen werden durch eine Fake-API im Speicher ersetzt.
 * Ausführen: node backend/tests/test-legacy-import-run.js
 */
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const STATES = [
  { id: 1, name: 'draft' }, { id: 2, name: 'review' }, { id: 3, name: 'approved' },
  { id: 4, name: 'released' }, { id: 5, name: 'rejected' }, { id: 6, name: 'archived' },
];
const ALLOWED = { draft: ['review', 'archived'], review: ['approved', 'rejected', 'draft'], approved: ['released', 'draft'], released: ['archived'], rejected: ['draft', 'archived'] };
const CMM = 10;

// MDS im Speicher – nur so viel, wie der Ablauf braucht
class FakeApi {
  constructor() {
    this.calls = [];
    this.nextId = 100;
    this.parts = [];
    this.ops = [];
    this.programs = [];
    this.sheets = [];
    this.docs = [];
    this.fail = null; // { method, nth }
    this.validDryRun = true;
  }
  log(method, extra) {
    this.calls.push(extra ? `${method}:${extra}` : method);
    const same = this.calls.filter(c => c.split(':')[0] === method).length;
    if (this.fail && this.fail.method === method && this.fail.nth === same) throw new Error(`Fehler bei ${method}`);
  }
  id() { return this.nextId++; }
  async listOperations(partId) { return this.ops.filter(o => o.part_id === partId); }
  async listCmmPrograms(opId) { return this.programs.filter(p => p.operation_id === opId); }
  async listSetupSheets(opId) { return this.sheets.filter(s => s.operation_id === opId); }
  async getSetupSheet(id) { const s = this.sheets.find(x => x.id === id); return { ...s, photos: s.photos.map(file_name => ({ file_name })) }; }
  async listPartDocuments(partId) { return this.docs.filter(d => d.part_id === partId); }
  async dryRunCmm(args) { this.log('dryRunCmm'); this.lastDryRun = args; return { valid: this.validDryRun, errors: this.validDryRun ? [] : ['Keine .prg'] }; }
  async createPart(body) { this.log('createPart'); this.lastPart = body; const p = { id: this.id(), ...body }; this.parts.push(p); return p; }
  async createOperation(body) { this.log('createOperation'); this.lastOp = body; const o = { id: this.id(), sequence: 10, ...body }; this.ops.push(o); return o; }
  async createCmmProgram(body) {
    this.log('createCmmProgram'); this.lastProgram = body;
    const p = { id: this.id(), operation_id: body.operation_id, description: body.description, workflow_state: 'draft' }; this.programs.push(p);
    return { program: p };
  }
  async createSetupSheet(body) { this.log('createSetupSheet'); const s = { id: this.id(), operation_id: body.operation_id, workflow_state: 'draft', photos: [] }; this.sheets.push(s); return s; }
  async uploadSetupPhoto(sheetId, file) {
    this.log('uploadSetupPhoto');
    const s = this.sheets.find(x => x.id === sheetId);
    s.photos.push(file.name);
    if (s.workflow_state !== 'draft') s.workflow_state = 'draft'; // Rückfall auf Entwurf wie im MDS
  }
  async uploadPartDocument(partId, file, opts) {
    this.log('uploadPartDocument');
    this.docs.push({ part_id: partId, original_filename: file.name, document_type: opts.document_type, is_primary_cad: Boolean(opts.is_primary_cad) });
  }
  async workflowChange({ entityType, entityId, toStateId, changeReason }) {
    this.log('workflowChange', entityType);
    this.lastReason = changeReason;
    const to = STATES.find(s => s.id === toStateId).name;
    const list = entityType === 'program' ? this.programs : this.sheets;
    const e = list.find(x => x.id === entityId);
    if (!(ALLOWED[e.workflow_state] || []).includes(to)) throw new Error(`Schritt ${e.workflow_state} → ${to} nicht erlaubt`);
    e.workflow_state = to;
  }
}

const item = (p) => ({ path: p, file: { name: p.split('/').pop() } });
const base = 'KMG/KD00000 FIRMA/HG_TEIL-0001_A_Halter Links';
const parsed = (over = {}) => ({
  key: 'KD00000 FIRMA/HG_TEIL-0001_A_Halter Links',
  customerFolder: 'KD00000 FIRMA',
  programFolder: 'HG_TEIL-0001_A_Halter Links',
  errors: [],
  files: {
    program: [item(`${base}/01/TEIL-0001.prg`), item(`${base}/01/TEIL-0001.cad`)],
    template: [item(`${base}/01/T.xlsx`), item(`${base}/01/T.layout.xml`)],
    calibration: [item(`${base}/04/Kal.prg`)],
    photos: [item(`${base}/03/01/a.jpg`), item(`${base}/03/01/b.jpg`), item(`${base}/03/01/c.jpg`)],
    drawingPdf: [item(`${base}/03/02/TEIL-0001.pdf`)],
    drawingOther: [item(`${base}/03/02/TEIL-0001.tif`)],
    cad: [item(`${base}/03/04/TEIL-0001.stp`)],
  },
  ...over,
});
const row = (over = {}) => ({
  parsed: parsed(), customerId: 1, partChoice: 'new', customerPartNumber: 'TEIL-0001', revision: 'A', name: 'Halter Links', ...over,
});
const settings = {
  cmmMachineId: CMM,
  opDefaults: { op_number: 'KMG', op_name: 'Messen', operation_type_id: 7, enabled_features: ['programs', 'setup_sheet', 'documents'] },
  workflowStates: STATES,
};
const methods = (api) => api.calls;

(async () => {
  const m = await import(pathToFileURL(path.join(__dirname, '../../frontend/src/utils/legacyImport/runImport.js')).href);

  console.log('\nAltbestand-Import: Ablauf Übernehmen');

  await test('releasePath: Schritte bis Freigegeben', () => {
    assert.deepEqual(m.releasePath('draft'), ['review', 'approved', 'released']);
    assert.deepEqual(m.releasePath('review'), ['approved', 'released']);
    assert.deepEqual(m.releasePath('approved'), ['released']);
    assert.deepEqual(m.releasePath('released'), []);
    assert.equal(m.releasePath('rejected'), null);
    assert.equal(m.releasePath('archived'), null);
  });

  await test('Texte aus der Spec', () => {
    assert.equal(m.RELEASE_REASON, 'Erstimport Altbestand');
    assert.equal(m.importComment(parsed()), 'Erstimport aus Altbestand (Ordner KD00000 FIRMA\\HG_TEIL-0001_A_Halter Links)');
  });

  await test('Neues Programm mit Freigabe: Reihenfolge und Inhalte', async () => {
    const api = new FakeApi();
    const r = await m.importProgram({ row: row(), settings, api, release: true });
    assert.equal(r.ok, true, JSON.stringify(r.steps));
    assert.deepEqual(methods(api), [
      'dryRunCmm', 'createPart', 'createOperation', 'createCmmProgram', 'createSetupSheet',
      'uploadSetupPhoto', 'uploadSetupPhoto', 'uploadSetupPhoto', 'uploadPartDocument', 'uploadPartDocument',
      'workflowChange:program', 'workflowChange:program', 'workflowChange:program',
      'workflowChange:setup_sheet', 'workflowChange:setup_sheet', 'workflowChange:setup_sheet',
    ]);
    assert.equal(api.lastReason, 'Erstimport Altbestand');
    assert.equal('part_number' in api.lastPart, false);
    assert.deepEqual(api.lastPart, { customer_id: 1, customer_part_number: 'TEIL-0001', part_name: 'Halter Links', revision: 'A' });
    assert.equal(api.lastOp.machine_id, CMM);
    assert.equal(api.lastOp.op_number, 'KMG');
    assert.equal(api.lastProgram.comment, 'Erstimport aus Altbestand (Ordner KD00000 FIRMA\\HG_TEIL-0001_A_Halter Links)');
    assert.equal(api.lastProgram.program_name, 'Halter Links');
    assert.deepEqual(api.lastProgram.files.map(f => f.name), ['TEIL-0001.prg', 'TEIL-0001.cad', 'TEIL-0001.pdf']);
    assert.deepEqual(api.lastProgram.templateFiles.map(f => f.name), ['T.xlsx', 'T.layout.xml']);
    assert.deepEqual(api.lastProgram.calibrationFiles.map(f => f.name), ['Kal.prg']);
    assert.deepEqual(api.lastDryRun.files.map(f => f.name), ['TEIL-0001.prg', 'TEIL-0001.cad', 'TEIL-0001.pdf']);
    const stp = api.docs.find(d => d.original_filename === 'TEIL-0001.stp');
    const tif = api.docs.find(d => d.original_filename === 'TEIL-0001.tif');
    assert.equal(stp.document_type, 'cad_model');
    assert.equal(stp.is_primary_cad, true);
    assert.equal(tif.document_type, 'drawing');
    assert.equal(api.programs[0].workflow_state, 'released');
    assert.equal(api.sheets[0].workflow_state, 'released');
    assert.deepEqual(r.steps.map(s => s.key), [
      'probelauf', 'bauteil', 'arbeitsgang', 'messprogramm', 'einrichteblatt', 'fotos', 'dokumente',
      'freigabe_programm', 'freigabe_einrichteblatt',
    ]);
    assert.ok(r.steps.every(s => s.status === 'done'), JSON.stringify(r.steps));
  });

  await test('Probelauf ungültig: nichts wird angelegt', async () => {
    const api = new FakeApi();
    api.validDryRun = false;
    const r = await m.importProgram({ row: row(), settings, api, release: true });
    assert.equal(r.ok, false);
    assert.deepEqual(methods(api), ['dryRunCmm']);
    assert.equal(r.steps[0].key, 'probelauf');
    assert.equal(r.steps[0].status, 'error');
    assert.match(r.steps[0].message, /Keine \.prg/);
  });

  await test('Wiederaufnahme: Programm freigegeben, Einrichteblatt fehlt', async () => {
    const api = new FakeApi();
    api.parts.push({ id: 1 });
    api.ops.push({ id: 2, part_id: 1, machine_id: CMM, sequence: 10 });
    api.programs.push({ id: 3, operation_id: 2, workflow_state: 'released' });
    api.docs.push({ part_id: 1, original_filename: 'TEIL-0001.stp', is_primary_cad: true },
      { part_id: 1, original_filename: 'TEIL-0001.tif', is_primary_cad: false });
    const r = await m.importProgram({ row: row({ partChoice: 1 }), settings, api, release: true });
    assert.equal(r.ok, true, JSON.stringify(r.steps));
    assert.deepEqual(methods(api), [
      'createSetupSheet', 'uploadSetupPhoto', 'uploadSetupPhoto', 'uploadSetupPhoto',
      'workflowChange:setup_sheet', 'workflowChange:setup_sheet', 'workflowChange:setup_sheet',
    ]);
    const status = Object.fromEntries(r.steps.map(s => [s.key, s.status]));
    assert.equal(status.probelauf, 'skipped');
    assert.equal(status.messprogramm, 'skipped');
    assert.equal(status.freigabe_programm, 'skipped');
  });

  await test('Fehler beim zweiten Foto, zweiter Lauf ergänzt den Rest', async () => {
    const api = new FakeApi();
    api.fail = { method: 'uploadSetupPhoto', nth: 2 };
    const first = await m.importProgram({ row: row(), settings, api, release: false });
    assert.equal(first.ok, false);
    const fotos = first.steps.find(s => s.key === 'fotos');
    assert.equal(fotos.status, 'error');
    assert.match(fotos.message, /Fehler bei uploadSetupPhoto/);
    assert.equal(api.sheets[0].photos.length, 1);
    api.fail = null;
    api.calls = [];
    const second = await m.importProgram({ row: row({ partChoice: first.partId }), settings, api, release: false });
    assert.equal(second.ok, true, JSON.stringify(second.steps));
    assert.deepEqual(api.sheets[0].photos, ['a.jpg', 'b.jpg', 'c.jpg']);
    assert.equal(api.calls.filter(c => c === 'uploadSetupPhoto').length, 2);
    assert.equal(api.calls.filter(c => c.startsWith('create')).length, 0);
  });

  await test('Ohne Freigabe: kein Statuswechsel', async () => {
    const api = new FakeApi();
    const r = await m.importProgram({ row: row(), settings, api, release: false });
    assert.equal(r.ok, true);
    assert.equal(api.calls.some(c => c.startsWith('workflowChange')), false);
    assert.equal(r.steps.find(s => s.key === 'freigabe_programm').status, 'skipped');
  });

  await test('Programm abgelehnt: Freigabe von Hand', async () => {
    const api = new FakeApi();
    api.parts.push({ id: 1 });
    api.ops.push({ id: 2, part_id: 1, machine_id: CMM, sequence: 10 });
    api.programs.push({ id: 3, operation_id: 2, workflow_state: 'rejected' });
    const r = await m.importProgram({ row: row({ partChoice: 1 }), settings, api, release: true });
    assert.equal(r.ok, false);
    const step = r.steps.find(s => s.key === 'freigabe_programm');
    assert.equal(step.status, 'error');
    assert.match(step.message, /von Hand/);
  });

  await test('Überspringen: keine Aufrufe', async () => {
    const api = new FakeApi();
    const r = await m.importProgram({ row: row({ partChoice: 'skip' }), settings, api, release: true });
    assert.equal(r.ok, true);
    assert.deepEqual(api.calls, []);
    assert.ok(r.steps.every(s => s.status === 'skipped'));
  });

  await test('Bauteil nicht gewählt: Fehler ohne Aufrufe', async () => {
    const api = new FakeApi();
    const r = await m.importProgram({ row: row({ partChoice: null }), settings, api, release: true });
    assert.equal(r.ok, false);
    assert.deepEqual(api.calls, []);
    assert.equal(r.steps[0].status, 'error');
  });

  await test('Vorhandenes Haupt-CAD bleibt Haupt-CAD', async () => {
    const api = new FakeApi();
    api.parts.push({ id: 1 });
    api.docs.push({ part_id: 1, original_filename: 'ALT.stp', is_primary_cad: true });
    const r = await m.importProgram({ row: row({ partChoice: 1 }), settings, api, release: false });
    assert.equal(r.ok, true, JSON.stringify(r.steps));
    assert.equal(api.docs.find(d => d.original_filename === 'TEIL-0001.stp').is_primary_cad, false);
  });

  await test('Blatt freigegeben, Foto fehlt: Rückfall auf Entwurf, dann neu freigegeben', async () => {
    const api = new FakeApi();
    api.parts.push({ id: 1 });
    api.ops.push({ id: 2, part_id: 1, machine_id: CMM, sequence: 10 });
    api.programs.push({ id: 3, operation_id: 2, workflow_state: 'released' });
    api.sheets.push({ id: 4, operation_id: 2, workflow_state: 'released', photos: ['a.jpg', 'b.jpg'] });
    api.docs.push({ part_id: 1, original_filename: 'TEIL-0001.stp', is_primary_cad: true },
      { part_id: 1, original_filename: 'TEIL-0001.tif', is_primary_cad: false });
    const r = await m.importProgram({ row: row({ partChoice: 1 }), settings, api, release: true });
    assert.equal(r.ok, true, JSON.stringify(r.steps));
    assert.deepEqual(api.calls, ['uploadSetupPhoto',
      'workflowChange:setup_sheet', 'workflowChange:setup_sheet', 'workflowChange:setup_sheet']);
    assert.equal(api.sheets[0].workflow_state, 'released');
  });

  await test('loadImportState: Stand eines Bauteils', async () => {
    const api = new FakeApi();
    api.ops.push({ id: 2, part_id: 1, machine_id: CMM, sequence: 10 }, { id: 5, part_id: 1, machine_id: 99, sequence: 5 });
    api.programs.push({ id: 3, operation_id: 2, workflow_state: 'review' });
    api.sheets.push({ id: 4, operation_id: 2, workflow_state: 'draft', photos: ['a.jpg'] });
    api.docs.push({ part_id: 1, original_filename: 'X.stp', is_primary_cad: true });
    const s = await m.loadImportState(api, 1, CMM);
    assert.deepEqual(s, {
      operationId: 2, programId: 3, programState: 'review', programSource: null, setupSheetId: 4, setupSheetState: 'draft',
      photoNames: ['a.jpg'], documentNames: ['X.stp'], hasPrimaryCad: true,
    });
    const none = await m.loadImportState(api, 1, 77);
    assert.equal(none.operationId, null);
    assert.deepEqual(none.documentNames, ['X.stp']);
  });

  await test('Messprogramm bekommt die Herkunft als Beschreibung', async () => {
    const api = new FakeApi();
    await m.importProgram({ row: row(), settings, api, release: false });
    assert.equal(api.lastProgram.description, 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Halter Links');
    const s = await m.loadImportState(api, api.parts[0].id, CMM);
    assert.equal(s.programSource, api.lastProgram.description);
  });

  await test('Messprogramm aus einem anderen Ordner: nichts anlegen, Fehler', async () => {
    const api = new FakeApi();
    api.ops.push({ id: 2, part_id: 1, machine_id: CMM, sequence: 10 });
    api.programs.push({ id: 3, operation_id: 2, workflow_state: 'draft', description: 'Altbestand: KD00000 FIRMA\\HG_TEIL-0001_A_Seite 2' });
    const r = await m.importProgram({ row: row({ partChoice: 1 }), settings, api, release: true });
    assert.equal(r.ok, false);
    assert.deepEqual(api.calls, []);
    const err = r.steps.find(s => s.status === 'error');
    assert.equal(err.key, 'messprogramm');
    assert.match(err.message, /„HG_TEIL-0001_A_Seite 2“.*von Hand/);
  });

  console.log(`\n${passed} Tests bestanden`);
})();
