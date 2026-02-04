import { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import axios from '../../utils/axios';

const ENTRY_TYPES = [
  { value: 'clock_in', label: 'Kommen', color: 'text-green-500' },
  { value: 'clock_out', label: 'Gehen', color: 'text-red-500' },
  { value: 'break_start', label: 'Pause Start', color: 'text-yellow-500' },
  { value: 'break_end', label: 'Pause Ende', color: 'text-blue-500' }
];

export default function EditEntryModal({ entry, userName, onClose }) {
  const ts = new Date(entry.timestamp);
  const [entryType, setEntryType] = useState(entry.entry_type);
  const [time, setTime] = useState(
    ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
  const [date, setDate] = useState(ts.toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validation, setValidation] = useState(null);

  // Clientseitige Validierung mit simulierter Änderung
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!date || !time) return;
      try {
        // Alle Buchungen des Tages laden
        const resp = await axios.get(`/api/time-tracking/entries/user/${entry.user_id}`, {
          params: { date }
        });
        const allEntries = resp.data || [];

        // Aktuelle Buchung durch geplante Änderung ersetzen
        const simulated = allEntries.map(e => {
          if (e.id === entry.id) {
            return { ...e, entry_type: entryType, timestamp: `${date}T${time}:00` };
          }
          return e;
        });

        // Nach Timestamp sortieren
        simulated.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // State Machine lokal ausführen
        const VALID_TRANSITIONS = {
          absent: ['clock_in'],
          present: ['clock_out', 'break_start'],
          break: ['break_end']
        };
        const TYPE_LABELS = {
          clock_in: 'Kommen', clock_out: 'Gehen',
          break_start: 'Pause Start', break_end: 'Pause Ende'
        };

        const warnings = [];
        let state = 'absent';

        for (const e of simulated) {
          const type = e.entry_type;
          const ts = new Date(e.timestamp);
          const timeStr = ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
          const validNext = VALID_TRANSITIONS[state];

          if (!validNext.includes(type)) {
            const expected = validNext.map(t => TYPE_LABELS[t]).join(' oder ');
            warnings.push({
              entryId: e.id,
              message: `${timeStr}: "${TYPE_LABELS[type]}" ungültig – erwartet: ${expected}`,
              isEdited: e.id === entry.id
            });
          }

          switch (type) {
            case 'clock_in': state = 'present'; break;
            case 'clock_out': state = 'absent'; break;
            case 'break_start': state = 'break'; break;
            case 'break_end': state = 'present'; break;
          }
        }

        setValidation({ valid: warnings.length === 0, warnings });
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [entry.user_id, entry.id, date, time, entryType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Begründung ist erforderlich');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const timestamp = new Date(`${date}T${time}:00`);
      const resp = await axios.put(`/api/time-tracking/entries/${entry.id}`, {
        entry_type: entryType,
        timestamp: timestamp.toISOString(),
        correction_reason: reason
      });

      // Warnungen anzeigen falls vorhanden
      if (resp.data.validation && !resp.data.validation.valid) {
        // Gespeichert, aber mit Warnungen
      }

      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = entryType !== entry.entry_type ||
    time !== ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false }) ||
    date !== ts.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Buchung bearbeiten
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {userName} – {new Date(entry.timestamp).toLocaleDateString('de-DE')}
            </p>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <span className="text-red-700 dark:text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Buchungstyp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Buchungstyp
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ENTRY_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEntryType(type.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    entryType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={entryType === type.value ? type.color : ''}>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Datum + Uhrzeit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Uhrzeit
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Validierungs-Hinweise */}
          {validation && !validation.valid && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Reihenfolge-Hinweise (Vorschau)</span>
              </div>
              <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 ml-6">
                {validation.warnings.map((w, i) => (
                  <li key={i} className={w.isEdited ? 'font-semibold text-orange-600 dark:text-orange-400' : ''}>
                    {w.isEdited && '→ '}{w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation && validation.valid && hasChanges && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2.5 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              <span className="text-xs text-green-700 dark:text-green-400">Buchungsreihenfolge ist gültig</span>
            </div>
          )}

          {/* Begründung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Begründung *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Grund für die Änderung..."
              required
            />
          </div>

          {/* Änderungs-Übersicht */}
          {hasChanges && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Änderungen:</p>
              <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5">
                {entryType !== entry.entry_type && (
                  <li>Typ: {ENTRY_TYPES.find(t => t.value === entry.entry_type)?.label} → {ENTRY_TYPES.find(t => t.value === entryType)?.label}</li>
                )}
                {time !== ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false }) && (
                  <li>Uhrzeit: {ts.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} → {time}</li>
                )}
                {date !== ts.toISOString().split('T')[0] && (
                  <li>Datum: {ts.toLocaleDateString('de-DE')} → {new Date(date).toLocaleDateString('de-DE')}</li>
                )}
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
              disabled={loading || !reason.trim()}
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
