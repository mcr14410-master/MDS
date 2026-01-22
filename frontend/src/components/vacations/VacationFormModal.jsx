import { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertTriangle, Check, Trash2, Info } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

/**
 * Calculate overlapping dates between two date ranges
 */
function getOverlappingDates(start1, end1, start2, end2) {
  const s1 = new Date(start1);
  const e1 = new Date(end1);
  const s2 = new Date(start2);
  const e2 = new Date(end2);
  
  const overlapStart = s1 > s2 ? s1 : s2;
  const overlapEnd = e1 < e2 ? e1 : e2;
  
  if (overlapStart > overlapEnd) return [];
  
  const dates = [];
  const current = new Date(overlapStart);
  while (current <= overlapEnd) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Format dates as readable string
 */
function formatOverlapDates(dates) {
  if (dates.length === 0) return '';
  if (dates.length === 1) {
    return dates[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }
  if (dates.length <= 3) {
    return dates.map(d => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })).join(', ');
  }
  const first = dates[0].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  const last = dates[dates.length - 1].toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  return `${first} - ${last} (${dates.length} Tage)`;
}

export default function VacationFormModal({ vacation, vacationTypes, users, onClose }) {
  const { createVacation, requestVacation, updateVacation, deleteVacation, checkOverlap } = useVacationsStore();

  const isEditing = vacation?.id;
  const isRequest = vacation?.isRequest; // Flag for self-request mode

  const [formData, setFormData] = useState({
    user_id: vacation?.user_id || '',
    type_id: vacation?.type_id || '',
    start_date: vacation?.start_date?.split('T')[0] || '',
    end_date: vacation?.end_date?.split('T')[0] || '',
    start_time: vacation?.start_time || '',
    end_time: vacation?.end_time || '',
    note: vacation?.note || ''
  });

  const [overlapCheck, setOverlapCheck] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get selected type
  const selectedType = vacationTypes.find(t => t.id === parseInt(formData.type_id));
  const allowsPartialDay = selectedType?.allows_partial_day;
  const singleDayOnly = selectedType?.single_day_only;

  // Active users only
  const activeUsers = users.filter(u => u.is_active);

  // Sync end_date with start_date for single_day_only types
  useEffect(() => {
    if (singleDayOnly && formData.start_date) {
      setFormData(prev => ({ ...prev, end_date: prev.start_date }));
    }
  }, [singleDayOnly, formData.start_date]);

  // Check overlap when dates change
  useEffect(() => {
    const checkDates = async () => {
      if (formData.user_id && formData.start_date && formData.end_date) {
        try {
          const result = await checkOverlap({
            user_id: formData.user_id,
            start_date: formData.start_date,
            end_date: formData.end_date,
            exclude_id: vacation?.id
          });
          setOverlapCheck(result);
        } catch (err) {
          console.error('Overlap check failed:', err);
        }
      }
    };

    const timer = setTimeout(checkDates, 500);
    return () => clearTimeout(timer);
  }, [formData.user_id, formData.start_date, formData.end_date, vacation?.id]);

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    const newType = name === 'type_id' ? vacationTypes.find(t => t.id === parseInt(value)) : selectedType;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Clear time fields if type changes to non-partial
      ...(name === 'type_id' && !newType?.allows_partial_day
        ? { start_time: '', end_time: '' }
        : {}),
      // Sync end_date for single_day_only types
      ...(name === 'start_date' && newType?.single_day_only
        ? { end_date: value }
        : {}),
      // Also sync when type changes to single_day_only
      ...(name === 'type_id' && newType?.single_day_only && prev.start_date
        ? { end_date: prev.start_date }
        : {})
    }));
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = {
        ...formData,
        user_id: parseInt(formData.user_id),
        type_id: parseInt(formData.type_id),
        start_time: formData.start_time || null,
        end_time: formData.end_time || null
      };

      if (isEditing) {
        await updateVacation(vacation.id, data);
      } else if (isRequest) {
        await requestVacation(data);
      } else {
        await createVacation(data);
      }

      onClose();
    } catch (err) {
      console.error('Submit error:', err);
      const defaultMsg = isRequest ? 'Fehler beim Beantragen' : 'Fehler beim Speichern';
      setError(err.response?.data?.message || err.response?.data?.error || defaultMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteVacation(vacation.id);
      onClose();
    } catch (err) {
      setError('Fehler beim Löschen');
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
                        w-full max-w-lg mx-auto z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className={`h-5 w-5 ${isRequest ? 'text-blue-600' : 'text-green-600'}`} />
              {isEditing ? 'Abwesenheit bearbeiten' : isRequest ? 'Urlaub beantragen' : 'Neue Abwesenheit'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Error */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 
                              dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* User Select - hidden for requests */}
            {!isRequest && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mitarbeiter *
                </label>
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">-- Auswählen --</option>
                  {activeUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                      {user.roles?.length > 0 && ` (${user.roles.map(r => r.name).join(', ')})`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Type Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Art *
              </label>
              <select
                name="type_id"
                value={formData.type_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">-- Auswählen --</option>
                {vacationTypes
                  .filter(t => t.is_active)
                  .filter(t => {
                    // Bei Beantragen: Krank und Schulung ausschließen
                    if (isRequest) {
                      const excludedTypes = ['krank', 'schulung'];
                      return !excludedTypes.includes(t.name.toLowerCase());
                    }
                    return true;
                  })
                  .map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                      {type.affects_balance ? ' (zählt als Urlaub)' : ''}
                    </option>
                  ))}
              </select>
              {selectedType && (
                <div className="mt-1 flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: selectedType.color }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedType.affects_balance 
                      ? 'Wird vom Urlaubskonto abgezogen' 
                      : 'Kein Abzug vom Urlaubskonto'}
                  </span>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {singleDayOnly ? 'Datum *' : 'Von *'}
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              {!singleDayOnly && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bis *
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                    min={formData.start_date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              )}
            </div>

            {/* Time (for partial days) */}
            {allowsPartialDay && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Von Uhrzeit
                  </label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Clock className="inline h-4 w-4 mr-1" />
                    Bis Uhrzeit
                  </label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Overlap Check Result */}
            {overlapCheck && (
              <div className={`p-3 rounded-lg text-sm ${
                overlapCheck.allowed
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              }`}>
                <div className="flex items-start gap-2">
                  {overlapCheck.allowed ? (
                    <Check className="h-5 w-5 shrink-0" />
                  ) : (
                    <Info className="h-5 w-5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p>{overlapCheck.calculatedDays !== undefined 
                      ? `${overlapCheck.calculatedDays} Arbeitstag(e)` 
                      : overlapCheck.message}</p>
                    
                    {overlapCheck.concurrent?.length > 0 && (
                      <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded text-xs">
                        <p className="font-medium mb-1">Überschneidungen:</p>
                        <ul className="space-y-1">
                          {overlapCheck.concurrent.map(c => {
                            const overlapDates = getOverlappingDates(
                              formData.start_date, 
                              formData.end_date,
                              c.start_date,
                              c.end_date
                            );
                            return (
                              <li key={c.id} className="flex justify-between">
                                <span>• {c.display_name} ({c.type_name})</span>
                                <span className="text-gray-600 dark:text-gray-400 ml-2">
                                  {formatOverlapDates(overlapDates)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notiz
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={2}
                placeholder="z.B. Grund, Reiseziel, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                           dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              {isEditing ? (
                <div>
                  {showDeleteConfirm ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600 dark:text-red-400">Wirklich löschen?</span>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Ja
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                      >
                        Nein
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 
                                 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                      Löschen
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <div className="flex gap-2">
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
                  className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    isRequest 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {loading 
                    ? (isRequest ? 'Wird beantragt...' : 'Speichern...') 
                    : (isRequest ? 'Beantragen' : 'Speichern')
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
