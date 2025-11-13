import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useStorageStore } from '../../stores/storageStore';
import { toast } from '../Toaster';
import { Package, Edit, Trash2, Plus } from 'lucide-react';
import CompartmentForm from './CompartmentForm';

export default function CompartmentsList({ locationId, compartments, onRefresh }) {
  const { hasPermission } = useAuthStore();
  const { deleteCompartment } = useStorageStore();
  const [showForm, setShowForm] = useState(false);
  const [editingCompartment, setEditingCompartment] = useState(null);

  const handleCreate = () => {
    setEditingCompartment(null);
    setShowForm(true);
  };

  const handleEdit = (compartment) => {
    setEditingCompartment(compartment);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompartment(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCompartment(null);
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Fach "${name}" wirklich löschen?`)) {
      return;
    }

    const result = await deleteCompartment(id);
    if (result.success) {
      toast.success(result.message || `Fach "${name}" erfolgreich gelöscht`);
      if (onRefresh) {
        onRefresh();
      }
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  const getCompartmentTypeText = (type) => {
    const types = {
      drawer: 'Schublade',
      compartment: 'Fach',
      bin: 'Behälter',
      section: 'Bereich',
    };
    return types[type] || type;
  };

  const getCompartmentTypeIcon = (type) => {
    return <Package className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fächer/Schubladen
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {compartments?.length || 0} Fach/Fächer
          </p>
        </div>
        {hasPermission('storage.create') && (
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Neues Fach
          </button>
        )}
      </div>

      {/* List */}
      {!compartments || compartments.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-8 text-center">
          <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Keine Fächer vorhanden
          </p>
          {hasPermission('storage.create') && (
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Erstes Fach erstellen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {compartments.map((compartment) => (
            <div
              key={compartment.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-gray-600 dark:text-gray-400">
                    {getCompartmentTypeIcon(compartment.compartment_type)}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {compartment.name}
                    </h4>
                    {compartment.code && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {compartment.code}
                      </p>
                    )}
                  </div>
                  {!compartment.is_active && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      Inaktiv
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 dark:text-gray-400">Typ:</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {getCompartmentTypeText(compartment.compartment_type)}
                  </span>
                </div>

                {compartment.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2">
                    {compartment.description}
                  </p>
                )}

                {compartment.dimensions && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Maße:</span>
                    <span className="text-gray-900 dark:text-white">{compartment.dimensions}</span>
                  </div>
                )}

                {(compartment.row_number || compartment.column_number) && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Position:</span>
                    <span className="text-gray-900 dark:text-white">
                      {compartment.row_number && `Reihe ${compartment.row_number}`}
                      {compartment.row_number && compartment.column_number && ' • '}
                      {compartment.column_number && `Spalte ${compartment.column_number}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                {hasPermission('storage.edit') && (
                  <button
                    onClick={() => handleEdit(compartment)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
                {hasPermission('storage.delete') && (
                  <button
                    onClick={() => handleDelete(compartment.id, compartment.name)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <CompartmentForm
          locationId={locationId}
          compartment={editingCompartment}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
