/**
 * Filesystem Garbage Collector
 *
 * Räumt verwaiste Upload-Dateien/-Ordner auf, deren zugehörige DB-Einträge
 * (z.B. durch CASCADE-Deletes) entfernt wurden.
 *
 * Konfiguration (ENV):
 * - FS_GC_DRY_RUN=true       → nur listen, nichts verschieben (default: false)
 * - FS_GC_GRACE_HOURS=24     → Mindestalter in Stunden (parseFloat → Bruchteile OK,
 *                              z.B. 0.1 für ~6min Test-Läufe; default: 24)
 *
 * Sicherheitsmechanismen:
 * - Grace Period: Einträge mit mtime jünger als die Grace Period werden übersprungen
 *   (schützt vor Race-Conditions mit laufenden Uploads).
 * - Trashbin statt Hard-Delete: Verwaiste Dateien wandern in uploads/.trash/<run-id>/
 *   und können bei Bedarf manuell zurückverschoben werden.
 * - Fail-Fast: Fehler in einem Bereich brechen andere Bereiche nicht ab.
 */

const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');
const TRASH_ROOT = path.join(UPLOADS_ROOT, '.trash');

/**
 * Konfiguration aus ENV lesen.
 *
 * Hinweis: Node liest process.env beim Process-Start einmalig in den Speicher.
 * Änderungen an der .env-Datei werden erst nach Backend-Restart wirksam
 * (z.B. `docker compose restart backend`).
 */
function readConfig() {
  const dryRun = process.env.FS_GC_DRY_RUN === 'true';
  const graceHours = parseFloat(process.env.FS_GC_GRACE_HOURS);
  const validGraceHours = isFinite(graceHours) && graceHours >= 0 ? graceHours : 24;
  return {
    dryRun,
    graceHours: validGraceHours,
    gracePeriodMs: validGraceHours * 60 * 60 * 1000,
  };
}

/**
 * Prüft ob ein FS-Eintrag älter als die Grace Period ist
 */
async function isOlderThanGracePeriod(fullPath, gracePeriodMs) {
  try {
    const stat = await fs.stat(fullPath);
    return (Date.now() - stat.mtimeMs) > gracePeriodMs;
  } catch {
    return false;
  }
}

/**
 * Rekursive Größenberechnung für Verzeichnisse
 */
async function getDirSize(dir) {
  let total = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        total += await getDirSize(full);
      } else {
        const stat = await fs.stat(full).catch(() => null);
        if (stat) total += stat.size;
      }
    }
  } catch {}
  return total;
}

/**
 * Rekursive Datei-Zählung für Verzeichnisse
 */
async function countFiles(dir) {
  let count = 0;
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += await countFiles(full);
      } else {
        count++;
      }
    }
  } catch {}
  return count;
}

/**
 * Verschiebt einen FS-Eintrag (Datei oder Verzeichnis) in den Trashbin.
 * Spiegelt die Original-Pfad-Struktur unter trashRunDir wider.
 *
 * @param {string} sourceAbsPath – absoluter Pfad zum Orphan
 * @param {string} trashRunDir   – absolutes Trash-Verzeichnis für diesen GC-Run
 */
async function moveToTrash(sourceAbsPath, trashRunDir) {
  // Pfad relativ zu UPLOADS_ROOT für die Spiegelung
  const relativeFromUploads = path.relative(UPLOADS_ROOT, sourceAbsPath);
  const targetPath = path.join(trashRunDir, relativeFromUploads);

  // Zielverzeichnis sicherstellen
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  // fs.rename funktioniert nur innerhalb derselben Partition. Wenn das fehlschlägt
  // (EXDEV), fallen wir auf copy+delete zurück.
  try {
    await fs.rename(sourceAbsPath, targetPath);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.cp(sourceAbsPath, targetPath, { recursive: true });
    await fs.rm(sourceAbsPath, { recursive: true, force: true });
  }
}

/**
 * Status des Trashbins für die Ausgabe im Job-Log
 */
async function getTrashbinStatus() {
  const status = {
    run_count: 0,
    file_count: 0,
    total_size_bytes: 0,
    total_size_mb: '0.00',
    oldest_run: null,
  };

  let entries;
  try {
    entries = await fs.readdir(TRASH_ROOT, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return status;
    throw err;
  }

  let oldestMtime = null;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    status.run_count++;
    const runPath = path.join(TRASH_ROOT, entry.name);
    const stat = await fs.stat(runPath).catch(() => null);
    if (stat) {
      if (oldestMtime === null || stat.mtimeMs < oldestMtime) oldestMtime = stat.mtimeMs;
    }
    status.total_size_bytes += await getDirSize(runPath);
    status.file_count += await countFiles(runPath);
  }

  status.total_size_mb = (status.total_size_bytes / 1024 / 1024).toFixed(2);
  status.oldest_run = oldestMtime ? new Date(oldestMtime).toISOString() : null;
  return status;
}

/**
 * Cleanup-Strategie: Unterverzeichnisse nach numerischer ID
 * Gleicht Verzeichnisnamen gegen eine Menge gültiger IDs ab.
 */
