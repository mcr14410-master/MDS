/**
 * Bereitstellungen: Prüfungen ohne DB (Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.2)
 *
 * Der Controller lädt Programme und offene Bereitstellungen des Geräts, diese Funktionen
 * entscheiden. Fehlertexte gehen so in `details` an die Oberfläche.
 */

const OPEN_STATUSES = ['requested', 'active', 'closing'];

const key = (s) => String(s).toLowerCase();

/**
 * Welche Messprogramme des Arbeitsgangs werden bereitgestellt?
 * Ohne Auswahl: alle freigegebenen, nicht archivierten; die übrigen kommen mit Grund in `skipped`.
 * Mit Auswahl: jedes gewählte muss zum Arbeitsgang gehören und bereitstellbar sein.
 *
 * @param {Array} programs  [{ id, program_number, released_revision_id, workflow_state }] des Arbeitsgangs (kind = 'cmm')
 * @param {Array|undefined} requestedIds
 * @returns {{ selected: Array, skipped: Array<{program_id, program_number, reason}>, errors: string[] }}
 */
function selectPrograms(programs, requestedIds) {
  const reasonFor = (p) => {
    if (p.workflow_state === 'archived') return 'archiviert';
    if (!p.released_revision_id) return 'nicht freigegeben';
    return null;
  };
  const errors = [];
  const skipped = [];
  let selected = [];

  if (requestedIds === undefined) {
    for (const p of programs) {
      const reason = reasonFor(p);
      if (reason) skipped.push({ program_id: p.id, program_number: p.program_number, reason: `${reason}, nicht bereitgestellt` });
      else selected.push(p);
    }
  } else {
    const ids = [...new Set(requestedIds.map(Number))];
    for (const id of ids) {
      const p = programs.find(x => x.id === id);
      if (!p) {
        errors.push(`Messprogramm ${id} gehört nicht zu diesem Arbeitsgang`);
        continue;
      }
      const reason = reasonFor(p);
      if (reason) errors.push(`${p.program_number}: ${reason} – nur freigegebene Messprogramme können bereitgestellt werden`);
      else selected.push(p);
    }
  }

  if (errors.length === 0 && selected.length === 0) {
    errors.push(programs.length === 0
      ? 'Der Arbeitsgang hat keine Messprogramme'
      : 'Kein freigegebenes Messprogramm an diesem Arbeitsgang');
    selected = [];
  }
  return { selected, skipped, errors };
}

const where = (e) => [e.part_number, e.op_number].filter(Boolean).join(' ');

/**
 * Excel-Vorlagen liegen auf dem Gerät alle in einem Verzeichnis → Name je Gerät eindeutig.
 * @param {Array} candidates  [{ program_number, filename }] .xlsx der neuen Bereitstellung
 * @param {Array} existing    [{ program_number, part_number, op_number, filename }] .xlsx offener Bereitstellungen
 */
function templateConflicts(candidates, existing) {
  const errors = [];
  const seen = new Map();
  for (const c of candidates) {
    const other = seen.get(key(c.filename));
    if (other) errors.push(`Excel-Vorlage ${c.filename} gehört zu ${other} und ${c.program_number} – auf dem Gerät liegen alle Vorlagen in einem Verzeichnis`);
    else seen.set(key(c.filename), c.program_number);

    const e = existing.find(x => key(x.filename) === key(c.filename));
    if (e) errors.push(`Excel-Vorlage ${c.filename} ist auf diesem Gerät schon bereitgestellt (${e.program_number}, ${where(e)})`);
  }
  return errors;
}

/**
 * Programmordner je Gerät eindeutig (Teilenummer\Programmnummer, ohne Groß-/Kleinschreibung)
 * @param {Array} candidates  [{ program_number, local_dir }]
 * @param {Array} existing    [{ program_number, part_number, op_number, local_dir }]
 */
function localDirConflicts(candidates, existing) {
  const errors = [];
  const seen = new Set();
  for (const c of candidates) {
    if (seen.has(key(c.local_dir))) errors.push(`Ordner ${c.local_dir} doppelt in dieser Bereitstellung`);
    seen.add(key(c.local_dir));
    const e = existing.find(x => key(x.local_dir) === key(c.local_dir));
    if (e) errors.push(`Ordner ${c.local_dir} ist auf diesem Gerät schon belegt (${e.program_number}, ${where(e)})`);
  }
  return errors;
}

/** Neuere Freigabe als die festgehaltene Version? → Version der Freigabe, sonst null */
function newerRelease(pinnedRevisionId, releasedRevisionId, releasedVersion) {
  return releasedRevisionId && releasedRevisionId !== pinnedRevisionId ? releasedVersion : null;
}

module.exports = {
  OPEN_STATUSES,
  selectPrograms,
  templateConflicts,
  localDirConflicts,
  newerRelease,
};
