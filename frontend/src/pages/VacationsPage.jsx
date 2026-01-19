import { useState, useEffect } from 'react';
import { 
  Calendar, ChevronLeft, ChevronRight, Plus, Settings, 
  Users, Sun, AlertTriangle, Filter
} from 'lucide-react';
import { useVacationsStore } from '../stores/vacationsStore';
import { useUsersStore } from '../stores/usersStore';
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

  const [showFormModal, setShowFormModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingVacation, setEditingVacation] = useState(null);
  const [editingEntitlement, setEditingEntitlement] = useState(null);
  const [showBalances, setShowBalances] = useState(true);
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    initialize();
    fetchUsers();
  }, []);

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

  // Close form modal
  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingVacation(null);
  };

  // Filter balances by search
  const filteredBalances = balances.filter(b => 
    !userFilter || 
    b.display_name?.toLowerCase().includes(userFilter.toLowerCase()) ||
    b.username?.toLowerCase().includes(userFilter.toLowerCase())
  );

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
          <button
            onClick={() => setShowBalances(!showBalances)}
            className={`p-2 rounded-lg border transition-colors ${
              showBalances 
                ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300'
                : 'bg-white border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
            }`}
            title="Resturlaub anzeigen"
          >
            <Users className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-lg border border-gray-300 bg-white text-gray-700 
                       hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 
                       dark:text-gray-300 dark:hover:bg-gray-700"
            title="Einstellungen"
          >
            <Settings className="h-5 w-5" />
          </button>
          
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

      {/* Main Content */}
      <div className={`grid gap-4 ${showBalances ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'}`}>
        {/* Calendar */}
        <div className={showBalances ? 'lg:col-span-3' : ''}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
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
        </div>

        {/* Balances Sidebar */}
        {showBalances && (
          <div className="lg:col-span-1">
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
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                             dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Balance List */}
              <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredBalances.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
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

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Abwesenheitstypen
                </h4>
                <div className="space-y-1">
                  {vacationTypes.filter(t => t.is_active).map(type => (
                    <div key={type.id} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="text-gray-600 dark:text-gray-400">{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
