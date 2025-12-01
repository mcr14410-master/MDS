// frontend/src/pages/WikiArticlePage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useWikiStore } from '../stores/wikiStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import { API_ENDPOINTS } from '../config/api';
import WikiArticleForm from '../components/WikiArticleForm';
import WikiImage from '../components/WikiImage';

export default function WikiArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentArticle, categories, loading, fetchArticle, fetchCategories, deleteArticle, markHelpful, clearCurrentArticle } = useWikiStore();
  const { hasPermission } = useAuthStore();

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false);

  useEffect(() => {
    fetchArticle(id);
    fetchCategories();
    return () => clearCurrentArticle();
  }, [id]);

  const handleDelete = async () => {
    try {
      await deleteArticle(id);
      toast.success('Artikel gelöscht');
      navigate('/wiki');
    } catch (error) {
      toast.error('Fehler beim Löschen');
    }
  };

  const handleMarkHelpful = async () => {
    if (hasMarkedHelpful) return;
    try {
      await markHelpful(id);
      setHasMarkedHelpful(true);
      toast.success('Danke für dein Feedback!');
    } catch (error) {
      toast.error('Fehler');
    }
  };

  if (loading || !currentArticle) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const article = currentArticle;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Link to="/wiki" className="hover:text-blue-600 dark:hover:text-blue-400">Wiki</Link>
        <span>/</span>
        <Link 
          to={`/wiki?category=${article.category_slug}`} 
          className="hover:text-blue-600 dark:hover:text-blue-400"
        >
          {article.category_icon} {article.category_name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-white">{article.error_code || article.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Error Code */}
            {article.error_code && (
              <div className="inline-flex px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded font-mono text-lg font-bold mb-3">
                {article.error_code}
              </div>
            )}
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{article.title}</h1>
            
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
              {article.machine_name && (
                <Link
                  to={`/machines/${article.machine_id}`}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  🏭 {article.machine_name}
                </Link>
              )}
              {article.control_type && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                  ⚙️ {article.control_type}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {article.view_count} Aufrufe
              </span>
              {article.created_by_username && (
                <span>von {article.created_by_username}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {hasPermission('wiki.update') && (
              <button
                onClick={() => setShowEditForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Bearbeiten
              </button>
            )}
            {hasPermission('wiki.delete') && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Löschen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Problem */}
          {article.problem && (
            <ContentSection 
              title="Problem / Symptom" 
              icon="❗" 
              content={article.problem}
              color="red"
            />
          )}

          {/* Cause */}
          {article.cause && (
            <ContentSection 
              title="Ursache" 
              icon="🔍" 
              content={article.cause}
              color="yellow"
            />
          )}

          {/* Solution */}
          {article.solution && (
            <ContentSection 
              title="Lösung" 
              icon="✅" 
              content={article.solution}
              color="green"
            />
          )}

          {/* Images */}
          {article.images && article.images.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📷 Bilder ({article.images.length})
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {article.images.map(image => (
                  <div key={image.id} className="relative group">
                    <WikiImage 
                      imageId={image.id} 
                      alt={image.caption || 'Wiki Bild'}
                      className="rounded-lg w-full h-48 object-cover cursor-pointer"
                    />
                    {image.caption && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{image.caption}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Maintenance Plan Link */}
          {article.maintenance_plan_id && (
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 p-4">
              <h3 className="font-semibold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Wartungsplan ausführen
              </h3>
              <p className="text-sm text-orange-700 dark:text-orange-400 mt-2">
                Dieser Fehler kann durch folgenden Wartungsplan behoben werden:
              </p>
              <Link
                to={`/maintenance/plans/${article.maintenance_plan_id}`}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                {article.maintenance_plan_name}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}

          {/* Tags */}
          {article.tags && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">🏷️ Tags</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.split(',').map((tag, index) => (
                  <Link
                    key={index}
                    to={`/wiki?search=${tag.trim()}`}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {tag.trim()}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Helpful */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">War das hilfreich?</h3>
            <button
              onClick={handleMarkHelpful}
              disabled={hasMarkedHelpful}
              className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                hasMarkedHelpful
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
              {hasMarkedHelpful ? 'Danke!' : 'Ja, hilfreich'} ({article.helpful_count})
            </button>
          </div>

          {/* Meta Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="space-y-2">
              <p>Erstellt: {new Date(article.created_at).toLocaleDateString('de-DE')}</p>
              {article.updated_at !== article.created_at && (
                <p>Aktualisiert: {new Date(article.updated_at).toLocaleDateString('de-DE')}</p>
              )}
              {article.updated_by_username && article.updated_by_username !== article.created_by_username && (
                <p>Bearbeitet von: {article.updated_by_username}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="pt-4">
        <Link
          to="/wiki"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </Link>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <WikiArticleForm
          article={article}
          categories={categories}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            fetchArticle(id);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Artikel löschen?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Möchtest du den Artikel "{article.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
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
// CONTENT SECTION
// ============================================================================
function ContentSection({ title, icon, content, color }) {
  const colorClasses = {
    red: 'border-l-red-500',
    yellow: 'border-l-yellow-500',
    green: 'border-l-green-500',
    blue: 'border-l-blue-500'
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 border-l-4 ${colorClasses[color] || ''} p-6`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        {icon} {title}
      </h2>
      <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}
