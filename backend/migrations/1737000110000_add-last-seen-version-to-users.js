/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumn('users', {
    last_seen_version: {
      type: 'varchar(20)',
      notNull: false,
      comment: 'Zuletzt im Changelog ("Was ist neu") gesehene App-Version',
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('users', 'last_seen_version');
};
