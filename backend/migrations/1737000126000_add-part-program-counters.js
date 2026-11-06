/* eslint-disable camelcase */

/**
 * Migration: Zähler für Programmnummern je Bauteil und Art
 *
 * Spec docs/konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md (S1, Abschnitt 4): Neue Programme bekommen
 * <Bauteilnummer>-<n> (NC) bzw. <Bauteilnummer>-M<n> (Messprogramm). `n` kommt aus diesem Zähler,
 * nicht aus den vorhandenen Nummern – so wird eine Nummer nach dem Löschen nie neu vergeben.
 *
 * Startwerte: höchstes `n` aus Nummern, die schon im Schema vorliegen (z. B. von Hand vergeben).
 * Altbestand wie „CNC-M-001“ zählt nicht und bleibt unverändert.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE part_program_counters (
      part_id  integer     NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
      kind     varchar(10) NOT NULL CHECK (kind IN ('nc', 'cmm')),
      last_seq integer     NOT NULL DEFAULT 0,
      PRIMARY KEY (part_id, kind)
    );

    INSERT INTO part_program_counters (part_id, kind, last_seq)
    SELECT part_id, kind, max(rest::int)
      FROM (
        SELECT o.part_id, pr.kind,
               upper(trim(pr.program_number)) AS nr,
               upper(trim(pt.part_number) || '-' || CASE pr.kind WHEN 'cmm' THEN 'M' ELSE '' END) AS prefix
          FROM programs pr
          JOIN operations o ON o.id = pr.operation_id
          JOIN parts pt ON pt.id = o.part_id
      ) x
      CROSS JOIN LATERAL (SELECT substr(nr, length(prefix) + 1) AS rest) r
     WHERE left(nr, length(prefix)) = prefix
       AND rest ~ '^[1-9][0-9]{0,8}$'
     GROUP BY part_id, kind;
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS part_program_counters;');
};
