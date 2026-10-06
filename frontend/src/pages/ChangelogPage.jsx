import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChangelogStore } from '../stores/changelogStore';

const USER_SECTION = 'Für Anwender';

const SECTION_LABELS = {
  Added: 'Neu',
  Changed: 'Geändert',
  Fixed: 'Behoben',
  Removed: 'Entfernt',
  Deprecated: 'Veraltet',
  Security: 'Sicherheit',
};

// Nur **fett** und `code` – kein HTML
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function ItemList({ items }) {
  return (
    <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
      {items.map((item, i) => (
        <li key={i} className={`flex gap-2 ${item.level > 0 ? 'ml-5' : ''}`}>
          <span className="text-gray-400 dark:text-gray-500 select-none">•</span>
          <span>{renderInline(item.text)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ChangelogPage() {
  const navigate = useNavigate();
  const { data, loading, error, fetchChangelog, markSeen } = useChangelogStore();
  const [showTechnical, setShowTechnical] = useState(false);

  useEffect(() => {
    fetchChangelog().then((result) => {
      if (result?.available) markSeen();
    });
  }, [fetchChangelog, markSeen]);

  const versions = data?.versions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            title="Zurück"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Was ist neu</h1>
            {data?.currentVersion && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Aktuelle Version: <span className="font-mono">v{data.currentVersion}</span>
              </p>
            )}
          </div>
        </div>

        {data?.isAdmin && (
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none flex-shrink-0">
            <input
              type="checkbox"
              checked={showTechnical}
              onChange={(e) => setShowTechnical(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            Technische Details anzeigen
          </label>
        )}
      </div>

      {/* Inhalt */}
      {loading && !data ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">{error}</div>
      ) : data && !data.available ? (
        <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 text-sm">
          Änderungsprotokoll derzeit nicht verfügbar.
        </div>
      ) : versions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Keine Einträge vorhanden.</p>
      ) : (
        <div className="space-y-4">
          {versions.map((v) => {
            const userSection = v.sections.find((s) => s.name === USER_SECTION);
            const technicalSections = v.sections.filter((s) => s.name !== USER_SECTION && s.items.length > 0);
            const isCurrent = v.version === data.currentVersion;
            const hasVisibleContent = userSection || (showTechnical && technicalSections.length > 0);

            // Admin ohne Toggle: Versionen ohne Anwender-Abschnitt ausblenden
            if (!hasVisibleContent) return null;

            return (
              <div
                key={v.version}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <span className="font-mono">v{v.version}</span>
                    {v.title && <span className="font-normal text-gray-600 dark:text-gray-300"> – {v.title}</span>}
                  </h2>
                  {isCurrent && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      Aktuell
                    </span>
                  )}
                  <span className="text-sm text-gray-500 dark:text-gray-400">{v.date}</span>
                </div>

                {userSection && <ItemList items={userSection.items} />}

                {showTechnical && technicalSections.length > 0 && (
                  <div className={`space-y-3 ${userSection ? 'mt-4 pt-4 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                    {technicalSections.map((s) => (
                      <div key={s.name}>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
                          {SECTION_LABELS[s.name] || s.name}
                        </h3>
                        <ItemList items={s.items} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
