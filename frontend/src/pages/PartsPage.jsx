// frontend/src/pages/PartsPage.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePartsStore } from '../stores/partsStore';
import { useCustomersStore } from '../stores/customersStore';
import { useAuthStore } from '../stores/authStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { toast } from '../components/Toaster';
import Pagination from '../components/Pagination';

const STATUS_LABELS = {
  draft: 'Entwurf',
  active: 'Aktiv',
  inactive: 'Inaktiv',
  obsolete: 'Veraltet'
};

const STATUS_COLORS = {
  active:   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  draft:    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  obsolete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const getStatusLabel = (s) => STATUS_LABELS[s] || s;
const getStatusColor = (s) => STATUS_COLORS[s] || STATUS_COLORS.inactive;

const SORT_OPTIONS = [
  { value: 'created_at|desc', label: 'Neueste zuerst' },
  { value: 'created_at|asc',  label: 'Älteste zuerst' },
  { value: 'updated_at|desc', label: 'Zuletzt geändert' },
  { value: 'part_number|asc', label: 'Teilenummer (A-Z)' },
  { value: 'part_number|desc', label: 'Teilenummer (Z-A)' },
  { value: 'part_name|asc',   label: 'Bezeichnung (A-Z)' },
  { value: 'part_name|desc',  label: 'Bezeichnung (Z-A)' },
  { value: 'customer_name|asc', label: 'Kunde (A-Z)' },
  { value: 'customer_name|desc', label: 'Kunde (Z-A)' },
];

export default function PartsPage() {
  const { parts, total, stats, loading, error, fetchParts, fetchStats, deletePart } = usePartsStore();
  const { customers, fetchCustomers } = useCustomersStore();
  const { hasPermission } = useAuthStore();
  const { getViewMode, setViewMode, getPageSize, setPageSize, getSavedFilter, setSavedFilter } = usePreferencesStore();
  const [searchParams] = useSearchParams();

  const viewMode = getViewMode('parts');
  const pageSize = getPageSize('parts');

  // URL-Parameter hat Vorrang, dann persistierter Filter, sonst leer
  const initialCustomerId = searchParams.get('customer_id') || getSavedFilter('parts', 'customer_id') || '';

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    customer_id: initialCustomerId,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Kunden + Stats einmal initial
  useEffect(() => {
    fetchCustomers({ is_active: 'true' });
    fetchStats().catch(() => {});
  }, [fetchCustomers, fetchStats]);

  // Live-Fetch mit Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchParts({ ...filters, page, page_size: pageSize });
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchParts, filters, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleCustomerChange = (value) => {
    setFilters({ ...filters, customer_id: value });
    setSavedFilter('parts', 'customer_id', value);
  };

  // Reset nur fuer Zeile 2 (Kundenfilter bleibt erhalten und persistiert)
  const handleResetRowFilters = () => {
    setFilters({
      ...filters,
      search: '',
      status: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
  };

  const hasRowFilters =
    filters.search ||
    filters.status ||
    filters.sort_by !== 'created_at' ||
    filters.sort_order !== 'desc';

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deletePart(deleteConfirm.id);
      toast.success(`Bauteil ${deleteConfirm.part_number} gelöscht`);
      setDeleteConfirm(null);
      fetchParts({ ...filters, page, page_size: pageSize });
      fetchStats().catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
      setDeleteConfirm(null);
    }
  };

  const sortValue = `${filters.sort_by}|${filters.sort_order}`;

  // Stats helper (backend liefert strings)
  const statTotal = parseInt(stats?.total_parts, 10) || 0;
  const statDraft = parseInt(stats?.draft_parts, 10) || 0;
  const statActive = parseInt(stats?.active_parts, 10) || 0;
  const statOther = (parseInt(stats?.inactive_parts, 10) || 0) + (parseInt(stats?.obsolete_parts, 10) || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bauteile</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Bauteile und deren Revisionen
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('parts', 'grid')}
              className={`px-3 py-2 text-sm transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title="Grid-Ansicht"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('parts', 'table')}
              className={`px-3 py-2 text-sm transition-colors border-l border-gray-300 dark:border-gray-600 ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
              title="Tabellen-Ansicht"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {hasPermission('part.create') && (
            <Link
              to="/parts/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neues Bauteil
            </Link>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard
          label="Gesamt"
          value={statTotal}
          color="blue"
          active={filters.status === ''}
          onClick={() => setFilters((f) => ({ ...f, status: '' }))}
        />
        <StatsCard
          label="Entwurf"
          value={statDraft}
          color="yellow"
          active={filters.status === 'draft'}
          onClick={() => setFilters((f) => ({ ...f, status: 'draft' }))}
        />
        <StatsCard
          label="Aktiv"
          value={statActive}
          color="green"
          active={filters.status === 'active'}
          onClick={() => setFilters((f) => ({ ...f, status: 'active' }))}
        />
        <StatsCard
          label="Inaktiv / Veraltet"
          value={statOther}
          color="gray"
          active={filters.status === 'inactive' || filters.status === 'obsolete'}
          onClick={() => setFilters((f) => ({
            ...f,
            status: f.status === 'inactive' ? 'obsolete' : 'inactive'
          }))}
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-4">
        {/* Zeile 1: Kundenfilter (gespeichert) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
            Kunde <span className="text-gray-400 dark:text-gray-500 font-normal">(gespeichert)</span>
          </label>
          <select
            value={filters.customer_id}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full md:w-2/3 lg:w-1/2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Kunden</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.customer_number ? ` (${c.customer_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Zeile 2: Suche + Status + Sortierung */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.15z" />
            </svg>
            <input
              type="text"
              placeholder="Suche nach Teilenummer, Bezeichnung, Beschreibung... (ESC zum Löschen)"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setFilters({ ...filters, search: '' });
                }
              }}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                title="Suche löschen"
                aria-label="Suche löschen"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle Status</option>
              <option value="draft">Entwurf</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="obsolete">Veraltet</option>
            </select>
          </div>

          <div>
            <select
              value={sortValue}
              onChange={(e) => {
                const [sort_by, sort_order] = e.target.value.split('|');
                setFilters({ ...filters, sort_by, sort_order });
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Sortierung"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasRowFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleResetRowFilters}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              title="Suche, Status und Sortierung zurücksetzen (Kundenfilter bleibt erhalten)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty */}
      {!loading && parts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Bauteile gefunden</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {(hasRowFilters || filters.customer_id) ? 'Keine Bauteile mit diesen Filtern.' : 'Erstellen Sie Ihr erstes Bauteil.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && parts.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {parts.map((part) => (
                <PartCard
                  key={part.id}
                  part={part}
                  canEdit={hasPermission('part.update')}
                  canDelete={hasPermission('part.delete')}
                  onDelete={() => setDeleteConfirm(part)}
                />
              ))}
            </div>
          ) : (
            <PartsTable
              parts={parts}
              canEdit={hasPermission('part.update')}
              canDelete={hasPermission('part.delete')}
              onDelete={(part) => setDeleteConfirm(part)}
            />
          )}

          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize('parts', size); setPage(1); }}
          />
        </>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Bauteil löschen?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Das Bauteil <strong>{deleteConfirm.part_number}</strong>
              {deleteConfirm.part_name && <> ({deleteConfirm.part_name})</>} wird gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STATS CARD
