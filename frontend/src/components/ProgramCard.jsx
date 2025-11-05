// frontend/src/components/ProgramCard.jsx
import { useAuthStore } from '../stores/authStore';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';

export default function ProgramCard({ program, onEdit, onDelete }) {
  const { hasPermission } = useAuthStore();
  const { downloadProgram } = useProgramsStore();

  const handleDownload = async () => {
    try {
      await downloadProgram(program.id, program.filename);
      toast.success('Download gestartet');
    } catch (error) {
      toast.error(error.message || 'Download fehlgeschlagen');
    }
  };

  const handleDelete = () => {
    onDelete(program);
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get file extension icon
  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    
    // G-Code files
    if (['nc', 'mpf', 'cnc', 'gcode', 'gc', 'tap'].includes(ext)) {
      return '📄';
    }
    // ISO files
    if (['iso', 'h', 'i', 'din'].includes(ext)) {
      return '📋';
    }
    // Text files
    if (['txt', 'text'].includes(ext)) {
      return '📝';
    }
    // Other
    return '📁';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="text-3xl flex-shrink-0">
            {getFileIcon(program.filename)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate" title={program.filename}>
              {program.filename}
            </h3>
            <p className="text-sm text-gray-600 truncate" title={program.program_name}>
              {program.program_name}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <button
            onClick={handleDownload}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Herunterladen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {hasPermission('part.update') && (
            <>
              <button
                onClick={() => onEdit(program)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Bearbeiten"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </>
          )}

          {hasPermission('part.delete') && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Löschen"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Version & Size */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Version:</span>
          <span className="font-medium text-gray-900">{program.version || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600">Größe:</span>
          <span className="font-medium text-gray-900">{formatFileSize(program.file_size)}</span>
        </div>

        {/* File Hash (truncated) */}
        {program.file_hash && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Hash:</span>
            <span className="font-mono text-xs text-gray-500" title={program.file_hash}>
              {program.file_hash.substring(0, 8)}...
            </span>
          </div>
        )}

        {/* Description */}
        {program.description && (
          <div className="pt-2 border-t border-gray-100">
            <p className="text-gray-600 text-sm line-clamp-2">
              {program.description}
            </p>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-gray-600">Status:</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            program.workflow_state === 'approved' 
              ? 'bg-green-100 text-green-800' 
              : program.workflow_state === 'review'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {program.workflow_state === 'approved' ? 'Freigegeben' :
             program.workflow_state === 'review' ? 'In Prüfung' :
             'Entwurf'}
          </span>
        </div>

        {/* Timestamps */}
        {program.created_at && (
          <div className="text-xs text-gray-500 pt-2">
            Erstellt: {new Date(program.created_at).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>
    </div>
  );
}
