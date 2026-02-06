import { useState, useEffect, useCallback } from 'react';
import axios from '../../utils/axios';
import Breadcrumbs from '../../components/Breadcrumbs';

const HEALTH_CONFIG = {
  healthy: { label: 'Aktiv', color: 'bg-green-500', textColor: 'text-green-400', bgColor: 'bg-green-500/10' },
  error: { label: 'Fehler', color: 'bg-red-500', textColor: 'text-red-400', bgColor: 'bg-red-500/10' },
  stale: { label: 'Überfällig', color: 'bg-yellow-500', textColor: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
  running: { label: 'Läuft...', color: 'bg-blue-500 animate-pulse', textColor: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  unknown: { label: 'Unbekannt', color: 'bg-gray-500', textColor: 'text-gray-400', bgColor: 'bg-gray-500/10' }
};

function formatDuration(ms) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`;
}

function formatResult(jobName, result) {
  if (!result) return '-';
  if (jobName === 'auto_close_open_days') {
    return `${result.processed || 0} User geprüft, ${result.closed || 0} Tage abgeschlossen`;
  }
  if (jobName === 'backup_monitor') {
    if (result.status === 'no_backups') return '⚠ Keine Backups gefunden';
    const latest = result.latest;
    return `${result.status === 'ok' ? '✓' : '⚠'} ${result.backup_count} Backups, neuestes: ${latest?.size_mb} MB (vor ${latest?.age_hours}h), gesamt: ${result.total_size_mb} MB`;
  }
  if (jobName === 'generate_absence_entries') {
    let text = `${result.processed || 0} User geprüft, ${result.created || 0} Einträge erstellt`;
    if (result.created > 0 && result.details?.length > 0) {
      const statusCounts = {};
      result.details.forEach(d => d.entries?.forEach(e => {
        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
      }));
      const statusLabels = { holiday: 'Feiertag', absent: 'Abwesend', Urlaub: 'Urlaub', Krank: 'Krank', Schulung: 'Schulung', Sonderurlaub: 'Sonderurlaub' };
      const parts = Object.entries(statusCounts).map(([s, c]) => `${c}× ${statusLabels[s] || s}`);
      text += ` (${parts.join(', ')})`;
    }
    if (result.errors?.length > 0) text += ` ⚠ ${result.errors.length} Fehler`;
    return text;
  }
  return JSON.stringify(result);
}

export default function CronJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/system/cron/status');
      setJobs(response.data);
      setError(null);
    } catch (err) {
      setError('Fehler beim Laden des Cron-Status');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-Refresh alle 30 Sekunden
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleTrigger = async (jobName) => {
    if (!confirm(`Job "${jobName}" jetzt manuell ausführen?`)) return;
    setTriggering(jobName);
    try {
      await axios.post(`/api/system/cron/trigger/${jobName}`);
      await fetchStatus();
    } catch (err) {
      alert(err.response?.data?.error || 'Fehler beim Auslösen des Jobs');
    } finally {
      setTriggering(null);
    }
  };

  const toggleHistory = (jobName) => {
    setExpandedJob(expandedJob === jobName ? null : jobName);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  // Gesamtstatus berechnen
  const allHealthy = jobs.every(j => j.health === 'healthy');
  const hasErrors = jobs.some(j => j.health === 'error');
  const hasStale = jobs.some(j => j.health === 'stale');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Administration' },
        { label: 'Automatische Aufgaben' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Automatische Aufgaben
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Zeitgesteuerte Hintergrundprozesse
          </p>
        </div>

        {/* Gesamtstatus */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          hasErrors ? 'bg-red-500/10 text-red-400' :
          hasStale ? 'bg-yellow-500/10 text-yellow-400' :
          allHealthy ? 'bg-green-500/10 text-green-400' :
          'bg-gray-500/10 text-gray-400'
        }`}>
          <div className={`w-2.5 h-2.5 rounded-full ${
            hasErrors ? 'bg-red-500' :
            hasStale ? 'bg-yellow-500' :
            allHealthy ? 'bg-green-500' :
            'bg-gray-500'
          }`} />
          <span className="text-sm font-medium">
            {hasErrors ? 'Fehler vorhanden' :
             hasStale ? 'Jobs überfällig' :
             allHealthy ? 'Alle Jobs aktiv' :
             'Status unbekannt'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Job-Karten */}
      <div className="space-y-4">
        {jobs.map(job => {
          const health = HEALTH_CONFIG[job.health] || HEALTH_CONFIG.unknown;
          const isExpanded = expandedJob === job.name;
          const lastRun = job.last_run;

          return (
            <div key={job.name} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Job Header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Health Indicator */}
                    <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 ${health.color}`} />

                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {job.description || job.name}
                        </h2>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${health.bgColor} ${health.textColor}`}>
                          {health.label}
                        </span>
                      </div>

                      {/* Schedule */}
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {job.schedule}
                        </span>
                        <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {job.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrigger(job.name)}
                      disabled={triggering === job.name}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                               bg-blue-100 text-blue-700 hover:bg-blue-200
                               dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {triggering === job.name ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Läuft...
                        </span>
                      ) : '▶ Ausführen'}
                    </button>
                    <button
                      onClick={() => toggleHistory(job.name)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                               bg-gray-100 text-gray-700 hover:bg-gray-200
                               dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      {isExpanded ? '▲ Historie' : '▼ Historie'}
                    </button>
                  </div>
                </div>

                {/* Letzter Lauf Info */}
                {lastRun && (
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Letzter Lauf: </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatDateTime(lastRun.started_at)}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 ml-1.5">
                        ({timeAgo(lastRun.started_at)})
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Dauer: </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {formatDuration(lastRun.duration_ms)}
                      </span>
                    </div>
                    {lastRun.status === 'success' && lastRun.result && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Ergebnis: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatResult(job.name, lastRun.result)}
                        </span>
                      </div>
                    )}
                    {lastRun.status === 'error' && lastRun.error_message && (
                      <div className="w-full">
                        <span className="text-red-400">Fehler: </span>
                        <span className="text-red-300">{lastRun.error_message}</span>
                      </div>
                    )}
                  </div>
                )}

                {!lastRun && (
                  <p className="mt-3 text-sm text-gray-400 italic">Noch nie ausgeführt</p>
                )}
              </div>

              {/* Historie (aufklappbar) */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Letzte Ausführungen
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {job.history && job.history.length > 0 ? (
                      job.history.map(run => (
                        <div key={run.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                          {/* Status-Punkt */}
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            run.status === 'success' ? 'bg-green-500' :
                            run.status === 'error' ? 'bg-red-500' :
                            run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            'bg-gray-500'
                          }`} />

                          {/* Zeitpunkt */}
                          <span className="text-gray-900 dark:text-white w-44 flex-shrink-0">
                            {formatDateTime(run.started_at)}
                          </span>

                          {/* Status */}
                          <span className={`w-16 flex-shrink-0 font-medium ${
                            run.status === 'success' ? 'text-green-400' :
                            run.status === 'error' ? 'text-red-400' :
                            'text-blue-400'
                          }`}>
                            {run.status === 'success' ? '✓ OK' :
                             run.status === 'error' ? '✗ Fehler' :
                             '⟳ Läuft'}
                          </span>

                          {/* Dauer */}
                          <span className="text-gray-500 dark:text-gray-400 w-16 flex-shrink-0">
                            {formatDuration(run.duration_ms)}
                          </span>

                          {/* Ergebnis / Fehler */}
                          <span className="text-gray-500 dark:text-gray-400 truncate">
                            {run.status === 'error' && run.error_message 
                              ? run.error_message
                              : formatResult(job.name, run.result)
                            }
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="px-5 py-4 text-sm text-gray-400 italic">
                        Keine Einträge vorhanden
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Keine Cron-Jobs registriert.
        </div>
      )}
    </div>
  );
}
