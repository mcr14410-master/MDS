/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Wartungstypen
  pgm.createTable('maintenance_types', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    icon: { type: 'varchar(50)' },
    color: { type: 'varchar(7)' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Wartungspläne
  pgm.createTable('maintenance_plans', {
    id: 'id',
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'CASCADE'
    },
    maintenance_type_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_types',
      onDelete: 'RESTRICT'
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    interval_type: { type: 'varchar(20)', notNull: true }, // hours, days, weeks, months
    interval_value: { type: 'integer', notNull: true }, // z.B. 100 für "alle 100 Betriebsstunden"
    last_completed_at: { type: 'timestamp' },
    next_due_at: { type: 'timestamp', notNull: true },
    required_skill_level: { type: 'varchar(20)', notNull: true }, // helper, operator, technician, specialist
    estimated_duration_minutes: { type: 'integer' },
    priority: { type: 'varchar(20)', default: 'normal' }, // low, normal, high, critical
    is_active: { type: 'boolean', default: true },
    instructions: { type: 'text' },
    safety_notes: { type: 'text' },
    required_tools: { type: 'text' },
    required_parts: { type: 'text' },
    created_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
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

  // Wartungsaufgaben (Tasks)
  pgm.createTable('maintenance_tasks', {
    id: 'id',
    maintenance_plan_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_plans',
      onDelete: 'CASCADE'
    },
    machine_id: {
      type: 'integer',
      notNull: true,
      references: 'machines',
      onDelete: 'CASCADE'
    },
    status: { type: 'varchar(20)', notNull: true, default: 'pending' }, // pending, assigned, in_progress, completed, escalated, cancelled
    due_date: { type: 'timestamp', notNull: true },
    assigned_to: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    assigned_at: { type: 'timestamp' },
    started_at: { type: 'timestamp' },
    completed_at: { type: 'timestamp' },
    completed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    escalated_to: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    escalated_at: { type: 'timestamp' },
    escalation_reason: { type: 'text' },
    actual_duration_minutes: { type: 'integer' },
    notes: { type: 'text' },
    issues_found: { type: 'text' },
    parts_used: { type: 'text' },
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

  // Wartungs-Checkliste Items
  pgm.createTable('maintenance_checklist_items', {
    id: 'id',
    maintenance_plan_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_plans',
      onDelete: 'CASCADE'
    },
    title: { type: 'varchar(255)', notNull: true },
    description: { type: 'text' },
    sequence: { type: 'integer', notNull: true },
    requires_photo: { type: 'boolean', default: false },
    requires_measurement: { type: 'boolean', default: false },
    measurement_unit: { type: 'varchar(20)' },
    min_value: { type: 'decimal(10,3)' },
    max_value: { type: 'decimal(10,3)' },
    is_critical: { type: 'boolean', default: false },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Checklist Item Completions
  pgm.createTable('maintenance_checklist_completions', {
    id: 'id',
    maintenance_task_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_tasks',
      onDelete: 'CASCADE'
    },
    checklist_item_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_checklist_items',
      onDelete: 'CASCADE'
    },
    completed: { type: 'boolean', default: false },
    measurement_value: { type: 'decimal(10,3)' },
    photo_path: { type: 'varchar(500)' },
    notes: { type: 'text' },
    completed_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    completed_at: { type: 'timestamp' }
  });

  // Wartungsfotos
  pgm.createTable('maintenance_photos', {
    id: 'id',
    maintenance_task_id: {
      type: 'integer',
      notNull: true,
      references: 'maintenance_tasks',
      onDelete: 'CASCADE'
    },
    filename: { type: 'varchar(255)', notNull: true },
    filepath: { type: 'varchar(500)', notNull: true },
    filesize: { type: 'integer' },
    mime_type: { type: 'varchar(100)' },
    title: { type: 'varchar(255)' },
    description: { type: 'text' },
    uploaded_by: {
      type: 'integer',
      references: 'users',
      onDelete: 'SET NULL'
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Indizes
  pgm.createIndex('maintenance_plans', 'machine_id');
  pgm.createIndex('maintenance_plans', 'maintenance_type_id');
  pgm.createIndex('maintenance_plans', 'next_due_at');
  pgm.createIndex('maintenance_plans', 'is_active');
  pgm.createIndex('maintenance_plans', 'required_skill_level');
  
  pgm.createIndex('maintenance_tasks', 'maintenance_plan_id');
  pgm.createIndex('maintenance_tasks', 'machine_id');
  pgm.createIndex('maintenance_tasks', 'status');
  pgm.createIndex('maintenance_tasks', 'due_date');
  pgm.createIndex('maintenance_tasks', 'assigned_to');
  pgm.createIndex('maintenance_tasks', ['status', 'due_date']);
  
  pgm.createIndex('maintenance_checklist_items', 'maintenance_plan_id');
  pgm.createIndex('maintenance_checklist_items', ['maintenance_plan_id', 'sequence']);
  
  pgm.createIndex('maintenance_checklist_completions', 'maintenance_task_id');
  pgm.createIndex('maintenance_checklist_completions', 'checklist_item_id');
  
  pgm.createIndex('maintenance_photos', 'maintenance_task_id');

  // Standard Wartungstypen einfügen
  pgm.sql(`
    INSERT INTO maintenance_types (name, description, icon, color) VALUES
    ('daily_inspection', 'Tägliche Inspektion', 'ClipboardCheck', '#06b6d4'),
    ('weekly_cleaning', 'Wöchentliche Reinigung', 'Sparkles', '#10b981'),
    ('monthly_service', 'Monatlicher Service', 'Wrench', '#f59e0b'),
    ('oil_change', 'Ölwechsel', 'Droplet', '#8b5cf6'),
    ('filter_replacement', 'Filterwechsel', 'Filter', '#ec4899'),
    ('calibration', 'Kalibrierung', 'Target', '#3b82f6'),
    ('emergency_repair', 'Notfall-Reparatur', 'AlertTriangle', '#ef4444'),
    ('preventive', 'Vorbeugende Wartung', 'Shield', '#10b981'),
    ('predictive', 'Vorausschauende Wartung', 'TrendingUp', '#8b5cf6');
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('maintenance_photos');
  pgm.dropTable('maintenance_checklist_completions');
  pgm.dropTable('maintenance_checklist_items');
  pgm.dropTable('maintenance_tasks');
  pgm.dropTable('maintenance_plans');
  pgm.dropTable('maintenance_types');
};
