/**
 * Löschschutz: Programme und Arbeitsgänge mit offener Bereitstellung nicht löschen
 * (Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 4.2 „Löschregeln“). Abgeschlossene blockieren nichts.
 */

const { OPEN_STATUSES } = require('./deploymentChecks');

/** Offene Bereitstellung, die ein Programm bzw. einen Arbeitsgang festhält (Löschschutz) */
async function openDeploymentFor(db, { programId = null, operationId = null }) {
  const result = await db.query(
    `SELECT d.id, a.name AS agent_name
     FROM agent_deployments d JOIN agents a ON a.id = d.agent_id
     WHERE d.status = ANY($1)
       AND (($2::int IS NOT NULL AND EXISTS (SELECT 1 FROM agent_deployment_programs dp
                                              WHERE dp.deployment_id = d.id AND dp.program_id = $2))
            OR ($3::int IS NOT NULL AND d.operation_id = $3))
     LIMIT 1`,
    [OPEN_STATUSES, programId, operationId]
  );
  return result.rows[0] || null;
}

module.exports = { openDeploymentFor };
