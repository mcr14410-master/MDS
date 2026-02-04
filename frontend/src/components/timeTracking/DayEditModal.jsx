import { useState, useEffect } from 'react';
import { X, Save, RotateCcw, Info, CheckCircle } from 'lucide-react';
import axios from '../../utils/axios';

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '';
  const h = Math.floor(Math.abs(minutes) / 60);
  const m = Math.abs(minutes) % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

function parseTimeToMinutes(str) {
  if (!str || !str.includes(':')) return null;
  const [h, m] = str.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export default function DayEditModal({ userId, date, dayData, userName, onClose }) {
  const [note, setNote] = useState(dayData?.note || '');
  const [targetStr, setTargetStr] = useState(
    dayData?.target_override_minutes != null
      ? formatMinutes(dayData.target_override_minutes)
      : ''
  );
  const [useOverride, setUseOverride] = useState(dayData?.target_override_minutes != null);
  const [needsReview, setNeedsReview] = useState(dayData?.needs_review || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState(null);

  // Validierung laden
  useEffect(() => {
    const loadValidation = async () => {
      try {
        const resp = await axios.get(`/api/time-tracking/entries/user/${userId}/validate`, {
          params: { date }
        });
        setValidation(resp.data);
      } catch { /* ignore */ }
    };
    loadValidation();
  }, [userId, date]);

  const dateObj = new Date(date);
  const dateFormatted = dateObj.toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const modelTarget = dayData?.target_override_minutes != null
    ? null // Wir wissen den Modell-Wert nicht direkt
    : dayData?.target_minutes;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const targetOverride = useOverride ? parseTimeToMinutes(targetStr) : null;

      if (useOverride && targetOverride === null) {
        setError('Bitte gültige Soll-Zeit eingeben (z.B. 8:30)');
        setLoading(false);
        return;
      }

      await axios.put(`/api/time-tracking/daily-summary/${userId}/${date}`, {
        note: note.trim() || null,
        target_override_minutes: targetOverride,
        needs_review: needsReview
      });

      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tag bearbeiten
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {userName} – {dateFormatted}
            </p>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Review-Banner */}
          {dayData?.needs_review && (
            <div className={`border rounded-lg p-3 ${
              needsReview
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {needsReview ? (
                    <Info className="h-4 w-4 text-orange-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      needsReview
                        ? 'text-orange-800 dark:text-orange-300'
                        : 'text-green-800 dark:text-green-300'
                    }`}>
                      {needsReview ? 'Prüfung erforderlich' : 'Als geprüft markiert'}
                    </p>
                    {dayData.review_note && needsReview && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">{dayData.review_note}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNeedsReview(!needsReview)}
                  className={`px-3 py-1 text-xs font-medium rounded-lg ${
                    needsReview
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {needsReview ? 'Bestätigen' : 'Zurücksetzen'}
                </button>
              </div>
            </div>
          )}

          {/* Tages-Zusammenfassung */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Soll</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatMinutes(dayData?.target_minutes) || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Ist</span>
                <span className="font-medium text-gray-900 dark:text-white">{formatMinutes(dayData?.worked_minutes) || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block text-xs">Differenz</span>
                <span className={`font-medium ${
                  (dayData?.overtime_minutes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dayData?.overtime_minutes != null
                    ? `${dayData.overtime_minutes > 0 ? '+' : ''}${formatMinutes(dayData.overtime_minutes)}`
                    : '-'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Soll-Override */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Soll-Stunden überschreiben
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useOverride}
                  onChange={e => {
                    setUseOverride(e.target.checked);
                    if (!e.target.checked) setTargetStr('');
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
              </label>
            </div>
            {useOverride && (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={targetStr}
                  onChange={e => setTargetStr(e.target.value)}
                  placeholder="z.B. 8:30"
                  className="w-28 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center font-mono"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">Stunden</span>
                {dayData?.target_minutes != null && (
                  <button
                    type="button"
                    onClick={() => setTargetStr(formatMinutes(dayData.target_minutes))}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    title="Auf Zeitmodell-Wert zurücksetzen"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Modell: {formatMinutes(dayData.target_minutes)}
                  </button>
                )}
              </div>
            )}
            {useOverride && (
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                Überschreibt den Soll-Wert aus dem Zeitmodell nur für diesen Tag.
              </p>
            )}
          </div>

          {/* Notiz */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notiz
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Optionale Notiz zum Tag (z.B. Dienstreise, Schulung...)"
            />
          </div>

          {/* Validierungs-Hinweise */}
          {validation && !validation.valid && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Buchungs-Hinweise</span>
              </div>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 ml-6">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
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
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
