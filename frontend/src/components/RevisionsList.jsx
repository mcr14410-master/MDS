// frontend/src/components/RevisionsList.jsx
import { useState, useEffect } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import DiffViewer from './DiffViewer';

export default function RevisionsList({ program, onClose }) {
  const { fetchRevisions, rollbackProgram, deleteRevision, loading } = useProgramsStore();
  const { hasPermission } = useAuthStore();
  
  const [revisions, setRevisions] = useState([]);
  const [showDiff, setShowDiff] = useState(false);
  const [compareFrom, setCompareFrom] = useState(null);
  const [compareTo, setCompareTo] = useState(null);

  useEffect(() => {
    loadRevisions();
  }, [program.id]);

  const loadRevisions = async () => {
    try {
      const data = await fetchRevisions(program.id);
      setRevisions(data);
    } catch (error) {
      toast.error('Fehler beim Laden der Versionen');
    }
  };

  const handleRollback = async (version) => {
    if (!confirm(`Wirklich auf Version ${version} zurückrollen?`)) return;

    try {
      await rollbackProgram(program.id, version);
      toast.success(`Erfolgreich auf Version ${version} zurückgerollt`);
      loadRevisions();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (revision) => {
    if (!confirm(`Version ${revision.version_string} wirklich löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!`)) return;

    try {
      await deleteRevision(program.id, revision.id);
      toast.success(`Version ${revision.version_string} erfolgreich gelöscht`);
      loadRevisions();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleCompare = (revision) => {
    if (!compareFrom) {
      setCompareFrom(revision);
      toast.info(`Version ${revision.version_string} ausgewählt. Wähle zweite Version.`);
    } else {
      setCompareTo(revision);
      setShowDiff(true);
    }
  };

  const resetCompare = () => {
    setCompareFrom(null);
    setCompareTo(null);
    setShowDiff(false);
  };

  // Get workflow state badge color
  const getWorkflowBadgeColor = (state) => {
    switch (state) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'released': return 'bg-purple-100 text-purple-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get version type badge color
  const getVersionTypeBadge = (version) => {
    const [major] = version.split('.');
    if (major >= 2) return { bg: 'bg-red-100', text: 'text-red-800', label: 'Major' };
    if (version.includes('.1.')) return { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Minor' };
    return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Patch' };
  };

  if (showDiff && compareFrom && compareTo) {
    return (
      <DiffViewer 
        program={program}
        fromRevision={compareFrom}
        toRevision={compareTo}
        onClose={resetCompare}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Versionshistorie</h2>
            <p className="text-sm text-gray-600 mt-1">{program.program_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compare Mode Info */}
        {compareFrom && !showDiff && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-900">
                  Version {compareFrom.version_string} ausgewählt - wähle zweite Version zum Vergleichen
                </span>
              </div>
              <button
                onClick={resetCompare}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}

        {/* Revisions List */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">Keine Versionen vorhanden</p>
            </div>
          ) : (
            <div className="space-y-4">
              {revisions.map((revision, idx) => {
                const versionBadge = getVersionTypeBadge(revision.version_string);
                const isActive = revision.is_current; // Backend gibt boolean is_current
                const isSelected = compareFrom?.id === revision.id;

                return (
                  <div 
                    key={revision.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isActive ? 'border-green-500 bg-green-50' : 
                      isSelected ? 'border-blue-500 bg-blue-50' :
                      'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {/* Left: Version Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Version Number */}
                          <span className="text-lg font-bold text-gray-900">
                            v{revision.version_string}
                          </span>

                          {/* Version Type Badge */}
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${versionBadge.bg} ${versionBadge.text}`}>
                            {versionBadge.label}
                          </span>

                          {/* Active Badge */}
                          {isActive && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                              ✓ Aktiv
                            </span>
                          )}

                          {/* Workflow State */}
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getWorkflowBadgeColor(revision.workflow_state)}`}>
                            {revision.workflow_state}
                          </span>
                        </div>

                        {/* Change Log */}
                        {revision.comment && (
                          <p className="text-sm text-gray-700 mb-2">{revision.comment}</p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📁 {revision.filename}</span>
                          <span>📊 {(revision.filesize / 1024).toFixed(1)} KB</span>
                          <span>👤 {revision.created_by_username || 'System'}</span>
                          <span>🕐 {new Date(revision.created_at).toLocaleString('de-DE')}</span>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Compare Button */}
                        <button
                          onClick={() => handleCompare(revision)}
                          disabled={loading}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="Zum Vergleichen auswählen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>

                        {/* Rollback Button */}
                        {!isActive && (
                          <button
                            onClick={() => handleRollback(revision.version_string)}
                            disabled={loading}
                            className="px-3 py-1.5 text-sm font-medium bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors disabled:opacity-50"
                            title="Auf diese Version zurückrollen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                          </button>
                        )}

                        {/* Delete Button */}
                        {!isActive && hasPermission('part.delete') && (
                          <button
                            onClick={() => handleDelete(revision)}
                            disabled={loading}
                            className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                            title="Diese Version löschen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
