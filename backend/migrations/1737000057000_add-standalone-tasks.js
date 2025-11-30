'use strict';

exports.up = async (pgm) => {
  // Task-Typ hinzufügen
  pgm.addColumn('maintenance_tasks', {
    task_type: {
      type: 'varchar(20)',
      default: 'plan_based',
      notNull: true
    }
  });

  // Titel für standalone Tasks
  pgm.addColumn('maintenance_tasks', {
    title: {
      type: 'varchar(255)',
      comment: 'Titel für standalone Tasks (bei plan_based aus Plan übernommen)'
    }
  });

  // Beschreibung für standalone Tasks
  pgm.addColumn('maintenance_tasks', {
    description: {
      type: 'text',
      comment: 'Beschreibung für standalone Tasks'
    }
  });

  // Ort für nicht-maschinengebundene Tasks
  pgm.addColumn('maintenance_tasks', {
    location: {
      type: 'varchar(100)',
      comment: 'Ort für standalone Tasks (z.B. Werkstatt, Lager)'
    }
  });

  // Priorität (falls nicht aus Plan)
  pgm.addColumn('maintenance_tasks', {
    priority: {
      type: 'varchar(20)',
      default: 'normal'
    }
  });

  // Geschätzte Dauer
  pgm.addColumn('maintenance_tasks', {
    estimated_duration_minutes: {
      type: 'integer'
    }
  });

  // Erstellt von
  pgm.addColumn('maintenance_tasks', {
    created_by: {
      type: 'integer',
      references: 'users(id)'
    }
  });

  // Wiederholung für recurring standalone Tasks
  pgm.addColumn('maintenance_tasks', {
    recurrence_pattern: {
      type: 'varchar(20)',
      comment: 'none, daily, weekly, monthly'
    }
  });

  // machine_id nullable machen
  pgm.alterColumn('maintenance_tasks', 'machine_id', {
    notNull: false
  });

  // maintenance_plan_id nullable machen (falls nicht schon)
  pgm.alterColumn('maintenance_tasks', 'maintenance_plan_id', {
    notNull: false
  });

  // Index für task_type
  pgm.createIndex('maintenance_tasks', 'task_type');

  // Bestehende Tasks auf plan_based setzen
  pgm.sql(`UPDATE maintenance_tasks SET task_type = 'plan_based' WHERE task_type IS NULL`);
};

exports.down = async (pgm) => {
  pgm.dropIndex('maintenance_tasks', 'task_type');
  pgm.dropColumn('maintenance_tasks', 'recurrence_pattern');
  pgm.dropColumn('maintenance_tasks', 'created_by');
  pgm.dropColumn('maintenance_tasks', 'estimated_duration_minutes');
  pgm.dropColumn('maintenance_tasks', 'priority');
  pgm.dropColumn('maintenance_tasks', 'location');
  pgm.dropColumn('maintenance_tasks', 'description');
  pgm.dropColumn('maintenance_tasks', 'title');
  pgm.dropColumn('maintenance_tasks', 'task_type');
};
