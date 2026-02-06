import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, AlertTriangle, Clock, TrendingUp, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Coffee, UserCheck, UserX, Edit2, Plus, FileDown, FileSpreadsheet, Eye
} from 'lucide-react';
import { useTimeTrackingStore } from '../../stores/timeTrackingStore';
import CorrectionModal from './CorrectionModal';
import axios from '../../utils/axios';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function TimeTrackingAdminPanel() {
  const {
    presence,
    missingEntries,
    allBalances,
    loading,
    fetchPresence,
    fetchMissingEntries,
    fetchAllBalances,
    formatMinutes
  } = useTimeTrackingStore();

  const navigate = useNavigate();
  const [view, setView] = useState('presence'); // presence | missing | balances
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [correctionUser, setCorrectionUser] = useState(null);

  useEffect(() => {
    fetchPresence();
    fetchMissingEntries();
  }, []);

  useEffect(() => {
    fetchAllBalances(selectedMonth.year, selectedMonth.month);
  }, [selectedMonth]);

  const handleCorrectionClose = (refresh) => {
    setCorrectionUser(null);
    if (refresh) {
      fetchMissingEntries();
    }
  };

  // Auto-refresh presence every minute
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPresence();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const navigateMonth = (direction) => {
    setSelectedMonth(prev => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  const handleExport = async (userId, format) => {
    try {
      const ext = format === 'excel' ? 'xlsx' : format;
      const response = await axios.get(
        `/api/time-tracking/export/${format}/${userId}`,
        {
          params: { year: selectedMonth.year, month: selectedMonth.month },
          responseType: 'blob'
        }
      );
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Stundennachweis_${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export-Fehler:', err);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <UserCheck className="h-5 w-5 text-green-500" />;
      case 'break': return <Coffee className="h-5 w-5 text-yellow-500" />;
      default: return <UserX className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: { text: 'Anwesend', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      break: { text: 'Pause', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      absent: { text: 'Abwesend', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
      unknown: { text: 'Unbekannt', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
    };
    return badges[status] || badges.unknown;
  };

  // Group presence by status
  const presenceGroups = {
    present: presence.filter(p => p.status === 'present'),
    break: presence.filter(p => p.status === 'break'),
    absent: presence.filter(p => p.status === 'absent' || p.status === 'unknown')
  };

  // Monatssaldo aktueller Monat
  const monthTarget = allBalances.reduce((sum, r) => sum + (r.target_minutes || 0), 0);
  const monthWorked = allBalances.reduce((sum, r) => sum + (r.worked_minutes || 0), 0);
  const monthDiff = monthWorked - monthTarget;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Anwesend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {presenceGroups.present.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Coffee className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Pause</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {presenceGroups.break.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <UserX className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Abwesend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {presenceGroups.absent.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fehlbuchungen</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {missingEntries.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${monthDiff >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              <TrendingUp className={`h-6 w-6 ${monthDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monatssaldo</p>
              <p className={`text-2xl font-bold ${monthDiff >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatMinutes(monthDiff)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {formatMinutes(monthWorked)} / {formatMinutes(monthTarget)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab-Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[
            { id: 'presence', label: 'Anwesenheit', icon: Users },
            { id: 'missing', label: 'Fehlbuchungen', icon: AlertTriangle, count: missingEntries.length },
            { id: 'balances', label: 'Zeitkonten', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                view === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Anwesenheit */}
      {view === 'presence' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Aktuelle Anwesenheit
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Stand: {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
            </p>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {presence.length === 0 ? (
              <p className="p-8 text-center text-gray-500 dark:text-gray-400">
                Keine Mitarbeiter mit Zeiterfassung aktiviert
              </p>
            ) : (
              presence.map(person => {
                const badge = getStatusBadge(person.status);
                return (
                  <div key={person.user_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(person.status)}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{person.name}</p>
                        {person.first_clock_in && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Seit {new Date(person.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            {person.minutes_today && ` • ${formatMinutes(Math.round(person.minutes_today))}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
                      {badge.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Fehlbuchungen */}
      {view === 'missing' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fehlbuchungen
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Unvollständige Tage mit fehlenden Buchungen
            </p>
          </div>
          
          {missingEntries.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Keine Fehlbuchungen vorhanden</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {missingEntries.map(entry => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <button
                        onClick={() => navigate(`/time-tracking/user/${entry.user_id}`)}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {entry.name}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(entry.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </span>
                      <button
                        onClick={() => navigate(`/time-tracking/user/${entry.user_id}?highlight=${entry.date}`)}
                        className="px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 
                                 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 
                                 rounded-lg transition-colors"
                      >
                        Korrigieren
                      </button>
                    </div>
                  </div>
                  <div className="ml-8 flex flex-wrap gap-2">
                    {entry.needs_review && (
                      <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 rounded font-medium">
                        ⚠ Automatisch abgeschlossen
                      </span>
                    )}
                    {entry.missing_entry_types?.map(type => (
                      <span 
                        key={type}
                        className="px-2 py-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded"
                      >
                        {type === 'clock_out' && 'Gehen fehlt'}
                        {type === 'break_end' && 'Pausenende fehlt'}
                        {type === 'break_short' && 'Pause zu kurz'}
                        {type === 'no_entries' && 'Keine Buchungen'}
                      </span>
                    ))}
                  </div>
                  {entry.review_note && (
                    <p className="ml-8 mt-1 text-xs text-orange-600 dark:text-orange-400">{entry.review_note}</p>
                  )}
                  <div className="ml-8 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {entry.first_clock_in && (
                      <span>Kommen: {new Date(entry.first_clock_in).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    {entry.last_clock_out && (
                      <span className="ml-4">Gehen: {new Date(entry.last_clock_out).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                    )}
                    <span className="ml-4">Arbeitszeit: {formatMinutes(entry.worked_minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Zeitkonten */}
      {view === 'balances' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Zeitkonten
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Übersicht aller Mitarbeiter
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium min-w-[120px] text-center">
                {MONTHS[selectedMonth.month - 1]} {selectedMonth.year}
              </span>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Mitarbeiter
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Soll
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Ist
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Differenz
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Saldo
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Export
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {allBalances.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Keine Daten für diesen Monat
                    </td>
                  </tr>
                ) : (
                  allBalances.map(row => (
                    <tr key={row.user_id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      onClick={() => navigate(`/time-tracking/user/${row.user_id}`)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{row.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{row.time_model_name || 'Kein Modell'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatMinutes(row.target_minutes)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatMinutes(row.worked_minutes)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        (row.overtime_minutes || 0) >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatMinutes(row.overtime_minutes)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${
                        (row.balance_minutes || 0) >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {formatMinutes(row.balance_minutes)}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/time-tracking/user/${row.user_id}`)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 
                                     dark:hover:bg-blue-900/20 rounded"
                            title="Details anzeigen"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExport(row.user_id, 'csv')}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                                     dark:hover:bg-gray-700 rounded"
                            title="CSV Export"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExport(row.user_id, 'excel')}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 
                                     dark:hover:bg-green-900/20 rounded"
                            title="Excel Export"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleExport(row.user_id, 'pdf')}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 
                                     dark:hover:bg-blue-900/20 rounded"
                            title="PDF Export"
                          >
                            <FileDown className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionUser && (
        <CorrectionModal
          user={correctionUser}
          onClose={handleCorrectionClose}
        />
      )}
    </div>
  );
}
