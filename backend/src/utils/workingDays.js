/**
 * Arbeitstage für Urlaubs-/Abwesenheitsberechnung
 *
 * Arbeitstag = Soll-Zeit im Zeitmodell > 0 (gleiche Regel wie in der Zeiterfassung).
 * Ohne Zeitmodell: Montag–Freitag.
 * Ganzer Feiertag = 0 Tage, halber Feiertag (Heiligabend, Silvester) = 0,5 Tage.
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
 * @param {object|null|Function} model  Zeile aus time_models (oder null) – oder Funktion
 *                                 (dateStr) => Zeitmodell | null für ein Modell je Tag (Zeitmodell-Verlauf)
 * @param {Set<string>} holidays   ganze Feiertage als YYYY-MM-DD
 * @param {Set<string>} [halfDayHolidays]  halbe Feiertage als YYYY-MM-DD (zählen 0,5)
 * @returns {number}
 */
function countWorkingDays(startDate, endDate, model, holidays, halfDayHolidays = new Set()) {
  const current = new Date(`${toDateStr(startDate)}T00:00:00Z`);
  const end = new Date(`${toDateStr(endDate)}T00:00:00Z`);
  const modelAt = typeof model === 'function' ? model : () => model;

  let workingDays = 0;
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    if (isWorkday(current.getUTCDay(), modelAt(dateStr)) && !holidays.has(dateStr)) {
      workingDays += halfDayHolidays.has(dateStr) ? 0.5 : 1;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return workingDays;
}

/**
 * Arbeitstage je Kalenderjahr (für Urlaub über den Jahreswechsel).
 * Jedes vom Zeitraum berührte Jahr bekommt einen Eintrag, auch mit 0 Tagen.
 * @returns {Object<string, number>} z. B. { "2026": 8, "2027": 4 }
 */
function countWorkingDaysByYear(startDate, endDate, model, holidays, halfDayHolidays = new Set()) {
  const start = toDateStr(startDate);
  const end = toDateStr(endDate);
  const byYear = {};
  for (let year = Number(start.slice(0, 4)); year <= Number(end.slice(0, 4)); year++) {
    const from = year === Number(start.slice(0, 4)) ? start : `${year}-01-01`;
    const to = year === Number(end.slice(0, 4)) ? end : `${year}-12-31`;
    byYear[year] = countWorkingDays(from, to, model, holidays, halfDayHolidays);
  }
  return byYear;
}

module.exports = { countWorkingDays, countWorkingDaysByYear, toDateStr };
