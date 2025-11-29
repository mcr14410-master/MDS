// frontend/src/components/SetupSheetClampingFixtures.jsx
/**
 * Komponente für Spannmittel & Vorrichtungen Zuordnung in Setup Sheets
 * 
 * Features:
 * - Suchbare Dropdowns für Spannmittel und Vorrichtungen
 * - Mengenangabe
 * - Anzeige der via Operation zugeordneten Vorrichtungen
 * - Freitextfelder bleiben erhalten
 */

import { useState, useEffect, useMemo } from 'react';
import { useSetupSheetsStore } from '../stores/setupSheetsStore';
import axios from '../utils/axios';
import { toast } from './Toaster';

export default function SetupSheetClampingFixtures({ 
  setupSheet, 
  onUpdate,
  readOnly = false 
}) {
  const { 
    addClampingDevice, 
    updateClampingDevice,
    removeClampingDevice,
    addFixture,
    updateFixture,
    removeFixture 
  } = useSetupSheetsStore();

  // Spannmittel State
  const [clampingDevices, setClampingDevices] = useState([]);
  const [clampingSearch, setClampingSearch] = useState('');
  const [showClampingDropdown, setShowClampingDropdown] = useState(false);
  const [clampingQuantity, setClampingQuantity] = useState(1);
  const [selectedClamping, setSelectedClamping] = useState(null);
  const [clampingNotes, setClampingNotes] = useState('');

  // Vorrichtungen State
  const [fixtures, setFixtures] = useState([]);
  const [fixtureSearch, setFixtureSearch] = useState('');
  const [showFixtureDropdown, setShowFixtureDropdown] = useState(false);
  const [fixtureQuantity, setFixtureQuantity] = useState(1);
  const [selectedFixture, setSelectedFixture] = useState(null);
  const [fixtureNotes, setFixtureNotes] = useState('');

  // Inline-Editing State
  const [editingClampingId, setEditingClampingId] = useState(null);
  const [editingFixtureId, setEditingFixtureId] = useState(null);
  const [editQuantity, setEditQuantity] = useState(1);
  const [editNotes, setEditNotes] = useState('');

  const [loading, setLoading] = useState(false);

  // Lade Spannmittel für Suche
  useEffect(() => {
    const loadClampingDevices = async () => {
      try {
        const response = await axios.get('/api/clamping-devices?status=active');
        setClampingDevices(response.data?.data || []);
      } catch (error) {
        console.error('Error loading clamping devices:', error);
      }
    };
    loadClampingDevices();
  }, []);

  // Lade Vorrichtungen für Suche
  useEffect(() => {
    const loadFixtures = async () => {
      try {
        const response = await axios.get('/api/fixtures?status=active');
        setFixtures(response.data?.data || []);
      } catch (error) {
        console.error('Error loading fixtures:', error);
      }
    };
    loadFixtures();
  }, []);

  // Gefilterte Listen
  const filteredClampingDevices = useMemo(() => {
    if (!clampingSearch.trim()) return clampingDevices.slice(0, 20);
    const search = clampingSearch.toLowerCase();
    return clampingDevices.filter(cd => 
      cd.inventory_number?.toLowerCase().includes(search) ||
      cd.name?.toLowerCase().includes(search) ||
      cd.type_name?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [clampingDevices, clampingSearch]);

  const filteredFixtures = useMemo(() => {
    if (!fixtureSearch.trim()) return fixtures.slice(0, 20);
    const search = fixtureSearch.toLowerCase();
    return fixtures.filter(f => 
      f.fixture_number?.toLowerCase().includes(search) ||
      f.name?.toLowerCase().includes(search) ||
      f.type_name?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [fixtures, fixtureSearch]);

  // IDs der bereits zugeordneten Items
  const assignedClampingIds = useMemo(() => 
    new Set(setupSheet.clamping_devices?.map(cd => cd.clamping_device_id) || []),
    [setupSheet.clamping_devices]
  );

  const assignedFixtureIds = useMemo(() => 
    new Set(setupSheet.fixtures?.map(f => f.fixture_id) || []),
    [setupSheet.fixtures]
  );

  // Handler - Spannmittel auswählen (noch nicht hinzufügen)
  const handleSelectClamping = (device) => {
    if (assignedClampingIds.has(device.id)) {
      toast.warning('Spannmittel bereits zugeordnet');
      return;
    }
    setSelectedClamping(device);
    setClampingSearch('');
    setShowClampingDropdown(false);
  };

  // Handler - Spannmittel tatsächlich hinzufügen
  const handleAddClampingDevice = async () => {
    if (!selectedClamping) return;

    setLoading(true);
    try {
      const result = await addClampingDevice(setupSheet.id, selectedClamping.id, clampingQuantity, clampingNotes);
      if (result.success) {
        toast.success('Spannmittel hinzugefügt');
        setSelectedClamping(null);
        setClampingQuantity(1);
        setClampingNotes('');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler beim Hinzufügen');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler - Auswahl abbrechen
  const handleCancelClamping = () => {
    setSelectedClamping(null);
    setClampingQuantity(1);
    setClampingNotes('');
  };

  // Handler - Inline Edit starten (Spannmittel)
  const handleStartEditClamping = (item) => {
    setEditingClampingId(item.id);
    setEditQuantity(item.quantity);
    setEditNotes(item.notes || '');
  };

  // Handler - Inline Edit speichern (Spannmittel)
  const handleSaveEditClamping = async () => {
    if (!editingClampingId) return;
    
    setLoading(true);
    try {
      const result = await updateClampingDevice(setupSheet.id, editingClampingId, {
        quantity: editQuantity,
        notes: editNotes
      });
      if (result.success) {
        toast.success('Gespeichert');
        setEditingClampingId(null);
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler beim Speichern');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler - Inline Edit abbrechen (Spannmittel)
  const handleCancelEditClamping = () => {
    setEditingClampingId(null);
    setEditQuantity(1);
    setEditNotes('');
  };

  const handleRemoveClampingDevice = async (itemId) => {
    if (!confirm('Spannmittel-Zuordnung entfernen?')) return;
    
    setLoading(true);
    try {
      const result = await removeClampingDevice(setupSheet.id, itemId);
      if (result.success) {
        toast.success('Entfernt');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler - Vorrichtung auswählen (noch nicht hinzufügen)
  const handleSelectFixture = (fixture) => {
    if (assignedFixtureIds.has(fixture.id)) {
      toast.warning('Vorrichtung bereits zugeordnet');
      return;
    }
    setSelectedFixture(fixture);
    setFixtureSearch('');
    setShowFixtureDropdown(false);
  };

  // Handler - Vorrichtung tatsächlich hinzufügen
  const handleAddFixture = async () => {
    if (!selectedFixture) return;

    setLoading(true);
    try {
      const result = await addFixture(setupSheet.id, selectedFixture.id, fixtureQuantity, fixtureNotes);
      if (result.success) {
        toast.success('Vorrichtung hinzugefügt');
        setSelectedFixture(null);
        setFixtureQuantity(1);
        setFixtureNotes('');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler beim Hinzufügen');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler - Auswahl abbrechen
  const handleCancelFixture = () => {
    setSelectedFixture(null);
    setFixtureQuantity(1);
    setFixtureNotes('');
  };

  // Handler - Inline Edit starten (Vorrichtung)
  const handleStartEditFixture = (item) => {
    setEditingFixtureId(item.id);
    setEditQuantity(item.quantity);
    setEditNotes(item.notes || '');
  };

  // Handler - Inline Edit speichern (Vorrichtung)
  const handleSaveEditFixture = async () => {
    if (!editingFixtureId) return;
    
    setLoading(true);
    try {
      const result = await updateFixture(setupSheet.id, editingFixtureId, {
        quantity: editQuantity,
        notes: editNotes
      });
      if (result.success) {
        toast.success('Gespeichert');
        setEditingFixtureId(null);
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler beim Speichern');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handler - Inline Edit abbrechen (Vorrichtung)
  const handleCancelEditFixture = () => {
    setEditingFixtureId(null);
    setEditQuantity(1);
    setEditNotes('');
  };

  const handleRemoveFixture = async (itemId) => {
    if (!confirm('Vorrichtung-Zuordnung entfernen?')) return;
    
    setLoading(true);
    try {
      const result = await removeFixture(setupSheet.id, itemId);
      if (result.success) {
        toast.success('Entfernt');
        if (onUpdate) onUpdate();
      } else {
        toast.error(result.error || 'Fehler');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* =========== SPANNMITTEL =========== */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          Spannmittel
        </h3>

        {/* Zugeordnete Spannmittel */}
        {setupSheet.clamping_devices?.length > 0 && (
          <div className="space-y-2 mb-4">
            {setupSheet.clamping_devices.map((item) => (
              <div key={item.id}>
                {editingClampingId === item.id ? (
                  /* Inline-Edit Modus */
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-lg border-2 border-purple-400 dark:border-purple-600">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-purple-700 dark:text-purple-300 font-medium">
                        {item.inventory_number}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.clamping_device_name}
                      </span>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anzahl</label>
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notiz</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="z.B. Position, Hinweise..."
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <button
                        onClick={handleSaveEditClamping}
                        disabled={loading}
                        className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        title="Speichern"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEditClamping}
                        className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600"
                        title="Abbrechen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Anzeige-Modus */
                  <div 
                    className={`flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 ${!readOnly ? 'cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30' : ''}`}
                    onClick={() => !readOnly && handleStartEditClamping(item)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded font-medium">
                        {item.quantity}x
                      </span>
                      <span className="font-mono text-sm text-purple-700 dark:text-purple-300">
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
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEditClamping(item); }}
                          className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveClampingDevice(item.id); }}
                          disabled={loading}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Entfernen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hinzufügen */}
        {!readOnly && (
          <div className="space-y-3">
            {/* Ausgewähltes Spannmittel anzeigen */}
            {selectedClamping ? (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-purple-700 dark:text-purple-300">
                      {selectedClamping.inventory_number}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {selectedClamping.name}
                    </span>
                  </div>
                  <button
                    onClick={handleCancelClamping}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Auswahl aufheben"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anzahl</label>
                    <input
                      type="number"
                      min="1"
                      value={clampingQuantity}
                      onChange={(e) => setClampingQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notiz (optional)</label>
                    <input
                      type="text"
                      value={clampingNotes}
                      onChange={(e) => setClampingNotes(e.target.value)}
                      placeholder="z.B. Position, Hinweise..."
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={handleAddClampingDevice}
                    disabled={loading}
                    className="px-4 py-1.5 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Übernehmen
                  </button>
                </div>
              </div>
            ) : (
              /* Suchfeld */
              <div className="relative">
                <input
                  type="text"
                  value={clampingSearch}
                  onChange={(e) => {
                    setClampingSearch(e.target.value);
                    setShowClampingDropdown(true);
                  }}
                  onFocus={() => setShowClampingDropdown(true)}
                  placeholder="Spannmittel suchen..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                
                {showClampingDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowClampingDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredClampingDevices.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Keine gefunden</div>
                      ) : (
                        filteredClampingDevices.map((cd) => (
                          <button
                            key={cd.id}
                            onClick={() => handleSelectClamping(cd)}
                            disabled={assignedClampingIds.has(cd.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between
                              ${assignedClampingIds.has(cd.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div>
                              <span className="font-mono font-medium text-purple-600 dark:text-purple-400">
                                {cd.inventory_number}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300 ml-2">
                                {cd.name}
                              </span>
                            </div>
                            {assignedClampingIds.has(cd.id) && (
                              <span className="text-xs text-green-500">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========== VORRICHTUNGEN =========== */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Vorrichtungen
        </h3>

        {/* Via Operation zugeordnete Vorrichtungen (Schmankerl) */}
        {setupSheet.operation_fixtures?.length > 0 && (
          <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2 font-medium">
              📌 Via Operation zugeordnet:
            </p>
            <div className="space-y-1">
              {setupSheet.operation_fixtures.map((f) => (
                <div key={f.id} className="text-sm text-indigo-700 dark:text-indigo-300">
                  <span className="font-mono">{f.fixture_number}</span>
                  {f.fixture_name && <span className="ml-2 text-indigo-500">{f.fixture_name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zugeordnete Vorrichtungen */}
        {setupSheet.fixtures?.length > 0 && (
          <div className="space-y-2 mb-4">
            {setupSheet.fixtures.map((item) => (
              <div key={item.id}>
                {editingFixtureId === item.id ? (
                  /* Inline-Edit Modus */
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg border-2 border-indigo-400 dark:border-indigo-600">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                        {item.fixture_number}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.fixture_name}
                      </span>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anzahl</label>
                        <input
                          type="number"
                          min="1"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                          className="w-20 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notiz</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="z.B. Position, Hinweise..."
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                      <button
                        onClick={handleSaveEditFixture}
                        disabled={loading}
                        className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                        title="Speichern"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={handleCancelEditFixture}
                        className="px-3 py-1.5 bg-gray-500 text-white rounded hover:bg-gray-600"
                        title="Abbrechen"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Anzeige-Modus */
                  <div 
                    className={`flex items-center justify-between p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 ${!readOnly ? 'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/30' : ''}`}
                    onClick={() => !readOnly && handleStartEditFixture(item)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2 py-0.5 rounded font-medium">
                        {item.quantity}x
                      </span>
                      <span className="font-mono text-sm text-indigo-700 dark:text-indigo-300">
                        {item.fixture_number}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.fixture_name}
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
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartEditFixture(item); }}
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRemoveFixture(item.id); }}
                          disabled={loading}
                          className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Entfernen"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hinzufügen */}
        {!readOnly && (
          <div className="space-y-3">
            {/* Ausgewählte Vorrichtung anzeigen */}
            {selectedFixture ? (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-300 dark:border-indigo-700">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-indigo-700 dark:text-indigo-300">
                      {selectedFixture.fixture_number}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {selectedFixture.name || selectedFixture.type_name}
                    </span>
                  </div>
                  <button
                    onClick={handleCancelFixture}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Auswahl aufheben"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Anzahl</label>
                    <input
                      type="number"
                      min="1"
                      value={fixtureQuantity}
                      onChange={(e) => setFixtureQuantity(parseInt(e.target.value) || 1)}
                      className="w-20 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Notiz (optional)</label>
                    <input
                      type="text"
                      value={fixtureNotes}
                      onChange={(e) => setFixtureNotes(e.target.value)}
                      placeholder="z.B. Position, Hinweise..."
                      className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <button
                    onClick={handleAddFixture}
                    disabled={loading}
                    className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Übernehmen
                  </button>
                </div>
              </div>
            ) : (
              /* Suchfeld */
              <div className="relative">
                <input
                  type="text"
                  value={fixtureSearch}
                  onChange={(e) => {
                    setFixtureSearch(e.target.value);
                    setShowFixtureDropdown(true);
                  }}
                  onFocus={() => setShowFixtureDropdown(true)}
                  placeholder="Vorrichtung suchen..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                
                {showFixtureDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowFixtureDropdown(false)} />
                    <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredFixtures.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Keine gefunden</div>
                      ) : (
                        filteredFixtures.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => handleSelectFixture(f)}
                            disabled={assignedFixtureIds.has(f.id)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between
                              ${assignedFixtureIds.has(f.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div>
                              <span className="font-mono font-medium text-indigo-600 dark:text-indigo-400">
                                {f.fixture_number}
                              </span>
                              <span className="text-gray-600 dark:text-gray-300 ml-2">
                                {f.name || f.type_name}
                              </span>
                            </div>
                            {assignedFixtureIds.has(f.id) && (
                              <span className="text-xs text-green-500">✓</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
