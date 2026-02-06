import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../utils/axios';
import { 
  Calendar, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, Settings, 
  Sun, AlertTriangle, User, Users, Send, Check, FileDown, FileText, Clock, BarChart3, Cog,
  UserCheck, UserX, AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';
import { useVacationsStore } from '../stores/vacationsStore';
import { useUsersStore } from '../stores/usersStore';
import { useAuthStore } from '../stores/authStore';
import { useTimeTrackingStore } from '../stores/timeTrackingStore';
import VacationCalendar from '../components/vacations/VacationCalendar';
import VacationFormModal from '../components/vacations/VacationFormModal';
import VacationSettingsPanel from '../components/vacations/VacationSettingsPanel';
import VacationBalanceCard from '../components/vacations/VacationBalanceCard';
import EntitlementEditModal from '../components/vacations/EntitlementEditModal';
import MyRequestsPanel from '../components/vacations/MyRequestsPanel';
import PendingRequestsPanel from '../components/vacations/PendingRequestsPanel';
import EmployeeSettingsPanel from '../components/vacations/EmployeeSettingsPanel';
import MyTimeTrackingPanel from '../components/timeTracking/MyTimeTrackingPanel';
import TimeTrackingAdminPanel from '../components/timeTracking/TimeTrackingAdminPanel';
import TimeTrackingSettingsPanel from '../components/timeTracking/TimeTrackingSettingsPanel';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function VacationsPage({ view: propView }) {
  const location = useLocation();
  
  // Determine active view from route or prop
  const activeView = useMemo(() => {
    if (propView) return propView;
    if (location.pathname === '/vacations/my') return 'my';
    if (location.pathname === '/vacations/admin') return 'admin';
    return 'calendar'; // default
  }, [propView, location.pathname]);

  const {
    calendarData,
    vacationTypes,
    balances,
    roleLimits,
    filters,
    loading,
    error,
    initialize,
    setFilters,
    setView,
    navigateMonth,
    navigateYear,
    clearError,
    fetchMyRequests,
    fetchPendingRequests
  } = useVacationsStore();

  const { users, fetchUsers } = useUsersStore();
  const { user, hasPermission } = useAuthStore();
  const { 
    presence, 
    missingEntries, 
    allBalances: timeBalances,
    fetchPresence, 
    fetchMissingEntries,
    fetchAllBalances: fetchTimeBalances
  } = useTimeTrackingStore();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [userFilter, setUserFilter] = useState('');
  
  // Tab states for different views
  const [myTab, setMyTab] = useState('vacation'); // vacation | timetracking
  const [adminTab, setAdminTab] = useState('overview'); // overview | vacation | timetracking | settings
  const [settingsSection, setSettingsSection] = useState('holidays'); // holidays | role-limits | request-types | entitlements
  const [settingsCategory, setSettingsCategory] = useState('vacation'); // vacation | timetracking
  // Year selector for "Mein Urlaub"
  const currentYear = new Date().getFullYear();
  const [myVacationYear, setMyVacationYear] = useState(currentYear);
  const [myVacations, setMyVacations] = useState([]);
  const [myBalance, setMyBalance] = useState(null);
  
  // Approval workflow state
  const [myRequests, setMyRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [expandedVacationId, setExpandedVacationId] = useState(null);
  
  // Permissions
  const canApprove = hasPermission('vacations.approve');
  const canManage = hasPermission('vacations.manage');
  
  // Dynamic year range
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  useEffect(() => {
    initialize();
    fetchUsers();
  }, []);

  // Fetch my balance, vacations and requests when myVacationYear changes
  useEffect(() => {
    if (!user) return;
    
    // Fetch my balance for the selected year
    axios.get(`/api/vacation-entitlements/balance/${user.id}?year=${myVacationYear}`)
      .then(response => {
        setMyBalance(response.data);
      })
      .catch(error => {
        console.error('Error fetching my balance:', error);
        // Create empty balance placeholder if not found
        setMyBalance({
          total_days: 0,
          carried_over: 0,
          available_days: 0,
          used_days: 0,
          remaining_days: 0,
          notFound: true
        });
      });
    
    // Fetch my vacations for the selected year
    axios.get(`/api/vacations?year=${myVacationYear}&user_id=${user.id}`)
      .then(response => {
        setMyVacations(Array.isArray(response.data) ? response.data : []);
      })
      .catch(error => {
        console.error('Error fetching my vacations:', error);
        setMyVacations([]);
      });
    
    // Fetch my requests (pending/rejected)
    fetchMyRequests(myVacationYear)
      .then(data => setMyRequests(data || []))
      .catch(() => setMyRequests([]));
  }, [myVacationYear, user]);

  // Fetch pending requests for approvers
  useEffect(() => {
    if (canApprove) {
      fetchPendingRequests()
        .then(data => setPendingRequests(data || []))
        .catch(() => setPendingRequests([]));
    }
  }, [canApprove]);

  // Fetch time tracking data for dashboard
  useEffect(() => {
    if (canManage && activeView === 'admin') {
      const now = new Date();
      fetchPresence();
      fetchMissingEntries();
      fetchTimeBalances(now.getFullYear(), now.getMonth() + 1);
    }
  }, [canManage, activeView]);

  // Refresh requests data
  const refreshRequests = async () => {
    if (user) {
      fetchMyRequests(myVacationYear)
        .then(data => setMyRequests(data || []))
        .catch(() => setMyRequests([]));
    }
    if (canApprove) {
      fetchPendingRequests()
        .then(data => setPendingRequests(data || []))
        .catch(() => setPendingRequests([]));
    }
  };

  // Export my year as PDF
  const handleExportMyYear = async () => {
    try {
      const response = await axios.get(`/api/vacations/export/my-year?year=${myVacationYear}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Urlaubsuebersicht_${myVacationYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Export all employees as PDF (for personnel)
  const handleExportAll = async () => {
    try {
      const response = await axios.get(`/api/vacations/export/all?year=${filters.year}`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Urlaubsuebersicht_Gesamt_${filters.year}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Export all payroll sheets as PDF
  const handleExportPayrollAll = async () => {
    try {
      const response = await axios.get(
        `/api/time-tracking/export/payroll-all`,
        {
          params: { year: filters.year, month: filters.month },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Lohnnachweise_${filters.year}-${String(filters.month).padStart(2, '0')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Handle vacation click in calendar
  const handleVacationClick = (vacation) => {
    if (!canManage) return; // Only managers can edit
    setEditingVacation(vacation);
    setShowFormModal(true);
  };

  // Handle new vacation (for managers)
  const handleNewVacation = (date = null) => {
    if (!canManage) return;
    setEditingVacation(date ? { start_date: date, end_date: date } : null);
    setShowFormModal(true);
  };

  // Handle vacation request (for self)
  const handleRequestVacation = () => {
    setEditingVacation({ 
      user_id: user.id,
      isRequest: true  // Flag to indicate this is a request
    });
    setShowFormModal(true);
  };

  // Close form modal and refresh data
  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingVacation(null);
    
    // Refresh my data
    if (user) {
      axios.get(`/api/vacation-entitlements/balance/${user.id}?year=${myVacationYear}`)
        .then(response => setMyBalance(response.data))
        .catch(error => console.error('Error refreshing my balance:', error));
      
      axios.get(`/api/vacations?year=${myVacationYear}&user_id=${user.id}`)
        .then(response => setMyVacations(Array.isArray(response.data) ? response.data : []))
        .catch(error => console.error('Error refreshing my vacations:', error));
    }
    
    // Refresh requests
    refreshRequests();
  };

  // Filter balances by search (for all employees section)
  const filteredBalances = balances.filter(b => 
    !userFilter || 
    b.display_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
    b.username?.toLowerCase().includes(userFilter.toLowerCase())
  );

  // View-specific titles and descriptions
  const viewConfig = {
    calendar: {
      title: 'Kalender',
      description: 'Abwesenheiten im Überblick'
    },
    my: {
      title: 'Mein Bereich',
      description: 'Meine Abwesenheiten und Anträge'
    },
    admin: {
      title: 'Verwaltung',
      description: 'Urlaubsansprüche und Genehmigungen verwalten'
    }
  };

  const currentViewConfig = viewConfig[activeView] || viewConfig.calendar;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-green-600" />
            Urlaub & Arbeitszeit - {currentViewConfig.title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {currentViewConfig.description}
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Request vacation - for all users (including managers for their own vacation) */}
          <button
            onClick={handleRequestVacation}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white 
                       rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="h-5 w-5" />
            Urlaub beantragen
          </button>
          
          {/* Create vacation - only for managers */}
          {canManage && (
            <button
              onClick={() => handleNewVacation()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                         rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Abwesenheit eintragen
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700 
                        dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 
                        flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error}
          </div>
          <button onClick={clearError} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Navigation & View Toggle + Calendar - nur bei Kalender-Ansicht */}
      {activeView === 'calendar' && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
            <div className="flex items-center justify-between">
              {/* Left: Navigation */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => filters.view === 'month' ? navigateMonth(-1) : navigateYear(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  <div className="min-w-[200px] text-center">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {filters.view === 'month' 
                        ? `${MONTHS[filters.month - 1]} ${filters.year}`
                        : filters.year
                      }
                    </h2>
                  </div>
                  
                  <button
                    onClick={() => filters.view === 'month' ? navigateMonth(1) : navigateYear(1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <button
                  onClick={() => setFilters({ 
                    year: new Date().getFullYear(), 
                    month: new Date().getMonth() + 1 
                  })}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg 
                             hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Heute
                </button>
              </div>

              {/* Right: View Toggle */}
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
                  <button
                    onClick={() => setView('month')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      filters.view === 'month'
                        ? 'bg-green-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Monat
                  </button>
                  <button
                    onClick={() => setView('year')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      filters.view === 'year'
                        ? 'bg-green-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    Jahr
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <VacationCalendar
                data={calendarData}
                view={filters.view}
                year={filters.year}
                month={filters.month}
                vacationTypes={vacationTypes}
                roleLimits={roleLimits}
                onVacationClick={canManage ? handleVacationClick : undefined}
                onDayClick={canManage ? handleNewVacation : undefined}
              />
            )}
          </div>
        </>
      )}

      {/* ============ MEIN BEREICH ============ */}
      {activeView === 'my' && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              <button
                onClick={() => setMyTab('vacation')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  myTab === 'vacation'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Urlaub
              </button>
              <button
                onClick={() => setMyTab('timetracking')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  myTab === 'timetracking'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Arbeitszeit
              </button>
            </nav>
          </div>

          {/* Tab: Urlaub */}
          {myTab === 'vacation' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Mein Urlaub (60%) */}
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-500" />
                    Mein Urlaub
                  </h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={myVacationYear}
                      onChange={(e) => setMyVacationYear(parseInt(e.target.value))}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-lg 
                                 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleExportMyYear}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 
                                 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      title="Als PDF exportieren"
                    >
                      <FileDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {myBalance ? (
            myBalance.notFound ? (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  ⚠️ Kein Urlaubsanspruch für {myVacationYear} gefunden. 
                  Bitte wenden Sie sich an die Personalabteilung.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {myBalance.total_days}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Anspruch</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {myBalance.carried_over > 0 ? `+${myBalance.carried_over}` : myBalance.carried_over}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Übertrag</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {myBalance.available_days}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Verfügbar</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {myBalance.used_days}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Genommen</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  myBalance.remaining_days < 0
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : myBalance.remaining_days < 5
                      ? 'bg-yellow-100 dark:bg-yellow-900/30'
                      : 'bg-green-100 dark:bg-green-900/30'
                }`}>
                  <div className={`text-2xl font-bold ${
                    myBalance.remaining_days < 0
                      ? 'text-red-600 dark:text-red-400'
                      : myBalance.remaining_days < 5
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-green-600 dark:text-green-400'
                  }`}>
                    {myBalance.remaining_days}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Rest</div>
                </div>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              Keine Urlaubsdaten für {myVacationYear}
            </p>
          )}

          {/* My Vacations List - only approved */}
          {Array.isArray(myVacations) && myVacations.filter(v => v.status === 'approved').length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meine Abwesenheiten {myVacationYear}
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myVacations.filter(v => v.status === 'approved').map(v => {
                  const isExpanded = expandedVacationId === v.id;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const endDate = new Date(v.end_date);
                  endDate.setHours(0, 0, 0, 0);
                  const isPast = endDate < today;
                  
                  return (
                    <div 
                      key={v.id}
                      className={`rounded-lg overflow-hidden border-l-4 ${
                        isPast 
                          ? 'border-l-gray-400 opacity-60 border border-gray-200 dark:border-gray-600' 
                          : 'border border-gray-200 dark:border-gray-600'
                      }`}
                      style={!isPast ? { borderLeftColor: v.type_color } : undefined}
                    >
                      {/* Header - always visible */}
                      <div 
                        onClick={() => setExpandedVacationId(isExpanded ? null : v.id)}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 
                                   cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="flex items-center gap-2">
                          {isPast && (
                            <Check className="h-4 w-4 text-green-500" />
                          )}
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: v.type_color }}
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {v.type_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(v.start_date).toLocaleDateString('de-DE')}
                            {v.start_date !== v.end_date && (
                              <> - {new Date(v.end_date).toLocaleDateString('de-DE')}</>
                            )}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Details - expandable */}
                      {isExpanded && (
                        <div className="px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600">
                          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            <p>
                              <span className="font-medium">Dauer:</span>{' '}
                              {v.calculated_days} Arbeitstag{v.calculated_days !== 1 ? 'e' : ''}
                              {v.calculated_hours && ` (${v.calculated_hours}h)`}
                            </p>
                            {v.note && (
                              <p>
                                <span className="font-medium">Notiz:</span> {v.note}
                              </p>
                            )}
                            {v.created_at && (
                              <p>
                                <span className="font-medium">Beantragt am:</span>{' '}
                                {new Date(v.created_at).toLocaleDateString('de-DE')}{' '}
                                {new Date(v.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {v.created_by_name && (
                              <p>
                                <span className="font-medium">Eingetragen von:</span> {v.created_by_name}
                              </p>
                            )}
                            {v.approved_at && (
                              <p>
                                <span className="font-medium">Genehmigt am:</span>{' '}
                                {new Date(v.approved_at).toLocaleDateString('de-DE')}{' '}
                                {new Date(v.approved_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {v.approved_by_name && (
                              <p>
                                <span className="font-medium">Genehmigt von:</span> {v.approved_by_name}
                              </p>
                            )}
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVacationClick(v);
                                }}
                                className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-xs"
                              >
                                Bearbeiten
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Meine Anträge (40%) */}
            <div className="lg:col-span-2">
              <MyRequestsPanel 
                requests={myRequests} 
                year={myVacationYear}
                onRefresh={refreshRequests}
              />
            </div>
          </div>
          )}

          {/* Tab: Arbeitszeit */}
          {myTab === 'timetracking' && (
            <MyTimeTrackingPanel />
          )}
        </div>
      )}

      {/* ============ VERWALTUNG ============ */}
      {activeView === 'admin' && (canManage || canApprove) && (
        <div className="space-y-4">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              <button
                onClick={() => setAdminTab('overview')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  adminTab === 'overview'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Übersicht
                </span>
              </button>
              <button
                onClick={() => setAdminTab('employees')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  adminTab === 'employees'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Mitarbeiter
                </span>
              </button>
              <button
                onClick={() => setAdminTab('vacation')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  adminTab === 'vacation'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Urlaub
              </button>
              <button
                onClick={() => setAdminTab('timetracking')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  adminTab === 'timetracking'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Arbeitszeit
              </button>
              <button
                onClick={() => setAdminTab('settings')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  adminTab === 'settings'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Cog className="h-4 w-4" />
                  Einstellungen
                </span>
              </button>
            </nav>
          </div>

          {/* Tab: Übersicht (Dashboard) */}
          {adminTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Linke Spalte: Urlaub */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sun className="h-5 w-5 text-yellow-500" />
                  Urlaub & Abwesenheit
                </h3>
                
                {/* Urlaub Karten */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Heute abwesend</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {calendarData.vacations?.filter(v => {
                        const today = new Date().toISOString().split('T')[0];
                        return v.start_date <= today && v.end_date >= today && v.status === 'approved';
                      }).length || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Offene Anträge</div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {pendingRequests.length}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resturlaub</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {balances.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0).toFixed(0)}d
                    </div>
                  </div>
                </div>

                {/* Offene Anträge Liste */}
                {canApprove && (
                  <PendingRequestsPanel 
                    requests={pendingRequests}
                    onRefresh={refreshRequests}
                    compact
                  />
                )}

                {/* Heute abwesend Liste */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">Heute abwesend</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      const absentToday = calendarData.vacations?.filter(v => 
                        v.start_date <= today && v.end_date >= today && v.status === 'approved'
                      ) || [];
                      
                      if (absentToday.length === 0) {
                        return (
                          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                            Niemand abwesend
                          </p>
                        );
                      }
                      
                      return absentToday.slice(0, 8).map(v => (
                        <div key={v.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{v.display_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {v.type_name}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Rechte Spalte: Zeiterfassung */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Zeiterfassung
                  </h3>
                  {canManage && (
                    <button
                      onClick={handleExportPayrollAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 
                                 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 
                                 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg border 
                                 border-blue-300 dark:border-blue-600 font-medium"
                      title="Lohnnachweise für alle Mitarbeiter als PDF exportieren"
                    >
                      <FileText className="h-4 w-4" />
                      Lohnnachweise
                    </button>
                  )}
                </div>
                
                {/* Zeit Karten */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Anwesend</div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {presence?.filter(p => p.status === 'present').length || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fehlend</div>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {missingEntries?.length || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Ø Monatssaldo</div>
                    <div className={`text-2xl font-bold ${
                      (timeBalances?.reduce((sum, b) => sum + (b.overtime_minutes || 0), 0) / (timeBalances?.length || 1)) >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {(() => {
                        const totalMinutes = timeBalances?.reduce((sum, b) => sum + (b.overtime_minutes || 0), 0) || 0;
                        const avgMinutes = timeBalances?.length ? Math.round(totalMinutes / timeBalances.length) : 0;
                        const sign = avgMinutes >= 0 ? '+' : '';
                        const hours = Math.floor(Math.abs(avgMinutes) / 60);
                        const mins = Math.abs(avgMinutes) % 60;
                        return `${sign}${avgMinutes < 0 ? '-' : ''}${hours}:${mins.toString().padStart(2, '0')}`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Fehlende Buchungen Liste */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Fehlende Buchungen
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {missingEntries?.length === 0 ? (
                      <p className="text-sm text-green-600 dark:text-green-400 text-center py-2">
                        ✓ Keine fehlenden Buchungen
                      </p>
                    ) : (
                      missingEntries?.slice(0, 8).map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-sm text-gray-700 dark:text-gray-300">{entry.name}</span>
                          <span className="text-xs text-red-500">
                            {entry.missing_entry_types?.map(type => 
                              type === 'clock_out' ? 'Gehen' :
                              type === 'break_end' ? 'Pausenende' :
                              type === 'break_short' ? 'Pause kurz' :
                              type === 'no_entries' ? 'Keine Buchung' : type
                            ).join(', ')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Anwesenheit Liste */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3 text-sm flex items-center justify-between">
                    <span>Aktuell anwesend</span>
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      {presence?.filter(p => p.status === 'present').length || 0} von {presence?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {presence?.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                        Keine Zeiterfassungsdaten
                      </p>
                    ) : (
                      presence?.filter(p => p.status === 'present').slice(0, 8).map(p => (
                        <div key={p.user_id} className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{p.full_name}</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            seit {p.clock_in_time?.slice(0,5) || '–'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Mitarbeiter */}
          {adminTab === 'employees' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <EmployeeSettingsPanel />
            </div>
          )}

          {/* Tab: Urlaub */}
          {adminTab === 'vacation' && (
            <div className="space-y-6">
              {/* Schnellübersicht */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Heute abwesend</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {calendarData.vacations?.filter(v => {
                      const today = new Date().toISOString().split('T')[0];
                      return v.start_date <= today && v.end_date >= today && v.status === 'approved';
                    }).length || 0}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Offene Anträge</div>
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                    {pendingRequests.length}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Mitarbeiter gesamt</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {balances.length}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Resturlaub gesamt</div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {balances.reduce((sum, b) => sum + parseFloat(b.remaining_days || 0), 0)} Tage
                  </div>
                </div>
              </div>

              {/* Resturlaub + Offene Anträge */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Resturlaub aller Mitarbeiter (60%) */}
                {canManage && (
                  <div className={`${canApprove ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white dark:bg-gray-800 rounded-lg shadow p-4`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Sun className="h-5 w-5 text-yellow-500" />
                        Resturlaub {filters.year}
                      </h3>
                      <button
                        onClick={handleExportAll}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 
                                   hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 
                                   hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border 
                                   border-gray-300 dark:border-gray-600"
                        title="Gesamtübersicht als PDF exportieren"
                      >
                        <FileDown className="h-4 w-4" />
                        Export
                      </button>
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Mitarbeiter suchen..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 rounded-lg 
                                   dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    {/* Balance Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3">
                      {filteredBalances.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 col-span-full text-center py-4">
                          Keine Urlaubsansprüche für {filters.year}
                        </p>
                      ) : (
                        filteredBalances.map((balance, index) => (
                          <VacationBalanceCard 
                            key={`${balance.user_id}-${index}`} 
                            balance={balance} 
                            onClick={() => setEditingEntitlement(balance)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Offene Anträge (40%) */}
                {canApprove && (
                  <div className={`${canManage ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
                    <PendingRequestsPanel 
                      requests={pendingRequests}
                      onRefresh={refreshRequests}
                    />
                  </div>
                )}
              </div>

              {/* Platzhalter für zukünftige Funktionen */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-1">
                    Erweiterte Funktionen
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-3">
                    Berichte, Auswertungen und erweiterte Urlaubsverwaltung.
                  </p>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 
                                  text-blue-700 dark:text-blue-300 rounded-lg text-xs">
                    <span>🚧</span>
                    <span>In Entwicklung</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Arbeitszeit */}
          {adminTab === 'timetracking' && (
            <TimeTrackingAdminPanel />
          )}

          {/* Tab: Einstellungen */}
          {adminTab === 'settings' && (
            <div className="space-y-4">
              {/* Sub-Tabs für Urlaub/Zeiterfassung */}
              <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setSettingsCategory('vacation')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    settingsCategory === 'vacation'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Sun className="h-4 w-4 inline-block mr-2" />
                  Urlaub
                </button>
                <button
                  onClick={() => setSettingsCategory('timetracking')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    settingsCategory === 'timetracking'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Clock className="h-4 w-4 inline-block mr-2" />
                  Zeiterfassung
                </button>
              </div>

              {/* Urlaub-Einstellungen */}
              {settingsCategory === 'vacation' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <VacationSettingsPanel 
                    activeSection={settingsSection}
                    onSectionChange={setSettingsSection}
                  />
                </div>
              )}

              {/* Zeiterfassungs-Einstellungen */}
              {settingsCategory === 'timetracking' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <TimeTrackingSettingsPanel />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <VacationFormModal
          vacation={editingVacation}
          vacationTypes={vacationTypes}
          users={users}
          onClose={handleCloseForm}
        />
      )}

      {/* Entitlement Edit Modal */}
      {editingEntitlement && (
        <EntitlementEditModal
          balance={editingEntitlement}
          year={filters.year}
          onClose={() => setEditingEntitlement(null)}
        />
      )}
    </div>
  );
}
