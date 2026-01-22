import { useState } from 'react';
import { Clock, XCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

const STATUS_CONFIG = {
  pending: {
    label: 'Ausstehend',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: Clock
  },
  rejected: {
    label: 'Abgelehnt',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    icon: XCircle
  }
};

export default function MyRequestsPanel({ requests, year, onRefresh }) {
  const { resubmitVacation } = useVacationsStore();
  const [expandedId, setExpandedId] = useState(null);
  const [resubmitting, setResubmitting] = useState(null);

  const handleResubmit = async (request) => {
    setResubmitting(request.id);
    try {
      await resubmitVacation(request.id, {
        start_date: request.start_date,
        end_date: request.end_date,
        note: request.note
      });
      onRefresh();
    } catch (error) {
      console.error('Resubmit error:', error);
    } finally {
      setResubmitting(null);
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Meine Anträge
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          Keine offenen Anträge für {year}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 h-full">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Clock className="h-5 w-5 text-yellow-500" />
        Meine Anträge
        <span className="ml-auto text-sm font-normal bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full">
          {requests.length}
        </span>
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {requests.map(request => {
          const config = STATUS_CONFIG[request.status];
          const StatusIcon = config.icon;
          const isExpanded = expandedId === request.id;

          return (
            <div 
              key={request.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div 
                onClick={() => setExpandedId(isExpanded ? null : request.id)}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: request.type_color }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {request.type_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${config.color}`}>
                    <StatusIcon className="h-3 w-3" />
                    {config.label}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Details */}
              {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <span className="font-medium">Zeitraum:</span>{' '}
                      {new Date(request.start_date).toLocaleDateString('de-DE')}
                      {request.start_date !== request.end_date && (
                        <> - {new Date(request.end_date).toLocaleDateString('de-DE')}</>
                      )}
                      {' '}({request.calculated_days} Tage)
                    </p>
                    {request.note && (
                      <p>
                        <span className="font-medium">Notiz:</span> {request.note}
                      </p>
                    )}
                    {request.rejection_reason && (
                      <p className="text-red-600 dark:text-red-400">
                        <span className="font-medium">Ablehnungsgrund:</span>{' '}
                        {request.rejection_reason}
                      </p>
                    )}
                    {request.approved_by_name && (
                      <p className="text-xs text-gray-500">
                        Bearbeitet von: {request.approved_by_name}
                      </p>
                    )}
                  </div>

                  {/* Resubmit Button for rejected */}
                  {request.status === 'rejected' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResubmit(request);
                      }}
                      disabled={resubmitting === request.id}
                      className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-1.5 
                                 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className={`h-4 w-4 ${resubmitting === request.id ? 'animate-spin' : ''}`} />
                      {resubmitting === request.id ? 'Wird eingereicht...' : 'Erneut einreichen'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
