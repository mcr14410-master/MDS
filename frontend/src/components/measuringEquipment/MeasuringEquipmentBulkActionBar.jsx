import { useState, useRef, useEffect } from 'react';
import { Wrench, FileText, X, Eye, EyeOff, ChevronDown } from 'lucide-react';

/**
 * MeasuringEquipmentBulkActionBar
 *
 * Erscheint wenn mindestens ein Messmittel ausgewählt ist.
 * Bietet Bulk-Aktionen an: Zur Kalibrierung senden, PDF exportieren (Dropdown), Auswahl zurücksetzen.
 * Zusätzlich: Toggle "Nur Auswahl anzeigen".
 *
 * onExportPDF wird aufgerufen mit dem gewählten Typ: 'calibration-report' | 'datasheet-full' | 'datasheet-compact'
 */
export default function MeasuringEquipmentBulkActionBar({
  selectedCount,
  showOnlySelected,
  onToggleShowOnlySelected,
  onSendToCalibration,
  onExportPDF,
  onClearSelection,
  loading = false,
}) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

  if (selectedCount === 0) return null;

  const handleExport = (type) => {
    setExportMenuOpen(false);
    onExportPDF(type);
  };

  return (
    <div className="sticky top-0 z-10 mb-4 bg-blue-600 dark:bg-blue-700 text-white rounded-lg shadow-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center justify-center h-8 px-3 rounded-full bg-white/20 text-sm font-semibold">
            {selectedCount} ausgewählt
          </span>
          <button
            type="button"
            onClick={onToggleShowOnlySelected}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-sm bg-white/10 hover:bg-white/20 transition-colors"
            title={showOnlySelected ? 'Wieder alle anzeigen' : 'Nur Auswahl anzeigen'}
          >
            {showOnlySelected ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showOnlySelected ? 'Alle anzeigen' : 'Nur Auswahl anzeigen'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* PDF Export Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen(v => !v)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF Export
              <ChevronDown className="w-4 h-4" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 text-gray-900 dark:text-gray-100">
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleExport('calibration-report')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium">Kalibrier-Laufzettel</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Begleit-PDF zum Kalibrierdienst
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('datasheet-full')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium">Messmittel-Datenblatt</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Ausführlich, 1 Messmittel pro Seite
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('datasheet-compact')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium">Messmittel-Datenblatt (kompakt)</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      4 Messmittel pro Seite
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onSendToCalibration}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Wrench className="w-4 h-4" />
            Zur Kalibrierung senden
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 disabled:opacity-60 transition-colors"
            title="Auswahl aufheben"
          >
            <X className="w-4 h-4" />
            Aufheben
          </button>
        </div>
      </div>
    </div>
  );
}
