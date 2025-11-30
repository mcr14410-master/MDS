import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useUsersStore } from '../stores/usersStore';
import { useMachinesStore } from '../stores/machinesStore';

function AllTasksPage() {
  const { 
    tasks,
    loading,
    error,
    fetchAllTasks,
    assignTask,
    generateTasks,
    createStandaloneTask,
    completeStandaloneTask,
    deleteStandaloneTask
  } = useMaintenanceStore();
  
  const { users, fetchUsers } = useUsersStore();
  const { machines, fetchMachines } = useMachinesStore();
  
  const [statusFilter, setStatusFilter] = useState('pending,assigned,in_progress');
  const [machineFilter, setMachineFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState(null);
  
  // Neue Aufgabe Modal
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'normal',
    due_date: '',
    assigned_to: '',
    estimated_duration_minutes: '',
    machine_id: ''
  });
  const [savingTask, setSavingTask] = useState(false);

  // Lade ALLE Tasks einmal, filtere im Frontend
  useEffect(() => {
    fetchAllTasks();
    fetchUsers();
    fetchMachines();
  }, []);

  const reloadTasks = () => {
    fetchAllTasks();
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    setGenerateResult(null);
    try {
      const result = await generateTasks();
      setGenerateResult(result);
      reloadTasks();
      setTimeout(() => setGenerateResult(null), 5000);
    } catch (err) {
      setGenerateResult({ error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  const handleAssign = async (taskId, userId) => {
    try {
      await assignTask(taskId, userId || null);
      reloadTasks();
    } catch (err) {
      console.error('Fehler beim Zuweisen:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setSavingTask(true);
    try {
      await createStandaloneTask({
        ...newTaskForm,
        assigned_to: newTaskForm.assigned_to || null,
        machine_id: newTaskForm.machine_id || null,
        estimated_duration_minutes: newTaskForm.estimated_duration_minutes ? parseInt(newTaskForm.estimated_duration_minutes) : null
      });
      setShowNewTaskModal(false);
      setNewTaskForm({
        title: '',
        description: '',
        location: '',
        priority: 'normal',
        due_date: '',
        assigned_to: '',
        estimated_duration_minutes: '',
        machine_id: ''
      });
      reloadTasks();
    } catch (err) {
      console.error('Fehler beim Erstellen:', err);
    } finally {
      setSavingTask(false);
    }
  };

  const handleCompleteStandalone = async (taskId) => {
    try {
      await completeStandaloneTask(taskId);
      reloadTasks();
    } catch (err) {
      console.error('Fehler beim Abschließen:', err);
    }
  };

  const handleDeleteStandalone = async (taskId) => {
    if (!confirm('Aufgabe wirklich löschen?')) return;
    try {
      await deleteStandaloneTask(taskId);
      reloadTasks();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
    };
    const labels = {
      pending: 'Offen',
      assigned: 'Zugewiesen',
      in_progress: 'In Arbeit',
      completed: 'Erledigt',
      cancelled: 'Abgebrochen'
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: 'text-gray-500',
      normal: 'text-blue-500',
      high: 'text-orange-500',
      critical: 'text-red-500'
    };
    return (
      <span className={`${styles[priority] || styles.normal}`}>
        {priority === 'critical' && '🔴'}
        {priority === 'high' && '🟠'}
        {priority === 'normal' && '🔵'}
        {priority === 'low' && '⚪'}
      </span>
    );
  };

  // Statistik aus ALLEN Tasks (für Karten)
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'assigned');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const standaloneTasks = tasks.filter(t => t.task_type === 'standalone');

  // Gefilterte Liste für Anzeige
  const filteredTasks = tasks.filter(task => {
    // Status-Filter
    if (statusFilter) {
      const statuses = statusFilter.split(',');
      if (!statuses.includes(task.status)) return false;
    }
    // Typ-Filter
    if (typeFilter && task.task_type !== typeFilter) return false;
    // Datum-Filter
    if (dateFilter && task.due_date) {
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      if (taskDate !== dateFilter) return false;
    }
    return true;
  });

  // Unique machines from tasks
  const uniqueMachines = [...new Set(tasks.map(t => JSON.stringify({ id: t.machine_id, name: t.machine_name })))]
    .map(s => JSON.parse(s));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Alle Wartungsaufgaben
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Übersicht und Zuweisung aller Aufgaben
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowNewTaskModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neue Aufgabe
          </button>
          <button
            onClick={handleGenerateTasks}
            disabled={generating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generiere...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Tasks generieren (24h)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Generate Result */}
      {generateResult && (
        <div className={`p-4 rounded-lg ${generateResult.error ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
          <p className={generateResult.error ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}>
            {generateResult.error || generateResult.message || `${generateResult.created_count} neue Aufgaben erstellt`}
          </p>
        </div>
      )}

      {/* Statistik-Karten als Filter */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Alle */}
        <button
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === '' ? 'ring-2 ring-blue-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</div>
              <div className="text-sm text-gray-500">Alle</div>
            </div>
          </div>
        </button>

        {/* Offen */}
        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'pending' ? 'ring-2 ring-red-500' : ''} ${pendingTasks.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-red-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${pendingTasks.length > 0 ? 'bg-red-500/20 text-red-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className={`text-2xl font-bold ${pendingTasks.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                {pendingTasks.length}
              </div>
              <div className="text-sm text-gray-500">Offen</div>
            </div>
          </div>
        </button>

        {/* In Arbeit */}
        <button
          onClick={() => setStatusFilter('in_progress,assigned')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'in_progress,assigned' ? 'ring-2 ring-yellow-500' : ''} ${inProgressTasks.length > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-yellow-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${inProgressTasks.length > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className={`text-2xl font-bold ${inProgressTasks.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
                {inProgressTasks.length}
              </div>
              <div className="text-sm text-gray-500">In Arbeit</div>
            </div>
          </div>
        </button>

        {/* Erledigt */}
        <button
          onClick={() => setStatusFilter('completed')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-green-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20 text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks.length}</div>
              <div className="text-sm text-gray-500">Erledigt</div>
            </div>
          </div>
        </button>

        {/* Standalone */}
        <button
          onClick={() => setTypeFilter(typeFilter === 'standalone' ? '' : 'standalone')}
          className={`p-4 rounded-xl text-left transition-all ${typeFilter === 'standalone' ? 'ring-2 ring-purple-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-purple-500/20`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${typeFilter === 'standalone' ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {tasks.filter(t => t.task_type === 'standalone').length}
              </div>
              <div className="text-sm text-gray-500">Allgemein</div>
            </div>
          </div>
        </button>
      </div>

      {/* Zusätzliche Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            title="Nach Datum filtern"
          />
        </div>
        {(dateFilter || typeFilter) && (
          <button
            onClick={() => { setDateFilter(''); setTypeFilter(''); }}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Filter zurücksetzen
          </button>
        )}
      </div>

      {/* Task-Liste */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Lade Aufgaben...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              {statusFilter || typeFilter || dateFilter ? 'Keine Aufgaben für diesen Filter gefunden' : 'Keine Aufgaben gefunden'}
            </p>
            {!statusFilter && !typeFilter && !dateFilter && (
              <button
                onClick={handleGenerateTasks}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Tasks aus fälligen Plänen generieren
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Aufgabe
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Maschine / Ort
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Fällig
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Zugewiesen an
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(task.task_priority || task.priority)}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                            {task.task_title || task.plan_title || task.title}
                            {task.task_type === 'standalone' && (
                              <span className="px-1.5 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                Allgemein
                              </span>
                            )}
                            {(task.interval_hours || (task.interval_type && task.interval_value)) && (
                              <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded flex items-center gap-1">
                                ↻ {task.interval_hours 
                                  ? `${task.interval_hours}h` 
                                  : `${task.interval_value}${
                                    {hours:'Std',days:'T',weeks:'W',months:'M',years:'J'}[task.interval_type] || task.interval_type
                                  }`}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{task.maintenance_type || '-'} • ~{task.estimated_duration_minutes || '?'} Min.</span>
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
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {task.machine_name || task.task_location || task.location || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {task.due_date ? (
                        <span className={new Date(task.due_date) < new Date() ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-white'}>
                          {new Date(task.due_date).toLocaleDateString('de-DE')}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(task.status)}
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'completed' ? (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {task.assigned_to_name || '-'}
                        </span>
                      ) : (
                        <select
                          value={task.assigned_to || ''}
                          onChange={(e) => handleAssign(task.id, e.target.value)}
                          className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Nicht zugewiesen</option>
                          {users.filter(u => u.is_active).map(user => (
                            <option key={user.id} value={user.id}>
                              {user.full_name || user.username}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/maintenance/tasks/${task.id}/execute`}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Neue Aufgabe Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Neue Aufgabe erstellen
            </h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  placeholder="z.B. Werkstatt fegen, Lager aufräumen..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  rows={3}
                  placeholder="Detaillierte Beschreibung der Aufgabe..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ort
                  </label>
                  <input
                    type="text"
                    value={newTaskForm.location}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, location: e.target.value })}
                    placeholder="z.B. Werkstatt, Lager..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priorität
                  </label>
                  <select
                    value={newTaskForm.priority}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="low">Niedrig</option>
                    <option value="normal">Normal</option>
                    <option value="high">Hoch</option>
                    <option value="critical">Kritisch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fällig am
                  </label>
                  <input
                    type="datetime-local"
                    value={newTaskForm.due_date}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dauer (Minuten)
                  </label>
                  <input
                    type="number"
                    value={newTaskForm.estimated_duration_minutes}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, estimated_duration_minutes: e.target.value })}
                    placeholder="z.B. 30"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Zuweisen an
                </label>
                <select
                  value={newTaskForm.assigned_to}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Nicht zugewiesen</option>
                  {users.filter(u => u.is_active).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.username}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maschine (optional)
                </label>
                <select
                  value={newTaskForm.machine_id}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, machine_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Keine Maschine</option>
                  {machines.filter(m => m.is_active).map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.name} - {machine.location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingTask || !newTaskForm.title}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingTask ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Speichern...
                    </>
                  ) : (
                    'Aufgabe erstellen'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllTasksPage;
