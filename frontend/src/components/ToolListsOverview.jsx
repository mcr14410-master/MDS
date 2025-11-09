// frontend/src/components/ToolListsOverview.jsx
import { useEffect, useState } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import ToolListTable from './ToolListTable';

export default function ToolListsOverview({ operationId }) {
  const { programs, loading, error, fetchPrograms } = useProgramsStore();
  const [expandedPrograms, setExpandedPrograms] = useState(new Set());

  useEffect(() => {
    if (operationId) {
      fetchPrograms(operationId);
    }
  }, [operationId, fetchPrograms]);

  const toggleProgram = (programId) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    setExpandedPrograms(new Set(programs.map(p => p.id)));
  };

  const collapseAll = () => {
    setExpandedPrograms(new Set());
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

  if (loading && programs.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Programme...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Keine Programme vorhanden
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Lade zuerst ein NC-Programm hoch, um Werkzeuglisten zu verwalten.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Expand/Collapse All */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Werkzeuglisten
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {programs.length} {programs.length === 1 ? 'Programm' : 'Programme'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Alle aufklappen
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Alle zuklappen
          </button>
        </div>
      </div>

      {/* Program Cards with Tool Lists */}
      <div className="space-y-4">
        {programs.map(program => {
          const isExpanded = expandedPrograms.has(program.id);
          
          return (
            <div
              key={program.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              {/* Program Header (clickable) */}
              <button
                onClick={() => toggleProgram(program.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* File Icon */}
                  <div className="text-3xl flex-shrink-0">
                    {getFileIcon(program.filename)}
                  </div>

                  {/* Program Info */}
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {program.program_name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                      <span className="truncate">{program.filename}</span>
                      {program.version && (
                        <>
                          <span className="text-gray-400 dark:text-gray-600">•</span>
                          <span>v{program.version}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Workflow Status Badge */}
                  {program.workflow_state && (
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        program.workflow_state === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : program.workflow_state === 'released'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : program.workflow_state === 'review'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : program.workflow_state === 'archived'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'
                      }`}>
                        {program.workflow_state === 'draft' && '📝 Entwurf'}
                        {program.workflow_state === 'review' && '👀 Prüfung'}
                        {program.workflow_state === 'approved' && '✅ Freigegeben'}
                        {program.workflow_state === 'released' && '🚀 Produktiv'}
                        {program.workflow_state === 'archived' && '📦 Archiviert'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Expand/Collapse Icon */}
                <div className="flex-shrink-0 ml-4">
                  <svg
                    className={`w-5 h-5 text-gray-400 dark:text-gray-500 transition-transform ${
                      isExpanded ? 'transform rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Tool List (expanded) */}
              {isExpanded && (
                <div className="px-6 pb-6 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <ToolListTable programId={program.id} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          💡 <strong>Tipp:</strong> Klicke auf ein Programm, um die Werkzeugliste anzuzeigen und zu bearbeiten.
        </p>
      </div>
    </div>
  );
}
