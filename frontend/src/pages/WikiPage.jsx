// frontend/src/pages/WikiPage.jsx
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useWikiStore } from '../stores/wikiStore';
import { useAuthStore } from '../stores/authStore';
import WikiArticleForm from '../components/WikiArticleForm';

export default function WikiPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, articles, total, loading, fetchCategories, fetchArticles } = useWikiStore();
  const { hasPermission } = useAuthStore();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    const filters = {};
    if (selectedCategory) filters.category_slug = selectedCategory;
    if (search) filters.search = search;
    fetchArticles(filters);
  }, [selectedCategory, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (selectedCategory) params.set('category', selectedCategory);
    setSearchParams(params);
  };

  const handleCategorySelect = (slug) => {
    setSelectedCategory(slug === selectedCategory ? '' : slug);
    const params = new URLSearchParams();
    if (slug !== selectedCategory) params.set('category', slug);
    if (search) params.set('search', search);
    setSearchParams(params);
  };

  const selectedCategoryData = categories.find(c => c.slug === selectedCategory);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📚 Wiki</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Fehlercodes, Anleitungen und Best Practices
          </p>
        </div>
        {hasPermission('wiki.create') && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Neuer Artikel
          </button>
        )}
      </div>

      {/* Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.slug)}
            className={`p-4 rounded-lg border-2 transition-all text-left ${
              selectedCategory === category.slug
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{category.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {category.article_count || 0} Artikel
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
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
            placeholder="Fehlercode, Stichwort oder Beschreibung suchen..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Suchen
        </button>
        {(search || selectedCategory) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedCategory('');
              setSearchParams({});
            }}
            className="px-4 py-2.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Zurücksetzen
          </button>
        )}
      </form>

      {/* Results Header */}
      {(search || selectedCategory) && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{total} Ergebnis{total !== 1 ? 'se' : ''}</span>
          {selectedCategoryData && (
            <>
              <span>in</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                {selectedCategoryData.icon} {selectedCategoryData.name}
              </span>
            </>
          )}
          {search && (
            <>
              <span>für</span>
              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">"{search}"</span>
            </>
          )}
        </div>
      )}

      {/* Articles List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine Artikel gefunden</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {search ? 'Versuche andere Suchbegriffe.' : 'Erstelle den ersten Artikel.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {articles.map(article => (
            <ArticleRow key={article.id} article={article} />
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
            fetchArticles(selectedCategory ? { category_slug: selectedCategory } : {});
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// ARTICLE ROW
// ============================================================================
function ArticleRow({ article }) {
  return (
    <Link
      to={`/wiki/${article.id}`}
      className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      {/* Error Code Badge */}
      <div className="flex-shrink-0">
        {article.error_code ? (
          <div className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-mono text-sm font-medium">
            {article.error_code}
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center text-xl">
            {article.category_icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-medium text-gray-900 dark:text-white">{article.title}</h3>
          {article.machine_name && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
              {article.machine_name}
            </span>
          )}
          {article.control_type && !article.machine_name && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded">
              {article.control_type}
            </span>
          )}
        </div>
        {article.problem && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
            {article.problem}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {article.view_count}
          </span>
          {article.helpful_count > 0 && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {article.helpful_count}
            </span>
          )}
          {article.image_count > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {article.image_count}
            </span>
          )}
          {article.maintenance_plan_name && (
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Wartung
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}
