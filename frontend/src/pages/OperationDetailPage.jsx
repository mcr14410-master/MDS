// frontend/src/pages/OperationDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOperationsStore } from '../stores/operationsStore';
import { usePartsStore } from '../stores/partsStore';
import ProgramsList from '../components/ProgramsList';
import ProgramsHistoryList from '../components/ProgramsHistoryList';
import SetupSheetsList from '../components/SetupSheetsList';
import ToolListTable from '../components/ToolListTable';
import ToolListsOverview from '../components/ToolListsOverview';
import InspectionPlanTab from '../components/InspectionPlanTab';

export default function OperationDetailPage() {
  const { partId, operationId } = useParams();
  const navigate = useNavigate();
  const { currentOperation, loading, error, fetchOperation } = useOperationsStore();
  const { currentPart, fetchPart } = usePartsStore();
  const [activeTab, setActiveTab] = useState('programmes');

  useEffect(() => {
    if (operationId) {
      fetchOperation(operationId);
    }
    if (partId) {
      fetchPart(partId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationId, partId]);

  // Format time from seconds to readable string
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    if (minutes > 0) {
      return `${minutes} min ${secs > 0 ? secs + 's' : ''}`.trim();
    }
    return `${secs}s`;
  };

  if (loading && !currentOperation) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Arbeitsgang...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <button
            onClick={() => navigate(`/parts/${partId}`)}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            ← Zurück zum Bauteil
          </button>
        </div>
      </div>
    );
  }

  if (!currentOperation) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center text-sm text-gray-600 dark:text-gray-400">
        <Link to="/parts" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          Bauteile
        </Link>
        <svg className="w-4 h-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link to={`/parts/${partId}`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          {currentPart?.part_number || `Bauteil #${partId}`}
        </Link>
        <svg className="w-4 h-4 mx-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 dark:text-white font-medium">
          {currentOperation.op_number}
        </span>
      </nav>

      {/* Operation Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {currentOperation.op_number} - {currentOperation.op_name}
            </h1>
            {currentOperation.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{currentOperation.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate(`/parts/${partId}`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Operation Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Machine */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Maschine</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {currentOperation.machine_name || 'Nicht zugewiesen'}
            </p>
          </div>

          {/* Sequence */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Reihenfolge</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {currentOperation.sequence}
            </p>
          </div>

          {/* Setup Time */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rüstzeit</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {currentOperation.setup_time_minutes 
                ? `${currentOperation.setup_time_minutes} min`
                : 'N/A'}
            </p>
          </div>

          {/* Cycle Time */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Zykluszeit</label>
            <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
              {currentOperation.cycle_time_seconds 
                ? formatTime(currentOperation.cycle_time_seconds)
                : 'N/A'}
            </p>
          </div>
        </div>

        {/* Tools Info */}
        {currentOperation.tools_used && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Werkzeuge</label>
            <p className="text-gray-700 dark:text-gray-300 mt-1">{currentOperation.tools_used}</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('programmes')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'programmes'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Programme
            </button>
            {/* Werkzeuge Tab */}
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'tools'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Werkzeuge
            </button>
            <button
              onClick={() => setActiveTab('setup')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'setup'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Einrichteblatt
            </button>
            <button
              onClick={() => setActiveTab('inspection')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'inspection'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Prüfplan
            </button>
            {/* Historie Tab - rechtsbündig */}
            <button
              onClick={() => setActiveTab('history')}
              className={`ml-auto px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Historie
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'programmes' && (
            <ProgramsList operationId={operationId} />
          )}
          {activeTab === 'tools' && (
            <ToolListsOverview operationId={operationId} />
          )}
          {activeTab === 'setup' && (
            <SetupSheetsList operationId={operationId} />
          )}
          {activeTab === 'inspection' && (
            <InspectionPlanTab operationId={operationId} />
          )}
          {activeTab === 'history' && (
            <div className="space-y-8">
              {/* Operations-Historie - Platzhalter */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Arbeitsgang-Historie
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-500 dark:text-gray-400">
                    Arbeitsgang-Workflow kommt später...
                  </p>
                </div>
              </div>

              {/* Programme-Historie */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Programme-Historie
                </h3>
                <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    📋 Zeigt alle Status-Änderungen der Programme dieses Arbeitsgangs
                  </p>
                </div>
                {/* Programme-Liste mit Historie wird hier angezeigt */}
                <ProgramsHistoryList operationId={operationId} />
              </div>

              {/* Setup-Sheets-Historie - Platzhalter */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Einrichteblatt-Historie
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <p className="text-gray-500 dark:text-gray-400">
                    Einrichteblatt-Workflow kommt später...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
