import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Play,
  Calendar,
  ChevronRight
} from 'lucide-react';
import axios from '../../utils/axios';

export default function MaintenanceWidget() {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      
      // Hole Dashboard-Statistiken
      const statsResponse = await axios.get('/api/maintenance/dashboard/stats');
      setStats(statsResponse.data.data);

      // Hole die nächsten fälligen Tasks (max 5)
      const tasksResponse = await axios.get('/api/maintenance/tasks/my');
      // Filtere offene Tasks und nimm die ersten 5
      const openTasks = (tasksResponse.data.data || [])
        .filter(t => ['pending', 'assigned', 'in_progress'].includes(t.status))
        .slice(0, 5);
      setTasks(openTasks);
    } catch (error) {
      console.error('Error fetching maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'normal':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
            In Arbeit
          </span>
        );
      case 'assigned':
        return (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
            Zugewiesen
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            Offen
          </span>
        );
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0];
  };

  const isToday = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Meine Aufgaben
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          Meine Aufgaben
        </h2>
        <Link 
          to="/maintenance/tasks/my"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Alle anzeigen →
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {/* Überfällig */}
          <Link 
            to="/maintenance/tasks/my"
            className={`p-3 rounded-lg border transition-all hover:shadow-md ${
              stats.overdue_count > 0 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${stats.overdue_count > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <div>
                <div className={`text-xl font-bold ${stats.overdue_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                  {stats.overdue_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Überfällig</div>
              </div>
            </div>
          </Link>

          {/* Heute fällig */}
          <Link 
            to="/maintenance/tasks/my"
            className={`p-3 rounded-lg border transition-all hover:shadow-md ${
              stats.due_today_count > 0 
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' 
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className={`w-5 h-5 ${stats.due_today_count > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
              <div>
                <div className={`text-xl font-bold ${stats.due_today_count > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500'}`}>
                  {stats.due_today_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Heute</div>
              </div>
            </div>
          </Link>

          {/* In Arbeit */}
          <Link 
            to="/maintenance/tasks/my"
            className={`p-3 rounded-lg border transition-all hover:shadow-md ${
              stats.in_progress_count > 0 
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' 
                : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Play className={`w-5 h-5 ${stats.in_progress_count > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
              <div>
                <div className={`text-xl font-bold ${stats.in_progress_count > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-500'}`}>
                  {stats.in_progress_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">In Arbeit</div>
              </div>
            </div>
          </Link>

          {/* Heute erledigt */}
          <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400">
                  {stats.completed_today_count || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Erledigt</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Tasks List */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Nächste Aufgaben
          </h3>
          {tasks.map((task) => (
            <Link
              key={task.id}
              to={`/maintenance/tasks/${task.id}/${task.status === 'in_progress' ? 'execute' : 'details'}`}
              className={`block p-3 rounded-lg border border-l-4 ${getPriorityColor(task.priority)} border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {task.plan_title || task.title}
                    </span>
                    {getStatusBadge(task.status)}
                    {task.is_shift_critical && (
                      <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Kritisch
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {(task.machine_name || task.machine_location || task.location) && (
                      <span>{task.machine_name || task.machine_location || task.location}</span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${
                        isOverdue(task.due_date) ? 'text-red-500 font-medium' :
                        isToday(task.due_date) ? 'text-orange-500' : ''
                      }`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(task.due_date).toLocaleDateString('de-DE', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </span>
                    )}
                    {task.estimated_duration_minutes && (
                      <span>~{task.estimated_duration_minutes} Min.</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Keine offenen Aufgaben für dich
          </p>
        </div>
      )}
    </div>
  );
}
