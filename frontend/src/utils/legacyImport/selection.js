/**
 * Altbestand-Import: Auswahl – was aus einem Programmordner wohin übernommen wird
 *
 * Der Parser liefert die Messprogramme des Ordners (`units`, eins je Ordner mit .prg) und die Dateien,
 * die zum ganzen Ordner gehören (`files`). Hier entscheidet der Nutzer je Datei (abwählen, PDF als
 * Prüfzeichnung oder Bauteil-Dokument, Haupt-CAD, Foto/Vorlage zu welchem Messprogramm) und je
 * Messprogramm (abwählen, OP-Nummer und Name des eigenen Mess-Arbeitsgangs).
 *
 * selection: {
 *   choices: { [path]: choice },                     // nur Abweichungen von der Vorbelegung
 *   primaryCad: path | null,
 *   units: { [unitPath]: { skip?, opNumber?, opName? } },
 * }
 * choice: 'program' | 'drawing' | 'part_document' | 'calibration' | 'skip' | 'photo:<unitPath>' | 'template:<unitPath>'
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */
import { unitSource } from './match.js';

export const CHOICE_LABELS = {
  program: 'Messprogramm',
  drawing: 'Prüfzeichnung',
  part_document: 'Bauteil-Dokument',
  calibration: 'Kalibrierprogramm',
  skip: 'nicht übernehmen',
};

// Gruppen in Anzeigereihenfolge (Programmdateien stehen je Messprogramm, siehe FileSelection)
export const GROUP_LABELS = {
  pdf: 'Gestempelte Zeichnung',
  cad: 'CAD-Modelle',
  document: 'Weitere Zeichnungen',
  photos: 'Fotos (Einrichteblatt)',
  calibration: 'Kalibrierprogramm',
  template: 'Excel-Vorlage',
};

const baseName = (item) => item.path.split('/').pop();
const isPdf = (item) => /\.pdf$/i.test(item.path);
const isPrg = (item) => /\.prg$/i.test(item.path);
const PDF_CHOICES = ['drawing', 'part_document', 'skip'];

/** Ziel-Messprogramm einer Auswahl wie 'photo:<unitPath>' – sonst null */
export function choiceUnit(choice) {
  const i = choice.indexOf(':');
  return i === -1 ? null : choice.slice(i + 1);
}

/**
 * Alle Dateien einer Zeile mit möglichen Zielen und Vorbelegung
 * unit = Pfad des Messprogramms, zu dem die Datei gehört (null = ganzer Ordner)
 * @returns {{ item, path, name, group, unit: string|null, choices: string[], defaultChoice: string, required: boolean }[]}
 */
export function fileEntries(parsed) {
  const f = parsed.files;
  const entries = [];
  const add = (item, group, unit, choices, defaultChoice = choices[0]) => entries.push({
    item, path: item.path, name: baseName(item), group, unit, choices, defaultChoice, required: choices.length === 1,
  });
  const photoChoices = [...parsed.units.map((u) => `photo:${u.path}`), 'skip'];
  const templateChoices = [...parsed.units.map((u) => `template:${u.path}`), 'skip'];

  // PDF im Messprogramm-Ordner ist oft ein Messprotokoll – Prüfzeichnung nur, wenn sonst keine da ist
  const programPdfDefault = f.drawingPdf.length > 0 ? 'skip' : 'drawing';
  parsed.units.forEach((u) => {
    u.files.program.forEach((item) => {
      if (isPdf(item)) add(item, 'program', u.path, PDF_CHOICES, programPdfDefault);
      else if (isPrg(item)) add(item, 'program', u.path, ['program']);
      else add(item, 'program', u.path, ['program', 'skip']);
    });
    u.files.template.forEach((item) => add(item, 'template', u.path, templateChoices, `template:${u.path}`));
  });
  f.drawingPdf.forEach((item) => add(item, 'pdf', null, PDF_CHOICES));
  f.cad.forEach((item) => add(item, 'cad', null, ['part_document', 'skip']));
  f.drawingOther.forEach((item) => add(item, 'document', null, ['part_document', 'skip']));
  f.photos.forEach((item) => add(item, 'photos', null, photoChoices));
  f.calibration.forEach((item) => add(item, 'calibration', null, ['calibration', 'skip']));
  f.template.forEach((item) => add(item, 'template', null, templateChoices));
  return entries;
}

/** Gültige Auswahl für einen Eintrag (Unbekanntes und Pflichtdateien → Vorbelegung) */
export function choiceOf(entry, selection = {}) {
  const chosen = selection.choices?.[entry.path];
  return chosen && entry.choices.includes(chosen) ? chosen : entry.defaultChoice;
}

/** Ist das Messprogramm ausgewählt? */
export function unitSelected(unitPath, selection = {}) {
  return !selection.units?.[unitPath]?.skip;
}

