// frontend/src/components/MachineWikiTab.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWikiStore } from '../stores/wikiStore';
import { useAuthStore } from '../stores/authStore';
import WikiArticleForm from './WikiArticleForm';

export default function MachineWikiTab({ machine }) {
  const { articles, categories, loading, fetchArticles, fetchCategories } = useWikiStore();
  const { hasPermission } = useAuthStore();
  
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories();
    loadArticles();
  }, [machine.id]);

  const loadArticles = () => {
    // Fetch articles for this machine OR general (machine_id IS NULL) with matching control_type
    fetchArticles({
      category_slug: 'machine-errors',
      machine_id: machine.id,
      control_type: machine.control_type
    });
  };

  const filteredArticles = articles.filter(article => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      article.title?.toLowerCase().includes(searchLower) ||
      article.error_code?.toLowerCase().includes(searchLower) ||
      article.problem?.toLowerCase().includes(searchLower) ||
      article.tags?.toLowerCase().includes(searchLower)
    );
  });

  // Get error category for form
  const errorCategory = categories.find(c => c.slug === 'machine-errors');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fehler-Wiki
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Fehlercodes und Lösungen für {machine.name}
            {machine.control_type && ` (${machine.control_type})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/wiki?category=machine-errors&search=${machine.control_type || ''}`}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Alle Fehler →
          </Link>
          {hasPermission('wiki.create') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + Fehler erfassen
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Fehlercode oder Stichwort suchen..."
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
        />
      </div>

      {/* Articles List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {search ? 'Keine Treffer' : 'Keine Fehler erfasst'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search 
              ? 'Versuche andere Suchbegriffe' 
              : 'Erfasse den ersten Fehler für diese Maschine'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredArticles.map(article => (
            <Link
              key={article.id}
              to={`/wiki/${article.id}`}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              {/* Error Code */}
              {article.error_code ? (
                <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-mono text-sm font-medium flex-shrink-0">
                  {article.error_code}
                </div>
              ) : (
                <div className="w-8 h-8 flex items-center justify-center text-lg flex-shrink-0">
                  🔧
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">{article.title}</h3>
                  {!article.machine_id && (
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                      Allgemein
                    </span>
                  )}
                </div>
                {article.problem && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {article.problem}
                  </p>
                )}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {article.maintenance_plan_name && (
                  <span className="text-orange-500" title="Wartungsplan verknüpft">
                    ⚙️
                  </span>
                )}
                {article.image_count > 0 && (
                  <span title={`${article.image_count} Bild(er)`}>
                    📷 {article.image_count}
                  </span>
                )}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Form Modal */}
      {showForm && (
        <WikiArticleForm
          categories={categories}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            loadArticles();
          }}
          // Pre-fill with machine context
          initialData={{
            category_id: errorCategory?.id,
            machine_id: machine.id,
            control_type: machine.control_type
          }}
        />
      )}
    </div>
  );
}
