'use strict';

exports.up = async (pgm) => {
  // Drop and recreate the view with improved due_status logic
  pgm.sql('DROP VIEW IF EXISTS maintenance_due_overview');
  
  pgm.sql(`
    CREATE OR REPLACE VIEW maintenance_due_overview AS
    SELECT 
      mp.id,
      mp.title,
      mp.description,
      mp.machine_id,
      m.name AS machine_name,
      m.location AS machine_location,
      m.current_operating_hours,
      mp.maintenance_type_id,
      mt.name AS maintenance_type,
      mt.icon AS maintenance_type_icon,
      mt.color AS maintenance_type_color,
      mp.interval_type,
      mp.interval_value,
      mp.interval_hours,
      mp.next_due_at,
      mp.next_due_hours,
      mp.last_completed_at,
      mp.required_skill_level,
      mp.estimated_duration_minutes,
      mp.priority,
      mp.is_shift_critical,
      CASE 
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN 'overdue'
        WHEN mp.next_due_at IS NOT NULL AND DATE(mp.next_due_at) = CURRENT_DATE THEN 'due_today'
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN 'due_week'
        WHEN mp.interval_hours IS NOT NULL 
             AND mp.next_due_hours IS NOT NULL
             AND m.current_operating_hours >= mp.next_due_hours THEN 'overdue'
        WHEN mp.interval_hours IS NOT NULL 
             AND mp.next_due_hours IS NOT NULL
             AND m.current_operating_hours >= (mp.next_due_hours - 50) THEN 'due_soon'
        ELSE 'ok'
      END AS due_status,
      CASE 
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN 0
        WHEN mp.next_due_at IS NOT NULL AND DATE(mp.next_due_at) = CURRENT_DATE THEN 1
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN 2
        WHEN mp.interval_hours IS NOT NULL AND m.current_operating_hours >= mp.next_due_hours THEN 0
        WHEN mp.interval_hours IS NOT NULL AND m.current_operating_hours >= (mp.next_due_hours - 50) THEN 1
        ELSE 3
      END AS sort_priority
    FROM maintenance_plans mp
    JOIN machines m ON mp.machine_id = m.id
    JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
    WHERE mp.is_active = true
    ORDER BY sort_priority, mp.next_due_at ASC NULLS LAST
  `);

  // Also update the machine_maintenance_summary view
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_summary');
  
  pgm.sql(`
    CREATE OR REPLACE VIEW machine_maintenance_summary AS
    SELECT 
      m.id AS machine_id,
      m.name AS machine_name,
      m.location,
      m.current_operating_hours,
      COUNT(DISTINCT mp.id) AS total_plans,
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN mp.id
        WHEN mp.interval_hours IS NOT NULL AND mp.next_due_hours IS NOT NULL 
             AND m.current_operating_hours >= mp.next_due_hours THEN mp.id
      END) AS overdue_count,
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL AND DATE(mp.next_due_at) = CURRENT_DATE THEN mp.id 
      END) AS due_today_count,
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL 
             AND DATE(mp.next_due_at) > CURRENT_DATE 
             AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN mp.id 
      END) AS due_week_count,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM maintenance_plans mp2 
          WHERE mp2.machine_id = m.id AND mp2.is_active 
          AND (
            (mp2.next_due_at IS NOT NULL AND mp2.next_due_at < NOW())
            OR (mp2.interval_hours IS NOT NULL AND mp2.next_due_hours IS NOT NULL 
                AND m.current_operating_hours >= mp2.next_due_hours)
          )
        ) THEN 'critical'
        WHEN EXISTS (
          SELECT 1 FROM maintenance_plans mp2 
          WHERE mp2.machine_id = m.id AND mp2.is_active 
          AND mp2.next_due_at IS NOT NULL AND DATE(mp2.next_due_at) = CURRENT_DATE
        ) THEN 'warning'
        ELSE 'ok'
      END AS maintenance_status,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM maintenance_plans mp2 
          WHERE mp2.machine_id = m.id AND mp2.is_active 
          AND (
            (mp2.next_due_at IS NOT NULL AND mp2.next_due_at < NOW())
            OR (mp2.interval_hours IS NOT NULL AND mp2.next_due_hours IS NOT NULL 
                AND m.current_operating_hours >= mp2.next_due_hours)
          )
        ) THEN 0
        WHEN EXISTS (
          SELECT 1 FROM maintenance_plans mp2 
          WHERE mp2.machine_id = m.id AND mp2.is_active 
          AND mp2.next_due_at IS NOT NULL AND DATE(mp2.next_due_at) = CURRENT_DATE
        ) THEN 1
        ELSE 2
      END AS sort_priority
    FROM machines m
    LEFT JOIN maintenance_plans mp ON m.id = mp.machine_id AND mp.is_active = true
    GROUP BY m.id, m.name, m.location, m.current_operating_hours
    ORDER BY sort_priority, m.name
  `);
};

exports.down = async (pgm) => {
  // Revert to original views (simplified - just drop them)
  pgm.sql('DROP VIEW IF EXISTS maintenance_due_overview');
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_summary');
};
