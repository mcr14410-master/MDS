import { useAuthStore } from '../../stores/authStore';
import { Edit, Trash2, FolderOpen, Settings } from 'lucide-react';

export default function CategoryCard({ category, isSelected, onClick, onEdit, onDelete, onEditCustomFields }) {
  const { hasPermission } = useAuthStore();

  const getIcon = (iconName) => {
    // Simple text icons for now - can be replaced with actual icon components later
    const icons = {
      mill: '⚙️',
      drill: '🔧',
      turn: '🔄',
      tap: '🔩',
      ream: '📐',
      bore: '⚫',
      insert: '📎',
      grind: '💎',
      spark: '⚡',
      saw: '🪚',
      tool: '🔨',
    };
    return icons[iconName] || '📁';
  };

  return (
    <div
      className={`
        p-4 rounded-lg border-2 transition-all cursor-pointer
        ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
        }
        ${!category.is_active ? 'opacity-60' : ''}
      `}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getIcon(category.icon)}</span>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{category.name}</h3>
              {!category.is_active && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Inaktiv
                </span>
              )}
            </div>
          </div>

          {category.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{category.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FolderOpen className="w-4 h-4" />
            <span>
              {category.subcategories_count || 0} Unterkategorie{category.subcategories_count !== 1 ? 'n' : ''}
            </span>
          </div>
        </div>

        {/* Actions */}
        {hasPermission('tools.categories.manage') && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditCustomFields(category);
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
              title="Custom Fields"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(category);
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(category.id, category.name);
              }}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
