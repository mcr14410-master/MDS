import { useState, useEffect } from 'react';
import { 
  Clock, Plus, Trash2, Save, Settings, Users, Edit2, X, Check,
  AlertTriangle
} from 'lucide-react';
import { useTimeTrackingStore } from '../../stores/timeTrackingStore';

const WEEKDAYS = [
  { key: 'monday', label: 'Montag', short: 'Mo' },
  { key: 'tuesday', label: 'Dienstag', short: 'Di' },
  { key: 'wednesday', label: 'Mittwoch', short: 'Mi' },
  { key: 'thursday', label: 'Donnerstag', short: 'Do' },
  { key: 'friday', label: 'Freitag', short: 'Fr' },
  { key: 'saturday', label: 'Samstag', short: 'Sa' },
  { key: 'sunday', label: 'Sonntag', short: 'So' }
];

const SECTIONS = [
  { id: 'models', label: 'Zeitmodelle', icon: Clock },
  { id: 'settings', label: 'Einstellungen', icon: Settings }
];

export default function TimeTrackingSettingsPanel() {
  const {
    timeModels,
    settings,
    loading,
    fetchTimeModels,
    createTimeModel,
    updateTimeModel,
    deleteTimeModel,
    fetchSettings,
    updateSettings,
    formatMinutes
  } = useTimeTrackingStore();

  const [activeSection, setActiveSection] = useState('models');
  const [editingModel, setEditingModel] = useState(null);
  const [showModelForm, setShowModelForm] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [modelForm, setModelForm] = useState({
    name: '',
    description: '',
    monday_minutes: 510,
    tuesday_minutes: 510,
    wednesday_minutes: 510,
    thursday_minutes: 510,
    friday_minutes: 360,
    saturday_minutes: null,
    sunday_minutes: null,
    default_break_minutes: 30,
    min_break_minutes: 30,
    is_default: false
  });

  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => {
    fetchTimeModels();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      const form = {};
      Object.entries(settings).forEach(([key, data]) => {
        form[key] = data.value;
      });
      setSettingsForm(form);
    }
  }, [settings]);

  const resetModelForm = () => {
    setModelForm({
      name: '',
      description: '',
      monday_minutes: 510,
      tuesday_minutes: 510,
      wednesday_minutes: 510,
      thursday_minutes: 510,
      friday_minutes: 360,
      saturday_minutes: null,
      sunday_minutes: null,
      default_break_minutes: 30,
      min_break_minutes: 30,
      is_default: false
    });
    setEditingModel(null);
    setShowModelForm(false);
  };

  const openEditModel = (model) => {
    setModelForm({
      name: model.name,
      description: model.description || '',
      monday_minutes: model.monday_minutes,
      tuesday_minutes: model.tuesday_minutes,
      wednesday_minutes: model.wednesday_minutes,
      thursday_minutes: model.thursday_minutes,
      friday_minutes: model.friday_minutes,
      saturday_minutes: model.saturday_minutes,
      sunday_minutes: model.sunday_minutes,
      default_break_minutes: model.default_break_minutes || 30,
      min_break_minutes: model.min_break_minutes || 30,
      is_default: model.is_default
    });
    setEditingModel(model);
    setShowModelForm(true);
  };

  const handleSaveModel = async () => {
    try {
      setError(null);
      if (editingModel) {
        await updateTimeModel(editingModel.id, modelForm);
        setSuccess('Zeitmodell aktualisiert');
      } else {
        await createTimeModel(modelForm);
        setSuccess('Zeitmodell erstellt');
      }
      resetModelForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  const handleDeleteModel = async (id) => {
    if (!confirm('Zeitmodell wirklich löschen?')) return;
    try {
      await deleteTimeModel(id);
      setSuccess('Zeitmodell gelöscht');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Löschen');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setError(null);
      await updateSettings(settingsForm);
      setSuccess('Einstellungen gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    }
  };

  // Minuten zu Stunden:Minuten Input-Wert
  const minutesToTime = (minutes) => {
    if (minutes === null || minutes === undefined) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  // Zeit-Input zu Minuten
  const timeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === '') return null;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * 60) + (m || 0);
  };

  const calculateWeeklyMinutes = (form) => {
    return WEEKDAYS.reduce((sum, day) => {
      const mins = form[`${day.key}_minutes`];
      return sum + (mins || 0);
    }, 0);
  };

  return (
    <div className="flex gap-6">
      {/* Left: Vertical Navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          {SECTIONS.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setError(null);
                setSuccess(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
            </div>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Check className="h-5 w-5" />
              <span>{success}</span>
            </div>
          </div>
        )}

      {/* ============================================ */}
      {/* ZEITMODELLE */}
      {/* ============================================ */}
      {activeSection === 'models' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zeitmodelle</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Definieren Sie Arbeitszeitmodelle für verschiedene Mitarbeitergruppen
              </p>
            </div>
            {!showModelForm && (
              <button
                onClick={() => setShowModelForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Neues Modell
              </button>
            )}
          </div>

          {/* Model Form */}
          {showModelForm && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {editingModel ? 'Zeitmodell bearbeiten' : 'Neues Zeitmodell'}
                </h4>
                <button onClick={resetModelForm} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={modelForm.name}
                    onChange={(e) => setModelForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="z.B. Vollzeit 40h"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={modelForm.description}
                    onChange={(e) => setModelForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="z.B. Standard Mo-Do 8,5h, Fr 6h"
                  />
                </div>
              </div>

              {/* Wochentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Soll-Stunden pro Tag
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {WEEKDAYS.map(day => (
                    <div key={day.key} className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day.short}</div>
                      <input
                        type="text"
                        value={minutesToTime(modelForm[`${day.key}_minutes`])}
                        onChange={(e) => setModelForm(f => ({ 
                          ...f, 
                          [`${day.key}_minutes`]: timeToMinutes(e.target.value) 
                        }))}
                        className="w-full px-2 py-1 text-center text-sm border border-gray-300 dark:border-gray-600 
                                 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="0:00"
                      />
                    </div>
                  ))}
                </div>
                <div className="text-right text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Woche: {formatMinutes(calculateWeeklyMinutes(modelForm))} ({(calculateWeeklyMinutes(modelForm) / 60).toFixed(1)}h)
                </div>
              </div>

              {/* Pausen */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Standard-Pause (Min)
                  </label>
                  <input
                    type="number"
                    value={modelForm.default_break_minutes}
                    onChange={(e) => setModelForm(f => ({ ...f, default_break_minutes: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mindest-Pause (Min)
                  </label>
                  <input
                    type="number"
                    value={modelForm.min_break_minutes}
                    onChange={(e) => setModelForm(f => ({ ...f, min_break_minutes: parseInt(e.target.value) || 30 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={modelForm.is_default}
                      onChange={(e) => setModelForm(f => ({ ...f, is_default: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Als Standard</span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={resetModelForm}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveModel}
                  disabled={!modelForm.name || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg 
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  Speichern
                </button>
              </div>
            </div>
          )}

          {/* Models List */}
          <div className="space-y-3">
            {timeModels.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Noch keine Zeitmodelle angelegt
              </div>
            ) : (
              timeModels.map(model => (
                <div 
                  key={model.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">{model.name}</h4>
                        {model.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            Standard
                          </span>
                        )}
                      </div>
                      {model.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{model.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          <strong>Woche:</strong> {formatMinutes(model.weekly_minutes)} ({(model.weekly_minutes / 60).toFixed(1)}h)
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          <strong>Pause:</strong> {model.default_break_minutes} Min
                        </span>
                        {model.user_count > 0 && (
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            {model.user_count} Mitarbeiter
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {WEEKDAYS.map(day => {
                          const mins = model[`${day.key}_minutes`];
                          return (
                            <span key={day.key} className={mins ? '' : 'opacity-40'}>
                              {day.short}: {mins ? minutesToTime(mins) : '-'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModel(model)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteModel(model.id)}
                        disabled={model.user_count > 0}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded
                                 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={model.user_count > 0 ? 'Kann nicht gelöscht werden - Mitarbeiter zugewiesen' : 'Löschen'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* EINSTELLUNGEN */}
      {/* ============================================ */}
      {activeSection === 'settings' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Globale Einstellungen</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Allgemeine Einstellungen für die Zeiterfassung
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 space-y-6">
            {/* Überstunden */}
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Überstunden</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.overtime_limit_enabled === 'true'}
                    onChange={(e) => setSettingsForm(f => ({ ...f, overtime_limit_enabled: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Obergrenze aktiv</span>
                </label>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Max. Überstunden (Std)</label>
                  <input
                    type="number"
                    value={Math.round((parseInt(settingsForm.overtime_limit_minutes) || 0) / 60)}
                    onChange={(e) => setSettingsForm(f => ({ ...f, overtime_limit_minutes: String(parseInt(e.target.value) * 60) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Warnung ab (Std)</label>
                  <input
                    type="number"
                    value={Math.round((parseInt(settingsForm.overtime_warning_minutes) || 0) / 60)}
                    onChange={(e) => setSettingsForm(f => ({ ...f, overtime_warning_minutes: String(parseInt(e.target.value) * 60) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Pausen */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Pausen</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Pause ab (Std Arbeitszeit)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={((parseInt(settingsForm.min_break_threshold_minutes) || 0) / 60).toFixed(1)}
                    onChange={(e) => setSettingsForm(f => ({ ...f, min_break_threshold_minutes: String(Math.round(parseFloat(e.target.value) * 60)) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Mindestpause (Min)</label>
                  <input
                    type="number"
                    value={settingsForm.min_break_minutes || '30'}
                    onChange={(e) => setSettingsForm(f => ({ ...f, min_break_minutes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.auto_break_deduct === 'true'}
                    onChange={(e) => setSettingsForm(f => ({ ...f, auto_break_deduct: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Pause automatisch abziehen</span>
                </label>
              </div>
            </div>

            {/* Feiertage */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Feiertage</h4>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.absence_credits_target === 'true'}
                  onChange={(e) => setSettingsForm(f => ({ ...f, absence_credits_target: e.target.checked ? 'true' : 'false' }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Bei Feiertagen Soll-Stunden gutschreiben
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-7">
                Für andere Abwesenheiten (Urlaub, Krank, etc.) wird die Gutschreibung pro Antragstyp in der Urlaubsverwaltung konfiguriert.
              </p>
            </div>

            {/* Terminal */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Terminal</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Display-Timeout (Sek)</label>
                  <input
                    type="number"
                    value={settingsForm.terminal_timeout_seconds || '30'}
                    onChange={(e) => setSettingsForm(f => ({ ...f, terminal_timeout_seconds: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.terminal_sound_enabled === 'true'}
                    onChange={(e) => setSettingsForm(f => ({ ...f, terminal_sound_enabled: e.target.checked ? 'true' : 'false' }))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sounds aktiviert</span>
                </label>
              </div>
            </div>

            {/* Aufbewahrung */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Datenschutz</h4>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Aufbewahrungsdauer (Jahre)</label>
                <input
                  type="number"
                  value={settingsForm.data_retention_years || '10'}
                  onChange={(e) => setSettingsForm(f => ({ ...f, data_retention_years: e.target.value }))}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg 
                         hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Einstellungen speichern
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
