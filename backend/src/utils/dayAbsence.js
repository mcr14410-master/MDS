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
 * - Abwesenheit mit Gutschrift (credits_target_hours): restliches Soll wird gutgeschrieben
 * - Gestempelte Zeit addiert der Aufrufer
 */

// Halber Feiertag (Heiligabend, Silvester):
// false = wie bisher im Nacht-Job: halbes Soll, halbes Soll gutgeschrieben → Tag ohne Stempel ±0
// true  = halber Arbeitstag: volles Soll, halbes Soll gutgeschrieben → ohne Stempel −halbes Soll
//         (passt zur Urlaubsberechnung, die dort 0,5 Urlaubstage zählt) – Klärung mit der Buchhaltung offen
const HALF_HOLIDAY_IS_WORKDAY = false;

/**
 * @param {object} p
 * @param {number} p.baseTarget          Soll laut Zeitmodell bzw. manueller Override (Minuten)
 * @param {object|null} p.holiday        { id, is_half_day } oder null
 * @param {object|null} p.vacation       { id, type, credits_target_hours } (genehmigt) oder null
 * @param {boolean} p.holidayCredit      Einstellung absence_credits_target
 * @returns {{ target: number, credit: number, status: string|null, holidayId: number|null, vacationId: number|null }}
 *          status null = keine Abwesenheit, Aufrufer bestimmt den Status aus den Buchungen
 */
function calculateDayAbsence({ baseTarget, holiday, vacation, holidayCredit }) {
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
    credit += target - credit;
  }

  let status = null;
  if (holiday && !holiday.is_half_day) {
    status = 'holiday';                       // Urlaub zählt den Tag ohnehin nicht
  } else if (vacation) {
    status = vacation.type;
  } else if (holiday) {
    status = 'holiday';
  }

  return {
    target,
    credit,
    status,
    holidayId: holiday?.id || null,
    vacationId: vacation?.id || null,
  };
}

module.exports = { calculateDayAbsence, HALF_HOLIDAY_IS_WORKDAY };
