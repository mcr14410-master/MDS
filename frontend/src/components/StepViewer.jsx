/**
 * StepViewer - 3D-Vorschau für CAD-Dateien (STEP, STL, OBJ, etc.)
 * 
 * Nutzt online-3d-viewer für Browser-basiertes Rendering
 * npm install online-3d-viewer
 */

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';

export default function StepViewer({ fileUrl, fileName, className = '' }) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    let isMounted = true;
    let blobUrl = null;

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Datei mit Auth-Token fetchen
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Laden: ${response.status}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        // 2. online-3d-viewer laden
        const OV = await import('online-3d-viewer');

        // Lokale WASM-Bibliothek verwenden (statt CDN)
        if (typeof OV.SetExternalLibLocation === 'function') {
          OV.SetExternalLibLocation('/libs/');
        }

        // Container leeren
        containerRef.current.innerHTML = '';

        // 3. Viewer initialisieren
        const viewer = new OV.EmbeddedViewer(containerRef.current, {
          backgroundColor: new OV.RGBAColor(0, 0, 0, 0), // Transparent
          defaultColor: new OV.RGBColor(150, 170, 190),  // Leicht bläuliches Silber
          edgeSettings: new OV.EdgeSettings(true, new OV.RGBColor(30, 30, 30), 1),
        });

        viewerRef.current = viewer;

        // 4. File-Objekt mit korrektem Namen erstellen (für Format-Erkennung)
        const file = new File([blob], fileName, { type: blob.type });
        viewer.LoadModelFromFileList([file]);

        setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 3000);

      } catch (err) {
        console.error('Viewer init error:', err);
        if (isMounted) {
          setError(err.message || 'Fehler beim Initialisieren des 3D-Viewers');
          setLoading(false);
        }
      }
    };

    initViewer();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (viewerRef.current) {
        viewerRef.current = null;
      }
    };
  }, [fileUrl, fileName, token]);

  // Fallback wenn keine URL
  if (!fileUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Kein 3D-Modell</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mini-Vorschau */}
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        {/* Viewer Container */}
        <div 
          ref={containerRef}
          className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden"
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lade 3D-Modell...</p>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="text-center p-4">
              <svg className="w-8 h-8 mx-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-red-500">{error}</p>
            </div>
          </div>
        )}

        {/* Expand Hint */}
        {!loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isModalOpen && (
        <StepViewerModal
          fileUrl={fileUrl}
          fileName={fileName}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

// Fullscreen Modal Komponente
function StepViewerModal({ fileUrl, fileName, onClose }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    let isMounted = true;
    let blobUrl = null;

    const initViewer = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. Datei mit Auth-Token fetchen
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Laden: ${response.status}`);
        }

        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);

        if (!isMounted) {
          URL.revokeObjectURL(blobUrl);
          return;
        }

        const OV = await import('online-3d-viewer');

        // Lokale WASM-Bibliothek verwenden (statt CDN)
        if (typeof OV.SetExternalLibLocation === 'function') {
          OV.SetExternalLibLocation('/libs/');
        }

        containerRef.current.innerHTML = '';

        const viewer = new OV.EmbeddedViewer(containerRef.current, {
          backgroundColor: new OV.RGBAColor(30, 30, 30, 255),
          defaultColor: new OV.RGBColor(200, 200, 200),
          edgeSettings: new OV.EdgeSettings(true, new OV.RGBColor(100, 100, 100), 1),
        });

        // File-Objekt mit korrektem Namen erstellen (für Format-Erkennung)
        const file = new File([blob], fileName, { type: blob.type });
        viewer.LoadModelFromFileList([file]);

        setTimeout(() => {
          if (isMounted) {
            setLoading(false);
          }
        }, 3000);

      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    initViewer();

    // ESC zum Schließen
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fileUrl, fileName, onClose, token]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* File Name */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-white/10 rounded-lg">
        <span className="text-white text-sm">{fileName}</span>
      </div>

      {/* Controls Hint */}
      <div className="absolute bottom-4 left-4 z-10 px-3 py-2 bg-white/10 rounded-lg">
        <div className="text-white text-xs space-y-1">
          <p>🖱️ Links: Drehen</p>
          <p>🖱️ Rechts: Verschieben</p>
          <p>🖱️ Scroll: Zoomen</p>
          <p>⌨️ ESC: Schließen</p>
        </div>
      </div>

      {/* Viewer Container */}
      <div 
        ref={containerRef}
        className="w-[90vw] h-[85vh] rounded-lg overflow-hidden"
      />

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white">Lade 3D-Modell...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-4">
            <svg className="w-12 h-12 mx-auto text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-red-400">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
