/* eslint-disable camelcase */

/**
 * Migration: Messprogramme (KMG / PC-DMIS) – Datenmodell
 *
 * Schritt 1 aus docs/konzepte/MESSPROGRAMME_KONZEPT.md:
 * - programs.kind: 'nc' (alle bestehenden) | 'cmm' (Messprogramm)
 * - program_revision_files: mehrere Dateien je Revision (.prg + .cad + Prüfzeichnung,
 *   optional Excel-Protokollvorlage .xlsx + .layout.xml). Nur für Messprogramme;
 *   program_revisions.filename/filepath/file_hash bleiben für die Hauptdatei.
 *   filename = Originalname (PC-DMIS findet die .cad über den Namen), Windows-typisch
 *   ohne Unterscheidung von Groß-/Kleinschreibung eindeutig je Revision.
 *   target: Programmordner oder PC-DMIS-Vorlagenverzeichnis (Vorlagen liegen nicht neben dem .prg)
 * - machines.measuring_equipment_id: KMG als Maschine, Kalibrierung bleibt am Messmittel
 *
 * Keine Rechte (Freigabe über program.release) und keine Stammdaten (Maschinen-/Arbeitsgangtypen
 * werden in der Oberfläche gepflegt).
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE programs ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'nc'
      CONSTRAINT programs_kind_check CHECK (kind IN ('nc', 'cmm'));

    CREATE TABLE program_revision_files (
      id          SERIAL PRIMARY KEY,
      revision_id INTEGER NOT NULL REFERENCES program_revisions(id) ON DELETE CASCADE,
      role        VARCHAR(20) NOT NULL
        CONSTRAINT program_revision_files_role_check
        CHECK (role IN ('main', 'cad', 'drawing', 'report_xlsx', 'report_layout', 'other')),
      target      VARCHAR(20) NOT NULL DEFAULT 'program_dir'
        CONSTRAINT program_revision_files_target_check
        CHECK (target IN ('program_dir', 'template_dir')),
      filename    VARCHAR(255) NOT NULL,
      filepath    VARCHAR(500) NOT NULL,
      filesize    INTEGER,
      file_hash   VARCHAR(64) NOT NULL,
      mime_type   VARCHAR(100),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX program_revision_files_revision_filename_key
      ON program_revision_files (revision_id, lower(filename));

    ALTER TABLE machines ADD COLUMN measuring_equipment_id INTEGER
      REFERENCES measuring_equipment(id) ON DELETE SET NULL;
    CREATE INDEX machines_measuring_equipment_id_index ON machines (measuring_equipment_id);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS machines_measuring_equipment_id_index;
    ALTER TABLE machines DROP COLUMN IF EXISTS measuring_equipment_id;
    DROP TABLE IF EXISTS program_revision_files;
    ALTER TABLE programs DROP COLUMN IF EXISTS kind;
  `);
};
