/* eslint-disable camelcase */

/**
 * Migration: Statuswechsel je Programmversion nachvollziehbar
 *
 * workflow_history hing bisher nur am Programm. Für die Versionshistorie (wer hat welche Version
 * wann zur Prüfung gegeben, geprüft, freigegeben) bekommt jeder Eintrag die Version, die beim
 * Statuswechsel aktuell war. program_revisions.released_by/released_at gab es schon, sie wurden
 * aber nie befüllt.
 *
 * Altbestand: Zuordnung über die Zeit – die jüngste Version des Programms, die vor dem Eintrag
 * hochgeladen wurde (sonst die erste). Bei Zurückrollen kann das danebenliegen; neue Einträge
 * bekommen die Version direkt beim Statuswechsel.
 *
 * Zeitzonen (Spalten sind `timestamp` ohne Zeitzone): workflow_history schreibt der Workflow-
 * Controller mit eigenem Pool (Session UTC), Messprogramm-Versionen der cmmProgramsController
 * über den zentralen Pool (Europe/Berlin), NC-Versionen der programsController (UTC). Verglichen
 * wird deshalb nach Umrechnung in echte Zeitpunkte.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE workflow_history
      ADD COLUMN revision_id integer REFERENCES program_revisions(id) ON DELETE SET NULL;
    COMMENT ON COLUMN workflow_history.revision_id IS 'Programmversion, die beim Statuswechsel aktuell war (nur entity_type = program)';
    CREATE INDEX workflow_history_revision_id_index ON workflow_history (revision_id);

    UPDATE workflow_history wh
       SET revision_id = COALESCE(
             (SELECT pr.id FROM program_revisions pr
                JOIN programs p ON p.id = pr.program_id
               WHERE pr.program_id = wh.entity_id
                 AND (CASE WHEN p.kind = 'cmm' THEN pr.created_at AT TIME ZONE 'Europe/Berlin'
                           ELSE pr.created_at AT TIME ZONE 'UTC' END) <= wh.created_at AT TIME ZONE 'UTC'
               ORDER BY pr.created_at DESC, pr.id DESC LIMIT 1),
             (SELECT pr.id FROM program_revisions pr
               WHERE pr.program_id = wh.entity_id
               ORDER BY pr.created_at, pr.id LIMIT 1))
     WHERE wh.entity_type = 'program' AND wh.revision_id IS NULL;

    -- Freigabe je Version: letzte Freigabe aus dem Protokoll
    UPDATE program_revisions pr
       SET released_by = x.changed_by, released_at = x.created_at
      FROM (
        SELECT DISTINCT ON (wh.revision_id) wh.revision_id, wh.changed_by, wh.created_at
          FROM workflow_history wh
          JOIN workflow_states ws ON ws.id = wh.to_state_id
         WHERE wh.entity_type = 'program' AND ws.name = 'released' AND wh.revision_id IS NOT NULL
         ORDER BY wh.revision_id, wh.created_at DESC
      ) x
     WHERE pr.id = x.revision_id AND pr.released_by IS NULL;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS workflow_history_revision_id_index;
    ALTER TABLE workflow_history DROP COLUMN IF EXISTS revision_id;
  `);
};
