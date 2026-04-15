// frontend/src/components/common/AuthImage.jsx
import { useState, useEffect } from 'react';
import axios from '../../utils/axios';

/**
 * AuthImage – Lädt ein Bild über einen authentifizierten API-Endpoint
 * und zeigt es als Blob-URL an.
 *
 * Wird projektweit für alle Bild-Anzeigen verwendet, deren Quelle hinter
 * einem authenticateToken-geschützten Endpoint liegt.
 *
 * @param {string} apiPath           – Pfad relativ zur baseURL, z.B. "/api/machine-documents/123/view"
 * @param {string} [alt]             – Alt-Text für das <img>-Element
 * @param {string} [className]       – CSS-Klassen für das <img>-Element
 * @param {string} [placeholderClassName] – CSS-Klassen für Loading/Error-Container
 * @param {React.ReactNode} [fallback]    – Eigene Komponente für Error-State (überschreibt Default)
 * @param {Function} [onLoad]        – Callback nach erfolgreichem Laden
 * @param {Function} [onError]       – Callback bei Fehler
 */
export default function AuthImage({
  apiPath,
  alt,
  className,
  placeholderClassName,
  fallback,
  onLoad,
  onError,
}) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!apiPath) {
      setLoading(false);
      return;
    }

    let blobUrl = null;
    let cancelled = false;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await axios.get(apiPath, { responseType: 'blob' });
        if (cancelled) return;
        blobUrl = URL.createObjectURL(response.data);
        setImageUrl(blobUrl);
        if (onLoad) onLoad();
      } catch (err) {
        if (cancelled) return;
        console.error('AuthImage load error:', apiPath, err);
        setError(true);
        if (onError) onError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [apiPath]);

  // Loading-State
  if (loading) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center ${placeholderClassName || 'aspect-video'}`}
      >
        <svg
          className="w-8 h-8 text-gray-300 dark:text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Error-State
  if (error || !imageUrl) {
    if (fallback !== undefined) return fallback;
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${placeholderClassName || 'aspect-video'}`}
      >
        <div className="text-center text-gray-400 dark:text-gray-500">
          <svg
            className="w-8 h-8 mx-auto mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs">Bild nicht verfügbar</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || ''}
      className={className}
    />
  );
}
