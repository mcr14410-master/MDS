import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Info } from 'lucide-react';
import { useTimeTrackingStore } from '../../stores/timeTrackingStore';
import axios from '../../utils/axios';

export default function CorrectionModal({ user, onClose }) {
  const { createCorrection, loading, error, clearError } = useTimeTrackingStore();

  const [formData, setFormData] = useState({
    entry_type: 'clock_out',
    date: user.date || new Date().toISOString().split('T')[0],
    time: '',
    correction_reason: ''
  });
  const [validation, setValidation] = useState(null);

  // Validierung laden und nächsten erwarteten Typ setzen
  useEffect(() => {
    const loadValidation = async () => {
      try {
        const resp = await axios.get(`/api/time-tracking/entries/user/${user.user_id}/validate`, {
          params: { date: formData.date }
        });
        setValidation(resp.data);
        // Nächsten erwarteten Typ vorschlagen
        if (resp.data.expectedNext?.length > 0) {
          setFormData(prev => ({ ...prev, entry_type: resp.data.expectedNext[0] }));
        }
      } catch { /* ignore */ }
    };
    loadValidation();
  }, [user.user_id, formData.date]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.time || !formData.correction_reason) {
      alert('Bitte Zeit und Begründung eingeben');
      return;
    }

    try {
      const timestamp = new Date(`${formData.date}T${formData.time}:00`);
      await createCorrection({
        user_id: user.user_id,
        entry_type: formData.entry_type,
        timestamp: timestamp.toISOString(),
        correction_reason: formData.correction_reason
      });
      onClose(true); // true = refresh data
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Korrektur für {user.name}
          </h3>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
              <button type="button" onClick={clearError} className="ml-auto text-red-500">×</button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buchungstyp
              {validation?.expectedNext?.length > 0 && (
                <span className="ml-2 text-xs font-normal text-green-600 dark:text-green-400">
                  Vorschlag: {validation.expectedNextLabels.join(' / ')}
                </span>
              )}
            </label>
            <select
              value={formData.entry_type}
              onChange={e => setFormData({ ...formData, entry_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="clock_in">Kommen{validation?.expectedNext?.includes('clock_in') ? ' ✓' : ''}</option>
              <option value="clock_out">Gehen{validation?.expectedNext?.includes('clock_out') ? ' ✓' : ''}</option>
              <option value="break_start">Pause Start{validation?.expectedNext?.includes('break_start') ? ' ✓' : ''}</option>
              <option value="break_end">Pause Ende{validation?.expectedNext?.includes('break_end') ? ' ✓' : ''}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uhrzeit
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
          </div>

          {/* Validierungs-Hinweise */}
          {validation && !validation.valid && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Aktuelle Reihenfolge-Hinweise</span>
              </div>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 ml-6">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Typ-Warnung: gewählter Typ nicht erwartet */}
          {validation?.expectedNext?.length > 0 && !validation.expectedNext.includes(formData.entry_type) && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
              <span className="text-xs text-orange-700 dark:text-orange-400">
                Gewählter Typ weicht vom erwarteten ab. Erwartet: {validation.expectedNextLabels.join(' oder ')}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Begründung *
            </label>
            <textarea
              value={formData.correction_reason}
              onChange={e => setFormData({ ...formData, correction_reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Grund für die Korrektur..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Korrektur speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
