/* eslint-disable camelcase */

/**
 * Migration: Freigabe-Zeiger programs.released_revision_id
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 4.1 (PR 4.1): Der Workflow-Status hängt nur am
 * Programm. Eine neue Version setzt es auf „Entwurf“, danach war nirgends mehr vermerkt, welche
 * Version freigegeben ist. Der Zeiger wird beim Wechsel auf „Freigegeben“ gesetzt und von neuen
 * Versionen, Rollback und Archivieren nicht verändert. Gilt für NC- und Messprogramme.
 *
 * Bestand: freigegebene Programme zeigen auf ihre aktuelle Version. Programme, die heute auf
 * Entwurf stehen und früher freigegeben waren, lassen sich nicht rekonstruieren (kein Bezug
 * Freigabe ↔ Revision in workflow_history) und brauchen eine neue Freigabe.
 */

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE programs ADD COLUMN released_revision_id INTEGER
      REFERENCES program_revisions(id) ON DELETE SET NULL;

    UPDATE programs SET released_revision_id = current_revision_id
     WHERE current_revision_id IS NOT NULL
       AND workflow_state_id = (SELECT id FROM workflow_states WHERE name = 'released');
  `);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE programs DROP COLUMN IF EXISTS released_revision_id;`);
};
