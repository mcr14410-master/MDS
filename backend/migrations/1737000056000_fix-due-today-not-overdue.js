'use strict';

exports.up = async (pgm) => {
  // Update machine_maintenance_status view - due_today nur wenn NICHT überfällig
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_status CASCADE');
  
  pgm.sql(`
    CREATE OR REPLACE VIEW machine_maintenance_status AS
    SELECT 
      m.id,
      m.name,
      m.manufacturer,
      m.model,
      m.machine_type,
      m.machine_category,
      m.location,
      m.is_active,
      m.current_operating_hours,
      m.requires_shift_checklist,
      m.last_maintenance,
      m.next_maintenance,
      COUNT(DISTINCT mp.id) AS total_maintenance_plans,
      -- Overdue: Zeit abgelaufen ODER Betriebsstunden überschritten
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL AND mp.next_due_at < NOW() THEN mp.id
        WHEN mp.interval_hours IS NOT NULL AND mp.next_due_hours IS NOT NULL 
             AND m.current_operating_hours >= mp.next_due_hours THEN mp.id
      END) AS overdue_count,
      -- Due today: Datum = heute UND Uhrzeit noch nicht erreicht (nicht überfällig)
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL 
             AND DATE(mp.next_due_at) = CURRENT_DATE 
             AND mp.next_due_at >= NOW() THEN mp.id 
      END) AS due_today_count,
      -- Due this week: morgen bis 7 Tage
      COUNT(DISTINCT CASE 
        WHEN mp.next_due_at IS NOT NULL 
             AND DATE(mp.next_due_at) > CURRENT_DATE 
             AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN mp.id 
      END) AS due_week_count,
      -- Status basierend auf Wartungen
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
          AND mp2.next_due_at IS NOT NULL 
          AND DATE(mp2.next_due_at) = CURRENT_DATE
          AND mp2.next_due_at >= NOW()
        ) THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM machines m
    LEFT JOIN maintenance_plans mp ON mp.machine_id = m.id AND mp.is_active = true
    WHERE m.is_active = true
    GROUP BY m.id
    ORDER BY 
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
          AND mp2.next_due_at IS NOT NULL 
          AND DATE(mp2.next_due_at) = CURRENT_DATE
          AND mp2.next_due_at >= NOW()
        ) THEN 1
        ELSE 2
      END,
      m.name
  `);
};

exports.down = async (pgm) => {
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_status CASCADE');
};
