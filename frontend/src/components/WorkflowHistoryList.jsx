// frontend/src/components/WorkflowHistoryList.jsx
// Ablauf eines Eintrags (Statuswechsel mit Name, Uhrzeit und Grund), z. B. Einrichteblatt
import { useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import WorkflowStatusBadge from './WorkflowStatusBadge';

const formatDateTime = (value) => new Date(value).toLocaleString('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function WorkflowHistoryList({ entityType, entityId, refreshKey }) {
  const { fetchHistory, getHistory } = useWorkflowStore();
  const history = getHistory(entityType, entityId);

  useEffect(() => {
    if (entityType && entityId) fetchHistory(entityType, entityId).catch(console.error);
  }, [entityType, entityId, refreshKey, fetchHistory]);

  if (history.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Noch keine Statuswechsel</p>;
  }

  return (
    <ol className="space-y-3">
      {history.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
          <div className="flex items-center gap-2 flex-wrap">
            {entry.from_state_name && (
              <>
                <WorkflowStatusBadge status={entry.from_state_name} size="sm" />
                <span className="text-gray-400" aria-hidden="true">→</span>
              </>
            )}
            <WorkflowStatusBadge status={entry.to_state_name} size="sm" />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {entry.changed_by_first_name && entry.changed_by_last_name
              ? `${entry.changed_by_first_name} ${entry.changed_by_last_name}`
              : entry.changed_by_username || 'System'}
            {' · '}
            <span className="tabular-nums">{formatDateTime(entry.created_at)}</span>
          </div>
          {entry.change_reason && (
            <p className="text-sm text-gray-700 dark:text-gray-300">{entry.change_reason}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
