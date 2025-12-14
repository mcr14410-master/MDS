// frontend/src/components/CreateVariantModal.jsx
/**
 * Modal zum Erstellen einer Maschinen-Variante einer Operation
 */

import { useState, useEffect } from 'react';
import { useMachinesStore } from '../stores/machinesStore';
import { toast } from './Toaster';
import API_BASE_URL from '../config/api';

export default function CreateVariantModal({ operation, onClose, onSuccess }) {
  const { machines, fetchMachines } = useMachinesStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    machine_id: '',
    setup_time_minutes: operation?.setup_time_minutes || '',
    cycle_time_seconds: operation?.cycle_time_seconds ? (operation.cycle_time_seconds / 60).toFixed(2) : '',
    copy_programs: false,
    copy_tools: false,
    copy_setup_sheets: false,
    copy_inspection_plans: false,
  });

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // Bereits verwendete Maschinen-IDs (von existierenden Varianten)
  const [usedMachineIds, setUsedMachineIds] = useState([]);

  useEffect(() => {
    const loadVariants = async () => {
      if (!operation?.variant_group_id && !operation?.machine_id) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/variants`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const ids = data.data.map(v => v.machine_id).filter(Boolean);
          // Auch die aktuelle Operation hinzufügen
          if (operation.machine_id) {
            ids.push(operation.machine_id);
          }
          setUsedMachineIds(ids);
        }
      } catch (error) {
        console.error('Error loading variants:', error);
      }
    };
    
    loadVariants();
  }, [operation]);

  // Verfügbare Maschinen (nicht bereits als Variante verwendet)
  const availableMachines = machines.filter(m => 
    m.is_active !== false && !usedMachineIds.includes(m.id)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.machine_id) {
      toast.error('Bitte wähle eine Maschine aus');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/operations/${operation.id}/create-variant`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          machine_id: parseInt(formData.machine_id),
          setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : null,
          cycle_time_seconds: formData.cycle_time_seconds ? Math.round(parseFloat(formData.cycle_time_seconds) * 60) : null,
          copy_programs: formData.copy_programs,
          copy_tools: formData.copy_tools,
          copy_setup_sheets: formData.copy_setup_sheets,
          copy_inspection_plans: formData.copy_inspection_plans,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Fehler beim Erstellen');
      }

      toast.success('Variante erfolgreich erstellt');
      onSuccess();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedMachine = machines.find(m => m.id === parseInt(formData.machine_id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Variante erstellen
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {operation?.op_number} - {operation?.op_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Maschinen-Auswahl */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ziel-Maschine <span className="text-red-500">*</span>
            </label>
            {availableMachines.length === 0 ? (
              <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
                Alle aktiven Maschinen haben bereits eine Variante für diese Operation.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                {availableMachines.map((machine) => (
                  <label
                    key={machine.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.machine_id === String(machine.id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="machine_id"
                      value={machine.id}
                      checked={formData.machine_id === String(machine.id)}
                      onChange={(e) => setFormData(prev => ({ ...prev, machine_id: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {machine.name}
                      </p>
                      {machine.location && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{machine.location}</p>
                      )}
                    </div>
                    {machine.control_type && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                        {machine.control_type}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Zeiten */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rüstzeit (Minuten)
              </label>
              <input
                type="number"
                value={formData.setup_time_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, setup_time_minutes: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
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
                value={formData.cycle_time_seconds}
                onChange={(e) => setFormData(prev => ({ ...prev, cycle_time_seconds: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                placeholder="z.B. 3.5"
                min="0"
                step="0.1"
                disabled={loading}
              />
            </div>
          </div>

          {/* Kopier-Optionen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Was soll kopiert werden?
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Kopierte Inhalte können danach für die neue Maschine angepasst werden
            </p>
            <div className="space-y-2">
              {[
                { id: 'copy_programs', label: 'NC-Programme', icon: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
                { id: 'copy_tools', label: 'Werkzeuglisten', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0' },
                { id: 'copy_setup_sheets', label: 'Einrichteblätter', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                { id: 'copy_inspection_plans', label: 'Prüfpläne', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    formData[option.id]
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData[option.id]}
                    onChange={(e) => setFormData(prev => ({ ...prev, [option.id]: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                    disabled={loading}
                  />
                  <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={option.icon} />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info-Box */}
          {selectedMachine && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Neue Variante:</strong> {operation?.op_number} auf {selectedMachine.name}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Die Variante erhält eigene Programme, Werkzeuge und Setup-Dokumente.
              </p>
            </div>
          )}

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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading || !formData.machine_id || availableMachines.length === 0}
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              Variante erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
