import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Settings, 
  AlertTriangle, 
  Clock, 
  Calendar,
  CheckCircle,
  AlertCircle,
  ClipboardList,
  Zap
} from 'lucide-react';
import axios from '../../utils/axios';

export default function MaintenanceOverviewWidget() {
  const [planStats, setPlanStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Zwei parallele API-Calls
      const [planResponse, taskResponse] = await Promise.all([
        axios.get('/api/maintenance/dashboard'),      // Plan-Stats (1. Reihe)
        axios.get('/api/maintenance/dashboard/stats') // Task-Stats (2. Reihe)
      ]);
      
      setPlanStats(planResponse.data.data);
      setTaskStats(taskResponse.data.data);
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Wartung
        </h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Wartung
        </h2>
        <Link 
          to="/maintenance"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Dashboard →
        </Link>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Übersicht über Wartungspläne und fällige Aufgaben
      </p>

      {/* 1. Reihe: Plan-Stats (wie Wartungs-Dashboard) */}
      {planStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
          {/* Überfällig */}
          <div className={`p-3 rounded-lg ${
            planStats.summary?.overdue > 0 
              ? 'bg-red-900/40 border border-red-700' 
              : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${planStats.summary?.overdue > 0 ? 'text-red-400' : 'text-gray-500'}`} />
              <div>
                <div className={`text-xl font-bold ${planStats.summary?.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {planStats.summary?.overdue || 0}
                </div>
                <div className="text-xs text-gray-400">Überfällig</div>
              </div>
            </div>
          </div>

          {/* Heute fällig */}
          <div className={`p-3 rounded-lg ${
            planStats.summary?.due_today > 0 
              ? 'bg-yellow-900/40 border border-yellow-700' 
              : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${planStats.summary?.due_today > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
              <div>
                <div className={`text-xl font-bold ${planStats.summary?.due_today > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                  {planStats.summary?.due_today || 0}
                </div>
                <div className="text-xs text-gray-400">Heute fällig</div>
              </div>
            </div>
          </div>

          {/* Diese Woche */}
          <div className={`p-3 rounded-lg ${
            planStats.summary?.due_week > 0 
              ? 'bg-orange-900/40 border border-orange-700' 
              : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${planStats.summary?.due_week > 0 ? 'text-orange-400' : 'text-gray-500'}`} />
              <div>
                <div className={`text-xl font-bold ${planStats.summary?.due_week > 0 ? 'text-orange-400' : 'text-gray-400'}`}>
                  {planStats.summary?.due_week || 0}
                </div>
                <div className="text-xs text-gray-400">Diese Woche</div>
              </div>
            </div>
          </div>

          {/* OK */}
          <div className="p-3 rounded-lg bg-green-900/40 border border-green-700">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-xl font-bold text-green-400">
                  {planStats.summary?.ok || 0}
                </div>
                <div className="text-xs text-gray-400">OK</div>
              </div>
            </div>
          </div>

          {/* Eskalationen */}
          <div className={`p-3 rounded-lg ${
            planStats.summary?.open_escalations > 0 
              ? 'bg-purple-900/40 border border-purple-700' 
              : 'bg-gray-700/50 border border-gray-600'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${planStats.summary?.open_escalations > 0 ? 'text-purple-400' : 'text-gray-500'}`} />
              <div>
                <div className={`text-xl font-bold ${planStats.summary?.open_escalations > 0 ? 'text-purple-400' : 'text-gray-400'}`}>
                  {planStats.summary?.open_escalations || 0}
                </div>
                <div className="text-xs text-gray-400">Eskalationen</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Reihe: Task-Stats (gleiches Design wie 1. Reihe) */}
      {taskStats && (
        <>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Aufgaben</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-6">
            {/* Alle */}
            <Link 
              to="/maintenance/tasks"
              className="p-3 rounded-lg bg-blue-900/40 border border-blue-700 hover:bg-blue-900/60 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="text-xl font-bold text-blue-400">
                    {(taskStats.total_open_count || 0) + (taskStats.completed_today_count || 0)}
                  </div>
                  <div className="text-xs text-gray-400">Alle</div>
                </div>
              </div>
            </Link>

            {/* Offen */}
            <Link 
              to="/maintenance/tasks?status=pending"
              className={`p-3 rounded-lg ${
                taskStats.total_open_count > 0 
                  ? 'bg-red-900/40 border border-red-700' 
                  : 'bg-gray-700/50 border border-gray-600'
              } hover:opacity-80 transition-colors`}
            >
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${taskStats.total_open_count > 0 ? 'text-red-400' : 'text-gray-500'}`} />
                <div>
                  <div className={`text-xl font-bold ${taskStats.total_open_count > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {taskStats.total_open_count || 0}
                  </div>
                  <div className="text-xs text-gray-400">Offen</div>
                </div>
              </div>
            </Link>

            {/* In Arbeit */}
            <Link 
              to="/maintenance/tasks?status=in_progress"
              className={`p-3 rounded-lg ${
                taskStats.in_progress_count > 0 
                  ? 'bg-yellow-900/40 border border-yellow-700' 
                  : 'bg-gray-700/50 border border-gray-600'
              } hover:opacity-80 transition-colors`}
            >
              <div className="flex items-center gap-2">
                <Zap className={`w-5 h-5 ${taskStats.in_progress_count > 0 ? 'text-yellow-400' : 'text-gray-500'}`} />
                <div>
                  <div className={`text-xl font-bold ${taskStats.in_progress_count > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {taskStats.in_progress_count || 0}
                  </div>
                  <div className="text-xs text-gray-400">In Arbeit</div>
                </div>
              </div>
            </Link>

            {/* Erledigt */}
            <Link 
              to="/maintenance/tasks?status=completed"
              className="p-3 rounded-lg bg-green-900/40 border border-green-700 hover:opacity-80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {taskStats.completed_today_count || 0}
                  </div>
                  <div className="text-xs text-gray-400">Erledigt</div>
                </div>
              </div>
            </Link>

            {/* Allgemein (Standalone Tasks) */}
            <div className="p-3 rounded-lg bg-gray-700/50 border border-gray-600">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="text-xl font-bold text-gray-400">
                    {taskStats.standalone_count || 0}
                  </div>
                  <div className="text-xs text-gray-400">Allgemein</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Kürzlich abgeschlossen */}
      {taskStats?.recent_completions?.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Kürzlich abgeschlossen
          </h3>
          <div className="space-y-2">
            {taskStats.recent_completions.slice(0, 3).map((task) => (
              <div 
                key={task.id}
                className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {task.title}
                  </span>
                  {task.machine_name && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                      • {task.machine_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {task.completed_by_name && (
                    <span className="text-xs text-blue-500 dark:text-blue-400 hidden md:inline">
                      {task.completed_by_name}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(task.completed_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
