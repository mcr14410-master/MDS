// frontend/src/components/common/DocumentThumbnail.jsx
// Kleines Vorschaubild für Bild-Dokumente in Listen (Klick öffnet die Vorschau); andere Dateien zeigen `fallback`.
import AuthImage from './AuthImage';
import { previewKind } from '../../utils/documentPreview';

export default function DocumentThumbnail({ apiPath, fileName, mimeType, onOpen, fallback, sizeClass = 'w-10 h-10' }) {
  if (previewKind(fileName, mimeType) !== 'image') return fallback;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${sizeClass} rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700`}
      title="Ansehen"
    >
      <AuthImage apiPath={apiPath} alt={fileName} className="w-full h-full object-cover" />
    </button>
  );
}
