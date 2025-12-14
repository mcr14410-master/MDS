// frontend/src/components/OperationForm.jsx
/**
 * Formular zum Erstellen/Bearbeiten von Arbeitsgängen
 * Mit Operation Type Auswahl und Feature Toggles
 */

import { useState, useEffect } from 'react';
import { useOperationsStore } from '../stores/operationsStore';
import { useOperationTypesStore } from '../stores/operationTypesStore';
import { useMachinesStore } from '../stores/machinesStore';
import { toast } from './Toaster';

// Feature-Definitionen
const FEATURE_DEFINITIONS = [
  { id: 'programs', label: 'NC-Programme', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
  { id: 'tools', label: 'Werkzeuge', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'setup_sheet', label: 'Einrichteblatt', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'inspection', label: 'Prüfplan', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'work_instruction', label: 'Arbeitsanweisung', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'checklist', label: 'Checkliste', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'documents', label: 'Dokumente', icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' },
  { id: 'measuring_equipment', label: 'Messmittel', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
  { id: 'raw_material', label: 'Rohmaterial', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { id: 'consumables', label: 'Verbrauchsmaterial', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
];

// Typ-Icons (passend zum Namen)
const TYPE_ICONS = {
  'CNC-Fräsen': 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
  'CNC-Drehen': 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  'Schleifen': 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  'Erodieren': 'M13 10V3L4 14h7v7l9-11h-7z',
  'Manuell': 'M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11',
  'Entgraten': 'M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z',
  'Reinigen': 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  'Qualitätskontrolle': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'Oberflächenbehandlung': 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01',
  'Montage': 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z',
  'Verpacken': 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  'Lager/Logistik': 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  'Generisch': 'M4 6h16M4 10h16M4 14h16M4 18h16',
};

// Typ-Farben (für Badge und Selection)
const TYPE_COLORS = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-700 dark:text-blue-300', selected: 'ring-blue-500' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300 dark:border-indigo-700', text: 'text-indigo-700 dark:text-indigo-300', selected: 'ring-indigo-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300 dark:border-purple-700', text: 'text-purple-700 dark:text-purple-300', selected: 'ring-purple-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-700 dark:text-amber-300', selected: 'ring-amber-500' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', text: 'text-orange-700 dark:text-orange-300', selected: 'ring-orange-500' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-300 dark:border-cyan-700', text: 'text-cyan-700 dark:text-cyan-300', selected: 'ring-cyan-500' },
  green: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300 dark:border-green-700', text: 'text-green-700 dark:text-green-300', selected: 'ring-green-500' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-700 dark:text-pink-300', selected: 'ring-pink-500' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-300 dark:border-teal-700', text: 'text-teal-700 dark:text-teal-300', selected: 'ring-teal-500' },
  gray: { bg: 'bg-gray-50 dark:bg-gray-700', border: 'border-gray-300 dark:border-gray-600', text: 'text-gray-700 dark:text-gray-300', selected: 'ring-gray-500' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-300 dark:border-slate-700', text: 'text-slate-700 dark:text-slate-300', selected: 'ring-slate-500' },
};

export default function OperationForm({ partId, operation, onClose, onSuccess }) {
  const { createOperation, updateOperation } = useOperationsStore();
  const { types, fetchTypes } = useOperationTypesStore();
  const { machines, fetchMachines } = useMachinesStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    op_number: '',
    op_name: '',
    setup_time_minutes: '',
    cycle_time_seconds: '',
    description: '',
    notes: '',
    machine_id: '',
    operation_type_id: '',
    enabled_features: ['programs', 'tools', 'setup_sheet', 'inspection'],
  });

  const [errors, setErrors] = useState({});

  // Operation Types und Maschinen laden
  useEffect(() => {
    fetchTypes();
    fetchMachines();
  }, [fetchTypes, fetchMachines]);

  // Populate form if editing
  useEffect(() => {
    if (operation) {
      setFormData({
        op_number: operation.op_number || '',
        op_name: operation.op_name || '',
        setup_time_minutes: operation.setup_time_minutes || '',
        cycle_time_seconds: operation.cycle_time_seconds ? (operation.cycle_time_seconds / 60).toFixed(2) : '',
        description: operation.description || '',
        notes: operation.notes || '',
        machine_id: operation.machine_id || '',
        operation_type_id: operation.operation_type_id || '',
        enabled_features: operation.enabled_features || ['programs', 'tools', 'setup_sheet', 'inspection'],
      });
    }
  }, [operation]);

  // Typ-Auswahl Handler - setzt auch op_number und op_name automatisch
  const handleTypeChange = (typeId) => {
    const selectedType = types.find(t => t.id === parseInt(typeId));
    
    setFormData(prev => ({
      ...prev,
      operation_type_id: typeId ? parseInt(typeId) : '',
      // OP-Code automatisch setzen (nur bei Neu-Erstellung und wenn Typ einen Code hat)
      op_number: (!operation && selectedType?.op_code) ? selectedType.op_code : prev.op_number,
      // OP-Bezeichnung automatisch setzen (nur wenn leer oder bei Neu-Erstellung)
      op_name: (!operation && selectedType) ? selectedType.name : prev.op_name,
      // Default-Features vom Typ übernehmen
      enabled_features: selectedType ? selectedType.default_features : prev.enabled_features
    }));
  };

  // Feature Toggle Handler
  const handleFeatureToggle = (featureId) => {
    setFormData(prev => {
      const features = prev.enabled_features || [];
      if (features.includes(featureId)) {
        return { ...prev, enabled_features: features.filter(f => f !== featureId) };
      } else {
        return { ...prev, enabled_features: [...features, featureId] };
      }
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.op_number.trim()) {
      newErrors.op_number = 'OP-Code ist erforderlich';
    }

    if (!formData.op_name.trim()) {
      newErrors.op_name = 'OP-Bezeichnung ist erforderlich';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Bitte fülle alle Pflichtfelder aus');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        part_id: partId,
        op_number: formData.op_number.trim(),
        op_name: formData.op_name.trim(),
        setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : null,
        cycle_time_seconds: formData.cycle_time_seconds ? Math.round(parseFloat(formData.cycle_time_seconds) * 60) : null,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        machine_id: formData.machine_id ? parseInt(formData.machine_id) : null,
        operation_type_id: formData.operation_type_id || null,
        enabled_features: formData.enabled_features,
      };

      if (operation) {
        await updateOperation(operation.id, submitData);
        toast.success('Arbeitsgang erfolgreich aktualisiert');
      } else {
        await createOperation(submitData);
        toast.success('Arbeitsgang erfolgreich erstellt');
      }

      onSuccess();
    } catch (err) {
      toast.error(err.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Aktuell gewählter Typ
  const selectedType = types.find(t => t.id === formData.operation_type_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {operation ? 'Arbeitsgang bearbeiten' : 'Neuer Arbeitsgang'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Operation Type Selection - verbessert */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Operationstyp auswählen
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {types.map((type) => {
                const isSelected = formData.operation_type_id === type.id;
                const colors = TYPE_COLORS[type.color] || TYPE_COLORS.gray;
                const icon = TYPE_ICONS[type.name] || TYPE_ICONS['Generisch'];
                
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handleTypeChange(type.id)}
                    className={`py-2 px-2.5 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? `${colors.bg} ${colors.border} ${colors.text} ring-2 ring-offset-2 ${colors.selected}`
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <svg className={`w-4 h-4 flex-shrink-0 ${isSelected ? colors.text : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                      </svg>
                      <span className="text-xs font-medium truncate">{type.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedType?.description && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                ℹ️ {selectedType.description}
              </p>
            )}
          </div>

          {/* Trennlinie */}
          <div className="border-t border-gray-200 dark:border-gray-700"></div>

          {/* Hinweis bei Varianten */}
          {operation?.variant_group_id && (
            <div className="flex items-start gap-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
              <svg className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-purple-700 dark:text-purple-300">
                <strong>Varianten-Hinweis:</strong> OP-Nummer und Bezeichnung werden für alle Maschinen-Varianten dieser Operation synchronisiert.
              </p>
            </div>
          )}

          {/* OP-Code und OP-Bezeichnung nebeneinander */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OP-Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="op_number"
                value={formData.op_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  errors.op_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="z.B. CNC-D"
                disabled={loading}
              />
              {errors.op_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.op_number}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OP-Bezeichnung <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="op_name"
                value={formData.op_name}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  errors.op_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="z.B. Außenkontur fräsen"
                disabled={loading}
              />
              {errors.op_name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.op_name}</p>
              )}
            </div>
          </div>

          {/* Zeiten */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rüstzeit (Minuten)
              </label>
              <input
                type="number"
                name="setup_time_minutes"
                value={formData.setup_time_minutes}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="z.B. 45"
                min="0"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zykluszeit (Minuten)
              </label>
              <input
                type="number"
                name="cycle_time_seconds"
                value={formData.cycle_time_seconds}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="z.B. 3.5"
                min="0"
                step="0.1"
                disabled={loading}
              />
            </div>
          </div>

          {/* Maschine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maschine
            </label>
            <select
              name="machine_id"
              value={formData.machine_id}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              disabled={loading}
            >
              <option value="">-- Keine Maschine --</option>
              {machines
                .filter(m => m.is_active !== false)
                .map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} {machine.control_type ? `(${machine.control_type})` : ''}
                  </option>
                ))
              }
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Für Maschinen-Varianten: Erst Maschine zuweisen, dann Variante erstellen
            </p>
          </div>

          {/* Features Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Aktivierte Bereiche
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Welche Tabs sollen für diesen Arbeitsgang verfügbar sein?
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEATURE_DEFINITIONS.map((feature) => {
                const isEnabled = formData.enabled_features?.includes(feature.id);
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => handleFeatureToggle(feature.id)}
                    className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 ${
                      isEnabled
                        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                    <span className="text-xs font-medium truncate">{feature.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="2"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Optionale Beschreibung..."
              disabled={loading}
            />
          </div>

          {/* Notizen (eingeklappt) */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
              + Weitere Optionen (Notizen)
            </summary>
            <div className="mt-3">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="Interne Notizen..."
                disabled={loading}
              />
            </div>
          </details>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {operation ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
