import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Settings, 
  Plus, 
  Search, 
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Calendar,
  Gauge,
  Users,
  Trash2,
  Edit,
  MoreVertical
} from 'lucide-react';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useMachinesStore } from '../stores/machinesStore';

export default function MaintenancePlansPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMachineId = searchParams.get('machine') || '';
  
  const { 
    plans, 
    maintenanceTypes,
    loading, 
    error,
    fetchPlans,
    fetchMaintenanceTypes,
    deletePlan,
    clearError 
  } = useMaintenanceStore();

  const { machines, fetchMachines } = useMachinesStore();

  const [filters, setFilters] = useState({
    machine_id: initialMachineId,
    maintenance_type_id: '',
    is_active: 'true',
    skill_level: '',
    is_shift_critical: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(!!initialMachineId); // Filter automatisch öffnen wenn Maschine vorausgewählt
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    fetchPlans(filters);
    fetchMaintenanceTypes();
    fetchMachines();
  }, []);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchPlans(newFilters);
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    // Debounced search
    const timeoutId = setTimeout(() => {
      fetchPlans({ ...filters, search: value });
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const handleDelete = async (id, hardDelete = false) => {
    try {
      await deletePlan(id, hardDelete);
      setDeleteConfirm(null);
      fetchPlans(filters);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'overdue':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-500 text-white">Überfällig</span>;
      case 'due_today':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500 text-white">Heute fällig</span>;
      case 'due_soon':
        return <span className="px-2 py-1 text-xs rounded-full bg-orange-500 text-white">Bald fällig</span>;
      case 'ok':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-500 text-white">OK</span>;
      default:
        return null;
    }
  };

  const getSkillLevelBadge = (level) => {
    const levels = {
      helper: { label: 'Helfer', color: 'bg-green-500/10 text-green-600' },
      operator: { label: 'Bediener', color: 'bg-blue-500/10 text-blue-600' },
      technician: { label: 'Techniker', color: 'bg-orange-500/10 text-orange-600' },
      specialist: { label: 'Spezialist', color: 'bg-red-500/10 text-red-600' }
    };
    const config = levels[level] || levels.operator;
    return <span className={`px-2 py-1 text-xs rounded-full ${config.color}`}>{config.label}</span>;
  };

  const getIntervalText = (plan) => {
    if (plan.interval_hours) {
      return `Alle ${plan.interval_hours}h`;
    }
    if (plan.interval_type && plan.interval_value) {
      const types = {
        hours: 'Stunden',
        days: 'Tage',
        weeks: 'Wochen',
        months: 'Monate',
        years: 'Jahre'
      };
      return `Alle ${plan.interval_value} ${types[plan.interval_type] || plan.interval_type}`;
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="w-7 h-7" />
            Wartungspläne
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {plans.length} Wartungspläne gefunden
          </p>
        </div>
        <Link
          to="/maintenance/plans/new"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Neuer Plan
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suche nach Titel oder Beschreibung..."
              value={filters.search}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${
              showFilters 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Maschine */}
            <select
              value={filters.machine_id}
              onChange={(e) => handleFilterChange('machine_id', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Alle Maschinen</option>
              {machines.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>

            {/* Wartungstyp */}
            <select
              value={filters.maintenance_type_id}
              onChange={(e) => handleFilterChange('maintenance_type_id', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Alle Typen</option>
              {maintenanceTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            {/* Skill-Level */}
            <select
              value={filters.skill_level}
              onChange={(e) => handleFilterChange('skill_level', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Alle Skill-Level</option>
              <option value="helper">Helfer</option>
              <option value="operator">Bediener</option>
              <option value="technician">Techniker</option>
              <option value="specialist">Spezialist</option>
            </select>

            {/* Status */}
            <select
              value={filters.is_active}
              onChange={(e) => handleFilterChange('is_active', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Alle</option>
              <option value="true">Nur aktive</option>
              <option value="false">Nur inaktive</option>
            </select>

            {/* Schicht-kritisch */}
            <select
              value={filters.is_shift_critical}
              onChange={(e) => handleFilterChange('is_shift_critical', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Alle</option>
              <option value="true">Schicht-kritisch</option>
              <option value="false">Normal</option>
            </select>
          </div>
        )}
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Keine Wartungspläne gefunden
          </h3>
          <p className="text-gray-500 mb-4">
            Erstellen Sie einen neuen Wartungsplan oder passen Sie die Filter an.
          </p>
          <Link
            to="/maintenance/plans/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Neuer Plan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${
                !plan.is_active 
                  ? 'border-gray-300 dark:border-gray-600 opacity-60' 
                  : plan.status === 'overdue'
                    ? 'border-red-300 dark:border-red-700'
                    : plan.status === 'due_today'
                      ? 'border-yellow-300 dark:border-yellow-700'
                      : 'border-gray-200 dark:border-gray-700'
              } hover:shadow-md transition-shadow`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <Link to={`/maintenance/plans/${plan.id}`} className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${plan.maintenance_type_color}20`, color: plan.maintenance_type_color }}
                      >
                        <Settings className="w-6 h-6" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {plan.title}
                          </h3>
                          {getStatusBadge(plan.status)}
                          {plan.is_shift_critical && (
                            <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-white">
                              Schicht-kritisch
                            </span>
                          )}
                          {!plan.is_active && (
                            <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">
                              Inaktiv
                            </span>
                          )}
                        </div>

                        <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {plan.description || 'Keine Beschreibung'}
                        </p>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Gauge className="w-4 h-4" />
                            {plan.machine_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {getIntervalText(plan)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {plan.estimated_duration_minutes ? `~${plan.estimated_duration_minutes} Min.` : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {getSkillLevelBadge(plan.required_skill_level)}
                          </span>
                          {plan.checklist_count > 0 && (
                            <span className="text-gray-400">
                              {plan.checklist_count} Checklist-Items
                            </span>
                          )}
                        </div>

                        {/* Zeitbasierte Pläne: Nächste & Letzte Fälligkeit */}
                        {plan.next_due_at && !plan.interval_hours && (
                          <div className="mt-2 text-sm space-y-1">
                            <div>
                              <span className="text-gray-500">Nächste Fälligkeit: </span>
                              <span className={
                                plan.status === 'overdue' ? 'text-red-600 font-medium' :
                                plan.status === 'due_today' ? 'text-yellow-600 font-medium' :
                                'text-gray-700 dark:text-gray-300'
                              }>
                                {new Date(plan.next_due_at).toLocaleDateString('de-DE', {
                                  weekday: 'short',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            {plan.last_completed_at && (
                              <div>
                                <span className="text-gray-500">Letzte Ausführung: </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {new Date(plan.last_completed_at).toLocaleDateString('de-DE', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Betriebsstundenbasierte Pläne */}
                        {plan.interval_hours && (
                          <div className="mt-2 text-sm space-y-1">
                            <div>
                              <span className="text-gray-500">Nächste Fälligkeit: </span>
                              <span className={
                                plan.current_operating_hours >= plan.next_due_hours ? 'text-red-600 font-medium' :
                                (plan.next_due_hours - plan.current_operating_hours) <= 50 ? 'text-yellow-600 font-medium' :
                                'text-gray-700 dark:text-gray-300'
                              }>
                                Bei {plan.next_due_hours?.toLocaleString('de-DE')}h
                                <span className="text-gray-500 ml-1">
                                  (aktuell: {plan.current_operating_hours?.toLocaleString('de-DE')}h)
                                </span>
                              </span>
                            </div>
                            {plan.last_completed_at && (
                              <div>
                                <span className="text-gray-500">Letzte Ausführung: </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {new Date(plan.last_completed_at).toLocaleDateString('de-DE', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Actions */}
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </button>

                    {openMenu === plan.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                        <Link
                          to={`/maintenance/plans/${plan.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setOpenMenu(null)}
                        >
                          <ChevronRight className="w-4 h-4" />
                          Details
                        </Link>
                        <Link
                          to={`/maintenance/plans/${plan.id}/edit`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Edit className="w-4 h-4" />
                          Bearbeiten
                        </Link>
                        <button
                          onClick={() => {
                            setDeleteConfirm(plan);
                            setOpenMenu(null);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Löschen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Wartungsplan löschen?
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Möchten Sie den Wartungsplan "{deleteConfirm.title}" wirklich löschen?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id, false)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Deaktivieren
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm.id, true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Endgültig löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setOpenMenu(null)}
        />
      )}
    </div>
  );
}
