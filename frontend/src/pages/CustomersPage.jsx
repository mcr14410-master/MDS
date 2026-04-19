import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomersStore } from '../stores/customersStore';
import { useAuthStore } from '../stores/authStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { toast } from '../components/Toaster';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import Pagination from '../components/Pagination';

const SORT_OPTIONS = [
  { value: 'name|asc', label: 'Name (A-Z)' },
  { value: 'name|desc', label: 'Name (Z-A)' },
  { value: 'customer_number|asc', label: 'Kundennummer ↑' },
  { value: 'customer_number|desc', label: 'Kundennummer ↓' },
  { value: 'contact_person|asc', label: 'Ansprechpartner (A-Z)' },
  { value: 'contact_person|desc', label: 'Ansprechpartner (Z-A)' },
  { value: 'created_at|desc', label: 'Neueste zuerst' },
  { value: 'created_at|asc', label: 'Älteste zuerst' },
];

export default function CustomersPage() {
  const { customers, total, stats, loading, error, fetchCustomers, fetchStats, deleteCustomer } = useCustomersStore();
  const { hasPermission } = useAuthStore();
  const { getViewMode, setViewMode, getPageSize, setPageSize } = usePreferencesStore();

  const viewMode = getViewMode('customers');
  const pageSize = getPageSize('customers');

  const [filters, setFilters] = useState({
    search: '',
    is_active: 'true',
    sort_by: 'name',
    sort_order: 'asc',
  });
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Live-Fetch mit Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers({ ...filters, page, page_size: pageSize });
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchCustomers, filters, page, pageSize]);

  // Stats einmal laden + refresh nach Mutationen
  useEffect(() => {
    fetchStats().catch(() => {});
  }, [fetchStats]);

  // Bei Filter-Aenderung zurueck auf Seite 1
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      is_active: 'true',
      sort_by: 'name',
      sort_order: 'asc',
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.is_active !== 'true' ||
    filters.sort_by !== 'name' ||
    filters.sort_order !== 'asc';

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCustomer(deleteConfirm.id, false);
      toast.success(`Kunde "${deleteConfirm.name}" wurde deaktiviert`);
      setDeleteConfirm(null);
      fetchCustomers({ ...filters, page, page_size: pageSize });
      fetchStats().catch(() => {});
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const handleModalClose = (success) => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    if (success) {
      fetchCustomers({ ...filters, page, page_size: pageSize });
      fetchStats().catch(() => {});
    }
  };

  const sortValue = `${filters.sort_by}|${filters.sort_order}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kunden</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Verwalten Sie Ihre Kunden und deren Bauteile
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode('customers', 'grid')}
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
              onClick={() => setViewMode('customers', 'table')}
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
            <button
              onClick={handleCreateNew}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Neuer Kunde
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Gesamt"
          value={stats?.total ?? 0}
          color="blue"
          active={filters.is_active === ''}
          onClick={() => setFilters((f) => ({ ...f, is_active: '' }))}
        />
        <StatsCard
          label="Aktiv"
          value={stats?.active ?? 0}
          color="green"
          active={filters.is_active === 'true'}
          onClick={() => setFilters((f) => ({ ...f, is_active: 'true' }))}
        />
        <StatsCard
          label="Inaktiv"
          value={stats?.inactive ?? 0}
          color="gray"
          active={filters.is_active === 'false'}
          onClick={() => setFilters((f) => ({ ...f, is_active: 'false' }))}
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
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
              placeholder="Suche nach Name, Kundennummer, Ansprechpartner, E-Mail..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="true">Nur aktive</option>
              <option value="false">Nur inaktive</option>
              <option value="">Alle anzeigen</option>
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

        {hasActiveFilters && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
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
      {!loading && customers.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Kunden gefunden</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {hasActiveFilters ? 'Keine Kunden mit diesen Filtern.' : 'Legen Sie den ersten Kunden an.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && customers.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onEdit={() => handleEdit(customer)}
                  onDelete={() => setDeleteConfirm(customer)}
                  canEdit={hasPermission('part.update')}
                  canDelete={hasPermission('part.delete')}
                />
              ))}
            </div>
          ) : (
            <CustomersTable
              customers={customers}
              onEdit={handleEdit}
              onDelete={setDeleteConfirm}
              canEdit={hasPermission('part.update')}
              canDelete={hasPermission('part.delete')}
            />
          )}

          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize('customers', size); setPage(1); }}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <CustomerFormModal customer={editingCustomer} onClose={handleModalClose} />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Kunde deaktivieren?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Der Kunde <strong>{deleteConfirm.name}</strong> wird deaktiviert. Die Daten bleiben erhalten und können später wieder aktiviert werden.
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
                Deaktivieren
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
    blue: {
      ring: 'ring-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      ring: 'ring-green-500',
      text: 'text-green-600 dark:text-green-400',
    },
    gray: {
      ring: 'ring-gray-500',
      text: 'text-gray-600 dark:text-gray-400',
    },
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
// CUSTOMER CARD (Grid-View)
// ============================================================================
function CustomerCard({ customer, onEdit, onDelete, canEdit, canDelete }) {
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${!customer.is_active ? 'opacity-60' : ''}`}>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <Link
              to={`/customers/${customer.id}`}
              className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block"
            >
              {customer.name}
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {customer.customer_number}
            </p>
          </div>
          {!customer.is_active && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
              Inaktiv
            </span>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {customer.contact_person && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="truncate">{customer.contact_person}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <a href={`mailto:${customer.email}`} className="truncate hover:text-blue-600 dark:hover:text-blue-400">
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <a href={`tel:${customer.phone}`} className="truncate hover:text-blue-600 dark:hover:text-blue-400">
                {customer.phone}
              </a>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="font-semibold text-gray-900 dark:text-white">{customer.part_count || 0}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Bauteile</span>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                  title="Bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              {canDelete && customer.is_active && (
                <button
                  onClick={onDelete}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Deaktivieren"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TABLE VIEW
// ============================================================================
function CustomersTable({ customers, onEdit, onDelete, canEdit, canDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[35%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[15%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kunde</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kontakt</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bauteile</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  !customer.is_active ? 'opacity-60' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="block truncate font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    {customer.name}
                  </Link>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {customer.customer_number || '-'}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="truncate">{customer.contact_person || '-'}</div>
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {customer.email || customer.phone || ''}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 font-medium">
                  {customer.part_count || 0}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      customer.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {customer.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1">
                    {canEdit && (
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                        title="Bearbeiten"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {canDelete && customer.is_active && (
                      <button
                        onClick={() => onDelete(customer)}
                        className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                        title="Deaktivieren"
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
