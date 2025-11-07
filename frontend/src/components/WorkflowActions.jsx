// frontend/src/components/WorkflowActions.jsx
import { useState, useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';

export default function WorkflowActions({ 
  entityType, 
  entityId, 
  currentState,
  onStatusChange 
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransition, setSelectedTransition] = useState(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { hasPermission } = useAuthStore();
  const { 
    fetchTransitions, 
    getTransitions, 
    changeState, 
    loading 
  } = useWorkflowStore();

  // Check if user can change workflow state
  const canChangeWorkflow = hasPermission('part.update'); // TODO: Later use workflow.change permission

  // Fetch available transitions on mount or when currentState changes
  useEffect(() => {
    if (canChangeWorkflow && entityType && entityId && currentState) {
      fetchTransitions(entityType, entityId).catch(console.error);
    }
  }, [entityType, entityId, currentState, canChangeWorkflow, fetchTransitions]);

  // Get available transitions from store
  const transitions = getTransitions(entityType, entityId) || []; // Fallback zu leerem Array

  // Don't render while loading initial data
  if (loading && transitions.length === 0) {
    return null;
  }

  // Get default reason for automatic transitions
  const getDefaultReason = (fromState, toState) => {
    const key = `${fromState}_${toState}`;
    
    const defaultReasons = {
      'draft_review': 'Zur Prüfung freigegeben',
      'review_approved': 'Prüfung erfolgreich abgeschlossen',
      'review_draft': 'Zurück in Bearbeitung',
      'approved_released': 'Freigegeben für Produktion',
      'approved_draft': 'Zurück zur Überarbeitung',
      'rejected_draft': 'Zur erneuten Bearbeitung'
    };
    
    return defaultReasons[key] || `Status geändert zu: ${toState}`;
  };

  // Handle transition click
  const handleTransitionClick = (transition) => {
    // Check if reason is required (for rejected/archived)
    const requiresReason = ['rejected', 'archived'].includes(transition.to_state);
    
    if (requiresReason) {
      setSelectedTransition(transition);
      setIsModalOpen(true);
    } else {
      // Direct transition with default reason
      const defaultReason = getDefaultReason(transition.from_state, transition.to_state);
      executeTransition(transition, defaultReason);
    }
  };

  // Execute transition
  const executeTransition = async (transition, reasonText) => {
    setIsSubmitting(true);
    try {
      // ✅ Sende die ID, nicht den Namen!
      await changeState(entityType, entityId, transition.id, reasonText);
      toast.success(`Status geändert: ${transition.to_state_name}`);
      
      // Callback to parent
      if (onStatusChange) {
        onStatusChange(transition.to_state);
      }
      
      // Close modal if open
      setIsModalOpen(false);
      setSelectedTransition(null);
      setReason('');
    } catch (error) {
      toast.error(error.message || 'Status-Änderung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal submit
  const handleModalSubmit = (e) => {
    e.preventDefault();
    if (!selectedTransition) return;
    
    executeTransition(selectedTransition, reason || null);
  };

  // Get button color based on transition
  const getButtonClass = (toState) => {
    switch (toState) {
      case 'review':
        return 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-600 text-white';
      case 'approved':
        return 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white';
      case 'released':
        return 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white';
      case 'rejected':
        return 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white';
      case 'archived':
        return 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white';
      case 'draft':
        return 'bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white';
      default:
        return 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white';
    }
  };

  // Don't render if no permission or no transitions
  if (!canChangeWorkflow || !Array.isArray(transitions) || transitions.length === 0) {
    return null;
  }

  return (
    <>
      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {transitions.map((transition) => (
          <button
            key={transition.to_state}
            onClick={() => handleTransitionClick(transition)}
            disabled={loading || isSubmitting}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
              ${getButtonClass(transition.to_state)}
            `}
          >
            → {transition.to_state_name}
          </button>
        ))}
      </div>

      {/* Reason Modal */}
      {isModalOpen && selectedTransition && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Status ändern: {selectedTransition.to_state_name}
              </h3>
            </div>

            {/* Form */}
            <form onSubmit={handleModalSubmit}>
              <div className="px-6 py-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grund für Änderung {['rejected', 'archived'].includes(selectedTransition.to_state) ? '(erforderlich)' : '(optional)'}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={['rejected', 'archived'].includes(selectedTransition.to_state)}
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
                    setSelectedTransition(null);
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
                    px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50
                    ${getButtonClass(selectedTransition.to_state)}
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
