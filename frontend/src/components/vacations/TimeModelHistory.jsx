import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import axios from '../../utils/axios';

// Zeitmodell-Verlauf eines Mitarbeiters: Liste, „Neues Zeitmodell ab …“, Korrigieren, Löschen.
// Jede Änderung zeigt zuerst die Vorschau (betroffene Tage, Urlaube, Saldo), gespeichert und neu
// gerechnet wird erst mit „Übernehmen“.

const formatDate = (dateStr) => (dateStr ? String(dateStr).slice(0, 10).split('-').reverse().join('.') : '');

const formatMonth = (key) => {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
};

// Minuten als ±h:mm
const formatMinutes = (min, signed = false) => {
  const value = Math.round(min || 0);
  const abs = Math.abs(value);
  const text = `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
  if (value < 0) return `−${text}`;
  return signed && value > 0 ? `+${text}` : text;
};

const ACTION_LABELS = { recalc: 'neu berechnet', create: 'neu angelegt', delete: 'entfernt' };

const STATUS_LABELS = {
  complete: 'vollständig', incomplete: 'unvollständig', absent: 'fehlende Buchung', holiday: 'Feiertag',
};

// Erster Tag des nächsten Monats (Ortszeit) – Vorschlag für „gültig ab“
const firstOfNextMonth = () => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Berlin' });
  const [y, m] = today.split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
};

const inputClass = 'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white';

function Preview({ preview }) {
  const [showDays, setShowDays] = useState(false);
  const { summary, months, days, vacations } = preview;
  const nothing = summary.changed_days === 0 && vacations.length === 0;

  return (
    <div className="space-y-3 text-sm">
      {nothing ? (
        <p className="text-gray-600 dark:text-gray-400">
          Keine gespeicherten Tage oder Urlaube betroffen.
        </p>
      ) : (
        <p className="text-gray-700 dark:text-gray-300">
          Ab {formatDate(summary.from)}: <strong>{summary.changed_days}</strong> Tag(e) ändern sich
          {summary.created_days > 0 && <>, davon {summary.created_days} neu angelegt</>}
          {summary.deleted_days > 0 && <>, {summary.deleted_days} entfernt (frei, ohne Stempel)</>}
          {summary.changed_days > 0 && (
            <> – Saldo gesamt <strong className={summary.overtime_delta < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
              {formatMinutes(summary.overtime_delta, true)}
            </strong></>
          )}
          .
          {summary.kept_overrides > 0 && <> {summary.kept_overrides} Tag(e) mit manuellem Soll bleiben unverändert.</>}
        </p>
      )}

      {summary.past_months.length > 0 && (
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Betrifft bereits vergangene Monate ({summary.past_months.map(formatMonth).join(', ')}).
            Bereits ausgegebene Zeitnachweise stimmen danach nicht mehr – ggf. neu erstellen.
          </span>
        </p>
      )}

      {months.length > 0 && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400">
              <th className="py-1 font-medium">Monat</th>
              <th className="py-1 font-medium text-right">Tage</th>
              <th className="py-1 font-medium text-right">Saldo-Änderung</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr key={m.month} className="border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                <td className="py-1">{formatMonth(m.month)}{m.is_past && <span className="text-amber-600 dark:text-amber-400"> · vergangen</span>}</td>
                <td className="py-1 text-right">{m.days}</td>
                <td className={`py-1 text-right ${m.overtime_delta < 0 ? 'text-red-600 dark:text-red-400' : m.overtime_delta > 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                  {formatMinutes(m.overtime_delta, true)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {vacations.length > 0 && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Abwesenheiten mit geänderten Tagen</div>
          <ul className="space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
            {vacations.map(v => (
              <li key={v.id}>
                {v.type} {formatDate(v.start_date)}–{formatDate(v.end_date)}
                {v.status === 'pending' && <span className="text-gray-500"> (beantragt)</span>}
                : {String(v.old_days).replace('.', ',')} → <strong>{String(v.new_days).replace('.', ',')}</strong> Tage
              </li>
            ))}
          </ul>
        </div>
      )}

      {days.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDays(s => !s)}
            className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showDays ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDays ? 'Tage ausblenden' : `${days.length} Tag(e) anzeigen`}
          </button>
          {showDays && (
            <div className="mt-1 max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white dark:bg-gray-800">
                  <tr className="text-left text-gray-500 dark:text-gray-400">
                    <th className="py-1 font-medium">Datum</th>
                    <th className="py-1 font-medium">Soll</th>
                    <th className="py-1 font-medium">Saldo</th>
                    <th className="py-1 font-medium">Änderung</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(d => (
                    <tr key={d.date} className="border-t border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                      <td className="py-0.5">
                        {new Date(`${d.date}T12:00:00`).toLocaleDateString('de-DE', { weekday: 'short' })} {formatDate(d.date)}
                      </td>
                      <td className="py-0.5">
                        {d.old ? formatMinutes(d.old.target) : '–'} → {d.new ? formatMinutes(d.new.target) : '–'}
                      </td>
                      <td className="py-0.5">
                        {d.old ? formatMinutes(d.old.overtime, true) : '–'} → {d.new ? formatMinutes(d.new.overtime, true) : '–'}
                      </td>
                      <td className="py-0.5 text-gray-500 dark:text-gray-400">
                        {ACTION_LABELS[d.action]}
                        {d.new?.status && d.action === 'create' && ` (${STATUS_LABELS[d.new.status] || d.new.status})`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TimeModelHistory({ employee, timeModels, onChanged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bearbeitung: { action: 'create'|'update'|'delete', entry?, time_model_id, valid_from, reason }
  const [edit, setEdit] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/${employee.id}/time-models`);
      setEntries(res.data);
    } catch {
      setError('Zeitmodell-Verlauf konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, [employee.id]);

  useEffect(() => { load(); }, [load]);

  const modelLabel = (model) => `${model.name} (${(model.weekly_minutes / 60).toFixed(1).replace('.', ',')} h/Wo)`;

  const startCreate = () => {
    setPreview(null);
    setError(null);
    setEdit({
      action: 'create',
      time_model_id: '',
      valid_from: entries.length === 0 ? (employee.time_tracking_start_date || '').slice(0, 10) : firstOfNextMonth(),
      reason: '',
    });
  };

  const startUpdate = (entry) => {
    setPreview(null);
    setError(null);
    setEdit({ action: 'update', entry, time_model_id: entry.time_model_id, valid_from: entry.valid_from, reason: '' });
  };

  const requestBody = (e) => {
    if (e.action === 'create') return { action: 'create', time_model_id: e.time_model_id, valid_from: e.valid_from };
    if (e.action === 'delete') return { action: 'delete', entry_id: e.entry.id };
    const body = { action: 'update', entry_id: e.entry.id };
    if (Number(e.time_model_id) !== e.entry.time_model_id) body.time_model_id = e.time_model_id;
    if (e.valid_from !== e.entry.valid_from) body.valid_from = e.valid_from;
    return body;
  };

  const loadPreview = async (e) => {
    setBusy(true);
    setError(null);
    try {
      const res = await axios.post(`/api/users/${employee.id}/time-models/preview`, requestBody(e));
      setPreview(res.data);
    } catch (err) {
      setPreview(null);
      setError(err.response?.data?.error || 'Vorschau fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const startDelete = (entry) => {
    const e = { action: 'delete', entry, reason: '' };
    setEdit(e);
    setPreview(null);
    loadPreview(e);
  };

  const cancel = () => {
    setEdit(null);
    setPreview(null);
    setError(null);
  };

  // Formular geändert → alte Vorschau passt nicht mehr
  const changeField = (field, value) => {
    setEdit(e => ({ ...e, [field]: value }));
    if (field !== 'reason') setPreview(null);
  };

  const apply = async () => {
    setBusy(true);
    setError(null);
    try {
      const { action, entry, reason } = edit;
      const body = { ...requestBody(edit), reason: reason || undefined };
      delete body.action;
      delete body.entry_id;
      if (action === 'create') await axios.post(`/api/users/${employee.id}/time-models`, body);
      else if (action === 'update') await axios.put(`/api/users/${employee.id}/time-models/${entry.id}`, body);
      else await axios.delete(`/api/users/${employee.id}/time-models/${entry.id}`, { data: { reason: reason || undefined } });
      setEdit(null);
      setPreview(null);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Speichern fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const formValid = edit && (edit.action === 'delete' || (edit.time_model_id && edit.valid_from));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">Zeitmodell-Verlauf</span>
        {!edit && (
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="h-4 w-4" />
            {entries.length === 0 ? 'Zeitmodell zuweisen' : 'Neues Zeitmodell ab …'}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Lädt…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Noch kein Zeitmodell – ohne Zeitmodell gibt es kein Soll (Urlaub zählt Mo–Fr).
        </p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
              <tr>
                <th className="text-left py-1.5 px-3 font-medium">Zeitmodell</th>
                <th className="text-left py-1.5 px-3 font-medium">gültig</th>
                <th className="text-left py-1.5 px-3 font-medium hidden sm:table-cell">angelegt</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr
                  key={entry.id}
                  className={`border-t border-gray-200 dark:border-gray-700 ${
                    edit?.entry?.id === entry.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <td className="py-1.5 px-3 text-gray-900 dark:text-white">
                    {modelLabel({ name: entry.time_model_name, weekly_minutes: entry.weekly_minutes })}
                    {entry.is_current && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">aktuell</span>
                    )}
                    {entry.is_future && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">geplant</span>
                    )}
                  </td>
                  <td className="py-1.5 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {entry.valid_to
                      ? `${formatDate(entry.valid_from)} – ${formatDate(entry.valid_to)}`
                      : `ab ${formatDate(entry.valid_from)}`}
                  </td>
                  <td className="py-1.5 px-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                    {formatDate(entry.created_at)}{entry.created_by_name && ` · ${entry.created_by_name}`}
                  </td>
                  <td className="py-1.5 px-2 text-right whitespace-nowrap">
                    {!edit && (
                      <>
                        <button
                          type="button"
                          onClick={() => startUpdate(entry)}
                          className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Korrigieren"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {entries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => startDelete(entry)}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Löschen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <div className="border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3 bg-white dark:bg-gray-800">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {edit.action === 'create' && (entries.length === 0 ? 'Zeitmodell zuweisen' : 'Neues Zeitmodell')}
            {edit.action === 'update' && `Eintrag ab ${formatDate(edit.entry.valid_from)} korrigieren`}
            {edit.action === 'delete' && `Eintrag „${edit.entry.time_model_name}“ ab ${formatDate(edit.entry.valid_from)} löschen`}
          </div>

          {edit.action === 'delete' ? (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {entries[0]?.id === edit.entry.id
                ? 'Bis zum nächsten Eintrag gilt danach kein Zeitmodell mehr (kein Soll, Urlaub zählt Mo–Fr).'
                : `Danach gilt ab ${formatDate(edit.entry.valid_from)} wieder das vorherige Zeitmodell.`}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Zeitmodell</label>
                <select
                  value={edit.time_model_id || ''}
                  onChange={(e) => changeField('time_model_id', e.target.value ? parseInt(e.target.value) : '')}
                  className={inputClass}
                >
                  <option value="">-- Zeitmodell wählen --</option>
                  {timeModels.map(model => (
                    <option key={model.id} value={model.id}>{modelLabel(model)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">gültig ab</label>
                <input
                  type="date"
                  value={edit.valid_from || ''}
                  onChange={(e) => changeField('valid_from', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Grund (optional, für das Protokoll)</label>
            <input
              type="text"
              value={edit.reason}
              onChange={(e) => changeField('reason', e.target.value)}
              placeholder="z. B. neuer Arbeitsvertrag"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {busy && !preview && <p className="text-xs text-gray-500 dark:text-gray-400">Berechnet…</p>}
          {preview && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Vorschau</div>
              <Preview preview={preview} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Abbrechen
            </button>
            {!preview ? (
              <button
                type="button"
                onClick={() => loadPreview(edit)}
                disabled={busy || !formValid}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Vorschau
              </button>
            ) : (
              <button
                type="button"
                onClick={apply}
                disabled={busy}
                className={`px-3 py-1.5 text-sm rounded-lg text-white disabled:opacity-50 ${
                  edit.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {busy ? 'Rechnet…' : edit.action === 'delete' ? 'Löschen und neu berechnen' : 'Übernehmen und neu berechnen'}
              </button>
            )}
          </div>
        </div>
      )}

      {!edit && error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
