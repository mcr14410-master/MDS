import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Settings, 
  Edit, 
  Trash2, 
  Plus,
  ChevronLeft,
  Clock,
  Calendar,
  Users,
  Gauge,
  AlertTriangle,
  CheckCircle,
  GripVertical,
  Camera,
  Ruler,
  X,
  Save,
  Play,
  MoreVertical
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';

export default function MaintenancePlanDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    currentPlan,
    loading, 
    error,
    fetchPlan,
    deletePlan,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    createTask,
    clearCurrentPlan,
    clearError 
  } = useMaintenanceStore();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    sequence: '',
    is_critical: false,
    requires_photo: false,
    requires_measurement: false,
    measurement_unit: '',
    min_value: '',
    max_value: '',
    decision_type: 'none',
    on_failure_action: 'continue',
    expected_answer: null
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlan();
    return () => clearCurrentPlan();
  }, [id]);

  const loadPlan = async () => {
    try {
      await fetchPlan(id);
    } catch (err) {
      console.error('Error loading plan:', err);
    }
  };

  const handleDelete = async (hardDelete = false) => {
    try {
      await deletePlan(id, hardDelete);
      navigate('/maintenance/plans');
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleCreateTask = async () => {
    try {
      const task = await createTask({
        maintenance_plan_id: parseInt(id),
        due_date: new Date().toISOString()
      });
      navigate(`/maintenance/tasks/${task.id}/execute`);
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const resetItemForm = () => {
    setItemForm({
      title: '',
      description: '',
      sequence: '',
      is_critical: false,
      requires_photo: false,
      requires_measurement: false,
      measurement_unit: '',
      min_value: '',
      max_value: '',
      decision_type: 'none',
      on_failure_action: 'continue',
      expected_answer: null
    });
  };

  const handleAddItem = async () => {
    try {
      setSaving(true);
      await addChecklistItem(id, {
        ...itemForm,
        sequence: itemForm.sequence ? parseInt(itemForm.sequence) : null,
        min_value: itemForm.min_value ? parseFloat(itemForm.min_value) : null,
        max_value: itemForm.max_value ? parseFloat(itemForm.max_value) : null
      });
      setShowAddItemModal(false);
      resetItemForm();
      await fetchPlan(id);
    } catch (err) {
      console.error('Error adding item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm({
      title: item.title || '',
      description: item.description || '',
      sequence: item.sequence || '',
      is_critical: item.is_critical || false,
      requires_photo: item.requires_photo || false,
      requires_measurement: item.requires_measurement || false,
      measurement_unit: item.measurement_unit || '',
      min_value: item.min_value || '',
      max_value: item.max_value || '',
      decision_type: item.decision_type || 'none',
      on_failure_action: item.on_failure_action || 'continue',
      expected_answer: item.expected_answer || ''
    });
    setShowAddItemModal(true);
  };

  const handleUpdateItem = async () => {
    try {
      setSaving(true);
      
      // Erst Referenzbild hochladen wenn vorhanden
      if (itemForm.referenceImageFile) {
        const formData = new FormData();
        formData.append('image', itemForm.referenceImageFile);
        
        try {
          const uploadResponse = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/maintenance/checklist/${editingItem.id}/reference-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
            }
          );
          const uploadResult = await uploadResponse.json();
          if (!uploadResult.success) {
            console.error('Error uploading reference image:', uploadResult.error);
          }
        } catch (uploadErr) {
          console.error('Error uploading reference image:', uploadErr);
        }
      }
      
      await updateChecklistItem(editingItem.id, {
        ...itemForm,
        sequence: itemForm.sequence ? parseInt(itemForm.sequence) : null,
        min_value: itemForm.min_value ? parseFloat(itemForm.min_value) : null,
        max_value: itemForm.max_value ? parseFloat(itemForm.max_value) : null
      });
      setShowAddItemModal(false);
      setEditingItem(null);
      resetItemForm();
      await fetchPlan(id);
    } catch (err) {
      console.error('Error updating item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Checklist-Item wirklich löschen?')) return;
    try {
      await deleteChecklistItem(itemId);
      await fetchPlan(id);
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const getIntervalText = (plan) => {
    if (plan.interval_hours) {
      return `Alle ${plan.interval_hours} Betriebsstunden`;
    }
    if (plan.interval_type && plan.interval_value) {
      const types = {
        hours: 'Stunden',
        days: 'Tage',
        weeks: 'Wochen',
        months: 'Monate',
        years: 'Jahre'
      };
      return `Alle ${plan.interval_value} ${types[plan.interval_type] || plan.interval_type}`;
    }
    return 'Kein Intervall definiert';
  };

  const getSkillLevelBadge = (level) => {
    const levels = {
      helper: { label: 'Helfer', color: 'bg-green-500/10 text-green-600' },
      operator: { label: 'Bediener', color: 'bg-blue-500/10 text-blue-600' },
      technician: { label: 'Techniker', color: 'bg-orange-500/10 text-orange-600' },
      specialist: { label: 'Spezialist', color: 'bg-red-500/10 text-red-600' }
    };
    const config = levels[level] || levels.operator;
    return <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>{config.label}</span>;
  };

  if (loading && !currentPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Wartungsplan nicht gefunden
        </h2>
        <Link to="/maintenance/plans" className="text-blue-600 hover:text-blue-700">
          Zurück zur Übersicht
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Link 
              to="/maintenance/plans"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mt-1"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {currentPlan.title}
                </h1>
                {currentPlan.is_shift_critical && (
                  <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Schicht-kritisch
                  </span>
                )}
                {!currentPlan.is_active && (
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">
                    Inaktiv
                  </span>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {currentPlan.description || 'Keine Beschreibung'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateTask}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Play className="w-4 h-4" />
              Jetzt ausführen
            </button>
            <Link
              to={`/maintenance/plans/${id}/edit`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4" />
              Bearbeiten
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div>
            <div className="text-sm text-gray-500 mb-1">Maschine</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Gauge className="w-4 h-4 text-gray-400" />
              {currentPlan.machine_name}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Intervall</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Calendar className="w-4 h-4 text-gray-400" />
              {getIntervalText(currentPlan)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Dauer</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock className="w-4 h-4 text-gray-400" />
              ~{currentPlan.estimated_duration_minutes || '?'} Minuten
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">Skill-Level</div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" />
              {getSkillLevelBadge(currentPlan.required_skill_level)}
            </div>
          </div>
        </div>

        {/* Fälligkeiten & Letzte Ausführung */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zeitbasierte Pläne */}
          {currentPlan.next_due_at && !currentPlan.interval_hours && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Nächste Fälligkeit</h4>
              <span className={`text-sm ${
                currentPlan.status === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' :
                currentPlan.status === 'due_today' ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
                'text-blue-600 dark:text-blue-300'
              }`}>
                {new Date(currentPlan.next_due_at).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}

          {/* Betriebsstundenbasierte Pläne */}
          {currentPlan.interval_hours && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">Nächste Fälligkeit</h4>
              <span className={`text-sm ${
                currentPlan.current_operating_hours >= currentPlan.next_due_hours ? 'text-red-600 dark:text-red-400 font-medium' :
                (currentPlan.next_due_hours - currentPlan.current_operating_hours) <= 50 ? 'text-yellow-600 dark:text-yellow-400 font-medium' :
                'text-blue-600 dark:text-blue-300'
              }`}>
                Bei {currentPlan.next_due_hours?.toLocaleString('de-DE')}h
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  (aktuell: {currentPlan.current_operating_hours?.toLocaleString('de-DE')}h)
                </span>
              </span>
            </div>
          )}

          {/* Letzte Ausführung */}
          {currentPlan.last_completed_at && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Letzte Ausführung</h4>
              <span className="text-sm text-green-600 dark:text-green-300">
                {new Date(currentPlan.last_completed_at).toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}
        </div>

        {/* Instructions & Safety */}
        {(currentPlan.instructions || currentPlan.safety_notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {currentPlan.instructions && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Anleitung</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentPlan.instructions}</p>
              </div>
            )}
            {currentPlan.safety_notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Sicherheitshinweise
                </h4>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">{currentPlan.safety_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Required Tools & Parts */}
        {(currentPlan.required_tools || currentPlan.required_parts) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {currentPlan.required_tools && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benötigte Werkzeuge</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentPlan.required_tools}</p>
              </div>
            )}
            {currentPlan.required_parts && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Benötigte Teile</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{currentPlan.required_parts}</p>
              </div>
            )}
          </div>
        )}

        {/* Referenzbild (nur Anzeige) */}
        {currentPlan.reference_image && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Referenzbild</h4>
            <a 
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${currentPlan.reference_image}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img 
                src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${currentPlan.reference_image}`}
                alt="Referenzbild" 
                className="w-48 h-48 object-cover rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Checklist Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Checkliste ({currentPlan.checklist_items?.length || 0} Schritte)
          </h2>
          <button
            onClick={() => {
              setEditingItem(null);
              resetItemForm();
              setShowAddItemModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Schritt hinzufügen
          </button>
        </div>

        {currentPlan.checklist_items?.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Keine Checklist-Items
            </h3>
            <p className="text-gray-500 mb-4">
              Fügen Sie Schritte hinzu, die bei der Wartung abgearbeitet werden sollen.
            </p>
            <button
              onClick={() => {
                setEditingItem(null);
                resetItemForm();
                setShowAddItemModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Ersten Schritt hinzufügen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentPlan.checklist_items?.map((item, index) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Drag Handle & Number */}
                  <div className="flex items-center gap-2 text-gray-400">
                    <GripVertical className="w-4 h-4 cursor-move" />
                    <span className="text-sm font-mono w-6">#{item.sequence || index + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {item.title}
                      </h3>
                      {item.is_critical && (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-500 text-white">Kritisch</span>
                      )}
                      {item.requires_photo && (
                        <span className="p-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600" title="Foto erforderlich">
                          <Camera className="w-3 h-3" />
                        </span>
                      )}
                      {item.requires_measurement && (
                        <span className="p-1 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600" title="Messung erforderlich">
                          <Ruler className="w-3 h-3" />
                        </span>
                      )}
                      {item.decision_type !== 'none' && (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                          {item.decision_type === 'yes_no' ? 'Ja/Nein' : item.decision_type}
                        </span>
                      )}
                    </div>

                    {item.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    )}

                    {item.requires_measurement && (item.min_value !== null || item.max_value !== null) && (
                      <div className="text-sm text-gray-500 mt-1">
                        Toleranz: {item.min_value} - {item.max_value} {item.measurement_unit || ''}
                      </div>
                    )}

                    {item.on_failure_action !== 'continue' && (
                      <div className="text-sm mt-1">
                        <span className={item.on_failure_action === 'stop' ? 'text-red-500' : 'text-orange-500'}>
                          Bei Fehler: {item.on_failure_action === 'stop' ? 'Stoppen' : 'Eskalieren'}
                        </span>
                      </div>
                    )}

                    {/* Referenzbild */}
                    {item.reference_image && (
                      <div className="mt-2">
                        <a 
                          href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${item.reference_image}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block"
                        >
                          <img 
                            src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${item.reference_image}`}
                            alt="Referenzbild" 
                            className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      {currentPlan.recent_tasks?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Letzte Ausführungen
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentPlan.recent_tasks.map((task) => (
              <div key={task.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        task.status === 'completed' ? 'bg-green-500 text-white' :
                        task.status === 'cancelled' ? 'bg-gray-500 text-white' :
                        'bg-yellow-500 text-white'
                      }`}>
                        {task.status === 'completed' ? 'Erledigt' :
                         task.status === 'cancelled' ? 'Abgebrochen' : task.status}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {task.completed_at ? new Date(task.completed_at).toLocaleDateString('de-DE', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : new Date(task.created_at).toLocaleDateString('de-DE')}
                      </span>
                      {task.completed_by_name && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {task.completed_by_name}
                        </span>
                      )}
                      {task.actual_duration_minutes && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {task.actual_duration_minutes} Min.
                        </span>
                      )}
                    </div>
                    {task.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        {task.notes}
                      </p>
                    )}
                    {task.issues_found && (
                      <p className="text-sm text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-2 rounded flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        {task.issues_found}
                      </p>
                    )}
                  </div>
                  <Link
                    to={`/maintenance/tasks/${task.id}/details`}
                    className="ml-4 text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                  >
                    Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Wartungsplan löschen?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Möchten Sie den Wartungsplan "{currentPlan.title}" wirklich löschen?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(false)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Deaktivieren
              </button>
              <button
                onClick={() => handleDelete(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingItem ? 'Schritt bearbeiten' : 'Neuer Schritt'}
              </h3>
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={itemForm.title}
                  onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })}
                  placeholder="z.B. Ölstand prüfen"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Detaillierte Anleitung für diesen Schritt..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Options Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reihenfolge
                  </label>
                  <input
                    type="number"
                    value={itemForm.sequence}
                    onChange={(e) => setItemForm({ ...itemForm, sequence: e.target.value })}
                    placeholder="Auto"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Entscheidungstyp
                  </label>
                  <select
                    value={itemForm.decision_type}
                    onChange={(e) => setItemForm({ ...itemForm, decision_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="none">Keine</option>
                    <option value="yes_no">Ja/Nein</option>
                    <option value="measurement">Messung</option>
                    <option value="photo_required">Foto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bei Fehler
                  </label>
                  <select
                    value={itemForm.on_failure_action}
                    onChange={(e) => setItemForm({ ...itemForm, on_failure_action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="continue">Fortfahren</option>
                    <option value="escalate">Eskalieren</option>
                    <option value="stop">Stoppen</option>
                  </select>
                </div>
                {itemForm.decision_type === 'yes_no' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Erwartete Antwort
                    </label>
                    <select
                      value={itemForm.expected_answer === true ? 'true' : itemForm.expected_answer === false ? 'false' : ''}
                      onChange={(e) => setItemForm({ 
                        ...itemForm, 
                        expected_answer: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">-- Keine Validierung --</option>
                      <option value="true">Ja erwartet</option>
                      <option value="false">Nein erwartet</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Bei falscher Antwort wird die "Bei Fehler"-Aktion ausgelöst
                    </p>
                  </div>
                )}
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.is_critical}
                    onChange={(e) => setItemForm({ ...itemForm, is_critical: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Kritisch</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.requires_photo}
                    onChange={(e) => setItemForm({ ...itemForm, requires_photo: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Foto erforderlich</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.requires_measurement}
                    onChange={(e) => setItemForm({ ...itemForm, requires_measurement: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Messung erforderlich</span>
                </label>
              </div>

              {/* Measurement Fields */}
              {itemForm.requires_measurement && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Einheit
                    </label>
                    <input
                      type="text"
                      value={itemForm.measurement_unit}
                      onChange={(e) => setItemForm({ ...itemForm, measurement_unit: e.target.value })}
                      placeholder="z.B. bar, mm, °C"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min. Wert
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.min_value}
                      onChange={(e) => setItemForm({ ...itemForm, min_value: e.target.value })}
                      placeholder="z.B. 5"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max. Wert
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemForm.max_value}
                      onChange={(e) => setItemForm({ ...itemForm, max_value: e.target.value })}
                      placeholder="z.B. 7"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Reference Image - nur beim Bearbeiten */}
              {editingItem && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Referenzbild (optional)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Laden Sie ein Bild hoch, das zeigt wie der Schritt korrekt ausgeführt werden soll
                  </p>
                  
                  {/* Bestehendes Bild anzeigen */}
                  {editingItem.reference_image && (
                    <div className="mb-3">
                      <img 
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${editingItem.reference_image}`}
                        alt="Referenzbild" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-dashed border-blue-300 dark:border-blue-700 w-fit">
                    <Camera className="w-5 h-5" />
                    <span className="text-sm font-medium">
                      {itemForm.referenceImageFile ? itemForm.referenceImageFile.name : 'Referenzbild hochladen'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setItemForm({ ...itemForm, referenceImageFile: file });
                        }
                      }}
                    />
                  </label>
                  
                  {/* Vorschau des neuen Bildes */}
                  {itemForm.referenceImageFile && (
                    <div className="mt-3 flex items-center gap-2">
                      <img 
                        src={URL.createObjectURL(itemForm.referenceImageFile)} 
                        alt="Neue Vorschau" 
                        className="w-24 h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, referenceImageFile: null })}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Entfernen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddItemModal(false);
                  setEditingItem(null);
                  resetItemForm();
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={editingItem ? handleUpdateItem : handleAddItem}
                disabled={!itemForm.title || saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Speichern...' : editingItem ? 'Aktualisieren' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
