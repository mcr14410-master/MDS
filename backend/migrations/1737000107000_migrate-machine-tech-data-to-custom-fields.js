/* eslint-disable camelcase */

/**
 * Migration: Legacy technische Daten (num_axes, workspace_x/y/z, spindle_power,
 * max_rpm, tool_capacity) in machines.custom_fields (JSONB) uebertragen.
 *
 * Legacy-Spalten bleiben vorerst bestehen - Entfernung erfolgt in PR C.
 * Die Migration ist idempotent: bereits gesetzte custom_fields-Keys werden
 * nicht ueberschrieben.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE machines SET custom_fields = COALESCE(custom_fields, '{}'::jsonb)
      || jsonb_strip_nulls(jsonb_build_object(
        'num_axes',      num_axes,
        'workspace_x',   workspace_x,
        'workspace_y',   workspace_y,
        'workspace_z',   workspace_z,
        'spindle_power', spindle_power,
        'max_rpm',       max_rpm,
        'tool_capacity', tool_capacity
      ))
    WHERE num_axes IS NOT NULL
       OR workspace_x IS NOT NULL
       OR workspace_y IS NOT NULL
       OR workspace_z IS NOT NULL
       OR spindle_power IS NOT NULL
       OR max_rpm IS NOT NULL
       OR tool_capacity IS NOT NULL
  `);
};

exports.down = (pgm) => {
  // Rueckabwicklung nicht sinnvoll - Legacy-Spalten bleiben ja parallel bestehen,
  // sie sind weiterhin die Quelle der Wahrheit.
  // No-op.
};
