import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Clock, Calendar,
  TrendingUp, Edit2, Trash2, Plus, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, FileDown, FileSpreadsheet, DollarSign, Sliders, MessageSquare
} from 'lucide-react';
import axios from '../utils/axios';
import CorrectionModal from '../components/timeTracking/CorrectionModal';
import EditEntryModal from '../components/timeTracking/EditEntryModal';
import DayEditModal from '../components/timeTracking/DayEditModal';

const MONTH_NAMES = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '-';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}:${m.toString().padStart(2, '0')}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '-';
  return new Date(timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

const ENTRY_TYPE_LABELS = {
  clock_in: 'Kommen',
  clock_out: 'Gehen',
  break_start: 'Pause Start',
  break_end: 'Pause Ende'
};

const ENTRY_TYPE_COLORS = {
  clock_in: 'text-green-400',
  clock_out: 'text-red-400',
  break_start: 'text-yellow-400',
  break_end: 'text-blue-400'
};

export default function TimeTrackingUserDetailPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Highlight-Parameter: Tag aufklappen wenn von Fehlbuchungen navigiert
  const highlightDate = searchParams.get('highlight');

  // Month navigation - bei highlight zum richtigen Monat springen
  const now = new Date();
  const todayStr = now.toLocaleDateString('sv-SE');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (highlightDate) {
      const d = new Date(highlightDate);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // Data
  const [userInfo, setUserInfo] = useState(null);
  const [dailySummaries, setDailySummaries] = useState([]);
  const [balance, setBalance] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayEntries, setDayEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [correctionData, setCorrectionData] = useState(null);
  const [editEntryData, setEditEntryData] = useState(null);
  const [dayEditData, setDayEditData] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setUserInfo(response.data.user || response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Benutzerinfos:', err);
    }
  }, [userId]);

  const fetchDailySummaries = useCallback(async () => {
    try {
      const response = await axios.get(`/api/time-tracking/balances/user/${userId}/daily`, {
        params: { year: selectedMonth.year, month: selectedMonth.month }
      });
      setDailySummaries(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Tagesübersichten:', err);
    }
  }, [userId, selectedMonth]);

  const fetchBalance = useCallback(async () => {
    try {
      const response = await axios.get(`/api/time-tracking/balances/user/${userId}`);
      setBalance(response.data);
    } catch (err) {
      console.error('Fehler beim Laden des Zeitkontos:', err);
    }
  }, [userId]);

  const fetchDayEntries = async (date) => {
    try {
      const response = await axios.get(`/api/time-tracking/entries/user/${userId}`, {
        params: { date }
      });
      setDayEntries(response.data);
    } catch (err) {
      console.error('Fehler beim Laden der Buchungen:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchUserInfo(), fetchDailySummaries(), fetchBalance()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchUserInfo, fetchDailySummaries, fetchBalance]);

  // Highlight: Tag aufklappen wenn von Fehlbuchungen navigiert
  useEffect(() => {
    if (highlightDate && !loading && dailySummaries.length > 0) {
      setExpandedDay(highlightDate);
      fetchDayEntries(highlightDate);
      // Parameter aus URL entfernen
      setSearchParams({}, { replace: true });
    }
  }, [highlightDate, loading, dailySummaries]);

  // ============================================
  // Navigation
  // ============================================

  const changeMonth = (delta) => {
    setExpandedDay(null);
    setSelectedMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 1) { m = 12; y--; }
      if (m > 12) { m = 1; y++; }
      return { year: y, month: m };
    });
  };

  // ============================================
  // Day Expansion
  // ============================================

  const toggleDay = async (dateStr) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null);
      setDayEntries([]);
    } else {
      setExpandedDay(dateStr);
      await fetchDayEntries(dateStr);
    }
  };

  // ============================================
  // Actions
  // ============================================

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Buchung wirklich löschen?')) return;
    try {
      await axios.delete(`/api/time-tracking/entries/${entryId}`);
      await fetchDayEntries(expandedDay);
      await fetchDailySummaries();
      await fetchBalance();
    } catch (err) {
      console.error('Fehler beim Löschen:', err);
    }
  };

  const handleCorrectionClose = async (refresh) => {
    setCorrectionData(null);
    if (refresh) {
      await fetchDailySummaries();
      await fetchBalance();
      if (expandedDay) await fetchDayEntries(expandedDay);
    }
  };

  const handleEditEntryClose = async (refresh) => {
    setEditEntryData(null);
    if (refresh) {
      await fetchDailySummaries();
      await fetchBalance();
      if (expandedDay) await fetchDayEntries(expandedDay);
    }
  };

  const handleDayEditClose = async (refresh) => {
    setDayEditData(null);
    if (refresh) {
      await fetchDailySummaries();
      await fetchBalance();
    }
  };

  const handleExport = async (format) => {
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
      a.download = `Stundennachweis_${userInfo?.first_name || ''}_${userInfo?.last_name || ''}_${selectedMonth.year}-${String(selectedMonth.month).padStart(2, '0')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export-Fehler:', err);
    }
  };

  // ============================================
  // Computed
  // ============================================

  const monthTotals = dailySummaries.reduce((acc, day) => ({
    target: acc.target + (day.target_minutes || 0),
    worked: acc.worked + (day.worked_minutes || 0),
    breaks: acc.breaks + (day.break_minutes || 0),
    overtime: acc.overtime + (day.overtime_minutes || 0)
  }), { target: 0, worked: 0, breaks: 0, overtime: 0 });

  const currentMonthBalance = balance?.monthly?.find(
    m => m.year === selectedMonth.year && m.month === selectedMonth.month
  );

  const userName = userInfo
    ? `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || userInfo.username
    : 'Laden...';

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {userInfo?.time_model_name || 'Kein Zeitmodell zugewiesen'}
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-1">
          <button onClick={() => handleExport('csv')} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="CSV">
            <FileDown className="h-4 w-4" />
          </button>
          <button onClick={() => handleExport('excel')} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg" title="Excel">
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <button onClick={() => handleExport('pdf')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="PDF">
            <FileDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => changeMonth(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
        </h2>
        <button onClick={() => changeMonth(1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <ChevronRight className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Soll" value={formatMinutes(monthTotals.target)} icon={<Clock className="h-5 w-5" />} color="blue" />
        <SummaryCard label="Ist" value={formatMinutes(monthTotals.worked)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
        <SummaryCard label="Pausen" value={formatMinutes(monthTotals.breaks)} icon={<Clock className="h-5 w-5" />} color="yellow" />
        <SummaryCard
          label="Differenz"
          value={formatMinutes(monthTotals.overtime)}
          icon={<TrendingUp className="h-5 w-5" />}
          color={monthTotals.overtime >= 0 ? 'green' : 'red'}
        />
        <SummaryCard
          label="Gesamtsaldo"
          value={formatMinutes(balance?.current_balance_minutes)}
          icon={<Calendar className="h-5 w-5" />}
          color={(balance?.current_balance_minutes || 0) >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Zeitkonto Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAdjustmentModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Sliders className="h-4 w-4" />
          Saldo-Anpassung
        </button>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
        >
          <DollarSign className="h-4 w-4" />
          Auszahlung erfassen
        </button>
      </div>

      {/* Daily Summary Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <th className="px-3 py-3 text-left w-8"></th>
                <th className="px-3 py-3 text-left">Datum</th>
                <th className="px-3 py-3 text-left">Tag</th>
                <th className="px-3 py-3 text-center">Kommen</th>
                <th className="px-3 py-3 text-center">Gehen</th>
                <th className="px-3 py-3 text-center">Pause</th>
                <th className="px-3 py-3 text-center">Arbeitszeit</th>
                <th className="px-3 py-3 text-center">Soll</th>
                <th className="px-3 py-3 text-center">Diff.</th>
                <th className="px-3 py-3 text-left">Status</th>
                <th className="px-3 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {dailySummaries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    Keine Daten für diesen Monat
                  </td>
                </tr>
              ) : (
                dailySummaries.map(day => {
                  const date = new Date(day.date);
                  const weekday = WEEKDAYS[date.getDay()];
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  const isHoliday = day.status === 'holiday' || day.holiday_name;
                  const isVacation = day.vacation_type;
                  const isAbsent = day.status === 'absent';
                  const isSpecial = isWeekend || isHoliday || isVacation;
                  // Werte nur bei echtem Wochenende ohne Soll ausblenden
                  const hideTimeValues = isWeekend && !day.target_minutes;
                  const dateStr = day.date.split('T')[0];
                  const isExpanded = expandedDay === dateStr;
                  const hasMissing = day.has_missing_entries;

                  let statusText = '';
                  let statusColor = 'text-gray-400';
                  if (isHoliday) { statusText = day.holiday_name || 'Feiertag'; statusColor = 'text-purple-400'; }
                  else if (isVacation) { statusText = day.vacation_type; statusColor = 'text-blue-400'; }
                  else if (isWeekend) { statusText = 'Wochenende'; statusColor = 'text-gray-400'; }
                  else if (day.status === 'complete') { statusText = 'Vollständig'; statusColor = 'text-green-400'; }
                  else if (hasMissing) { statusText = 'Fehlbuchung'; statusColor = 'text-red-400'; }
                  else if (day.status === 'absent') { statusText = 'Abwesend'; statusColor = 'text-red-400'; }
                  else if (day.worked_minutes > 0) { statusText = 'Offen'; statusColor = 'text-yellow-400'; }

                  // Aufklappbar wenn: normaler Arbeitstag ODER Abwesenheit mit Stempelungen
                  const hasEntries = day.first_clock_in != null;
                  const canExpand = (!isSpecial && (day.worked_minutes > 0 || dateStr <= todayStr)) || hasEntries;

                  return (
                    <DayRowGroup key={dateStr}>
                      {/* Main Row */}
                      <tr
                        className={`
                          ${isSpecial ? 'bg-gray-50/50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                          ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}
                          cursor-pointer transition-colors
                        `}
                        onClick={() => canExpand && toggleDay(dateStr)}
                      >
                        <td className="px-3 py-2.5 text-center">
                          {canExpand && (
                            isExpanded
                              ? <ChevronUp className="h-4 w-4 text-gray-400 inline" />
                              : <ChevronDown className="h-4 w-4 text-gray-400 inline" />
                          )}
                        </td>
                        <td className={`px-3 py-2.5 font-medium ${isSpecial ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {formatDate(day.date)}
                        </td>
                        <td className={`px-3 py-2.5 ${isSpecial ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                          {weekday}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300">
                          {isSpecial ? '' : formatTime(day.first_clock_in)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300">
                          {isSpecial ? '' : formatTime(day.last_clock_out)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600 dark:text-gray-300">
                          {isSpecial ? '' : formatMinutes(day.break_minutes)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-medium text-gray-900 dark:text-white">
                          {hideTimeValues ? '' : formatMinutes(day.worked_minutes)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-500">
                          {hideTimeValues ? '' : formatMinutes(day.target_minutes)}
                        </td>
                        <td className={`px-3 py-2.5 text-center font-medium ${
                          hideTimeValues ? '' :
                          (day.overtime_minutes || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {hideTimeValues ? '' : formatMinutes(day.overtime_minutes)}
                        </td>
                        <td className={`px-3 py-2.5 ${statusColor}`}>
                          <div className="flex items-center gap-1">
                            {hasMissing && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                            {day.status === 'complete' && !isSpecial && <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
                            <span className="text-xs">{statusText}</span>
                            {day.note && (
                              <MessageSquare className="h-3 w-3 text-blue-400" title={day.note} />
                            )}
                            {day.target_override_minutes != null && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1 rounded" title="Soll manuell überschrieben">
                                Ü
                              </span>
                            )}
                            {day.needs_review && (
                              <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1 rounded animate-pulse" title={day.review_note || 'Prüfung nötig'}>
                                Prüfen
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          {!isWeekend && (
                            <button
                              onClick={() => setDayEditData({
                                userId: parseInt(userId),
                                date: dateStr,
                                dayData: day,
                                name: userName
                              })}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                              title="Tag bearbeiten"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded Entries */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={11} className="bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                            <div className="px-6 py-3">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase">
                                  Buchungen am {formatDate(day.date)}
                                </h4>
                                <button
                                  onClick={() => setCorrectionData({
                                    user_id: parseInt(userId),
                                    name: userName,
                                    date: dateStr
                                  })}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                >
                                  <Plus className="h-3 w-3" />
                                  Buchung hinzufügen
                                </button>
                              </div>
                              {dayEntries.length === 0 ? (
                                <p className="text-sm text-gray-500 py-2">Keine Buchungen</p>
                              ) : (
                                <div className="space-y-1">
                                  {dayEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map(entry => (
                                    <div
                                      key={entry.id}
                                      className="flex items-center justify-between py-1.5 px-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-mono text-gray-900 dark:text-white">
                                          {formatTime(entry.timestamp)}
                                        </span>
                                        <span className={`text-sm font-medium ${ENTRY_TYPE_COLORS[entry.entry_type]}`}>
                                          {ENTRY_TYPE_LABELS[entry.entry_type]}
                                        </span>
                                        {entry.is_correction && (
                                          <span className="px-1.5 py-0.5 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                                            Korrektur{entry.corrected_by_name ? ` (${entry.corrected_by_name})` : ''}
                                          </span>
                                        )}
                                        {entry.correction_reason && (
                                          <span className="text-xs text-gray-400">
                                            {entry.correction_reason}
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-400">
                                          ({entry.source === 'web' ? 'Web' : entry.source === 'terminal' ? 'Terminal' : entry.source})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => setEditEntryData(entry)}
                                          className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                          title="Buchung bearbeiten"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                          title="Buchung löschen"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </DayRowGroup>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summenzeile */}
        {dailySummaries.length > 0 && (
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Summe</span>
            <div className="flex items-center gap-6">
              <span className="text-gray-500">Soll: <strong className="text-gray-700 dark:text-gray-300">{formatMinutes(monthTotals.target)}</strong></span>
              <span className="text-gray-500">Ist: <strong className="text-gray-700 dark:text-gray-300">{formatMinutes(monthTotals.worked)}</strong></span>
              <span className="text-gray-500">Pause: <strong className="text-gray-700 dark:text-gray-300">{formatMinutes(monthTotals.breaks)}</strong></span>
              <span className="text-gray-500">
                Differenz:{' '}
                <strong className={monthTotals.overtime >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatMinutes(monthTotals.overtime)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Balance Details */}
      {currentMonthBalance && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Zeitkonto-Details – {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BalanceDetail label="Übertrag" value={currentMonthBalance.carryover_minutes} />
            <BalanceDetail label="Überstunden" value={currentMonthBalance.overtime_minutes} />
            <BalanceDetail label="Anpassungen" value={currentMonthBalance.adjustment_minutes} />
            <BalanceDetail label="Auszahlungen" value={-(currentMonthBalance.payout_minutes || 0)} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Monatssaldo</span>
            <span className={`text-xl font-bold ${
              (currentMonthBalance.balance_minutes || 0) >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {formatMinutes(currentMonthBalance.balance_minutes)}
            </span>
          </div>
          {currentMonthBalance.adjustment_reason && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs font-semibold text-gray-500 mb-1">Anpassungs-Protokoll:</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                {currentMonthBalance.adjustment_reason}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Monatsverlauf */}
      {balance?.monthly?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monatsverlauf {selectedMonth.year}
          </h3>
          <div className="space-y-2">
            {balance.monthly.map(m => (
              <div
                key={`${m.year}-${m.month}`}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  m.month === selectedMonth.month
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                }`}
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {MONTH_NAMES[m.month - 1]} {m.year}
                </span>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">
                    Soll: {formatMinutes(m.target_minutes)}
                  </span>
                  <span className="text-gray-500">
                    Ist: {formatMinutes(m.worked_minutes)}
                  </span>
                  <span className={`font-medium ${
                    (m.overtime_minutes || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {formatMinutes(m.overtime_minutes)}
                  </span>
                  <span className={`font-bold ${
                    (m.balance_minutes || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    = {formatMinutes(m.balance_minutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {correctionData && (
        <CorrectionModal
          user={correctionData}
          onClose={handleCorrectionClose}
        />
      )}

      {/* Edit Entry Modal */}
      {editEntryData && (
        <EditEntryModal
          entry={editEntryData}
          userName={userName}
          onClose={handleEditEntryClose}
        />
      )}

      {/* Day Edit Modal */}
      {dayEditData && (
        <DayEditModal
          userId={dayEditData.userId}
          date={dayEditData.date}
          dayData={dayEditData.dayData}
          userName={dayEditData.name}
          onClose={handleDayEditClose}
        />
      )}

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <AdjustmentModal
          userId={userId}
          year={selectedMonth.year}
          month={selectedMonth.month}
          monthName={MONTH_NAMES[selectedMonth.month - 1]}
          onClose={async (refresh) => {
            setShowAdjustmentModal(false);
            if (refresh) { await fetchBalance(); await fetchDailySummaries(); }
          }}
        />
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <PayoutModal
          userId={userId}
          year={selectedMonth.year}
          month={selectedMonth.month}
          monthName={MONTH_NAMES[selectedMonth.month - 1]}
          currentBalance={balance?.current_balance_minutes || 0}
          onClose={async (refresh) => {
            setShowPayoutModal(false);
            if (refresh) { await fetchBalance(); await fetchDailySummaries(); }
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Sub-Components
// ============================================

function DayRowGroup({ children }) {
  return <>{children}</>;
}

function SummaryCard({ label, value, icon, color }) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400'
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{label}</span>
      </div>
      <p className={`text-xl font-bold ${
        color === 'red' ? 'text-red-500' : color === 'green' ? 'text-green-500' : 'text-gray-900 dark:text-white'
      }`}>
        {value}
      </p>
    </div>
  );
}

function BalanceDetail({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-semibold ${
        value === 0 || value === null || value === undefined
          ? 'text-gray-400'
          : value > 0 ? 'text-green-500' : 'text-red-500'
      }`}>
        {formatMinutes(value)}
      </p>
    </div>
  );
}

function AdjustmentModal({ userId, year, month, monthName, onClose }) {
  const [minutes, setMinutes] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!minutes || !reason.trim()) return;
    setSaving(true);
    try {
      await axios.post(`/api/time-tracking/balances/user/${userId}/adjustment`, {
        year, month,
        adjustment_minutes: parseInt(minutes),
        reason: reason.trim()
      });
      onClose(true);
    } catch (err) {
      console.error('Fehler bei Anpassung:', err);
      alert(err.response?.data?.error || 'Fehler beim Speichern');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => onClose(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Saldo-Anpassung – {monthName} {year}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minuten (positiv = Gutschrift, negativ = Abzug)
            </label>
            <input
              type="number"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. 30 oder -60"
            />
            {minutes && (
              <p className="mt-1 text-xs text-gray-500">
                = {formatMinutes(parseInt(minutes) || 0)} Stunden
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Begründung *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Grund der Anpassung..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!minutes || !reason.trim() || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichern...' : 'Anpassung speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutModal({ userId, year, month, monthName, currentBalance, onClose }) {
  const [minutes, setMinutes] = useState('');
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!minutes || parseInt(minutes) <= 0) return;
    setSaving(true);
    try {
      await axios.post(`/api/time-tracking/balances/user/${userId}/payout`, {
        year, month,
        payout_minutes: parseInt(minutes),
        payout_date: payoutDate
      });
      onClose(true);
    } catch (err) {
      console.error('Fehler bei Auszahlung:', err);
      alert(err.response?.data?.error || 'Fehler beim Speichern');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => onClose(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Überstunden-Auszahlung – {monthName} {year}
        </h3>

        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-500">Aktueller Gesamtsaldo:</p>
          <p className={`text-lg font-bold ${currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {formatMinutes(currentBalance)}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Auszahlung in Minuten
            </label>
            <input
              type="number"
              min="1"
              value={minutes}
              onChange={e => setMinutes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="z.B. 480 (= 8 Stunden)"
            />
            {minutes && parseInt(minutes) > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                = {formatMinutes(parseInt(minutes))} Stunden werden vom Saldo abgezogen
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Auszahlungsdatum
            </label>
            <input
              type="date"
              value={payoutDate}
              onChange={e => setPayoutDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={!minutes || parseInt(minutes) <= 0 || saving}
            className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichern...' : 'Auszahlung erfassen'}
          </button>
        </div>
      </div>
    </div>
  );
}
