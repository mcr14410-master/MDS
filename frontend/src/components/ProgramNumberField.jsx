// frontend/src/components/ProgramNumberField.jsx
// Feld „Programmnummer“ für Anlegen und Bearbeiten (docs/konzepte/PROGRAMMNUMMERN_STUFE1_SPEC.md, Abschnitt 6)
import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { API_ENDPOINTS } from '../config/api';

const DISPLAY_LENGTH = 24;

/**
 * Anlegen: holt den Vorschlag (verbraucht keine Nummer) und füllt das Feld vor. Der Aufrufer schickt
 * die Nummer nur mit, wenn sie vom Vorschlag abweicht – sonst vergibt das Backend beim Speichern frisch.
 *
 * @param {object}   props
 * @param {number}   [props.operationId]  nur beim Anlegen
 * @param {'nc'|'cmm'} props.kind
 * @param {string}   props.value
 * @param {Function} props.onChange       (value) => void
 * @param {Function} [props.onSuggested]  (vorschlag) => void, beim Anlegen
 * @param {boolean}  [props.locked]       seit der ersten Freigabe fest
 * @param {string}   [props.error]
 * @param {string}   [props.inputClass]
 */
export default function ProgramNumberField({ operationId, kind, value, onChange, onSuggested, locked = false, error, inputClass }) {
  const [loading, setLoading] = useState(false);
  const [suggestError, setSuggestError] = useState(null);
  const isCreate = Boolean(operationId);

  useEffect(() => {
    if (!isCreate) return undefined;
    let active = true;
    setLoading(true);
    axios.get(`${API_ENDPOINTS.PROGRAMS}/suggest-number`, { params: { operation_id: operationId, kind } })
      .then((res) => {
        if (!active) return;
        const nr = res.data.data.program_number;
        setSuggestError(res.data.data.error || null);
        onSuggested?.(nr);
        onChange(nr);
      })
      .catch((err) => {
        if (active) setSuggestError(err.response?.data?.error || 'Vorschlag konnte nicht geladen werden');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // nur beim Öffnen des Formulars
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationId, kind]);

  const tooLong = kind !== 'cmm' && value && value.trim().length > DISPLAY_LENGTH;
  const baseClass = inputClass
    || 'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600';

  return (
    <div>
      <label htmlFor="program_number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Programmnummer
      </label>
      <div className="relative">
        <input
          type="text"
          id="program_number"
          name="program_number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={locked}
          disabled={locked || loading}
          maxLength={50}
          title={locked ? 'Seit der ersten Freigabe fest' : undefined}
          placeholder={loading ? 'Vorschlag wird geladen …' : ''}
          className={`${baseClass} font-mono ${locked ? '!bg-gray-100 dark:!bg-gray-700/60 !text-gray-600 dark:!text-gray-400 cursor-not-allowed pr-10' : ''} ${error ? '!border-red-500' : ''}`}
        />
        {locked && (
          <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </div>
      {locked ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Seit der ersten Freigabe fest</p>
      ) : isCreate ? (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Vorschlag nach Schema; wird beim Speichern endgültig vergeben</p>
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Änderbar bis zur ersten Freigabe</p>
      )}
      {tooLong && !error && (
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
          Länger als {DISPLAY_LENGTH} Zeichen – an der Steuerung wird der Name nicht vollständig angezeigt
        </p>
      )}
      {suggestError && !error && (
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">{suggestError}</p>
      )}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
