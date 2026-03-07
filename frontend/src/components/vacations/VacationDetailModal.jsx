import { useState, useEffect } from 'react';
import { X, Pencil, Calendar, Sun, FileDown } from 'lucide-react';
import axios from '../../utils/axios';

const getRoleBadgeColor = (roleName) => {
  const colors = {
    admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    programmer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    reviewer: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    operator: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    helper: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    supervisor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };
  return colors[roleName?.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
};

const statusLabels = {
  approved: { text: 'Genehmigt', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  pending: { text: 'Beantragt', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  rejected: { text: 'Abgelehnt', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
};

function formatDate(dateStr) {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export default function VacationDetailModal({ balance, year, onClose, onEdit }) {
  const [vacations, setVacations] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  const total = parseFloat(balance.total_days) || 0;
  const carried = parseFloat(balance.carried_over) || 0;
  const adjustment = parseFloat(balance.adjustment) || 0;
  const available = total + carried + adjustment;
  const taken = parseFloat(balance.taken_days) || 0;
  const approved = parseFloat(balance.approved_days) || 0;
  const pending = parseFloat(balance.pending_days) || 0;
  const remaining = parseFloat(balance.remaining_days) || 0;

  const takenPct = available > 0 ? (taken / available) * 100 : 0;
  const approvedPct = available > 0 ? (approved / available) * 100 : 0;
  const pendingPct = available > 0 ? (pending / available) * 100 : 0;

  const handleExport = async () => {
    try {
      const response = await axios.get(`/api/vacations/export/user/${balance.user_id}`, {
        params: { year },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Urlaubsuebersicht_${balance.display_name?.replace(/\s+/g, '_')}_${year}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  useEffect(() => {
    axios.get('/api/vacations', { params: { user_id: balance.user_id, year } })
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : res.data?.rows || [];
        setVacations(data);
        // Extract roles from first vacation entry (roles is JSON array)
        if (data.length > 0 && Array.isArray(data[0].roles)) {
          setRoles(data[0].roles.map(r => r.role_name || r.name || r));
        }
      })
      .catch(err => console.error('Error fetching vacations:', err))
      .finally(() => setLoading(false));
  }, [balance.user_id, year]);

  // Split: affects_balance vs. not
  const balanceVacations = vacations.filter(v => v.affects_balance !== false);
  const otherVacations = vacations.filter(v => v.affects_balance === false);

  // Group helper
  const groupByType = (list) => {
    const groups = {};
    list.forEach(v => {
      const key = v.type_name || 'Sonstige';
      if (!groups[key]) groups[key] = { color: v.type_color, entries: [], totalDays: 0 };
      groups[key].entries.push(v);
      if (v.status !== 'rejected') groups[key].totalDays += parseFloat(v.calculated_days) || 0;
    });
    return groups;
  };

  const balanceGroups = groupByType(balanceVacations);
  const otherGroups = groupByType(otherVacations);

  const remainingColor = remaining < 0 ? 'text-red-600 dark:text-red-400' 
    : remaining < 5 ? 'text-yellow-600 dark:text-yellow-400' 
    : 'text-green-600 dark:text-green-400';

  // Render a group of vacations
  const renderGroup = (groups) => (
    Object.entries(groups).map(([typeName, group]) => (
      <div key={typeName} className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: group.color || '#6b7280' }} />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{typeName}</span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{group.totalDays} Tage</span>
        </div>
        {group.entries.map(v => {
          const st = statusLabels[v.status] || { text: v.status, color: 'text-gray-500', bg: 'bg-gray-100' };
          return (
            <div key={v.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/30 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {formatDate(v.start_date)} – {formatDate(v.end_date)}
                </span>
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${st.bg} ${st.color}`}>
                  {st.text}
                </span>
                {v.status === 'approved' && v.approved_by_name && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    von {v.approved_by_name}{v.approved_at ? `, ${formatDate(v.approved_at)}` : ''}
                  </span>
                )}
              </div>
              <span className="text-gray-500 dark:text-gray-400 text-xs shrink-0 ml-2">
                {v.calculated_days} T
              </span>
            </div>
          );
        })}
      </div>
    ))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-auto z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                {balance.display_name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {(roles.length > 0 ? roles : (balance.role_name ? [balance.role_name] : [])).map((name, idx) => (
                  <span key={idx} className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${getRoleBadgeColor(name)}`}>
                    {name}
                  </span>
                ))}
                <span className="text-sm text-gray-500 dark:text-gray-400">{year}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleExport}
                className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                title="PDF Export"
              >
                <FileDown className="h-4 w-4" />
              </button>
              <button
                onClick={onEdit}
                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Urlaubsanspruch bearbeiten"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Urlaubskonto Box */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Urlaubskonto
              </h3>

              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Jahresanspruch</span>
                <span className="font-medium text-gray-900 dark:text-white">{total} Tage</span>
              </div>
              {carried > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Übertrag Vorjahr</span>
                  <span className="font-medium text-gray-900 dark:text-white">+{carried} Tage</span>
                </div>
              )}
              {adjustment !== 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Korrektur</span>
                  <span className="font-medium text-gray-900 dark:text-white">{adjustment > 0 ? '+' : ''}{adjustment} Tage</span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Verfügbar gesamt</span>
                <span className="font-bold text-gray-900 dark:text-white">{available} Tage</span>
              </div>

              {/* Fortschrittsbalken */}
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                {taken > 0 && (
                  <div className="h-full bg-gray-500 dark:bg-gray-400" style={{ width: `${Math.min(takenPct, 100)}%` }} />
                )}
                {approved > 0 && (
                  <div className="h-full bg-green-500 dark:bg-green-400" style={{ width: `${Math.min(approvedPct, 100)}%` }} />
                )}
                {pending > 0 && (
                  <div className="h-full bg-amber-400 dark:bg-amber-500" style={{ width: `${Math.min(pendingPct, 100)}%` }} />
                )}
              </div>

              {/* Aufschlüsselung */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-500 dark:bg-gray-400 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">Genommen</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-white">{taken}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 dark:bg-green-400 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">Genehmigt</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-white">{approved}</span>
                </div>
                <div className="col-span-2 border-t border-gray-200 dark:border-gray-700" />
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">Beantragt</span>
                  <span className="ml-auto font-medium text-gray-900 dark:text-white">{pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${remaining < 0 ? 'bg-red-500' : remaining < 5 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Rest</span>
                  <span className={`ml-auto font-bold ${remainingColor}`}>{remaining}</span>
                </div>
              </div>
            </div>

            {/* Abwesenheiten mit Urlaubsabzug */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Vom Urlaubskonto ({year})
              </h3>

              {loading ? (
                <div className="text-center py-4 text-sm text-gray-500 dark:text-gray-400">Laden...</div>
              ) : balanceVacations.length === 0 ? (
                <div className="text-center py-3 text-sm text-gray-500 dark:text-gray-400">
                  Keine Einträge
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {renderGroup(balanceGroups)}
                </div>
              )}
            </div>

            {/* Sonstige Abwesenheiten (ohne Urlaubsabzug) */}
            {otherVacations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Ohne Urlaubsabzug ({year})
                </h3>
                <div className="max-h-48 overflow-y-auto">
                  {renderGroup(otherGroups)}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 
                         hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg"
            >
              <Pencil className="h-4 w-4" />
              Anspruch bearbeiten
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
