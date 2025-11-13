import { useAuthStore } from '../../stores/authStore';
import { Warehouse, Package, MapPin, User, Edit, Trash2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LocationCard({
  location,
  onEdit,
  onDelete,
  getLocationTypeText,
  getItemCategoryText,
  getItemCategoryColor,
}) {
  const { hasPermission } = useAuthStore();

  const getLocationTypeIcon = (type) => {
    switch (type) {
      case 'cabinet':
        return <Package className="w-5 h-5" />;
      case 'shelf_unit':
        return <Warehouse className="w-5 h-5" />;
      case 'room':
        return <MapPin className="w-5 h-5" />;
      case 'area':
        return <MapPin className="w-5 h-5" />;
      default:
        return <Warehouse className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-gray-600 dark:text-gray-400">{getLocationTypeIcon(location.location_type)}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{location.name}</h3>
              {!location.is_active && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                  Inaktiv
                </span>
              )}
            </div>
            {location.code && (
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{location.code}</p>
            )}
          </div>
        </div>

        {/* Category Badge */}
        <div className="mt-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getItemCategoryColor(location.item_category)}`}>
            {getItemCategoryText(location.item_category)}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Description */}
        {location.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{location.description}</p>
        )}

        {/* Type */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Typ:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {getLocationTypeText(location.location_type)}
          </span>
        </div>

        {/* Location Info */}
        {(location.building || location.floor || location.room) && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
            <div className="flex flex-wrap gap-1 text-gray-600 dark:text-gray-400">
              {location.building && <span>{location.building}</span>}
              {location.building && (location.floor || location.room) && <span>•</span>}
              {location.floor && <span>{location.floor}</span>}
              {location.floor && location.room && <span>•</span>}
              {location.room && <span>{location.room}</span>}
            </div>
          </div>
        )}

        {/* Compartments Count */}
        <div className="flex items-center gap-2 text-sm">
          <Package className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          <span className="text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-white">
              {location.compartments_count || 0}
            </span>{' '}
            Fach/Fächer
            {location.active_compartments_count !== location.compartments_count && location.compartments_count > 0 && (
              <span className="text-gray-500 dark:text-gray-400">
                {' '}
                ({location.active_compartments_count || 0} aktiv)
              </span>
            )}
          </span>
        </div>

        {/* Responsible User */}
        {location.responsible_username && (
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-900 dark:text-white">{location.responsible_username}</span>
            </span>
          </div>
        )}

        {/* Notes Preview */}
        {location.notes && (
          <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {location.notes}
          </div>
        )}
      </div>

      {/* Footer/Actions */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
        {/* View Details Link */}
        <Link
          to={`/storage/locations/${location.id}`}
          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
        >
          Details
          <ChevronRight className="w-4 h-4" />
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasPermission('storage.edit') && (
            <button
              onClick={() => onEdit(location)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          {hasPermission('storage.delete') && (
            <button
              onClick={() => onDelete(location.id, location.name)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
