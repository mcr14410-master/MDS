// frontend/src/pages/ProgramsOverviewPage.jsx
// Übersicht aller NC-Programme bzw. Messprogramme über alle Bauteile (Menü Fertigung).
// Anlegen, neue Versionen und Freigabe bleiben am Arbeitsgang – die Zeile springt dorthin.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgramsStore } from '../stores/programsStore';
import { usePreferencesStore } from '../stores/preferencesStore';
import { downloadFileViaApi } from '../utils/fileDownload';
import { toast } from '../components/Toaster';
import Pagination from '../components/Pagination';
import { WORKFLOW_STATUS_LABELS as STATUS_LABELS } from '../utils/workflowLabels';
import { cmmZipName } from '../utils/cmmPrograms';

const KIND_CONFIG = {
  nc: {
    title: 'NC-Programme',
    subtitle: 'Alle NC-Programme über alle Bauteile – anlegen und freigeben am Arbeitsgang',
    prefKey: 'ncPrograms',
    empty: 'Keine NC-Programme gefunden',
    downloadTitle: 'Programm herunterladen',
  },
  cmm: {
    title: 'Messprogramme',
    subtitle: 'PC-DMIS-Messprogramme (KMG) über alle Bauteile – anlegen und freigeben am Arbeitsgang',
    prefKey: 'cmmPrograms',
    empty: 'Keine Messprogramme gefunden',
    downloadTitle: 'Alle Dateien als ZIP herunterladen',
  },
};

const STATUS_COLORS = {
  draft:    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  review:   'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  released: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  archived: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const SORT_OPTIONS = [
  { value: 'updated_at|desc', label: 'Zuletzt geändert' },
  { value: 'created_at|desc', label: 'Neueste zuerst' },
  { value: 'created_at|asc', label: 'Älteste zuerst' },
  { value: 'part_number|asc', label: 'Bauteil (A-Z)' },
  { value: 'part_number|desc', label: 'Bauteil (Z-A)' },
  { value: 'operation_number|asc', label: 'Arbeitsgang (A-Z)' },
  { value: 'program_number|asc', label: 'Programmnummer (A-Z)' },
  { value: 'program_name|asc', label: 'Programmname (A-Z)' },
];

const DEFAULT_FILTERS = { search: '', status: '', sort_by: 'updated_at', sort_order: 'desc' };

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('de-DE') : '-');

