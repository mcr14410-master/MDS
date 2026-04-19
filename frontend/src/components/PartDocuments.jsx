/**
 * PartDocuments - Dokumente für ein Bauteil verwalten
 * 
 * Upload, Anzeige und Löschung von:
 * - CAD-Modellen (.step, .stp, .stl, etc.)
 * - Zeichnungen (.pdf, .png, .jpg, etc.)
 * - Sonstigen Dokumenten
 */

import { useState, useEffect, useRef } from 'react';
import axios from '../utils/axios';
import { toast } from './Toaster';
import { downloadFileViaApi } from '../utils/fileDownload';

// Dokument-Typ Labels und Icons (Reihenfolge = Anzeige-Reihenfolge)
// iconBg muss statisch sein, sonst purged Tailwind die Klasse
const DOCUMENT_TYPES = {
  drawing:              { label: 'Zeichnungen',         icon: '📐', iconBg: 'bg-green-100 dark:bg-green-900/30' },
  cad_model:            { label: 'CAD-Modelle',         icon: '🗂️', iconBg: 'bg-blue-100 dark:bg-blue-900/30' },
  photo:                { label: 'Fotos / 3D-Ansicht',  icon: '📷', iconBg: 'bg-purple-100 dark:bg-purple-900/30' },
  inspection_plan:      { label: 'Prüfpläne',           icon: '🔍', iconBg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  material_certificate: { label: 'Materialzertifikate', icon: '🏆', iconBg: 'bg-red-100 dark:bg-red-900/30' },
  specification:        { label: 'Spezifikationen',     icon: '📋', iconBg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  other:                { label: 'Sonstiges',           icon: '📎', iconBg: 'bg-gray-100 dark:bg-gray-700' }
};

// Auto-Detect-Mapping fuer Upload (Extension -> Typ)
const AUTO_DETECT_EXT = {
  cad_model: ['step', 'stp', 'stl', 'obj', 'iges', 'igs', '3ds', 'gltf', 'glb', 'x_t', 'x_b', 'sat'],
  drawing:   ['pdf', 'dxf', 'dwg', 'svg'],
  photo:     ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'],
};
const detectType = (filename) => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  for (const [type, exts] of Object.entries(AUTO_DETECT_EXT)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
};

export default function PartDocuments({ partId, onDocumentChange }) {
  const [documents, setDocuments] = useState({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedType, setSelectedType] = useState('auto');
  const fileInputRef = useRef(null);

  // Dokumente laden
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/parts/${partId}/documents`);
      if (response.data.success) {
        setDocuments(response.data.grouped);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Fehler beim Laden der Dokumente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partId) {
      fetchDocuments();
    }
  }, [partId]);

  // Datei hochladen
  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        // Typ bestimmen: manuell ausgewaehlt oder Auto-Detect
        const docType = selectedType === 'auto' ? detectType(file.name) : selectedType;
        formData.append('document_type', docType);

        // Erste CAD-Datei als primary setzen wenn noch keine existiert
        const cadDocs = documents.cad_model || [];
        if (docType === 'cad_model' && cadDocs.length === 0) {
          formData.append('is_primary_cad', 'true');
        }

        // Erste Zeichnung als primary setzen wenn noch keine existiert
        const drawingDocs = documents.drawing || [];
        if (docType === 'drawing' && drawingDocs.length === 0) {
          formData.append('is_primary_drawing', 'true');
        }

        await axios.post(`/api/parts/${partId}/documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        });

        setUploadProgress(((i + 1) / files.length) * 100);
      }

      toast.success(`${files.length} Datei(en) hochgeladen`);
      fetchDocuments();
      onDocumentChange?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Dokument löschen
  const handleDelete = async (documentId, filename) => {
    if (!window.confirm(`"${filename}" wirklich löschen?`)) return;

    try {
      await axios.delete(`/api/parts/${partId}/documents/${documentId}`);
      toast.success('Dokument gelöscht');
      fetchDocuments();
      onDocumentChange?.();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  // Als primäres CAD-Model setzen
  const handleSetPrimary = async (documentId) => {
    try {
      await axios.post(`/api/parts/${partId}/documents/${documentId}/set-primary`);
      toast.success('Primäres CAD-Model gesetzt');
      fetchDocuments();
      onDocumentChange?.();
    } catch (error) {
      toast.error('Fehler beim Setzen');
    }
  };

  // Als primäre Zeichnung setzen
  const handleSetPrimaryDrawing = async (documentId) => {
    try {
      await axios.post(`/api/parts/${partId}/documents/${documentId}/set-primary-drawing`);
      toast.success('Primäre Zeichnung gesetzt');
      fetchDocuments();
      onDocumentChange?.();
    } catch (error) {
      toast.error('Fehler beim Setzen');
    }
  };

  // Dokument herunterladen
  const handleDownload = async (documentId, filename) => {
    const result = await downloadFileViaApi(
      `/api/parts/${partId}/documents/${documentId}/download`,
      filename
    );
    if (!result.success) {
      toast.error(result.error);
    }
  };

  // Dateigröße formatieren
  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalDocuments = Object.values(documents).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Upload-Bereich */}
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Dokumenttyp für Upload"
            >
              <option value="auto">Automatisch erkennen</option>
              {Object.entries(DOCUMENT_TYPES).map(([type, config]) => (
                <option key={type} value={type}>
                  {config.icon} {config.label}
                </option>
              ))}
            </select>

            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium inline-block">
                Dateien auswählen
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleUpload}
                className="hidden"
                accept=".step,.stp,.stl,.obj,.iges,.igs,.3ds,.gltf,.glb,.x_t,.x_b,.sat,.pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.dxf,.dwg,.svg,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z"
              />
            </label>
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            CAD-Modelle, Zeichnungen, Fotos, Prüfpläne, Zertifikate, Spezifikationen · Max. 100 MB
          </p>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Hochladen...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dokumente nach Typ */}
      {totalDocuments === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>Noch keine Dokumente hochgeladen</p>
        </div>
      ) : (
        Object.entries(DOCUMENT_TYPES).map(([type, config]) => {
          const docs = documents[type] || [];
          if (docs.length === 0) return null;

          return (
            <div key={type} className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span>{config.icon}</span>
                {config.label}
                <span className="text-gray-400">({docs.length})</span>
              </h4>

              <div className="space-y-2">
                {docs.map((doc) => (
                  <div 
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.iconBg}`}>
                        <span className="text-lg">{config.icon}</span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.original_filename}
                          {doc.is_primary_cad && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                              3D-Vorschau
                            </span>
                          )}
                          {doc.is_primary_drawing && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                              Hauptzeichnung
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Set Primary CAD (nur für CAD-Modelle) */}
                      {type === 'cad_model' && !doc.is_primary_cad && (
                        <button
                          onClick={() => handleSetPrimary(doc.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Als 3D-Vorschau setzen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}

                      {/* Set Primary Drawing (nur für Zeichnungen) */}
                      {type === 'drawing' && !doc.is_primary_drawing && (
                        <button
                          onClick={() => handleSetPrimaryDrawing(doc.id)}
                          className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Als Hauptzeichnung setzen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                      )}

                      {/* Download */}
                      <button
                        onClick={() => handleDownload(doc.id, doc.original_filename)}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                        title="Herunterladen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(doc.id, doc.original_filename)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
