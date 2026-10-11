/**
 * Tests für utils/pdfResponse (Fehler mitten im gestreamten PDF)
 * Ausführen: node backend/tests/test-pdf-response.js
 *
 * Startet je Szenario einen kleinen Express-Server als Kindprozess, damit ein Absturz
 * (altes Muster) den Test selbst nicht beendet.
 */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const SERVER = `
const express = require('express');
const PDFDocument = require('pdfkit');
const { pipePdf, abortPdfResponse } = require(${JSON.stringify(path.join(__dirname, '../src/utils/pdfResponse'))});
const mode = process.argv[1];
const app = express();

app.get('/pdf', async (req, res) => {
  try {
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    if (req.query.early) throw new Error('Fehler vor dem Stream');
    if (mode === 'old') doc.pipe(res); else pipePdf(doc, res);
    doc.text('Seite 1');
    await new Promise(r => setTimeout(r, 20));
    throw new Error('Fehler mitten im PDF');
  } catch (error) {
    if (mode !== 'old' && abortPdfResponse(res)) return;
    res.status(500).json({ error: 'Fehler beim Erstellen des Exports' });
  }
});
app.get('/ok', (req, res) => res.json({ ok: true }));

const server = app.listen(0, () => console.log('PORT ' + server.address().port));
`;

function startServer(mode) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', SERVER, mode], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe']
    });
    child.exited = new Promise(r => child.on('exit', code => r(code)));
    child.stdout.on('data', d => {
      const m = String(d).match(/PORT (\d+)/);
      if (m) resolve({ child, port: Number(m[1]) });
    });
    child.on('error', reject);
  });
}

function get(port, urlPath) {
  return new Promise(resolve => {
    const req = http.get({ port, path: urlPath }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString(), complete: res.complete }));
      res.on('error', err => resolve({ status: res.statusCode, error: err.code || err.message }));
      res.on('aborted', () => resolve({ status: res.statusCode, error: 'aborted' }));
    });
    req.on('error', err => resolve({ error: err.code || err.message }));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
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

(async () => {
  console.log('pdfResponse');

  await test('altes Muster (doc.pipe + res.json im catch) bringt den Prozess zum Absturz', async () => {
    const { child, port } = await startServer('old');
    await get(port, '/pdf');
    const code = await Promise.race([child.exited, sleep(2000).then(() => 'läuft')]);
    if (code === 'läuft') child.kill();
    assert.notEqual(code, 'läuft', 'Prozess hätte abstürzen müssen');
  });

  await test('neues Muster: Fehler mitten im PDF → Verbindung abgebrochen, Prozess läuft weiter', async () => {
    const { child, port } = await startServer('new');
    try {
      const r = await get(port, '/pdf');
      assert.ok(r.error || r.complete === false, `Antwort hätte abgebrochen sein müssen: ${JSON.stringify(r)}`);
      await sleep(300);
      assert.equal(child.exitCode, null, 'Prozess ist abgestürzt');
      const ok = await get(port, '/ok');
      assert.equal(ok.status, 200);
    } finally {
      child.kill();
    }
  });

  await test('neues Muster: Fehler vor dem Stream → weiterhin 500 mit JSON', async () => {
    const { child, port } = await startServer('new');
    try {
      const r = await get(port, '/pdf?early=1');
      assert.equal(r.status, 500);
      assert.deepEqual(JSON.parse(r.body), { error: 'Fehler beim Erstellen des Exports' });
    } finally {
      child.kill();
    }
  });

  console.log(`\n${passed} Tests bestanden`);
})();
