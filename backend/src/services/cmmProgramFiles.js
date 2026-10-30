/**
 * Messprogramme (KMG / PC-DMIS): Dateien einordnen und Dateigruppe einer Revision planen
 *
 * Reine Funktionen ohne DB/Dateisystem – der Controller liest Dateien, rechnet Hashes und
 * schreibt in die DB. Regeln aus docs/konzepte/MESSPROGRAMME_KONZEPT.md (4.2, 4.4, 8).
 *
 * Neue Revision: Hochgeladen wird, was man hat (ganzer Ordner oder nur Geändertes).
 * Das MDS vergleicht per Hash mit der Vorversion; nicht hochgeladene Dateien werden
 * übernommen. Entfernen nur ausdrücklich (`remove`, Excel-Vorlage über `excelReport=false`,
 * Kalibrierprogramm über `calibration=false`).
 *
 * Hochgeladen wird in drei Bereichen mit eigenem Filter: Messprogramm (program), Excel-Vorlage
 * (template) und Kalibrierprogramm (calibration). Der Bereich bestimmt die Rolle, nicht der Name.
 */

const path = require('path');

// Rollen mit genau einer Datei je Revision; eine neue Datei ersetzt die der Vorversion
const SINGLE_ROLES = ['main', 'cad', 'report_xlsx', 'report_layout', 'calibration'];

const ROLE_LABELS = {
  main: 'Messprogramm (.prg)',
  cad: 'CAD-Datei (.cad)',
  drawing: 'Prüfzeichnung (.pdf)',
  report_xlsx: 'Excel-Protokollvorlage (.xlsx)',
  report_layout: 'Vorlagen-Layout (.layout.xml)',
  other: 'Mini-Routinen (.MiniRoutines.xml)',
  calibration: 'Kalibrierprogramm (.prg)',
};

const UPLOAD_AREAS = ['program', 'template', 'calibration'];

// Bereich, in dem eine Datei hochgeladen werden muss – für den Hinweis beim Aussortieren
const WRONG_AREA_REASON = {
  template: 'Excel-Vorlage – über „Excel-Protokoll“ hochladen',
  program: 'Gehört zum Messprogramm – im Hauptbereich hochladen',
};

/**
 * multer/busboy liefert Dateinamen als latin1 – UTF-8-Namen (Umlaute) zurückwandeln.
 * Nur wenn das Ergebnis gültiges UTF-8 ist, sonst Name unverändert lassen.
 */
