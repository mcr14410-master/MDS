/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // color-Spalte ergaenzen und icon entfernen
  pgm.addColumns('machine_types', {
    color: { type: 'varchar(20)', default: 'gray' }
  });

  pgm.sql(`
    UPDATE machine_types SET color = CASE name
      WHEN 'Fräsen'      THEN 'blue'
      WHEN 'Drehen'      THEN 'green'
      WHEN 'Dreh-Fräsen' THEN 'purple'
      WHEN 'Schleifen'   THEN 'yellow'
      WHEN 'Erodieren'   THEN 'red'
      WHEN 'Sonstige'    THEN 'gray'
      ELSE 'gray'
    END
  `);

  pgm.dropColumns('machine_types', ['icon']);
};

exports.down = (pgm) => {
  pgm.addColumns('machine_types', {
    icon: { type: 'varchar(50)' }
  });
  pgm.dropColumns('machine_types', ['color']);
};
