// frontend/src/pages/admin/AgentsPage.jsx
// Administration → Agenten: Geräte mit MDS-Agent anlegen, API-Schlüssel erzeugen, Module schalten
// (Spec docs/konzepte/MESSPROGRAMME_AGENT_SPEC.md 5.1/5.5). Der Schlüssel wird genau einmal angezeigt.
import { useCallback, useEffect, useState } from 'react';
import axios from '../../utils/axios';
import { toast } from '../../components/Toaster';
import { copyText } from '../../utils/clipboard';
import { agentOnline, agentServerUrl, formatDateTime, iniSnippet, isLocalUrl, timeAgo } from '../../utils/agentLabels';

const errorText = (err, fallback) => {
  const d = err.response?.data;
  return [d?.error || fallback, ...(d?.details || [])].join(' – ');
};

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [modules, setModules] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null); // { agent: null } = neu, { agent } = bearbeiten
  const [shownKey, setShownKey] = useState(null); // { agent, apiKey } – nur dieses eine Mal
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/agents');
      setAgents(res.data.data);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Fehler beim Laden der Agenten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    axios.get('/api/agents/modules').then((res) => setModules(res.data.data)).catch(() => {});
    axios.get('/api/machines?is_active=true').then((res) => setMachines(res.data.data || [])).catch(() => {});
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const moduleName = (key) => modules.find((m) => m.key === key)?.name || key;

  const regenerate = async (agent) => {
    if (!window.confirm(`Neuen Schlüssel für „${agent.name}“ erzeugen?\n\nDer bisherige gilt sofort nicht mehr – der Agent meldet sich erst wieder, wenn der neue Schlüssel in seiner MDS-Agent.ini steht.`)) return;
    try {
      const res = await axios.post(`/api/agents/${agent.id}/regenerate-key`);
      setShownKey({ agent: res.data.data, apiKey: res.data.data.api_key });
      load();
    } catch (err) {
      toast.error(errorText(err, 'Fehler beim Erzeugen des Schlüssels'));
    }
  };

  const toggleActive = async (agent) => {
    const question = agent.is_active
      ? `„${agent.name}“ deaktivieren?\n\nDer Agent kann sich dann nicht mehr anmelden. Bereitstellungen und Protokoll bleiben erhalten.`
      : `„${agent.name}“ wieder aktivieren?`;
    if (!window.confirm(question)) return;
    try {
      await axios.put(`/api/agents/${agent.id}`, { is_active: !agent.is_active });
      toast.success(agent.is_active ? 'Agent deaktiviert' : 'Agent aktiviert');
      load();
    } catch (err) {
      toast.error(errorText(err, 'Fehler beim Speichern'));
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agenten</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Geräte mit MDS-Agent (z. B. Mess-PC) – Schlüssel und Module werden hier verwaltet
          </p>
        </div>
        <button
          onClick={() => setForm({ agent: null })}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Agent anlegen
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {agents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-5xl mb-4">🖥️</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Noch keine Agenten</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Für jedes Gerät, auf dem der MDS-Agent läuft, hier einen Eintrag anlegen und den Schlüssel in die MDS-Agent.ini übernehmen.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => {
            const online = agentOnline(agent);
            const warnings = agent.last_warnings || [];
            return (
              <div key={agent.id} className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${agent.is_active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 ${online ? 'bg-green-500' : 'bg-gray-400'}`}
                      title={online ? 'Meldet sich regelmäßig' : 'Meldet sich nicht'}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{agent.name}</h2>
                        {!agent.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">deaktiviert</span>
                        )}
                        {agent.modules.length === 0 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">kein Modul</span>
                        )}
                        {agent.modules.map((m) => (
                          <span key={m} className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            {moduleName(m)}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <span title={formatDateTime(agent.last_seen_at)}>Zuletzt gesehen: {timeAgo(agent.last_seen_at)}</span>
                        <span>Version: {agent.agent_version || '–'}</span>
                        <span>Maschine: {agent.machine_name || '–'}</span>
                        <span>Abfrage alle {agent.poll_interval_sec} s</span>
                        <span>Offene Bereitstellungen: {agent.open_deployments}</span>
                        <span className="font-mono text-xs self-center">Schlüssel {agent.api_key_prefix}…</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setForm({ agent })}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Bearbeiten
                    </button>
                    <button onClick={() => regenerate(agent)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Neuer Schlüssel
                    </button>
                    <button onClick={() => toggleActive(agent)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {agent.is_active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </div>
                </div>

                {warnings.length > 0 && (
                  <div className="mt-3">
                    <button onClick={() => setExpanded(expanded === agent.id ? null : agent.id)}
                      className="text-sm font-medium text-amber-700 dark:text-amber-400 hover:underline">
                      ⚠ {warnings.length} {warnings.length === 1 ? 'Meldung' : 'Meldungen'} vom Gerät {expanded === agent.id ? 'ausblenden' : 'anzeigen'}
                    </button>
                    {expanded === agent.id && (
                      <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                        {warnings.map((w, i) => (
                          <li key={i} className="px-3 py-1.5 rounded bg-amber-50 dark:bg-amber-900/20">{w.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {form && (
        <AgentForm
          agent={form.agent}
          modules={modules}
          machines={machines}
          onClose={() => setForm(null)}
          onSaved={(saved, apiKey) => {
            setForm(null);
            if (apiKey) setShownKey({ agent: saved, apiKey });
            else toast.success('Agent gespeichert');
            load();
          }}
        />
      )}

      {shownKey && <KeyDialog agent={shownKey.agent} apiKey={shownKey.apiKey} onClose={() => setShownKey(null)} />}
    </div>
  );
}

function AgentForm({ agent, modules, machines, onClose, onSaved }) {
  const [values, setValues] = useState({
    name: agent?.name || '',
    machine_id: agent?.machine_id ?? '',
    modules: agent?.modules || ['cmm_sync'],
    poll_interval_sec: agent?.poll_interval_sec ?? 30,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const toggleModule = (key) => setValues((v) => ({
    ...v,
    modules: v.modules.includes(key) ? v.modules.filter((m) => m !== key) : [...v.modules, key],
  }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const body = {
      name: values.name,
      machine_id: values.machine_id === '' ? null : Number(values.machine_id),
      modules: values.modules,
      poll_interval_sec: Number(values.poll_interval_sec),
    };
    try {
      const res = agent
        ? await axios.put(`/api/agents/${agent.id}`, body)
        : await axios.post('/api/agents', body);
      onSaved(res.data.data, agent ? null : res.data.data.api_key);
    } catch (err) {
      const d = err.response?.data;
      setErrors(d?.details?.length ? d.details : [d?.error || 'Fehler beim Speichern']);
    } finally {
      setSaving(false);
    }
  };

  const input = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500';
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{agent ? 'Agent bearbeiten' : 'Agent anlegen'}</h2>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Name *</span>
          <input className={`${input} mt-1`} value={values.name} maxLength={100} required autoFocus
            placeholder="z. B. Mess-PC" onChange={(e) => setValues({ ...values, name: e.target.value })} />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Maschine (optional)</span>
          <select className={`${input} mt-1`} value={values.machine_id}
            onChange={(e) => setValues({ ...values, machine_id: e.target.value })}>
            <option value="">– keine –</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">Module</legend>
          <div className="mt-1 space-y-2">
            {modules.map((m) => (
              <label key={m.key} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
                <input type="checkbox" className="mt-0.5" checked={values.modules.includes(m.key)} onChange={() => toggleModule(m.key)} />
                <span><span className="font-medium">{m.name}</span><br /><span className="text-gray-500 dark:text-gray-400">{m.description}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Abfrage-Intervall (Sekunden)</span>
          <input type="number" min={5} max={3600} className={`${input} mt-1`} value={values.poll_interval_sec}
            onChange={(e) => setValues({ ...values, poll_interval_sec: e.target.value })} />
        </label>

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
          <button type="submit" disabled={saving}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Speichert…' : agent ? 'Speichern' : 'Anlegen und Schlüssel erzeugen'}
          </button>
        </div>
      </form>
    </div>
  );
}

function KeyDialog({ agent, apiKey, onClose }) {
  const ini = iniSnippet(agent, apiKey);
  const copy = async (text, what) => {
    if (await copyText(text)) toast.success(`${what} kopiert`);
    else toast.error('Kopieren nicht möglich – bitte markieren und von Hand kopieren');
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Schlüssel für „{agent.name}“</h2>
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
          Jetzt kopieren – der Schlüssel wird nicht wieder angezeigt. Im MDS ist nur ein Prüfwert gespeichert.
          Geht er verloren, hier einen neuen erzeugen.
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">API-Schlüssel</span>
            <button onClick={() => copy(apiKey, 'Schlüssel')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Kopieren</button>
          </div>
          <code data-testid="agent-api-key" className="block p-3 rounded bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-sm break-all select-all">
            {apiKey}
          </code>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ausschnitt für die MDS-Agent.ini</span>
            <button onClick={() => copy(ini, 'ini-Ausschnitt')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Kopieren</button>
          </div>
          <pre className="p-3 rounded bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-mono text-xs overflow-x-auto select-all">{ini}</pre>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Pfade sind Vorgaben für PC-DMIS 2024.1 – auf dem Gerät prüfen.</p>
          {isLocalUrl(agentServerUrl()) && (
            <p data-testid="agent-url-local-hint" className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              Die Adresse {agentServerUrl()} gilt nur auf diesem PC. Für ein anderes Gerät (z. B. den Mess-PC) bei Url die Adresse des MDS-Servers eintragen.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Schlüssel ist übernommen
          </button>
        </div>
      </div>
    </div>
  );
}
