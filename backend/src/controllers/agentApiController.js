/**
 * Agent-API – Endpunkte für den MDS-Agenten selbst (Header X-Agent-Key, siehe middleware/agentAuth.js)
 *
 * Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.4. Stand PR 4.3: Manifest mit der Konfiguration
 * des Geräts; die Bereitstellungen (deployments) liefert es ab PR 4.5, bis dahin immer leer.
 */

const { version: SERVER_VERSION } = require('../../package.json');

// GET /api/agent/manifest
exports.getManifest = (req, res) => {
  const { agent } = req;
  res.json({
    config: {
      agent_id: agent.id,
      name: agent.name,
      modules: agent.modules,
      poll_interval_sec: agent.poll_interval_sec,
      server_version: SERVER_VERSION,
    },
    deployments: [],
  });
};
