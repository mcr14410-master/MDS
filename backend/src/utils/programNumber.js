/**
 * Programmnummern nach Schema (docs/konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md)
 *
 *   NC-Programm:  <Bauteilnummer>-<n>    z. B. KD00000-00004-1
 *   Messprogramm: <Bauteilnummer>-M<n>   z. B. KD00000-00004-M1
 *
 * `n` kommt aus einem festen Zähler je Bauteil und Art (part_program_counters) und wird nie neu
 * vergeben, auch nicht nach dem Löschen (S1). Varianten eines Arbeitsgangs übernehmen die Nummer
 * aus der Variantengruppe (S5). Eindeutig über alle Programme, ohne Groß-/Kleinschreibung,
 * Ausnahme: gleiche Art in einem anderen Arbeitsgang derselben Variantengruppe (S4).
 */

const MAX_LENGTH = 50;      // programs.program_number varchar(50)
const DISPLAY_LENGTH = 24;  // Heidenhain/Siemens zeigen längere Namen nicht vollständig an

class ProgramNumberError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const kindPrefix = (kind) => (kind === 'cmm' ? 'M' : '');

/** Vergleichsform: getrimmt, Großbuchstaben (Windows unterscheidet Dateinamen nicht nach Groß/klein) */
function normalizeProgramNumber(number) {
  return String(number ?? '').trim().toUpperCase();
}

function formatProgramNumber(partNumber, kind, seq) {
  return `${String(partNumber).trim()}-${kindPrefix(kind)}${seq}`;
}

/** `n` einer Nummer im Schema dieses Bauteils und dieser Art, sonst null */
function parseSchemaSeq(number, partNumber, kind) {
  if (!number || !partNumber) return null;
  const prefix = normalizeProgramNumber(`${String(partNumber).trim()}-${kindPrefix(kind)}`);
  const n = normalizeProgramNumber(number);
  if (!n.startsWith(prefix)) return null;
  const rest = n.slice(prefix.length);
  return /^[1-9]\d{0,8}$/.test(rest) ? parseInt(rest, 10) : null;
}

/** Hinweise und Fehler zur Länge (S7) */
function checkLength(number, kind) {
  const len = String(number).length;
  if (len > MAX_LENGTH) {
    return { error: `Programmnummer ist ${len} Zeichen lang, höchstens ${MAX_LENGTH} möglich – bitte von Hand kürzen`, hints: [] };
  }
  const hints = [];
  if (kind !== 'cmm' && len > DISPLAY_LENGTH) {
    hints.push(`Länger als ${DISPLAY_LENGTH} Zeichen – an der Steuerung wird der Name nicht vollständig angezeigt`);
  }
  return { error: null, hints };
}

/**
 * Variante (S5): kleinste Nummer, die es in der Variantengruppe gibt, im eigenen Arbeitsgang aber noch nicht.
 * Nummern im Schema nach `n` sortiert, andere danach alphabetisch.
 */
function pickVariantNumber(groupNumbers, ownNumbers, partNumber, kind) {
  const own = new Set(ownNumbers.map(normalizeProgramNumber));
  const seen = new Set();
  const missing = [];
  for (const nr of groupNumbers) {
    const key = normalizeProgramNumber(nr);
    if (!key || own.has(key) || seen.has(key)) continue;
    seen.add(key);
    missing.push(nr);
  }
  missing.sort((a, b) => {
    const sa = parseSchemaSeq(a, partNumber, kind);
    const sb = parseSchemaSeq(b, partNumber, kind);
    if (sa !== null && sb !== null) return sa - sb;
    if (sa !== null) return -1;
    if (sb !== null) return 1;
    return normalizeProgramNumber(a).localeCompare(normalizeProgramNumber(b));
  });
  return missing[0] ?? null;
}

// ---------------------------------------------------------------------------
// DB (db: Pool oder Client)

async function loadOperation(db, operationId) {
  const { rows } = await db.query(
    `SELECT o.id, o.part_id, o.op_number, o.variant_group_id, pt.part_number
       FROM operations o JOIN parts pt ON pt.id = o.part_id
      WHERE o.id = $1`, [operationId]);
  if (rows.length === 0) throw new ProgramNumberError(404, 'Arbeitsgang nicht gefunden');
  return rows[0];
}

async function variantNumber(db, op, kind) {
  if (!op.variant_group_id) return null;
  const { rows } = await db.query(
    `SELECT pr.program_number, pr.operation_id = $2 AS own
       FROM programs pr JOIN operations o ON o.id = pr.operation_id
      WHERE o.variant_group_id = $1 AND pr.kind = $3`,
    [op.variant_group_id, op.id, kind]);
  return pickVariantNumber(
    rows.filter(r => !r.own).map(r => r.program_number),
    rows.filter(r => r.own).map(r => r.program_number),
    op.part_number, kind);
}

