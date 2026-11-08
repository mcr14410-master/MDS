/**
 * Altbestand-Import: eingelesene Ordnerstruktur in Programme zerlegen
 * (Spec: docs/konzepte/ALTBESTAND_IMPORT_SPEC.md, 2 und 3)
 *
 * Eingabe: [{ path, ... }] mit Pfad relativ zur Auswahl ('/' als Trenner, erstes Stück = gewählter Ordner).
 * Die Objekte werden unverändert in die Dateilisten übernommen (die Seite gibt { path, file } hinein).
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */
import { DEFAULT_PROFILE } from './profile.js';

const stripNumber = (name) => name.replace(/^\d+[_\s-]*/, '');
const ext = (name) => (name.includes('.') ? name.split('.').pop().toLowerCase() : '');
const isPrg = (name) => /\.prg$/i.test(name);
const isTemplate = (name) => /\.(xlsx|layout\.xml)$/i.test(name);
const findRule = (rules, folderName) => rules.find(r => r.match.test(stripNumber(folderName))) || null;

const REVISION_TOKEN = /^(?:rev\.?|idx|index)?([A-Za-z0-9-]{1,2})$/i;
const INDEX_IN_FOLDER = /index\s*([A-Za-z0-9-]+)/i;

const UNKNOWN_FOLDER = 'Unbekannter Ordner – nicht übernommen';
const DOCUMENT_TYPE_REJECTED = 'Dateityp bei Bauteil-Dokumenten nicht erlaubt – nicht übernommen';

function emptyFiles() {
  return { program: [], template: [], calibration: [], photos: [], drawingPdf: [], drawingOther: [], cad: [] };
}

// Kopfdaten aus dem Namen des Programmordners: Maschine _ Kunden-Teilenr. _ [Rev.] _ Name
function parseProgramFolderName(programFolder) {
  const tokens = programFolder.split('_');
  const machineCode = tokens[0] || '';
  const customerPartNumber = tokens[1] || '';
  let rest = tokens.slice(2);
  let nameRevision = null;
  if (rest.length >= 2) {
    const m = rest[0].match(REVISION_TOKEN);
    if (m) {
      nameRevision = m[1];
      rest = rest.slice(1);
    }
  }
  const name = rest.join(' ').trim() || customerPartNumber;
  return { machineCode, customerPartNumber, nameRevision, name, schemaOk: tokens.length >= 2 };
}

/**
 * @param {{path: string}[]} items
 * @param {typeof DEFAULT_PROFILE} profile
 * @returns {{ programs: object[], notices: string[] }}
 */
