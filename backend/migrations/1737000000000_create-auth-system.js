/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Rollen-Tabelle
  pgm.createTable('roles', {
    id: 'id',
    name: { type: 'varchar(50)', notNull: true, unique: true },
    description: { type: 'text' },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Berechtigungen-Tabelle
  pgm.createTable('permissions', {
    id: 'id',
    name: { type: 'varchar(100)', notNull: true, unique: true },
    description: { type: 'text' },
    category: { type: 'varchar(50)' }, // part, program, maintenance, etc.
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  // Benutzer-Tabelle
  pgm.createTable('users', {
    id: 'id',
    username: { type: 'varchar(50)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    first_name: { type: 'varchar(100)' },
    last_name: { type: 'varchar(100)' },
    is_active: { type: 'boolean', notNull: true, default: true },
    last_login: { type: 'timestamp' },
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

  // User-Roles Junction Table (m:n)
  pgm.createTable('user_roles', {
    user_id: {
      type: 'integer',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE'
    },
    role_id: {
      type: 'integer',
      notNull: true,
      references: 'roles',
      onDelete: 'CASCADE'
    },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.addConstraint('user_roles', 'user_roles_pkey', {
    primaryKey: ['user_id', 'role_id']
  });

  // Role-Permissions Junction Table (m:n)
  pgm.createTable('role_permissions', {
    role_id: {
      type: 'integer',
      notNull: true,
      references: 'roles',
      onDelete: 'CASCADE'
    },
    permission_id: {
      type: 'integer',
      notNull: true,
      references: 'permissions',
      onDelete: 'CASCADE'
    },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp')
    }
  });

  pgm.addConstraint('role_permissions', 'role_permissions_pkey', {
    primaryKey: ['role_id', 'permission_id']
  });

  // Indizes für Performance
  pgm.createIndex('users', 'username');
  pgm.createIndex('users', 'email');
  pgm.createIndex('user_roles', 'user_id');
  pgm.createIndex('user_roles', 'role_id');
  pgm.createIndex('role_permissions', 'role_id');
  pgm.createIndex('role_permissions', 'permission_id');

  // Standard-Rollen einfügen
  pgm.sql(`
    INSERT INTO roles (name, description) VALUES
    ('admin', 'System-Administrator mit allen Rechten'),
    ('programmer', 'CAM-Programmierer - erstellt und verwaltet NC-Programme'),
    ('reviewer', 'Prüfer - gibt Programme frei'),
    ('operator', 'Maschinenbediener - liest Dokumente, lädt Programme'),
    ('helper', 'Helfer - führt einfache Wartungen durch'),
    ('supervisor', 'Meister/Vorgesetzter - Überblick und Reporting');
  `);

  // Standard-Berechtigungen einfügen
  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    -- Part Permissions
    ('part.read', 'Bauteile anzeigen', 'part'),
    ('part.create', 'Bauteile erstellen', 'part'),
    ('part.update', 'Bauteile bearbeiten', 'part'),
    ('part.delete', 'Bauteile löschen', 'part'),
    
    -- Program Permissions
    ('program.read', 'Programme anzeigen', 'program'),
    ('program.create', 'Programme erstellen', 'program'),
    ('program.update', 'Programme bearbeiten', 'program'),
    ('program.delete', 'Programme löschen', 'program'),
    ('program.release', 'Programme freigeben', 'program'),
    ('program.download', 'Programme herunterladen', 'program'),
    ('program.upload', 'Programme hochladen', 'program'),
    
    -- Machine Permissions
    ('machine.read', 'Maschinen anzeigen', 'machine'),
    ('machine.create', 'Maschinen erstellen', 'machine'),
    ('machine.update', 'Maschinen bearbeiten', 'machine'),
    ('machine.delete', 'Maschinen löschen', 'machine'),
    
    -- Maintenance Permissions
    ('maintenance.read', 'Wartungen anzeigen', 'maintenance'),
    ('maintenance.create', 'Wartungen erstellen', 'maintenance'),
    ('maintenance.update', 'Wartungen bearbeiten', 'maintenance'),
    ('maintenance.complete', 'Wartungen als erledigt markieren', 'maintenance'),
    ('maintenance.escalate', 'Wartungen eskalieren', 'maintenance'),
    
    -- User Permissions
    ('user.read', 'Benutzer anzeigen', 'user'),
    ('user.create', 'Benutzer erstellen', 'user'),
    ('user.update', 'Benutzer bearbeiten', 'user'),
    ('user.delete', 'Benutzer löschen', 'user'),
    
    -- Audit Permissions
    ('audit.read', 'Audit-Logs anzeigen', 'audit'),
    
    -- Report Permissions
    ('report.read', 'Reports anzeigen', 'report'),
    ('report.export', 'Reports exportieren', 'report');
  `);

  // Admin-Benutzer erstellen (Passwort: admin123 - MUSS geändert werden!)
  // Passwort-Hash für 'admin123' mit bcrypt
  pgm.sql(`
    INSERT INTO users (username, email, password_hash, first_name, last_name)
    VALUES ('admin', 'admin@example.com', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa', 'System', 'Administrator');
  `);

  // Admin-Rolle dem Admin-User zuweisen
  pgm.sql(`
    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, r.id
    FROM users u, roles r
    WHERE u.username = 'admin' AND r.name = 'admin';
  `);

  // Alle Berechtigungen der Admin-Rolle zuweisen
  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p
    WHERE r.name = 'admin';
  `);
};

exports.down = (pgm) => {
  pgm.dropTable('role_permissions');
  pgm.dropTable('user_roles');
  pgm.dropTable('users');
  pgm.dropTable('permissions');
  pgm.dropTable('roles');
};
