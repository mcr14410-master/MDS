/**
 * Altbestand-Import: Vorschläge aus dem Ordnernamen für Kunden-Teilenummer, Revision und Bezeichnung
 *
 * Die Ordner folgen nicht immer demselben Schema (z. B. Kürzel am Ende, Revision direkt an der Nummer).
 * Statt jedes Schema zu erraten, bietet die Zeile die Teile des Namens zur Auswahl an; Freitext bleibt möglich.
 *
 * Reines Modul ohne React/axios (wird auch von Node-Tests geladen).
 */

const hasDigit = (v) => /\d/.test(v);
// Buchstabe(n) direkt an einer Nummer: „XXXX-0001a“ → „XXXX-0001“ + „a“
const TRAILING_REVISION = /^(.*\d)([A-Za-z]{1,2})$/;

function collector() {
  const list = [];
  const add = (value, hint) => {
    const v = String(value ?? '').trim();
    if (!v) return;
    const found = list.find(x => x.value === v);
    if (!found) list.push(hint ? { value: v, hint } : { value: v });
    else if (hint && !(found.hint || '').split(', ').includes(hint)) found.hint = found.hint ? `${found.hint}, ${hint}` : hint;
  };
  return { list, add };
}

/**
 * @param {{ programFolder: string, customerPartNumber: string, name: string, indexRevision: string|null, nameRevision: string|null }} parsed
 * @returns {{ customerPartNumber: {value, hint?}[], revision: {value, hint?}[], name: {value, hint?}[] }}
 */
export function fieldSuggestions(parsed) {
  // Kurze Teile (≤ 2 Zeichen) sind meist Kürzel oder Revision – als Nummer oder Bezeichnung nicht vorschlagen
  const tokens = parsed.programFolder.split('_').map(t => t.trim()).filter(Boolean);
  const long = tokens.filter(t => t.length > 2);

  const numbers = collector();
  long.filter(hasDigit).forEach((t) => {
    numbers.add(t);
    const m = t.match(TRAILING_REVISION);
    if (m) numbers.add(m[1]);
  });
  long.filter(t => !hasDigit(t)).forEach(t => numbers.add(t));

  const revisions = collector();
  revisions.add(parsed.indexRevision, 'Index-Ordner');
  revisions.add(parsed.nameRevision, 'im Ordnernamen');
  tokens.forEach((t) => {
    const m = t.match(TRAILING_REVISION);
    if (m) revisions.add(m[2], 'an der Nummer');
  });

  const names = collector();
  const words = [...new Set(long.filter(t => !hasDigit(t)))];
  words.forEach(t => names.add(t));
  if (words.length > 1) names.add(words.join(' '));

  return { customerPartNumber: numbers.list, revision: revisions.list, name: names.list };
}
