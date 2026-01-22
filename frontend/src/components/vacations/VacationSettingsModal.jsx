import { useState, useEffect, useMemo } from 'react';
import { X, Settings, Calendar, Plus, Trash2, RefreshCw, Users, Save, Shield, MapPin, ClipboardList } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

export default function VacationSettingsModal({ onClose }) {
  const {
    settings,
    holidays,
    balances,
    roleLimits,
    availableRoles,
    germanStates,
    filters,
    fetchSettings,
    updateSettings,
    fetchHolidays,
    fetchGermanStates,
    createHoliday,
    deleteHoliday,
    generateHolidays,
    initializeYear,
    fetchRoleLimits,
    fetchAvailableRoles,
    upsertRoleLimit,
    deleteRoleLimit
  } = useVacationsStore();

  const [activeTab, setActiveTab] = useState('holidays');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dynamic year range (current year -1 to +5)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    default_vacation_days: settings.default_vacation_days?.value || '30',
    default_region: settings.default_region?.value || 'BY'
  });

  // Holiday form
  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    is_half_day: false
  });

  // Role limit form
  const [roleLimitForm, setRoleLimitForm] = useState({
    role_id: '',
    max_concurrent: '1'
  });

  // Year selector
  const [selectedYear, setSelectedYear] = useState(filters.year);

  // Current region from settings
  const currentRegion = settings.default_region?.value || 'BY';
  const currentRegionName = germanStates.find(s => s.code === currentRegion)?.name || currentRegion;

  // Load data
  useEffect(() => {
    fetchGermanStates();
  }, []);

  useEffect(() => {
    fetchHolidays(selectedYear, currentRegion);
  }, [selectedYear, currentRegion]);

  useEffect(() => {
    if (activeTab === 'rolelimits') {
      fetchRoleLimits();
      fetchAvailableRoles();
    }
  }, [activeTab]);

  useEffect(() => {
    if (settings.default_vacation_days) {
      setSettingsForm({
        default_vacation_days: settings.default_vacation_days.value,
        default_region: settings.default_region?.value || 'BY'
      });
    }
  }, [settings]);

  // Handle settings save
  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateSettings(settingsForm);
      // Reload holidays if region changed
      await fetchHolidays(selectedYear, settingsForm.default_region);
      setSuccess('Einstellungen gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Handle add holiday
  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;

    setLoading(true);
    setError(null);
    try {
      await createHoliday({
        ...holidayForm,
        region: currentRegion
      });
      setHolidayForm({ date: '', name: '', is_half_day: false });
      setSuccess('Feiertag hinzugefügt');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Hinzufügen');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete holiday
  const handleDeleteHoliday = async (id) => {
    try {
      await deleteHoliday(id);
    } catch (err) {
      setError('Fehler beim Löschen');
    }
  };

  // Handle generate holidays
  const handleGenerateHolidays = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateHolidays(selectedYear, currentRegion);
      setSuccess(result.message || `Feiertage für ${selectedYear} generiert`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Generieren');
    } finally {
      setLoading(false);
    }
  };

  // Handle initialize year
  const handleInitializeYear = async () => {
    setLoading(true);
    setError(null);
    try {
      await initializeYear(selectedYear);
      setSuccess(`Urlaubsansprüche für ${selectedYear} initialisiert`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Fehler beim Initialisieren');
    } finally {
      setLoading(false);
    }
  };

  // Handle add/update role limit
  const handleAddRoleLimit = async (e) => {
    e.preventDefault();
    if (!roleLimitForm.role_id) return;

    setLoading(true);
    setError(null);
    try {
      await upsertRoleLimit({
        role_id: parseInt(roleLimitForm.role_id),
        max_concurrent: parseInt(roleLimitForm.max_concurrent)
      });
      setRoleLimitForm({ role_id: '', max_concurrent: '1' });
      setSuccess('Rollen-Limit gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete role limit
  const handleDeleteRoleLimit = async (id) => {
    try {
      await deleteRoleLimit(id);
    } catch (err) {
      setError('Fehler beim Löschen');
    }
  };

  // Get roles without limits (for dropdown)
  const rolesWithoutLimit = availableRoles.filter(r => !r.has_limit);

  const tabs = [
    { id: 'holidays', label: 'Feiertage', icon: Calendar },
    { id: 'rolelimits', label: 'Rollen-Limits', icon: Shield },
    { id: 'requesttypes', label: 'Antragstypen', icon: ClipboardList },
    { id: 'settings', label: 'Einstellungen', icon: Settings },
    { id: 'entitlements', label: 'Urlaubsansprüche', icon: Users }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl 
                        w-full max-w-2xl mx-auto z-10 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-600" />
              Urlaubseinstellungen
            </h2>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                  ${activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Messages */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 
                              dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg text-green-700 
                              dark:bg-green-900/30 dark:border-green-800 dark:text-green-400 text-sm">
                {success}
              </div>
            )}

            {/* HOLIDAYS TAB */}
            {activeTab === 'holidays' && (
              <div className="space-y-4">
                {/* Year selector, Generate & Region info */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Jahr:
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-1 border border-gray-300 rounded-lg 
                                   dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {yearOptions.map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleGenerateHolidays}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white 
                                 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Feiertage generieren
                    </button>
                  </div>

                  {/* Region indicator */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 
                                  bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                    <MapPin className="h-4 w-4" />
                    <span>{currentRegionName}</span>
                  </div>
                </div>

                {/* Add custom holiday */}
                <form onSubmit={handleAddHoliday} className="flex gap-2 flex-wrap">
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <input
                    type="text"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Bezeichnung (z.B. Betriebsferien)"
                    className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <label className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={holidayForm.is_half_day}
                      onChange={(e) => setHolidayForm(f => ({ ...f, is_half_day: e.target.checked }))}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    ½ Tag
                  </label>
                  <button
                    type="submit"
                    disabled={loading || !holidayForm.date || !holidayForm.name}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white 
                               rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Hinzufügen
                  </button>
                </form>

                {/* Holiday list */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Datum</th>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Bezeichnung</th>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Typ</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {holidays.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Keine Feiertage für {selectedYear}
                          </td>
                        </tr>
                      ) : (
                        holidays.map(h => (
                          <tr key={h.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                              {new Date(h.date).toLocaleDateString('de-DE', { 
                                weekday: 'short', 
                                day: '2-digit', 
                                month: '2-digit' 
                              })}
                            </td>
                            <td className="px-4 py-2 text-gray-900 dark:text-white">
                              {h.name}
                              {h.is_half_day && (
                                <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 
                                               dark:bg-yellow-900/30 dark:text-yellow-400 rounded">
                                  ½ Tag
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                h.is_custom
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {h.is_custom ? 'Manuell' : 'Gesetzlich'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleDeleteHoliday(h.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ROLE LIMITS TAB */}
            {activeTab === 'rolelimits' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Definieren Sie, wie viele Mitarbeiter einer Rolle gleichzeitig abwesend sein dürfen.
                  Bei Überschreitung wird eine Warnung angezeigt.
                </p>

                {/* Add role limit */}
                <form onSubmit={handleAddRoleLimit} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Rolle
                    </label>
                    <select
                      value={roleLimitForm.role_id}
                      onChange={(e) => setRoleLimitForm(f => ({ ...f, role_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">-- Rolle auswählen --</option>
                      {rolesWithoutLimit.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max. Abwesend
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={roleLimitForm.max_concurrent}
                      onChange={(e) => setRoleLimitForm(f => ({ ...f, max_concurrent: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                                 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !roleLimitForm.role_id}
                    className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white 
                               rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    Hinzufügen
                  </button>
                </form>

                {/* Role limits list */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Rolle</th>
                        <th className="px-4 py-2 text-center text-gray-700 dark:text-gray-300">Max. gleichzeitig abwesend</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {roleLimits.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Keine Rollen-Limits konfiguriert.
                            <br />
                            <span className="text-xs">Ohne Limits erfolgt keine Überschneidungs-Prüfung.</span>
                          </td>
                        </tr>
                      ) : (
                        roleLimits.map(rl => (
                          <tr key={rl.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                              {rl.role_name}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full 
                                             bg-orange-100 text-orange-700 dark:bg-orange-900/30 
                                             dark:text-orange-400 font-bold">
                                {rl.max_concurrent}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => handleDeleteRoleLimit(rl.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Löschen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REQUEST TYPES TAB (Placeholder) */}
            {activeTab === 'requesttypes' && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">
                    🚧 In Entwicklung
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Hier können später die Abwesenheitstypen konfiguriert werden, 
                    die Mitarbeiter selbst beantragen können.
                  </p>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p className="font-medium mb-2">Geplante Funktionen:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Typen für Beantragung aktivieren/deaktivieren</li>
                    <li>Typen nur für direktes Eintragen markieren (z.B. Krank, Schulung)</li>
                    <li>Genehmigungspflichtige Typen festlegen</li>
                  </ul>
                </div>
              </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Default vacation days */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Standard-Urlaubstage pro Jahr
                  </label>
                  <input
                    type="number"
                    value={settingsForm.default_vacation_days}
                    onChange={(e) => setSettingsForm(f => ({ ...f, default_vacation_days: e.target.value }))}
                    min="0"
                    max="50"
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Standardwert beim Anlegen neuer Urlaubsansprüche
                  </p>
                </div>

                {/* Region selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bundesland für Feiertage
                  </label>
                  <select
                    value={settingsForm.default_region}
                    onChange={(e) => setSettingsForm(f => ({ ...f, default_region: e.target.value }))}
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg 
                               dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    {germanStates.map(state => (
                      <option key={state.code} value={state.code}>
                        {state.name} ({state.code})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Gesetzliche Feiertage werden für dieses Bundesland generiert
                  </p>
                </div>

                <button
                  onClick={handleSaveSettings}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white 
                             rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Einstellungen speichern
                </button>
              </div>
            )}

            {/* ENTITLEMENTS TAB */}
            {activeTab === 'entitlements' && (
              <div className="space-y-4">
                {/* Year selector & Initialize */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Jahr:
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-1 border border-gray-300 rounded-lg 
                                 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleInitializeYear}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white 
                               rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Users className="h-4 w-4" />
                    Jahr initialisieren
                  </button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  "Jahr initialisieren" erstellt Urlaubsansprüche für alle aktiven Mitarbeiter 
                  mit dem Standard-Wert ({settingsForm.default_vacation_days} Tage) und überträgt 
                  den Resturlaub vom Vorjahr.
                </p>

                {/* Balances table */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Mitarbeiter</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Anspruch</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Übertrag</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Genommen</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Rest</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {balances.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                            Keine Urlaubsansprüche für {filters.year}
                          </td>
                        </tr>
                      ) : (
                        balances.map(b => (
                          <tr key={b.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-2 text-gray-900 dark:text-white">
                              {b.display_name}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                              {b.total_days}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                              {b.carried_over > 0 ? `+${b.carried_over}` : b.carried_over}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                              {b.used_days}
                            </td>
                            <td className={`px-4 py-2 text-right font-medium ${
                              b.remaining_days < 0
                                ? 'text-red-600 dark:text-red-400'
                                : b.remaining_days < 5
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-green-600 dark:text-green-400'
                            }`}>
                              {b.remaining_days}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
