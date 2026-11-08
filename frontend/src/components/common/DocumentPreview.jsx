// frontend/src/components/common/DocumentPreview.jsx
// Vorschau eines Dokuments je nach Art: Bild in der Lightbox, PDF im PDF-Viewer, 3D-Modell im StepViewer.
// Lädt über den /view-Endpunkt mit Token (MDS-Datei-Standard). Andere Dateitypen: nur Download.
import { useEffect } from 'react';
import ImageLightbox from './ImageLightbox';
import PdfViewer from './PdfViewer';
import StepViewer from './StepViewer';
import API_BASE_URL from '../../config/api';
import { previewKind } from '../../utils/documentPreview';

/**
 * @param {string}   apiPath   – Pfad zum view-Endpoint, z. B. "/api/parts/1/documents/2/view"
 * @param {string}   fileName  – Dateiname (bestimmt die Art der Vorschau)
 * @param {string}   [mimeType]
 * @param {Function} onClose
 */
export default function DocumentPreview({ apiPath, fileName, mimeType, onClose }) {
  const kind = previewKind(fileName, mimeType);

  useEffect(() => {
    if (kind === 'image') return undefined; // ImageLightbox hat eigenes ESC
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [kind, onClose]);

  if (!kind) return null;
  if (kind === 'image') {
    return <ImageLightbox isOpen onClose={onClose} apiPath={apiPath} alt={fileName} caption={fileName} />;
  }

  const fileUrl = `${API_BASE_URL}${apiPath}`;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Vorschau ${fileName}`}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{fileName}</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Schließen
          </button>
        </div>
        <div className="p-4 overflow-auto">
          {kind === 'pdf' && <PdfViewer fileUrl={fileUrl} fileName={fileName} className="h-[75vh]" />}
          {kind === 'model' && <StepViewer fileUrl={fileUrl} fileName={fileName} className="h-[75vh]" />}
        </div>
      </div>
    </div>
  );
}
