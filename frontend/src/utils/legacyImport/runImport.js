/**
 * Altbestand-Import: ein Programm übernehmen (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 5)
 *
 * Jeder Schritt sieht zuerst nach, ob es das Ergebnis schon gibt – ein Abbruch hinterlässt höchstens
 * Fehlendes, ein zweiter Durchlauf ergänzt es. Die MDS-Schnittstellen kommen als `api` herein
 * (Seite: utils/legacyImport/api.js, Tests: Fake im Speicher).
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */
import { pickCmmOperation, importSource, isOtherSource, sourceFolder } from './match.js';

export const RELEASE_REASON = 'Erstimport Altbestand';

export const STEP_KEYS = [
  'probelauf', 'bauteil', 'arbeitsgang', 'messprogramm', 'einrichteblatt', 'fotos', 'dokumente',
  'freigabe_programm', 'freigabe_einrichteblatt',
];

const baseName = (item) => item.path.split('/').pop();
const filesOf = (items) => items.map(i => i.file);

export function importComment(parsed) {
  return `Erstimport aus Altbestand (Ordner ${parsed.customerFolder}\\${parsed.programFolder})`;
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

const emptyState = () => ({
  operationId: null, programId: null, programState: null, programSource: null, setupSheetId: null, setupSheetState: null,
  photoNames: [], documentNames: [], hasPrimaryCad: false,
});

/** Was es zu einem Bauteil an der KMG-Maschine schon gibt */
export async function loadImportState(api, partId, cmmMachineId) {
  const state = emptyState();
  const docs = await api.listPartDocuments(partId);
  state.documentNames = docs.map(d => d.original_filename);
  state.hasPrimaryCad = docs.some(d => d.is_primary_cad);

  const operation = pickCmmOperation(await api.listOperations(partId), cmmMachineId);
  if (!operation) return state;
  state.operationId = operation.id;

  const [program] = await api.listCmmPrograms(operation.id);
  if (program) {
    state.programId = program.id;
    state.programState = program.workflow_state;
    state.programSource = program.description ?? null;
  }
  const [sheet] = await api.listSetupSheets(operation.id);
  if (sheet) {
    const detail = await api.getSetupSheet(sheet.id);
    state.setupSheetId = sheet.id;
    state.setupSheetState = detail.workflow_state;
    state.photoNames = (detail.photos || []).map(p => p.file_name);
  }
  return state;
}

/**
 * @param {{ row, settings, api, release: boolean }} args
 *   row: { parsed, customerId, partChoice: number|'new'|'skip'|null, customerPartNumber, revision, name }
 *   settings: { cmmMachineId, opDefaults, workflowStates }
 * @returns {Promise<{ ok: boolean, steps: {key, status, message?}[], partId: number|null, importState: object|null }>}
 */
export async function importProgram({ row, settings, api, release }) {
  const steps = [];
  const add = (key, status, message) => steps.push(message ? { key, status, message } : { key, status });
  const { parsed, partChoice } = row;

  if (partChoice === 'skip') {
    STEP_KEYS.forEach(k => add(k, 'skipped'));
    return { ok: true, steps, partId: null, importState: null };
  }
  if (partChoice !== 'new' && typeof partChoice !== 'number') {
    add('bauteil', 'error', 'Bauteil wählen');
    return { ok: false, steps, partId: null, importState: null };
  }

  let partId = typeof partChoice === 'number' ? partChoice : null;
  let state = emptyState();
  let current = 'probelauf';
  const programFiles = {
    files: filesOf([...parsed.files.program, ...parsed.files.drawingPdf]),
    templateFiles: filesOf(parsed.files.template),
    calibrationFiles: filesOf(parsed.files.calibration),
  };
  const stateId = (name) => settings.workflowStates.find(s => s.name === name)?.id;

  // Schritt für Schritt bis „Freigegeben“; false = Status lässt das nicht zu
  async function releaseEntity(key, entityType, entityId, stateName) {
    const path = releasePath(stateName);
    if (path === null) {
      add(key, 'error', `Status „${stateName}“ – bitte von Hand freigeben`);
      return false;
    }
    if (path.length === 0) { add(key, 'skipped', 'schon freigegeben'); return true; }
    for (const to of path) {
      await api.workflowChange({ entityType, entityId, toStateId: stateId(to), changeReason: RELEASE_REASON });
    }
    add(key, 'done');
    return true;
  }

  try {
    if (partId) state = await loadImportState(api, partId, settings.cmmMachineId);
    if (state.programId && isOtherSource(state.programSource, parsed)) {
      add('messprogramm', 'error',
        `Am Mess-Arbeitsgang liegt schon das Messprogramm aus Ordner „${sourceFolder(state.programSource)}“ – diesen Ordner von Hand anlegen`);
      return { ok: false, steps, partId, importState: state };
    }

    current = 'probelauf';
    if (!state.programId) {
      const check = await api.dryRunCmm(programFiles);
      if (!check.valid) {
        add('probelauf', 'error', (check.errors || []).join('; ') || 'Dateien unvollständig oder ungültig');
        return { ok: false, steps, partId, importState: state };
      }
      add('probelauf', 'done');
    } else {
      add('probelauf', 'skipped');
    }

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

    current = 'arbeitsgang';
    if (!state.operationId) {
      const op = await api.createOperation({ part_id: partId, machine_id: settings.cmmMachineId, ...settings.opDefaults });
      state.operationId = op.id;
      add('arbeitsgang', 'done');
    } else {
      add('arbeitsgang', 'skipped');
    }

    current = 'messprogramm';
    if (!state.programId) {
      const created = await api.createCmmProgram({
        operation_id: state.operationId,
        program_name: row.name,
        comment: importComment(parsed),
        description: importSource(parsed),
        ...programFiles,
      });
      state.programId = created.program.id;
      state.programState = created.program.workflow_state || 'draft';
      add('messprogramm', 'done');
    } else {
      add('messprogramm', 'skipped');
    }

    current = 'einrichteblatt';
    if (!state.setupSheetId) {
      const sheet = await api.createSetupSheet({ operation_id: state.operationId });
      state.setupSheetId = sheet.id;
      state.setupSheetState = 'draft';
      add('einrichteblatt', 'done');
    } else {
      add('einrichteblatt', 'skipped');
    }

    current = 'fotos';
    const photos = parsed.files.photos.filter(i => !state.photoNames.includes(baseName(i)));
    for (const item of photos) {
      await api.uploadSetupPhoto(state.setupSheetId, item.file);
      state.photoNames.push(baseName(item));
    }
    add('fotos', photos.length ? 'done' : 'skipped', photos.length ? `${photos.length} hochgeladen` : undefined);

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

    // Status erst jetzt lesen: ein Foto-Upload setzt ein freigegebenes Blatt auf Entwurf zurück
    current = 'freigabe_programm';
    const program = (await api.listCmmPrograms(state.operationId)).find(p => p.id === state.programId);
    state.programState = program?.workflow_state ?? state.programState;
    if (!await releaseEntity('freigabe_programm', 'program', state.programId, state.programState)) {
      return { ok: false, steps, partId, importState: state };
    }

    current = 'freigabe_einrichteblatt';
    const sheet = await api.getSetupSheet(state.setupSheetId);
    state.setupSheetState = sheet.workflow_state;
    if (!await releaseEntity('freigabe_einrichteblatt', 'setup_sheet', state.setupSheetId, state.setupSheetState)) {
      return { ok: false, steps, partId, importState: state };
    }
    return { ok: true, steps, partId, importState: state };
  } catch (error) {
    add(current, 'error', error.message);
    return { ok: false, steps, partId, importState: state };
  }
}
