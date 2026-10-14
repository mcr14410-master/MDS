/**
 * Bundesland für Feiertage – einzige Quelle: Einstellung „Standard-Region“
 * (vacation_settings.default_region). Gilt für Urlaubsberechnung, Zeiterfassung,
 * Kalender und die Feiertags-API ohne Regionsangabe.
 *
 * Bewusst ohne Cache: Nach dem Umstellen in den Einstellungen gilt die neue Region sofort.
 */

const pool = require('../config/db');

const DEFAULT_HOLIDAY_REGION = 'BY';

async function getHolidayRegion() {
  const result = await pool.query(
    "SELECT value FROM vacation_settings WHERE key = 'default_region'"
  );
  return result.rows[0]?.value || DEFAULT_HOLIDAY_REGION;
}

module.exports = { getHolidayRegion, DEFAULT_HOLIDAY_REGION };
