// frontend/src/components/SetupSheetCard.jsx
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import SetupSheetStatusActions from './SetupSheetStatusActions';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_LABELS = {
  draft: 'Entwurf',
  review: 'In Prüfung',
  approved: 'Geprüft',
  active: 'Aktiv',
  archived: 'Archiviert',
};

export default function SetupSheetCard({ setupSheet, onOpen, onEdit, onDelete, onStatusChange }) {
  const { hasPermission } = useAuthStore();
  const statusColor = STATUS_COLORS[setupSheet.status] || STATUS_COLORS.draft;
  const statusLabel = STATUS_LABELS[setupSheet.status] || setupSheet.status;
  const photoCount = Number(setupSheet.photo_count || 0);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {setupSheet.op_number} - {setupSheet.op_name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {setupSheet.part_number} - {setupSheet.part_name}
          </p>
        </div>
        
        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {/* Machine & Program */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex items-center text-gray-700 dark:text-gray-300">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
          </svg>
          <span className="font-medium">{setupSheet.machine_name}</span>
          {setupSheet.machine_number && (
            <span className="ml-1 text-gray-500 dark:text-gray-400">
              ({setupSheet.machine_number})
            </span>
          )}
        </div>

        {setupSheet.program_number && (
          <div className="flex items-center text-gray-700 dark:text-gray-300">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{setupSheet.program_number}</span>
            {setupSheet.program_version && (
              <span className="ml-1 text-gray-500 dark:text-gray-400">
                v{setupSheet.program_version}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center text-gray-700 dark:text-gray-300">
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{photoCount} Foto{photoCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Nullpunkt Info (kompakt) */}
      {(setupSheet.preset_number || setupSheet.wcs_number) && (
        <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-2 mb-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Nullpunkt:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {setupSheet.preset_number && `Preset ${setupSheet.preset_number}`}
              {setupSheet.wcs_number && setupSheet.wcs_number}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <p>Erstellt: {formatDate(setupSheet.created_at)}</p>
          {setupSheet.updated_by_name && (
            <p>von {setupSheet.updated_by_name}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onOpen && (
            <button
              onClick={(e) => onOpen(setupSheet, e)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Einrichteblatt öffnen (Details, Spannmittel, Fotos)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Öffnen
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => onEdit(setupSheet, e)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Bearbeiten"
            >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => onDelete(setupSheet.id, e)}
              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Löschen"
            >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            </button>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {hasPermission('part.update') && (
        <div
          className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          <SetupSheetStatusActions
            setupSheetId={setupSheet.id}
            currentStatus={setupSheet.status}
            onStatusChange={(newStatus) => {
              // Callback to parent if provided
              if (onStatusChange) {
                onStatusChange(setupSheet.id, newStatus);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