// ============================================================================
function StatsCard({ label, value, color, active, onClick }) {
  const colorMap = {
    blue:   { ring: 'ring-blue-500',   text: 'text-blue-600 dark:text-blue-400' },
    green:  { ring: 'ring-green-500',  text: 'text-green-600 dark:text-green-400' },
    yellow: { ring: 'ring-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
    gray:   { ring: 'ring-gray-500',   text: 'text-gray-600 dark:text-gray-400' },
  };
  const c = colorMap[color] || colorMap.gray;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white dark:bg-gray-800 shadow rounded-lg p-4 transition-all hover:shadow-md focus:outline-none ${
        active ? `ring-2 ${c.ring}` : 'ring-1 ring-transparent'
      }`}
    >
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${c.text}`}>{value}</div>
    </button>
  );
}

// ============================================================================
// PART CARD (Grid-View)
// ============================================================================
function PartCard({ part, canEdit, canDelete, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <Link
              to={`/parts/${part.id}`}
              className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate block"
            >
              {part.part_number}
            </Link>
            {part.part_name && (
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">
                {part.part_name}
              </p>
            )}
          </div>
          <span className={`flex-shrink-0 px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(part.status)}`}>
            {getStatusLabel(part.status)}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {part.customer_name && (
            <div className="text-gray-600 dark:text-gray-300 truncate">
              <span className="text-gray-500 dark:text-gray-400">Kunde:</span>{' '}
              <Link to={`/customers/${part.customer_id}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {part.customer_name}
              </Link>
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Revision:</span>{' '}
            <span className="font-mono">{part.revision || 'A'}</span>
          </div>
          {part.material && (
            <div className="text-gray-600 dark:text-gray-300 truncate">
              <span className="text-gray-500 dark:text-gray-400">Material:</span> {part.material}
            </div>
          )}
          <div className="text-gray-600 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Operationen:</span> {part.operation_count || 0}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-1">
        <Link
          to={`/parts/${part.id}`}
          className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Ansehen"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </Link>
        {canEdit && (
          <Link
            to={`/parts/${part.id}/edit`}
            className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
            title="Bearbeiten"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Link>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            title="Löschen"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PARTS TABLE
// ============================================================================
function PartsTable({ parts, canEdit, canDelete, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[18%]" />
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teilenummer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bezeichnung</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kunde</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rev.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {parts.map((part) => (
              <tr
                key={part.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <td className="px-4 py-3 truncate">
                  <Link
                    to={`/parts/${part.id}`}
                    className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {part.part_number}
                  </Link>
                </td>
                <td className="px-4 py-3 truncate text-sm text-gray-900 dark:text-gray-100">
                  {part.part_name || '-'}
                </td>
                <td className="px-4 py-3 truncate text-sm">
                  {part.customer_name ? (
                    <Link
                      to={`/customers/${part.customer_id}`}
                      className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {part.customer_name}
                    </Link>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">-</span>
                  )}
                </td>
                <td className="px-4 py-3 truncate text-sm font-mono text-gray-900 dark:text-gray-100">
                  {part.revision || 'A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${getStatusColor(part.status)}`}>
                    {getStatusLabel(part.status)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/parts/${part.id}`}
                      className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="Ansehen"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </Link>
                    {canEdit && (
                      <Link
                        to={`/parts/${part.id}/edit`}
                        className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(part)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        title="Löschen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
