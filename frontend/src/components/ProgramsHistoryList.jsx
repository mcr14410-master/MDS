// frontend/src/components/ProgramsHistoryList.jsx
import { useEffect, useState } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { useWorkflowStore } from '../stores/workflowStore';
import WorkflowStatusBadge from './WorkflowStatusBadge';

export default function ProgramsHistoryList({ operationId }) {
  const { programs, fetchPrograms } = useProgramsStore();
  const { fetchHistory, getHistory } = useWorkflowStore();
  const [loading, setLoading] = useState(true);

  // Load programs and their histories
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch all programs for this operation
        await fetchPrograms(parseInt(operationId));
        
        // Fetch history for each program
        const programList = programs.filter(p => p.operation_id === parseInt(operationId));
        await Promise.all(
          programList.map(program => 
            fetchHistory('program', program.id).catch(console.error)
          )
        );
      } catch (error) {
        console.error('Error loading programs history:', error);
      } finally {
        setLoading(false);
      }
    };

    if (operationId) {
      loadData();
    }
  }, [operationId, fetchPrograms, fetchHistory]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unbekannt';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Ungültiges Datum';
      
      return new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return 'Ungültiges Datum';
    }
  };

  // Get programs for this operation
  const operationPrograms = programs.filter(
    p => p.operation_id === parseInt(operationId)
  );

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Historie...</p>
      </div>
    );
  }

  // No programs
  if (operationPrograms.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Keine Programme vorhanden
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {operationPrograms.map((program) => {
        const history = getHistory('program', program.id);
        
        return (
          <div 
            key={program.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
          >
            {/* Program Header */}
            <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>

                  {/* Program Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white truncate" title={program.file_name}>
                      {program.file_name}
                    </h4>
                    {program.program_name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-0.5" title={program.program_name}>
                        {program.program_name}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Version {program.version_number}
                      </span>
                      {program.file_size && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {(program.file_size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 ml-4">
                <WorkflowStatusBadge status={program.workflow_state} size="md" />
              </div>
            </div>

            {/* History Timeline */}
            {history.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Keine Historie vorhanden
              </p>
            ) : (
              <div className="relative space-y-3">
                {/* Vertical line */}
                {history.length > 1 && (
                  <div className="absolute left-3 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700" />
                )}

                {history.slice(0, 5).map((entry, index) => (
                  <div key={entry.id} className="relative flex gap-3 items-start">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <WorkflowStatusBadge status={entry.from_state_name} size="sm" />
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <WorkflowStatusBadge status={entry.to_state_name} size="sm" />
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          {entry.changed_by_first_name && entry.changed_by_last_name
                            ? `${entry.changed_by_first_name} ${entry.changed_by_last_name}`
                            : entry.changed_by_username || 'System'}
                        </span>
                        <span>•</span>
                        <span>{formatDate(entry.created_at)}</span>
                      </div>
                      {entry.change_reason && (
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {entry.change_reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {history.length > 5 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic pl-9">
                    + {history.length - 5} weitere Einträge
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
