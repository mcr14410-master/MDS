import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Wrench, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Activity,
  TrendingUp,
  Settings,
  Timer,
  BarChart3
} from 'lucide-react';
import axios from '../utils/axios';

export default function MachineMaintenanceStatsPage() {
  const { id } = useParams();
  const [machine, setMachine] = useState(null);
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [upcomingPlans, setUpcomingPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`/api/maintenance/machines/${id}/stats`);
      const data = response.data.data;

      setMachine(data.machine);
      setStats(data.stats);
      setRecentTasks(data.recent_tasks || []);
      setUpcomingPlans(data.upcoming_plans || []);
    } catch (err) {
      console.error('Error fetching machine stats:', err);
      setError(err.response?.data?.message || 'Fehler beim Laden der Statistiken');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">Offen</span>,
      'assigned': <span className="px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">Zugewiesen</span>,
      'in_progress': <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">In Arbeit</span>,
      'completed': <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">Erledigt</span>,
      'cancelled': <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">Abgebrochen</span>,
    };
    return badges[status] || status;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/maintenance/machines" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Übersicht
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/maintenance/machines" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              {machine?.name}
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 ml-8">
            Wartungsstatistik • {machine?.location}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/maintenance/plans?machine=${id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Wartungspläne
          </Link>
          <Link
            to={`/machines`}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4" />
            Stammdaten
          </Link>
        </div>
      </div>

      {/* Maschinen-Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Maschinentyp</div>
            <div className="font-medium text-gray-900 dark:text-white mt-1">
              {machine?.machine_type || '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Steuerung</div>
            <div className="font-medium text-gray-900 dark:text-white mt-1">
              {machine?.control_type || '-'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Betriebsstunden</div>
            <div className="font-mono font-bold text-xl text-gray-900 dark:text-white mt-1">
              {machine?.current_operating_hours?.toLocaleString('de-DE') || '0'} h
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
            <div className="mt-1">
              {machine?.is_active ? (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                  Aktiv
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                  Inaktiv
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistik-Karten */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Wartungspläne */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_plans || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Wartungspläne</div>
              </div>
            </div>
          </div>

          {/* Überfällig */}
          <div className={`rounded-xl shadow-sm border p-4 ${
            stats.overdue_count > 0 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                stats.overdue_count > 0 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  stats.overdue_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                }`}>{stats.overdue_count || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Überfällig</div>
              </div>
            </div>
          </div>

          {/* Heute fällig */}
          <div className={`rounded-xl shadow-sm border p-4 ${
            stats.due_today_count > 0 
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                stats.due_today_count > 0 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  stats.due_today_count > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'
                }`}>{stats.due_today_count || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Heute fällig</div>
              </div>
            </div>
          </div>

          {/* Diese Woche */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.due_week_count || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Diese Woche</div>
              </div>
            </div>
          </div>

          {/* Abgeschlossen (30 Tage) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed_30_days || 0}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Letzte 30 Tage</div>
              </div>
            </div>
          </div>

          {/* Gesamtzeit (30 Tage) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatDuration(stats.total_duration_30_days)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Wartungszeit</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Zwei-Spalten Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Letzte Wartungen */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              Letzte Wartungen
            </h2>
          </div>
          <div className="p-4">
            {recentTasks.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Noch keine Wartungen durchgeführt
              </p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/maintenance/tasks/${task.id}/details`}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {task.plan_title}
                          </span>
                          {getStatusBadge(task.status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {task.completed_at && (
                            <span>
                              {new Date(task.completed_at).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                          {task.actual_duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Timer className="w-3 h-3" />
                              {task.actual_duration_minutes} Min.
                            </span>
                          )}
                          {task.completed_by_name && (
                            <span>{task.completed_by_name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Anstehende Wartungen */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Anstehende Wartungen
            </h2>
          </div>
          <div className="p-4">
            {upcomingPlans.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Keine anstehenden Wartungen
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingPlans.map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/maintenance/plans/${plan.id}`}
                    className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">
                            {plan.title}
                          </span>
                          {plan.is_shift_critical && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                              Schicht-kritisch
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {plan.next_due_at && (
                            <span className={`flex items-center gap-1 ${
                              new Date(plan.next_due_at) < new Date() ? 'text-red-500 font-medium' :
                              new Date(plan.next_due_at).toDateString() === new Date().toDateString() ? 'text-orange-500' : ''
                            }`}>
                              <Calendar className="w-3 h-3" />
                              {new Date(plan.next_due_at).toLocaleDateString('de-DE', {
                                weekday: 'short',
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                          {plan.next_due_hours && (
                            <span className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              Bei {plan.next_due_hours.toLocaleString('de-DE')}h
                            </span>
                          )}
                          {plan.interval_type && (
                            <span>Alle {plan.interval_value} {plan.interval_type}</span>
                          )}
                          {plan.interval_hours && (
                            <span>Alle {plan.interval_hours}h</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="flex items-center gap-4 text-sm">
        <Link
          to="/maintenance/machines"
          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          ← Zurück zur Übersicht
        </Link>
        <Link
          to="/maintenance/tasks"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Alle Aufgaben anzeigen
        </Link>
      </div>
    </div>
  );
}
