/* eslint-disable camelcase */

/**
 * Migration: Farbe je Rolle
 *
 * Bisher hing die Farbe der Rollen-Abzeichen fest am Rollennamen (im Frontend) – selbst angelegte und
 * umbenannte Rollen waren immer grau. Jetzt eine Spalte mit fester Palette (Tailwind braucht feste
 * Klassennamen). Bestehende Rollen bekommen die bisherige Farbe nach ihrem Namen, alle anderen grau.
 */

const PALETTE = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'gray'];

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE roles ADD COLUMN color VARCHAR(20) NOT NULL DEFAULT 'gray'
      CONSTRAINT roles_color_check CHECK (color IN (${PALETTE.map(c => `'${c}'`).join(', ')}));

    UPDATE roles SET color = CASE lower(name)
      WHEN 'admin' THEN 'red'
      WHEN 'programmer' THEN 'blue'
      WHEN 'reviewer' THEN 'purple'
      WHEN 'operator' THEN 'green'
      WHEN 'helper' THEN 'yellow'
      WHEN 'supervisor' THEN 'orange'
      ELSE 'gray'
    END;
  `);
};

exports.down = (pgm) => {
  pgm.sql('ALTER TABLE roles DROP COLUMN IF EXISTS color;');
};
