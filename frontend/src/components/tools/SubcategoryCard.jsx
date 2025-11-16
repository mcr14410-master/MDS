import { useAuthStore } from '../../stores/authStore';
import { Edit, Trash2 } from 'lucide-react';

export default function SubcategoryCard({ subcategory, onEdit, onDelete }) {
  const { hasPermission } = useAuthStore();

  return (
    <div
      className={`
        p-3 rounded-lg border border-gray-200 dark:border-gray-700
        hover:border-blue-300 dark:hover:border-blue-700 transition-all
        ${!subcategory.is_active ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white">{subcategory.name}</h4>
            {!subcategory.is_active && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                Inaktiv
              </span>
            )}
          </div>

          {subcategory.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{subcategory.description}</p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Sortierung: {subcategory.sequence}</p>
        </div>

        {/* Actions */}
        {hasPermission('tools.categories.manage') && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onEdit(subcategory)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(subcategory.id, subcategory.name)}
              className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
