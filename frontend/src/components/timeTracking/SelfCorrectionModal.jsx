import React, { useState } from 'react';
import { X, AlertTriangle, Clock, Play, Square, Coffee } from 'lucide-react';
import axios from '../../utils/axios';

const ENTRY_TYPES = [
  { type: 'clock_in', label: 'Kommen', icon: Play, color: 'text-green-500' },
  { type: 'clock_out', label: 'Gehen', icon: Square, color: 'text-red-500' },
  { type: 'break_start', label: 'Pause Start', icon: Coffee, color: 'text-yellow-500' },
  { type: 'break_end', label: 'Pause Ende', icon: Play, color: 'text-blue-500' },
];

export default function SelfCorrectionModal({ isOpen, onClose, onSuccess }) {
  const [entryType, setEntryType] = useState('');
  const [date, setDate] = useState('today'); // 'today' | 'yesterday'
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const getDateStr = () => {
    const now = new Date();
    if (date === 'yesterday') {
      now.setDate(now.getDate() - 1);
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setError(null);

    if (!entryType) return setError('Bitte Buchungstyp wählen');
    if (!time) return setError('Bitte Uhrzeit eingeben');
    if (!reason || reason.trim().length < 3) return setError('Bitte Grund angeben (mind. 3 Zeichen)');

    const timestamp = `${getDateStr()}T${time}:00`;

    setLoading(true);
    try {
      await axios.post('/api/time-tracking/entries/self-correction', {
        entry_type: entryType,
        timestamp,
        correction_reason: reason.trim()
      });
      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEntryType('');
    setDate('today');
    setTime('');
    setReason('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Buchung nachtragen</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vergessene Stempelung korrigieren</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info-Hinweis */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Die Korrektur muss vom Vorgesetzten bestätigt werden.</span>
          </div>

          {/* Buchungstyp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Was wurde vergessen?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENTRY_TYPES.map(et => (
                <button
                  key={et.type}
                  onClick={() => setEntryType(et.type)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors text-sm font-medium
                    ${entryType === et.type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  <et.icon className={`h-4 w-4 ${et.color}`} />
                  {et.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Welcher Tag?
            </label>
            <div className="flex gap-2">
              {[
                { value: 'today', label: 'Heute' },
                { value: 'yesterday', label: 'Gestern' }
              ].map(d => (
                <button
                  key={d.value}
                  onClick={() => setDate(d.value)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 text-sm font-medium transition-colors
                    ${date === d.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Uhrzeit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Uhrzeit
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Grund */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Grund
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="z.B. Pause-Ende vergessen zu stempeln"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Fehler */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !entryType || !time || !reason}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Wird gespeichert...' : 'Korrektur einreichen'}
          </button>
        </div>
      </div>
    </div>
  );
}
