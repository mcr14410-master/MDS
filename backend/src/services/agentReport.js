/**
 * Bericht des MDS-Agenten prüfen und Statuswechsel ableiten – ohne DB
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.4. Der Bericht ist der vollständige Ist-Stand
 * des Geräts. Fehlerhafte Einträge werden einzeln verworfen und in `ignored` zurückgemeldet,
 * damit ein Agent nicht an einem kaputten Eintrag hängen bleibt.
 */

const FILE_STATES = ['current', 'pending', 'locked', 'run_saved', 'modified', 'missing', 'conflict', 'corrupt', 'unknown'];
const DIRECTIONS = ['to_device', 'adopted', 'removed', 'discarded_run_save', 'discarded', 'kept_modified'];
const RESULTS = ['ok', 'skipped_locked', 'skipped_conflict', 'error'];
const TARGETS = ['program_dir', 'template_dir'];
const LIMITS = { files: 500, transfers: 500, warnings: 100, deployments: 200 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{64}$/i;

const isId = (v) => Number.isInteger(v) && v > 0;
const optId = (v) => v === undefined || v === null || isId(v);
const optHash = (v) => v === undefined || v === null || (typeof v === 'string' && HASH.test(v));
const text = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Relativer Pfad ohne Laufwerk, ohne führenden Trenner, ohne „..“ */
function validRelPath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 500) return false;
  if (/^[\\/]/.test(p) || /^[a-z]:/i.test(p) || /[\u0000-\u001f]/.test(p)) return false;
  return !p.split(/[\\/]/).some(part => part === '..' || part === '');
}

