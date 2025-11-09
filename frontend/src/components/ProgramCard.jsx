// frontend/src/components/ProgramCard.jsx
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import WorkflowActions from './WorkflowActions';
import ToolListReadOnly from './ToolListReadOnly';

export default function ProgramCard({ program, onEdit, onDelete, onViewVersions, onNewRevision, onStatusChange }) {
  const { hasPermission } = useAuthStore();
  const { downloadProgram } = useProgramsStore();
  const [showTools, setShowTools] = useState(false);

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
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">
          {getFileIcon(program.filename)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white" title={program.filename}>
            {program.filename}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={program.program_name}>
            {program.program_name}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        {/* Version & Size */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Version:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{program.version || 'N/A'}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Größe:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatFileSize(program.file_size)}</span>
        </div>

        {/* File Hash (truncated) */}
        {program.file_hash && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Hash:</span>
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400" title={program.file_hash}>
              {program.file_hash.substring(0, 8)}...
            </span>
          </div>
        )}

        {/* Description */}
        {program.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {program.description}
            </p>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <WorkflowStatusBadge status={program.workflow_state} size="md" />
        </div>

        {/* Timestamps */}
        {program.created_at && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            Erstellt: {new Date(program.created_at).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDownload}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="Herunterladen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>

        {/* Werkzeugliste Button */}
        <button
          onClick={() => setShowTools(!showTools)}
          className={`p-2 rounded-lg transition-colors ${
            showTools 
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
              : 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
          }`}
          title={showTools ? "Werkzeugliste ausblenden" : "Werkzeugliste anzeigen"}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        {onViewVersions && (
          <button
            onClick={() => onViewVersions(program)}
            className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
            title="Versionen anzeigen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}

        {onNewRevision && hasPermission('part.update') && (
          <button
            onClick={() => onNewRevision(program)}
            className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
            title="Neue Version hochladen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        {hasPermission('part.update') && (
          <button
            onClick={() => onEdit(program)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Bearbeiten"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}

        {hasPermission('part.delete') && (
          <button
            onClick={handleDelete}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Löschen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Tool List (expandable) */}
      {showTools && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <ToolListReadOnly programId={program.id} />
        </div>
      )}

      {/* Workflow Actions */}
      {hasPermission('part.update') && (
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <WorkflowActions 
            entityType="program"
            entityId={program.id}
            currentState={program.workflow_state}
            onStatusChange={(newState) => {
              toast.success('Status geändert!');
              // Callback to parent if provided
              if (onStatusChange) {
                onStatusChange(program.id, newState);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
