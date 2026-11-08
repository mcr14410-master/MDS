/**
 * Altbestand-Import: Dateiauswahl – was aus einem Programmordner wohin übernommen wird
 *
 * Der Parser ordnet jede Datei einem Ziel zu (parse.js). Hier kann der Nutzer je Datei umentscheiden
 * (abwählen, PDF als Prüfzeichnung oder Bauteil-Dokument, Haupt-CAD). Ergebnis ist dieselbe Struktur
 * `files`, die runImport.js und match.js schon verarbeiten.
 *
 * selection: { choices: { [path]: choice }, primaryCad: path | null } – nur Abweichungen von der Vorbelegung
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */

export const CHOICE_LABELS = {
  program: 'Messprogramm',
  drawing: 'Prüfzeichnung',
  part_document: 'Bauteil-Dokument',
  photo: 'Einrichteblatt',
  calibration: 'Kalibrierprogramm',
  template: 'Excel-Vorlage',
  skip: 'nicht übernehmen',
};

// Gruppen in Anzeigereihenfolge
export const GROUP_LABELS = {
  program: 'Messprogramm',
  pdf: 'PDF',
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

/**
 * Alle Dateien einer Zeile mit möglichen Zielen und Vorbelegung
 * @returns {{ item, path, name, group, choices: string[], defaultChoice: string, required: boolean }[]}
 */
export function fileEntries(parsed) {
  const f = parsed.files;
  const entries = [];
  const add = (item, group, choices, defaultChoice = choices[0]) => entries.push({
    item, path: item.path, name: baseName(item), group, choices, defaultChoice, required: choices.length === 1,
  });

  // PDF im Messprogramm-Ordner ist oft ein Messprotokoll – Prüfzeichnung nur, wenn sonst keine da ist
  const programPdfDefault = f.drawingPdf.length > 0 ? 'skip' : 'drawing';
  f.program.forEach((item) => {
    if (isPdf(item)) add(item, 'pdf', PDF_CHOICES, programPdfDefault);
    else if (isPrg(item)) add(item, 'program', ['program']);
    else add(item, 'program', ['program', 'skip']);
  });
  f.drawingPdf.forEach((item) => add(item, 'pdf', PDF_CHOICES));
  f.cad.forEach((item) => add(item, 'cad', ['part_document', 'skip']));
  f.drawingOther.forEach((item) => add(item, 'document', ['part_document', 'skip']));
  f.photos.forEach((item) => add(item, 'photos', ['photo', 'skip']));
  f.calibration.forEach((item) => add(item, 'calibration', ['calibration', 'skip']));
  f.template.forEach((item) => add(item, 'template', ['template', 'skip']));
  return entries;
}

/** Gültige Auswahl für einen Eintrag (Unbekanntes und Pflichtdateien → Vorbelegung) */
export function choiceOf(entry, selection = {}) {
  const chosen = selection.choices?.[entry.path];
  return chosen && entry.choices.includes(chosen) ? chosen : entry.defaultChoice;
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

/** Dateien je Ziel nach der Auswahl (gleiche Struktur wie parsed.files, Items unverändert) */
export function effectiveFiles(parsed, selection = {}) {
  const files = { program: [], template: [], calibration: [], photos: [], drawingPdf: [], drawingOther: [], cad: [] };
  const target = { program: 'program', drawing: 'drawingPdf', photo: 'photos', calibration: 'calibration', template: 'template' };
  const documents = [];
  fileEntries(parsed).forEach((entry) => {
    const choice = choiceOf(entry, selection);
    if (choice === 'skip') return;
    if (choice === 'part_document') {
      if (entry.group === 'cad') files.cad.push(entry.item);
      else documents.push(entry);
      return;
    }
    files[target[choice]].push(entry.item);
  });
  // PDFs als Bauteil-Dokument vor den übrigen Zeichnungen (Reihenfolge wie in der Anzeige)
  files.drawingOther = [...documents.filter((e) => e.group === 'pdf'), ...documents.filter((e) => e.group !== 'pdf')]
    .map((e) => e.item);
  // Haupt-CAD zuerst – runImport macht das erste hochgeladene CAD zum Hauptdokument
  const primary = primaryCadPath(parsed, selection);
  files.cad.sort((a, b) => (b.path === primary) - (a.path === primary));
  return files;
}

/**
 * Auswahl nach dem Stand im MDS (schon übernommener Ordner): Fotos und Dokumente, die dort fehlen, gelten
 * als damals abgewählt; eine PDF, die beim Bauteil liegt, als Bauteil-Dokument. Nur Abweichungen von der Vorbelegung.
 */
export function selectionFromMds(parsed, importState) {
  const photos = new Set(importState.photoNames || []);
  const docs = new Set(importState.documentNames || []);
  const choices = {};
  fileEntries(parsed).forEach((entry) => {
    let choice = entry.defaultChoice;
    if (entry.group === 'photos') choice = photos.has(entry.name) ? 'photo' : 'skip';
    else if (entry.group === 'cad' || entry.group === 'document') choice = docs.has(entry.name) ? 'part_document' : 'skip';
    else if (entry.group === 'pdf' && docs.has(entry.name)) choice = 'part_document';
    if (choice !== entry.defaultChoice) choices[entry.path] = choice;
  });
  return { choices };
}

/** Zeile mit den ausgewählten Dateien (für Status und Übernehmen) */
export function withSelection(parsed, selection = {}) {
  return { ...parsed, files: effectiveFiles(parsed, selection) };
}

/** Kurzfassung für die zugeklappte Zeile, z. B. „1 Prüfzeichnung · 2 CAD · 3 Fotos“ */
export function fileSummary(files) {
  const n = (count, one, many) => (count ? `${count} ${count === 1 ? one : many}` : null);
  const parts = [
    n(files.drawingPdf.length, 'Prüfzeichnung', 'Prüfzeichnungen'),
    n(files.cad.length, 'CAD', 'CAD'),
    n(files.drawingOther.length, 'Dokument', 'Dokumente'),
    n(files.photos.length, 'Foto', 'Fotos'),
    files.calibration.length ? 'Kalibrierprogramm' : null,
    files.template.length ? 'Excel-Vorlage' : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'nur Messprogramm';
}