function validDate(v) {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {Object} body  Bericht des Agenten
 * @param {Set<number>} ownDeploymentIds  alle Bereitstellungen dieses Agenten (auch abgeschlossene)
 * @param {Date} now
 * @returns {{ report: { files, transfers, deployments, warnings }, ignored: Array<{ kind, index, reason }> }}
 */
function validateReport(body, ownDeploymentIds, now = new Date()) {
  const ignored = [];
  const skip = (kind, index, reason) => ignored.push({ kind, index, reason });
  const list = (name) => {
    const v = body?.[name];
    if (v === undefined) return [];
    if (!Array.isArray(v)) {
      skip(name, null, 'keine Liste');
      return [];
    }
    if (v.length > LIMITS[name]) skip(name, LIMITS[name], `mehr als ${LIMITS[name]} Einträge – Rest beim nächsten Bericht`);
    return v.slice(0, LIMITS[name]);
  };
  const ownDeployment = (id) => id === undefined || id === null || ownDeploymentIds.has(id);

  // Dateien: vollständiger Ist-Stand, je Ziel + Pfad nur einmal (letzter gewinnt)
  const files = new Map();
  list('files').forEach((f, i) => {
    if (!f || typeof f !== 'object') return skip('files', i, 'kein Objekt');
    if (!TARGETS.includes(f.target)) return skip('files', i, 'unbekanntes Ziel');
    if (!validRelPath(f.rel_path)) return skip('files', i, 'ungültiger Pfad');
    if (!FILE_STATES.includes(f.state)) return skip('files', i, 'unbekannter Zustand');
    if (!optId(f.deployment_id) || !optId(f.file_id)) return skip('files', i, 'ungültige ID');
    if (!ownDeployment(f.deployment_id)) return skip('files', i, 'fremde Bereitstellung');
    if (!optHash(f.local_hash)) return skip('files', i, 'ungültiger Hash');
    files.set(`${f.target}\u0000${f.rel_path.toLowerCase()}`, {
      target: f.target,
      rel_path: f.rel_path,
      deployment_id: f.deployment_id ?? null,
      file_id: f.file_id ?? null,
      local_hash: f.local_hash ?? null,
      state: f.state,
      message: text(f.message, 1000),
    });
  });

  const transfers = [];
  const seenClientIds = new Set();
  list('transfers').forEach((t, i) => {
    if (!t || typeof t !== 'object') return skip('transfers', i, 'kein Objekt');
    if (typeof t.client_id !== 'string' || !UUID.test(t.client_id)) return skip('transfers', i, 'client_id fehlt oder ist keine UUID');
    if (seenClientIds.has(t.client_id.toLowerCase())) return skip('transfers', i, 'client_id doppelt im Bericht');
    if (!DIRECTIONS.includes(t.direction)) return skip('transfers', i, 'unbekannte Richtung');
    if (!RESULTS.includes(t.result)) return skip('transfers', i, 'unbekanntes Ergebnis');
    if (!text(t.filename, 255)) return skip('transfers', i, 'Dateiname fehlt');
    if (!optId(t.deployment_id) || !optId(t.file_id)) return skip('transfers', i, 'ungültige ID');
    if (!ownDeployment(t.deployment_id)) return skip('transfers', i, 'fremde Bereitstellung');
    if (!optHash(t.file_hash)) return skip('transfers', i, 'ungültiger Hash');
    const occurred = validDate(t.occurred_at);
    if (!occurred) return skip('transfers', i, 'occurred_at fehlt oder ungültig');
    seenClientIds.add(t.client_id.toLowerCase());
    transfers.push({
      client_id: t.client_id.toLowerCase(),
      deployment_id: t.deployment_id ?? null,
      file_id: t.file_id ?? null,
      filename: text(t.filename, 255),
      direction: t.direction,
      result: t.result,
      file_hash: t.file_hash ?? null,
      message: text(t.message, 2000),
      occurred_at: occurred > now ? now : occurred,
    });
  });

  const deployments = [];
  list('deployments').forEach((d, i) => {
    if (!d || typeof d !== 'object' || !isId(d.id)) return skip('deployments', i, 'ID fehlt');
    if (!ownDeploymentIds.has(d.id)) return skip('deployments', i, 'fremde Bereitstellung');
    const activity = d.activity_at === undefined || d.activity_at === null ? null : validDate(d.activity_at);
    if (d.activity_at && !activity) return skip('deployments', i, 'activity_at ungültig');
    deployments.push({
      id: d.id,
      closed: d.closed === true,
      activity_at: activity && activity > now ? now : activity,
    });
  });

  const warnings = [];
  list('warnings').forEach((w, i) => {
    const t = text(w?.text, 500);
    if (!t) return skip('warnings', i, 'Text fehlt');
    warnings.push({
      code: text(w.code, 40) || 'warning',
      deployment_id: isId(w.deployment_id) && ownDeploymentIds.has(w.deployment_id) ? w.deployment_id : null,
      text: t,
    });
  });
  // Selbsttest: jeder Punkt, der nicht true ist, wird zur Warnung
  if (body?.self_test && typeof body.self_test === 'object') {
    for (const [k, v] of Object.entries(body.self_test).slice(0, 20)) {
      if (v !== true) warnings.push({ code: 'self_test', deployment_id: null, text: `Selbsttest: ${String(k).slice(0, 60)} nicht in Ordnung` });
    }
  }

  return { report: { files: [...files.values()], transfers, deployments, warnings }, ignored };
}

/**
 * Neuer Status einer offenen Bereitstellung nach dem Bericht (oder null = unverändert)
 * @param {{ status: string }} deployment
 * @param {number[]} expectedFileIds  Soll-Dateien (festgehaltene Versionen)
 * @param {Array} reportedFiles  gemeldete Dateien dieser Bereitstellung [{ file_id, state }]
 * @param {boolean} closedReported  Agent meldet closed: true
 * @returns {{ status: string|null, warning: string|null }}
 */
function nextStatus(deployment, expectedFileIds, reportedFiles, closedReported) {
  if (deployment.status === 'requested' && !closedReported) {
    const ready = expectedFileIds.length > 0 && expectedFileIds.every(id =>
      reportedFiles.some(f => f.file_id === id && (f.state === 'current' || f.state === 'run_saved')));
    return { status: ready ? 'active' : null, warning: null };
  }
  if (closedReported) {
    if (deployment.status !== 'closing') {
      return { status: null, warning: '„abgeschlossen“ gemeldet, obwohl die Bereitstellung nicht beim Abschließen ist – ignoriert' };
    }
    // Verwaltete Dateien, bearbeitete oder beschädigte (.prg.corrupt) halten das Abschließen auf; fremde (unknown) nicht
    if (reportedFiles.some(f => f.file_id !== null || f.state === 'modified' || f.state === 'corrupt')) {
      return { status: null, warning: '„abgeschlossen“ gemeldet, aber noch verwaltete Dateien im Bericht – bleibt beim Abschließen' };
    }
    return { status: 'closed', warning: null };
  }
  return { status: null, warning: null };
}

/**
 * Wer hat im MDS ausgelöst, was der Agent gerade gemeldet hat? (program_transfers.triggered_by)
 * Ablegen: wer die Version festgelegt hat (Bereitstellen bzw. Aktualisieren), sonst wer bereitgestellt hat.
 */
function triggeredBy(direction, deployment, pinnedBy = null) {
  if (!deployment) return null;
  if (direction === 'to_device' || direction === 'adopted') return pinnedBy ?? deployment.requested_by ?? null;
  if (direction === 'discarded') return deployment.discard_local_by ?? null;
  return deployment.close_requested_by ?? null;
}

module.exports = {
  FILE_STATES,
  LIMITS,
  validRelPath,
  validateReport,
  nextStatus,
  triggeredBy,
};
