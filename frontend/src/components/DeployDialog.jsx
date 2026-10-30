// frontend/src/components/DeployDialog.jsx
// Messprogramme eines Arbeitsgangs auf einem Gerät bereitstellen (Spec MESSPROGRAMME_AGENT_SPEC.md 5.2/5.5).
// Bereitgestellt wird die freigegebene Version; das MDS hält sie fest, bis jemand „Aktualisieren“ wählt.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';

// Warum ein Messprogramm nicht bereitgestellt werden kann (gleiche Regel wie im Backend)
const blockReason = (p) => {
  if (p.workflow_state === 'archived') return 'archiviert';
  if (!p.released_version) return 'noch nie freigegeben';
  return null;
};

export default function DeployDialog({ operationId, programs, onClose, onSuccess }) {
  const { hasPermission } = useAuthStore();
  const [agents, setAgents] = useState(null);
  const [agentId, setAgentId] = useState('');
  const [selected, setSelected] = useState(() => programs.filter((p) => !blockReason(p)).map((p) => p.id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    axios.get('/api/agents?active=true')
      .then((res) => {
        const usable = res.data.data.filter((a) => a.modules.includes('cmm_sync'));
        setAgents(usable);
        if (usable.length === 1) setAgentId(String(usable[0].id));
      })
      .catch(() => setAgents([]));
  }, []);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const submit = async () => {
    setSaving(true);
    setErrors([]);
    try {
      const res = await axios.post('/api/deployments', {
        agent_id: Number(agentId),
        operation_id: operationId,
        program_ids: selected,
      });
      toast.success(res.data.message);
      onSuccess(res.data.data);
    } catch (err) {
      const d = err.response?.data;
      setErrors(d?.details?.length ? d.details : [d?.error || 'Fehler beim Bereitstellen']);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Auf Gerät bereitstellen</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Der Agent legt die freigegebene Version beim nächsten Abgleich auf dem Gerät ab. Sie bleibt dort, bis jemand „Fertig“ wählt.
        </p>

        {agents === null ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Lade Geräte…</p>
        ) : agents.length === 0 ? (
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            Kein aktiver Agent mit dem Modul „Messprogramme (PC-DMIS)“.
            {hasPermission('agent.manage')
              ? <> Unter <Link to="/admin/agents" className="underline">Administration → Agenten</Link> anlegen.</>
              : ' Bitte einen Administrator, den Mess-PC als Agent anzulegen.'}
          </div>
        ) : (
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gerät</span>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">– Gerät wählen –</option>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.machine_name ? ` (${a.machine_name})` : ''}</option>)}
            </select>
          </label>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Messprogramme</legend>
          <div className="mt-1 divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
            {programs.map((p) => {
              const reason = blockReason(p);
              return (
                <label key={p.id} className={`flex items-center gap-3 px-3 py-2 text-sm ${reason ? 'opacity-60' : 'cursor-pointer'}`}>
                  <input type="checkbox" disabled={Boolean(reason)} checked={selected.includes(p.id)} onChange={() => toggle(p.id)} />
                  <span className="flex-1 min-w-0">
                    <span className="font-mono font-medium text-gray-900 dark:text-white">{p.program_number}</span>
                    <span className="text-gray-600 dark:text-gray-400"> · {p.program_name}</span>
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {reason ? `nicht möglich: ${reason}` : `Version ${p.released_version}`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {errors.length > 0 && (
          <ul className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 list-disc list-inside">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            Abbrechen
          </button>
          <button type="button" onClick={submit} disabled={saving || !agentId || selected.length === 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Stellt bereit…' : 'Bereitstellen'}
          </button>
        </div>
      </div>
    </div>
  );
}
