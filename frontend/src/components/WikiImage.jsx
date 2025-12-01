// frontend/src/components/WikiImage.jsx
import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

/**
 * WikiImage - Zeigt ein Wiki-Bild an
 * Lädt das Bild mit Auth-Header und zeigt es als Blob-URL an
 */
export default function WikiImage({ imageId, alt, className, onClick }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imageId) {
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);
        
        const response = await axios.get(
          `${API_ENDPOINTS.WIKI}/images/${imageId}/view`,
          { responseType: 'blob' }
        );
        
        const url = URL.createObjectURL(response.data);
        setImageUrl(url);
      } catch (err) {
        console.error('Error loading wiki image:', err);
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
  }, [imageId]);

  if (loading) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-700 animate-pulse flex items-center justify-center ${className || 'w-full h-48'}`}>
        <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${className || 'w-full h-48'}`}>
        <div className="text-center text-gray-400 dark:text-gray-500">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs">Bild nicht verfügbar</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt || 'Wiki Bild'}
      className={className || 'w-full h-auto'}
      onClick={onClick}
    />
  );
}
