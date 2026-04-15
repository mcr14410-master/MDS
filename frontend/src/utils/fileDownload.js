// frontend/src/utils/fileDownload.js
import axios from './axios';

/**
 * Lädt eine Datei über einen authentifizierten API-Endpoint herunter
 * und triggert clientseitig den Browser-Download.
 *
 * Ersetzt das Pattern <a href="${API_BASE_URL}/api/.../download"> bzw.
 * window.open(...), das ohne Authorization-Header zu 401 führt.
 *
 * @param {string} apiPath  – Pfad relativ zur baseURL, z.B. "/api/tool-documents/123/download"
 * @param {string} fileName – Vorgeschlagener Dateiname für den Browser-Download
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function downloadFileViaApi(apiPath, fileName) {
  try {
    const response = await axios.get(apiPath, { responseType: 'blob' });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName || 'download');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    console.error('downloadFileViaApi error:', apiPath, error);
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Fehler beim Herunterladen der Datei';
    return { success: false, error: errorMessage };
  }
}
