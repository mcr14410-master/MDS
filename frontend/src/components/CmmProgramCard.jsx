// frontend/src/components/CmmProgramCard.jsx
// Karte eines Messprogramms (KMG / PC-DMIS): Dateigruppe statt Einzeldatei, Download als ZIP
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import WorkflowStatusBadge from './WorkflowStatusBadge';
import WorkflowActions from './WorkflowActions';
import CmmFilesModal from './CmmFilesModal';
import ProgramDownloadButtons from './ProgramDownloadButtons';
import ReleasedVersionNote from './ReleasedVersionNote';

const formatFileSize = (bytes) => {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

export default function CmmProgramCard({ program, onEdit, onDelete, onViewVersions, onNewRevision, onStatusChange }) {
  const { hasPermission } = useAuthStore();
  const [showFiles, setShowFiles] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-4">
      {/* Header: Name der .prg */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl flex-shrink-0">📐</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white break-all" title={program.filename}>
            {program.filename}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate" title={program.program_name}>
            {program.program_name}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Version:</span>
          <span className="text-right">
            <span className="font-medium text-gray-900 dark:text-gray-100">{program.version || 'N/A'}</span>
            <ReleasedVersionNote version={program.version} releasedVersion={program.released_version} className="block" />
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Größe .prg:</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatFileSize(program.file_size)}</span>
        </div>

        {program.description && (
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {program.description}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <span className="text-gray-600 dark:text-gray-400">Status:</span>
          <WorkflowStatusBadge status={program.workflow_state} size="md" />
        </div>

        {program.created_at && (
          <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
            Erstellt: {new Date(program.created_at).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
        <ProgramDownloadButtons program={program} />

        <button
          onClick={() => setShowFiles(true)}
          className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
          title="Dateien anzeigen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </button>

        <button
          onClick={() => onViewVersions(program)}
          className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
          title="Versionen anzeigen"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        {hasPermission('part.update') && (
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
            onClick={() => onDelete(program)}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Löschen"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {showFiles && <CmmFilesModal program={program} onClose={() => setShowFiles(false)} />}

      {hasPermission('part.update') && (
        <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700">
          <WorkflowActions
            entityType="program"
            entityId={program.id}
            currentState={program.workflow_state}
            onStatusChange={(newState) => {
              toast.success('Status geändert!');
              onStatusChange(program.id, newState);
            }}
          />
        </div>
      )}
    </div>
  );
}
