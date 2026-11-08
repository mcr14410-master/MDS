/**
 * Altbestand-Import: ein Programm übernehmen (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 5)
 *
 * Jeder Schritt sieht zuerst nach, ob es das Ergebnis schon gibt – ein Abbruch hinterlässt höchstens
 * Fehlendes, ein zweiter Durchlauf ergänzt es. Die MDS-Schnittstellen kommen als `api` herein
 * (Seite: utils/legacyImport/api.js, Tests: Fake im Speicher).
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */
import { pickCmmOperation, isOtherSource, isForeignSource, sourceFolder } from './match.js';

export const RELEASE_REASON = 'Erstimport Altbestand';

export const STEP_KEYS = [
  'probelauf', 'bauteil', 'arbeitsgang', 'messprogramm', 'einrichteblatt', 'fotos', 'dokumente',
  'freigabe_programm', 'freigabe_einrichteblatt',
];

const baseName = (item) => item.path.split('/').pop();
const filesOf = (items) => items.map(i => i.file);

/** Kommentar der ersten Version: Ordner (und Unterordner des Messprogramms) */
export function importComment(parsed, unitPath = '') {
  const sub = unitPath ? `\\${unitPath.split('/').join('\\')}` : '';
  return `Erstimport aus Altbestand (Ordner ${parsed.customerFolder}\\${parsed.programFolder}${sub})`;
}

/** Reguläre Schritte bis „Freigegeben“; null = von hier aus nicht automatisch (abgelehnt, archiviert) */
export function releasePath(stateName) {
  const paths = {
    draft: ['review', 'approved', 'released'],
    review: ['approved', 'released'],
    approved: ['released'],
    released: [],
  };
  return paths[stateName] ?? null;
}

const emptyUnitState = () => ({
  operationId: null, programId: null, programState: null, programSource: null,
  setupSheetId: null, setupSheetState: null, photoNames: [],
});

/**
 * Was es zu einem Bauteil an der KMG-Maschine schon gibt – je Messprogramm des Ordners.
 * targets: [{ path, source, opName, opNumber }] – alle Messprogramme des Ordners (selection.js importTargets)
 * parsed: Zeile – dann wird ein Programm eines anderen Altbestand-Ordners am Bauteil gemeldet (foreignSource)
 * Zuordnung eines Mess-Arbeitsgangs: 1. Messprogramm mit gleichem Herkunftsvermerk; 2. einzelnes Programm direkt
 * im Messprogramm-Ordner: erster Mess-Arbeitsgang (wie bisher); 3. abgebrochener Lauf: Arbeitsgang ohne
 * Messprogramm mit dem geplanten Namen.
 */
export async function loadImportState(api, partId, cmmMachineId, targets, parsed = null) {
  const docs = await api.listPartDocuments(partId);
  const state = {
    documentNames: docs.map(d => d.original_filename),
    hasPrimaryCad: docs.some(d => d.is_primary_cad),
    units: Object.fromEntries(targets.map(t => [t.path, emptyUnitState()])),
  };
  const ops = (await api.listOperations(partId))
    .filter(o => o.machine_id === cmmMachineId)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  if (ops.length === 0) return state;
  const programsOf = new Map();
  for (const op of ops) programsOf.set(op.id, await api.listCmmPrograms(op.id));
  if (parsed) {
    const foreign = [...programsOf.values()].flat().find(p => isForeignSource(p.description, parsed));
    if (foreign) state.foreignSource = foreign.description;
  }

  const used = new Set();
  const assign = async (target, op, program) => {
    used.add(op.id);
    const us = state.units[target.path];
    us.operationId = op.id;
    if (program) {
      us.programId = program.id;
      us.programState = program.workflow_state;
      us.programSource = program.description ?? null;
    }
    const [sheet] = await api.listSetupSheets(op.id);
    if (sheet) {
      const detail = await api.getSetupSheet(sheet.id);
      us.setupSheetId = sheet.id;
      us.setupSheetState = detail.workflow_state;
      us.photoNames = (detail.photos || []).map(p => p.file_name);
    }
  };

  for (const t of targets) {
    for (const op of ops) {
      const program = programsOf.get(op.id).find(p => p.description === t.source);
      if (program) { await assign(t, op, program); break; }
    }
  }
  const [single] = targets;
  if (targets.length === 1 && single.path === '' && !state.units[''].operationId) {
    const op = pickCmmOperation(ops, cmmMachineId);
    if (op && !used.has(op.id)) await assign(single, op, programsOf.get(op.id)[0] || null);
  }
  for (const t of targets) {
    if (state.units[t.path].operationId) continue;
    const op = ops.find(o => !used.has(o.id) && programsOf.get(o.id).length === 0
      && o.op_name === t.opName && (!t.opNumber || o.op_number === t.opNumber));
    if (op) await assign(t, op, null);
  }
  return state;
}

