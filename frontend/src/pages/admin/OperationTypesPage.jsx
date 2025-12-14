// frontend/src/pages/admin/OperationTypesPage.jsx
/**
 * Admin-Seite zur Verwaltung von Operationstypen
 */

import { useEffect, useState } from 'react';
import { useOperationTypesStore } from '../../stores/operationTypesStore';
import { toast } from '../../components/Toaster';

// Verfügbare Farben
const COLORS = [
  { id: 'blue', name: 'Blau', class: 'bg-blue-500' },
  { id: 'indigo', name: 'Indigo', class: 'bg-indigo-500' },
  { id: 'purple', name: 'Lila', class: 'bg-purple-500' },
  { id: 'amber', name: 'Amber', class: 'bg-amber-500' },
  { id: 'orange', name: 'Orange', class: 'bg-orange-500' },
  { id: 'cyan', name: 'Cyan', class: 'bg-cyan-500' },
  { id: 'green', name: 'Grün', class: 'bg-green-500' },
  { id: 'red', name: 'Rot', class: 'bg-red-500' },
  { id: 'pink', name: 'Pink', class: 'bg-pink-500' },
  { id: 'teal', name: 'Teal', class: 'bg-teal-500' },
  { id: 'gray', name: 'Grau', class: 'bg-gray-500' },
];

// Feature-Definitionen
const FEATURES = [
  { id: 'programs', label: 'NC-Programme' },
  { id: 'tools', label: 'Werkzeuge' },
  { id: 'setup_sheet', label: 'Einrichteblatt' },
  { id: 'inspection', label: 'Prüfplan' },
  { id: 'work_instruction', label: 'Arbeitsanweisung' },
  { id: 'checklist', label: 'Checkliste' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'measuring_equipment', label: 'Messmittel' },
  { id: 'raw_material', label: 'Rohmaterial' },
  { id: 'consumables', label: 'Verbrauchsmaterial' },
];

export default function OperationTypesPage() {
  const { types, loading, fetchTypes, createType, updateType, deleteType } = useOperationTypesStore();
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    op_code: '',
    color: 'blue',
    default_features: ['programs', 'tools', 'setup_sheet', 'inspection'],
    sort_order: 0,
    is_active: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTypes(true); // inkl. inaktive
  }, [fetchTypes]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      op_code: '',
      color: 'blue',
      default_features: ['programs', 'tools', 'setup_sheet', 'inspection'],
      sort_order: 0,
      is_active: true
    });
    setEditingType(null);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name || '',
      description: type.description || '',
      op_code: type.op_code || '',
      color: type.color || 'blue',
      default_features: type.default_features || [],
      sort_order: type.sort_order || 0,
      is_active: type.is_active !== false
    });
    setShowForm(true);
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Operationstyp "${type.name}" wirklich löschen?`)) {
      return;
    }

    try {
      await deleteType(type.id);
      toast.success('Operationstyp gelöscht');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    setSaving(true);
    try {
      if (editingType) {
        await updateType(editingType.id, formData);
        toast.success('Operationstyp aktualisiert');
      } else {
        await createType(formData);
        toast.success('Operationstyp erstellt');
      }
      setShowForm(false);
      resetForm();
      fetchTypes(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = (featureId) => {
    setFormData(prev => ({
      ...prev,
      default_features: prev.default_features.includes(featureId)
        ? prev.default_features.filter(f => f !== featureId)
        : [...prev.default_features, featureId]
    }));
  };

  const getColorClass = (colorId) => {
    return COLORS.find(c => c.id === colorId)?.class || 'bg-gray-500';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Operationstypen</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Vordefinierte Typen für Arbeitsgänge mit Standard-Features
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Typ
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Beschreibung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Standard-Features
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {types.map((type) => (
                <tr key={type.id} className={!type.is_active ? 'opacity-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getColorClass(type.color)}`}></div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{type.name}</span>
                        {type.op_code && (
                          <span className="ml-2 px-1.5 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                            {type.op_code}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {type.description || '–'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(type.default_features || []).map(featureId => {
                        const feature = FEATURES.find(f => f.id === featureId);
                        return feature ? (
                          <span
                            key={featureId}
                            className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                          >
                            {feature.label}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {type.is_active ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Aktiv
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                        Inaktiv
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-blue-600 dark:text-blue-400 hover:underline mr-4"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-red-600 dark:text-red-400 hover:underline"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
              {types.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    Keine Operationstypen vorhanden
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingType ? 'Operationstyp bearbeiten' : 'Neuer Operationstyp'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. CNC-Fräsen"
                />
              </div>

              {/* OP-Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OP-Code
                </label>
                <input
                  type="text"
                  value={formData.op_code}
                  onChange={(e) => setFormData({ ...formData, op_code: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="z.B. CNC-F, MAT, ETG"
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Wird beim Erstellen einer Operation automatisch vorausgefüllt
                </p>
              </div>

              {/* Beschreibung */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optionale Beschreibung..."
                />
              </div>

              {/* Farbe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Farbe
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.id })}
                      className={`w-8 h-8 rounded-full ${color.class} transition-all ${
                        formData.color === color.id
                          ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800'
                          : 'hover:scale-110'
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Default Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Standard-Features (beim Erstellen einer OP aktiviert)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURES.map(feature => (
                    <label
                      key={feature.id}
                      className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={formData.default_features.includes(feature.id)}
                        onChange={() => toggleFeature(feature.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sortierung & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sortierung
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
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
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={saving}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  {editingType ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
