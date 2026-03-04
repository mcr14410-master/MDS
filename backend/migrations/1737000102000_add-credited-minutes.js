/**
 * Migration: Add credited_minutes to time_daily_summary
 * 
 * Tracks how many minutes were credited from vacation/sick entries
 * on days where employee also has real clock entries.
 * Example: Employee works 2h, goes home sick → credited_minutes = 360 (6h of 8h target)
 */

exports.up = (pgm) => {
  pgm.addColumns('time_daily_summary', {
    credited_minutes: {
      type: 'integer',
      default: 0,
      notNull: true
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('time_daily_summary', ['credited_minutes']);
};
