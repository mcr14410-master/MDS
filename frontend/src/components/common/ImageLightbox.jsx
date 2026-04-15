// frontend/src/components/common/ImageLightbox.jsx
import { useEffect } from 'react';
import AuthImage from './AuthImage';

/**
 * ImageLightbox – Modal-Overlay zur vergrößerten Anzeige eines Bildes.
 *
 * Lädt das Bild über AuthImage (authentifizierter API-Endpoint),
 * zeigt es zentriert auf dunklem Hintergrund mit optionalen Metadaten.
 *
 * Bedienung:
 * - Klick auf Backdrop → schließen
 * - Klick auf Schließen-Button → schließen
 * - ESC-Taste → schließen
 *
 * @param {boolean} isOpen        – Ob das Lightbox aktuell sichtbar ist
 * @param {Function} onClose      – Callback beim Schließen
 * @param {string} apiPath        – Pfad zum view-Endpoint (z.B. "/api/setup-sheets/1/photos/2/view")
 * @param {string} [alt]          – Alt-Text fürs Bild
 * @param {string} [caption]      – Optionaler Untertitel
 * @param {React.ReactNode} [metadata] – Optionale Zusatzinfos (z.B. Uploader, Datum) unter dem Bild
 */
export default function ImageLightbox({
  isOpen,
  onClose,
  apiPath,
  alt,
  caption,
  metadata,
}) {
  // ESC-Taste zum Schließen
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
        aria-label="Schließen"
      >
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div
        className="max-w-7xl max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <AuthImage
          apiPath={apiPath}
          alt={alt || ''}
          className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
          placeholderClassName="w-96 h-96"
        />

        {(caption || metadata) && (
          <div className="mt-4 bg-black/70 text-white p-4 rounded-lg">
            {caption && <p className="text-lg">{caption}</p>}
            {metadata && (
              <div className="flex items-center justify-between mt-2 text-sm text-gray-300">
                {metadata}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