export function parseLegacyTree(items, profile = DEFAULT_PROFILE) {
  const programRule = profile.folders.find(r => r.key === 'program');
  const split = items.map(item => ({ item, segs: item.path.split('/').filter(Boolean) }));

  // Programmordner = Ordner mit einem direkten Unterordner „…Messprogramm…“
  const candidates = new Set();
  for (const { segs } of split) {
    for (let i = 1; i < segs.length - 1; i++) {
      if (programRule.match.test(stripNumber(segs[i]))) candidates.add(segs.slice(0, i).join('/'));
    }
  }
  // Nur äußerste: ein Programmordner in einem anderen (z. B. unter „Alte Daten“) zählt nicht extra
  const programDirs = [...candidates].filter(dir =>
    ![...candidates].some(other => other !== dir && dir.startsWith(`${other}/`)));

  const programs = programDirs.map(dir => {
    const dirSegs = dir.split('/');
    const programFolder = dirSegs[dirSegs.length - 1];
    const customerFolder = dirSegs.length >= 2 ? dirSegs[dirSegs.length - 2] : null;
    const head = parseProgramFolderName(programFolder);
    const files = emptyFiles();
    const skipped = [];
    const warnings = [];
    const errors = [];
    let indexRevision = null;

    const skip = (item, reason) => skipped.push({ path: item.path, reason });

    for (const { item, segs } of split) {
      if (!item.path.startsWith(`${dir}/`)) continue;
      const rel = segs.slice(dirSegs.length);
      const fileName = rel[rel.length - 1];
      if (rel.length === 1) { skip(item, 'Datei direkt im Programmordner – nicht übernommen'); continue; }

      const rule = findRule(profile.folders, rel[0]);
      if (!rule) { skip(item, UNKNOWN_FOLDER); continue; }
      if (rule.skip) { skip(item, rule.skip); continue; }

      if (rule.key === 'program') {
        const m = rel[0].match(INDEX_IN_FOLDER);
        if (m && indexRevision === null) indexRevision = m[1];
        if (rel.length > 2) skip(item, 'Unterordner im Messprogramm-Ordner – nicht übernommen');
        else (isTemplate(fileName) ? files.template : files.program).push(item);
      } else if (rule.key === 'calibration') {
        if (rel.length === 2 && isPrg(fileName)) files.calibration.push(item);
        else skip(item, 'Beim Kalibrierprogramm zählt nur die .prg – nicht übernommen');
      } else if (rule.children) {
        if (rel.length === 2) { skip(item, `Datei direkt im Ordner „${rel[0]}“ – nicht übernommen`); continue; }
        const child = findRule(rule.children, rel[1]);
        if (!child) { skip(item, UNKNOWN_FOLDER); continue; }
        if (child.skip) { skip(item, child.skip); continue; }
        if (child.key === 'photos') {
          if (profile.photoExtensions.includes(ext(fileName))) files.photos.push(item);
          else skip(item, 'Bildformat nicht unterstützt (nur JPG, PNG, WebP) – nicht übernommen');
        } else if (child.key === 'drawing') {
          if (ext(fileName) === 'pdf') files.drawingPdf.push(item);
          else if (profile.drawingExtensions.includes(ext(fileName))) files.drawingOther.push(item);
          else skip(item, DOCUMENT_TYPE_REJECTED);
        } else if (child.key === 'cad') {
          if (profile.cadExtensions.includes(ext(fileName))) files.cad.push(item);
          else skip(item, DOCUMENT_TYPE_REJECTED);
        } else {
          skip(item, UNKNOWN_FOLDER);
        }
      } else {
        skip(item, UNKNOWN_FOLDER);
      }
    }

    // Gestempelte Zeichnung, die schon im Messprogramm-Ordner liegt, nur einmal übernehmen
    const programNames = new Set(files.program.map(i => i.path.split('/').pop().toLowerCase()));
    files.drawingPdf = files.drawingPdf.filter(item => {
      if (!programNames.has(item.path.split('/').pop().toLowerCase())) return true;
      skip(item, 'Liegt schon im Messprogramm-Ordner – nicht doppelt übernommen');
      return false;
    });

    if (!customerFolder) errors.push('Kundenordner fehlt – Kunden- oder Quellordner wählen');
    if (!head.schemaOk) errors.push('Ordnername passt nicht zum Schema Maschine_Teilenummer_Name');
    const prgCount = files.program.filter(i => isPrg(i.path)).length;
    if (prgCount === 0) errors.push('Keine .prg im Messprogramm-Ordner');
    if (prgCount > 1) errors.push('Mehrere .prg im Messprogramm-Ordner');

    let revision = indexRevision;
    if (indexRevision !== null && head.nameRevision !== null
      && indexRevision.toLowerCase() !== head.nameRevision.toLowerCase()) {
      warnings.push(`Revision im Ordnernamen (${head.nameRevision}) weicht vom Index (${indexRevision}) ab`);
    }
    if (indexRevision === null) {
      if (head.nameRevision !== null) {
        revision = head.nameRevision;
        warnings.push('Kein Index im Messprogramm-Ordner – Revision aus dem Ordnernamen');
      } else {
        errors.push('Revision fehlt – weder im Ordnernamen noch als Index');
      }
    }

    return {
      key: customerFolder ? `${customerFolder}/${programFolder}` : programFolder,
      customerFolder,
      programFolder,
      customerNumber: customerFolder ? customerFolder.trim().split(/\s+/)[0] : null,
      machineCode: head.machineCode,
      customerPartNumber: head.customerPartNumber,
      revision,
      indexRevision,
      nameRevision: head.nameRevision,
      name: head.name,
      files,
      skipped,
      warnings,
      errors,
    };
  }).sort((a, b) => a.key.localeCompare(b.key));

  // Gleiches Ziel (Kunde, Teilenummer, Revision, Maschine) aus zwei Ordnern: nur der erste wird übernommen,
  // sonst landen beide im selben Messprogramm und die zweite .prg fehlt
  const firstByTarget = new Map();
  for (const program of programs) {
    if (!program.customerNumber || program.revision === null) continue;
    const target = [program.customerNumber, program.customerPartNumber, program.revision, program.machineCode]
      .map(v => String(v).trim().toLowerCase()).join('|');
    const first = firstByTarget.get(target);
    if (first) {
      program.errors.push(`Gleiches Bauteil und gleiche Maschine wie Ordner „${first.programFolder}“ – nur einer wird übernommen, diesen von Hand anlegen`);
    } else {
      firstByTarget.set(target, program);
    }
  }

  const notices = programs.length === 0
    ? ['Kein Programmordner gefunden – erwartet wird ein Ordner mit einem Unterordner „…Messprogramm…“ (Kunden- oder Quellordner wählen)']
    : [];
  return { programs, notices };
}
