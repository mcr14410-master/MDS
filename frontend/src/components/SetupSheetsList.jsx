// frontend/src/components/SetupSheetsList.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSetupSheetsStore } from '../stores/setupSheetsStore';
import { useOperationsStore } from '../stores/operationsStore';
import { useAuthStore } from '../stores/authStore';
import SetupSheetCard from './SetupSheetCard';
import SetupSheetForm from './SetupSheetForm';
import SetupSheetPhotos from './SetupSheetPhotos';
import SetupSheetStatusActions from './SetupSheetStatusActions';
import SetupSheetClampingFixtures from './SetupSheetClampingFixtures';

export default function SetupSheetsList({ operationId }) {
  const {
    setupSheets,
    currentSetupSheet,
    loading,
    error,
    fetchSetupSheets,
    fetchSetupSheet,
    createSetupSheet,
    updateSetupSheet,
    deleteSetupSheet,
    clearError,
  } = useSetupSheetsStore();

  const { currentOperation } = useOperationsStore();
  const { hasPermission } = useAuthStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSetupSheet, setEditingSetupSheet] = useState(null);
  const [viewingSetupSheet, setViewingSetupSheet] = useState(null);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'clamping', or 'photos'

  useEffect(() => {
    if (operationId) {
      fetchSetupSheets({ operation_id: operationId });
    }
  }, [operationId, fetchSetupSheets]);

  const handleCreate = async (data) => {
    const result = await createSetupSheet(data);
    if (result.success) {
      setShowCreateForm(false);
      fetchSetupSheets({ operation_id: operationId });
    }
  };

  const handleEdit = async (setupSheet) => {
    setEditingSetupSheet(setupSheet);
    setShowCreateForm(false);
    setViewingSetupSheet(null);
  };

  const handleUpdate = async (data) => {
    if (!editingSetupSheet) return;

    const result = await updateSetupSheet(editingSetupSheet.id, data);
    if (result.success) {
      setEditingSetupSheet(null);
      fetchSetupSheets({ operation_id: operationId });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Einrichteblatt wirklich löschen?')) return;

    const result = await deleteSetupSheet(id);
    if (result.success) {
      fetchSetupSheets({ operation_id: operationId });
      if (viewingSetupSheet?.id === id) {
        setViewingSetupSheet(null);
      }
    }
  };

  const handleStatusChange = async (setupSheetId, newStatus) => {
    // Refresh list to show updated status
    fetchSetupSheets({ operation_id: operationId });
    
    // If viewing this sheet, refresh detail view too
    if (viewingSetupSheet?.id === setupSheetId) {
      await fetchSetupSheet(setupSheetId);
    }
  };

  const handleView = async (setupSheet) => {
    await fetchSetupSheet(setupSheet.id);
    setViewingSetupSheet(setupSheet);
    setShowCreateForm(false);
    setEditingSetupSheet(null);
    setActiveTab('details');
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingSetupSheet(null);
    setViewingSetupSheet(null);
    clearError();
  };

  const handlePhotoChange = async () => {
    if (viewingSetupSheet) {
      await fetchSetupSheet(viewingSetupSheet.id);
    }
  };

  // Operation Info für Form
  const operationInfo = currentOperation
    ? {
        op_number: currentOperation.op_number,
        op_name: currentOperation.op_name,
        part_number: currentOperation.part_number,
        part_name: currentOperation.part_name,
      }
    : null;

  if (loading && setupSheets.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Lade Einrichteblätter...</p>
        </div>
      </div>
    );
  }

  // Show Form (Create or Edit)
  if (showCreateForm || editingSetupSheet) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingSetupSheet ? 'Einrichteblatt bearbeiten' : 'Neues Einrichteblatt'}
          </h3>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <SetupSheetForm
            onSubmit={editingSetupSheet ? handleUpdate : handleCreate}
            onCancel={handleCancel}
            initialData={editingSetupSheet}
            operationId={operationId}
            operationInfo={operationInfo}
          />
        </div>
      </div>
    );
  }

  // Show Detail View with Photos
  if (viewingSetupSheet && currentSetupSheet) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleCancel}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Liste
          </button>

          <div className="flex space-x-2">
            <button
              onClick={() => handleEdit(viewingSetupSheet)}
              className="px-4 py-2 text-blue-600 dark:text-blue-400 border border-blue-600 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Bearbeiten
            </button>
            <button
              onClick={() => handleDelete(viewingSetupSheet.id)}
              className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-600 dark:border-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Löschen
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('details')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('clamping')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'clamping'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Spannmittel & Vorrichtungen
                {((currentSetupSheet.clamping_devices?.length || 0) + (currentSetupSheet.fixtures?.length || 0)) > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                    {(currentSetupSheet.clamping_devices?.length || 0) + (currentSetupSheet.fixtures?.length || 0)}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'photos'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Fotos ({currentSetupSheet.photos?.length || 0})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Basis-Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Basis-Informationen
                  </h3>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Arbeitsgang</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {currentSetupSheet.op_number} - {currentSetupSheet.op_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Bauteil</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {currentSetupSheet.part_number} - {currentSetupSheet.part_name}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Maschine</dt>
                      <dd className="text-sm text-gray-900 dark:text-white">
                        {currentSetupSheet.machine_name}
                      </dd>
                    </div>
                    {currentSetupSheet.program_number && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Programm</dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {currentSetupSheet.program_number} v{currentSetupSheet.program_version}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Spannmittel & Vorrichtungen */}
                {/* Spannmittel & Vorrichtungen - Kombiniert */}
                {((currentSetupSheet.clamping_devices?.length > 0) || 
                  (currentSetupSheet.fixtures?.length > 0) || 
                  (currentSetupSheet.operation_fixtures?.length > 0) ||
                  currentSetupSheet.fixture_description || 
                  currentSetupSheet.clamping_description) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Spannmittel & Vorrichtungen
                    </h3>
                    
                    {/* Spannmittel */}
                    <div className="mb-4">
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Spannmittel
                      </dt>
                      {currentSetupSheet.clamping_devices?.length > 0 ? (
                        <div className="space-y-2">
                          {currentSetupSheet.clamping_devices.map((item) => (
                            <Link
                              key={item.id}
                              to={`/clamping-devices/${item.clamping_device_id}`}
                              className="flex items-center gap-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
                            >
                              <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded font-medium">
                                {item.quantity}x
                              </span>
                              <span className="font-mono text-sm text-purple-700 dark:text-purple-300 font-medium">
                                {item.inventory_number}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.clamping_device_name}
                              </span>
                              {item.notes && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  — {item.notes}
                                </span>
                              )}
                              {/* Lagerorte */}
                              {item.storage_locations?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.storage_locations.map((loc, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {loc.location_code}{loc.compartment_code ? `-${loc.compartment_code}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <svg className="w-4 h-4 ml-auto text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          ))}
                          {/* Freitext-Notiz */}
                          {currentSetupSheet.clamping_description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2 pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                              {currentSetupSheet.clamping_description}
                            </p>
                          )}
                        </div>
                      ) : currentSetupSheet.clamping_description ? (
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {currentSetupSheet.clamping_description}
                        </dd>
                      ) : (
                        <dd className="text-sm text-gray-400 dark:text-gray-500 italic">
                          Keine Spannmittel zugeordnet
                        </dd>
                      )}
                    </div>

                    {/* Vorrichtungen */}
                    <div>
                      <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Vorrichtungen
                      </dt>
                      {(currentSetupSheet.fixtures?.length > 0 || currentSetupSheet.operation_fixtures?.length > 0) ? (
                        <div className="space-y-2">
                          {/* Direkt zugeordnete Vorrichtungen */}
                          {currentSetupSheet.fixtures?.map((item) => (
                            <Link
                              key={item.id}
                              to={`/fixtures/${item.fixture_id}`}
                              className="flex items-center gap-3 p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                              <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded font-medium">
                                {item.quantity}x
                              </span>
                              <span className="font-mono text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                {item.fixture_number}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {item.fixture_name || item.type_name}
                              </span>
                              {item.notes && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                                  — {item.notes}
                                </span>
                              )}
                              {/* Lagerorte */}
                              {item.storage_locations?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {item.storage_locations.map((loc, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      {loc.location_code}{loc.compartment_code ? `-${loc.compartment_code}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <svg className="w-4 h-4 ml-auto text-indigo-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          ))}
                          
                          {/* Via Operation zugeordnete Vorrichtungen */}
                          {currentSetupSheet.operation_fixtures?.map((item) => (
                            <Link
                              key={`op-${item.id}`}
                              to={`/fixtures/${item.id}`}
                              className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                              <span className="text-xs text-gray-500 dark:text-gray-400">📌</span>
                              <span className="font-mono text-sm text-gray-700 dark:text-gray-300 font-medium">
                                {item.fixture_number}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {item.fixture_name || item.type_name}
                              </span>
                              <svg className="w-4 h-4 ml-auto text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          ))}
                          {/* Freitext-Notiz */}
                          {currentSetupSheet.fixture_description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-2 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700">
                              {currentSetupSheet.fixture_description}
                            </p>
                          )}
                        </div>
                      ) : currentSetupSheet.fixture_description ? (
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {currentSetupSheet.fixture_description}
                        </dd>
                      ) : (
                        <dd className="text-sm text-gray-400 dark:text-gray-500 italic">
                          Keine Vorrichtungen zugeordnet
                        </dd>
                      )}
                    </div>
                  </div>
                )}

                {/* Nullpunkt */}
                {(currentSetupSheet.preset_number || currentSetupSheet.wcs_number) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Nullpunkt-System
                    </h3>
                    <dl className="grid grid-cols-2 gap-4">
                      {currentSetupSheet.control_type && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Steuerungstyp</dt>
                          <dd className="text-sm text-gray-900 dark:text-white uppercase">
                            {currentSetupSheet.control_type}
                          </dd>
                        </div>
                      )}
                      {currentSetupSheet.preset_number && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Preset-Nummer</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            {currentSetupSheet.preset_number}
                          </dd>
                        </div>
                      )}
                      {currentSetupSheet.wcs_number && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">WCS-Nummer</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            {currentSetupSheet.wcs_number}
                          </dd>
                        </div>
                      )}
                      {(currentSetupSheet.wcs_x || currentSetupSheet.wcs_y || currentSetupSheet.wcs_z) && (
                        <div className="col-span-2">
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Koordinaten</dt>
                          <dd className="text-sm text-gray-900 dark:text-white font-mono">
                            X: {currentSetupSheet.wcs_x || '0'} / 
                            Y: {currentSetupSheet.wcs_y || '0'} / 
                            Z: {currentSetupSheet.wcs_z || '0'}
                          </dd>
                        </div>
                      )}
                      {currentSetupSheet.reference_point && (
                        <div className="col-span-2">
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Referenzpunkt</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            {currentSetupSheet.reference_point}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Material */}
                {(currentSetupSheet.raw_material_dimensions || currentSetupSheet.material_specification) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Material
                    </h3>
                    <dl className="space-y-2">
                      {currentSetupSheet.raw_material_dimensions && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Rohmaß</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            {currentSetupSheet.raw_material_dimensions}
                          </dd>
                        </div>
                      )}
                      {currentSetupSheet.material_specification && (
                        <div>
                          <dt className="text-sm font-medium text-gray-600 dark:text-gray-400">Spezifikation</dt>
                          <dd className="text-sm text-gray-900 dark:text-white">
                            {currentSetupSheet.material_specification}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Anweisungen */}
                {(currentSetupSheet.setup_instructions || currentSetupSheet.special_notes) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Anweisungen
                    </h3>
                    {currentSetupSheet.setup_instructions && (
                      <div className="mb-4">
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Einrichtanleitung
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 font-mono">
                          {currentSetupSheet.setup_instructions}
                        </dd>
                      </div>
                    )}
                    {currentSetupSheet.special_notes && (
                      <div>
                        <dt className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Besonderheiten / Warnungen
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          {currentSetupSheet.special_notes}
                        </dd>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Actions */}
                {hasPermission('part.update') && (
                  <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Status ändern
                    </h3>
                    <SetupSheetStatusActions
                      setupSheetId={currentSetupSheet.id}
                      currentStatus={currentSetupSheet.status}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'clamping' && (
              <SetupSheetClampingFixtures
                setupSheet={currentSetupSheet}
                onUpdate={() => fetchSetupSheet(currentSetupSheet.id)}
              />
            )}

            {activeTab === 'photos' && (
              <SetupSheetPhotos
                setupSheetId={currentSetupSheet.id}
                photos={currentSetupSheet.photos}
                onPhotoChange={handlePhotoChange}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show List
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Einrichteblätter
        </h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neues Einrichteblatt
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-300">{error}</p>
        </div>
      )}

      {setupSheets.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Noch keine Einrichteblätter vorhanden
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            Erstes Einrichteblatt erstellen
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {setupSheets.map((sheet) => (
            <div key={sheet.id} onClick={() => handleView(sheet)} className="cursor-pointer">
              <SetupSheetCard
                setupSheet={sheet}
                onEdit={(sheet, e) => {
                  e.stopPropagation();
                  handleEdit(sheet);
                }}
                onDelete={(id, e) => {
                  e.stopPropagation();
                  handleDelete(id);
                }}
                onStatusChange={handleStatusChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
