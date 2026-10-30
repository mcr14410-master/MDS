/**
 * MDS-Agent: API-Schlüssel, Module, Eingaben prüfen
 *
 * Reine Funktionen ohne DB. Regeln aus docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md (4.2, 5.1, 5.4):
 * Schlüssel = 'mdsa_' + 32 Zufallsbytes (base64url), gespeichert wird nur der SHA-256-Hash und
 * ein kurzer Anfang zur Anzeige. Der Schlüssel selbst wird genau einmal ausgeliefert.
 */

const crypto = require('crypto');

const KEY_PREFIX = 'mdsa_';
const DISPLAY_PREFIX_LENGTH = 12;
const VERSION_PATTERN = /^[0-9A-Za-z.+-]{1,20}$/;

// Agent-Module, die das MDS kennt (MODULE_KONZEPT.md 4); geschaltet je Gerät in agents.modules
const AGENT_MODULES = {
  cmm_sync: {
    name: 'Messprogramme (PC-DMIS)',
    description: 'Messprogramme bereitstellen und abschließen, Excel-Vorlagen im Vorlagenverzeichnis',
  },
};

const generateApiKey = () => KEY_PREFIX + crypto.randomBytes(32).toString('base64url');

const hashApiKey = (key) => crypto.createHash('sha256').update(key, 'utf8').digest('hex');

const displayPrefix = (key) => key.slice(0, DISPLAY_PREFIX_LENGTH);

/** Grobe Formprüfung vor der DB-Abfrage (fremde oder kaputte Header gar nicht erst suchen) */
const looksLikeApiKey = (key) => typeof key === 'string'
  && key.startsWith(KEY_PREFIX) && key.length >= 20 && key.length <= 100;

/** X-Agent-Version nur übernehmen, wenn es nach einer Version aussieht */
const cleanAgentVersion = (value) => (typeof value === 'string' && VERSION_PATTERN.test(value) ? value : null);

/**
 * Eingaben für Anlegen/Ändern prüfen. Nur übergebene Felder werden geprüft und zurückgegeben,
 * damit PUT einzelne Felder ändern und machine_id auch leeren kann.
 * @param {Object} body
 * @param {boolean} creating  true = name Pflicht
 * @returns {{ values: Object, errors: string[] }}
 */
function validateAgentInput(body = {}, creating = false) {
  const values = {};
  const errors = [];

  if (body.name !== undefined || creating) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) errors.push('Name fehlt');
    else if (name.length > 100) errors.push('Name ist zu lang (höchstens 100 Zeichen)');
    else values.name = name;
  }

  if (body.machine_id !== undefined) {
    if (body.machine_id === null || body.machine_id === '') values.machine_id = null;
    else if (Number.isInteger(Number(body.machine_id)) && Number(body.machine_id) > 0) values.machine_id = Number(body.machine_id);
    else errors.push('Ungültige Maschine');
  }

  if (body.modules !== undefined) {
    if (!Array.isArray(body.modules)) {
      errors.push('Module müssen eine Liste sein');
    } else {
      const unknown = body.modules.filter(m => !Object.prototype.hasOwnProperty.call(AGENT_MODULES, m));
      if (unknown.length > 0) errors.push(`Unbekannte Module: ${unknown.join(', ')}`);
      else values.modules = [...new Set(body.modules)];
    }
  }

  if (body.poll_interval_sec !== undefined) {
    const sec = Number(body.poll_interval_sec);
    if (!Number.isInteger(sec) || sec < 5 || sec > 3600) errors.push('Abfrage-Intervall muss zwischen 5 und 3600 Sekunden liegen');
    else values.poll_interval_sec = sec;
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') errors.push('is_active muss true oder false sein');
    else values.is_active = body.is_active;
  }

  return { values, errors };
}

module.exports = {
  AGENT_MODULES,
  KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  displayPrefix,
  looksLikeApiKey,
  cleanAgentVersion,
  validateAgentInput,
};
