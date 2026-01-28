// frontend/src/pages/ZerobotPage.jsx
/**
 * Zerobot Positionsrechner
 * 
 * Tool zur Berechnung von Beladeroboter-Positionen für die Serienfertigung.
 * Ermöglicht die Eingabe von Bauteilparametern und berechnet automatisch
 * alle relevanten Positionen für das Beladeprogramm.
 */

import { useState, useEffect } from 'react';
import { useZerobotStore } from '../stores/zerobotStore';
import { useAuthStore } from '../stores/authStore';
import { InfoButton, DiagramModal, ZerobotExplanationDiagram } from '../components/zerobot/ZerobotDiagram';

export default function ZerobotPage() {
  const [activeTab, setActiveTab] = useState('calculate');
  const { hasRole } = useAuthStore();
  const isAdmin = hasRole('admin');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Zerobot Positionsrechner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Berechnung von Aufnahme- und Ablagepositionen für Beladeroboter
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'calculate'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Berechnung
          </button>
          <button
            onClick={() => setActiveTab('params')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'params'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Parameter {isAdmin && '(Admin)'}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'calculate' && <CalculationTab />}
      {activeTab === 'params' && <ParametersTab isAdmin={isAdmin} />}
    </div>
  );
}

// ============================================
// CALCULATION TAB
// ============================================
function CalculationTab() {
  const { config, fetchConfig, calculate, calculationResult, clearCalculation, loading, error } = useZerobotStore();
  const [showDiagram, setShowDiagram] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    machine: '',
    jaw: '',
    TeilB: '',
    TeilL: '',
    c: '',
    NumS: '1',
    d: '',
    isKleinteil: false,
    useCustomD: false
  });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Set defaults when config loads
  useEffect(() => {
    if (config && !formData.machine) {
      const machines = Object.keys(config.machines || {});
      const jaws = config.jaw || [];
      setFormData(prev => ({
        ...prev,
        machine: machines[0] || '',
        jaw: jaws[0]?.config_key || ''
      }));
    }
  }, [config]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    try {
      await calculate({
        machine: formData.machine,
        jaw: formData.jaw,
        TeilB: parseFloat(formData.TeilB),
        TeilL: parseFloat(formData.TeilL),
        c: parseFloat(formData.c),
        NumS: parseInt(formData.NumS),
        d: formData.useCustomD && formData.d ? parseFloat(formData.d) : null,
        isKleinteil: formData.isKleinteil
      });
    } catch (err) {
      console.error('Calculation error:', err);
    }
  };

  const handleReset = () => {
    setFormData(prev => ({
      ...prev,
      TeilB: '',
      TeilL: '',
      c: '',
      NumS: '1',
      d: '',
      isKleinteil: false,
      useCustomD: false
    }));
    clearCalculation();
  };

  if (loading && !config) {
    return <div className="text-center py-8">Lade Konfiguration...</div>;
  }

  const machines = Object.keys(config?.machines || {});
  const jaws = config?.jaw || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Eingabe-Formular */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Eingabeparameter
          </h2>
          <InfoButton onClick={() => setShowDiagram(true)} />
        </div>
        
        <form onSubmit={handleCalculate} className="space-y-4">
          {/* Maschine & Backen */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maschine
              </label>
              <select
                name="machine"
                value={formData.machine}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {machines.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Backen
              </label>
              <select
                name="jaw"
                value={formData.jaw}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {jaws.map(j => (
                  <option key={j.config_key} value={j.config_key}>{j.display_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bauteilmaße */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bauteil Breite X (TeilB)
              </label>
              <input
                type="number"
                name="TeilB"
                value={formData.TeilB}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="mm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bauteil Länge Y (TeilL)
              </label>
              <input
                type="number"
                name="TeilL"
                value={formData.TeilL}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="mm"
                required
              />
            </div>
          </div>

          {/* Greifer & Schraubenreihe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Greiferspannlänge (c)
              </label>
              <input
                type="number"
                name="c"
                value={formData.c}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="mm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Schraubenreihe Nr. (NumS)
              </label>
              <input
                type="number"
                name="NumS"
                value={formData.NumS}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Winkelabstand - Optional überschreibbar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useCustomD"
                name="useCustomD"
                checked={formData.useCustomD}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="useCustomD" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Winkelabstand manuell eingeben
              </label>
            </div>
            
            {formData.useCustomD && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Winkelabstand (d)
                </label>
                <input
                  type="number"
                  name="d"
                  value={formData.d}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="mm (Standard: TeilB - 14)"
                />
              </div>
            )}
          </div>

          {/* Kleinteil Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isKleinteil"
              name="isKleinteil"
              checked={formData.isKleinteil}
              onChange={handleChange}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isKleinteil" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Kleinteil (mit zusätzlichem X-Versatz)
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Berechne...' : 'Berechnen'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Zurücksetzen
            </button>
          </div>
        </form>

        {/* Workflow-Hinweis */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workflow</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Bauteil/Rohteil messen → <span className="font-mono text-amber-600">TeilL</span> und <span className="font-mono text-amber-600">TeilB</span></li>
            <li>Greifer einstellen → <span className="font-mono text-purple-600">c</span> messen</li>
            <li>Einstellwerte berechnen</li>
            <li>Rack einstellen (Winkel mit Abstand <span className="font-mono text-red-600">d</span>)</li>
            <li>Schraubstock einrichten</li>
            <li>Beladeprogramm einstellen</li>
          </ol>
        </div>
      </div>

      {/* Ergebnisse */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Berechnete Werte
        </h2>

        {calculationResult ? (
          <div className="space-y-6">
            {/* Winkelabstand & Teileabstand */}
            <div className="space-y-3">
              <ResultRow 
                label="Empfohlener Winkelabstand (d)" 
                value={calculationResult.calculated.d.value}
                formula={calculationResult.calculated.d.formula}
                highlight={calculationResult.input.d_custom !== null}
                used={calculationResult.calculated.d.used}
              />
              <ResultRow 
                label="Teileabstand X" 
                value={calculationResult.calculated.teileabstandX.value}
                formula={calculationResult.calculated.teileabstandX.formula}
              />
              <ResultRow 
                label="Rack Sicherheitsabstand" 
                value={calculationResult.calculated.rackSicherheitsabstand.value}
                formula={calculationResult.calculated.rackSicherheitsabstand.formula}
              />
            </div>

            {/* Rack Aufnahmeposition */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                Rack Aufnahmeposition
              </h3>
              <div className="space-y-2">
                <ResultRow 
                  label="X" 
                  value={calculationResult.calculated.rackAufnahme.X.value}
                  formula={calculationResult.calculated.rackAufnahme.X.formula}
                />
                <ResultRow 
                  label="Y" 
                  value={calculationResult.calculated.rackAufnahme.Y.value}
                  formula={calculationResult.calculated.rackAufnahme.Y.formula}
                />
                <ResultRow 
                  label="Z" 
                  value={calculationResult.calculated.rackAufnahme.Z.value}
                  formula={calculationResult.calculated.rackAufnahme.Z.formula}
                />
              </div>
            </div>

            {/* Maschine Aufnahmeposition */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-200 dark:border-gray-700 pb-1">
                Maschine Aufnahmeposition
              </h3>
              <div className="space-y-2">
                <ResultRow 
                  label="X" 
                  value={calculationResult.calculated.maschineAufnahme.X.value}
                  formula={calculationResult.calculated.maschineAufnahme.X.formula}
                />
                <ResultRow 
                  label="Y" 
                  value={calculationResult.calculated.maschineAufnahme.Y.value}
                  formula={calculationResult.calculated.maschineAufnahme.Y.formula}
                />
                <ResultRow 
                  label="Z" 
                  value={calculationResult.calculated.maschineAufnahme.Z.value}
                  formula={calculationResult.calculated.maschineAufnahme.Z.formula}
                />
              </div>
            </div>

            {/* Verwendete Konfiguration */}
            <details className="text-xs text-gray-500 dark:text-gray-400">
              <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Verwendete Konfiguration anzeigen
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-x-auto">
                {JSON.stringify(calculationResult.configUsed, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p>Geben Sie die Bauteilparameter ein und klicken Sie auf "Berechnen"</p>
          </div>
        )}
      </div>

      {/* Diagramm Modal */}
      <DiagramModal 
        isOpen={showDiagram} 
        onClose={() => setShowDiagram(false)}
        title="Parameter-Erklärung"
      >
        <ZerobotExplanationDiagram />
      </DiagramModal>
    </div>
  );
}

// Ergebnis-Zeile Komponente
function ResultRow({ label, value, formula, highlight, used }) {
  const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
  const usedValue = used !== undefined ? used.toFixed(2) : null;
  
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex-1">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        {formula && (
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({formula})</span>
        )}
      </div>
      <div className="text-right">
        <span className={`font-mono font-semibold ${highlight ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>
          {displayValue}
        </span>
        {usedValue && usedValue !== displayValue && (
          <span className="text-xs text-green-600 dark:text-green-400 ml-2">
            → verwendet: {usedValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================
// PARAMETERS TAB
// ============================================
function ParametersTab({ isAdmin }) {
  const { config, fetchConfig, updateConfig, addMachine, deleteMachine, addJaw, deleteJaw, loading } = useZerobotStore();
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAddMachine, setShowAddMachine] = useState(false);
  const [showAddJaw, setShowAddJaw] = useState(false);
  const [newMachine, setNewMachine] = useState({ machine_name: '', e: '', a: '', VersatzZ: '' });
  const [newJaw, setNewJaw] = useState({ config_key: '', config_value: '', display_name: '' });

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleEdit = (param) => {
    setEditingId(param.id);
    setEditValue(param.config_value);
  };

  const handleSave = async (id) => {
    try {
      await updateConfig(id, { config_value: parseFloat(editValue) });
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddMachine = async (e) => {
    e.preventDefault();
    try {
      await addMachine({
        machine_name: newMachine.machine_name,
        e: parseFloat(newMachine.e),
        a: parseFloat(newMachine.a),
        VersatzZ: parseFloat(newMachine.VersatzZ)
      });
      setNewMachine({ machine_name: '', e: '', a: '', VersatzZ: '' });
      setShowAddMachine(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMachine = async (name) => {
    if (confirm(`Maschine "${name}" wirklich löschen?`)) {
      try {
        await deleteMachine(name);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleAddJaw = async (e) => {
    e.preventDefault();
    try {
      await addJaw({
        config_key: newJaw.config_key,
        config_value: parseFloat(newJaw.config_value),
        display_name: newJaw.display_name || newJaw.config_key
      });
      setNewJaw({ config_key: '', config_value: '', display_name: '' });
      setShowAddJaw(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteJaw = async (id, name) => {
    if (confirm(`Backentyp "${name}" wirklich löschen?`)) {
      try {
        await deleteJaw(id);
      } catch (err) {
        alert(err.message);
      }
    }
  };

  if (loading && !config) {
    return <div className="text-center py-8">Lade Parameter...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Globale Parameter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Globale Parameter
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Parameter</th>
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Schlüssel</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Wert</th>
                {isAdmin && <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Aktion</th>}
              </tr>
            </thead>
            <tbody>
              {config?.global?.map(param => (
                <tr key={param.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-3 text-gray-900 dark:text-white">{param.display_name}</td>
                  <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{param.config_key}</td>
                  <td className="py-2 px-3 text-right">
                    {editingId === param.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        step="0.01"
                        className="w-24 px-2 py-1 border rounded text-right"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono text-gray-900 dark:text-white">{parseFloat(param.config_value).toFixed(2)}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-3 text-right">
                      {editingId === param.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleSave(param.id)} className="text-green-600 hover:text-green-800 text-xs">Speichern</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Abbrechen</button>
                        </div>
                      ) : (
                        <button onClick={() => handleEdit(param)} className="text-blue-600 hover:text-blue-800 text-xs">Bearbeiten</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Backenhöhen */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Backenhöhen
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddJaw(!showAddJaw)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Backentyp hinzufügen
            </button>
          )}
        </div>

        {showAddJaw && isAdmin && (
          <form onSubmit={handleAddJaw} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Schlüssel (z.B. B150)"
                value={newJaw.config_key}
                onChange={(e) => setNewJaw(prev => ({ ...prev, config_key: e.target.value }))}
                className="px-2 py-1 border rounded text-sm"
                required
              />
              <input
                type="text"
                placeholder="Anzeigename"
                value={newJaw.display_name}
                onChange={(e) => setNewJaw(prev => ({ ...prev, display_name: e.target.value }))}
                className="px-2 py-1 border rounded text-sm"
              />
              <input
                type="number"
                placeholder="Höhe (mm)"
                value={newJaw.config_value}
                onChange={(e) => setNewJaw(prev => ({ ...prev, config_value: e.target.value }))}
                step="0.01"
                className="px-2 py-1 border rounded text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowAddJaw(false)} className="text-xs text-gray-500">Abbrechen</button>
              <button type="submit" className="text-xs text-blue-600">Hinzufügen</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Backentyp</th>
                <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Höhe (mm)</th>
                {isAdmin && <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Aktion</th>}
              </tr>
            </thead>
            <tbody>
              {config?.jaw?.map(param => (
                <tr key={param.id} className="border-b border-gray-100 dark:border-gray-700/50">
                  <td className="py-2 px-3 text-gray-900 dark:text-white">{param.display_name}</td>
                  <td className="py-2 px-3 text-right">
                    {editingId === param.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        step="0.01"
                        className="w-24 px-2 py-1 border rounded text-right"
                        autoFocus
                      />
                    ) : (
                      <span className="font-mono text-gray-900 dark:text-white">{parseFloat(param.config_value).toFixed(2)}</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-3 text-right">
                      {editingId === param.id ? (
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handleSave(param.id)} className="text-green-600 hover:text-green-800 text-xs">Speichern</button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Abbrechen</button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(param)} className="text-blue-600 hover:text-blue-800 text-xs">Bearbeiten</button>
                          <button onClick={() => handleDeleteJaw(param.id, param.display_name)} className="text-red-600 hover:text-red-800 text-xs">Löschen</button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maschinenspezifische Parameter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Maschinenspezifische Parameter
          </h2>
          {isAdmin && (
            <button
              onClick={() => setShowAddMachine(!showAddMachine)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + Maschine hinzufügen
            </button>
          )}
        </div>

        {showAddMachine && isAdmin && (
          <form onSubmit={handleAddMachine} className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Maschinenname"
                value={newMachine.machine_name}
                onChange={(e) => setNewMachine(prev => ({ ...prev, machine_name: e.target.value }))}
                className="px-2 py-1 border rounded text-sm"
                required
              />
              <input
                type="number"
                placeholder="e (Anschlagpunkt Y)"
                value={newMachine.e}
                onChange={(e) => setNewMachine(prev => ({ ...prev, e: e.target.value }))}
                step="0.01"
                className="px-2 py-1 border rounded text-sm"
                required
              />
              <input
                type="number"
                placeholder="a (Winkel Länge)"
                value={newMachine.a}
                onChange={(e) => setNewMachine(prev => ({ ...prev, a: e.target.value }))}
                step="0.01"
                className="px-2 py-1 border rounded text-sm"
                required
              />
              <input
                type="number"
                placeholder="VersatzZ"
                value={newMachine.VersatzZ}
                onChange={(e) => setNewMachine(prev => ({ ...prev, VersatzZ: e.target.value }))}
                step="0.01"
                className="px-2 py-1 border rounded text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowAddMachine(false)} className="text-xs text-gray-500">Abbrechen</button>
              <button type="submit" className="text-xs text-blue-600">Hinzufügen</button>
            </div>
          </form>
        )}

        {Object.entries(config?.machines || {}).map(([machineName, params]) => (
          <div key={machineName} className="mb-6 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{machineName}</h3>
              {isAdmin && (
                <button
                  onClick={() => handleDeleteMachine(machineName)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Maschine löschen
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Parameter</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Schlüssel</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Wert</th>
                  {isAdmin && <th className="text-right py-2 px-3 font-medium text-gray-700 dark:text-gray-300">Aktion</th>}
                </tr>
              </thead>
              <tbody>
                {params.map(param => (
                  <tr key={param.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-2 px-3 text-gray-900 dark:text-white">{param.display_name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{param.config_key}</td>
                    <td className="py-2 px-3 text-right">
                      {editingId === param.id ? (
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          step="0.01"
                          className="w-24 px-2 py-1 border rounded text-right"
                          autoFocus
                        />
                      ) : (
                        <span className="font-mono text-gray-900 dark:text-white">{parseFloat(param.config_value).toFixed(2)}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-3 text-right">
                        {editingId === param.id ? (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => handleSave(param.id)} className="text-green-600 hover:text-green-800 text-xs">Speichern</button>
                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 text-xs">Abbrechen</button>
                          </div>
                        ) : (
                          <button onClick={() => handleEdit(param)} className="text-blue-600 hover:text-blue-800 text-xs">Bearbeiten</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
