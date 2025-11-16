import { Download, Trash2, FileText, Image, Box, File, Archive, Loader2 } from 'lucide-react';
import { useToolDocumentsStore } from '../../stores/toolDocumentsStore';
import { useAuthStore } from '../../stores/authStore';

/**
 * DocumentsList Component
 * Displays list of documents with download and delete actions
 */
export default function DocumentsList({ documents, onDelete }) {
  const { user } = useAuthStore();
  const {
    loading,
    downloadDocument,
    deleteDocument,
    getDocumentTypeLabel,
    getDocumentTypeColor,
    formatFileSize,
    getFileIcon,
  } = useToolDocumentsStore();

  const handleDownload = async (doc) => {
    await downloadDocument(doc.id, doc.file_name);
  };

  const handleDelete = async (doc) => {
    if (window.confirm(`Dokument "${doc.file_name}" wirklich löschen?`)) {
      const result = await deleteDocument(doc.id);
      if (result.success && onDelete) {
        onDelete(result);
      }
    }
  };

  const getFileIconComponent = (doc) => {
    const iconName = getFileIcon(doc.mime_type, doc.file_name);
    const icons = {
      FileText,
      Image,
      Box,
      Archive,
      File,
    };
    return icons[iconName] || File;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400">Keine Dokumente vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Dokumente</h3>
        <p className="text-sm text-gray-400 mt-1">{documents.length} Dokument(e)</p>
      </div>

      {/* Documents Grid */}
      <div className="divide-y divide-gray-700">
        {documents.map((doc) => {
          const FileIcon = getFileIconComponent(doc);
          const typeColor = getDocumentTypeColor(doc.document_type);

          return (
            <div key={doc.id} className="px-6 py-4 hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-${typeColor}-500/20 flex items-center justify-center`}>
                  <FileIcon className={`w-6 h-6 text-${typeColor}-400`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Filename */}
                  <h4 className="font-medium text-white truncate">{doc.file_name}</h4>

                  {/* Type Badge & Size */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded bg-${typeColor}-500/20 text-${typeColor}-400 border border-${typeColor}-500/30`}>
                      {getDocumentTypeLabel(doc.document_type)}
                    </span>
                    <span className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</span>
                  </div>

                  {/* Description */}
                  {doc.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{doc.description}</p>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>
                      Hochgeladen von {doc.uploaded_by_username || 'Unbekannt'}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(doc.uploaded_at).toLocaleString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Download */}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Herunterladen"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  {/* Delete */}
                  {user?.permissions?.includes('tools.documents.delete') && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
