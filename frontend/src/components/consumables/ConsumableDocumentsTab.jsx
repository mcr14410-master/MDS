import { useState, useEffect } from 'react';
import { useConsumablesStore } from '../../stores/consumablesStore';
import {
  Upload,
  FileText,
  Image,
  AlertTriangle,
  File,
  Download,
  Trash2,
  Star,
  X,
  Eye
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { value: 'sds', label: 'Sicherheitsdatenblatt (SDB)', icon: AlertTriangle, color: 'orange' },
  { value: 'tds', label: 'Technisches Datenblatt (TDB)', icon: FileText, color: 'blue' },
  { value: 'image', label: 'Bild', icon: Image, color: 'green' },
  { value: 'other', label: 'Sonstiges', icon: File, color: 'gray' },
];

export default function ConsumableDocumentsTab({ consumableId }) {
  const {
    fetchDocuments,
    uploadDocument,
    deleteDocument,
    setPrimaryImage
  } = useConsumablesStore();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const [uploadForm, setUploadForm] = useState({
    document_type: 'other',
    title: '',
    file: null
  });

  useEffect(() => {
    loadDocuments();
  }, [consumableId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await fetchDocuments(consumableId);
      setDocuments(docs);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({
        ...prev,
        file,
        title: prev.title || file.name
      }));

      // Auto-detect document type
      if (file.type.startsWith('image/')) {
        setUploadForm(prev => ({ ...prev, document_type: 'image' }));
      } else if (file.type === 'application/pdf') {
        // Could be SDS or TDS - leave as selected or default
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('document_type', uploadForm.document_type);
      formData.append('title', uploadForm.title);

      await uploadDocument(consumableId, formData);
      setShowUpload(false);
      setUploadForm({ document_type: 'other', title: '', file: null });
      loadDocuments();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm('Dokument wirklich löschen?')) return;

    try {
      await deleteDocument(docId);
      loadDocuments();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSetPrimary = async (docId) => {
    try {
      await setPrimaryImage(docId);
      loadDocuments();
    } catch (err) {
      alert(err.message);
    }
  };

  const getDocTypeInfo = (type) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[3];
  };

  const getDocTypeColor = (type) => {
    const colors = {
      sds: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      tds: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      image: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[type] || colors.other;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE');
  };

  const getFileUrl = (filePath) => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${filePath}`;
  };

  // Group documents by type
  const groupedDocs = DOCUMENT_TYPES.map(type => ({
    ...type,
    documents: documents.filter(d => d.document_type === type.value)
  })).filter(g => g.documents.length > 0);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Dokumente ({documents.length})
        </h3>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Upload className="h-4 w-4" />
          Hochladen
        </button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Noch keine Dokumente</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Erstes Dokument hochladen
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedDocs.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.value}>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {group.label} ({group.documents.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                    >
                      {/* Preview for images */}
                      {doc.document_type === 'image' && doc.mime_type?.startsWith('image/') && (
                        <div
                          className="h-32 bg-gray-100 dark:bg-gray-900 cursor-pointer relative group"
                          onClick={() => setPreviewImage(doc)}
                        >
                          <img
                            src={getFileUrl(doc.file_path)}
                            alt={doc.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          {doc.is_primary && (
                            <span className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              Hauptbild
                            </span>
                          )}
                        </div>
                      )}

                      {/* Document info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 dark:text-white truncate">
                              {doc.title || doc.original_filename}
                            </h5>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {doc.original_filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.uploaded_at)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/consumable-documents/${doc.id}/download`}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>
                          {doc.document_type === 'image' && !doc.is_primary && (
                            <button
                              onClick={() => handleSetPrimary(doc.id)}
                              className="flex items-center gap-1 px-2 py-1 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded"
                            >
                              <Star className="h-4 w-4" />
                              Hauptbild
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Dokument hochladen
              </h3>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Dokumenttyp
                </label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {DOCUMENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Optional - Dateiname wird verwendet"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Datei *
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  PDF, JPG, PNG, GIF, WebP (max. 50 MB)
                </p>
              </div>

              {uploadForm.file && (
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                  <p className="font-medium">{uploadForm.file.name}</p>
                  <p>{formatFileSize(uploadForm.file.size)}</p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadForm.file}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploading ? 'Hochladen...' : 'Hochladen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setPreviewImage(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={getFileUrl(previewImage.file_path)}
            alt={previewImage.title}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