/**
 * @param {{ row, settings, api, release: boolean }} args
 *   row: { parsed (selection.js withSelection – units = ausgewählte Messprogramme), customerId,
 *          partChoice: number|'new'|'skip'|null, customerPartNumber, revision, name }
 *   settings: { cmmMachineId, opDefaults, workflowStates }
 * @returns {Promise<{ ok: boolean, steps: {key, status, message?, unit?}[], partId: number|null, importState: object|null }>}
 */
export async function importProgram({ row, settings, api, release }) {
  const steps = [];
  const { parsed, partChoice } = row;
  const several = (parsed.unitCount ?? parsed.units.length) > 1;
  const add = (key, status, message, unit) => {
    const step = { key, status };
    if (message) step.message = message;
    if (unit && several) { step.unit = unit.label; step.unitPath = unit.path; }
    steps.push(step);
  };

  if (partChoice === 'skip') {
    STEP_KEYS.forEach(k => add(k, 'skipped'));
    return { ok: true, steps, partId: null, importState: null };
  }
  if (partChoice !== 'new' && typeof partChoice !== 'number') {
    add('bauteil', 'error', 'Bauteil wählen');
    return { ok: false, steps, partId: null, importState: null };
  }

  const units = parsed.units;
  // Stand für alle Messprogramme des Ordners laden (auch abgewählte), damit keins den Arbeitsgang eines anderen nimmt
  const targets = parsed.targets
    || units.map(u => ({ path: u.path, source: u.source, opName: u.operation.op_name, opNumber: u.operation.op_number }));
  let partId = typeof partChoice === 'number' ? partChoice : null;
  let state = { documentNames: [], hasPrimaryCad: false, units: Object.fromEntries(units.map(u => [u.path, emptyUnitState()])) };
  let current = 'probelauf';
  let currentUnit = null;
  const programFiles = (u) => ({
    files: filesOf([...u.files.program, ...u.files.drawingPdf]),
    templateFiles: filesOf(u.files.template),
    calibrationFiles: filesOf(u.files.calibration),
  });
  const stateId = (name) => settings.workflowStates.find(s => s.name === name)?.id;
  const fail = () => ({ ok: false, steps, partId, importState: state });

  // Schritt für Schritt bis „Freigegeben“; false = Status lässt das nicht zu
  async function releaseEntity(key, entityType, entityId, stateName, unit) {
    const path = releasePath(stateName);
    if (path === null) {
      add(key, 'error', `Status „${stateName}“ – bitte von Hand freigeben`, unit);
      return false;
    }
    if (path.length === 0) { add(key, 'skipped', 'schon freigegeben', unit); return true; }
    for (const to of path) {
      await api.workflowChange({ entityType, entityId, toStateId: stateId(to), changeReason: RELEASE_REASON });
    }
    add(key, 'done', undefined, unit);
    return true;
  }

  try {
    if (partId) state = await loadImportState(api, partId, settings.cmmMachineId, targets, parsed);
    const us = (u) => state.units[u.path];

    if (state.foreignSource) {
      add('messprogramm', 'error',
        `Am Bauteil liegt schon ein Messprogramm aus Ordner „${sourceFolder(state.foreignSource)}“ – diesen Ordner von Hand anlegen`);
      return fail();
    }

    // Einzelnes Programm direkt im Ordner: Programm aus einem anderen Ordner am Mess-Arbeitsgang → von Hand
    if (units.length === 1 && units[0].path === '') {
      const st = us(units[0]);
      if (st.programId && isOtherSource(st.programSource, parsed)) {
        add('messprogramm', 'error',
          `Am Mess-Arbeitsgang liegt schon das Messprogramm aus Ordner „${sourceFolder(st.programSource)}“ – diesen Ordner von Hand anlegen`);
        return fail();
      }
    }

    current = 'probelauf';
    let checked = 0;
    for (const u of units) {
      if (us(u).programId) continue;
      currentUnit = u;
      const check = await api.dryRunCmm(programFiles(u));
      if (!check.valid) {
        add('probelauf', 'error', (check.errors || []).join('; ') || 'Dateien unvollständig oder ungültig', u);
        return fail();
      }
      checked++;
    }
    currentUnit = null;
    add('probelauf', checked ? 'done' : 'skipped');

    current = 'bauteil';
    if (!partId) {
      const part = await api.createPart({
        customer_id: row.customerId,
        customer_part_number: row.customerPartNumber,
        part_name: row.name,
        revision: row.revision,
      });
      partId = part.id;
      add('bauteil', 'done');
    } else {
      add('bauteil', 'skipped');
    }

    for (const u of units) {
      currentUnit = u;
      const st = us(u);

      current = 'arbeitsgang';
      if (!st.operationId) {
        const op = await api.createOperation({
          part_id: partId, machine_id: settings.cmmMachineId, ...settings.opDefaults, ...u.operation,
        });
        st.operationId = op.id;
        add('arbeitsgang', 'done', undefined, u);
      } else {
        add('arbeitsgang', 'skipped', undefined, u);
      }

      current = 'messprogramm';
      if (!st.programId) {
        const created = await api.createCmmProgram({
          operation_id: st.operationId,
          program_name: several ? `${row.name} ${u.label}` : row.name,
          comment: importComment(parsed, u.path),
          description: u.source,
          ...programFiles(u),
        });
        st.programId = created.program.id;
        st.programState = created.program.workflow_state || 'draft';
        st.programSource = u.source;
        add('messprogramm', 'done', undefined, u);
      } else {
        add('messprogramm', 'skipped', undefined, u);
      }

      current = 'einrichteblatt';
      if (!st.setupSheetId) {
        const sheet = await api.createSetupSheet({ operation_id: st.operationId });
        st.setupSheetId = sheet.id;
        st.setupSheetState = 'draft';
        add('einrichteblatt', 'done', undefined, u);
      } else {
        add('einrichteblatt', 'skipped', undefined, u);
      }

      current = 'fotos';
      const photos = u.files.photos.filter(i => !st.photoNames.includes(baseName(i)));
      for (const item of photos) {
        await api.uploadSetupPhoto(st.setupSheetId, item.file);
        st.photoNames.push(baseName(item));
      }
      add('fotos', photos.length ? 'done' : 'skipped', photos.length ? `${photos.length} hochgeladen` : undefined, u);
    }
    currentUnit = null;

    current = 'dokumente';
    const missing = (items) => items.filter(i => !state.documentNames.includes(baseName(i)));
    let uploaded = 0;
    for (const item of missing(parsed.files.cad)) {
      const primary = !state.hasPrimaryCad;
      await api.uploadPartDocument(partId, item.file, { document_type: 'cad_model', is_primary_cad: primary });
      if (primary) state.hasPrimaryCad = true;
      state.documentNames.push(baseName(item));
      uploaded++;
    }
    for (const item of missing(parsed.files.drawingOther)) {
      await api.uploadPartDocument(partId, item.file, { document_type: 'drawing', is_primary_cad: false });
      state.documentNames.push(baseName(item));
      uploaded++;
    }
    add('dokumente', uploaded ? 'done' : 'skipped', uploaded ? `${uploaded} hochgeladen` : undefined);

    if (!release) {
      add('freigabe_programm', 'skipped');
      add('freigabe_einrichteblatt', 'skipped');
      return { ok: true, steps, partId, importState: state };
    }

    for (const u of units) {
      currentUnit = u;
      const st = us(u);
      // Status erst jetzt lesen: ein Foto-Upload setzt ein freigegebenes Blatt auf Entwurf zurück
      current = 'freigabe_programm';
      const program = (await api.listCmmPrograms(st.operationId)).find(p => p.id === st.programId);
      st.programState = program?.workflow_state ?? st.programState;
      if (!await releaseEntity('freigabe_programm', 'program', st.programId, st.programState, u)) return fail();

      current = 'freigabe_einrichteblatt';
      const sheet = await api.getSetupSheet(st.setupSheetId);
      st.setupSheetState = sheet.workflow_state;
      if (!await releaseEntity('freigabe_einrichteblatt', 'setup_sheet', st.setupSheetId, st.setupSheetState, u)) return fail();
    }
    return { ok: true, steps, partId, importState: state };
  } catch (error) {
    add(current, 'error', error.message, currentUnit);
    return fail();
  }
}
