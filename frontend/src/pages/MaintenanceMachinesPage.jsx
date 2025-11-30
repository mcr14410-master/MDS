import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMaintenanceStore } from '../stores/maintenanceStore';

function MaintenanceMachinesPage() {
  const { 
    machineStatus,
    loading,
    error,
    fetchMachineStatus
  } = useMaintenanceStore();
  
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Lade ALLE Maschinen einmal
  useEffect(() => {
    fetchMachineStatus();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
        return (
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      critical: 'Überfällig',
      warning: 'Heute fällig',
      ok: 'OK'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      critical: 'text-red-600 dark:text-red-400',
      warning: 'text-yellow-600 dark:text-yellow-400',
      ok: 'text-green-600 dark:text-green-400'
    };
    return colors[status] || 'text-gray-600';
  };

  // Filter und Suche
  const filteredMachines = machineStatus.filter(machine => {
    // Status-Filter
    if (statusFilter && machine.status !== statusFilter) {
      return false;
    }
    // Suchfilter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!machine.name.toLowerCase().includes(search) && 
          !machine.location?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  // Statistik - immer aus ALLEN Maschinen
  const criticalCount = machineStatus.filter(m => m.status === 'critical').length;
  const warningCount = machineStatus.filter(m => m.status === 'warning').length;
  const okCount = machineStatus.filter(m => m.status === 'ok').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Maschinen-Wartungsstatus
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Übersicht aller Maschinen und deren Wartungszustand
        </p>
      </div>

      {/* Statistik */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('')}
          className={`p-4 rounded-xl text-left transition-all ${!statusFilter ? 'ring-2 ring-blue-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{machineStatus.length}</div>
          <div className="text-sm text-gray-500">Alle Maschinen</div>
        </button>
        
        <button
          onClick={() => setStatusFilter('critical')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'critical' ? 'ring-2 ring-red-500' : ''} ${criticalCount > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-red-500/20`}
        >
          <div className={`text-2xl font-bold ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {criticalCount}
          </div>
          <div className="text-sm text-gray-500">Überfällig</div>
        </button>
        
        <button
          onClick={() => setStatusFilter('warning')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'warning' ? 'ring-2 ring-yellow-500' : ''} ${warningCount > 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-100 dark:bg-gray-800'} hover:bg-yellow-500/20`}
        >
          <div className={`text-2xl font-bold ${warningCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
            {warningCount}
          </div>
          <div className="text-sm text-gray-500">Heute fällig</div>
        </button>
        
        <button
          onClick={() => setStatusFilter('ok')}
          className={`p-4 rounded-xl text-left transition-all ${statusFilter === 'ok' ? 'ring-2 ring-green-500' : ''} bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700`}
        >
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{okCount}</div>
          <div className="text-sm text-gray-500">OK</div>
        </button>
      </div>

      {/* Suche */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Maschine suchen..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Maschinen-Liste */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400">
            Lade Maschinen...
          </div>
        ) : filteredMachines.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400">
            Keine Maschinen gefunden
          </div>
        ) : (
          filteredMachines.map(machine => (
            <div 
              key={machine.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${
                machine.status === 'critical' ? 'border-red-500' :
                machine.status === 'warning' ? 'border-yellow-500' : 'border-green-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(machine.status)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {machine.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {machine.location}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                  <div className="text-gray-500 dark:text-gray-400 text-xs">Betriebsstunden</div>
                  <div className="font-mono font-medium text-gray-900 dark:text-white">
                    {machine.current_operating_hours?.toLocaleString('de-DE') || '0'}h
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded p-2">
                  <div className="text-gray-500 dark:text-gray-400 text-xs">Wartungspläne</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {machine.total_maintenance_plans || 0}
                  </div>
                </div>
              </div>

              {/* Wartungs-Zähler */}
              <div className="mt-3 flex items-center gap-3 text-sm">
                {machine.overdue_count > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {machine.overdue_count} überfällig
                  </span>
                )}
                {machine.due_today_count > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                    {machine.due_today_count} heute
                  </span>
                )}
                {machine.due_week_count > 0 && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {machine.due_week_count} diese Woche
                  </span>
                )}
                {machine.overdue_count === 0 && machine.due_today_count === 0 && machine.due_week_count === 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    Alles OK
                  </span>
                )}
              </div>

              {/* Aktionen */}
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <span className={`text-sm font-medium ${getStatusColor(machine.status)}`}>
                  {getStatusLabel(machine.status)}
                </span>
                <div className="flex gap-4">
                  <Link
                    to={`/maintenance/machines/${machine.id}/stats`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Statistik →
                  </Link>
                  <Link
                    to={`/maintenance/plans?machine=${machine.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Pläne →
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MaintenanceMachinesPage;
