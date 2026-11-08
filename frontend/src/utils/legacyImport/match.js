/**
 * Altbestand-Import: Abgleich der eingelesenen Programme mit dem MDS
 * (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 4 und 5)
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */

const norm = (value) => String(value ?? '').trim().toLowerCase();
const baseName = (item) => item.path.split('/').pop();

/** Kunde über die Kundennummer (Groß/klein und Leerzeichen egal) */
export function matchCustomer(customerNumber, customers) {
  if (!customerNumber) return null;
  const wanted = norm(customerNumber);
  return customers.find(c => c.customer_number && norm(c.customer_number) === wanted) || null;
}

/** Bauteile des Kunden mit gleicher Kunden-Teilenummer – gleiche Revision bzw. andere Revision */
export function findPartCandidates({ customerId, customerPartNumber, revision }, parts) {
  const sameNumber = parts.filter(p => p.customer_id === customerId
    && p.customer_part_number && norm(p.customer_part_number) === norm(customerPartNumber));
  return {
    same: sameNumber.filter(p => norm(p.revision) === norm(revision)),
    otherRevisions: sameNumber.filter(p => norm(p.revision) !== norm(revision)),
  };
}

/** Genau eine KMG-Maschine (Maschine mit Messmittel) → Vorbelegung, sonst null */
export function defaultCmmMachine(machines) {
  const cmm = machines.filter(m => m.measuring_equipment_id != null);
  return cmm.length === 1 ? cmm[0] : null;
}

/** Mess-Arbeitsgang am Bauteil: erster Arbeitsgang der KMG-Maschine nach Reihenfolge */
export function pickCmmOperation(operations, cmmMachineId) {
  const ops = operations
    .filter(o => o.machine_id === cmmMachineId)
    .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  return ops[0] || null;
}

/** Dateinamen, die nach der Übernahme am Einrichteblatt bzw. bei den Bauteil-Dokumenten liegen müssen */
export function expectedNames(parsed) {
  return {
    photos: parsed.files.photos.map(baseName),
    documents: [...parsed.files.cad, ...parsed.files.drawingOther].map(baseName),
  };
}

const SOURCE_PREFIX = 'Altbestand: ';

/** Herkunftsvermerk am Messprogramm (Beschreibung) – erkennt einen zweiten Ordner fürs selbe Ziel */
export function importSource(parsed) {
  return `${SOURCE_PREFIX}${parsed.customerFolder}\\${parsed.programFolder}`;
}

/**
 * Herkunftsvermerk eines Messprogramms im Ordner: Programm direkt im Messprogramm-Ordner wie bisher,
 * Programm in einem Unterordner mit dessen Pfad („…\\Messprogramm_Fertigung\\AG1“)
 */
export function unitSource(parsed, unitPath) {
  return unitPath ? `${importSource(parsed)}\\${unitPath.split('/').join('\\')}` : importSource(parsed);
}

/** true = das vorhandene Messprogramm stammt aus einem anderen Altbestand-Ordner */
export function isOtherSource(programSource, parsed) {
  return typeof programSource === 'string' && programSource.startsWith(SOURCE_PREFIX)
    && programSource !== importSource(parsed);
}

/** true = Herkunftsvermerk eines anderen Altbestand-Ordners (nicht dieser Ordner, auch nicht eines seiner Unterordner) */
export function isForeignSource(programSource, parsed) {
  if (typeof programSource !== 'string' || !programSource.startsWith(SOURCE_PREFIX)) return false;
  const source = importSource(parsed);
  return programSource !== source && !programSource.startsWith(`${source}\\`);
}

/** Programmordner aus dem Herkunftsvermerk (Kunde\\Programmordner[\\Unterordner …]) */
export function sourceFolder(programSource) {
  const parts = programSource.slice(SOURCE_PREFIX.length).split('\\');
  return parts[1] ?? parts[parts.length - 1];
}

/** Schon übernommenes Messprogramm aus diesem Ordner (Herkunftsvermerk), bei mehreren das neueste; sonst null */
export function findImportedProgram(programs, parsed) {
  const source = importSource(parsed);
  return programs
    .filter(p => typeof p.description === 'string' && (p.description === source || p.description.startsWith(`${source}\\`)))
    .sort((a, b) => b.id - a.id)[0] || null;
}

/**
 * Status einer Zeile (nach withSelection: `units` = ausgewählte Messprogramme).
 * importState: null (nicht geladen) oder
 *   { documentNames, units: { [unitPath]: { operationId, programId, programState, programSource,
 *     setupSheetId, setupSheetState, photoNames } } }
 * release: true = „Direkt freigeben“ ist an – dann gehört die Freigabe zu den Schritten (Spec 6)
 * @returns {'error'|'new'|'choose_part'|'other_revision'|'part_exists'|'conflict'|'partial'|'imported'}
 */
export function rowStatus({ parsed, customer, candidates, importState, release = false }) {
  if (parsed.errors.length > 0 || !customer) return 'error';
  if (candidates.same.length > 1) return 'choose_part';
  if (candidates.same.length === 0) return candidates.otherRevisions.length > 0 ? 'other_revision' : 'new';
  if (!importState) return 'part_exists';

  // Programm eines anderen Altbestand-Ordners an einem Mess-Arbeitsgang des Bauteils (loadImportState)
  if (importState.foreignSource) return 'conflict';
  const unitStates = importState.units || {};
  const stateOf = (u) => unitStates[u.path] || { photoNames: [] };
  // Einzelnes Programm direkt im Messprogramm-Ordner: Programm aus einem anderen Ordner am Mess-Arbeitsgang
  if (parsed.units.length === 1 && parsed.units[0].path === '') {
    const st = stateOf(parsed.units[0]);
    if (st.programId && isOtherSource(st.programSource, parsed)) return 'conflict';
  }

  const docs = new Set(importState.documentNames || []);
  const expectedDocs = expectedNames(parsed).documents;
  const steps = [expectedDocs.every(n => docs.has(n))];
  let anyCreated = expectedDocs.some(n => docs.has(n));
  parsed.units.forEach((u) => {
    const st = stateOf(u);
    const photos = new Set(st.photoNames || []);
    const expectedPhotos = u.files.photos.map(baseName);
    steps.push(
      Boolean(st.operationId),
      Boolean(st.programId),
      Boolean(st.setupSheetId),
      expectedPhotos.every(n => photos.has(n)) && (expectedPhotos.length === 0 || Boolean(st.setupSheetId)),
    );
    if (release) steps.push(st.programState === 'released' && st.setupSheetState === 'released');
    // Fotos/Dokumente zählen erst als „schon da“, wenn auch etwas angelegt wurde
    if (st.operationId || st.programId || st.setupSheetId || photos.size > 0) anyCreated = true;
  });
  if (steps.every(Boolean)) return 'imported';
  return anyCreated ? 'partial' : 'part_exists';
}
