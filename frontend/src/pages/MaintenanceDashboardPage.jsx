import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Settings,
  ChevronRight,
  Calendar,
  Users,
  Gauge,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';

export default function MaintenanceDashboardPage() {
  const { 
    dashboard, 
    machineStatus, 
    dueOverview,
    myEscalations,
    loading, 
    error,
    fetchDashboard, 
    fetchMachineStatus,
    fetchDueOverview,
    fetchMyEscalations,
    generateTasks,
    clearError 
  } = useMaintenanceStore();

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        fetchDashboard(),
        fetchMachineStatus(),
        fetchDueOverview(),
        fetchMyEscalations()
      ]);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    }
  };

  const handleGenerateTasks = async () => {
    try {
      setGenerating(true);
      setGenerateResult(null);
      const result = await generateTasks();
      setGenerateResult(result);
      // Refresh dashboard
      await fetchDashboard();
    } catch (err) {
      console.error('Error generating tasks:', err);
    } finally {
      setGenerating(false);
    }
  };

  // Status-Farben
  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
      case 'overdue':
        return 'text-red-500 bg-red-500/10';
      case 'warning':
      case 'due_today':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'due_soon':
        return 'text-orange-500 bg-orange-500/10';
      case 'ok':
        return 'text-green-500 bg-green-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
      case 'overdue':
        return <AlertTriangle className="w-5 h-5" />;
      case 'warning':
      case 'due_today':
        return <Clock className="w-5 h-5" />;
      case 'ok':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <Settings className="w-5 h-5" />;
    }
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      normal: 'bg-blue-500 text-white',
      low: 'bg-gray-500 text-white'
    };
    return colors[priority] || colors.normal;
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wrench className="w-7 h-7" />
            Wartungs-Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Übersicht über Wartungspläne, fällige Aufgaben und Maschinen-Status
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateTasks}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            title="Erstellt Tasks für heute und morgen fällige Wartungen"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generiere...' : 'Tasks generieren (24h)'}
          </button>
          <Link
            to="/maintenance/plans"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Settings className="w-4 h-4" />
            Wartungspläne
          </Link>
        </div>
      </div>

      {/* Generate Result */}
      {generateResult && (
        <div className={`p-4 rounded-lg ${generateResult.created_count > 0 ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-blue-500/10 text-blue-700 dark:text-blue-400'}`}>
          {generateResult.message}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Überfällig */}
          <div className={`p-4 rounded-xl ${dashboard.summary.overdue > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dashboard.summary.overdue > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${dashboard.summary.overdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {dashboard.summary.overdue}
                </div>
                <div className="text-sm text-gray-500">Überfällig</div>
              </div>
            </div>
          </div>

          {/* Heute fällig */}
          <div className={`p-4 rounded-xl ${dashboard.summary.due_today > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dashboard.summary.due_today > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${dashboard.summary.due_today > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                  {dashboard.summary.due_today}
                </div>
                <div className="text-sm text-gray-500">Heute fällig</div>
              </div>
            </div>
          </div>

          {/* Diese Woche */}
          <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboard.summary.due_week}
                </div>
                <div className="text-sm text-gray-500">Diese Woche</div>
              </div>
            </div>
          </div>

          {/* OK */}
          <div className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboard.summary.ok}
                </div>
                <div className="text-sm text-gray-500">OK</div>
              </div>
            </div>
          </div>

          {/* Offene Eskalationen */}
          <div className={`p-4 rounded-xl ${dashboard.summary.open_escalations > 0 ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${dashboard.summary.open_escalations > 0 ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${dashboard.summary.open_escalations > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}`}>
                  {dashboard.summary.open_escalations}
                </div>
                <div className="text-sm text-gray-500">Eskalationen</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Maschinen-Status */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Gauge className="w-5 h-5" />
              Maschinen-Status
            </h2>
            <Link 
              to="/maintenance/machines" 
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Alle anzeigen <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {machineStatus.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Maschinen gefunden</p>
            ) : (
              <div className="space-y-2">
                {machineStatus.slice(0, 8).map((machine) => (
                  <Link 
                    key={machine.id}
                    to={`/maintenance/machines/${machine.id}/stats`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getStatusColor(machine.status)}`}>
                        {getStatusIcon(machine.status)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {machine.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {machine.location || 'Kein Standort'} • {machine.current_operating_hours?.toLocaleString() || 0}h
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {machine.overdue_count > 0 && (
                        <span className="text-red-500 font-medium">{machine.overdue_count} überfällig</span>
                      )}
                      {machine.due_today_count > 0 && (
                        <span className="text-yellow-500 font-medium">{machine.due_today_count} heute</span>
                      )}
                      {machine.due_week_count > 0 && (
                        <span className="text-orange-500">{machine.due_week_count} diese Woche</span>
                      )}
                      {machine.status === 'ok' && (
                        <span className="text-green-500">Alles OK</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Nächste Wartungen */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Nächste Wartungen
            </h2>
            <Link 
              to="/maintenance/plans" 
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Alle <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            {dashboard?.upcoming?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine fälligen Wartungen</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.upcoming?.map((item) => (
                  <Link
                    key={item.id}
                    to={`/maintenance/plans/${item.id}`}
                    className="block p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {item.machine_name} • {item.machine_location || 'Kein Standort'}
                        </div>
                      </div>
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getPriorityBadge(item.priority || 'normal')}`}>
                        {item.priority || 'normal'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.next_due_at ? (
                          new Date(item.next_due_at).toLocaleDateString('de-DE', { 
                            weekday: 'short', 
                            day: '2-digit', 
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        ) : item.next_due_hours ? (
                          `Bei ${item.next_due_hours.toLocaleString('de-DE')}h (aktuell: ${item.current_operating_hours?.toLocaleString('de-DE') || 0}h)`
                        ) : (
                          'Kein Datum'
                        )}
                      </span>
                      {item.estimated_duration_minutes && (
                        <span className="text-gray-400">• ~{item.estimated_duration_minutes} Min.</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Meine Eskalationen (wenn vorhanden) */}
      {myEscalations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-purple-200 dark:border-purple-700">
          <div className="p-4 border-b border-purple-200 dark:border-purple-700 flex items-center justify-between bg-purple-50 dark:bg-purple-900/20">
            <h2 className="text-lg font-semibold text-purple-900 dark:text-purple-200 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Offene Eskalationen für Sie ({myEscalations.length})
            </h2>
            <Link 
              to="/maintenance/escalations" 
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              Alle anzeigen <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4">
            <div className="space-y-2">
              {myEscalations.slice(0, 5).map((escalation) => (
                <Link
                  key={escalation.id}
                  to={`/maintenance/escalations/${escalation.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {escalation.plan_title}
                    </div>
                    <div className="text-sm text-gray-500">
                      {escalation.machine_name} • von {escalation.escalated_from_first_name || escalation.escalated_from_username}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 mt-1 line-clamp-1">
                      {escalation.reason}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      escalation.status === 'open' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-white'
                    }`}>
                      {escalation.status === 'open' ? 'Offen' : 'In Bearbeitung'}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/maintenance/tasks/my"
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Meine Aufgaben</div>
              <div className="text-sm text-gray-500">Heute zu erledigen</div>
            </div>
          </div>
        </Link>

        <Link
          to="/maintenance/operating-hours"
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Betriebsstunden</div>
              <div className="text-sm text-gray-500">Erfassen & Übersicht</div>
            </div>
          </div>
        </Link>

        <Link
          to="/maintenance/plans"
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Wartungspläne</div>
              <div className="text-sm text-gray-500">Verwalten</div>
            </div>
          </div>
        </Link>

        <Link
          to="/maintenance/escalations"
          className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Eskalationen</div>
              <div className="text-sm text-gray-500">Probleme verwalten</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
