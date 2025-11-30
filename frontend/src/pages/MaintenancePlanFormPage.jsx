import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Settings, 
  Save,
  ChevronLeft,
  AlertTriangle,
  Camera,
  X,
  Trash2
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useMachinesStore } from '../stores/machinesStore';

export default function MaintenancePlanFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  
  const { 
    currentPlan,
    maintenanceTypes,
    loading, 
    error,
    fetchPlan,
    fetchMaintenanceTypes,
    createPlan,
    updatePlan,
    clearCurrentPlan,
    clearError 
  } = useMaintenanceStore();

  const { machines, fetchMachines } = useMachinesStore();

  const [form, setForm] = useState({
    title: '',
    description: '',
    machine_id: '',
    maintenance_type_id: '',
    interval_type: 'days',
    interval_value: '',
    interval_hours: '',
    required_skill_level: 'operator',
    estimated_duration_minutes: '',
    priority: 'normal',
    is_shift_critical: false,
    shift_deadline_time: '',
    instructions: '',
    safety_notes: '',
    required_tools: '',
    required_parts: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [useHoursInterval, setUseHoursInterval] = useState(false);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImage, setDeletingImage] = useState(false);

  const handleDeleteReferenceImage = async () => {
    if (!confirm('Referenzbild wirklich löschen?')) return;
    
    try {
      setDeletingImage(true);
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/maintenance/plans/${id}/reference-image`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      const result = await response.json();
      if (result.success) {
        await fetchPlan(id); // Reload um Bild zu entfernen
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (err) {
      console.error('Error deleting reference image:', err);
    } finally {
      setDeletingImage(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceTypes();
    fetchMachines();
    
    if (isEdit) {
      loadPlan();
    }
    
    return () => clearCurrentPlan();
  }, [id]);

  useEffect(() => {
    if (isEdit && currentPlan) {
      setForm({
        title: currentPlan.title || '',
        description: currentPlan.description || '',
        machine_id: currentPlan.machine_id || '',
        maintenance_type_id: currentPlan.maintenance_type_id || '',
        interval_type: currentPlan.interval_type || 'days',
        interval_value: currentPlan.interval_value || '',
        interval_hours: currentPlan.interval_hours || '',
        required_skill_level: currentPlan.required_skill_level || 'operator',
        estimated_duration_minutes: currentPlan.estimated_duration_minutes || '',
        priority: currentPlan.priority || 'normal',
        is_shift_critical: currentPlan.is_shift_critical || false,
        shift_deadline_time: currentPlan.shift_deadline_time?.substring(0, 5) || '',
        instructions: currentPlan.instructions || '',
        safety_notes: currentPlan.safety_notes || '',
        required_tools: currentPlan.required_tools || '',
        required_parts: currentPlan.required_parts || '',
        is_active: currentPlan.is_active !== false
      });
      setUseHoursInterval(Boolean(currentPlan.interval_hours));
    }
  }, [currentPlan, isEdit]);

  const loadPlan = async () => {
    try {
      await fetchPlan(id);
    } catch (err) {
      console.error('Error loading plan:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const data = {
        ...form,
        machine_id: parseInt(form.machine_id),
        maintenance_type_id: parseInt(form.maintenance_type_id),
        interval_value: useHoursInterval ? null : (form.interval_value ? parseInt(form.interval_value) : null),
        interval_type: useHoursInterval ? null : form.interval_type,
        interval_hours: useHoursInterval ? (form.interval_hours ? parseInt(form.interval_hours) : null) : null,
        estimated_duration_minutes: form.estimated_duration_minutes ? parseInt(form.estimated_duration_minutes) : null,
        shift_deadline_time: form.is_shift_critical && form.shift_deadline_time ? form.shift_deadline_time + ':00' : null
      };

      let planId;
      if (isEdit) {
        await updatePlan(id, data);
        planId = id;
      } else {
        const newPlan = await createPlan(data);
        planId = newPlan.id;
      }

      // Referenzbild hochladen wenn vorhanden
      if (referenceImageFile && planId) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', referenceImageFile);
        
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/maintenance/plans/${planId}/reference-image`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formData
            }
          );
        } catch (uploadErr) {
          console.error('Error uploading reference image:', uploadErr);
        }
        setUploadingImage(false);
      }

      navigate(`/maintenance/plans/${planId}`);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (loading && isEdit && !currentPlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to={isEdit ? `/maintenance/plans/${id}` : '/maintenance/plans'}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7" />
            {isEdit ? 'Wartungsplan bearbeiten' : 'Neuer Wartungsplan'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {isEdit ? currentPlan?.title : 'Erstellen Sie einen neuen Wartungsplan'}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Grunddaten
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Titel *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="z.B. Tägliche Ölstandprüfung"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beschreibung
              </label>
              <textarea
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Kurze Beschreibung der Wartung..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Machine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maschine *
              </label>
              <select
                value={form.machine_id}
                onChange={(e) => handleChange('machine_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Maschine wählen...</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.location ? `(${m.location})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Maintenance Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Wartungstyp *
              </label>
              <select
                value={form.maintenance_type_id}
                onChange={(e) => handleChange('maintenance_type_id', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Typ wählen...</option>
                {maintenanceTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priorität
              </label>
              <select
                value={form.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="low">Niedrig</option>
                <option value="normal">Normal</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>

            {/* Skill Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Erforderliches Skill-Level
              </label>
              <select
                value={form.required_skill_level}
                onChange={(e) => handleChange('required_skill_level', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="helper">Helfer (einfach)</option>
                <option value="operator">Bediener (mittel)</option>
                <option value="technician">Techniker (komplex)</option>
                <option value="specialist">Spezialist (Experte)</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Geschätzte Dauer (Minuten)
              </label>
              <input
                type="number"
                value={form.estimated_duration_minutes}
                onChange={(e) => handleChange('estimated_duration_minutes', e.target.value)}
                placeholder="z.B. 30"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Active */}
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Aktiv</span>
              </label>
            </div>
          </div>
        </div>

        {/* Interval Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Intervall
          </h2>

          {/* Interval Type Switch */}
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={!useHoursInterval}
                onChange={() => setUseHoursInterval(false)}
                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Zeitbasiert</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={useHoursInterval}
                onChange={() => setUseHoursInterval(true)}
                className="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Betriebsstunden-basiert</span>
            </label>
          </div>

          {useHoursInterval ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intervall (Betriebsstunden)
                </label>
                <input
                  type="number"
                  value={form.interval_hours}
                  onChange={(e) => handleChange('interval_hours', e.target.value)}
                  placeholder="z.B. 500"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Wartung wird fällig nach dieser Anzahl Betriebsstunden
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intervall-Wert
                </label>
                <input
                  type="number"
                  value={form.interval_value}
                  onChange={(e) => handleChange('interval_value', e.target.value)}
                  placeholder="z.B. 7"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intervall-Einheit
                </label>
                <select
                  value={form.interval_type}
                  onChange={(e) => handleChange('interval_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="hours">Stunden</option>
                  <option value="days">Tage</option>
                  <option value="weeks">Wochen</option>
                  <option value="months">Monate</option>
                  <option value="years">Jahre</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Shift Critical Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-500" />
            Schicht-Einstellungen
          </h2>

          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_shift_critical}
                onChange={(e) => handleChange('is_shift_critical', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Schicht-kritisch (muss vor Schichtende/Nachtbetrieb erledigt sein)
              </span>
            </label>

            {form.is_shift_critical && (
              <div className="pl-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Deadline (Uhrzeit)
                </label>
                <input
                  type="time"
                  value={form.shift_deadline_time}
                  onChange={(e) => handleChange('shift_deadline_time', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  z.B. 17:00 für Nachtschicht-Vorbereitung
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions & Safety */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Anleitungen & Sicherheit
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Anleitung
              </label>
              <textarea
                value={form.instructions}
                onChange={(e) => handleChange('instructions', e.target.value)}
                placeholder="Allgemeine Anleitung für die Wartung..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Sicherheitshinweise
              </label>
              <textarea
                value={form.safety_notes}
                onChange={(e) => handleChange('safety_notes', e.target.value)}
                placeholder="Wichtige Sicherheitshinweise..."
                rows={2}
                className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-gray-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Benötigte Werkzeuge
                </label>
                <textarea
                  value={form.required_tools}
                  onChange={(e) => handleChange('required_tools', e.target.value)}
                  placeholder="z.B. Fettpresse, Ölkanne, Lappen"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Benötigte Teile/Material
                </label>
                <textarea
                  value={form.required_parts}
                  onChange={(e) => handleChange('required_parts', e.target.value)}
                  placeholder="z.B. Schmierfett DIN 51825, Maschinenöl CLP 220"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Referenzbild */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Referenzbild
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Optionales Übersichtsbild für diesen Wartungsplan (z.B. Foto der Maschine oder des Wartungsbereichs)
          </p>
          
          <div className="flex items-start gap-4">
            {/* Bestehendes Bild (nur bei Edit) */}
            {isEdit && currentPlan?.reference_image && !referenceImageFile && (
              <div className="relative group">
                <img 
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${currentPlan.reference_image}`}
                  alt="Aktuelles Referenzbild" 
                  className="w-40 h-40 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={handleDeleteReferenceImage}
                  disabled={deletingImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 disabled:opacity-50"
                  title="Bild löschen"
                >
                  {deletingImage ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* Neues Bild Vorschau */}
            {referenceImageFile && (
              <div className="relative">
                <img 
                  src={URL.createObjectURL(referenceImageFile)} 
                  alt="Neues Referenzbild" 
                  className="w-40 h-40 object-cover rounded-lg border border-blue-300 dark:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => setReferenceImageFile(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Neu
                </span>
              </div>
            )}

            {/* Upload Button */}
            <label className="flex flex-col items-center justify-center w-40 h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
              <Camera className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-2">
                {referenceImageFile ? 'Anderes Bild' : (isEdit && currentPlan?.reference_image) ? 'Ersetzen' : 'Hochladen'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setReferenceImageFile(file);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Link
            to={isEdit ? `/maintenance/plans/${id}` : '/maintenance/plans'}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving || !form.title || !form.machine_id || !form.maintenance_type_id}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Speichern...' : isEdit ? 'Aktualisieren' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  );
}
