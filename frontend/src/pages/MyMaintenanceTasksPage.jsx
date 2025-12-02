import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Play, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  Calendar,
  Gauge,
  Timer,
  RefreshCw,
  User,
  MapPin,
  List,
  Repeat
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';

// Helper für Intervall-Anzeige
const getIntervalText = (task) => {
  if (task.interval_hours) {
    return `${task.interval_hours}h`;
  }
  if (task.interval_type && task.interval_value) {
    const short = {
      hours: 'Std',
      days: 'T',
      weeks: 'W',
      months: 'M',
      years: 'J'
    };
    return `${task.interval_value}${short[task.interval_type] || task.interval_type}`;
  }
  return null;
};

export default function MyTasksPage() {
  const navigate = useNavigate();
  const { 
    myTasks,
    myTasksSummary,
    loading, 
    error,
    fetchMyTasks,
    startTask,
    clearError 
  } = useMaintenanceStore();

  const [activeFilter, setActiveFilter] = useState('all'); // 'completed_today', 'all', 'today', 'upcoming'

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      // Lade ALLE Tasks ohne Datums-Filter
      await fetchMyTasks({});
    } catch (err) {
      console.error('Error loading tasks:', err);
    }
  };

  const handleStartTask = async (taskId) => {
    try {
      await startTask(taskId);
      navigate(`/maintenance/tasks/${taskId}/execute`);
    } catch (err) {
      console.error('Error starting task:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">Offen</span>;
      case 'assigned':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-500 text-white">Zugewiesen</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500 text-white">In Arbeit</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500 text-white">Erledigt</span>;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-4 border-l-red-500';
      case 'high':
        return 'border-l-4 border-l-orange-500';
      case 'normal':
        return 'border-l-4 border-l-blue-500';
      case 'low':
        return 'border-l-4 border-l-gray-400';
      default:
        return '';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} Min.`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Gruppiere Tasks nach Status (für alte Referenzen)
  const inProgressTasks = myTasks.filter(t => t.status === 'in_progress');

  // Berechne Statistiken für Filter-Karten
  const today = new Date().toISOString().split('T')[0];
  const completedTodayTasks = myTasks.filter(t => 
    t.status === 'completed' && 
    t.completed_at && 
    new Date(t.completed_at).toISOString().split('T')[0] === today
  );
  const allOpenTasks = myTasks.filter(t => 
    t.status === 'pending' || t.status === 'assigned' || t.status === 'in_progress'
  );
  const todayTasks = allOpenTasks.filter(t => 
    t.due_date && new Date(t.due_date).toISOString().split('T')[0] === today
  );
  const upcomingTasks = allOpenTasks.filter(t => 
    t.due_date && new Date(t.due_date).toISOString().split('T')[0] > today
  );
  const overdueTasks = allOpenTasks.filter(t => 
    t.due_date && new Date(t.due_date).toISOString().split('T')[0] < today
  );

  // Gefilterte Tasks basierend auf activeFilter
  const getFilteredTasks = () => {
    switch (activeFilter) {
      case 'completed_today':
        return completedTodayTasks;
      case 'today':
        return [...overdueTasks, ...todayTasks.filter(t => t.status === 'in_progress' || t.status === 'pending' || t.status === 'assigned')];
      case 'upcoming':
        return upcomingTasks;
      case 'all':
      default:
        return allOpenTasks;
    }
  };

  const filteredTasks = getFilteredTasks();
  const filteredInProgress = filteredTasks.filter(t => t.status === 'in_progress');
  const filteredPending = filteredTasks.filter(t => t.status === 'pending' || t.status === 'assigned');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7" />
            Meine Aufgaben
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Ihre Wartungsaufgaben im Überblick
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          title="Aktualisieren"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Klickbare Filter-Karten */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Heute erledigt */}
        <div 
          onClick={() => setActiveFilter('completed_today')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'completed_today'
              ? 'bg-green-100 dark:bg-green-900/40 border-green-500 ring-2 ring-green-500'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {completedTodayTasks.length}
              </div>
              <div className="text-sm text-green-600 dark:text-green-500">Heute erledigt</div>
            </div>
          </div>
        </div>

        {/* Alle Offen */}
        <div 
          onClick={() => setActiveFilter('all')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-500 ring-2 ring-blue-500'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:border-blue-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <List className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {allOpenTasks.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-500">Alle offen</div>
            </div>
          </div>
        </div>

        {/* Heute fällig */}
        <div 
          onClick={() => setActiveFilter('today')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'today'
              ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-500 ring-2 ring-orange-500'
              : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/20 text-orange-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {todayTasks.length + overdueTasks.length}
              </div>
              <div className="text-sm text-orange-600 dark:text-orange-500">
                Heute{overdueTasks.length > 0 ? ` (+${overdueTasks.length} überfällig)` : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Bald fällig */}
        <div 
          onClick={() => setActiveFilter('upcoming')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeFilter === 'upcoming'
              ? 'bg-gray-200 dark:bg-gray-700 border-gray-500 ring-2 ring-gray-500'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-500/20 text-gray-500">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {upcomingTasks.length}
              </div>
              <div className="text-sm text-gray-500">Bald fällig</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && !myTasks.length && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* No Tasks */}
      {!loading && filteredTasks.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {activeFilter === 'completed_today' ? 'Noch keine Aufgaben erledigt' :
             activeFilter === 'today' ? 'Keine Aufgaben für heute' :
             activeFilter === 'upcoming' ? 'Keine kommenden Aufgaben' :
             'Keine offenen Aufgaben'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {activeFilter === 'completed_today' ? 'Sie haben heute noch keine Wartungsaufgaben abgeschlossen.' :
             activeFilter === 'today' ? 'Alle Aufgaben für heute sind erledigt oder es stehen keine an.' :
             activeFilter === 'upcoming' ? 'Es sind keine Aufgaben für die nächsten Tage geplant.' :
             'Super! Sie haben keine offenen Wartungsaufgaben.'}
          </p>
        </div>
      )}

      {/* In Progress Tasks */}
      {filteredInProgress.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-yellow-500" />
            In Arbeit ({filteredInProgress.length})
          </h2>
          {filteredInProgress.map((task) => (
            <Link
              key={task.id}
              to={`/maintenance/tasks/${task.id}/execute`}
              className={`block bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.plan_title || task.title}
                      </h3>
                      {getStatusBadge(task.status)}
                      {getIntervalText(task) && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          {getIntervalText(task)}
                        </span>
                      )}
                      {task.is_shift_critical && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Schicht-kritisch
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {task.machine_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {task.machine_location || 'Kein Standort'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        ~{task.estimated_duration_minutes || '?'} Min.
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${
                          new Date(task.due_date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0]
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : new Date(task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                              ? 'text-orange-600 dark:text-orange-400'
                              : ''
                        }`}>
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {task.required_skill_level && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          task.required_skill_level === 'specialist' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          task.required_skill_level === 'technician' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          task.required_skill_level === 'operator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {task.required_skill_level === 'specialist' ? 'Spezialist' :
                           task.required_skill_level === 'technician' ? 'Techniker' :
                           task.required_skill_level === 'operator' ? 'Bediener' : 'Helfer'}
                        </span>
                      )}
                    </div>

                    {/* Progress */}
                    {task.total_checklist_items > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">Fortschritt</span>
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {task.completed_checklist_items} / {task.total_checklist_items}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all"
                            style={{ width: `${(task.completed_checklist_items / task.total_checklist_items) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <ChevronRight className="w-6 h-6 text-gray-400 ml-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pending Tasks */}
      {filteredPending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Zu erledigen ({filteredPending.length})
          </h2>
          {filteredPending.map((task) => (
            <div
              key={task.id}
              className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow ${getPriorityColor(task.priority)}`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.plan_title || task.title}
                      </h3>
                      {getStatusBadge(task.status)}
                      {getIntervalText(task) && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Repeat className="w-3 h-3" />
                          {getIntervalText(task)}
                        </span>
                      )}
                      {task.is_shift_critical && (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Schicht-kritisch
                          {task.shift_deadline_time && ` bis ${task.shift_deadline_time.substring(0, 5)}`}
                        </span>
                      )}
                    </div>

                    {task.plan_description && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {task.plan_description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Gauge className="w-4 h-4" />
                        {task.machine_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {task.machine_location || 'Kein Standort'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        ~{task.estimated_duration_minutes || '?'} Min.
                      </span>
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${
                          new Date(task.due_date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0]
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : new Date(task.due_date).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]
                              ? 'text-orange-600 dark:text-orange-400'
                              : ''
                        }`}>
                          <Calendar className="w-4 h-4" />
                          {new Date(task.due_date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                      )}
                      {task.total_checklist_items > 0 && (
                        <span className="text-gray-400">
                          {task.total_checklist_items} Schritte
                        </span>
                      )}
                      {task.required_skill_level && (
                        <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                          task.required_skill_level === 'specialist' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                          task.required_skill_level === 'technician' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                          task.required_skill_level === 'operator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {task.required_skill_level === 'specialist' ? 'Spezialist' :
                           task.required_skill_level === 'technician' ? 'Techniker' :
                           task.required_skill_level === 'operator' ? 'Bediener' : 'Helfer'}
                        </span>
                      )}
                    </div>

                    {/* Safety Notes Preview */}
                    {task.safety_notes && (
                      <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm">
                        <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          {task.safety_notes.substring(0, 100)}
                          {task.safety_notes.length > 100 && '...'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 ml-4 whitespace-nowrap"
                  >
                    <Play className="w-4 h-4" />
                    Starten
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Links */}
      <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <Link
          to="/maintenance"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Zurück zum Dashboard
        </Link>
        <Link
          to="/maintenance/tasks"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
        >
          Alle Aufgaben anzeigen
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