/**
 * Pfad des Haupt-CAD: gewähltes, sonst Vorschlag unter den übernommenen CAD-Modellen – Name mit der
 * Kunden-Teilenummer, sonst alphabetisch erstes (die Reihenfolge des Browsers ist zufällig); null = keins
 */
export function primaryCadPath(parsed, selection = {}) {
  const cads = fileEntries(parsed).filter((e) => e.group === 'cad' && choiceOf(e, selection) !== 'skip');
  if (cads.some((e) => e.path === selection.primaryCad)) return selection.primaryCad;
  const partNumber = String(parsed.customerPartNumber || '').trim().toLowerCase();
  const sorted = [...cads].sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const withNumber = partNumber ? sorted.find((e) => e.name.toLowerCase().includes(partNumber)) : null;
  return (withNumber || sorted[0])?.path ?? null;
}

/**
 * Dateien des ganzen Ordners nach der Auswahl: Bauteil-Dokumente (cad, drawingOther), gestempelte Zeichnung
 * (drawingPdf), Kalibrierprogramm und alle übernommenen Fotos (für Kurzfassung und Status)
 */
export function effectiveFiles(parsed, selection = {}) {
  const files = { calibration: [], photos: [], drawingPdf: [], drawingOther: [], cad: [] };
  const documents = [];
  const firstUnit = parsed.units.find((u) => unitSelected(u.path, selection));
  fileEntries(parsed).forEach((entry) => {
    const choice = choiceOf(entry, selection);
    if (choice === 'skip') return;
    if (entry.unit !== null && entry.group === 'program' && !unitSelected(entry.unit, selection)) return;
    if (choice === 'part_document') {
      if (entry.group === 'cad') files.cad.push(entry.item);
      else documents.push(entry);
    } else if (choice === 'drawing' && entry.group === 'pdf') files.drawingPdf.push(entry.item);
    else if (choice === 'calibration') files.calibration.push(entry.item);
    else if (choice.startsWith('photo:') && firstUnit) files.photos.push(entry.item);
  });
  // PDFs als Bauteil-Dokument vor den übrigen Zeichnungen (Reihenfolge wie in der Anzeige)
  files.drawingOther = [...documents.filter((e) => isPdf(e.item)), ...documents.filter((e) => !isPdf(e.item))]
    .map((e) => e.item);
  // Haupt-CAD zuerst – runImport macht das erste hochgeladene CAD zum Hauptdokument
  const primary = primaryCadPath(parsed, selection);
  files.cad.sort((a, b) => (b.path === primary) - (a.path === primary));
  return files;
}

/** OP-Nummer und Name des Mess-Arbeitsgangs eines Messprogramms (eigene Werte, sonst Vorgabe mit Bezeichnung) */
function operationFor(parsed, unit, selection, opDefaults) {
  const own = selection.units?.[unit.path] || {};
  const several = parsed.units.length > 1;
  const name = several ? `${opDefaults.op_name || ''} ${unit.label}`.trim() : opDefaults.op_name;
  return {
    op_number: own.opNumber?.trim() || opDefaults.op_number,
    op_name: own.opName?.trim() || name,
  };
}

/**
 * Ausgewählte Messprogramme mit ihren Dateien:
 * program (Programmdateien), drawingPdf (gestempelte Zeichnung + eigene PDF als Prüfzeichnung), template,
 * calibration (in jedem), photos (fürs eigene Einrichteblatt). Zugeordnetes eines abgewählten Programms
 * wandert zum ersten ausgewählten.
 */
export function effectiveUnits(parsed, selection = {}, opDefaults = {}) {
  const chosen = parsed.units.filter((u) => unitSelected(u.path, selection));
  if (chosen.length === 0) return [];
  const target = (unitPath) => (chosen.some((u) => u.path === unitPath) ? unitPath : chosen[0].path);
  const shared = effectiveFiles(parsed, selection);
  const entries = fileEntries(parsed);
  return chosen.map((u) => {
    const files = { program: [], drawingPdf: [...shared.drawingPdf], template: [], calibration: [...shared.calibration], photos: [] };
    entries.forEach((entry) => {
      const choice = choiceOf(entry, selection);
      if (entry.group === 'program' && entry.unit === u.path) {
        if (choice === 'program') files.program.push(entry.item);
        else if (choice === 'drawing') files.drawingPdf.unshift(entry.item);
      } else if (choice.startsWith('photo:') && target(choiceUnit(choice)) === u.path) files.photos.push(entry.item);
      else if (choice.startsWith('template:')) {
        // Vorlage aus einem Programmordner entfällt mit ihrem Programm; nur gemeinsame (z. B. „Vorlage“) wandert weiter
        const to = choiceUnit(choice);
        const resolved = chosen.some((c) => c.path === to) ? to : (entry.unit === null ? chosen[0].path : null);
        if (resolved === u.path) files.template.push(entry.item);
      }
    });
    return {
      path: u.path,
      label: u.label,
      source: unitSource(parsed, u.path),
      operation: operationFor(parsed, u, selection, opDefaults),
      files,
    };
  });
}