// Direktsprung: Bauteil → Arbeitsgang aufklappen → Reiter „Programme“
const programLink = (p) => `/parts/${p.part_id}?op=${p.operation_id}`;

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 inline-flex text-xs font-semibold rounded-full ${STATUS_COLORS[status] || STATUS_COLORS.archived}`}>
      {STATUS_LABELS[status] || status || 'Unbekannt'}
    </span>
  );
}

export default function ProgramsOverviewPage({ kind }) {
  const config = KIND_CONFIG[kind];
  const {
    overviewPrograms: programs, overviewTotal: total, overviewStats: stats,
    overviewLoading: loading, overviewError: error, fetchProgramsOverview, fetchProgramStats,
  } = useProgramsStore();
  const { getViewMode, setViewMode, getPageSize, setPageSize } = usePreferencesStore();

  const viewMode = getViewMode(config.prefKey);
  const pageSize = getPageSize(config.prefKey);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);

  // Beim Wechsel NC ↔ Messprogramme Filter zurücksetzen
  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
    fetchProgramStats(kind).catch(() => {});
  }, [kind, fetchProgramStats]);

  // Live-Fetch mit Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProgramsOverview({ kind, ...filters, page, page_size: pageSize });
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchProgramsOverview, kind, filters, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const hasFilters =
    filters.search || filters.status ||
    filters.sort_by !== DEFAULT_FILTERS.sort_by || filters.sort_order !== DEFAULT_FILTERS.sort_order;

  const handleDownload = async (p) => {
    const result = kind === 'cmm'
      ? await downloadFileViaApi(`/api/programs/${p.id}/files/zip`, cmmZipName(p, p.version))
      // NC speichert nur den internen Ablagenamen (Zeitstempel-Zufallszahl-Name) → Präfix weglassen
      : await downloadFileViaApi(`/api/programs/${p.id}/download`, (p.filename || '').replace(/^\d+-\d+-/, ''));
    if (!result.success) toast.error(result.error);
  };

  const byState = stats?.by_state || {};
  const sortValue = `${filters.sort_by}|${filters.sort_order}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{config.title}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{config.subtitle}</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode(config.prefKey, 'grid')}
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
            onClick={() => setViewMode(config.prefKey, 'table')}
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard label="Gesamt" value={stats?.total || 0} color="blue"
          active={filters.status === ''} onClick={() => setFilters((f) => ({ ...f, status: '' }))} />
        <StatsCard label="Entwurf" value={byState.draft || 0} color="yellow"
          active={filters.status === 'draft'} onClick={() => setFilters((f) => ({ ...f, status: 'draft' }))} />
        <StatsCard label="In Prüfung" value={byState.review || 0} color="orange"
          active={filters.status === 'review'} onClick={() => setFilters((f) => ({ ...f, status: 'review' }))} />
        <StatsCard label="Freigegeben" value={byState.released || 0} color="green"
          active={filters.status === 'released'} onClick={() => setFilters((f) => ({ ...f, status: 'released' }))} />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.15z" />
            </svg>
            <input
              type="text"
              placeholder="Suche nach Bauteil, Arbeitsgang, Programm, Datei... (ESC zum Löschen)"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setFilters({ ...filters, search: '' });
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
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
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
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1"
              title="Suche, Status und Sortierung zurücksetzen"
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
      {!loading && !error && programs.length === 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{config.empty}</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {hasFilters
              ? 'Keine Programme mit diesen Filtern.'
              : 'Programme werden am Bauteil im Arbeitsgang (Reiter „Programme“) hochgeladen.'}
          </p>
        </div>
      )}

      {/* List */}
      {!loading && programs.length > 0 && (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {programs.map((p) => (
                <ProgramOverviewCard key={p.id} program={p} downloadTitle={config.downloadTitle} onDownload={() => handleDownload(p)} />
              ))}
            </div>
          ) : (
            <ProgramsTable programs={programs} downloadTitle={config.downloadTitle} onDownload={handleDownload} />
          )}

          <Pagination
            currentPage={page}
            totalItems={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(config.prefKey, size); setPage(1); }}
          />
        </>
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
    orange: { ring: 'ring-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  };
  const c = colorMap[color] || colorMap.blue;
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
// AKTIONEN (Ansehen = Sprung zum Arbeitsgang, Download)
// ============================================================================
function ProgramActions({ program, downloadTitle, onDownload }) {
  return (
    <div className="flex justify-end gap-1">
      <Link
        to={programLink(program)}
        className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
        title="Am Arbeitsgang öffnen"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </Link>
      <button
        type="button"
        onClick={onDownload}
        className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
        title={downloadTitle}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>
    </div>
  );
}

// ============================================================================
// GRID-KARTE
// ============================================================================
function ProgramOverviewCard({ program: p, downloadTitle, onDownload }) {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <Link
              to={programLink(p)}
              className="font-mono text-base font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate block"
            >
              {p.program_number}
            </Link>
            <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 truncate">{p.program_name}</p>
          </div>
          <StatusBadge status={p.workflow_state} />
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="text-gray-600 dark:text-gray-300 truncate">
            <span className="text-gray-500 dark:text-gray-400">Bauteil:</span>{' '}
            <span className="font-mono">{p.part_number}</span>{p.part_name ? ` – ${p.part_name}` : ''}
          </div>
          <div className="text-gray-600 dark:text-gray-300 truncate">
            <span className="text-gray-500 dark:text-gray-400">Arbeitsgang:</span>{' '}
            {p.operation_number}{p.operation_name ? ` ${p.operation_name}` : ''}
          </div>
          <div className="text-gray-600 dark:text-gray-300 truncate">
            <span className="text-gray-500 dark:text-gray-400">Maschine:</span> {p.machine_name || '-'}
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">Version:</span>{' '}
            <span className="font-mono">{p.version || '-'}</span>
            <span className="text-gray-400 dark:text-gray-500"> · geändert {formatDate(p.updated_at)}</span>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
        <ProgramActions program={p} downloadTitle={downloadTitle} onDownload={onDownload} />
      </div>
    </div>
  );
}

// ============================================================================
// TABELLE
// ============================================================================
function ProgramsTable({ programs, downloadTitle, onDownload }) {
  const th = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider';
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[14%]" />
            <col className="w-[13%]" />
            <col className="w-[19%]" />
            <col className="w-[7%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[11%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className={th}>Bauteil</th>
              <th className={th}>Arbeitsgang</th>
              <th className={th}>Programm</th>
              <th className={th}>Version</th>
              <th className={th}>Status</th>
              <th className={th}>Maschine</th>
              <th className={th}>Geändert</th>
              <th className={`${th} text-right`}>Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {programs.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3 truncate text-sm">
                  <Link to={`/parts/${p.part_id}`} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {p.part_number}
                  </Link>
                  {p.part_name && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.part_name}</div>}
                </td>
                <td className="px-4 py-3 truncate text-sm text-gray-900 dark:text-gray-100">
                  {p.operation_number}
                  {p.operation_name && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.operation_name}</div>}
                </td>
                <td className="px-4 py-3 truncate text-sm">
                  <Link to={programLink(p)} className="font-mono font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                    {p.program_number}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.program_name}</div>
                </td>
                <td className="px-4 py-3 truncate text-sm font-mono text-gray-900 dark:text-gray-100">{p.version || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.workflow_state} /></td>
                <td className="px-4 py-3 truncate text-sm text-gray-600 dark:text-gray-300">{p.machine_name || '-'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{formatDate(p.updated_at)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <ProgramActions program={p} downloadTitle={downloadTitle} onDownload={() => onDownload(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