async function cleanupIdBasedDirs(subdir, validIds, ctx) {
  const baseDir = path.join(UPLOADS_ROOT, subdir);
  const result = {
    scanned: 0,
    orphans_found: 0,
    moved_to_trash: 0,
    freed_bytes: 0,
    skipped_grace: 0,
    errors: [],
  };

  let entries;
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return result;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue; // Dotfiles/-dirs ignorieren (.gitkeep, .DS_Store, ...)
    result.scanned++;

    // Verzeichnisname muss eine numerische ID sein, sonst skippen
    const idNum = parseInt(entry.name, 10);
    if (isNaN(idNum) || String(idNum) !== entry.name) continue;

    if (validIds.has(idNum)) continue;

    result.orphans_found++;
    const fullPath = path.join(baseDir, entry.name);

    if (!(await isOlderThanGracePeriod(fullPath, ctx.gracePeriodMs))) {
      result.skipped_grace++;
      continue;
    }

    const size = await getDirSize(fullPath);

    if (ctx.dryRun) {
      result.freed_bytes += size;
      continue;
    }

    try {
      await moveToTrash(fullPath, ctx.trashRunDir);
      result.moved_to_trash++;
      result.freed_bytes += size;
    } catch (err) {
      result.errors.push({ path: entry.name, error: err.message });
    }
  }

  return result;
}

/**
 * Cleanup-Strategie: Flaches Verzeichnis mit einzelnen Files
 */
async function cleanupFlatFiles(subdir, validFilenames, ctx) {
  const baseDir = path.join(UPLOADS_ROOT, subdir);
  const result = {
    scanned: 0,
    orphans_found: 0,
    moved_to_trash: 0,
    freed_bytes: 0,
    skipped_grace: 0,
    errors: [],
  };

  let entries;
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return result;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.startsWith('.')) continue; // Dotfiles ignorieren (.gitkeep, .DS_Store, ...)
    result.scanned++;

    if (validFilenames.has(entry.name)) continue;

    result.orphans_found++;
    const fullPath = path.join(baseDir, entry.name);

    if (!(await isOlderThanGracePeriod(fullPath, ctx.gracePeriodMs))) {
      result.skipped_grace++;
      continue;
    }

    const stat = await fs.stat(fullPath).catch(() => null);
    const size = stat ? stat.size : 0;

    if (ctx.dryRun) {
      result.freed_bytes += size;
      continue;
    }

    try {
      await moveToTrash(fullPath, ctx.trashRunDir);
      result.moved_to_trash++;
      result.freed_bytes += size;
    } catch (err) {
      result.errors.push({ file: entry.name, error: err.message });
    }
  }

  return result;
}

/**
 * Cleanup-Strategie: Temp-Verzeichnis — alles älter als Grace Period verschieben
 * (keine DB-Referenz, reiner Age-Cutoff)
 */