function decodeOriginalName(name) {
  if (!/[\u0080-ÿ]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

/**
 * Einordnung nach Dateiname (ohne Groß-/Kleinschreibung) und Upload-Bereich.
 * kind: 'file' (mit role/target) | 'sidecar' (PC-DMIS-Nebendatei, wird aussortiert)
 *     | 'corrupt' (.prg.corrupt) | 'miniroutines' (nach Inhalt entscheiden)
 *     | 'cad_import' (STEP, steckt schon in der .cad) | 'unknown' (wird aussortiert)
 *     | 'ignored' (falscher Bereich oder Kalibrierprotokoll, mit `reason`; wird aussortiert)
 */
function classifyFile(name, area = 'program') {
  const info = classifyByName(name);
  if (info.kind === 'sidecar' || info.kind === 'corrupt' || info.kind === 'unknown') return info;
  const isTemplate = info.role === 'report_xlsx' || info.role === 'report_layout';

  if (area === 'template') {
    return isTemplate ? info : { kind: 'ignored', reason: WRONG_AREA_REASON.program };
  }
  if (area === 'calibration') {
    if (info.role === 'main') return { kind: 'file', role: 'calibration', target: 'program_dir' };
    if (info.role === 'drawing') {
      return { kind: 'ignored', reason: 'Kalibrierprotokoll (Ergebnis, kein Programmbestandteil) – nicht übernommen' };
    }
    if (isTemplate) return { kind: 'ignored', reason: WRONG_AREA_REASON.template };
    return { kind: 'ignored', reason: 'Beim Kalibrierprogramm zählt nur die .prg – nicht übernommen' };
  }
  return isTemplate ? { kind: 'ignored', reason: WRONG_AREA_REASON.template } : info;
}

function classifyByName(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.prg~') || lower.endsWith('.prg^')) return { kind: 'sidecar' };
  if (lower.endsWith('.prg.corrupt')) return { kind: 'corrupt' };
  if (lower.endsWith('.miniroutines.xml')) return { kind: 'miniroutines' };
  if (lower.endsWith('.layout.xml')) return { kind: 'file', role: 'report_layout', target: 'template_dir' };
  if (lower.endsWith('.xlsx')) return { kind: 'file', role: 'report_xlsx', target: 'template_dir' };
  if (lower.endsWith('.prg')) return { kind: 'file', role: 'main', target: 'program_dir' };
  if (lower.endsWith('.cad')) return { kind: 'file', role: 'cad', target: 'program_dir' };
  if (lower.endsWith('.pdf')) return { kind: 'file', role: 'drawing', target: 'program_dir' };
  if (lower.endsWith('.stp') || lower.endsWith('.step')) return { kind: 'cad_import' };
  return { kind: 'unknown' };
}

/**
 * MiniRoutines.xml mit selbst angelegten Mini-Routinen (<MiniRoutine …>) oder gefüllten
 * MarkSets gehört zum Programm; nur Standard-Inhalt = Nebendatei.
 */
function hasCustomMiniRoutines(xml) {
  if (/<MiniRoutine[\s>/]/.test(xml)) return true;
  const markSets = xml.match(/<MarkSets\s*>([\s\S]*?)<\/MarkSets>/);
  return Boolean(markSets && markSets[1].trim());
}

/** Basisname der Excel-Vorlage (ohne .xlsx bzw. .layout.xml) – so steht er im .prg */
function templateBaseName(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.layout.xml')) return name.slice(0, -'.layout.xml'.length);
  if (lower.endsWith('.xlsx')) return name.slice(0, -'.xlsx'.length);
  return null;
}

const key = (name) => name.toLowerCase();
const stem = (name) => path.parse(name).name.toLowerCase();

/**
 * Dateigruppe der neuen Revision planen.
 *
 * @param {Object} p
 * @param {Array}  p.uploaded  [{ name, role, target, hash, ... }] bereits eingeordnet
 * @param {Array|null} p.previous  Dateien der Basis-Revision [{ name, role, target, hash, ... }], null = neues Programm
 * @param {Array}  [p.remove]  Dateinamen der Vorversion, die nicht übernommen werden
 * @param {boolean|undefined} [p.excelReport]  true = Vorlage Pflicht, false = Vorlage entfernen
 * @param {boolean|undefined} [p.calibration]  true = Kalibrierprogramm Pflicht, false = entfernen
 * @returns {{ files: Array, removed: Array, errors: string[], warnings: string[], templateName: string|null }}
 *   files: Einträge aus uploaded/previous mit `source` ('upload'|'previous') und
 *   `status` ('new'|'changed'|'unchanged'|'carried')
 */
function planRevision({ uploaded, previous, remove = [], excelReport, calibration }) {
  const errors = [];
  const warnings = [];
  const removed = [];

  // Hochgeladene Dateien in sich prüfen
  const seen = new Set();
  for (const f of uploaded) {
    if (seen.has(key(f.name))) errors.push(`Datei doppelt hochgeladen: ${f.name}`);
    seen.add(key(f.name));
  }
  for (const role of SINGLE_ROLES) {
    const count = uploaded.filter(f => f.role === role).length;
    if (count > 1) errors.push(`Nur eine Datei je Revision erlaubt: ${ROLE_LABELS[role]}`);
  }
  if (excelReport === false && uploaded.some(f => f.role === 'report_xlsx' || f.role === 'report_layout')) {
    errors.push('Excel-Protokoll ausgeschaltet, aber Vorlagendateien hochgeladen');
  }
  if (calibration === false && uploaded.some(f => f.role === 'calibration')) {
    errors.push('Kalibrierprogramm ausgeschaltet, aber Kalibrierprogramm hochgeladen');
  }

  // Basis: Dateien der Vorversion
  let carried = (previous || []).map(f => ({ ...f }));

  for (const name of remove) {
    const idx = carried.findIndex(f => key(f.name) === key(name));
    if (idx === -1) {
      errors.push(`Zu entfernende Datei nicht in der Vorversion: ${name}`);
      continue;
    }
    const file = carried[idx];
    if (file.role === 'main') {
      errors.push('Das Messprogramm (.prg) kann nicht entfernt, nur ersetzt werden');
      continue;
    }
    if (file.role === 'report_xlsx' || file.role === 'report_layout') {
      errors.push('Excel-Vorlage nur zusammen entfernen: „ohne Excel-Protokoll“ (excel_report=false)');
      continue;
    }
    if (file.role === 'calibration') {
      errors.push('Kalibrierprogramm über „ohne Kalibrierprogramm“ entfernen (calibration=false)');
      continue;
    }
    removed.push({ ...file, reason: 'entfernt' });
    carried.splice(idx, 1);
  }

  if (excelReport === false) {
    for (const f of carried.filter(c => c.role === 'report_xlsx' || c.role === 'report_layout')) {
      removed.push({ ...f, reason: 'ohne Excel-Protokoll' });
    }
    carried = carried.filter(c => c.role !== 'report_xlsx' && c.role !== 'report_layout');
  }
  if (calibration === false) {
    for (const f of carried.filter(c => c.role === 'calibration')) {
      removed.push({ ...f, reason: 'ohne Kalibrierprogramm' });
    }
    carried = carried.filter(c => c.role !== 'calibration');
  }

  // Hochgeladene Dateien ersetzen gleichnamige bzw. die gleiche Einzel-Rolle der Vorversion
  const files = [];
  for (const up of uploaded) {
    // Kalibrierprogramm und Messprogramm-Dateien liegen in getrennten Ordnern
    const sameName = carried.find(c => key(c.name) === key(up.name)
      && (c.role === 'calibration') === (up.role === 'calibration'));
    let status = 'new';
    if (sameName) {
      status = sameName.hash === up.hash ? 'unchanged' : 'changed';
      carried = carried.filter(c => c !== sameName);
    }
    if (SINGLE_ROLES.includes(up.role)) {
      for (const old of carried.filter(c => c.role === up.role)) {
        removed.push({ ...old, reason: `ersetzt durch ${up.name}` });
      }
      carried = carried.filter(c => c.role !== up.role);
    }
    files.push({ ...up, source: 'upload', status });
  }
  for (const c of carried) files.push({ ...c, source: 'previous', status: 'carried' });

  // Ergebnis prüfen
  const mains = files.filter(f => f.role === 'main');
  if (mains.length === 0) errors.push('Messprogramm (.prg) fehlt');

  const xlsx = files.find(f => f.role === 'report_xlsx');
  const layout = files.find(f => f.role === 'report_layout');
  let templateName = null;
  if (xlsx || layout) {
    if (!xlsx || !layout) {
      errors.push('Excel-Vorlage unvollständig: .xlsx und .layout.xml gehören zusammen (ohne .layout.xml entsteht ein Protokoll ohne Messwerte)');
    } else if (key(templateBaseName(xlsx.name)) !== key(templateBaseName(layout.name))) {
      errors.push(`Excel-Vorlage: ${xlsx.name} und ${layout.name} haben nicht denselben Namen`);
    } else {
      templateName = templateBaseName(xlsx.name);
    }
  } else if (excelReport === true) {
    errors.push('Excel-Protokoll eingeschaltet, aber keine Vorlage (.xlsx + .layout.xml)');
  }

  const calibrationFile = files.find(f => f.role === 'calibration');
  if (calibration === true && !calibrationFile) {
    errors.push('Kalibrierprogramm eingeschaltet, aber keine .prg dafür hochgeladen');
  }
  if (calibrationFile && mains.some(m => key(m.name) === key(calibrationFile.name))) {
    errors.push(`Kalibrierprogramm ${calibrationFile.name} muss anders heißen als das Messprogramm`);
  }

  const cad = files.find(f => f.role === 'cad');
  if (cad && mains.length === 1 && stem(cad.name) !== stem(mains[0].name)) {
    warnings.push(`CAD-Datei ${cad.name} heißt anders als ${mains[0].name} – PC-DMIS findet sie über den Namen`);
  }

  if (previous && errors.length === 0 && removed.length === 0 && files.every(f => f.status === 'unchanged' || f.status === 'carried')) {
    errors.push('Keine Änderung gegenüber der Vorversion');
  }

  return { files, removed, errors, warnings, templateName };
}

module.exports = {
  ROLE_LABELS,
  UPLOAD_AREAS,
  decodeOriginalName,
  classifyFile,
  hasCustomMiniRoutines,
  templateBaseName,
  planRevision,
};
