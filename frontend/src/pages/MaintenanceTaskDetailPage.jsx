import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Wrench,
  FileText,
  ChevronDown,
  ChevronUp,
  Play,
  Loader2
} from 'lucide-react';
import axios from '../utils/axios';
import API_BASE_URL from '../config/api';
import { useMaintenanceStore } from '../stores/maintenanceStore';

export default function MaintenanceTaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startTask } = useMaintenanceStore();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/maintenance/tasks/${id}/details`);
      if (response.data.success) {
        setTask(response.data.data);
      } else {
        setError('Task nicht gefunden');
      }
    } catch (err) {
      console.error('Fehler beim Laden:', err);
      setError('Fehler beim Laden der Task-Details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      setStarting(true);
      await startTask(id);
      navigate(`/maintenance/tasks/${id}/execute`);
    } catch (err) {
      console.error('Fehler beim Starten:', err);
      setError(err.message || 'Fehler beim Starten der Aufgabe');
      setStarting(false);
    }
  };

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-500 text-white',
      cancelled: 'bg-gray-500 text-white',
      in_progress: 'bg-blue-500 text-white',
      assigned: 'bg-yellow-500 text-white',
      pending: 'bg-gray-400 text-white',
      escalated: 'bg-red-500 text-white'
    };
    const labels = {
      completed: 'Erledigt',
      cancelled: 'Abgebrochen',
      in_progress: 'In Bearbeitung',
      assigned: 'Zugewiesen',
      pending: 'Offen',
      escalated: 'Eskaliert'
    };
    return (
      <span className={`px-3 py-1 text-sm rounded-full ${styles[status] || 'bg-gray-500 text-white'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          {error || 'Task nicht gefunden'}
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-700"
        >
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {task.plan_title || task.title || 'Wartungsaufgabe'}
            </h1>
            {getStatusBadge(task.status)}
          </div>
          {task.machine_name && (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {task.machine_name} • {task.machine_location}
            </p>
          )}
        </div>
        
        {/* Action Buttons */}
        {['pending', 'assigned', 'in_progress'].includes(task.status) && (
          <button
            onClick={handleStartTask}
            disabled={starting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {task.status === 'in_progress' ? 'Fortsetzen' : 'Aufgabe starten'}
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Fällig am */}
        {task.due_date && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                <Calendar className={`w-5 h-5 ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-500' : 'text-orange-500'}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fällig am</p>
                <p className={`text-sm font-medium ${new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                  {new Date(task.due_date).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Erstellt */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Erstellt</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(task.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Zugewiesen an */}
        {task.assigned_to_name && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Zugewiesen an</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {task.assigned_to_name}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Abgeschlossen */}
        {task.completed_at && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Abgeschlossen</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(task.completed_at).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                  {task.completed_by_name && (
                    <span className="text-gray-500 dark:text-gray-400 ml-1">
                      von {task.completed_by_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Dauer */}
        {(task.estimated_duration_minutes || task.actual_duration_minutes) && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dauer</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {task.actual_duration_minutes ? (
                    <>
                      {task.actual_duration_minutes} Min.
                      {task.estimated_duration_minutes && (
                        <span className="text-gray-500 ml-1">(geplant: {task.estimated_duration_minutes})</span>
                      )}
                    </>
                  ) : (
                    <>~{task.estimated_duration_minutes} Min.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Aufgaben-Details (Beschreibung, Priorität, Standort, Skill-Level) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Aufgaben-Details
          </h2>
        </div>
        <div className="p-4 space-y-4">
          {/* Priorität & Skill-Level & Standort in einer Zeile */}
          <div className="flex flex-wrap gap-3">
            {task.priority && (
              <span className={`px-3 py-1 text-sm rounded-full ${
                task.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                task.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                task.priority === 'normal' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                Priorität: {task.priority === 'critical' ? 'Kritisch' : task.priority === 'high' ? 'Hoch' : task.priority === 'normal' ? 'Normal' : 'Niedrig'}
              </span>
            )}
            {task.required_skill_level && (
              <span className={`px-3 py-1 text-sm rounded-full ${
                task.required_skill_level === 'specialist' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                task.required_skill_level === 'technician' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                task.required_skill_level === 'operator' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                Skill: {task.required_skill_level === 'specialist' ? 'Spezialist' : 
                        task.required_skill_level === 'technician' ? 'Techniker' : 
                        task.required_skill_level === 'operator' ? 'Bediener' : 'Helfer'}
              </span>
            )}
            {task.machine_location && (
              <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                📍 {task.machine_location}
              </span>
            )}
            {!task.maintenance_plan_id && (
              <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                Allgemeine Aufgabe
              </span>
            )}
          </div>

          {/* Beschreibung */}
          {task.description ? (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Beschreibung</h4>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">Keine Beschreibung vorhanden</p>
          )}
        </div>
      </div>

      {/* Notizen & Probleme */}
      {(task.notes || task.issues_found) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {task.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-5 h-5 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Abschluss-Notizen</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {task.notes}
              </p>
            </div>
          )}

          {task.issues_found && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 shadow-sm border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <h3 className="font-medium text-red-700 dark:text-red-400">Gefundene Probleme</h3>
              </div>
              <p className="text-red-600 dark:text-red-300 whitespace-pre-wrap">
                {task.issues_found}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Checklist Ergebnisse */}
      {task.checklist_results?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Checkliste ({task.checklist_results.filter(i => i.completed).length}/{task.checklist_results.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {task.checklist_results.map((item) => (
              <div key={item.id} className="p-4">
                <div 
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleItem(item.id)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {item.completed ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className={`font-medium ${item.completed ? 'text-gray-900 dark:text-white' : 'text-gray-500'}`}>
                        {item.title}
                        {item.is_critical && (
                          <span className="ml-2 text-xs text-red-500">Kritisch</span>
                        )}
                      </p>
                      {(item.requires_measurement || item.requires_photo) && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {item.requires_measurement && `Messwert (${item.min_value || '?'} - ${item.max_value || '?'} ${item.measurement_unit || ''})`}
                          {item.requires_measurement && item.requires_photo && ' • '}
                          {item.requires_photo && 'Foto erforderlich'}
                        </span>
                      )}
                    </div>
                  </div>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                    {expandedItems[item.id] ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Erweiterte Details */}
                {expandedItems[item.id] && item.completed && (
                  <div className="mt-3 ml-8 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
                    {/* Messwert */}
                    {item.measurement_value !== null && item.measurement_value !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Messwert:</span>
                        <span className={`text-sm font-medium ${
                          (item.min_value && parseFloat(item.measurement_value) < parseFloat(item.min_value)) ||
                          (item.max_value && parseFloat(item.measurement_value) > parseFloat(item.max_value))
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {item.measurement_value} {item.measurement_unit || ''}
                        </span>
                      </div>
                    )}

                    {/* Notizen */}
                    {item.completion_notes && (
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Notiz: </span>
                        <span className="text-gray-900 dark:text-white">{item.completion_notes}</span>
                      </div>
                    )}

                    {/* Foto */}
                    {item.photo_path && (
                      <div className="pt-2">
                        <a 
                          href={`${API_BASE_URL}${item.photo_path}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img 
                            src={`${API_BASE_URL}${item.photo_path}`}
                            alt="Wartungsfoto" 
                            className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                    )}

                    {/* Bearbeiter & Zeit */}
                    {item.completed_by_name && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
                        {item.completed_by_name} • {new Date(item.completed_at).toLocaleString('de-DE')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link zum Plan */}
      {task.maintenance_plan_id && (
        <div className="flex justify-end">
          <Link
            to={`/maintenance/plans/${task.maintenance_plan_id}`}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            Zum Wartungsplan →
          </Link>
        </div>
      )}
    </div>
  );
}
