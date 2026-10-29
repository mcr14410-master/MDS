/**
 * Programmnummer vorschlagen: <OP-Code>-<laufende Nummer> (z. B. OP10-001)
 *
 * Höchste vorhandene Nummer + 1 – „Anzahl + 1“ vergab nach dem Löschen eines Programms
 * eine Nummer doppelt. NC- und Messprogramme eines Arbeitsgangs zählen gemeinsam.
 * Das Format wird in docs/konzepte/PROGRAMMNUMMERN_KONZEPT.md neu festgelegt.
 *
 * @param {string} opNumber  OP-Code des Arbeitsgangs
 * @param {string[]} existing  Programmnummern, die es am Arbeitsgang schon gibt
 */
function nextProgramNumber(opNumber, existing) {
  const prefix = `${opNumber}-`;
  let max = 0;
  for (const number of existing) {
    if (!number || !number.startsWith(prefix)) continue;
    const rest = number.slice(prefix.length);
    if (/^\d+$/.test(rest)) max = Math.max(max, parseInt(rest, 10));
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

/** Vorschlag für einen Arbeitsgang aus der DB (db: Pool oder Client) */
async function suggestProgramNumber(db, operationId, opNumber) {
  const { rows } = await db.query('SELECT program_number FROM programs WHERE operation_id = $1', [operationId]);
  return nextProgramNumber(opNumber, rows.map(r => r.program_number));
}

module.exports = { nextProgramNumber, suggestProgramNumber };