async function currentSeq(db, partId, kind) {
  const { rows } = await db.query(
    'SELECT last_seq FROM part_program_counters WHERE part_id = $1 AND kind = $2', [partId, kind]);
  return rows[0]?.last_seq ?? 0;
}

/**
 * Konflikt für eine Nummer (S4) oder null.
 * @param {object} op  Ziel-Arbeitsgang aus loadOperation
 * @param {number|null} programId  eigenes Programm (beim Ändern), zählt nicht als Konflikt
 */
async function findNumberConflict(db, number, op, kind, programId = null) {
  const { rows } = await db.query(
    `SELECT pr.id, pr.program_number, pr.kind, pr.operation_id, o.op_number, o.variant_group_id, pt.part_number
       FROM programs pr
       JOIN operations o ON o.id = pr.operation_id
       JOIN parts pt ON pt.id = o.part_id
      WHERE upper(trim(pr.program_number)) = $1 AND ($2::int IS NULL OR pr.id <> $2)
      ORDER BY pr.id`,
    [normalizeProgramNumber(number), programId]);
  return rows.find(r => !(
    op.variant_group_id
    && r.variant_group_id === op.variant_group_id
    && r.operation_id !== op.id
    && r.kind === kind
  )) ?? null;
}

const conflictMessage = (number, c) =>
  `${String(number).trim()} ist schon vergeben (${[c.part_number, c.op_number].filter(Boolean).join(' ')})`;

/** Vorschlag fürs Formular, verbraucht keinen Zähler */
async function suggestProgramNumber(db, operationId, kind) {
  const op = await loadOperation(db, operationId);
  let number = await variantNumber(db, op, kind);
  if (!number) {
    let seq = await currentSeq(db, op.part_id, kind);
    do {
      seq++;
      number = formatProgramNumber(op.part_number, kind, seq);
    } while (await findNumberConflict(db, number, op, kind));
  }
  const { error, hints } = checkLength(number, kind);
  return { program_number: number, hints, error };
}

/**
 * Nummer endgültig vergeben bzw. prüfen – nur innerhalb einer Transaktion (client nach BEGIN).
 * Sperrt die Zählerzeile des Bauteils: gleichzeitige Anlagen am selben Bauteil laufen nacheinander.
 *
 * @param {object} opts
 * @param {number} opts.operationId
 * @param {'nc'|'cmm'} opts.kind
 * @param {string} [opts.requested]  von Hand eingegebene Nummer; leer → automatisch
 * @param {number} [opts.programId]  beim Ändern eines bestehenden Programms
 * @returns {Promise<string>} vergebene Nummer
 * @throws {ProgramNumberError} 400 (zu lang), 404 (Arbeitsgang), 409 (vergeben)
 */
async function assignProgramNumber(client, { operationId, kind, requested, programId = null }) {
  const op = await loadOperation(client, operationId);
  await client.query(
    `INSERT INTO part_program_counters (part_id, kind) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [op.part_id, kind]);
  const lastSeq = (await client.query(
    'SELECT last_seq FROM part_program_counters WHERE part_id = $1 AND kind = $2 FOR UPDATE',
    [op.part_id, kind])).rows[0].last_seq;

  const setSeq = (seq) => client.query(
    'UPDATE part_program_counters SET last_seq = $3 WHERE part_id = $1 AND kind = $2',
    [op.part_id, kind, seq]);

  const manual = requested !== undefined && requested !== null && String(requested).trim() !== '';
  if (manual) {
    const number = String(requested).trim();
    const { error } = checkLength(number, kind);
    if (error) throw new ProgramNumberError(400, error);
    const conflict = await findNumberConflict(client, number, op, kind, programId);
    if (conflict) throw new ProgramNumberError(409, conflictMessage(number, conflict));
    const seq = parseSchemaSeq(number, op.part_number, kind);
    if (seq !== null && seq > lastSeq) await setSeq(seq);   // S6
    return number;
  }

  const fromVariant = await variantNumber(client, op, kind);
  if (fromVariant) return fromVariant;

  let seq = lastSeq;
  let number;
  do {
    seq++;
    number = formatProgramNumber(op.part_number, kind, seq);
  } while (await findNumberConflict(client, number, op, kind, programId));
  const { error } = checkLength(number, kind);
  if (error) throw new ProgramNumberError(400, `Bauteilnummer zu lang für eine Programmnummer nach Schema (${number.length} Zeichen) – Programmnummer bitte von Hand vergeben`);
  await setSeq(seq);
  return number;
}

module.exports = {
  MAX_LENGTH,
  DISPLAY_LENGTH,
  ProgramNumberError,
  normalizeProgramNumber,
  formatProgramNumber,
  parseSchemaSeq,
  checkLength,
  pickVariantNumber,
  suggestProgramNumber,
  assignProgramNumber,
};
