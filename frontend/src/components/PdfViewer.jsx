/**
 * PdfViewer - PDF-Vorschau und Viewer
 * 
 * Nutzt react-pdf für Browser-basiertes Rendering
 * npm install react-pdf
 */

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuthStore } from '../stores/authStore';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js Worker konfigurieren
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function PdfViewer({ fileUrl, fileName, className = '' }) {
  const [pdfData, setPdfData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!fileUrl) return;

    let isMounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // PDF mit Auth-Token fetchen
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Fehler beim Laden: ${response.status}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();

        if (isMounted) {
          // Uint8Array verwenden - stabiler als ArrayBuffer
          setPdfData({ data: new Uint8Array(arrayBuffer) });
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF load error:', err);
        if (isMounted) {
          setError(err.message || 'Fehler beim Laden des PDFs');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [fileUrl, token]);

  // Fallback wenn keine URL
  if (!fileUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg ${className}`}>
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Kein PDF</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mini-Vorschau */}
      <div 
        className={`relative cursor-pointer group ${className}`}
        onClick={() => !loading && !error && setIsModalOpen(true)}
      >
        {/* PDF Thumbnail Container */}
        <div className="w-full h-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
          {pdfData && !loading && !error && (
            <Document
              file={pdfData}
              loading={null}
              error={null}
              className="flex items-center justify-center"
            >
              <Page 
                pageNumber={1} 
                width={180}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Lade PDF...</p>
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
        <PdfViewerModal
          fileUrl={fileUrl}
          fileName={fileName}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}

// Fullscreen Modal Komponente
function PdfViewerModal({ fileUrl, fileName, onClose }) {
  const [pdfData, setPdfData] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  // PDF laden
  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      try {
        const response = await fetch(fileUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Fehler beim Laden');
        
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        if (isMounted) {
          setPdfData({ data: new Uint8Array(arrayBuffer) });
          setLoading(false);
        }
      } catch (err) {
        console.error('PDF load error:', err);
        if (isMounted) setLoading(false);
      }
    };

    loadPdf();
    return () => { isMounted = false; };
  }, [fileUrl, token]);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setPageNumber(prev => Math.min(prev + 1, numPages || 1));
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setPageNumber(prev => Math.max(prev - 1, 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, numPages]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        {/* File Name */}
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13h2v5h-2v-5zm3.5 0h2v5h-2v-5z"/>
          </svg>
          <span className="text-white text-sm font-medium">{fileName}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
            <button
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
              className="p-1 text-white hover:bg-white/20 rounded transition-colors"
              title="Verkleinern"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-white text-sm min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(s => Math.min(s + 0.25, 3))}
              className="p-1 text-white hover:bg-white/20 rounded transition-colors"
              title="Vergrößern"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Page Navigation */}
          {numPages && (
            <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
              <button
                onClick={() => setPageNumber(p => Math.max(p - 1, 1))}
                disabled={pageNumber <= 1}
                className="p-1 text-white hover:bg-white/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Vorherige Seite"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-white text-sm min-w-[4rem] text-center">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={() => setPageNumber(p => Math.min(p + 1, numPages))}
                disabled={pageNumber >= numPages}
                className="p-1 text-white hover:bg-white/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Nächste Seite"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-full transition-colors"
            title="Schließen (ESC)"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-auto flex items-start justify-center p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-white">Lade PDF...</p>
            </div>
          </div>
        ) : pdfData ? (
          <Document
            file={pdfData}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={null}
            error={
              <div className="text-center text-red-400">
                <p>Fehler beim Laden des PDFs</p>
              </div>
            }
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="shadow-2xl"
            />
          </Document>
        ) : (
          <div className="text-center text-red-400">
            <p>PDF konnte nicht geladen werden</p>
          </div>
        )}
      </div>

      {/* Footer Hints */}
      <div className="px-4 py-2 bg-black/50">
        <div className="text-white/60 text-xs flex items-center justify-center gap-4">
          <span>⌨️ ←/→ Blättern</span>
          <span>ESC Schließen</span>
        </div>
      </div>
    </div>
  );
}
