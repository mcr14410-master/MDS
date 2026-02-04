import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Pause, Square, Coffee, Calendar, TrendingUp, 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, FileDown, FileSpreadsheet, Edit2
} from 'lucide-react';
import { useTimeTrackingStore } from '../../stores/timeTrackingStore';
import { useAuthStore } from '../../stores/authStore';
import axios from '../../utils/axios';
import SelfCorrectionModal from './SelfCorrectionModal';

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function MyTimeTrackingPanel() {
  const { user } = useAuthStore();
  const {
    currentStatus,
    weekStats,
    dailySummaries,
    balance,
    entries,
    loading,
    error,
    stamp,
    fetchMyStatus,
    fetchMyWeek,
    fetchMyMonth,
    fetchMyBalance,
    formatMinutes,
    clearError
  } = useTimeTrackingStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [view, setView] = useState('today'); // today | week | month | balance
  const [expandedDay, setExpandedDay] = useState(null);
  const [stampWarning, setStampWarning] = useState(null);
  const [dayEntries, setDayEntries] = useState([]);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const ENTRY_TYPE_LABELS = {
    clock_in: 'Kommen', clock_out: 'Gehen', break_start: 'Pause Start', break_end: 'Pause Ende'
  };
  const ENTRY_TYPE_COLORS = {
    clock_in: 'text-green-400', clock_out: 'text-red-400', break_start: 'text-yellow-400', break_end: 'text-blue-400'
  };

  const toggleDay = async (dateStr) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null);
      setDayEntries([]);
    } else {
      setExpandedDay(dateStr);
      try {
        const response = await axios.get(`/api/time-tracking/entries/user/${user.id}`, {
          params: { date: dateStr }
        });
        setDayEntries(response.data);
      } catch (err) {
        console.error('Fehler beim Laden der Buchungen:', err);
        setDayEntries([]);
      }
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchMyStatus(user.id);
      fetchMyWeek(user.id);
      fetchMyBalance(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && view === 'month') {
      fetchMyMonth(user.id, selectedMonth.year, selectedMonth.month);
    }
  }, [user?.id, view, selectedMonth]);

  const handleStamp = async (type) => {
    try {
      setStampWarning(null);
      const result = await stamp(type);
      // Warnungen vom Auto-Abschluss anzeigen
      if (result?.warnings?.length > 0) {
        setStampWarning(result.warnings);
      }
      // Refresh data
      fetchMyStatus(user.id);
      fetchMyWeek(user.id);
    } catch (err) {
      // Error is handled in store
    }
  };

  const navigateMonth = (direction) => {
    setExpandedDay(null);
    setSelectedMonth(prev => {
      let newMonth = prev.month + direction;
      let newYear = prev.year;
      if (newMonth > 12) { newMonth = 1; newYear++; }
      if (newMonth < 1) { newMonth = 12; newYear--; }
      return { year: newYear, month: newMonth };
    });
  };

  const handleExport = async (format) => {
    try {
      const ext = format === 'excel' ? 'xlsx' : format;
      const response = await axios.get(
        `/api/time-tracking/export/${format}/${user.id}`,
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

  // Determine which buttons to show based on current status
  const getAvailableActions = () => {
    const status = currentStatus?.status || 'absent';
    switch (status) {
      case 'absent':
        return [{ type: 'clock_in', label: 'Kommen', icon: Play, color: 'green' }];
      case 'present':
        return [
          { type: 'break_start', label: 'Pause', icon: Coffee, color: 'yellow' },
          { type: 'clock_out', label: 'Gehen', icon: Square, color: 'red' }
        ];
      case 'break':
        return [{ type: 'break_end', label: 'Pause Ende', icon: Play, color: 'green' }];
      default:
        return [{ type: 'clock_in', label: 'Kommen', icon: Play, color: 'green' }];
    }
  };

  const getStatusBadge = () => {
    const status = currentStatus?.status || 'absent';
    const badges = {
      present: { text: 'Anwesend', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      break: { text: 'Pause', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      absent: { text: 'Abwesend', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400' }
    };
    return badges[status] || badges.absent;
  };

  const statusBadge = getStatusBadge();

  return (
    <>
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
          </div>
        </div>
      )}

      {/* Stempel-Bereich */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Status & Zeit */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge.color}`}>
                {statusBadge.text}
              </span>
              {currentStatus?.lastEntry && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  seit {new Date(currentStatus.lastEntry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Stempel-Buttons */}
          <div className="flex gap-3 items-center">
            {getAvailableActions().map(action => (
              <button
                key={action.type}
                onClick={() => handleStamp(action.type)}
                disabled={loading}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors
                  ${action.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                  ${action.color === 'yellow' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                  ${action.color === 'red' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <action.icon className="h-5 w-5" />
                {action.label}
              </button>
            ))}
            <button
              onClick={() => setShowCorrectionModal(true)}
              className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
                       bg-gray-100 text-gray-700 hover:bg-gray-200
                       dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              title="Vergessene Buchung nachtragen"
            >
              <Edit2 className="h-5 w-5" />
              <span className="hidden sm:inline">Korrektur</span>
            </button>
          </div>
        </div>
      </div>

      {/* Auto-Abschluss Warnung */}
      {stampWarning && stampWarning.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                Fehlende Buchung automatisch korrigiert
              </p>
              <ul className="mt-1 text-sm text-orange-700 dark:text-orange-400 space-y-0.5">
                {stampWarning.map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-orange-600 dark:text-orange-500">
                Der Vorgesetzte wird informiert und kann die Arbeitszeit korrigieren.
              </p>
            </div>
            <button
              onClick={() => setStampWarning(null)}
              className="text-orange-500 hover:text-orange-700 text-lg"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Tab-Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-4">
          {[
            { id: 'today', label: 'Heute', icon: Clock },
            { id: 'week', label: 'Woche', icon: Calendar },
            { id: 'month', label: 'Monat', icon: Calendar },
            { id: 'balance', label: 'Zeitkonto', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setExpandedDay(null); setView(tab.id); }}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                view === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Heute */}
      {view === 'today' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Heutige Buchungen</h3>
          {entries.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Noch keine Buchungen heute
            </p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, idx) => (
                <div key={entry.id || idx} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      entry.entry_type === 'clock_in' ? 'bg-green-500' :
                      entry.entry_type === 'clock_out' ? 'bg-red-500' :
                      entry.entry_type === 'break_start' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <span className="text-gray-900 dark:text-white">
                      {entry.entry_type === 'clock_in' && 'Kommen'}
                      {entry.entry_type === 'clock_out' && 'Gehen'}
                      {entry.entry_type === 'break_start' && 'Pause Start'}
                      {entry.entry_type === 'break_end' && 'Pause Ende'}
                    </span>
                    {entry.is_correction && (
                      <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
                        Korrektur
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                    {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Woche */}
      {view === 'week' && weekStats && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Woche: {weekStats.week_start} - {weekStats.week_end}
            </h3>
          </div>

          {/* Tagesübersicht */}
          <div className="space-y-0 mb-6">
            {weekStats.days?.map((day, idx) => {
              const dateStr = day.date;
              const isWeekend = [0, 6].includes(new Date(day.date).getDay());
              const hasData = day.worked_minutes > 0;
              const isExpanded = expandedDay === dateStr;

              return (
                <div key={idx}>
                  <div
                    className={`flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 
                      ${hasData ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : ''} 
                      ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                    onClick={() => hasData && toggleDay(dateStr)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-center">
                        {hasData && (isExpanded
                          ? <ChevronUp className="h-4 w-4 text-gray-400 inline" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 inline" />
                        )}
                      </span>
                      <span className="w-8 text-sm text-gray-500 dark:text-gray-400">
                        {WEEKDAYS[new Date(day.date).getDay()]}
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </span>
                      {day.vacation_type && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded">
                          {day.vacation_type}
                        </span>
                      )}
                      {day.holiday_name && (
                        <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">
                          {day.holiday_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        Soll: {formatMinutes(day.target_minutes)}
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        Ist: {formatMinutes(day.worked_minutes)}
                      </span>
                      <span className={day.overtime_minutes >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {day.overtime_minutes > 0 ? '+' : ''}{formatMinutes(day.overtime_minutes)}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <DayEntries entries={dayEntries} labels={ENTRY_TYPE_LABELS} colors={ENTRY_TYPE_COLORS} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Wochensummen */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Soll</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatMinutes(weekStats.totals?.target_minutes)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Ist</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatMinutes(weekStats.totals?.worked_minutes)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Pause</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatMinutes(weekStats.totals?.break_minutes)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">Saldo</div>
              <div className={`text-lg font-semibold ${
                (weekStats.totals?.overtime_minutes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(weekStats.totals?.overtime_minutes || 0) > 0 ? '+' : ''}
                {formatMinutes(weekStats.totals?.overtime_minutes)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monat */}
      {view === 'month' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigateMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white min-w-[150px] text-center">
                {MONTHS[selectedMonth.month - 1]} {selectedMonth.year}
              </h3>
              <button onClick={() => navigateMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            
            {/* Export Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleExport('csv')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Als CSV exportieren"
              >
                <FileDown className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Als Excel exportieren"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Excel
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 
                         hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Als PDF exportieren"
              >
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 text-gray-600 dark:text-gray-400">
                  <th className="text-left py-2 px-2">Datum</th>
                  <th className="text-right py-2 px-2">Soll</th>
                  <th className="text-right py-2 px-2">Ist</th>
                  <th className="text-right py-2 px-2">Pause</th>
                  <th className="text-right py-2 px-2">Saldo</th>
                  <th className="text-center py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.map((day, idx) => {
                  const dateStr = day.date;
                  const isWeekend = [0, 6].includes(new Date(day.date).getDay());
                  const isSpecial = isWeekend || day.holiday_name || day.vacation_type;
                  const hasData = day.worked_minutes > 0;
                  const isExpanded = expandedDay === dateStr;

                  return (
                    <React.Fragment key={idx}>
                      <tr
                        className={`border-b dark:border-gray-700 
                          ${hasData ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                          ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                        onClick={() => hasData && toggleDay(dateStr)}
                      >
                        <td className="py-2 px-2 text-gray-900 dark:text-white">
                          <div className="flex items-center gap-1">
                            <span className="w-4 inline-block">
                              {hasData && (isExpanded
                                ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" />
                                : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                              )}
                            </span>
                            <span className="font-medium">{WEEKDAYS[new Date(day.date).getDay()]}</span>
                            {' '}
                            {new Date(day.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                          </div>
                        </td>
                        <td className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{formatMinutes(day.target_minutes)}</td>
                        <td className="text-right py-2 px-2 font-medium text-gray-900 dark:text-white">{formatMinutes(day.worked_minutes)}</td>
                        <td className="text-right py-2 px-2 text-gray-500 dark:text-gray-400">{formatMinutes(day.break_minutes)}</td>
                        <td className={`text-right py-2 px-2 font-medium ${
                          (day.overtime_minutes || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {(day.overtime_minutes || 0) > 0 ? '+' : ''}{formatMinutes(day.overtime_minutes)}
                        </td>
                        <td className="text-center py-2 px-2">
                          {day.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-500 inline" />}
                          {day.has_missing_entries && <AlertTriangle className="h-4 w-4 text-yellow-500 inline" />}
                          {day.vacation_type && (
                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              {day.vacation_type}
                            </span>
                          )}
                          {day.holiday_name && (
                            <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">
                              Feiertag
                            </span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
                            <DayEntries entries={dayEntries} labels={ENTRY_TYPE_LABELS} colors={ENTRY_TYPE_COLORS} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Zeitkonto */}
      {view === 'balance' && balance && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Zeitkonto</h3>
          
          {/* Aktueller Saldo */}
          <div className="text-center mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aktueller Saldo</div>
            <div className={`text-4xl font-bold ${
              (balance.current_balance_minutes || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(balance.current_balance_minutes || 0) > 0 ? '+' : ''}
              {formatMinutes(balance.current_balance_minutes)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ({((balance.current_balance_minutes || 0) / 60).toFixed(1)} Stunden)
            </div>
          </div>

          {/* Monatliche Übersicht */}
          {balance.monthly?.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Monatsverlauf</h4>
              <div className="space-y-2">
                {balance.monthly.map((month, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white">
                      {MONTHS[month.month - 1]} {month.year}
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">
                        Überstunden: {formatMinutes(month.overtime_minutes)}
                      </span>
                      {month.adjustment_minutes !== 0 && (
                        <span className="text-orange-600">
                          Korrektur: {month.adjustment_minutes > 0 ? '+' : ''}{formatMinutes(month.adjustment_minutes)}
                        </span>
                      )}
                      {month.payout_minutes > 0 && (
                        <span className="text-purple-600">
                          Auszahlung: -{formatMinutes(month.payout_minutes)}
                        </span>
                      )}
                      <span className={`font-medium ${month.balance_minutes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        = {month.balance_minutes > 0 ? '+' : ''}{formatMinutes(month.balance_minutes)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

      {/* Selbst-Korrektur Modal */}
      <SelfCorrectionModal
        isOpen={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        onSuccess={() => {
          fetchMyStatus(user.id);
          fetchMyWeek(user.id);
        }}
      />
    </>
  );
}

function DayEntries({ entries, labels, colors }) {
  if (!entries || entries.length === 0) {
    return <div className="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">Keine Buchungen</div>;
  }

  const sorted = [...entries].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="px-6 py-3 space-y-1">
      {sorted.map(entry => (
        <div key={entry.id} className="flex items-center gap-3 py-1.5 px-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
          <span className="text-sm font-mono text-gray-900 dark:text-white">
            {new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={`text-sm font-medium ${colors[entry.entry_type]}`}>
            {labels[entry.entry_type]}
          </span>
          {entry.is_correction && (
            <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
              Korrektur
            </span>
          )}
          <span className="text-xs text-gray-400">
            ({entry.source === 'web' ? 'Web' : entry.source === 'terminal' ? 'Terminal' : entry.source === 'self_correction' ? 'Selbst-Korrektur' : entry.source === 'correction' ? 'Admin-Korrektur' : entry.source})
          </span>
        </div>
      ))}
    </div>
  );
}
