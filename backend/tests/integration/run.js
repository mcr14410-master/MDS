/**
 * Integrations-Tests gegen eine Wegwerf-Datenbank
 * Ausführen: npm run test:integration   (im Ordner backend/, braucht Docker)
 *
 * Ablauf: eigener Container (postgres:16, nur 127.0.0.1, Daten im RAM) → alle Migrationen →
 * tests/integration/test-*.js → Container wird wieder entfernt (KEEP_TEST_DB=1 lässt ihn stehen).
 * Dev-DB und Produktion werden nie angefasst: Die Tests laufen nur gegen eine DB mit „test“ im Namen.
 */
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const CONTAINER = 'mds-test-db';
const PORT = process.env.TEST_DB_PORT || '5434';
const DB_NAME = 'mds_test';
const DB_USER = 'mds';
const DB_PASSWORD = crypto.randomBytes(12).toString('hex');
const BACKEND = path.join(__dirname, '..', '..');

const docker = (...args) => spawnSync('docker', args, { encoding: 'utf8' });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function removeContainer() {
  docker('rm', '-f', CONTAINER);
}

async function startDatabase() {
  removeContainer(); // Reste eines abgebrochenen Laufs
  const run = docker('run', '-d', '--rm', '--name', CONTAINER,
    '-p', `127.0.0.1:${PORT}:5432`,
    '--tmpfs', '/var/lib/postgresql/data',
    '-e', `POSTGRES_USER=${DB_USER}`, '-e', `POSTGRES_PASSWORD=${DB_PASSWORD}`, '-e', `POSTGRES_DB=${DB_NAME}`,
    'postgres:16');
  if (run.status !== 0) {
    throw new Error(`Test-Container startet nicht (Port ${PORT} belegt? Docker läuft?):\n${run.stderr}`);
  }
  // Während der Initialisierung lauscht Postgres nur auf dem Socket – erst danach auf TCP
  for (let i = 0; i < 60; i++) {
    const ready = docker('exec', CONTAINER, 'pg_isready', '-h', '127.0.0.1', '-U', DB_USER, '-d', DB_NAME);
    if (ready.status === 0) return;
    await sleep(1000);
  }
  throw new Error('Test-Datenbank nicht bereit (60 s)');
}

async function main() {
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: `postgres://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}`,
    DB_HOST: '127.0.0.1',
    DB_PORT: PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
  };
  if (!env.DB_NAME.includes('test')) throw new Error('Sicherung: Datenbankname ohne „test“');

  console.log(`▶ Test-Datenbank starten (${CONTAINER}, 127.0.0.1:${PORT})`);
  await startDatabase();

  console.log('▶ Migrationen');
  const migrate = spawnSync(path.join(BACKEND, 'node_modules', '.bin', 'node-pg-migrate'), ['up'],
    { cwd: BACKEND, env, encoding: 'utf8' });
  if (migrate.status !== 0) {
    throw new Error(`Migrationen fehlgeschlagen:\n${migrate.stdout}\n${migrate.stderr}`);
  }

  const files = fs.readdirSync(__dirname).filter(f => /^test-.*\.js$/.test(f)).sort();
  let failed = 0;
  for (const f of files) {
    console.log(`\n▶ ${f}`);
    const r = spawnSync(process.execPath, [path.join(__dirname, f)], { cwd: BACKEND, env, stdio: 'inherit' });
    if (r.status !== 0) failed++;
  }
  console.log(`\n${files.length - failed}/${files.length} Testdateien bestanden`);
  return failed ? 1 : 0;
}

main()
  .then(code => { process.exitCode = code; })
  .catch(err => { console.error(`\n✗ ${err.message}`); process.exitCode = 1; })
  .finally(() => {
    if (process.env.KEEP_TEST_DB === '1') {
      console.log(`Test-Datenbank bleibt stehen: docker rm -f ${CONTAINER}`);
    } else {
      removeContainer();
    }
  });
