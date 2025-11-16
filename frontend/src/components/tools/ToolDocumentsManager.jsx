import { useState } from 'react';
import { Download, Trash2, Eye, Star, FileText, Image as ImageIcon, Box, File, Archive, Loader2 } from 'lucide-react';
import { useToolDocumentsStore } from '../../stores/toolDocumentsStore';
import { useAuthStore } from '../../stores/authStore';

/**
 * ToolDocumentsManager Component
 * Full-featured document manager with sub-tabs for filtering by type
 * Features:
 * - Tab System: Images | Drawings | Datasheets | Other
 * - Actions: View, Download, Delete, Set Primary
 * - Primary Document Badge
 */
export default function ToolDocumentsManager({ documents, onDelete, onSetPrimary }) {
  const { user } = useAuthStore();
  const {
    loading,
    viewDocument,
    downloadDocument,
    deleteDocument,
    setPrimaryDocument,
    getDocumentTypeLabel,
    getDocumentTypeColor,
    formatFileSize,
    getFileIcon,
  } = useToolDocumentsStore();

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState('all');

  // Filter documents by type
  const getFilteredDocuments = () => {
    if (activeSubTab === 'all') return documents;
    
    const typeMap = {
      images: 'photo',
      drawings: 'drawing',
      datasheets: 'datasheet',
      other: ['certificate', 'manual', 'other'], // Group these together
    };

    const filterType = typeMap[activeSubTab];
    
    if (Array.isArray(filterType)) {
      return documents.filter(doc => filterType.includes(doc.document_type));
    }
    
    return documents.filter(doc => doc.document_type === filterType);
  };

  // Get document counts for tabs
  const getCounts = () => {
    return {
      all: documents.length,
      images: documents.filter(d => d.document_type === 'photo').length,
      drawings: documents.filter(d => d.document_type === 'drawing').length,
      datasheets: documents.filter(d => d.document_type === 'datasheet').length,
      other: documents.filter(d => ['certificate', 'manual', 'other'].includes(d.document_type)).length,
    };
  };

  const counts = getCounts();
  const filteredDocuments = getFilteredDocuments();

  const handleView = async (doc) => {
    await viewDocument(doc.id, doc.file_name);
  };

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

  const handleSetPrimary = async (doc) => {
    if (doc.is_primary) {
      return; // Already primary
    }

    const result = await setPrimaryDocument(doc.id);
    if (result.success && onSetPrimary) {
      onSetPrimary(result);
    }
  };

  const getFileIconComponent = (doc) => {
    const iconName = getFileIcon(doc.mime_type, doc.file_name);
    const icons = {
      FileText,
      Image: ImageIcon,
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
      {/* Header with Tabs */}
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Dokumente</h3>
        
        {/* Sub-Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Alle ({counts.all})
          </button>
          <button
            onClick={() => setActiveSubTab('images')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'images'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <ImageIcon className="w-4 h-4 inline mr-1" />
            Bilder ({counts.images})
          </button>
          <button
            onClick={() => setActiveSubTab('drawings')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'drawings'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Box className="w-4 h-4 inline mr-1" />
            Zeichnungen ({counts.drawings})
          </button>
          <button
            onClick={() => setActiveSubTab('datasheets')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'datasheets'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1" />
            Datenblätter ({counts.datasheets})
          </button>
          <button
            onClick={() => setActiveSubTab('other')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeSubTab === 'other'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Archive className="w-4 h-4 inline mr-1" />
            Sonstige ({counts.other})
          </button>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <p className="text-gray-400">Keine Dokumente in dieser Kategorie</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700">
          {filteredDocuments.map((doc) => {
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
                    {/* Filename with Primary Badge */}
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-white truncate">{doc.file_name}</h4>
                      {doc.is_primary && (
                        <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          <Star className="w-3 h-3 fill-current" />
                          Hauptdokument
                        </span>
                      )}
                    </div>

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
				  {/* View - TEMPORARILY DISABLED
				  <button
				    onClick={() => handleView(doc)}
				    className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
				    title="Anzeigen"
				  >
				    <Eye className="w-5 h-5" />
				  </button>
				  */}

                    {/* Download */}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      title="Herunterladen"
                    >
                      <Download className="w-5 h-5" />
                    </button>

                    {/* Set Primary */}
                    {user?.permissions?.includes('tools.documents.upload') && !doc.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(doc)}
                        className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                        title="Als Hauptdokument markieren"
                      >
                        <Star className="w-5 h-5" />
                      </button>
                    )}

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
      )}
    </div>
  );
}
