/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.addColumns('time_daily_summary', {
    note: { type: 'text' },
    target_override_minutes: { type: 'integer' }
  });
};

exports.down = pgm => {
  pgm.dropColumns('time_daily_summary', ['note', 'target_override_minutes']);
};
