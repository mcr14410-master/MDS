// frontend/src/components/SetupSheetStatusActions.jsx
import { useState } from 'react';
import { useSetupSheetsStore } from '../stores/setupSheetsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';

// Status-Übergänge definieren
const STATUS_TRANSITIONS = {
  draft: ['review', 'archived'],
  review: ['approved', 'draft'],
  approved: ['active', 'draft'],
  active: ['archived'],
  archived: [],
};

const STATUS_LABELS = {
  draft: 'Entwurf',
  review: 'In Prüfung',
  approved: 'Geprüft',
  active: 'Aktiv',
  archived: 'Archiviert',
};

const STATUS_COLORS = {
  draft: 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600',
  review: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600',
  approved: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600',
  active: 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600',
  archived: 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600',
};

export default function SetupSheetStatusActions({ 
  setupSheetId, 
  currentStatus,
  onStatusChange 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { hasPermission } = useAuthStore();
  const { updateSetupSheet } = useSetupSheetsStore();

  // Check if user can change status
  const canChangeStatus = hasPermission('part.update');

  // Get available transitions for current status
  const availableTransitions = STATUS_TRANSITIONS[currentStatus] || [];

  // Get default reason for transition
  const getDefaultReason = (fromStatus, toStatus) => {
    const key = `${fromStatus}_${toStatus}`;
    
    const defaultReasons = {
      'draft_review': 'Zur Prüfung freigegeben',
      'review_approved': 'Prüfung erfolgreich abgeschlossen',
      'review_draft': 'Zurück in Bearbeitung',
      'approved_active': 'Für Produktion aktiviert',
      'approved_draft': 'Zurück zur Überarbeitung',
      'active_archived': 'Archiviert',
    };
    
    return defaultReasons[key] || `Status geändert zu: ${STATUS_LABELS[toStatus]}`;
  };

  // Handle status change click
  const handleStatusClick = (newStatus) => {
    // Check if reason is required (for archived)
    const requiresReason = newStatus === 'archived';
    
    if (requiresReason) {
      setSelectedStatus(newStatus);
      setIsModalOpen(true);
    } else {
      // Direct transition with default reason
      const defaultReason = getDefaultReason(currentStatus, newStatus);
      executeStatusChange(newStatus, defaultReason);
    }
  };

  // Execute status change
  const executeStatusChange = async (newStatus, reasonText) => {
    setIsSubmitting(true);
    try {
      const result = await updateSetupSheet(setupSheetId, { 
        status: newStatus 
      });
      
      if (result.success) {
        toast.success(`Status geändert: ${STATUS_LABELS[newStatus]}`);
        
        // Callback to parent
        if (onStatusChange) {
          onStatusChange(newStatus);
        }
        
        // Close modal if open
        setIsModalOpen(false);
        setSelectedStatus(null);
        setReason('');
      } else {
        toast.error(result.error || 'Status-Änderung fehlgeschlagen');
      }
    } catch (error) {
      toast.error(error.message || 'Status-Änderung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal submit
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!selectedStatus) return;
    
    executeStatusChange(selectedStatus, reason || null);
  };

  // Get button color based on status
  const getButtonClass = (status) => {
    return STATUS_COLORS[status] || 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600';
  };

  // Don't render if no permission or no transitions available
  if (!canChangeStatus || availableTransitions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {availableTransitions.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusClick(status)}
            disabled={isSubmitting}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm text-white transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getButtonClass(status)}
            `}
          >
            → {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      {/* Reason Modal */}
      {isModalOpen && selectedStatus && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Status ändern: {STATUS_LABELS[selectedStatus]}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit}>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grund für Änderung {selectedStatus === 'archived' ? '(erforderlich)' : '(optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={selectedStatus === 'archived'}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Begründung eingeben..."
                />
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end rounded-b-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedStatus(null);
                    setReason('');
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50
                    ${getButtonClass(selectedStatus)}
                  `}
                >
                  {isSubmitting ? 'Wird geändert...' : 'Status ändern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
