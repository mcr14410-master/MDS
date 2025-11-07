// frontend/src/components/OperationForm.jsx
import { useState, useEffect } from 'react';
import { useOperationsStore } from '../stores/operationsStore';
import { toast } from './Toaster';

export default function OperationForm({ partId, operation, onClose, onSuccess }) {
  const { createOperation, updateOperation } = useOperationsStore();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    op_number: '',
    op_name: '',
    setup_time_minutes: '',
    cycle_time_seconds: '',
    description: '',
    notes: '',
    machine_id: '',
    sequence: '',
  });

  const [errors, setErrors] = useState({});

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
        sequence: operation.sequence || '',
      });
    }
  }, [operation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.op_number.trim()) {
      newErrors.op_number = 'OP-Nummer ist erforderlich';
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
      // Prepare data
      const submitData = {
        part_id: partId,
        op_number: formData.op_number.trim(),
        op_name: formData.op_name.trim(),
        setup_time_minutes: formData.setup_time_minutes ? parseInt(formData.setup_time_minutes) : null,
        cycle_time_seconds: formData.cycle_time_seconds ? Math.round(parseFloat(formData.cycle_time_seconds) * 60) : null,
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
        machine_id: formData.machine_id ? parseInt(formData.machine_id) : null,
        sequence: formData.sequence ? parseInt(formData.sequence) : null,
      };

      if (operation) {
        // Update existing operation
        await updateOperation(operation.id, submitData);
        toast.success('Arbeitsgang erfolgreich aktualisiert');
      } else {
        // Create new operation
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* OP Number & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                OP-Nummer <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="op_number"
                value={formData.op_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  errors.op_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="z.B. OP10"
                disabled={loading}
              />
              {errors.op_number && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.op_number}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sequence
              </label>
              <input
                type="number"
                name="sequence"
                value={formData.sequence}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                placeholder="Auto (10, 20, 30...)"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional: Automatisch wenn leer
              </p>
            </div>
          </div>

          {/* OP Name */}
          <div>
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
              placeholder="z.B. Drehen Außendurchmesser"
              disabled={loading}
            />
            {errors.op_name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.op_name}</p>
            )}
          </div>

          {/* Times */}
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
                placeholder="z.B. 3"
                min="0"
                step="0.1"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                z.B. 3 für 3 Minuten, 0.5 für 30 Sekunden
              </p>
            </div>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Maschine
            </label>
            <input
              type="number"
              name="machine_id"
              value={formData.machine_id}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Optional: Maschinen-ID"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maschinen-Verwaltung kommt in Woche 8
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschreibung
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              placeholder="Beschreibung des Arbeitsgangs..."
              disabled={loading}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notizen
            </label>
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
