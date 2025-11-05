// frontend/src/components/OperationCard.jsx
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function OperationCard({ operation, onEdit, onDelete, partId }) {
  const { hasPermission } = useAuthStore();
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/parts/${partId}/operations/${operation.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation(); // Prevent card click
    onEdit(operation);
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent card click
    onDelete(operation);
  };

  // Format time helpers
  const formatSetupTime = (minutes) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes} Min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatCycleTime = (seconds) => {
    if (!seconds) return '-';
    const minutes = seconds / 60;
    
    if (minutes < 1) {
      // Under 1 minute: show as seconds
      return `${seconds}s`;
    } else if (minutes < 60) {
      // Under 60 minutes: show as minutes with 1 decimal
      return `${minutes.toFixed(1)} Min`;
    } else {
      // 60+ minutes: show as hours:minutes
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-blue-600">
            {operation.op_number}
          </span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {operation.op_name}
            </h3>
            {operation.machine_name && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {operation.machine_name}
              </p>
            )}
          </div>
        </div>
        
        {/* Sequence Badge */}
        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
          Seq: {operation.sequence}
        </span>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Rüstzeit
          </label>
          <p className="text-sm font-semibold text-gray-900">
            {formatSetupTime(operation.setup_time_minutes)}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Zykluszeit
          </label>
          <p className="text-sm font-semibold text-gray-900">
            {formatCycleTime(operation.cycle_time_seconds)}
          </p>
        </div>
      </div>

      {/* Description */}
      {operation.description && (
        <div className="mb-3 pt-3 border-t border-gray-100">
          <p className="text-sm text-gray-600 line-clamp-2">
            {operation.description}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {hasPermission('part.update') && (
          <button
            onClick={handleEdit}
            className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            Bearbeiten
          </button>
        )}
        {hasPermission('part.delete') && (
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors text-sm font-medium"
          >
            Löschen
          </button>
        )}
      </div>
    </div>
  );
}
