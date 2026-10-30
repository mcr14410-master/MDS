/* eslint-disable camelcase */

/**
 * Migration: Messprogramme – Rolle `calibration` (Kalibrierprogramm der Taster)
 *
 * Konzept docs/konzepte/MESSPROGRAMME_KONZEPT.md 4.2a: eigenes .prg, das die Taster des
 * Hauptprogramms kalibriert, gehört zur Dateigruppe und wird mit ihr versioniert.
 * Höchstens eine je Revision (Regel im Backend). Zielort bleibt program_dir; im ZIP liegt es
 * im Unterordner Kalibrierung/.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE program_revision_files DROP CONSTRAINT program_revision_files_role_check;
    ALTER TABLE program_revision_files ADD CONSTRAINT program_revision_files_role_check
      CHECK (role IN ('main', 'cad', 'drawing', 'report_xlsx', 'report_layout', 'other', 'calibration'));
  `);
};

// Schlägt fehl, solange Kalibrierprogramme gespeichert sind (Daten werden nicht gelöscht)
exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE program_revision_files DROP CONSTRAINT program_revision_files_role_check;
    ALTER TABLE program_revision_files ADD CONSTRAINT program_revision_files_role_check
      CHECK (role IN ('main', 'cad', 'drawing', 'report_xlsx', 'report_layout', 'other'));
  `);
};
