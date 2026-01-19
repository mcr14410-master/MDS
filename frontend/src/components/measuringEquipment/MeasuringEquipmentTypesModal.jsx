import { useState, useEffect, useRef } from 'react';
import { useMeasuringEquipmentStore } from '../../stores/measuringEquipmentStore';
import { toast } from '../Toaster';

export default function MeasuringEquipmentTypesModal({ onClose }) {
  const { types, fetchTypes, createType, updateType, deleteType } = useMeasuringEquipmentStore();
  const [localTypes, setLocalTypes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [isNewType, setIsNewType] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(getEmptyFormData());
  
  // Drag & Drop State
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const dragCounter = useRef(0);

  // Feld-Kategorien
  const fieldCategoryOptions = [
    { value: 'measuring_instrument', label: 'Messinstrument', hint: 'Messbereich, Auflösung, Genauigkeit' },
    { value: 'gauge', label: 'Lehre', hint: 'Nennmaß, Toleranzklasse' },
    { value: 'thread_gauge', label: 'Gewindelehre', hint: 'Gewindenorm, Größe, Steigung, Toleranz' },
    { value: 'gauge_block', label: 'Endmaß', hint: 'Nennmaß, Genauigkeitsklasse' },
    { value: 'angle_gauge', label: 'Winkelmesser', hint: 'Nennwinkel, Toleranz' },
    { value: 'surface_tester', label: 'Rauheitsmesser', hint: 'Messparameter (Ra, Rz)' },
    { value: 'other', label: 'Sonstiges', hint: 'Nur Basisfelder' },
  ];

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

  function getEmptyFormData() {
    return {
      name: '',
      description: '',
      icon: 'ruler',
      default_calibration_interval_months: 12,
      is_active: true,
      field_category: 'measuring_instrument',
    };
  }

  useEffect(() => {
    fetchTypes();
  }, []);

  useEffect(() => {
    // Sortierte Kopie für lokale Bearbeitung
    setLocalTypes([...types].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
  }, [types]);

  const handleExpand = (type) => {
    if (expandedId === type.id) {
      setExpandedId(null);
      setIsNewType(false);
    } else {
      setExpandedId(type.id);
      setIsNewType(false);
      setFormData({
        name: type.name,
        description: type.description || '',
        icon: type.icon || 'ruler',
        default_calibration_interval_months: type.default_calibration_interval_months || 12,
        is_active: type.is_active,
        field_category: type.field_category || 'measuring_instrument',
      });
    }
  };

  const handleAddNew = () => {
    setExpandedId('new');
    setIsNewType(true);
    setFormData(getEmptyFormData());
  };

  const handleCancel = () => {
    setExpandedId(null);
    setIsNewType(false);
    setFormData(getEmptyFormData());
  };

  const handleSubmit = async (typeId) => {
    if (!formData.name.trim()) {
      toast.error('Name ist erforderlich');
      return;
    }

    setLoading(true);
    try {
      if (isNewType) {
        // Neue Sortierung: ans Ende
        const maxSortOrder = localTypes.reduce((max, t) => Math.max(max, t.sort_order || 0), 0);
        await createType({ ...formData, sort_order: maxSortOrder + 1 });
        toast.success('Typ erstellt');
      } else {
        await updateType(typeId, formData);
        toast.success('Typ aktualisiert');
      }
      setExpandedId(null);
      setIsNewType(false);
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
      if (expandedId === type.id) {
        setExpandedId(null);
      }
      fetchTypes();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, typeId) => {
    setDraggedId(typeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', typeId);
    // Leicht verzögert für visuelles Feedback
    setTimeout(() => {
      e.target.style.opacity = '0.5';
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedId(null);
    setDragOverId(null);
    dragCounter.current = 0;
  };

  const handleDragEnter = (e, typeId) => {
    e.preventDefault();
    dragCounter.current++;
    if (typeId !== draggedId) {
      setDragOverId(typeId);
    }
  };

  const handleDragLeave = (e) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverId(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    dragCounter.current = 0;

    if (draggedId === targetId || !draggedId) return;

    // Lokale Neuordnung
    const newTypes = [...localTypes];
    const draggedIndex = newTypes.findIndex(t => t.id === draggedId);
    const targetIndex = newTypes.findIndex(t => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Element entfernen und an neuer Position einfügen
    const [draggedItem] = newTypes.splice(draggedIndex, 1);
    newTypes.splice(targetIndex, 0, draggedItem);

    // Neue sort_order Werte zuweisen
    const updatedTypes = newTypes.map((t, index) => ({
      ...t,
      sort_order: index
    }));

    setLocalTypes(updatedTypes);

    // Backend aktualisieren
    try {
      // Alle geänderten Typen aktualisieren
      for (const type of updatedTypes) {
        const originalType = types.find(t => t.id === type.id);
        if (originalType && originalType.sort_order !== type.sort_order) {
          await updateType(type.id, { sort_order: type.sort_order });
        }
      }
      toast.success('Reihenfolge gespeichert');
      fetchTypes();
    } catch (error) {
      toast.error('Fehler beim Speichern der Reihenfolge');
      // Zurücksetzen bei Fehler
      setLocalTypes([...types].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)));
    }
  };

  const getIconDisplay = (iconValue) => {
    const icon = iconOptions.find(i => i.value === iconValue);
    return icon ? icon.label.split(' ')[0] : '📏';
  };

  const renderForm = (typeId) => (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
      <div className="grid grid-cols-2 gap-4">
        {/* Name */}
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
            autoFocus
          />
        </div>

        {/* Feld-Kategorie */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Feld-Kategorie
          </label>
          <select
            value={formData.field_category}
            onChange={(e) => setFormData({ ...formData, field_category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          >
            {fieldCategoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {fieldCategoryOptions.find(o => o.value === formData.field_category)?.hint}
          </p>
        </div>

        {/* Icon */}
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

        {/* Kalibrierintervall */}
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

        {/* Beschreibung */}
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

        {/* Aktiv Checkbox */}
        <div className="col-span-2">
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

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Abbrechen
        </button>
        <button
          onClick={() => handleSubmit(typeId)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  );

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
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Messmitteltypen verwalten
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Drag & Drop zum Sortieren
              </p>
            </div>
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
          <div className="p-6 max-h-[65vh] overflow-y-auto">
            {/* Add New Button */}
            {expandedId !== 'new' && (
              <button
                onClick={handleAddNew}
                className="w-full mb-4 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuen Typ hinzufügen
              </button>
            )}

            {/* New Type Form */}
            {expandedId === 'new' && (
              <div className="mb-4 rounded-lg border-2 border-blue-500 dark:border-blue-400 overflow-hidden">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <span className="font-medium text-blue-700 dark:text-blue-300">Neuer Typ</span>
                </div>
                {renderForm(null)}
              </div>
            )}

            {/* Types List */}
            <div className="space-y-2">
              {localTypes.map((type) => (
                <div
                  key={type.id}
                  draggable={expandedId !== type.id}
                  onDragStart={(e) => handleDragStart(e, type.id)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => handleDragEnter(e, type.id)}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, type.id)}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    dragOverId === type.id 
                      ? 'border-blue-500 border-2 bg-blue-50 dark:bg-blue-900/20' 
                      : type.is_active 
                        ? 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600' 
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                  } ${draggedId === type.id ? 'opacity-50' : ''} ${
                    expandedId === type.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  {/* Header Row */}
                  <div 
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600/50"
                    onClick={() => handleExpand(type)}
                  >
                    {/* Drag Handle */}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                      </svg>
                    </div>

                    {/* Icon */}
                    <span className="text-xl">{getIconDisplay(type.icon)}</span>

                    {/* Name & Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white truncate">
                          {type.name}
                        </span>
                        {!type.is_active && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded">
                            Inaktiv
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {fieldCategoryOptions.find(o => o.value === type.field_category)?.label || 'Messinstrument'}
                        {type.equipment_count > 0 && ` • ${type.equipment_count} Messmittel`}
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(type);
                      }}
                      disabled={type.equipment_count > 0}
                      className={`p-1.5 rounded transition-colors ${
                        type.equipment_count > 0
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                      }`}
                      title={type.equipment_count > 0 ? 'Wird noch verwendet' : 'Löschen'}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>

                    {/* Expand Chevron */}
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedId === type.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Expanded Form */}
                  {expandedId === type.id && renderForm(type.id)}
                </div>
              ))}
            </div>

            {localTypes.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Keine Messmitteltypen vorhanden
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
