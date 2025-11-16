import { Edit, Trash2, Box, Package, AlertCircle } from 'lucide-react';
import { useStorageStore } from '../../stores/storageStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../Toaster';

export default function CompartmentCard({ compartment, items, itemsCount, onEdit }) {
  const { user } = useAuthStore();
  const { deleteCompartment } = useStorageStore();

  const handleDelete = async () => {
    if (itemsCount > 0) {
      toast.error(
        `Dieses Fach kann nicht gelöscht werden, da es noch ${itemsCount} Lagerartikel enthält. Bitte zuerst alle Artikel umlagern oder löschen.`
      );
      return;
    }

    if (!window.confirm(`Fach "${compartment.name}" wirklich löschen?`)) {
      return;
    }

    const result = await deleteCompartment(compartment.id);
    if (result.success) {
      toast.success('Fach erfolgreich gelöscht');
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  return (
    <div className="bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Position Badge */}
            {compartment.position !== null && (
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">{compartment.position}</span>
              </div>
            )}

            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg">{compartment.name}</h3>
              {compartment.description && (
                <p className="text-sm text-gray-400 mt-1">{compartment.description}</p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  ID: {compartment.id}
                </div>
                {!compartment.is_active && (
                  <span className="px-2 py-0.5 bg-gray-600 text-gray-300 rounded">Inaktiv</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {user?.permissions?.includes('storage.edit') && (
              <button
                onClick={() => onEdit(compartment)}
                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                title="Bearbeiten"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {user?.permissions?.includes('storage.delete') && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contents */}
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Package className="w-4 h-4" />
              <span>
                {itemsCount === 0 && 'Leer'}
                {itemsCount === 1 && '1 Werkzeug'}
                {itemsCount > 1 && `${itemsCount} Werkzeuge`}
              </span>
            </div>

            {itemsCount > 0 && (
              <div className="flex items-center gap-1">
                {items.slice(0, 3).map((item, index) => (
                  <div
                    key={item.id}
                    className="px-2 py-1 bg-gray-600 text-gray-200 rounded text-xs font-mono"
                    title={item.tool_name}
                  >
                    {item.tool_number}
                  </div>
                ))}
                {itemsCount > 3 && (
                  <div className="px-2 py-1 bg-gray-600 text-gray-400 rounded text-xs">
                    +{itemsCount - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Low Stock Warning */}
          {items.some((item) => item.is_low_stock) && (
            <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
              <AlertCircle className="w-3 h-3" />
              Niedrigbestand bei {items.filter((item) => item.is_low_stock).length} Artikel(n)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
