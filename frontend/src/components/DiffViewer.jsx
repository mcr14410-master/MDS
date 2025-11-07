// frontend/src/components/DiffViewer.jsx
import { useState, useEffect } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';

export default function DiffViewer({ program, fromRevision, toRevision, onClose }) {
  const { compareRevisions, loading } = useProgramsStore();
  
  const [diffData, setDiffData] = useState(null);
  const [viewMode, setViewMode] = useState('unified'); // 'unified' or 'split'

  useEffect(() => {
    loadDiff();
  }, [fromRevision, toRevision]);

  const loadDiff = async () => {
    try {
      const data = await compareRevisions(
        program.id,
        fromRevision.version_string,
        toRevision.version_string
      );
      // Backend gibt { diff: { changes: [...], summary: {...} } }
      // Wir brauchen: { diff: [...], summary: {...} }
      setDiffData({
        summary: data.diff.summary,
        diff: data.diff.changes
      });
    } catch (error) {
      toast.error('Fehler beim Laden des Vergleichs');
    }
  };

  if (loading || !diffData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Vergleiche wird geladen...</p>
        </div>
      </div>
    );
  }

  const { summary, diff } = diffData;

  // Get line background color based on change type
  const getLineClass = (line) => {
    const changeType = line.type || line.change; // Backend nutzt 'type'
    switch (changeType) {
      case 'added': return 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-600';
      case 'removed': return 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600';
      case 'changed': return 'bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600';
      default: return 'bg-white dark:bg-gray-800';
    }
  };

  // Get line symbol
  const getLineSymbol = (line) => {
    const changeType = line.type || line.change; // Backend nutzt 'type'
    switch (changeType) {
      case 'added': return <span className="text-green-600 dark:text-green-400 font-bold">+</span>;
      case 'removed': return <span className="text-red-600 dark:text-red-400 font-bold">-</span>;
      case 'changed': return <span className="text-yellow-600 dark:text-yellow-400 font-bold">~</span>;
      default: return <span className="text-gray-400 dark:text-gray-600"> </span>;
    }
  };

  // Get line content (changed lines haben old_content/new_content)
  const getLineContent = (line) => {
    if (line.type === 'changed' || line.change === 'changed') {
      return line.new_content || line.content;
    }
    return line.content;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Versionsvergleich</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {program.program_name}: v{fromRevision.version_string} → v{toRevision.version_string}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'unified' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Einheitlich
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  viewMode === 'split' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Geteilt
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-full"></span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{summary.added} hinzugefügt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded-full"></span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{summary.removed} entfernt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded-full"></span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{summary.changed} geändert</span>
            </div>
            {summary.unchanged !== undefined && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{summary.unchanged} unverändert</span>
              </div>
            )}
          </div>
        </div>

        {/* Diff Content */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === 'unified' ? (
            // Unified View
            <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              {diff.map((line, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start px-4 py-1 ${getLineClass(line)}`}
                >
                  <span className="w-12 text-right text-gray-500 dark:text-gray-400 mr-4">
                    {line.line_number}
                  </span>
                  <span className="w-6 mr-2">
                    {getLineSymbol(line)}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">
                    {getLineContent(line)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            // Split View
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Old Version */}
              <div>
                <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 px-4 py-2 font-semibold mb-2 rounded-t-lg">
                  Version {fromRevision.version_string} (Alt)
                </div>
                <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 rounded-b-lg border border-gray-200 dark:border-gray-700">
                  {diff
                    .filter(line => {
                      const changeType = line.type || line.change;
                      return changeType !== 'added';
                    })
                    .map((line, idx) => {
                      const changeType = line.type || line.change;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start px-4 py-1 ${
                            changeType === 'removed' ? 'bg-red-50 dark:bg-red-900/20' : 
                            changeType === 'changed' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                            'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <span className="w-12 text-right text-gray-500 dark:text-gray-400 mr-4">
                            {line.line_number}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">
                            {changeType === 'changed' ? (line.old_content || line.content) : line.content}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Right: New Version */}
              <div>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 px-4 py-2 font-semibold mb-2 rounded-t-lg">
                  Version {toRevision.version_string} (Neu)
                </div>
                <div className="font-mono text-sm bg-gray-50 dark:bg-gray-900 rounded-b-lg border border-gray-200 dark:border-gray-700">
                  {diff
                    .filter(line => {
                      const changeType = line.type || line.change;
                      return changeType !== 'removed';
                    })
                    .map((line, idx) => {
                      const changeType = line.type || line.change;
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-start px-4 py-1 ${
                            changeType === 'added' ? 'bg-green-50 dark:bg-green-900/20' : 
                            changeType === 'changed' ? 'bg-yellow-50 dark:bg-yellow-900/20' : 
                            'bg-white dark:bg-gray-800'
                          }`}
                        >
                          <span className="w-12 text-right text-gray-500 dark:text-gray-400 mr-4">
                            {line.line_number}
                          </span>
                          <span className="flex-1 whitespace-pre-wrap break-all text-gray-900 dark:text-gray-100">
                            {getLineContent(line)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
