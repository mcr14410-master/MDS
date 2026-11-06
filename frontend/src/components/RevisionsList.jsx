// frontend/src/components/RevisionsList.jsx
import { useState, useEffect } from 'react';
import { useProgramsStore } from '../stores/programsStore';
import { toast } from './Toaster';
import DiffViewer from './DiffViewer';
import { WORKFLOW_STATUS_LABELS } from '../utils/workflowLabels';

// Schritte im Ablauf einer Version (Zielstatus → Beschriftung)
const STEP_LABELS = {
  draft: 'Zurück in Entwurf',
  review: 'Zur Prüfung gegeben',
  approved: 'Geprüft',
  released: 'Freigegeben',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};
// Begründung nur zeigen, wo sie von Hand eingegeben wird
const REASON_STATES = ['rejected', 'archived'];

const formatDateTime = (value) => new Date(value).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const personName = (name, username) => name || username || 'System';

export default function RevisionsList({ program, onClose }) {
  const { fetchRevisions, rollbackProgram, loading } = useProgramsStore();
  
  const [revisions, setRevisions] = useState([]);
  const [showDiff, setShowDiff] = useState(false);
  const [compareFrom, setCompareFrom] = useState(null);
  const [compareTo, setCompareTo] = useState(null);
  const [openSteps, setOpenSteps] = useState(() => new Set());

  const toggleSteps = (revisionId) => setOpenSteps((prev) => {
    const next = new Set(prev);
    if (next.has(revisionId)) next.delete(revisionId); else next.add(revisionId);
    return next;
  });

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
      case 'draft': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
      case 'review': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'approved': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'released': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      case 'archived': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  // Get version type badge color
  const getVersionTypeBadge = (version) => {
    const [major] = version.split('.');
    if (major >= 2) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: 'Major' };
    if (version.includes('.1.')) return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-800 dark:text-orange-300', label: 'Minor' };
    return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Patch' };
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Versionshistorie</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{program.program_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Compare Mode Info */}
        {compareFrom && !showDiff && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Version {compareFrom.version_string} ausgewählt - wähle zweite Version zum Vergleichen
                </span>
              </div>
              <button
                onClick={resetCompare}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
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
              <div className="w-8 h-8 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : revisions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                const steps = revision.history || [];
                const stepsOpen = openSteps.has(revision.id);
                const lastStep = steps[steps.length - 1];

                return (
                  <div 
                    key={revision.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isActive ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' : 
                      isSelected ? 'border-blue-500 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20' :
                      'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      {/* Left: Version Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* Version Number */}
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            v{revision.version_string}
                          </span>

                          {/* Version Type Badge */}
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${versionBadge.bg} ${versionBadge.text}`}>
                            {versionBadge.label}
                          </span>

                          {/* Active Badge */}
                          {isActive && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                              ✓ Aktiv
                            </span>
                          )}

                          {/* Freigegebene Version (programs.released_revision_id) */}
                          {revision.is_released && (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300"
                              title="Diese Version ist freigegeben und darf an die Maschine">
                              Freigegeben
                            </span>
                          )}

                          {/* Status der Version – bei der freigegebenen reicht „Freigegeben“; eine früher freigegebene ist abgelöst */}
                          {!revision.is_released && (revision.workflow_state === 'released' ? (
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                              title="War freigegeben, inzwischen durch eine neuere Freigabe ersetzt">
                              Abgelöst
                            </span>
                          ) : (
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${getWorkflowBadgeColor(revision.workflow_state)}`}>
                              {WORKFLOW_STATUS_LABELS[revision.workflow_state] || revision.workflow_state}
                            </span>
                          ))}
                        </div>

                        {/* Change Log */}
                        {revision.comment && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{revision.comment}</p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>📁 {revision.filename}</span>
                          <span>📊 {(revision.filesize / 1024).toFixed(1)} KB</span>
                          <span>👤 {personName(revision.created_by_name, revision.created_by_username)}</span>
                          <span>🕐 {formatDateTime(revision.created_at)}</span>
                        </div>

                        {/* Ablauf: wer hat wann hochgeladen, zur Prüfung gegeben, geprüft, freigegeben */}
                        <button
                          type="button"
                          onClick={() => toggleSteps(revision.id)}
                          aria-expanded={stepsOpen}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        >
                          <svg className={`w-3 h-3 transition-transform ${stepsOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="font-medium">Ablauf</span>
                          {!stepsOpen && lastStep && (
                            <span>
                              · zuletzt {STEP_LABELS[lastStep.to_state] || lastStep.to_state}
                              {' '}von {personName(lastStep.changed_by_name, lastStep.changed_by_username)}
                              {' '}am {formatDateTime(lastStep.created_at)}
                            </span>
                          )}
                          {!stepsOpen && !lastStep && <span>· noch kein Statuswechsel</span>}
                        </button>

                        {stepsOpen && (
                          <ol className="mt-2 ml-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3 space-y-1 text-xs">
                            <li className="grid grid-cols-[10rem_14rem_auto] gap-x-3 text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Hochgeladen</span>
                              <span>{personName(revision.created_by_name, revision.created_by_username)}</span>
                              <span className="text-gray-500 dark:text-gray-400 tabular-nums">{formatDateTime(revision.created_at)}</span>
                            </li>
                            {steps.map((step) => (
                              <li key={step.id} className="text-gray-700 dark:text-gray-300">
                                <div className="grid grid-cols-[10rem_14rem_auto] gap-x-3">
                                  <span className={`font-medium ${step.to_state === 'rejected' ? 'text-red-700 dark:text-red-400' : step.to_state === 'released' ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                                    {STEP_LABELS[step.to_state] || step.to_state}
                                  </span>
                                  <span>{personName(step.changed_by_name, step.changed_by_username)}</span>
                                  <span className="text-gray-500 dark:text-gray-400 tabular-nums">{formatDateTime(step.created_at)}</span>
                                </div>
                                {REASON_STATES.includes(step.to_state) && step.change_reason && (
                                  <p className="mt-0.5 text-gray-600 dark:text-gray-400 italic">„{step.change_reason}“</p>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 ml-4">
                        {/* Compare Button */}
                        <button
                          onClick={() => handleCompare(revision)}
                          disabled={loading}
                          className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                            isSelected
                              ? 'bg-blue-600 dark:bg-blue-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                            className="px-3 py-1.5 text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-50"
                            title="Auf diese Version zurückrollen"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
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
