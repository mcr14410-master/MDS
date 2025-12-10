// frontend/src/components/DocumentImage.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';

/**
 * DocumentImage - Zeigt ein Dokument-Bild an
 * Lädt das Bild mit Auth-Header und zeigt es als Blob-URL an
 * 
 * @param {string} endpoint - API Endpoint z.B. '/api/consumable-documents'
 * @param {number} documentId - ID des Dokuments
 * @param {string} alt - Alt-Text
 * @param {string} className - CSS Klassen
 */
export default function DocumentImage({ endpoint, documentId, alt, className }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!documentId || !endpoint) {
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await axios.get(
          `${endpoint}/${documentId}/download`,
          { responseType: 'blob' }
        );
        
        const url = URL.createObjectURL(response.data);
        setImageUrl(url);
      } catch (err) {
        console.error('Error loading document image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [documentId, endpoint]);

  if (loading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-700 animate-pulse aspect-video flex items-center justify-center ${className || ''}`}>
        <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-700 aspect-video flex items-center justify-center ${className || ''}`}>
        <div className="text-center text-gray-400 dark:text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">Bild nicht verfügbar</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Dokumentbild'}
      className={`w-full h-auto object-cover ${className || ''}`}
    />
  );
}
