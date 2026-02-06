import { useState, useEffect } from 'react';
import { Users, Clock, CreditCard, Key, Check, AlertTriangle, Search, ChevronDown, ChevronUp, Calendar, Edit2 } from 'lucide-react';
import axios from '../../utils/axios';

export default function EmployeeSettingsPanel() {
  const [employees, setEmployees] = useState([]);
  const [timeModels, setTimeModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [saving, setSaving] = useState({});

  // Load employees and time models
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [usersRes, modelsRes] = await Promise.all([
          axios.get('/api/users'),
          axios.get('/api/time-tracking/models')
        ]);
        
        // Filter to only real employees (active, not system accounts)
        const realEmployees = (usersRes.data.users || []).filter(u => 
          u.is_active && 
          !u.username?.startsWith('system_') && 
          !u.username?.startsWith('api_')
        );
        
        setEmployees(realEmployees);
        setTimeModels(modelsRes.data);
      } catch (err) {
        setError('Fehler beim Laden der Daten');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Update employee field
  const handleUpdate = async (userId, field, value) => {
    setSaving(prev => ({ ...prev, [userId]: true }));
    setError(null);
    
    try {
      await axios.put(`/api/users/${userId}`, { [field]: value });
      
      setEmployees(prev => prev.map(emp => 
        emp.id === userId ? { ...emp, [field]: value } : emp
      ));
      
      setSuccess('Gespeichert');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setSaving(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Toggle checkbox
  const handleToggle = async (userId, field, currentValue) => {
    // Bei Deaktivierung der Zeiterfassung: time_model_id zurücksetzen
    if (field === 'time_tracking_enabled' && currentValue === true) {
      // Zeiterfassung wird deaktiviert → time_model_id auf NULL setzen
      setSaving(prev => ({ ...prev, [userId]: true }));
      setError(null);
      
      try {
        await axios.put(`/api/users/${userId}`, { 
          time_tracking_enabled: false,
          time_model_id: null 
        });
        
        setEmployees(prev => prev.map(emp => 
          emp.id === userId 
            ? { ...emp, time_tracking_enabled: false, time_model_id: null } 
            : emp
        ));
        
        setSuccess('Gespeichert');
        setTimeout(() => setSuccess(null), 2000);
      } catch (err) {
        setError(err.response?.data?.error || 'Fehler beim Speichern');
      } finally {
        setSaving(prev => ({ ...prev, [userId]: false }));
      }
    } else {
      await handleUpdate(userId, field, !currentValue);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    // Nur Mitarbeiter mit aktiver Funktion, wenn nicht "Alle anzeigen"
    if (!showAll && !emp.vacation_tracking_enabled && !emp.time_tracking_enabled) {
      return false;
    }
    
    const search = searchTerm.toLowerCase();
    return (
      emp.first_name?.toLowerCase().includes(search) ||
      emp.last_name?.toLowerCase().includes(search) ||
      emp.username?.toLowerCase().includes(search)
    );
  });

  // Anzahl der ausgeblendeten Mitarbeiter
  const hiddenCount = employees.filter(emp => 
    !emp.vacation_tracking_enabled && !emp.time_tracking_enabled
  ).length;

  // Get time model name
  const getTimeModelName = (modelId) => {
    const model = timeModels.find(m => m.id === modelId);
    return model ? `${model.name} (${(model.weekly_minutes / 60).toFixed(1)}h/Wo)` : '–';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          Mitarbeiter-Einstellungen
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Zeit- und Urlaubsverwaltung pro Mitarbeiter konfigurieren
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Check className="h-4 w-4" />
            <span className="text-sm">{success}</span>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Mitarbeiter suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              showAll
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {showAll ? (
              <>Alle ({employees.length})</>
            ) : (
              <>+{hiddenCount} ohne Funktion</>
            )}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex flex-wrap gap-4">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Urlaub = Urlaubsverwaltung</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Zeit = Zeiterfassung</span>
          <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> RFID = Terminal-Chip</span>
          <span className="flex items-center gap-1"><Key className="h-3 w-3" /> PIN = Terminal-Code</span>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Mitarbeiter</th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Urlaubsverwaltung">
                <Calendar className="h-4 w-4 inline" />
              </th>
              <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Zeiterfassung">
                <Clock className="h-4 w-4 inline" />
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">Zeitmodell</th>
              <th className="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">RFID / PIN</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const isExpanded = expandedId === emp.id;
              const isSaving = saving[emp.id];
              
              return (
                <tr 
                  key={emp.id} 
                  className={`border-t border-gray-100 dark:border-gray-700 transition-colors ${
                    isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {emp.first_name} {emp.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">@{emp.username}</div>
                  </td>
                  
                  <td className="text-center py-3 px-2">
                    <button
                      onClick={() => handleToggle(emp.id, 'vacation_tracking_enabled', emp.vacation_tracking_enabled)}
                      disabled={isSaving}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        emp.vacation_tracking_enabled
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                      } ${isSaving ? 'opacity-50' : ''}`}
                      title={emp.vacation_tracking_enabled ? 'Urlaubsverwaltung aktiv' : 'Urlaubsverwaltung deaktiviert'}
                    >
                      {emp.vacation_tracking_enabled ? '✓' : '–'}
                    </button>
                  </td>
                  
                  <td className="text-center py-3 px-2">
                    <button
                      onClick={() => handleToggle(emp.id, 'time_tracking_enabled', emp.time_tracking_enabled)}
                      disabled={isSaving}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        emp.time_tracking_enabled
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                      } ${isSaving ? 'opacity-50' : ''}`}
                      title={emp.time_tracking_enabled ? 'Zeiterfassung aktiv' : 'Zeiterfassung deaktiviert'}
                    >
                      {emp.time_tracking_enabled ? '✓' : '–'}
                    </button>
                  </td>
                  
                  <td className="py-3 px-4">
                    {emp.time_tracking_enabled ? (
                      <select
                        value={emp.time_model_id || ''}
                        onChange={(e) => handleUpdate(emp.id, 'time_model_id', e.target.value ? parseInt(e.target.value) : null)}
                        disabled={isSaving}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Kein Modell --</option>
                        {timeModels.map(model => (
                          <option key={model.id} value={model.id}>
                            {model.name} ({(model.weekly_minutes / 60).toFixed(1)}h)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">–</span>
                    )}
                  </td>
                  
                  <td className="py-3 px-4">
                    {emp.time_tracking_enabled ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className={emp.rfid_chip_id ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                          {emp.rfid_chip_id || '–'}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span className={emp.pin_code ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}>
                          {emp.pin_code ? '••••' : '–'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-500">–</span>
                    )}
                  </td>
                  
                  <td className="py-3 px-2">
                    {emp.time_tracking_enabled && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : emp.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Details bearbeiten"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {filteredEmployees.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm 
                    ? 'Keine Mitarbeiter gefunden' 
                    : !showAll && hiddenCount > 0
                      ? `Keine Mitarbeiter mit aktiver Funktion. Klicke "+${hiddenCount} ohne Funktion" um alle anzuzeigen.`
                      : 'Keine Mitarbeiter vorhanden'
                  }
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Expanded Detail Row */}
        {expandedId && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
            {(() => {
              const emp = employees.find(e => e.id === expandedId);
              if (!emp) return null;
              
              return (
                <div className="max-w-xl space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    Terminal-Zugangsdaten für {emp.first_name} {emp.last_name}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        RFID-Chip ID
                      </label>
                      <input
                        type="text"
                        defaultValue={emp.rfid_chip_id || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (emp.rfid_chip_id || '')) {
                            handleUpdate(emp.id, 'rfid_chip_id', e.target.value);
                          }
                        }}
                        placeholder="z.B. ABC123456"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                        PIN-Code (4-6 Ziffern)
                      </label>
                      <input
                        type="text"
                        defaultValue={emp.pin_code || ''}
                        onBlur={(e) => {
                          const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                          if (cleaned !== (emp.pin_code || '')) {
                            handleUpdate(emp.id, 'pin_code', cleaned);
                          }
                        }}
                        placeholder="z.B. 1234"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    RFID und PIN werden für die Terminal-Stempelung benötigt. Änderungen werden automatisch gespeichert.
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-blue-500">ℹ️</span>
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-1">Hinweise:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Standardmäßig werden nur Mitarbeiter mit aktiver Urlaubs- oder Zeitverwaltung angezeigt</li>
              <li>Urlaubsansprüche werden unter "Einstellungen → Urlaub → Urlaubsansprüche" verwaltet</li>
              <li>Zeitmodelle werden unter "Einstellungen → Zeiterfassung → Zeitmodelle" erstellt</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
