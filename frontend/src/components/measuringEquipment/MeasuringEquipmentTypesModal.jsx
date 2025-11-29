import { useState, useEffect } from 'react';
import { useMeasuringEquipmentStore } from '../../stores/measuringEquipmentStore';
import { toast } from '../Toaster';

export default function MeasuringEquipmentTypesModal({ onClose }) {
  const { types, fetchTypes, createType, updateType, deleteType } = useMeasuringEquipmentStore();
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: 'ruler',
    default_calibration_interval_months: 12,
    sort_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchTypes();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'ruler',
      default_calibration_interval_months: 12,
      sort_order: 0,
      is_active: true,
    });
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (type) => {
    setFormData({
      name: type.name,
      description: type.description || '',
      icon: type.icon || 'ruler',
      default_calibration_interval_months: type.default_calibration_interval_months || 12,
      sort_order: type.sort_order || 0,
      is_active: type.is_active,
    });
    setEditingType(type);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      if (editingType) {
        await updateType(editingType.id, formData);
        toast.success('Typ aktualisiert');
      } else {
        await createType(formData);
        toast.success('Typ erstellt');
      }
      resetForm();
      fetchTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type) => {
    if (type.equipment_count > 0) {
      toast.error(`Typ "${type.name}" wird noch von ${type.equipment_count} Messmittel(n) verwendet`);
      return;
    }
    if (!window.confirm(`Typ "${type.name}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteType(type.id);
      toast.success('Typ gelöscht');
      fetchTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const iconOptions = [
    { value: 'ruler', label: '📏 Lineal' },
    { value: 'circle-dot', label: '⊙ Mikrometer' },
    { value: 'circle', label: '○ Ring' },
    { value: 'gauge', label: '🔘 Messuhr' },
    { value: 'layers', label: '☰ Fühlerlehre' },
    { value: 'cylinder', label: '⬤ Dorn' },
    { value: 'move-horizontal', label: '↔ Rachenlehre' },
    { value: 'arrow-down', label: '↓ Tiefenmaß' },
    { value: 'arrow-up', label: '↑ Höhenmessgerät' },
    { value: 'square', label: '□ Endmaß' },
    { value: 'triangle', label: '△ Winkelmesser' },
    { value: 'activity', label: '〜 Rauheit' },
    { value: 'box', label: '⬛ KMG' },
    { value: 'tool', label: '🔧 Sonstiges' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div 
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Messmitteltypen verwalten
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* Add Button */}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full mb-4 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors"
              >
                + Neuen Typ hinzufügen
              </button>
            )}

            {/* Form */}
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. Koordinatenmessgerät"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Icon
                    </label>
                    <select
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      {iconOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Kalibrierintervall (Monate)
                    </label>
                    <input
                      type="number"
                      value={formData.default_calibration_interval_months}
                      onChange={(e) => setFormData({ ...formData, default_calibration_interval_months: parseInt(e.target.value) || 12 })}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sortierung
                    </label>
                    <input
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Aktiv</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Beschreibung
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Speichern...' : (editingType ? 'Aktualisieren' : 'Erstellen')}
                  </button>
                </div>
              </form>
            )}

            {/* Types List */}
            <div className="space-y-2">
              {types.map((type) => (
                <div
                  key={type.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    type.is_active 
                      ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600' 
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {iconOptions.find(i => i.value === type.icon)?.label.split(' ')[0] || '🔧'}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {type.name}
                        {!type.is_active && (
                          <span className="ml-2 text-xs text-gray-500">(inaktiv)</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {type.default_calibration_interval_months} Mon. · {type.equipment_count || 0} Messmittel
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(type)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Bearbeiten"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      disabled={type.equipment_count > 0}
                      className={`p-2 rounded-lg ${
                        type.equipment_count > 0
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={type.equipment_count > 0 ? 'Wird noch verwendet' : 'Löschen'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
