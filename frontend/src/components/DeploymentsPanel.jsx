// frontend/src/components/DeploymentsPanel.jsx
// „Auf dem Mess-PC“: offene Bereitstellungen mit Dateistatus, neuer Freigabe, Fertig und Verwerfen
// (Spec MESSPROGRAMME_AGENT_SPEC.md 5.5). Mit operationId nur die Bereitstellungen dieses Arbeitsgangs.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import {
  DEPLOYMENT_STATUS, KEPT_STATES, ROLE_SHORT, fileState, formatDateTime, timeAgo, worstState,
} from '../utils/agentLabels';

const errorText = (err, fallback) => {
  const d = err.response?.data;
  return [d?.error || fallback, ...(d?.details || [])].join(' – ');
};

export default function DeploymentsPanel({ operationId = null, reloadKey = 0, onChange }) {
  const { hasPermission } = useAuthStore();
  const canDeploy = hasPermission('program.deploy');
  const [deployments, setDeployments] = useState(null);
  const [busy, setBusy] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await axios.get(`/api/deployments?status=open${operationId ? `&operation_id=${operationId}` : ''}`);
      setDeployments(res.data.data);
    } catch {
      setDeployments([]);
    }
  }, [operationId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [load, reloadKey]);

  const act = async (key, request, success) => {
    setBusy(key);
    try {
      const res = await request();
      toast.success(res.data.message || success);
      await load();
      onChange?.();
    } catch (err) {
      toast.error(errorText(err, 'Aktion fehlgeschlagen'));
    } finally {
      setBusy(null);
    }
  };

  const close = (d) => {
    const where = [d.part_number, d.op_number].filter(Boolean).join(' ');
    if (!window.confirm(`${where} auf ${d.agent_name} abschließen?\n\nDer Agent räumt die Dateien beim nächsten Abgleich weg. Wurde ein Programm nach dem Messen gespeichert, fragt er am Gerät nach.`)) return;
    act(`close-${d.id}`, () => axios.post(`/api/deployments/${d.id}/close`), 'Wird abgeschlossen');
  };
  const discard = (d) => {
    if (!window.confirm(`Vor Ort bearbeitete Dateien auf ${d.agent_name} verwerfen?\n\nNur bestätigen, wenn die Änderung als neue Version hochgeladen ist oder nicht gebraucht wird. Der Agent löscht die Dateien beim nächsten Abgleich.`)) return;
    act(`discard-${d.id}`, () => axios.post(`/api/deployments/${d.id}/discard-local`), 'Wird verworfen');
  };
  const update = (d, p) => {
    if (!window.confirm(`${p.program_number} auf ${d.agent_name} von ${p.version} auf ${p.newer_release} umstellen?\n\nWurde das Programm nach dem Messen gespeichert, fragt der Agent am Gerät, ob es bearbeitet wurde.`)) return;
    act(`update-${d.id}-${p.program_id}`, () => axios.post(`/api/deployments/${d.id}/programs/${p.program_id}/update`), 'Aktualisiert');
  };

  if (deployments === null) return null;
  if (deployments.length === 0) {
    return operationId ? null : (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
        <span className="font-semibold text-gray-900 dark:text-white">Auf dem Mess-PC:</span> nichts bereitgestellt.
        Bereitgestellt wird am Arbeitsgang (Reiter Messprogramme).
      </div>
    );
  }

  return (
    <section className="space-y-3" aria-label="Auf dem Mess-PC">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Auf dem Mess-PC <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({deployments.length})</span>
      </h2>
      {deployments.map((d) => {
        const status = DEPLOYMENT_STATUS[d.status];
        const allFiles = d.programs.flatMap((p) => p.files);
        const deviceFiles = allFiles.concat(d.other_files);
        const kept = d.status === 'closing' && deviceFiles.some((f) => KEPT_STATES.includes(f.state));
        // Nur nach dem Messen gespeichert: Der Agent fragt am Mess-PC „nur gemessen oder bearbeitet?“ – noch nichts entschieden
        const awaitingAnswer = kept && !deviceFiles.some((f) => f.state === 'modified' || f.state === 'corrupt');
        // .prg.corrupt fasst der Agent nie an, auch nicht beim Verwerfen (Agent 4.8a, Entscheidung 31.10.2026)
        const corrupt = kept && deviceFiles.some((f) => f.state === 'corrupt');
        const edited = kept && deviceFiles.some((f) => f.state === 'modified');
        return (
          <div key={d.id} data-testid={`deployment-${d.id}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/parts/${d.part_id}?op=${d.operation_id}&tab=cmm_programs`}
                    className="font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    {d.part_number} {d.op_number}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-300">{d.op_name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-700 dark:text-gray-300">{d.agent_name}</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${status.className}`}>{status.label}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500 dark:text-gray-400">
                  <span title={formatDateTime(d.created_at)}>bereitgestellt {timeAgo(d.created_at)} von {d.requested_by_username || '–'}</span>
                  <span title={formatDateTime(d.last_activity_at)}>letzte Aktivität {timeAgo(d.last_activity_at)}</span>
                  <span title={formatDateTime(d.agent_last_seen_at)}>Agent zuletzt gesehen {timeAgo(d.agent_last_seen_at)}</span>
                </div>
              </div>
              {canDeploy && (
                <div className="flex gap-2">
                  {kept && !d.discard_local_at && (
                    <button onClick={() => discard(d)} disabled={busy !== null}
                      className="px-3 py-1.5 text-sm rounded-lg border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 disabled:opacity-50">
                      Lokale Dateien verwerfen
                    </button>
                  )}
                  {(d.status === 'requested' || d.status === 'active') && (
                    <button onClick={() => close(d)} disabled={busy !== null}
                      className="px-3 py-1.5 text-sm rounded-lg bg-gray-800 dark:bg-gray-600 text-white hover:bg-gray-700 dark:hover:bg-gray-500 disabled:opacity-50">
                      Fertig
                    </button>
                  )}
                </div>
              )}
            </div>

            {kept && (d.discard_local_at || !awaitingAnswer) && (
              <p data-testid="deployment-kept-hint" className="mt-3 p-2 rounded bg-orange-50 dark:bg-orange-900/20 text-sm text-orange-800 dark:text-orange-200">
                {d.discard_local_at
                  ? `Verwerfen angefordert von ${d.discard_local_by_username || '–'} – der Agent löscht beim nächsten Abgleich.`
                  : edited && 'Vor Ort bearbeitet – liegt noch auf dem Gerät. Änderung als neue Version hochladen, danach „Lokale Dateien verwerfen“.'}
                {corrupt && `${edited || d.discard_local_at ? ' ' : ''}Eine von PC-DMIS wiederhergestellte Datei (.corrupt) liegt im Programmordner. Der Agent löscht sie nie – am Mess-PC prüfen und von Hand löschen.`}
              </p>
            )}
            {awaitingAnswer && !d.discard_local_at && (
              <p data-testid="deployment-awaiting-hint" className="mt-3 p-2 rounded bg-sky-50 dark:bg-sky-900/20 text-sm text-sky-800 dark:text-sky-200">
                Wartet auf Antwort am Mess-PC: Das Programm wurde nach dem Messen gespeichert – nur gemessen oder bearbeitet?
                Antwortet dort niemand, lassen sich die Dateien hier mit „Lokale Dateien verwerfen“ entfernen.
              </p>
            )}

            <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-700">
              {d.programs.map((p) => {
                const worst = fileState(worstState(p.files));
                const key = `${d.id}-${p.program_id}`;
                return (
                  <div key={p.program_id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono font-medium text-gray-900 dark:text-white">{p.program_number}</span>
                      <span className="text-gray-600 dark:text-gray-400">Version {p.version}</span>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${worst.className}`} title={worst.label}>{worst.short}</span>
                      {p.newer_release && (
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">neue Version {p.newer_release} freigegeben</span>
                      )}
                      {p.newer_release && canDeploy && d.status !== 'closing' && (
                        <button onClick={() => update(d, p)} disabled={busy !== null}
                          className="px-2 py-0.5 text-xs rounded border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50">
                          Aktualisieren
                        </button>
                      )}
                      <button onClick={() => setExpanded((e) => ({ ...e, [key]: !e[key] }))}
                        className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline">
                        {expanded[key] ? 'Dateien ausblenden' : `${p.files.length} Dateien`}
                      </button>
                    </div>
                    {expanded[key] && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {p.files.map((f) => {
                          const s = fileState(f.state);
                          return (
                            <li key={f.file_id} className="flex flex-wrap items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded ${s.className}`}>{s.short}</span>
                              <span className="text-gray-500 dark:text-gray-400">{ROLE_SHORT[f.role] || f.role}</span>
                              <span className="font-mono text-gray-800 dark:text-gray-200 break-all">
                                {f.target === 'template_dir' ? 'Vorlagenverzeichnis\\' : ''}{f.rel_path}
                              </span>
                              {f.message && <span className="text-gray-500 dark:text-gray-400">– {f.message}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {d.other_files.length > 0 && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Weitere Dateien vom Gerät gemeldet:</span>
                <ul className="mt-1 space-y-1">
                  {d.other_files.map((f) => {
                    const s = fileState(f.state);
                    return (
                      <li key={`${f.target}-${f.rel_path}`} className="flex flex-wrap items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded ${s.className}`}>{s.short}</span>
                        <span className="font-mono break-all">{f.rel_path}</span>
                        {f.message && <span>– {f.message}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
