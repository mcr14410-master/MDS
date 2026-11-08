// frontend/src/utils/filePrint.js
import axios from './axios';

const FRAME_ID = 'mds-print-frame';
let lastUrl = null;

/**
 * PDF über einen authentifizierten API-Endpoint laden und den Druckdialog des Browsers öffnen.
 * Lädt per axios (Token) als Blob in ein unsichtbares iframe und ruft dort print() auf.
 * Das iframe bleibt bis zum nächsten Druck stehen, damit der Druckdialog nicht abbricht.
 * Klappt print() nicht (z. B. Browser ohne PDF-Anzeige), öffnet sich das PDF in einem neuen Tab.
 *
 * @param {string} apiPath – Pfad relativ zur baseURL, z. B. "/api/parts/1/documents/2/view"
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function printFileViaApi(apiPath) {
  try {
    const response = await axios.get(apiPath, { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));

    document.getElementById(FRAME_ID)?.remove();
    if (lastUrl) URL.revokeObjectURL(lastUrl);
    lastUrl = url;

    const iframe = document.createElement('iframe');
    iframe.id = FRAME_ID;
    iframe.title = 'Druck';
    // Nicht display:none – sonst druckt der Browser nichts
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          window.open(url, '_blank', 'noopener');
        }
      }, 300);
    };
    iframe.src = url;
    document.body.appendChild(iframe);
    return { success: true };
  } catch (error) {
    console.error('printFileViaApi error:', apiPath, error);
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Fehler beim Laden der Datei zum Drucken';
    return { success: false, error: errorMessage };
  }
}
