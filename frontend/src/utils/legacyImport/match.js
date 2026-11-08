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

/** true = das vorhandene Messprogramm stammt aus einem anderen Altbestand-Ordner */
export function isOtherSource(programSource, parsed) {
  return typeof programSource === 'string' && programSource.startsWith(SOURCE_PREFIX)
    && programSource !== importSource(parsed);
}

/** Ordnername aus dem Herkunftsvermerk */
export function sourceFolder(programSource) {
  return programSource.slice(SOURCE_PREFIX.length).split('\\').pop();
}

/** Schon übernommenes Messprogramm aus diesem Ordner (Herkunftsvermerk), bei mehreren das neueste; sonst null */
export function findImportedProgram(programs, parsed) {
  const source = importSource(parsed);
  return programs.filter(p => p.description === source).sort((a, b) => b.id - a.id)[0] || null;
}

/**
 * Status einer Zeile.
 * importState: null (nicht geladen) oder
 *   { operationId, programId, programState, programSource, setupSheetId, setupSheetState, photoNames, documentNames }
 * release: true = „Direkt freigeben“ ist an – dann gehört die Freigabe zu den Schritten (Spec 6)
 * @returns {'error'|'new'|'choose_part'|'other_revision'|'part_exists'|'conflict'|'partial'|'imported'}
 */
export function rowStatus({ parsed, customer, candidates, importState, release = false }) {
  if (parsed.errors.length > 0 || !customer) return 'error';
  if (candidates.same.length > 1) return 'choose_part';
  if (candidates.same.length === 0) return candidates.otherRevisions.length > 0 ? 'other_revision' : 'new';
  if (!importState) return 'part_exists';
  if (importState.programId && isOtherSource(importState.programSource, parsed)) return 'conflict';

  const expected = expectedNames(parsed);
  const photos = new Set(importState.photoNames);
  const docs = new Set(importState.documentNames);
  const steps = [
    Boolean(importState.operationId),
    Boolean(importState.programId),
    Boolean(importState.setupSheetId),
    expected.photos.every(n => photos.has(n)) && (expected.photos.length === 0 || Boolean(importState.setupSheetId)),
    expected.documents.every(n => docs.has(n)),
  ];
  if (release) steps.push(importState.programState === 'released' && importState.setupSheetState === 'released');
  // Fotos/Dokumente zählen erst als „schon da“, wenn auch etwas angelegt wurde
  const anyCreated = steps.slice(0, 3).some(Boolean) || importState.photoNames.length > 0
    || expected.documents.some(n => docs.has(n));
  if (steps.every(Boolean)) return 'imported';
  return anyCreated ? 'partial' : 'part_exists';
}
