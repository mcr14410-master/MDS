import { useState, useEffect, useRef } from 'react';
import axios from '../../utils/axios';
import { toast } from '../Toaster';

const documentTypes = [
  { value: 'drawing', label: 'Zeichnung', icon: '📐' },
  { value: 'photo', label: 'Foto', icon: '📷' },
  { value: 'manual', label: 'Anleitung', icon: '📖' },
  { value: 'datasheet', label: 'Datenblatt', icon: '📋' },
  { value: 'other', label: 'Sonstiges', icon: '📄' },
];

export default function ClampingDeviceDocumentsSection({ device, onUpdate }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    document_type: 'other',
    description: '',
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (device?.id) {
      loadDocuments();
    }
  }, [device?.id]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/clamping-devices/${device.id}/documents`);
      setDocuments(response.data.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    const file = fileInputRef.current?.files?.[0];
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
      await axios.post(`/api/clamping-devices/${device.id}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Dokument hochgeladen');
      setShowUploadForm(false);
      setUploadData({ document_type: 'other', description: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Fehler beim Hochladen');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await axios.get(`/api/clamping-devices/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Fehler beim Download');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Dokument wirklich löschen?')) return;

    try {
      await axios.delete(`/api/clamping-devices/documents/${docId}`);
      toast.success('Dokument gelöscht');
      loadDocuments();
      onUpdate?.();
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTypeInfo = (type) => {
    return documentTypes.find(t => t.value === type) || { label: type, icon: '📄' };
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dokumente
        </h2>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Hochladen
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datei *
              </label>
              <input
                type="file"
                ref={fileInputRef}
                required
                className="w-full text-sm text-gray-500 dark:text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  dark:file:bg-blue-900/30 dark:file:text-blue-400
                  hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Dokumenttyp
              </label>
              <select
                value={uploadData.document_type}
                onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {documentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <input
              type="text"
              value={uploadData.description}
              onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
              placeholder="Optional: Kurze Beschreibung"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowUploadForm(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Lädt...
                </>
              ) : (
                'Hochladen'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Keine Dokumente vorhanden</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => {
            const typeInfo = getTypeInfo(doc.document_type);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{typeInfo.icon}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {doc.file_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{typeInfo.label}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      {doc.description && (
                        <>
                          <span>•</span>
                          <span className="truncate">{doc.description}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                    title="Herunterladen"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                    title="Löschen"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