/** Alle Messprogramme mit Herkunft und geplantem Arbeitsgang – zum Laden des Stands im MDS */
export function importTargets(parsed, selection = {}, opDefaults = {}) {
  return parsed.units.map((u) => {
    const op = operationFor(parsed, u, selection, opDefaults);
    return { path: u.path, source: unitSource(parsed, u.path), opName: op.op_name, opNumber: op.op_number };
  });
}

/**
 * Auswahl nach dem Stand im MDS (schon übernommener Ordner): Messprogramme ohne Programm im MDS, Fotos und
 * Dokumente, die dort fehlen, gelten als damals abgewählt; eine PDF beim Bauteil als Bauteil-Dokument;
 * ein Foto gehört zu dem Messprogramm, an dessen Einrichteblatt es liegt. Nur Abweichungen von der Vorbelegung.
 */
export function selectionFromMds(parsed, importState) {
  const unitStates = importState.units || {};
  const docs = new Set(importState.documentNames || []);
  const units = {};
  // Nur wenn ein Unterordner-Programm übernommen ist, war die Übernahme mit dieser Version: dann gilt Fehlendes als
  // abgewählt. Die alte Version konnte Unterordner nicht übernehmen – deren Programme bleiben ausgewählt.
  if (parsed.units.some((u) => u.path !== '' && unitStates[u.path]?.programId)) {
    parsed.units.forEach((u) => { if (!unitStates[u.path]?.programId) units[u.path] = { skip: true }; });
  }
  const choices = {};
  fileEntries(parsed).forEach((entry) => {
    let choice = entry.defaultChoice;
    if (entry.group === 'photos') {
      const owner = parsed.units.find((u) => (unitStates[u.path]?.photoNames || []).includes(entry.name));
      choice = owner ? `photo:${owner.path}` : 'skip';
    } else if (entry.group === 'cad' || entry.group === 'document') choice = docs.has(entry.name) ? 'part_document' : 'skip';
    else if ((entry.group === 'pdf' || (entry.group === 'program' && isPdf(entry.item))) && docs.has(entry.name)) choice = 'part_document';
    if (choice !== entry.defaultChoice) choices[entry.path] = choice;
  });
  return { choices, units };
}

/** Zeile mit den ausgewählten Dateien und Messprogrammen (für Status und Übernehmen) */
export function withSelection(parsed, selection = {}, opDefaults = {}) {
  const units = effectiveUnits(parsed, selection, opDefaults);
  const errors = [...parsed.errors];
  if (units.length === 0 && parsed.units.length > 0) errors.push('Kein Messprogramm ausgewählt');
  parsed.units.filter((u) => unitSelected(u.path, selection)).forEach((u) => errors.push(...(u.errors || [])));
  // Excel-Vorlage: ein Name darf im MDS nur an einem Messprogramm hängen, ein Programm hat höchstens eine
  const baseOf = (item) => baseName(item).replace(/\.(xlsx|layout\.xml)$/i, '');
  const owners = new Map();
  units.forEach((u) => {
    const bases = [...new Set(u.files.template.map(baseOf))];
    if (bases.length > 1) errors.push(`Mehrere Excel-Vorlagen bei „${u.label}“ – nur eine zuordnen`);
    bases.forEach((b) => owners.set(b.toLowerCase(), [...(owners.get(b.toLowerCase()) || []), { name: b, unit: u.label }]));
  });
  owners.forEach((list) => {
    if (list.length > 1) errors.push(`Excel-Vorlage „${list[0].name}“ ist mehreren Messprogrammen zugeordnet (${list.map((x) => x.unit).join(', ')}) – nur einem zuordnen`);
  });
  return {
    ...parsed, errors, files: effectiveFiles(parsed, selection), units,
    unitCount: parsed.units.length, targets: importTargets(parsed, selection, opDefaults),
  };
}

/** Kurzfassung für die zugeklappte Zeile, z. B. „3 Messprogramme · 1 Prüfzeichnung · 2 CAD · 3 Fotos“ */
export function fileSummary(row) {
  const { files, units } = row;
  const n = (count, one, many) => (count ? `${count} ${count === 1 ? one : many}` : null);
  const parts = [
    row.unitCount > 1 ? n(units.length, 'Messprogramm', 'Messprogramme') || '0 Messprogramme' : null,
    n(files.drawingPdf.length, 'Prüfzeichnung', 'Prüfzeichnungen'),
    n(files.cad.length, 'CAD', 'CAD'),
    n(files.drawingOther.length, 'Dokument', 'Dokumente'),
    n(files.photos.length, 'Foto', 'Fotos'),
    files.calibration.length ? 'Kalibrierprogramm' : null,
    units.some((u) => u.files.template.length) ? 'Excel-Vorlage' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'nur Messprogramm';
}
