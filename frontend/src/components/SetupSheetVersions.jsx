// frontend/src/components/SetupSheetVersions.jsx
// Stände eines Einrichteblatts: Liste, Ansicht (schreibgeschützt) und Zurückgehen
import { useCallback, useEffect, useState } from 'react';
import { useSetupSheetsStore } from '../stores/setupSheetsStore';
import { useAuthStore } from '../stores/authStore';
import AuthImage from './common/AuthImage';
import { toast } from './Toaster';

const formatDateTime = (value) => new Date(value).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const versionLabel = (v) => (v.kind === 'release' ? `Stand ${v.version_number}` : 'Sicherung');

const FIELD_LABELS = [
  ['fixture_description', 'Vorrichtung (Text)'],
  ['clamping_description', 'Spannmittel (Text)'],
  ['control_type', 'Steuerung'],
  ['preset_number', 'Preset'],
  ['wcs_number', 'Nullpunkt'],
  ['wcs_x', 'X'],
  ['wcs_y', 'Y'],
  ['wcs_z', 'Z'],
  ['reference_point', 'Referenzpunkt'],
  ['raw_material_dimensions', 'Rohmaß'],
  ['material_specification', 'Material'],
  ['setup_instructions', 'Einrichtehinweise'],
  ['special_notes', 'Besonderheiten'],
];

export default function SetupSheetVersions({ setupSheet, initialVersionId, onRestored }) {
  const { fetchVersions, fetchVersion, restoreVersion } = useSetupSheetsStore();
  const { hasPermission } = useAuthStore();
  const canRestore = hasPermission('program.release') && setupSheet.workflow_state !== 'archived';
  const [versions, setVersions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [busy, setBusy] = useState(false);

  const open = useCallback(async (versionId) => {
    setSelected(await fetchVersion(setupSheet.id, versionId));
  }, [fetchVersion, setupSheet.id]);

  useEffect(() => {
    fetchVersions(setupSheet.id).then(setVersions).catch(() => toast.error('Stände konnten nicht geladen werden'));
  }, [fetchVersions, setupSheet.id, setupSheet.workflow_state]);

  useEffect(() => {
    if (initialVersionId) open(initialVersionId).catch(() => {});
  }, [initialVersionId, open]);

  const handleRestore = async (version) => {
    let missing = [];
    try {
      missing = (await fetchVersion(setupSheet.id, version.id)).missing || [];
    } catch {
      toast.error('Stand konnte nicht geladen werden');
      return;
    }
    const outcome = version.is_released && missing.length === 0
      ? 'Das Blatt ist danach wieder freigegeben.'
      : 'Das Blatt wird Entwurf und muss neu freigegeben werden.';
    const missingText = missing.length > 0
      ? `\n\nEntfällt, weil inzwischen gelöscht:\n- ${missing.join('\n- ')}`
      : '';
    if (!confirm(`Auf ${versionLabel(version)} zurückgehen?\n\n${outcome}${missingText}\nDer aktuelle Inhalt wird vorher als Sicherung abgelegt.`)) return;
    setBusy(true);
    const result = await restoreVersion(setupSheet.id, version.id);
    setBusy(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setWarnings(result.warnings || []);
    toast.success(`${versionLabel(version)} wiederhergestellt`);
    setSelected(null);
    onRestored?.();
  };

  if (versions.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Noch kein Stand. Ein Stand entsteht mit jeder Freigabe.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">Nicht alles ließ sich wiederherstellen:</p>
          <ul className="list-disc ml-5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
        {versions.map((v) => (
          <li key={v.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${selected?.id === v.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
            <div className="flex-1 min-w-[12rem]">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {versionLabel(v)}
                {v.is_released && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                    zuletzt freigegeben
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {v.kind === 'release' ? 'Freigegeben' : 'Gesichert'} von {v.created_by_name || 'System'} · <span className="tabular-nums">{formatDateTime(v.created_at)}</span>
                {' · '}{v.photo_count} Foto{Number(v.photo_count) !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => open(v.id)}
              className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
            >
              Ansehen
            </button>
            {canRestore && (
              <button
                onClick={() => handleRestore(v)}
                disabled={busy}
                className="px-3 py-1.5 text-sm text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg disabled:opacity-50"
              >
                Auf diesen Stand zurück
              </button>
            )}
          </li>
        ))}
      </ul>

      {selected && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
          {selected.missing?.length > 0 && (
            <p className="text-sm text-yellow-800 dark:text-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-2">
              Inzwischen gelöscht, entfällt beim Zurückgehen: {selected.missing.join(', ')}
            </p>
          )}
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {versionLabel(selected)} vom {formatDateTime(selected.created_at)} (nur Ansicht)
            </h4>
            <button onClick={() => setSelected(null)} className="text-sm text-gray-600 dark:text-gray-400 hover:underline">
              Schließen
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-600 dark:text-gray-400">Programm</dt>
              <dd className="text-gray-900 dark:text-white">
                {selected.names?.program
                  ? `${selected.names.program.program_number} – ${selected.names.program.program_name}`
                  : selected.snapshot.fields.program_id ? 'gelöscht' : '–'}
              </dd>
            </div>
            {FIELD_LABELS.filter(([k]) => selected.snapshot.fields[k] != null && selected.snapshot.fields[k] !== '').map(([k, label]) => (
              <div key={k}>
                <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
                <dd className="text-gray-900 dark:text-white whitespace-pre-wrap">{String(selected.snapshot.fields[k])}</dd>
              </div>
            ))}
          </dl>
          {(selected.snapshot.clamping_devices.length > 0 || selected.snapshot.fixtures.length > 0) && (
            <div className="text-sm">
              <p className="text-gray-600 dark:text-gray-400 mb-1">Spannmittel und Vorrichtungen</p>
              <ul className="list-disc ml-5 text-gray-900 dark:text-white">
                {selected.snapshot.clamping_devices.map((c, i) => {
                  const d = selected.names?.clamping_devices?.[c.clamping_device_id];
                  return <li key={`c${i}`}>{c.quantity}× {d ? `${d.inventory_number} ${d.name || ''}${d.is_deleted ? ' (gelöscht)' : ''}` : 'Spannmittel gelöscht'}{c.notes ? ` – ${c.notes}` : ''}</li>;
                })}
                {selected.snapshot.fixtures.map((f, i) => {
                  const d = selected.names?.fixtures?.[f.fixture_id];
                  return <li key={`f${i}`}>{f.quantity}× {d ? `${d.fixture_number} ${d.name || ''}${d.is_deleted ? ' (gelöscht)' : ''}` : 'Vorrichtung gelöscht'}{f.notes ? ` – ${f.notes}` : ''}</li>;
                })}
              </ul>
            </div>
          )}
          {selected.snapshot.photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {selected.snapshot.photos.map((p, i) => (
                <figure key={i} className="text-xs text-gray-600 dark:text-gray-400">
                  <AuthImage
                    apiPath={`/api/setup-sheets/${setupSheet.id}/versions/${selected.id}/photos/${i}/view`}
                    alt={p.caption || p.file_name}
                    className="w-full h-32 object-cover rounded"
                  />
                  <figcaption className="mt-1">{p.caption || p.file_name}</figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
