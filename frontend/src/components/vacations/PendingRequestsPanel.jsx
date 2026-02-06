import { useState, useEffect } from 'react';
import { ClipboardCheck, Check, X, ChevronDown, ChevronUp, AlertTriangle, Users } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

export default function PendingRequestsPanel({ requests, onRefresh, compact = false }) {
  const { approveVacation, rejectVacation, checkOverlap } = useVacationsStore();
  const [expandedId, setExpandedId] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [overlapData, setOverlapData] = useState({}); // Cache für Überschneidungen
  const [loadingOverlap, setLoadingOverlap] = useState(null);

  // Prüfe Überschneidungen wenn ein Antrag aufgeklappt wird
  useEffect(() => {
    if (expandedId && !overlapData[expandedId]) {
      const request = requests.find(r => r.id === expandedId);
      if (request) {
        setLoadingOverlap(expandedId);
        checkOverlap({
          user_id: request.user_id,
          start_date: request.start_date.split('T')[0],
          end_date: request.end_date.split('T')[0],
          exclude_id: request.id
        })
          .then(result => {
            setOverlapData(prev => ({ ...prev, [expandedId]: result }));
          })
          .catch(err => {
            console.error('Overlap check failed:', err);
            setOverlapData(prev => ({ ...prev, [expandedId]: { error: true } }));
          })
          .finally(() => {
            setLoadingOverlap(null);
          });
      }
    }
  }, [expandedId, requests]);

  const handleApprove = async (id) => {
    setProcessing(id);
    try {
      await approveVacation(id);
      onRefresh();
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id) => {
    setProcessing(id);
    try {
      await rejectVacation(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      onRefresh();
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h3 className={`${compact ? 'text-sm font-medium' : 'text-lg font-semibold'} text-gray-900 dark:text-white mb-3 flex items-center gap-2`}>
          <ClipboardCheck className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-purple-500`} />
          Offene Anträge
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
          Keine offenen Anträge zur Genehmigung
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <h3 className={`${compact ? 'text-sm font-medium' : 'text-lg font-semibold'} text-gray-900 dark:text-white mb-3 flex items-center gap-2`}>
        <ClipboardCheck className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-purple-500`} />
        Offene Anträge
        <span className={`ml-auto ${compact ? 'text-xs' : 'text-sm'} font-normal bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded-full`}>
          {requests.length}
        </span>
      </h3>

      <div className={`space-y-2 ${compact ? 'max-h-48' : 'max-h-80'} overflow-y-auto`}>
        {requests.map(request => {
          const isExpanded = expandedId === request.id;
          const isRejecting = rejectingId === request.id;
          const roles = Array.isArray(request.user_roles) ? request.user_roles : [];

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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {request.display_name}
                    </span>
                  </div>
                  {roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {roles.map(role => (
                        <span 
                          key={role.role_id}
                          className="px-1.5 py-0.5 text-[10px] font-medium rounded-full 
                                     bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                        >
                          {role.role_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: request.type_color }}
                  />
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
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-3">
                    <p>
                      <span className="font-medium">Art:</span> {request.type_name}
                    </p>
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
                    <p className="text-xs text-gray-500">
                      Erstellt: {new Date(request.created_at).toLocaleDateString('de-DE')}
                      {request.created_by_name && ` von ${request.created_by_name}`}
                    </p>
                  </div>

                  {/* Überschneidungen */}
                  {loadingOverlap === request.id ? (
                    <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500">
                      Prüfe Überschneidungen...
                    </div>
                  ) : overlapData[request.id] && !overlapData[request.id].error && (
                    <div className={`mb-3 p-2 rounded text-xs ${
                      overlapData[request.id].concurrent?.length > 0
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                      {overlapData[request.id].concurrent?.length > 0 ? (
                        <>
                          <div className="flex items-center gap-1 font-medium mb-1">
                            <Users className="h-3 w-3" />
                            Überschneidungen ({overlapData[request.id].concurrent.length}):
                          </div>
                          <ul className="space-y-0.5 ml-4">
                            {overlapData[request.id].concurrent.map((c, idx) => (
                              <li key={idx}>
                                • {c.display_name} ({c.type_name}): {' '}
                                {new Date(c.start_date).toLocaleDateString('de-DE')}
                                {c.start_date !== c.end_date && (
                                  <> - {new Date(c.end_date).toLocaleDateString('de-DE')}</>
                                )}
                              </li>
                            ))}
                          </ul>
                          {!overlapData[request.id].allowed && (
                            <p className="mt-1 text-yellow-600 dark:text-yellow-400 font-medium">
                              ⚠️ {overlapData[request.id].message}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Keine Überschneidungen
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rejection Reason Input */}
                  {isRejecting ? (
                    <div className="space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Ablehnungsgrund (optional)"
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg 
                                   dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processing === request.id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 
                                     bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 
                                     disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Ablehnen
                        </button>
                        <button
                          onClick={() => {
                            setRejectingId(null);
                            setRejectReason('');
                          }}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg 
                                     hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 
                                     dark:hover:bg-gray-700"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Approve / Reject Buttons */
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(request.id);
                        }}
                        disabled={processing === request.id}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 
                                   bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 
                                   disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Genehmigen
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRejectingId(request.id);
                        }}
                        disabled={processing === request.id}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 
                                   bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 
                                   disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                        Ablehnen
                      </button>
                    </div>
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
