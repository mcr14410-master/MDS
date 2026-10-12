// Anzeige von Urlaubstagen über den Jahreswechsel
// days_by_year: Arbeitstage je Kalenderjahr, z. B. { "2026": 5, "2027": 2 }

const toNumber = (value) => parseFloat(value) || 0;

/**
 * Tage eines Urlaubs im angegebenen Jahr (ohne days_by_year: Gesamttage)
 */
export const daysInYear = (vacation, year) => {
  const byYear = vacation.days_by_year;
  return byYear ? toNumber(byYear[year]) : toNumber(vacation.calculated_days);
};

/**
 * Anteile der übrigen Jahre, z. B. "+2 in 2027" – leer, wenn der Urlaub nur in `year` liegt
 */
export const formatOtherYears = (vacation, year) =>
  Object.entries(vacation.days_by_year || {})
    .filter(([y, days]) => y !== String(year) && toNumber(days) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([y, days]) => `+${toNumber(days)} in ${y}`)
    .join(', ');

/**
 * Tage im Jahr mit Hinweis auf die übrigen Jahre, z. B. "5 T (+2 in 2027)"
 */
export const formatDaysInYear = (vacation, year) => {
  const others = formatOtherYears(vacation, year);
  return `${daysInYear(vacation, year)} T${others ? ` (${others})` : ''}`;
};

/**
 * Aufteilung auf die Jahre, z. B. "5 in 2026, 2 in 2027" – leer bei nur einem Jahr
 */
export const formatYearSplit = (daysByYear) => {
  const entries = Object.entries(daysByYear || {})
    .filter(([, days]) => toNumber(days) > 0)
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length > 1
    ? entries.map(([y, days]) => `${toNumber(days)} in ${y}`).join(', ')
    : '';
};
