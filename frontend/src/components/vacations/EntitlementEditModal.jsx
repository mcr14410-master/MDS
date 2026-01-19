import { useState, useEffect } from 'react';
import { X, User, Calendar, Save } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

export default function EntitlementEditModal({ balance, year, onClose }) {
  const { updateEntitlement, createEntitlement, fetchBalances } = useVacationsStore();

  const [formData, setFormData] = useState({
    total_days: balance?.total_days || '30',
    carried_over: balance?.carried_over || '0',
    adjustment: balance?.adjustment || '0',
    note: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculate totals
  const totalDays = parseFloat(formData.total_days) || 0;
  const carriedOver = parseFloat(formData.carried_over) || 0;
  const adjustment = parseFloat(formData.adjustment) || 0;
  const usedDays = parseFloat(balance?.used_days) || 0;
  const availableDays = totalDays + carriedOver + adjustment;
  const remainingDays = availableDays - usedDays;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If entitlement exists, update. Otherwise create.
      if (balance?.entitlement_id) {
        await updateEntitlement(balance.entitlement_id, {
          total_days: parseFloat(formData.total_days),
          carried_over: parseFloat(formData.carried_over),
          adjustment: parseFloat(formData.adjustment),
          note: formData.note || null
        });
      } else {
        await createEntitlement({
          user_id: balance.user_id,
          year: year,
          total_days: parseFloat(formData.total_days),
          carried_over: parseFloat(formData.carried_over),
          adjustment: parseFloat(formData.adjustment),
          note: formData.note || null
        });
      }

      await fetchBalances(year);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl 
                        w-full max-w-md mx-auto z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Urlaubsanspruch bearbeiten
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* User Info */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="font-medium text-gray-900 dark:text-white">
                {balance?.display_name}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {balance?.role_name} • {year}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 
                              dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Anspruch
                </label>
                <input
                  type="number"
                  name="total_days"
                  value={formData.total_days}
                  onChange={handleChange}
                  min="0"
                  max="50"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Übertrag
                </label>
                <input
                  type="number"
                  name="carried_over"
                  value={formData.carried_over}
                  onChange={handleChange}
                  min="-50"
                  max="50"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Korrektur
                </label>
                <input
                  type="number"
                  name="adjustment"
                  value={formData.adjustment}
                  onChange={handleChange}
                  min="-50"
                  max="50"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                />
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Verfügbar:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {totalDays} + {carriedOver} + {adjustment} = {availableDays} Tage
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Genommen:</span>
                <span className="text-gray-900 dark:text-white">{usedDays} Tage</span>
              </div>
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Rest:</span>
                <span className={remainingDays < 0 ? 'text-red-600' : remainingDays < 5 ? 'text-yellow-600' : 'text-green-600'}>
                  {remainingDays} Tage
                </span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notiz (optional)
              </label>
              <input
                type="text"
                name="note"
                value={formData.note}
                onChange={handleChange}
                placeholder="z.B. Sonderurlaub Hochzeit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
                           hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 
                           dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                           rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
