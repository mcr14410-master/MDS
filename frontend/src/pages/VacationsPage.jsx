import { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axios';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Settings, 
  Sun, AlertTriangle, User
} from 'lucide-react';
import { useVacationsStore } from '../stores/vacationsStore';
import { useUsersStore } from '../stores/usersStore';
import { useAuthStore } from '../stores/authStore';
import VacationCalendar from '../components/vacations/VacationCalendar';
import VacationFormModal from '../components/vacations/VacationFormModal';
import VacationSettingsModal from '../components/vacations/VacationSettingsModal';
import VacationBalanceCard from '../components/vacations/VacationBalanceCard';
import EntitlementEditModal from '../components/vacations/EntitlementEditModal';

const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function VacationsPage() {
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
    clearError
  } = useVacationsStore();

  const { users, fetchUsers } = useUsersStore();
  const { user, hasPermission } = useAuthStore();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [userFilter, setUserFilter] = useState('');
  
  // Year selector for "Mein Urlaub"
  const currentYear = new Date().getFullYear();
  const [myVacationYear, setMyVacationYear] = useState(currentYear);
  const [myVacations, setMyVacations] = useState([]);
  const [myBalance, setMyBalance] = useState(null);
  
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

  // Fetch my balance and vacations when myVacationYear changes
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
  }, [myVacationYear, user]);

  // Handle vacation click in calendar
  const handleVacationClick = (vacation) => {
    setEditingVacation(vacation);
    setShowFormModal(true);
  };

  // Handle new vacation
  const handleNewVacation = (date = null) => {
    setEditingVacation(date ? { start_date: date, end_date: date } : null);
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
  };

  // Filter balances by search (for all employees section)
  const filteredBalances = balances.filter(b => 
    !userFilter || 
    b.display_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
    b.username?.toLowerCase().includes(userFilter.toLowerCase())
  );

  // Check permission for viewing all balances
  const canManageVacations = hasPermission('vacations.manage');

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-7 w-7 text-green-600" />
            Urlaubsplanung
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Abwesenheiten verwalten und planen
          </p>
        </div>
        
        <div className="flex gap-2">
          {canManageVacations && (
            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 
                         hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 
                         dark:text-gray-300 dark:hover:bg-gray-700"
              title="Einstellungen"
            >
              <Settings className="h-5 w-5" />
            </button>
          )}
          
          <button
            onClick={() => handleNewVacation()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                       rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Abwesenheit eintragen
          </button>
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

      {/* Navigation & View Toggle */}
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
            onVacationClick={handleVacationClick}
            onDayClick={handleNewVacation}
          />
        )}
      </div>

      {/* Mein Urlaub */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            Mein Urlaub
          </h3>
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

        {/* My Vacations List */}
        {Array.isArray(myVacations) && myVacations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Meine Abwesenheiten {myVacationYear}
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {myVacations.map(v => (
                <div 
                  key={v.id}
                  onClick={() => handleVacationClick(v)}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 
                             rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: v.type_color }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {v.type_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(v.start_date).toLocaleDateString('de-DE')}
                    {v.start_date !== v.end_date && (
                      <> - {new Date(v.end_date).toLocaleDateString('de-DE')}</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Resturlaub aller Mitarbeiter (nur mit vacations.manage) */}
      {canManageVacations && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              Resturlaub {filters.year}
            </h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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

      {/* Form Modal */}
      {showFormModal && (
        <VacationFormModal
          vacation={editingVacation}
          vacationTypes={vacationTypes}
          users={users}
          onClose={handleCloseForm}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <VacationSettingsModal
          onClose={() => setShowSettingsModal(false)}
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
