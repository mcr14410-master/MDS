import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ClipboardCheck, 
  CheckCircle, 
  Circle,
  AlertTriangle,
  Camera,
  Ruler,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Save,
  AlertCircle,
  Gauge,
  MapPin,
  Clock,
  Info
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import API_BASE_URL from '../config/api';

export default function TaskExecutePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    currentTask,
    loading, 
    error,
    fetchTask,
    completeChecklistItem,
    completeTask,
    cancelTask,
    createEscalation,
    clearCurrentTask,
    clearError 
  } = useMaintenanceStore();

  const [completingItem, setCompletingItem] = useState(null);
  const [itemInputs, setItemInputs] = useState({});
  const [completeNotes, setCompleteNotes] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [escalateItem, setEscalateItem] = useState(null);
  const [escalateReason, setEscalateReason] = useState('');
  const [stopItem, setStopItem] = useState(null);
  const [stopReason, setStopReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadTask();
    return () => clearCurrentTask();
  }, [id]);

  const loadTask = async () => {
    try {
      await fetchTask(id);
    } catch (err) {
      console.error('Error loading task:', err);
    }
  };

  const handleItemComplete = async (item, answer = true) => {
    try {
      setCompletingItem(item.id);
      
      let photoPath = itemInputs[item.id]?.photo_path;
      
      // Erst Foto hochladen wenn vorhanden
      if (itemInputs[item.id]?.photoFile) {
        const formData = new FormData();
        formData.append('photo', itemInputs[item.id].photoFile);
        
        try {
          const uploadResponse = await fetch(
            `${API_BASE_URL}/api/maintenance/tasks/${id}/checklist/${item.id}/photo`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
            }
          );
          const uploadResult = await uploadResponse.json();
          if (uploadResult.success) {
            photoPath = uploadResult.data.photo_path;
          }
        } catch (uploadErr) {
          console.error('Error uploading photo:', uploadErr);
        }
      }
      
      const data = {
        completed: true,
        answer: item.decision_type === 'yes_no' ? answer : undefined,
        measurement_value: itemInputs[item.id]?.measurement_value,
        notes: itemInputs[item.id]?.notes,
        photo_path: photoPath
      };

      const result = await completeChecklistItem(id, item.id, data);
      
      // Refresh task to get updated progress
      await fetchTask(id);
      
      // Clear inputs
      setItemInputs(prev => ({ ...prev, [item.id]: {} }));
    } catch (err) {
      console.error('Error completing item:', err);
      
      // Check action required
      if (err.action_required === 'stop') {
        // Bei Stop: Task blockieren, nur Fehlermeldung zeigen
        setStopItem(item);
        setStopReason(err.message || `${item.title}: Aufgabe gestoppt`);
        setShowStopModal(true);
      } else if (err.action_required === 'escalate') {
        // Bei Eskalieren: Eskalations-Modal öffnen
        setEscalateItem(item);
        setEscalateReason(err.message || `${item.title}: Eskalation erforderlich`);
        setShowEscalateModal(true);
      }
    } finally {
      setCompletingItem(null);
    }
  };

  const handleEscalate = async () => {
    try {
      await createEscalation({
        maintenance_task_id: parseInt(id),
        checklist_item_id: escalateItem?.id,
        reason: escalateReason,
        escalation_level: 1
      });
      
      setShowEscalateModal(false);
      setEscalateItem(null);
      setEscalateReason('');
      
      // Navigate back to my tasks
      navigate('/maintenance/tasks/my');
    } catch (err) {
      console.error('Error creating escalation:', err);
    }
  };

  const handleComplete = async () => {
    try {
      await completeTask(id, { notes: completeNotes });
      navigate('/maintenance/tasks/my');
    } catch (err) {
      console.error('Error completing task:', err);
      // Show error in modal
      if (err.missing_items) {
        alert(`Nicht alle kritischen Items erledigt: ${err.missing_items.join(', ')}`);
      }
    }
  };

  const handleCancel = async () => {
    try {
      await cancelTask(id, cancelReason);
      navigate('/maintenance/tasks/my');
    } catch (err) {
      console.error('Error cancelling task:', err);
    }
  };

  const getProgress = () => {
    if (!currentTask?.checklist_items) return { completed: 0, total: 0, percentage: 0 };
    const total = currentTask.checklist_items.length;
    const completed = currentTask.checklist_items.filter(i => i.completed).length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const progress = getProgress();
  const allCriticalCompleted = currentTask?.checklist_items?.filter(i => i.is_critical && !i.completed).length === 0;

  if (loading && !currentTask) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Aufgabe nicht gefunden
        </h2>
        <Link to="/maintenance/tasks/my" className="text-blue-600 hover:text-blue-700">
          Zurück zu meinen Aufgaben
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                to="/maintenance/tasks/my"
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentTask.plan_title}
              </h1>
              {currentTask.is_shift_critical && (
                <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Schicht-kritisch
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Gauge className="w-4 h-4" />
                {currentTask.machine_name}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {currentTask.machine_location || 'Kein Standort'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                ~{currentTask.estimated_duration_minutes || '?'} Min.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-1"
            >
              <XCircle className="w-4 h-4" />
              Abbrechen
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">Fortschritt</span>
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {progress.completed} / {progress.total} ({progress.percentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                progress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Instructions & Safety Notes */}
        {(currentTask.instructions || currentTask.safety_notes) && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentTask.instructions && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1">
                  <Info className="w-4 h-4" />
                  Anleitung
                </h4>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  {currentTask.instructions}
                </p>
              </div>
            )}
            {currentTask.safety_notes && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  Sicherheitshinweise
                </h4>
                <p className="text-sm text-yellow-600 dark:text-yellow-300">
                  {currentTask.safety_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Plan-Referenzbild */}
        {currentTask.plan_reference_image && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Referenzbild</h4>
            <a 
              href={`${API_BASE_URL}${currentTask.plan_reference_image}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img 
                src={`${API_BASE_URL}${currentTask.plan_reference_image}`}
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
      <div className="space-y-3">
        {currentTask.checklist_items?.map((item, index) => (
          <div
            key={item.id}
            className={`bg-white dark:bg-gray-800 rounded-xl border ${
              item.completed 
                ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                : item.is_critical
                  ? 'border-red-300 dark:border-red-700'
                  : 'border-gray-200 dark:border-gray-700'
            } overflow-hidden`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                {/* Checkbox / Status */}
                <button
                  onClick={() => !item.completed && item.decision_type !== 'yes_no' && !item.requires_photo && !item.requires_measurement && handleItemComplete(item, true)}
                  disabled={item.completed || completingItem === item.id || item.decision_type === 'yes_no' || item.requires_photo || item.requires_measurement}
                  className={`p-1 rounded-full transition-colors ${
                    item.completed 
                      ? 'text-green-500 cursor-default'
                      : (item.decision_type === 'yes_no' || item.requires_photo || item.requires_measurement)
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                  title={
                    item.decision_type === 'yes_no' ? 'Bitte mit Ja/Nein beantworten' : 
                    item.requires_photo ? 'Bitte erst Foto hochladen' :
                    item.requires_measurement ? 'Bitte erst Messwert eingeben' : ''
                  }
                >
                  {completingItem === item.id ? (
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : item.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-400 font-mono">#{index + 1}</span>
                    <h3 className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                      {item.title}
                    </h3>
                    {item.is_critical && (
                      <span className="px-2 py-0.5 text-xs rounded bg-red-500 text-white">Kritisch</span>
                    )}
                    {item.requires_photo && (
                      <Camera className="w-4 h-4 text-blue-500" title="Foto erforderlich" />
                    )}
                    {item.requires_measurement && (
                      <Ruler className="w-4 h-4 text-purple-500" title="Messung erforderlich" />
                    )}
                  </div>

                  {item.description && (
                    <p className={`text-sm mt-1 ${item.completed ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {item.description}
                    </p>
                  )}

                  {/* Referenzbild anzeigen */}
                  {item.reference_image && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Referenzbild:</p>
                      <a 
                        href={`${API_BASE_URL}${item.reference_image}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img 
                          src={`${API_BASE_URL}${item.reference_image}`}
                          alt="Referenzbild" 
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {/* Ja/Nein Buttons */}
                  {item.decision_type === 'yes_no' && !item.completed && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Antwort:</span>
                      <button
                        onClick={() => {
                          setItemInputs(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], answer: true }
                          }));
                          handleItemComplete(item, true);
                        }}
                        disabled={completingItem === item.id}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          item.expected_answer === true 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 ring-2 ring-green-400'
                            : item.expected_answer === false
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        ✓ Ja
                      </button>
                      <button
                        onClick={() => {
                          setItemInputs(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], answer: false }
                          }));
                          handleItemComplete(item, false);
                        }}
                        disabled={completingItem === item.id}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                          item.expected_answer === false 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 ring-2 ring-green-400'
                            : item.expected_answer === true
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        ✗ Nein
                      </button>
                      {item.expected_answer !== null && (
                        <span className="text-xs text-gray-400 ml-2">
                          (Erwartet: {item.expected_answer ? 'Ja' : 'Nein'})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Measurement Input */}
                  {item.requires_measurement && !item.completed && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        placeholder={`Messwert ${item.min_value && item.max_value ? `(${item.min_value} - ${item.max_value})` : ''}`}
                        value={itemInputs[item.id]?.measurement_value || ''}
                        onChange={(e) => setItemInputs(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], measurement_value: parseFloat(e.target.value) || null }
                        }))}
                        className="w-40 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      {item.measurement_unit && (
                        <span className="text-sm text-gray-500">{item.measurement_unit}</span>
                      )}
                      {item.min_value !== null && item.max_value !== null && (
                        <span className="text-xs text-gray-400">
                          ({item.min_value} - {item.max_value})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes Input */}
                  {!item.completed && (
                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Notiz hinzufügen (optional)"
                        value={itemInputs[item.id]?.notes || ''}
                        onChange={(e) => setItemInputs(prev => ({
                          ...prev,
                          [item.id]: { ...prev[item.id], notes: e.target.value }
                        }))}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  )}

                  {/* Photo Upload */}
                  {item.requires_photo && !item.completed && (
                    <div className="mt-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-dashed border-blue-300 dark:border-blue-700">
                        <Camera className="w-5 h-5" />
                        <span className="text-sm font-medium">
                          {itemInputs[item.id]?.photoFile ? itemInputs[item.id].photoFile.name : 'Foto aufnehmen / hochladen'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setItemInputs(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], photoFile: file }
                              }));
                            }
                          }}
                        />
                      </label>
                      {itemInputs[item.id]?.photoFile && (
                        <div className="mt-2 flex items-center gap-2">
                          <img 
                            src={URL.createObjectURL(itemInputs[item.id].photoFile)} 
                            alt="Vorschau" 
                            className="w-20 h-20 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                          />
                          <button
                            onClick={() => setItemInputs(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], photoFile: null }
                            }))}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Entfernen
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show uploaded photo */}
                  {item.photo_path && (
                    <div className="mt-3">
                      <a 
                        href={`${API_BASE_URL}${item.photo_path}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img 
                          src={`${API_BASE_URL}${item.photo_path}`}
                          alt="Wartungsfoto" 
                          className="w-24 h-24 object-cover rounded-lg border border-gray-300 dark:border-gray-600 hover:opacity-80 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {/* Save Button für Items mit Foto/Messung (ohne Ja/Nein) */}
                  {!item.completed && item.decision_type !== 'yes_no' && (item.requires_photo || item.requires_measurement) && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleItemComplete(item, true)}
                        disabled={completingItem === item.id || (item.requires_photo && !itemInputs[item.id]?.photoFile)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          completingItem === item.id || (item.requires_photo && !itemInputs[item.id]?.photoFile)
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {completingItem === item.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Speichern...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Abschließen
                          </>
                        )}
                      </button>
                      {item.requires_photo && !itemInputs[item.id]?.photoFile && (
                        <p className="text-xs text-orange-500 mt-1">Bitte erst ein Foto hochladen</p>
                      )}
                    </div>
                  )}

                  {/* Completion Info */}
                  {item.completed && item.completed_at && (
                    <div className="mt-2 text-xs text-gray-400">
                      Erledigt von {item.completed_by_username} am {new Date(item.completed_at).toLocaleString('de-DE')}
                      {item.completion_notes && ` - "${item.completion_notes}"`}
                    </div>
                  )}
                </div>

                {/* Problem Button */}
                {!item.completed && (
                  <button
                    onClick={() => {
                      setEscalateItem(item);
                      setEscalateReason(`Problem bei: ${item.title}`);
                      setShowEscalateModal(true);
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    title="Problem melden"
                  >
                    <AlertCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Complete Button */}
      {progress.total > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {progress.percentage === 100 
                  ? 'Alle Schritte erledigt!' 
                  : allCriticalCompleted
                    ? 'Kritische Schritte erledigt'
                    : 'Noch nicht alle kritischen Schritte erledigt'}
              </h3>
              <p className="text-sm text-gray-500">
                {progress.completed} von {progress.total} Schritten abgeschlossen
              </p>
            </div>
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={!allCriticalCompleted}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                allCriticalCompleted
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-5 h-5" />
              Wartung abschließen
            </button>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Wartung abschließen
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Abschlussnotiz (optional)
                </label>
                <textarea
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="z.B. 'Ohne Probleme durchgeführt' oder besondere Vorkommnisse"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleComplete}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Abschließen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Wartung abbrechen
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grund für Abbruch
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Warum wird die Wartung abgebrochen?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Zurück
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Problem melden
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Das Problem wird an einen Bediener oder Meister eskaliert.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Problembeschreibung
                </label>
                <textarea
                  value={escalateReason}
                  onChange={(e) => setEscalateReason(e.target.value)}
                  placeholder="Beschreiben Sie das Problem..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={4}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  setEscalateItem(null);
                  setEscalateReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEscalate}
                disabled={!escalateReason.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 disabled:opacity-50"
              >
                <AlertCircle className="w-4 h-4" />
                Eskalieren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Modal - Task blockiert */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full border-2 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  Aufgabe gestoppt
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Diese Aufgabe kann nicht fortgesetzt werden
                </p>
              </div>
            </div>
            
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-700 dark:text-red-300">
                {stopReason}
              </p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Bitte informieren Sie Ihren Vorgesetzten oder erstellen Sie eine Eskalation.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowStopModal(false);
                  setStopItem(null);
                  setStopReason('');
                  // Eskalations-Modal öffnen
                  setEscalateItem(stopItem);
                  setEscalateReason(stopReason);
                  setShowEscalateModal(true);
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4" />
                Eskalieren
              </button>
              <button
                onClick={() => {
                  setShowStopModal(false);
                  setStopItem(null);
                  setStopReason('');
                  navigate('/maintenance/tasks/my');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Zurück zu Aufgaben
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
