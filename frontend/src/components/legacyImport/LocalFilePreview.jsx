// Altbestand-Import: Vorschau einer Datei, die noch nicht hochgeladen ist (liegt nur im Browser)
// Bild direkt, PDF im PdfViewer, 3D-Modell im StepViewer – beide laden über eine Blob-Adresse.
import { useEffect, useState } from 'react';
import PdfViewer from '../common/PdfViewer';
import StepViewer from '../common/StepViewer';
import { previewKind } from '../../utils/documentPreview';

export default function LocalFilePreview({ file, name, onClose }) {
  const kind = previewKind(name);
  // Adresse im Effekt anlegen und wieder freigeben (StrictMode führt Effekte doppelt aus)
  const [url, setUrl] = useState(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!kind) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Vorschau ${name}`}
      data-testid="legacy-file-preview"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{name}</h3>
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            Schließen
          </button>
        </div>
        <div className="p-4 overflow-auto">
          {!url && <p className="text-sm text-gray-500 dark:text-gray-400">Lade …</p>}
          {url && kind === 'image' && <img src={url} alt={name} className="max-h-[75vh] mx-auto object-contain" />}
          {url && kind === 'pdf' && <PdfViewer fileUrl={url} fileName={name} className="h-[75vh]" />}
          {url && kind === 'model' && <StepViewer fileUrl={url} fileName={name} className="h-[75vh]" />}
        </div>
      </div>
    </div>
  );
}
