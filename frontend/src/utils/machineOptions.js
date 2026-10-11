// frontend/src/utils/machineOptions.js

/**
 * Maschinen für Auswahlfelder in Formularen: nur aktive Maschinen,
 * dazu die bereits zugeordnete – auch wenn sie inzwischen deaktiviert ist,
 * damit die bestehende Zuordnung beim Bearbeiten sichtbar bleibt.
 *
 * @param {Array} machines   – Maschinen aus dem machinesStore
 * @param {number|string} [assignedId] – ursprünglich zugeordnete Maschine des Datensatzes
 * @returns {Array}
 */
export function selectableMachines(machines, assignedId) {
  return (machines || []).filter(m =>
    m.is_active !== false || (assignedId && String(m.id) === String(assignedId))
  );
}

/**
 * Zusatz für den Anzeigenamen inaktiver Maschinen
 * @param {object} machine
 * @returns {string}
 */
export function inactiveSuffix(machine) {
  return machine.is_active === false ? ' (inaktiv)' : '';
}