async function cleanupTempDir(subdir, ctx) {
  const baseDir = path.join(UPLOADS_ROOT, subdir);
  const result = {
    scanned: 0,
    orphans_found: 0,
    moved_to_trash: 0,
    freed_bytes: 0,
    skipped_grace: 0,
    errors: [],
  };

  let entries;
  try {
    entries = await fs.readdir(baseDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return result;
    throw err;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // Dotfiles ignorieren (.gitkeep, .DS_Store, ...)
    result.scanned++;
    const fullPath = path.join(baseDir, entry.name);

    if (!(await isOlderThanGracePeriod(fullPath, ctx.gracePeriodMs))) {
      result.skipped_grace++;
      continue;
    }

    result.orphans_found++;
    const size = entry.isDirectory()
      ? await getDirSize(fullPath)
      : ((await fs.stat(fullPath).catch(() => null))?.size || 0);

    if (ctx.dryRun) {
      result.freed_bytes += size;
      continue;
    }

    try {
      await moveToTrash(fullPath, ctx.trashRunDir);
      result.moved_to_trash++;
      result.freed_bytes += size;
    } catch (err) {
      result.errors.push({ entry: entry.name, error: err.message });
    }
  }

  return result;
}

/**
 * Hauptfunktion: Garbage Collection über alle konfigurierten Bereiche
 */
async function runGarbageCollection() {
  const config = readConfig();
  const startedAt = Date.now();

  // Run-spezifischer Trash-Ordner: ISO-Timestamp ohne FS-feindliche Zeichen
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const trashRunDir = path.join(TRASH_ROOT, runId);

  const ctx = {
    dryRun: config.dryRun,
    gracePeriodMs: config.gracePeriodMs,
    trashRunDir,
  };

  const results = {
    dry_run: config.dryRun,
    grace_period_hours: config.graceHours,
    run_id: runId,
    areas: {},
  };

  // --- 1. Setup-Sheet-Fotos ---
  try {
    const { rows } = await pool.query('SELECT id FROM setup_sheets');
    const validIds = new Set(rows.map(r => r.id));
    results.areas.setup_sheets = await cleanupIdBasedDirs('setup-sheets', validIds, ctx);
  } catch (err) {
    results.areas.setup_sheets = { error: err.message };
  }

  // --- 2. Operation-Documents ---
  try {
    const { rows } = await pool.query('SELECT id FROM operations');
    const validIds = new Set(rows.map(r => r.id));
    results.areas.operation_documents = await cleanupIdBasedDirs('operation-documents', validIds, ctx);
  } catch (err) {
    results.areas.operation_documents = { error: err.message };
  }

  // --- 3. NC-Programme (flache Struktur) ---
  try {
    const { rows } = await pool.query('SELECT filepath, filename FROM program_revisions');
    const validFilenames = new Set(rows.map(r => r.filename || path.basename(r.filepath)));
    results.areas.programs = await cleanupFlatFiles('programs', validFilenames, ctx);
  } catch (err) {
    results.areas.programs = { error: err.message };
  }

  // --- 4. Temp-Uploads (Age-Cutoff) ---
  try {
    results.areas.temp = await cleanupTempDir('temp', ctx);
  } catch (err) {
    results.areas.temp = { error: err.message };
  }

  // --- 5. Maintenance (3 DB-Quellen) ---
  try {
    const validFilenames = new Set();
    const queries = [
      'SELECT reference_image AS path FROM maintenance_plans WHERE reference_image IS NOT NULL',
      'SELECT reference_image AS path FROM maintenance_checklist_items WHERE reference_image IS NOT NULL',
      'SELECT photo_path AS path FROM maintenance_checklist_completions WHERE photo_path IS NOT NULL',
    ];
    for (const q of queries) {
      const { rows } = await pool.query(q);
      rows.forEach(r => validFilenames.add(path.basename(r.path)));
    }
    results.areas.maintenance = await cleanupFlatFiles('maintenance', validFilenames, ctx);
  } catch (err) {
    results.areas.maintenance = { error: err.message };
  }

  // --- 6. Wiki ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM wiki_article_images');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.wiki = await cleanupFlatFiles('wiki', validFilenames, ctx);
  } catch (err) {
    results.areas.wiki = { error: err.message };
  }

  // --- 7. Machine-Documents ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM machine_documents');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.machine_documents = await cleanupFlatFiles('machine-documents', validFilenames, ctx);
  } catch (err) {
    results.areas.machine_documents = { error: err.message };
  }

  // --- 8. Tool-Documents ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM tool_documents');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.tool_documents = await cleanupFlatFiles('tool-documents', validFilenames, ctx);
  } catch (err) {
    results.areas.tool_documents = { error: err.message };
  }

  // --- 9. Clamping-Device-Documents ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM clamping_device_documents');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.clamping_device_documents = await cleanupFlatFiles('clamping-device-documents', validFilenames, ctx);
  } catch (err) {
    results.areas.clamping_device_documents = { error: err.message };
  }

  // --- 10. Calibration-Certificates ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM calibration_certificates');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.certificates = await cleanupFlatFiles('certificates', validFilenames, ctx);
  } catch (err) {
    results.areas.certificates = { error: err.message };
  }

  // --- 11. Fixture-Documents ---
  try {
    const { rows } = await pool.query('SELECT file_path FROM fixture_documents');
    const validFilenames = new Set(rows.map(r => path.basename(r.file_path)));
    results.areas.fixtures = await cleanupFlatFiles('fixtures', validFilenames, ctx);
  } catch (err) {
    results.areas.fixtures = { error: err.message };
  }

  // --- 12. Consumable-Documents (ID-basiert: uploads/consumables/<consumableId>/) ---
  try {
    const { rows } = await pool.query('SELECT id FROM consumables WHERE is_deleted = false');
    const validIds = new Set(rows.map(r => r.id));
    results.areas.consumables = await cleanupIdBasedDirs('consumables', validIds, ctx);
  } catch (err) {
    results.areas.consumables = { error: err.message };
  }

  // Summary über alle Bereiche
  results.total = Object.values(results.areas).reduce(
    (acc, area) => {
      if (area.error) return acc;
      acc.orphans_found += area.orphans_found || 0;
      acc.moved_to_trash += area.moved_to_trash || 0;
      acc.freed_bytes += area.freed_bytes || 0;
      acc.skipped_grace += area.skipped_grace || 0;
      return acc;
    },
    { orphans_found: 0, moved_to_trash: 0, freed_bytes: 0, skipped_grace: 0 }
  );
  results.total.freed_mb = (results.total.freed_bytes / 1024 / 1024).toFixed(2);

  // Leeren Trash-Run-Ordner aufräumen (falls in diesem Run nichts verschoben wurde)
  if (!config.dryRun && results.total.moved_to_trash === 0) {
    await fs.rm(trashRunDir, { recursive: true, force: true }).catch(() => {});
  }

  // Trashbin-Status für Übersicht
  try {
    results.trashbin = await getTrashbinStatus();
  } catch (err) {
    results.trashbin = { error: err.message };
  }

  results.duration_ms = Date.now() - startedAt;
  return results;
}

module.exports = { runGarbageCollection };
