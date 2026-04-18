/* eslint-disable camelcase */

/**
 * Migration: Entfernt die Legacy-Spalten aus machines.
 *
 * Die technischen Daten sind seit PR B in machines.custom_fields (JSONB),
 * Typ und Steuerung laufen ueber machines.machine_type_id / .control_type_id.
 * Die Werte wurden in 1737000107000 einmalig migriert. Jetzt sind die alten
 * Spalten Dead Weight.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // View droppen, die noch auf m.machine_type verweist - wird unten neu angelegt
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_status');

  pgm.dropColumns('machines', [
    'machine_type',    // varchar - ersetzt durch machine_type_id (FK)
    'control_type',    // varchar - ersetzt durch control_type_id (FK)
    'num_axes',        // -> custom_fields.num_axes
    'workspace_x',     // -> custom_fields.workspace_x
    'workspace_y',     // -> custom_fields.workspace_y
    'workspace_z',     // -> custom_fields.workspace_z
    'spindle_power',   // -> custom_fields.spindle_power
    'max_rpm',         // -> custom_fields.max_rpm
    'tool_capacity'    // -> custom_fields.tool_capacity
  ]);

  // View neu anlegen, jetzt mit JOIN auf machine_types
  pgm.sql(`
    CREATE VIEW machine_maintenance_status AS
    SELECT m.id,
      m.name,
      m.manufacturer,
      m.model,
      mt.name AS machine_type,
      m.machine_category,
      m.location,
      m.is_active,
      m.current_operating_hours,
      m.requires_shift_checklist,
      m.last_maintenance,
      m.next_maintenance,
      count(DISTINCT mp.id) AS total_maintenance_plans,
      count(DISTINCT CASE
          WHEN ((mp.next_due_at IS NOT NULL) AND (mp.next_due_at < now())) THEN mp.id
          WHEN ((mp.interval_hours IS NOT NULL) AND (mp.next_due_hours IS NOT NULL) AND (m.current_operating_hours >= mp.next_due_hours)) THEN mp.id
          ELSE NULL::integer
      END) AS overdue_count,
      count(DISTINCT CASE
          WHEN ((mp.next_due_at IS NOT NULL) AND (date(mp.next_due_at) = CURRENT_DATE) AND (mp.next_due_at >= now())) THEN mp.id
          ELSE NULL::integer
      END) AS due_today_count,
      count(DISTINCT CASE
          WHEN ((mp.next_due_at IS NOT NULL) AND (date(mp.next_due_at) > CURRENT_DATE) AND (mp.next_due_at < (now() + '7 days'::interval))) THEN mp.id
          ELSE NULL::integer
      END) AS due_week_count,
      CASE
          WHEN (EXISTS ( SELECT 1
             FROM maintenance_plans mp2
            WHERE ((mp2.machine_id = m.id) AND mp2.is_active AND (((mp2.next_due_at IS NOT NULL) AND (mp2.next_due_at < now())) OR ((mp2.interval_hours IS NOT NULL) AND (mp2.next_due_hours IS NOT NULL) AND (m.current_operating_hours >= mp2.next_due_hours)))))) THEN 'critical'::text
          WHEN (EXISTS ( SELECT 1
             FROM maintenance_plans mp2
            WHERE ((mp2.machine_id = m.id) AND mp2.is_active AND (mp2.next_due_at IS NOT NULL) AND (date(mp2.next_due_at) = CURRENT_DATE) AND (mp2.next_due_at >= now())))) THEN 'warning'::text
          ELSE 'ok'::text
      END AS status
    FROM machines m
      LEFT JOIN machine_types mt ON mt.id = m.machine_type_id
      LEFT JOIN maintenance_plans mp ON ((mp.machine_id = m.id) AND (mp.is_active = true))
    WHERE (m.is_active = true)
    GROUP BY m.id, mt.name
    ORDER BY
      CASE
          WHEN (EXISTS ( SELECT 1
             FROM maintenance_plans mp2
            WHERE ((mp2.machine_id = m.id) AND mp2.is_active AND (((mp2.next_due_at IS NOT NULL) AND (mp2.next_due_at < now())) OR ((mp2.interval_hours IS NOT NULL) AND (mp2.next_due_hours IS NOT NULL) AND (m.current_operating_hours >= mp2.next_due_hours)))))) THEN 0
          WHEN (EXISTS ( SELECT 1
             FROM maintenance_plans mp2
            WHERE ((mp2.machine_id = m.id) AND mp2.is_active AND (mp2.next_due_at IS NOT NULL) AND (date(mp2.next_due_at) = CURRENT_DATE) AND (mp2.next_due_at >= now())))) THEN 1
          ELSE 2
      END, m.name
  `);
};

exports.down = (pgm) => {
  // Rueckabwicklung: Spalten wieder anlegen (leer - Daten sind in custom_fields)
  pgm.addColumns('machines', {
    machine_type:  { type: 'varchar(50)' },
    control_type:  { type: 'varchar(50)' },
    num_axes:      { type: 'integer' },
    workspace_x:   { type: 'decimal(10,2)' },
    workspace_y:   { type: 'decimal(10,2)' },
    workspace_z:   { type: 'decimal(10,2)' },
    spindle_power: { type: 'decimal(10,2)' },
    max_rpm:       { type: 'integer' },
    tool_capacity: { type: 'integer' }
  });
};
