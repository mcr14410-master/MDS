/**
 * Soll, Gutschrift und Status eines Tages bei Feiertag und/oder Abwesenheit (Urlaub, Krank …).
 *
 * Gemeinsame Regel für alle Stellen, die Tageswerte schreiben: Tagesberechnung
 * (updateDailySummary), Nacht-Job (generateAbsenceEntries) und Urlaubs-Sync
 * (syncDailySummaryForVacation). Vorher rechnete jede Stelle anders – ein Feiertag, den
 * die Tagesberechnung neu rechnete (Tagesinfo, Buchung, Korrektur), landete mit −Soll im Saldo.
 *
 * Regel:
 * - Feiertagsanteil: ganzer Feiertag = ganzes Soll, halber Feiertag siehe HALF_HOLIDAY_IS_WORKDAY
 * - Einstellung „Feiertage gutschreiben“ an: Soll bleibt, Feiertagsanteil wird als Ist gutgeschrieben;
 *   aus: Soll wird um den Feiertagsanteil reduziert (Saldo gleich, nur ohne Feiertagsstunden im Ist)
 * - Abwesenheit mit Gutschrift (credits_target_hours): füllt bis zum Soll auf – Soll minus Feiertagsanteil
 *   minus gestempelte Zeit, nie unter 0 (Lohnausfallprinzip: so gestellt, als hätte er gearbeitet;
 *   z. B. 2 h gearbeitet, dann krank → 6:30 Gutschrift, nicht 8:30)
 * - Gestempelte Zeit addiert der Aufrufer; Zeit über dem Soll bleibt als Überzeit erhalten
 */

// Halber Feiertag (Heiligabend, Silvester):
// true  = halber Arbeitstag: volles Soll, halbes Soll gutgeschrieben → ohne Stempel −halbes Soll,
//         Status wie ein normaler Arbeitstag (ohne Stempel „fehlende Buchung“); passt zur
//         Urlaubsberechnung, die dort 0,5 Urlaubstage zählt – mit der Buchhaltung abgestimmt (15.10.2026)
// false = halber Tag frei: halbes Soll, halbes Soll gutgeschrieben → ohne Stempel ±0 (bis 2.9.4)
const HALF_HOLIDAY_IS_WORKDAY = true;

/**
 * @param {object} p
 * @param {number} p.baseTarget          Soll laut Zeitmodell bzw. manueller Override (Minuten)
 * @param {object|null} p.holiday        { id, is_half_day } oder null
 * @param {object|null} p.vacation       { id, type, credits_target_hours } (genehmigt) oder null
 * @param {boolean} p.holidayCredit      Einstellung absence_credits_target
 * @param {number} [p.workedMinutes=0]   an diesem Tag gestempelte Arbeitszeit
 * @returns {{ target: number, credit: number, status: string|null, holidayId: number|null, vacationId: number|null }}
 *          status null = keine Abwesenheit, Aufrufer bestimmt den Status aus den Buchungen
 */
function calculateDayAbsence({ baseTarget, holiday, vacation, holidayCredit, workedMinutes = 0 }) {
  let target = baseTarget;
  let holidayPart = 0;

  if (holiday) {
    if (!holiday.is_half_day) {
      holidayPart = target;
    } else if (HALF_HOLIDAY_IS_WORKDAY) {
      holidayPart = Math.round(target / 2);
    } else {
      target = Math.round(target / 2);
      holidayPart = target;
    }
  }

  let credit = 0;
  if (holidayCredit) {
    credit = holidayPart;
  } else {
    target -= holidayPart;
  }

  if (vacation?.credits_target_hours) {
    credit += Math.max(0, target - credit - workedMinutes);
  }

  let status = null;
  if (holiday && !holiday.is_half_day) {
    status = 'holiday';                       // Urlaub zählt den Tag ohnehin nicht
  } else if (vacation) {
    status = vacation.type;
  } else if (holiday && !HALF_HOLIDAY_IS_WORKDAY) {
    status = 'holiday';
  }
  // Halber Feiertag als halber Arbeitstag ohne Abwesenheit: kein Status – der Aufrufer behandelt ihn
  // wie einen normalen Arbeitstag (vollständig / unvollständig / ohne Stempel „fehlende Buchung“)

  return {
    target,
    credit,
    status,
    holidayId: holiday?.id || null,
    vacationId: vacation?.id || null,
  };
}

module.exports = { calculateDayAbsence, HALF_HOLIDAY_IS_WORKDAY };
