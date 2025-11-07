// frontend/src/components/OperationsList.jsx
import { useEffect, useState } from 'react';
import { useOperationsStore } from '../stores/operationsStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from './Toaster';
import OperationCard from './OperationCard';
import OperationForm from './OperationForm';

export default function OperationsList({ partId }) {
  const { operations, loading, error, fetchOperations, deleteOperation } = useOperationsStore();
  const { hasPermission } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [editingOperation, setEditingOperation] = useState(null);

  useEffect(() => {
    if (partId) {
      fetchOperations(partId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partId]);

  const handleEdit = (operation) => {
    setEditingOperation(operation);
    setShowForm(true);
  };

  const handleDelete = async (operation) => {
    if (!window.confirm(`Arbeitsgang ${operation.op_number} wirklich löschen?`)) {
      return;
    }

    try {
      await deleteOperation(operation.id);
      toast.success('Arbeitsgang erfolgreich gelöscht');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Löschen');
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingOperation(null);
  };

  const handleFormSuccess = () => {
    fetchOperations(partId);
    handleFormClose();
  };

  if (loading && operations.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Arbeitsgänge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  // Sort operations by sequence
  const sortedOperations = [...operations].sort((a, b) => a.sequence - b.sequence);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Arbeitsgänge</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {sortedOperations.length} {sortedOperations.length === 1 ? 'Arbeitsgang' : 'Arbeitsgänge'}
          </p>
        </div>
        
        {hasPermission('part.update') && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Arbeitsgang hinzufügen
          </button>
        )}
      </div>

      {/* Operations List */}
      {sortedOperations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Noch keine Arbeitsgänge
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Füge den ersten Arbeitsgang für dieses Bauteil hinzu.
          </p>
          {hasPermission('part.update') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ersten Arbeitsgang hinzufügen
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedOperations.map((operation) => (
            <OperationCard
              key={operation.id}
              operation={operation}
              partId={partId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Operation Form Modal */}
      {showForm && (
        <OperationForm
          partId={partId}
          operation={editingOperation}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
