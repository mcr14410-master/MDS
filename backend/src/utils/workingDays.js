/**
 * Arbeitstage für Urlaubs-/Abwesenheitsberechnung
 *
 * Arbeitstag = Soll-Zeit im Zeitmodell > 0 (gleiche Regel wie in der Zeiterfassung).
 * Ohne Zeitmodell: Montag–Freitag.
 * Gerechnet wird rein auf Kalendertagen (UTC-Datumsarithmetik), damit Container-Zeitzone
 * und DST-Wechsel keinen Einfluss haben.
 */

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toDateStr(value) {
  if (value instanceof Date) {
    return value.toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  }
  return String(value).slice(0, 10);
}

function isWorkday(dayOfWeek, model) {
  if (!model) return dayOfWeek !== 0 && dayOfWeek !== 6;
  return (parseInt(model[`${DAY_KEYS[dayOfWeek]}_minutes`]) || 0) > 0;
}

/**
 * @param {string|Date} startDate  YYYY-MM-DD
 * @param {string|Date} endDate    YYYY-MM-DD (inklusive)
 * @param {object|null} model      Zeile aus time_models (oder null)
 * @param {Set<string>} holidays   Feiertage als YYYY-MM-DD
 * @returns {number}
 */
function countWorkingDays(startDate, endDate, model, holidays) {
  const current = new Date(`${toDateStr(startDate)}T00:00:00Z`);
  const end = new Date(`${toDateStr(endDate)}T00:00:00Z`);

  let workingDays = 0;
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    if (isWorkday(current.getUTCDay(), model) && !holidays.has(dateStr)) {
      workingDays++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return workingDays;
}

module.exports = { countWorkingDays };
