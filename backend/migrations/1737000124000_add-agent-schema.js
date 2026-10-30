/* eslint-disable camelcase */

/**
 * Migration: MDS-Agent – Geräte, Bereitstellungen, Dateizustände, Transferprotokoll
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 4.2 (PR 4.2):
 * - agents: Gerät mit API-Schlüssel (nur SHA-256-Hash), Modulliste (MODULE_KONZEPT.md 4)
 * - agent_deployments: „diese Arbeit läuft gerade auf diesem Gerät“, je Gerät und Arbeitsgang
 *   höchstens eine offene
 * - agent_deployment_programs: festgehaltene Version je Programm der Bereitstellung
 * - agent_file_states: Ist-Zustand auf dem Gerät (Ziel + relativer Pfad), vom Agenten gemeldet
 * - program_transfers: Protokoll jeder Dateibewegung mit Schnappschüssen (Audit-Trail),
 *   client_id macht wiederholte Berichte harmlos
 * - Rechte agent.manage und program.deploy, nur für admin (andere Rollen über die
 *   Benutzerverwaltung, Dev-Standardrechte in devRoleDefaults.js)
 *
 * Löschen: Agenten werden nur deaktiviert (RESTRICT). Bereitstellungen hängen am Arbeitsgang
 * wie die Programme (CASCADE); offene Bereitstellungen schützt der Controller.
 * Das Protokoll behält Schnappschüsse, Bezüge werden NULL.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE agents (
      id                SERIAL PRIMARY KEY,
      name              VARCHAR(100) NOT NULL UNIQUE,
      machine_id        INTEGER REFERENCES machines(id) ON DELETE SET NULL,
      api_key_hash      CHAR(64) NOT NULL UNIQUE,
      api_key_prefix    VARCHAR(16) NOT NULL,
      modules           JSONB NOT NULL DEFAULT '[]'
        CONSTRAINT agents_modules_array_check CHECK (jsonb_typeof(modules) = 'array'),
      poll_interval_sec INTEGER NOT NULL DEFAULT 30
        CONSTRAINT agents_poll_interval_check CHECK (poll_interval_sec BETWEEN 5 AND 3600),
      last_seen_at      TIMESTAMPTZ,
      last_ip           VARCHAR(45),
      agent_version     VARCHAR(20),
      last_warnings     JSONB NOT NULL DEFAULT '[]',
      is_active         BOOLEAN NOT NULL DEFAULT true,
      created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE agent_deployments (
      id                 SERIAL PRIMARY KEY,
      agent_id           INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
      operation_id       INTEGER NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
      order_ref          VARCHAR(100),
      status             VARCHAR(15) NOT NULL DEFAULT 'requested'
        CONSTRAINT agent_deployments_status_check
        CHECK (status IN ('requested', 'active', 'closing', 'closed')),
      requested_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
      close_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      close_reason       VARCHAR(20),
      discard_local_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      discard_local_at   TIMESTAMPTZ,
      last_activity_at   TIMESTAMPTZ,
      remind_after       TIMESTAMPTZ,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      activated_at       TIMESTAMPTZ,
      close_requested_at TIMESTAMPTZ,
      closed_at          TIMESTAMPTZ
    );
    CREATE UNIQUE INDEX agent_deployments_open_key
      ON agent_deployments (agent_id, operation_id) WHERE status IN ('requested', 'active', 'closing');
    CREATE INDEX agent_deployments_operation_id_index ON agent_deployments (operation_id);

    CREATE TABLE agent_deployment_programs (
      deployment_id INTEGER NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
      program_id    INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
      revision_id   INTEGER NOT NULL REFERENCES program_revisions(id) ON DELETE CASCADE,
      local_dir     VARCHAR(255) NOT NULL,
      updated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (deployment_id, program_id)
    );
    CREATE INDEX agent_deployment_programs_program_id_index ON agent_deployment_programs (program_id);

    CREATE TABLE agent_file_states (
      agent_id      INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      target        VARCHAR(20) NOT NULL
        CONSTRAINT agent_file_states_target_check CHECK (target IN ('program_dir', 'template_dir')),
      rel_path      VARCHAR(500) NOT NULL,
      deployment_id INTEGER REFERENCES agent_deployments(id) ON DELETE CASCADE,
      file_id       INTEGER REFERENCES program_revision_files(id) ON DELETE SET NULL,
      expected_hash VARCHAR(64),
      local_hash    VARCHAR(64),
      state         VARCHAR(20) NOT NULL
        CONSTRAINT agent_file_states_state_check CHECK (state IN
          ('current', 'pending', 'locked', 'run_saved', 'modified', 'missing', 'conflict', 'corrupt', 'unknown')),
      message       TEXT,
      reported_at   TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (agent_id, target, rel_path)
    );
    CREATE INDEX agent_file_states_deployment_id_index ON agent_file_states (deployment_id);

    CREATE TABLE program_transfers (
      id             SERIAL PRIMARY KEY,
      client_id      UUID NOT NULL UNIQUE,
      agent_id       INTEGER NOT NULL REFERENCES agents(id) ON DELETE RESTRICT,
      deployment_id  INTEGER REFERENCES agent_deployments(id) ON DELETE SET NULL,
      program_id     INTEGER REFERENCES programs(id) ON DELETE SET NULL,
      revision_id    INTEGER REFERENCES program_revisions(id) ON DELETE SET NULL,
      file_id        INTEGER REFERENCES program_revision_files(id) ON DELETE SET NULL,
      program_number VARCHAR(100),
      version_string VARCHAR(20),
      filename       VARCHAR(255) NOT NULL,
      direction      VARCHAR(20) NOT NULL
        CONSTRAINT program_transfers_direction_check CHECK (direction IN
          ('to_device', 'adopted', 'removed', 'discarded_run_save', 'discarded', 'kept_modified')),
      result         VARCHAR(20) NOT NULL
        CONSTRAINT program_transfers_result_check CHECK (result IN
          ('ok', 'skipped_locked', 'skipped_conflict', 'error')),
      file_hash      VARCHAR(64),
      message        TEXT,
      triggered_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
      occurred_at    TIMESTAMPTZ NOT NULL,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX program_transfers_deployment_idx ON program_transfers (deployment_id);
    CREATE INDEX program_transfers_program_idx ON program_transfers (program_id);
    CREATE INDEX program_transfers_agent_idx ON program_transfers (agent_id, occurred_at);
  `);

  pgm.sql(`
    INSERT INTO permissions (name, description, category) VALUES
    ('agent.manage', 'MDS-Agenten verwalten: Geräte anlegen, API-Schlüssel erzeugen, Module schalten', 'agent'),
    ('program.deploy', 'Programme auf Geräten bereitstellen, aktualisieren, abschließen und lokale Dateien verwerfen', 'program')
    ON CONFLICT (name) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.name = 'admin'
    AND p.name IN ('agent.manage', 'program.deploy')
    ON CONFLICT DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM role_permissions
    WHERE permission_id IN (SELECT id FROM permissions WHERE name IN ('agent.manage', 'program.deploy'));
    DELETE FROM permissions WHERE name IN ('agent.manage', 'program.deploy');

    DROP TABLE IF EXISTS program_transfers;
    DROP TABLE IF EXISTS agent_file_states;
    DROP TABLE IF EXISTS agent_deployment_programs;
    DROP TABLE IF EXISTS agent_deployments;
    DROP TABLE IF EXISTS agents;
  `);
};
