/**
 * Gestreamte PDF-Antworten (pdfkit → res)
 *
 * Nach doc.pipe(res) sind die Header bereits gesendet. Tritt danach ein Fehler auf,
 * darf der catch-Block keine JSON-Antwort mehr schicken: res.json() beendet die Antwort,
 * pdfkit schreibt weiter hinein (ERR_STREAM_WRITE_AFTER_END) und der Node-Prozess stürzt ab.
 *
 * Verwendung:
 *   pipePdf(doc, res);                     // statt doc.pipe(res)
 *   ...
 *   } catch (error) {
 *     console.error(...);
 *     if (abortPdfResponse(res)) return;   // PDF lief schon → Verbindung abbrechen
 *     res.status(500).json(...);
 *   }
 */

function pipePdf(doc, res) {
  res.locals.pdfDoc = doc;
  doc.pipe(res);
}

/**
 * Bricht eine bereits begonnene PDF-Antwort ab.
 * @returns {boolean} true, wenn die Antwort schon lief (dann keine JSON-Antwort mehr senden)
 */
function abortPdfResponse(res) {
  if (!res.headersSent) return false;

  const doc = res.locals.pdfDoc;
  if (doc) doc.unpipe(res);
  // Browser meldet „Download fehlgeschlagen“ statt einer abgeschnittenen PDF
  res.destroy();
  return true;
}

module.exports = { pipePdf, abortPdfResponse };
