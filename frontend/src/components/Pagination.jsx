import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination Component
 * 
 * Wiederverwendbare Client-seitige Paginierung mit Seitengrößen-Auswahl.
 * 
 * Props:
 * - currentPage: Aktuelle Seite (1-basiert)
 * - totalItems: Gesamtanzahl aller Einträge
 * - pageSize: Einträge pro Seite
 * - onPageChange: (page) => void
 * - onPageSizeChange: (size) => void
 * - pageSizeOptions: Array an Größen (default [25, 50, 100])
 */
export default function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);

  const goTo = (page) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    if (clamped !== currentPage) onPageChange(clamped);
  };

  // Seitenzahlen-Logik: max 5 sichtbare Seitenzahlen mit Ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);

    let start = Math.max(2, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (currentPage <= 3) {
      start = 2;
      end = 4;
    } else if (currentPage >= totalPages - 2) {
      start = totalPages - 3;
      end = totalPages - 1;
    }

    if (start > 2) pages.push('…');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('…');

    pages.push(totalPages);
    return pages;
  };

  const btnBase =
    'inline-flex items-center justify-center h-9 min-w-9 px-2 text-sm rounded-md border transition-colors';
  const btnIdle =
    'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700';
  const btnActive =
    'border-blue-600 bg-blue-600 text-white hover:bg-blue-700';
  const btnDisabled =
    'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-600 cursor-not-allowed';

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Info + Seitengröße */}
      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
        <span>
          {totalItems === 0
            ? 'Keine Einträge'
            : <>Zeige <span className="font-semibold text-gray-900 dark:text-gray-100">{firstItem}–{lastItem}</span> von <span className="font-semibold text-gray-900 dark:text-gray-100">{totalItems}</span></>
          }
        </span>
        <div className="flex items-center gap-2">
          <label htmlFor="pageSize" className="text-sm">
            Pro Seite:
          </label>
          <select
            id="pageSize"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 px-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pageSizeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(1)}
            disabled={currentPage === 1}
            className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnIdle}`}
            title="Erste Seite"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnIdle}`}
            title="Vorherige Seite"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '…' ? (
              <span key={`ell-${idx}`} className="px-2 text-gray-500 dark:text-gray-400 select-none">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goTo(p)}
                className={`${btnBase} ${p === currentPage ? btnActive : btnIdle}`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => goTo(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnIdle}`}
            title="Nächste Seite"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(totalPages)}
            disabled={currentPage === totalPages}
            className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnIdle}`}
            title="Letzte Seite"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
