import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMaintenanceStore } from '../stores/maintenanceStore';

function EscalationsPage() {
  const { 
    escalations,
    loading,
    error,
    fetchEscalations,
    acknowledgeEscalation,
    resolveEscalation
  } = useMaintenanceStore();
  
  const [statusFilter, setStatusFilter] = useState('open');
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);

  // Lade ALLE Eskalationen (ohne Filter), filtere im Frontend
  useEffect(() => {
    fetchEscalations();
  }, []);

  // Nach Aktionen neu laden
  const reloadEscalations = () => {
    fetchEscalations();
  };

  const handleAcknowledge = async (id) => {
    try {
      await acknowledgeEscalation(id);
      reloadEscalations();
    } catch (err) {
      console.error('Fehler beim Bestätigen:', err);
    }
  };

  const handleResolve = async () => {
    if (!selectedEscalation) return;
    try {
      await resolveEscalation(selectedEscalation.id, resolveNotes);
      setShowResolveModal(false);
      setSelectedEscalation(null);
      setResolveNotes('');
      reloadEscalations();
    } catch (err) {
      console.error('Fehler beim Lösen:', err);
    }
  };

  // Gefilterte Liste für Anzeige
  const filteredEscalations = statusFilter === 'all' 
    ? escalations 
    : escalations.filter(e => e.status === statusFilter);

  // Statistik immer aus ALLEN Eskalationen
  const openCount = escalations.filter(e => e.status === 'open').length;
  const acknowledgedCount = escalations.filter(e => e.status === 'acknowledged').length;
  const resolvedCount = escalations.filter(e => e.status === 'resolved').length;

  const getStatusBadge = (status) => {
    const styles = {
      open: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      acknowledged: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    };
    const labels = {
      open: 'Offen',
      acknowledged: 'Bestätigt',
      resolved: 'Gelöst'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.open}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    const labels = {
      low: 'Niedrig',
      medium: 'Mittel',
      high: 'Hoch',
      critical: 'Kritisch'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[severity] || styles.medium}`}>
        {labels[severity] || severity}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Eskalationen
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Probleme und Eskalationen aus Wartungsaufgaben
          </p>
        </div>
      </div>

      {/* Statistik-Karten - klickbar als Filter */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Alle */}
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'all' ? 'ring-2 ring-blue-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {escalations.length}
              </div>
              <div className="text-sm text-gray-500">Alle</div>
            </div>
          </div>
        </button>

        {/* Offen */}
        <button
          onClick={() => setStatusFilter('open')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'open' ? 'ring-2 ring-red-500' : ''} ${openCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-red-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${openCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <div className={`text-2xl font-bold ${openCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {openCount}
              </div>
              <div className="text-sm text-gray-500">Offen</div>
            </div>
          </div>
        </button>

        {/* In Bearbeitung */}
        <button
          onClick={() => setStatusFilter('acknowledged')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'acknowledged' ? 'ring-2 ring-yellow-500' : ''} ${acknowledgedCount > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-yellow-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${acknowledgedCount > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className={`text-2xl font-bold ${acknowledgedCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                {acknowledgedCount}
              </div>
              <div className="text-sm text-gray-500">In Bearbeitung</div>
            </div>
          </div>
        </button>

        {/* Gelöst */}
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'resolved' ? 'ring-2 ring-green-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-green-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {resolvedCount}
              </div>
              <div className="text-sm text-gray-500">Gelöst</div>
            </div>
          </div>
        </button>
      </div>

      {/* Liste */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Lade Eskalationen...
          </div>
        ) : filteredEscalations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter === 'open' ? 'Keine offenen Eskalationen' : 
               statusFilter === 'acknowledged' ? 'Keine Eskalationen in Bearbeitung' :
               statusFilter === 'resolved' ? 'Keine gelösten Eskalationen' :
               'Keine Eskalationen gefunden'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredEscalations.map(escalation => (
              <div key={escalation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(escalation.status)}
                      {getSeverityBadge(escalation.severity)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        #{escalation.id}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {escalation.plan_title || escalation.title || 'Unbekannte Aufgabe'}
                      {escalation.checklist_item_title && (
                        <span className="text-gray-500 font-normal"> - {escalation.checklist_item_title}</span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {escalation.reason || escalation.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                        </svg>
                        {escalation.machine_name}
                      </span>
                      <span>
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(escalation.created_at).toLocaleString('de-DE')}
                      </span>
                      {escalation.escalated_from_username && (
                        <span>
                          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Gemeldet von: {escalation.escalated_from_username}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex gap-2 ml-4">
                    {escalation.status === 'open' && (
                      <button
                        onClick={() => handleAcknowledge(escalation.id)}
                        className="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                      >
                        Bestätigen
                      </button>
                    )}
                    {(escalation.status === 'open' || escalation.status === 'acknowledged') && (
                      <button
                        onClick={() => {
                          setSelectedEscalation(escalation);
                          setShowResolveModal(true);
                        }}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        Lösen
                      </button>
                    )}
                    {escalation.task_id && (
                      <Link
                        to={`/maintenance/tasks/${escalation.task_id}/execute`}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Zur Aufgabe
                      </Link>
                    )}
                  </div>
                </div>

                {/* Resolution Info */}
                {escalation.status === 'resolved' && escalation.resolution_notes && (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-sm text-green-800 dark:text-green-400">
                      <span className="font-medium">Lösung:</span> {escalation.resolution_notes}
                    </div>
                    {escalation.resolved_at && (
                      <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                        Gelöst am {new Date(escalation.resolved_at).toLocaleString('de-DE')}
                        {escalation.resolved_by_name && ` von ${escalation.resolved_by_name}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedEscalation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Eskalation lösen
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {selectedEscalation.title || `Eskalation #${selectedEscalation.id}`}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lösungsnotizen
              </label>
              <textarea
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                placeholder="Was wurde getan um das Problem zu lösen?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedEscalation(null);
                  setResolveNotes('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Abbrechen
              </button>
              <button
                onClick={handleResolve}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Als gelöst markieren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EscalationsPage;
