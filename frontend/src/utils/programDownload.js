// frontend/src/utils/programDownload.js
// Welche Version lädt der Download? Die freigegebene (programs.released_revision_id). Ohne Freigabe die
// aktuelle, mit Hinweis. Ist ein Entwurf neuer als die Freigabe, gibt es ihn nur über einen eigenen Knopf.
import { downloadFileViaApi } from './fileDownload';
import { cmmZipName } from './cmmPrograms';

export function downloadVersions(program) {
  const released = program.released_version || null;
  const current = program.version || null;
  return {
    main: released || current,
    mainIsReleased: Boolean(released),
    draft: released && current && released !== current ? current : null,
  };
}

/** Messprogramm: ZIP der Version; NC: Hauptdatei der Version */
export function downloadProgramVersion(program, version) {
  const v = encodeURIComponent(version);
  if (program.kind === 'cmm') {
    return downloadFileViaApi(`/api/programs/${program.id}/files/zip?version=${v}`, cmmZipName(program, version));
  }
  // NC speichert nur den internen Ablagenamen (Zeitstempel-Zufallszahl-Name) → Präfix weglassen
  return downloadFileViaApi(`/api/programs/${program.id}/download?version=${v}`, (program.filename || '').replace(/^\d+-\d+-/, ''));
}

/** „freigegebene Version 1.0.0“ bzw. „Version 1.1.0 – nicht freigegeben“ */
export const downloadVersionLabel = (program) => {
  const { main, mainIsReleased } = downloadVersions(program);
  if (!main) return '';
  return mainIsReleased ? `freigegebene Version ${main}` : `Version ${main} – nicht freigegeben`;
};

export const mainDownloadTitle = (program) => {
  const label = downloadVersionLabel(program);
  return label ? `${label.charAt(0).toUpperCase()}${label.slice(1)} herunterladen` : 'Herunterladen';
};
