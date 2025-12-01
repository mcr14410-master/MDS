// frontend/src/components/MachineDocumentsTab.jsx
import { useState, useRef } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import API_BASE_URL from '../config/api';

const DOCUMENT_TYPES = {
  manual: 'Handbuch',
  schematic: 'Schaltplan',
  maintenance_manual: 'Wartungsanleitung',
  certificate: 'Zertifikat',
  photo: 'Foto',
  other: 'Sonstiges'
};

const DOCUMENT_TYPE_ICONS = {
  manual: '📖',
  schematic: '📐',
  maintenance_manual: '🔧',
  certificate: '📜',
  photo: '📷',
  other: '📎'
};

export default function MachineDocumentsTab({ machineId }) {
  const { documents, uploadDocument, deleteDocument, setPrimaryDocument, fetchMachineDocuments } = useMachinesStore();
  const { hasPermission } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({ document_type: 'manual', description: '' });
  const fileInputRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    
    if (!file) {
      toast.error('Bitte eine Datei auswählen');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', uploadData.document_type);
    if (uploadData.description) {
      formData.append('description', uploadData.description);
    }

    setUploading(true);
    try {
      await uploadDocument(machineId, formData);
      toast.success('Dokument hochgeladen');
      setShowUploadForm(false);
      setUploadData({ document_type: 'manual', description: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Dokument "${doc.file_name}" wirklich löschen?`)) return;
    
    try {
      await deleteDocument(doc.id);
      toast.success('Dokument gelöscht');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetPrimary = async (doc) => {
    try {
      await setPrimaryDocument(doc.id);
      toast.success(`"${doc.file_name}" als Hauptdokument gesetzt`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getDownloadUrl = (doc) => {
    return `${API_BASE_URL}/api/machine-documents/${doc.id}/download`;
  };

  // Group documents by type
  const groupedDocs = documents.reduce((acc, doc) => {
    const type = doc.document_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Upload Button / Form */}
      {hasPermission('machine.update') && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {!showUploadForm ? (
            <button
              onClick={() => setShowUploadForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Dokument hochladen
            </button>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Neues Dokument</h3>
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dokumenttyp *
                  </label>
                  <select
                    value={uploadData.document_type}
                    onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {Object.entries(DOCUMENT_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Datei *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 dark:file:bg-blue-900/30 file:text-blue-700 dark:file:text-blue-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={uploadData.description}
                  onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionale Beschreibung..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {uploading && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  Hochladen
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Dokumente</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Für diese Maschine wurden noch keine Dokumente hochgeladen.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(DOCUMENT_TYPES).map(([type, label]) => {
            const docs = groupedDocs[type];
            if (!docs || docs.length === 0) return null;

            return (
              <div key={type} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>{DOCUMENT_TYPE_ICONS[type]}</span>
                    {label}
                    <span className="text-sm font-normal text-gray-500">({docs.length})</span>
                  </h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {docs.map(doc => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="flex items-center gap-4 min-w-0">
                        {doc.is_primary && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs font-medium rounded">
                            ★ Haupt
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{doc.file_name}</p>
                          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.uploaded_by_username && (
                              <>
                                <span>•</span>
                                <span>{doc.uploaded_by_username}</span>
                              </>
                            )}
                            <span>•</span>
                            <span>{new Date(doc.uploaded_at).toLocaleDateString('de-DE')}</span>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Download */}
                        <a
                          href={getDownloadUrl(doc)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Herunterladen"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </a>

                        {hasPermission('machine.update') && (
                          <>
                            {/* Set Primary */}
                            {!doc.is_primary && (
                              <button
                                onClick={() => handleSetPrimary(doc)}
                                className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                                title="Als Hauptdokument setzen"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Löschen"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
