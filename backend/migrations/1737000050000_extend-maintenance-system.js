/* eslint-disable camelcase */

/**
 * Migration: Wartungssystem-Erweiterungen
 * 
 * Erweitert das bestehende Wartungssystem um:
 * - Maschinen-Kategorien (CNC, Automation/Roboter)
 * - Schicht-kritische Wartungen (Roboter vor Nachtbetrieb)
 * - Schritt-für-Schritt Anleitungen mit Fotos
 * - Betriebsstunden-Tracking
 * - Skill-Level Mapping für Benutzer
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // ============================================================
  // 1. MACHINES TABELLE ERWEITERN
  // ============================================================
  
  // Maschinen-Kategorie (CNC-Maschine, Automation/Roboter, Sonstiges)
  pgm.addColumn('machines', {
    machine_category: { 
      type: 'varchar(50)', 
      default: 'cnc',
      comment: 'cnc, automation, measuring, other'
    }
  });
  
  // Roboter/Automation: Erfordert Schicht-Checklist vor unbemanntem Betrieb
  pgm.addColumn('machines', {
    requires_shift_checklist: { 
      type: 'boolean', 
      default: false,
      comment: 'True für Roboter die vor Nachtschicht geprüft werden müssen'
    }
  });
  
  // Aktueller Betriebsstundenzähler (wird regelmäßig aktualisiert)
  pgm.addColumn('machines', {
    current_operating_hours: { 
      type: 'decimal(10,1)', 
      default: 0,
      comment: 'Aktueller Betriebsstundenzähler der Maschine'
    }
  });
  
  // Letztes Update der Betriebsstunden
  pgm.addColumn('machines', {
    operating_hours_updated_at: { 
      type: 'timestamp',
      comment: 'Wann wurden die Betriebsstunden zuletzt aktualisiert'
    }
  });

  // ============================================================
  // 2. MAINTENANCE_PLANS TABELLE ERWEITERN
  // ============================================================
  
  // Schicht-kritisch: Muss vor Schichtende erledigt sein
  pgm.addColumn('maintenance_plans', {
    is_shift_critical: { 
      type: 'boolean', 
      default: false,
      comment: 'True = Muss vor Schichtende erledigt sein (z.B. Roboter-Check)'
    }
  });
  
  // Deadline-Zeit für schicht-kritische Wartungen
  pgm.addColumn('maintenance_plans', {
    shift_deadline_time: { 
      type: 'time',
      comment: 'Uhrzeit bis wann erledigt sein muss (z.B. 17:00)'
    }
  });
  
  // Betriebsstunden-basiertes Intervall (alternativ zu zeitbasiert)
  pgm.addColumn('maintenance_plans', {
    interval_hours: { 
      type: 'integer',
      comment: 'Intervall in Betriebsstunden (z.B. 500, 1000, 5000)'
    }
  });
  
  // Letzter Betriebsstundenstand bei Wartung
  pgm.addColumn('maintenance_plans', {
    last_completed_hours: { 
      type: 'decimal(10,1)',
      comment: 'Betriebsstunden bei letzter Durchführung'
    }
  });
  
  // Nächste Fälligkeit in Betriebsstunden
  pgm.addColumn('maintenance_plans', {
    next_due_hours: { 
      type: 'decimal(10,1)',
      comment: 'Bei welchem Betriebsstundenstand fällig'
    }
  });

  // ============================================================
  // 3. MAINTENANCE_CHECKLIST_ITEMS ERWEITERN
  // ============================================================
  
  // Entscheidungstyp für interaktive Checklisten
  pgm.addColumn('maintenance_checklist_items', {
    decision_type: { 
      type: 'varchar(20)', 
      default: 'none',
      comment: 'none, yes_no, measurement, photo_required'
    }
  });
  
  // Was passiert bei "Nein" oder Messwert außerhalb Toleranz
  pgm.addColumn('maintenance_checklist_items', {
    on_failure_action: { 
      type: 'varchar(20)', 
      default: 'continue',
      comment: 'continue, escalate, stop'
    }
  });
  
  // Erwartete Antwort bei yes_no (für Validierung)
  pgm.addColumn('maintenance_checklist_items', {
    expected_answer: { 
      type: 'boolean',
      comment: 'Bei yes_no: Welche Antwort ist OK (true=Ja erwartet)'
    }
  });

  // ============================================================
  // 4. MAINTENANCE_INSTRUCTIONS - Schritt-für-Schritt Anleitungen
  // ============================================================
  
  pgm.createTable('maintenance_instructions', {
    id: 'id',
    checklist_item_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_checklist_items',
      onDelete: 'CASCADE',
      comment: 'Zu welchem Checklist-Item gehört diese Anleitung'
    },
    step_number: { 
      type: 'integer', 
      notNull: true,
      comment: 'Schritt-Nummer innerhalb des Checklist-Items'
    },
    title: { 
      type: 'varchar(255)', 
      notNull: true,
      comment: 'Kurzer Titel des Schritts'
    },
    description: { 
      type: 'text',
      comment: 'Ausführliche Beschreibung was zu tun ist'
    },
    image_path: { 
      type: 'varchar(500)',
      comment: 'Pfad zum Anleitungs-Foto'
    },
    video_url: { 
      type: 'varchar(500)',
      comment: 'URL zu Anleitungs-Video (YouTube, intern, etc.)'
    },
    warning_text: { 
      type: 'text',
      comment: 'Sicherheitshinweise / Warnungen'
    },
    tip_text: { 
      type: 'text',
      comment: 'Hilfreiche Tipps'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
  
  // Unique constraint: Ein Schritt pro Checklist-Item
  pgm.addConstraint('maintenance_instructions', 'maintenance_instructions_unique_step', {
    unique: ['checklist_item_id', 'step_number']
  });
  
  pgm.createIndex('maintenance_instructions', 'checklist_item_id');
  pgm.createIndex('maintenance_instructions', ['checklist_item_id', 'step_number']);

  // ============================================================
  // 5. OPERATING_HOURS_LOG - Betriebsstunden-Erfassung
  // ============================================================
  
  pgm.createTable('operating_hours_log', {
    id: 'id',
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'CASCADE'
    },
    recorded_hours: { 
      type: 'decimal(10,1)', 
      notNull: true,
      comment: 'Abgelesener Betriebsstundenzähler'
    },
    previous_hours: { 
      type: 'decimal(10,1)',
      comment: 'Vorheriger Stand (für Delta-Berechnung)'
    },
    hours_delta: { 
      type: 'decimal(10,1)',
      comment: 'Differenz zum vorherigen Eintrag'
    },
    recorded_by: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'SET NULL'
    },
    recorded_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    source: { 
      type: 'varchar(20)', 
      default: 'manual',
      comment: 'manual, ocr, api (für spätere Automatisierung)'
    },
    notes: { type: 'text' }
  });
  
  pgm.createIndex('operating_hours_log', 'machine_id');
  pgm.createIndex('operating_hours_log', 'recorded_at');
  pgm.createIndex('operating_hours_log', ['machine_id', 'recorded_at']);

  // ============================================================
  // 6. USER_SKILL_LEVELS - Skill-Level pro Benutzer
  // ============================================================
  
  // Skill-Level für Wartungen (1=Helfer, 2=Bediener, 3=Meister)
  pgm.addColumn('users', {
    maintenance_skill_level: { 
      type: 'integer', 
      default: 1,
      comment: '1=Helfer (einfach), 2=Bediener (mittel), 3=Meister (komplex)'
    }
  });

  // ============================================================
  // 7. MAINTENANCE_TASK_ASSIGNMENTS - Tagesplan/Zuweisung
  // ============================================================
  
  pgm.createTable('maintenance_task_assignments', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    maintenance_plan_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_plans',
      onDelete: 'CASCADE'
    },
    assignment_date: { 
      type: 'date', 
      notNull: true,
      comment: 'Für welchen Tag ist diese Zuweisung'
    },
    priority_order: { 
      type: 'integer', 
      default: 0,
      comment: 'Reihenfolge der Aufgaben für diesen Tag'
    },
    assigned_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    },
    notes: { type: 'text' }
  });
  
  // Ein Benutzer kann pro Tag nur einmal für einen Plan zugewiesen sein
  pgm.addConstraint('maintenance_task_assignments', 'maintenance_task_assignments_unique', {
    unique: ['user_id', 'maintenance_plan_id', 'assignment_date']
  });
  
  pgm.createIndex('maintenance_task_assignments', 'user_id');
  pgm.createIndex('maintenance_task_assignments', 'maintenance_plan_id');
  pgm.createIndex('maintenance_task_assignments', 'assignment_date');
  pgm.createIndex('maintenance_task_assignments', ['user_id', 'assignment_date']);

  // ============================================================
  // 8. MAINTENANCE_ESCALATIONS - Eskalations-Historie
  // ============================================================
  
  pgm.createTable('maintenance_escalations', {
    id: 'id',
    maintenance_task_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_tasks',
      onDelete: 'CASCADE'
    },
    checklist_item_id: {
      type: 'integer',
      references: 'maintenance_checklist_items',
      onDelete: 'SET NULL',
      comment: 'Bei welchem Checklist-Punkt trat das Problem auf'
    },
    escalated_from_user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'Wer hat eskaliert'
    },
    escalated_to_user_id: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL',
      comment: 'An wen wurde eskaliert'
    },
    escalation_level: { 
      type: 'integer', 
      default: 1,
      comment: '1=Bediener, 2=Meister, 3=Externe'
    },
    reason: { 
      type: 'text', 
      notNull: true,
      comment: 'Beschreibung des Problems'
    },
    photo_path: { 
      type: 'varchar(500)',
      comment: 'Foto des Problems'
    },
    status: { 
      type: 'varchar(20)', 
      default: 'open',
      comment: 'open, acknowledged, resolved, closed'
    },
    resolution: { type: 'text' },
    resolved_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    resolved_at: { type: 'timestamp' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });
  
  pgm.createIndex('maintenance_escalations', 'maintenance_task_id');
  pgm.createIndex('maintenance_escalations', 'status');
  pgm.createIndex('maintenance_escalations', 'escalated_to_user_id');
  pgm.createIndex('maintenance_escalations', ['status', 'created_at']);

  // ============================================================
  // 9. VIEWS FÜR ÜBERSICHTEN
  // ============================================================
  
  // View: Fällige Wartungen mit Maschinen-Info
  pgm.sql(`
    CREATE OR REPLACE VIEW maintenance_due_overview AS
    SELECT 
      mp.id AS plan_id,
      mp.title,
      mp.description,
      mp.interval_type,
      mp.interval_value,
      mp.interval_hours,
      mp.required_skill_level,
      mp.estimated_duration_minutes,
      mp.priority,
      mp.is_shift_critical,
      mp.shift_deadline_time,
      mp.next_due_at,
      mp.next_due_hours,
      m.id AS machine_id,
      m.name AS machine_name,
      m.machine_category,
      m.location,
      m.current_operating_hours,
      m.requires_shift_checklist,
      mt.name AS maintenance_type,
      mt.icon AS maintenance_type_icon,
      mt.color AS maintenance_type_color,
      CASE 
        WHEN mp.next_due_at < NOW() THEN 'overdue'
        WHEN mp.next_due_at < NOW() + INTERVAL '1 day' THEN 'due_today'
        WHEN mp.next_due_at < NOW() + INTERVAL '7 days' THEN 'due_soon'
        ELSE 'ok'
      END AS time_status,
      CASE 
        WHEN mp.interval_hours IS NOT NULL 
             AND m.current_operating_hours >= mp.next_due_hours THEN 'overdue'
        WHEN mp.interval_hours IS NOT NULL 
             AND m.current_operating_hours >= (mp.next_due_hours - 50) THEN 'due_soon'
        ELSE 'ok'
      END AS hours_status
    FROM maintenance_plans mp
    JOIN machines m ON mp.machine_id = m.id
    JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
    WHERE mp.is_active = true
    ORDER BY 
      CASE 
        WHEN mp.next_due_at < NOW() THEN 0
        WHEN mp.next_due_at < NOW() + INTERVAL '1 day' THEN 1
        ELSE 2
      END,
      mp.next_due_at ASC
  `);
  
  // View: Maschinen-Wartungsstatus
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
      COUNT(DISTINCT CASE WHEN mp.next_due_at < NOW() THEN mp.id END) AS overdue_count,
      COUNT(DISTINCT CASE WHEN mp.next_due_at >= NOW() AND mp.next_due_at < NOW() + INTERVAL '1 day' THEN mp.id END) AS due_today_count,
      COUNT(DISTINCT CASE WHEN mp.next_due_at >= NOW() + INTERVAL '1 day' AND mp.next_due_at < NOW() + INTERVAL '7 days' THEN mp.id END) AS due_week_count,
      CASE 
        WHEN EXISTS (SELECT 1 FROM maintenance_plans mp2 WHERE mp2.machine_id = m.id AND mp2.is_active AND mp2.next_due_at < NOW()) THEN 'critical'
        WHEN EXISTS (SELECT 1 FROM maintenance_plans mp2 WHERE mp2.machine_id = m.id AND mp2.is_active AND mp2.next_due_at < NOW() + INTERVAL '1 day') THEN 'warning'
        ELSE 'ok'
      END AS status
    FROM machines m
    LEFT JOIN maintenance_plans mp ON mp.machine_id = m.id AND mp.is_active = true
    WHERE m.is_active = true
    GROUP BY m.id
    ORDER BY 
      CASE 
        WHEN EXISTS (SELECT 1 FROM maintenance_plans mp2 WHERE mp2.machine_id = m.id AND mp2.is_active AND mp2.next_due_at < NOW()) THEN 0
        WHEN EXISTS (SELECT 1 FROM maintenance_plans mp2 WHERE mp2.machine_id = m.id AND mp2.is_active AND mp2.next_due_at < NOW() + INTERVAL '1 day') THEN 1
        ELSE 2
      END,
      m.name
  `);
  
  // View: Benutzer-Aufgaben für heute
  pgm.sql(`
    CREATE OR REPLACE VIEW user_maintenance_tasks_today AS
    SELECT 
      u.id AS user_id,
      u.username,
      u.first_name,
      u.last_name,
      u.maintenance_skill_level,
      mp.id AS plan_id,
      mp.title AS task_title,
      mp.description AS task_description,
      mp.estimated_duration_minutes,
      mp.required_skill_level,
      mp.is_shift_critical,
      mp.shift_deadline_time,
      m.id AS machine_id,
      m.name AS machine_name,
      m.location AS machine_location,
      mt.name AS maintenance_type,
      mt.icon AS maintenance_type_icon,
      mta.priority_order,
      mta.assignment_date,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM maintenance_tasks mtask 
          WHERE mtask.maintenance_plan_id = mp.id 
          AND mtask.status = 'completed'
          AND DATE(mtask.completed_at) = CURRENT_DATE
        ) THEN 'completed'
        WHEN EXISTS (
          SELECT 1 FROM maintenance_tasks mtask 
          WHERE mtask.maintenance_plan_id = mp.id 
          AND mtask.status = 'in_progress'
          AND DATE(mtask.created_at) = CURRENT_DATE
        ) THEN 'in_progress'
        ELSE 'pending'
      END AS today_status
    FROM maintenance_task_assignments mta
    JOIN users u ON mta.user_id = u.id
    JOIN maintenance_plans mp ON mta.maintenance_plan_id = mp.id
    JOIN machines m ON mp.machine_id = m.id
    JOIN maintenance_types mt ON mp.maintenance_type_id = mt.id
    WHERE mta.assignment_date = CURRENT_DATE
      AND u.is_active = true
      AND mp.is_active = true
    ORDER BY u.id, mta.priority_order
  `);

  // ============================================================
  // 10. ZUSÄTZLICHE WARTUNGSTYPEN
  // ============================================================
  
  pgm.sql(`
    INSERT INTO maintenance_types (name, description, icon, color) VALUES
    ('robot_shift_check', 'Roboter Schicht-Checkliste', 'Bot', '#f97316'),
    ('operating_hours_check', 'Betriebsstunden-basierte Wartung', 'Clock', '#0ea5e9'),
    ('safety_inspection', 'Sicherheitsinspektion', 'ShieldCheck', '#dc2626')
    ON CONFLICT (name) DO NOTHING
  `);

  // ============================================================
  // 11. ZUSÄTZLICHE PERMISSIONS
  // ============================================================
  
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('maintenance.assign', 'Wartungen zuweisen', 'maintenance'),
    ('maintenance.view_all', 'Alle Wartungen sehen (auch anderer Benutzer)', 'maintenance'),
    ('maintenance.manage_plans', 'Wartungspläne erstellen/bearbeiten', 'maintenance'),
    ('maintenance.view_dashboard', 'Wartungs-Dashboard anzeigen', 'maintenance'),
    ('maintenance.record_hours', 'Betriebsstunden erfassen', 'maintenance'),
    ('maintenance.resolve_escalation', 'Eskalationen bearbeiten', 'maintenance')
    ON CONFLICT (name) DO NOTHING
  `);
};

exports.down = (pgm) => {
  // Views droppen
  pgm.sql('DROP VIEW IF EXISTS user_maintenance_tasks_today');
  pgm.sql('DROP VIEW IF EXISTS machine_maintenance_status');
  pgm.sql('DROP VIEW IF EXISTS maintenance_due_overview');
  
  // Neue Tabellen droppen
  pgm.dropTable('maintenance_escalations', { ifExists: true });
  pgm.dropTable('maintenance_task_assignments', { ifExists: true });
  pgm.dropTable('operating_hours_log', { ifExists: true });
  pgm.dropTable('maintenance_instructions', { ifExists: true });
  
  // Spalten von users entfernen
  pgm.dropColumn('users', 'maintenance_skill_level', { ifExists: true });
  
  // Spalten von maintenance_checklist_items entfernen
  pgm.dropColumn('maintenance_checklist_items', 'expected_answer', { ifExists: true });
  pgm.dropColumn('maintenance_checklist_items', 'on_failure_action', { ifExists: true });
  pgm.dropColumn('maintenance_checklist_items', 'decision_type', { ifExists: true });
  
  // Spalten von maintenance_plans entfernen
  pgm.dropColumn('maintenance_plans', 'next_due_hours', { ifExists: true });
  pgm.dropColumn('maintenance_plans', 'last_completed_hours', { ifExists: true });
  pgm.dropColumn('maintenance_plans', 'interval_hours', { ifExists: true });
  pgm.dropColumn('maintenance_plans', 'shift_deadline_time', { ifExists: true });
  pgm.dropColumn('maintenance_plans', 'is_shift_critical', { ifExists: true });
  
  // Spalten von machines entfernen
  pgm.dropColumn('machines', 'operating_hours_updated_at', { ifExists: true });
  pgm.dropColumn('machines', 'current_operating_hours', { ifExists: true });
  pgm.dropColumn('machines', 'requires_shift_checklist', { ifExists: true });
  pgm.dropColumn('machines', 'machine_category', { ifExists: true });
};
