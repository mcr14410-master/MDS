// frontend/src/pages/MachineDetailPage.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMachinesStore } from '../stores/machinesStore';
import { useAuthStore } from '../stores/authStore';
import { toast } from '../components/Toaster';
import MachineDocumentsTab from '../components/MachineDocumentsTab';
import MachineImage from '../components/MachineImage';
import MachineForm from '../components/MachineForm';

export default function MachineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    currentMachine, 
    stats, 
    documents,
    toolNumberLists,
    loading, 
    error, 
    fetchMachine, 
    fetchMachineStats,
    fetchMachineDocuments,
    fetchMachineToolNumberLists,
    deleteMachine,
    clearCurrentMachine
  } = useMachinesStore();
  const { hasPermission } = useAuthStore();
  const [activeTab, setActiveTab] = useState('details');
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchMachine(id);
      fetchMachineStats(id).catch(() => {});
      fetchMachineDocuments(id).catch(() => {});
      fetchMachineToolNumberLists(id).catch(() => {});
    }
    return () => clearCurrentMachine();
  }, [id, fetchMachine, fetchMachineStats, fetchMachineDocuments, fetchMachineToolNumberLists, clearCurrentMachine]);

  const handleDelete = async () => {
    if (!window.confirm('Maschine wirklich deaktivieren?')) {
      return;
    }
    try {
      await deleteMachine(id, false);
      toast.success('Maschine deaktiviert');
      navigate('/machines');
    } catch (err) {
      toast.error(err.message || 'Fehler beim Deaktivieren');
    }
  };

  const getMachineTypeText = (type) => {
    const types = {
      'milling': 'Fräsen',
      'turning': 'Drehen',
      'mill-turn': 'Dreh-Fräsen',
      'grinding': 'Schleifen',
      'edm': 'Erodieren',
    };
    return types[type] || type || '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && !currentMachine) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Lade Maschine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Fehler</h2>
          <p className="text-red-600 dark:text-red-300">{error}</p>
          <Link
            to="/machines"
            className="mt-4 inline-block text-red-600 dark:text-red-400 hover:text-red-800 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  if (!currentMachine) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Nicht gefunden</h2>
          <p className="text-yellow-600 dark:text-yellow-300">Maschine wurde nicht gefunden.</p>
          <Link
            to="/machines"
            className="mt-4 inline-block text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 font-medium"
          >
            ← Zurück zur Übersicht
          </Link>
        </div>
      </div>
    );
  }

  const machine = currentMachine;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/machines"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium flex items-center gap-2 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zur Übersicht
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{machine.name}</h1>
            <p className="mt-1 text-lg text-gray-600 dark:text-gray-400">
              {machine.manufacturer} {machine.model}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                machine.is_active
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {machine.is_active ? 'Aktiv' : 'Inaktiv'}
            </span>
            
            {hasPermission('machine.update') && (
              <button
                onClick={() => setShowEditForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Bearbeiten
              </button>
            )}
            
            {hasPermission('machine.delete') && machine.is_active && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Deaktivieren
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex gap-8">
          {[
            { id: 'details', label: 'Details' },
            { id: 'documents', label: 'Dokumente', count: documents?.length },
            { id: 'statistics', label: 'Statistik' },
            { id: 'toolnumbers', label: 'T-Nummern', count: toolNumberLists?.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <DetailsTab machine={machine} documents={documents} formatDate={formatDate} getMachineTypeText={getMachineTypeText} />
      )}

      {activeTab === 'documents' && (
        <MachineDocumentsTab machineId={id} />
      )}

      {activeTab === 'statistics' && (
        <StatisticsTab machine={machine} stats={stats} formatDate={formatDate} />
      )}

      {activeTab === 'toolnumbers' && (
        <ToolNumbersTab machineId={id} toolNumberLists={toolNumberLists} />
      )}

      {/* Edit Form Modal */}
      {showEditForm && (
        <MachineForm
          machine={currentMachine}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            fetchMachine(id);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// DETAILS TAB
// ============================================================================
function DetailsTab({ machine, documents, formatDate, getMachineTypeText }) {
  // Find primary photo document
  const primaryPhoto = documents?.find(doc => doc.is_primary && doc.document_type === 'photo');
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Stammdaten */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Stammdaten</h2>
            <div className="grid grid-cols-2 gap-6">
              <InfoField label="Name" value={machine.name} />
              <InfoField label="Hersteller" value={machine.manufacturer} />
              <InfoField label="Modell" value={machine.model} />
              <InfoField label="Seriennummer" value={machine.serial_number} />
              <InfoField label="Maschinentyp" value={getMachineTypeText(machine.machine_type)} />
              <InfoField label="Steuerung" value={machine.control_type} />
              <InfoField label="Steuerungsversion" value={machine.control_version} />
              <InfoField label="Standort" value={machine.location} />
            </div>
          </div>
        </div>

        {/* Technische Daten + Netzwerk & CAM - nebeneinander */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Technical Specs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Technische Daten</h3>
            <div className="space-y-3">
              <InfoField label="Achsen" value={machine.num_axes} />
              <InfoField 
                label="Arbeitsraum (X/Y/Z)" 
                value={machine.workspace_x ? `${machine.workspace_x} × ${machine.workspace_y} × ${machine.workspace_z} mm` : null} 
              />
              <InfoField label="Spindelleistung" value={machine.spindle_power ? `${machine.spindle_power} kW` : null} />
              <InfoField label="Max. Drehzahl" value={machine.max_rpm ? `${machine.max_rpm} U/min` : null} />
              <InfoField label="Werkzeugplätze" value={machine.tool_capacity} />
            </div>
          </div>

          {/* Network & CAM */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Netzwerk & CAM</h3>
            <div className="space-y-3">
              <InfoField label="Netzwerkpfad" value={machine.network_path} mono />
              <InfoField label="Postprozessor" value={machine.postprocessor_name} />
            </div>
          </div>
        </div>

        {/* Notes */}
        {machine.notes && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Notizen</h3>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{machine.notes}</p>
          </div>
        )}
      </div>

      {/* Right Column - Sidebar */}
      <div className="space-y-6">
        {/* Machine Photo */}
        {primaryPhoto && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <MachineImage documentId={primaryPhoto.id} alt={machine.name} />
          </div>
        )}

        {/* Meta */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Metadaten</h3>
          <div className="space-y-3">
            <InfoField label="Erstellt am" value={formatDate(machine.created_at)} />
            <InfoField label="Geändert am" value={formatDate(machine.updated_at)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATISTICS TAB
// ============================================================================
function StatisticsTab({ machine, stats, formatDate }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Operating Hours */}
      <StatCard
        title="Betriebsstunden"
        value={machine.operating_hours || 0}
        unit="h"
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        color="blue"
      />

      {/* Programs */}
      <StatCard
        title="Programme"
        value={stats?.program_count || 0}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        color="green"
      />

      {/* Operations */}
      <StatCard
        title="Arbeitsgänge"
        value={stats?.operation_count || 0}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        }
        color="purple"
      />

      {/* Parts */}
      <StatCard
        title="Bauteile"
        value={stats?.part_count || 0}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        color="yellow"
      />

      {/* Maintenance Info */}
      <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Wartung</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <InfoField label="Letzte Wartung" value={formatDate(machine.last_maintenance)} />
          <InfoField label="Nächste Wartung" value={formatDate(machine.next_maintenance)} />
          <InfoField 
            label="Wartungsstatus" 
            value={
              machine.next_maintenance && new Date(machine.next_maintenance) < new Date() 
                ? 'Überfällig' 
                : 'OK'
            }
            className={
              machine.next_maintenance && new Date(machine.next_maintenance) < new Date()
                ? 'text-red-600 dark:text-red-400 font-semibold'
                : 'text-green-600 dark:text-green-400'
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TOOL NUMBERS TAB
// ============================================================================
function ToolNumbersTab({ machineId, toolNumberLists }) {
  if (!toolNumberLists || toolNumberLists.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Keine T-Nummern-Listen</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Dieser Maschine sind noch keine T-Nummern-Listen zugewiesen.
        </p>
        <Link
          to="/tool-number-lists"
          className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium"
        >
          Zur T-Nummern-Verwaltung →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Zugewiesene T-Nummern-Listen ({toolNumberLists.length})
        </h3>
        <div className="space-y-3">
          {toolNumberLists.map(list => (
            <Link
              key={list.list_id || list.id}
              to={`/tool-number-lists/${list.list_id || list.id}`}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {list.list_name || list.name || 'Unbenannt'}
                </p>
                {(list.list_description || list.description) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {list.list_description || list.description}
                  </p>
                )}
                {list.item_count !== undefined && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {list.item_count} Einträge
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  (list.list_is_active ?? list.is_active)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {(list.list_is_active ?? list.is_active) ? 'Aktiv' : 'Inaktiv'}
                </span>
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================
function InfoField({ label, value, mono, className }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}
      </label>
      <p className={`text-gray-900 dark:text-gray-100 ${mono ? 'font-mono text-sm' : ''} ${className || ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function StatCard({ title, value, unit, icon, color }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}{unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
