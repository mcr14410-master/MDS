/**
 * Backup-Monitor: prüft die nächtlichen DB-Backups (scripts/backup.sh) inhaltlich.
 *
 * Gültig ist ein Backup nur, wenn es eine Mindestgröße hat und mit der pg_dump-Endmarke
 * endet. Hintergrund: Ein fehlgeschlagener Dump erzeugte früher eine leere gzip-Datei
 * (20 Bytes), die als „Backup vorhanden“ durchging.
 *
 * Jeder Zustand außer „ok“ wirft einen Fehler → der Cron-Lauf wird als Fehler protokolliert.
 *
 * Die Kopie aufs Netzlaufwerk (scripts/backup-offsite.sh, restic) prüft checkOffsiteStatus über die
 * Statusdatei, die das Skript nach jedem Lauf schreibt – der Container sieht die Freigabe selbst nicht.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MIN_BYTES = 10240;
const MAX_AGE_HOURS = 26;
const END_MARKER = 'PostgreSQL database dump complete';
const OFFSITE_STATUS_FILE = 'offsite-status.json';

function validateBackup(filePath, size) {
  if (size < MIN_BYTES) return { valid: false, reason: `zu klein (${size} Bytes)` };
  try {
    const content = zlib.gunzipSync(fs.readFileSync(filePath));
    // Endmarke steht am Ende (danach nur noch \unrestrict o. Ä.)
    const tail = content.subarray(Math.max(0, content.length - 4096)).toString('utf8');
    if (!tail.includes(END_MARKER)) return { valid: false, reason: 'unvollständig (Endmarke fehlt)' };
    return { valid: true, reason: null };
  } catch (err) {
    return { valid: false, reason: `nicht lesbar (${err.message})` };
  }
}

function describe(file, now) {
  return {
    name: file.name,
    size_mb: (file.size / 1024 / 1024).toFixed(1),
    age_hours: Math.round((now - file.mtime.getTime()) / (1000 * 60 * 60)),
    date: file.mtime.toISOString(),
  };
}

/**
 * @param {string} dir     Backup-Verzeichnis (im Container per Volume gemountet)
 * @param {number} now     Zeitpunkt in ms (für Tests)
 * @returns {object}       Ergebnis bei Status „ok“, sonst Error
 */
function checkBackupStatus(dir = '/app/backups', now = Date.now()) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Backup-Verzeichnis ${dir} nicht gefunden (Volume /srv/mds/backups in compose.yaml gemountet?)`);
  }
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('mds_backup_') && f.endsWith('.sql.gz'))
    .map(f => {
      const stat = fs.statSync(path.join(dir, f));
      return { name: f, size: stat.size, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime)
    .map(f => ({ ...f, ...validateBackup(path.join(dir, f.name), f.size) }));

  if (files.length === 0) {
    throw new Error(`Keine Backups gefunden (${dir})`);
  }

  const latest = files[0];
  const lastValid = files.find(f => f.valid) || null;
  const lastValidText = lastValid
    ? `${lastValid.name} (vor ${describe(lastValid, now).age_hours} h)`
    : 'keins';

  if (!latest.valid) {
    throw new Error(`Neuestes Backup ungültig: ${latest.name} – ${latest.reason}. Letztes gültiges Backup: ${lastValidText}`);
  }

  const latestInfo = describe(latest, now);
  if (latestInfo.age_hours > MAX_AGE_HOURS) {
    throw new Error(`Neuestes Backup ist ${latestInfo.age_hours} h alt (erwartet: täglich): ${latest.name}`);
  }

  return {
    status: 'ok',
    backup_count: files.length,
    valid_count: files.filter(f => f.valid).length,
    latest: latestInfo,
    total_size_mb: (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1),
  };
}

/**
 * @param {string} dir     Backup-Verzeichnis (dort schreibt backup-offsite.sh seine Statusdatei)
 * @param {number} now     Zeitpunkt in ms (für Tests)
 * @returns {object}       Ergebnis bei Status „ok“, sonst Error
 */
function checkOffsiteStatus(dir = '/app/backups', now = Date.now()) {
  const file = path.join(dir, OFFSITE_STATUS_FILE);
  if (!fs.existsSync(file)) {
    throw new Error(`Noch kein Netzlaufwerk-Backup gelaufen (${OFFSITE_STATUS_FILE} fehlt) – scripts/backup-offsite.sh eingerichtet? Siehe DEPLOYMENT.md`);
  }
  let status;
  try {
    status = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`Statusdatei des Netzlaufwerk-Backups nicht lesbar (${err.message})`);
  }
  const finished = Date.parse(status.finished_at);
  if (Number.isNaN(finished)) {
    throw new Error(`Statusdatei des Netzlaufwerk-Backups ohne gültigen Zeitpunkt (${status.finished_at})`);
  }
  const ageHours = Math.round((now - finished) / (1000 * 60 * 60));

  if (status.status !== 'ok') {
    throw new Error(`Netzlaufwerk-Backup fehlgeschlagen (vor ${ageHours} h): ${status.message || 'ohne Meldung'}`);
  }
  if (ageHours > MAX_AGE_HOURS) {
    throw new Error(`Letztes Netzlaufwerk-Backup ist ${ageHours} h alt (erwartet: täglich), Snapshot ${status.snapshot}`);
  }

  return {
    status: 'ok',
    finished_at: new Date(finished).toISOString(),
    age_hours: ageHours,
    snapshot: status.snapshot,
    db_dump: status.db_dump,
    duration_s: status.duration_s,
  };
}

module.exports = {
  checkBackupStatus, validateBackup, checkOffsiteStatus,
  MIN_BYTES, MAX_AGE_HOURS, END_MARKER, OFFSITE_STATUS_FILE,
};
