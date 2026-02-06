import { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, Trash2, RefreshCw, Users, Save, Shield, MapPin, Settings, Award } from 'lucide-react';
import { useVacationsStore } from '../../stores/vacationsStore';

const SECTIONS = [
  { id: 'holidays', label: 'Feiertage', icon: Calendar },
  { id: 'rolelimits', label: 'Rollen-Limits', icon: Shield },
  { id: 'requesttypes', label: 'Antragstypen', icon: Award },
  { id: 'entitlements', label: 'Urlaubsansprüche', icon: Users },
  { id: 'settings', label: 'Allgemein', icon: Settings },
];

export default function VacationSettingsPanel({ activeSection, onSectionChange }) {
  const {
    settings,
    holidays,
    balances,
    roleLimits,
    availableRoles,
    germanStates,
    vacationTypes,
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
    deleteRoleLimit,
    fetchBalances,
    fetchVacationTypes,
    updateVacationType,
    createVacationType
  } = useVacationsStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Dynamic year range
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Forms
  const [settingsForm, setSettingsForm] = useState({
    default_vacation_days: settings.default_vacation_days?.value || '30',
    default_region: settings.default_region?.value || 'BY'
  });

  const [holidayForm, setHolidayForm] = useState({
    date: '',
    name: '',
    is_half_day: false
  });

  const [roleLimitForm, setRoleLimitForm] = useState({
    role_id: '',
    max_concurrent: '1'
  });

  const [selectedYear, setSelectedYear] = useState(filters.year);

  // State for editing vacation types
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [typesSaving, setTypesSaving] = useState({});

  // Current region
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
    if (activeSection === 'rolelimits') {
      fetchRoleLimits();
      fetchAvailableRoles();
    }
    if (activeSection === 'entitlements') {
      fetchBalances(selectedYear);
    }
    if (activeSection === 'requesttypes') {
      fetchVacationTypes();
    }
  }, [activeSection, selectedYear]);

  useEffect(() => {
    if (settings.default_vacation_days) {
      setSettingsForm({
        default_vacation_days: settings.default_vacation_days.value,
        default_region: settings.default_region?.value || 'BY'
      });
    }
  }, [settings]);

  // Handlers
  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      await updateSettings(settingsForm);
      if (settingsForm.default_region !== currentRegion) {
        await fetchHolidays(selectedYear, settingsForm.default_region);
      }
      setSuccess('Einstellungen gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayForm.date || !holidayForm.name) return;
    
    setLoading(true);
    try {
      await createHoliday({
        ...holidayForm,
        region: currentRegion
      });
      setHolidayForm({ date: '', name: '', is_half_day: false });
      await fetchHolidays(selectedYear, currentRegion);
      setSuccess('Feiertag hinzugefügt');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!confirm('Feiertag wirklich löschen?')) return;
    try {
      await deleteHoliday(id);
      await fetchHolidays(selectedYear, currentRegion);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGenerateHolidays = async () => {
    setLoading(true);
    try {
      await generateHolidays(selectedYear, currentRegion);
      await fetchHolidays(selectedYear, currentRegion);
      setSuccess(`Feiertage für ${selectedYear} generiert`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoleLimit = async (e) => {
    e.preventDefault();
    if (!roleLimitForm.role_id) return;
    
    setLoading(true);
    try {
      await upsertRoleLimit({
        role_id: parseInt(roleLimitForm.role_id),
        max_concurrent: parseInt(roleLimitForm.max_concurrent)
      });
      setRoleLimitForm({ role_id: '', max_concurrent: '1' });
      await fetchRoleLimits();
      setSuccess('Rollen-Limit gespeichert');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoleLimit = async (id) => {
    if (!confirm('Rollen-Limit wirklich löschen?')) return;
    try {
      await deleteRoleLimit(id);
      await fetchRoleLimits();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInitializeYear = async () => {
    if (!confirm(`Urlaubsansprüche für ${selectedYear} mit ${settingsForm.default_vacation_days} Tagen initialisieren?`)) return;
    
    setLoading(true);
    try {
      await initializeYear(selectedYear, parseInt(settingsForm.default_vacation_days));
      await fetchBalances(selectedYear);
      setSuccess(`Jahr ${selectedYear} initialisiert`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Render section content
  const renderContent = () => {
    switch (activeSection) {
      case 'holidays':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Feiertage</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Region: {currentRegionName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerateHolidays}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Generieren
                </button>
              </div>
            </div>

            {/* Add Holiday Form */}
            <form onSubmit={handleAddHoliday} className="flex gap-2 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datum</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="z.B. Betriebsurlaub"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <label className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  checked={holidayForm.is_half_day}
                  onChange={(e) => setHolidayForm({ ...holidayForm, is_half_day: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Halbtag</span>
              </label>
              <button
                type="submit"
                disabled={loading || !holidayForm.date || !holidayForm.name}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </button>
            </form>

            {/* Holiday List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Datum</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Halbtag</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {holidays.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Keine Feiertage für {selectedYear}. Klicken Sie auf "Generieren" um Feiertage zu erstellen.
                      </td>
                    </tr>
                  ) : (
                    holidays.map(holiday => (
                      <tr key={holiday.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {new Date(holiday.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{holiday.name}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {holiday.is_half_day ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                              ½ Tag
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(holiday.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
        );

      case 'rolelimits':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Rollen-Limits</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Maximale gleichzeitige Abwesenheiten pro Rolle
              </p>
            </div>

            {/* Add Role Limit Form */}
            <form onSubmit={handleAddRoleLimit} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rolle</label>
                <select
                  value={roleLimitForm.role_id}
                  onChange={(e) => setRoleLimitForm({ ...roleLimitForm, role_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Rolle wählen...</option>
                  {availableRoles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max. gleichzeitig</label>
                <input
                  type="number"
                  min="1"
                  value={roleLimitForm.max_concurrent}
                  onChange={(e) => setRoleLimitForm({ ...roleLimitForm, max_concurrent: e.target.value })}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !roleLimitForm.role_id}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Hinzufügen
              </button>
            </form>

            {/* Role Limits List */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Rolle</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Max. gleichzeitig</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {roleLimits.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Keine Rollen-Limits definiert
                      </td>
                    </tr>
                  ) : (
                    roleLimits.map(limit => (
                      <tr key={limit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{limit.role_name}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">{limit.max_concurrent}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteRoleLimit(limit.id)}
                            className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
        );

      case 'requesttypes':
        const handleTypeToggle = async (typeId, field, currentValue) => {
          setTypesSaving(prev => ({ ...prev, [typeId]: true }));
          try {
            await updateVacationType(typeId, { [field]: !currentValue });
          } catch (err) {
            setError('Fehler beim Speichern');
          } finally {
            setTypesSaving(prev => ({ ...prev, [typeId]: false }));
          }
        };

        const handleColorChange = async (typeId, color) => {
          try {
            await updateVacationType(typeId, { color });
          } catch (err) {
            setError('Fehler beim Speichern');
          }
        };

        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Antragstypen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Konfiguration der verfügbaren Abwesenheitstypen
              </p>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-sm">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Einstellungen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                <div><span className="font-medium">Urlaub abziehen:</span> Zieht vom Urlaubskonto ab</div>
                <div><span className="font-medium">Soll gutschreiben:</span> Soll-Stunden in Zeiterfassung</div>
                <div><span className="font-medium">Genehmigung:</span> Muss vom Vorgesetzten genehmigt werden</div>
                <div><span className="font-medium">Nur Admin:</span> Kann nicht vom MA beantragt werden</div>
                <div><span className="font-medium">Halbe Tage:</span> Stundenweise Abwesenheit möglich</div>
                <div><span className="font-medium">Nur Einzeltag:</span> Kein Zeitraum, nur ein Tag</div>
              </div>
            </div>

            {/* Types Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Typ</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Zieht vom Urlaubskonto ab">Urlaub</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Gutschrift Soll-Stunden">Soll</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Genehmigung erforderlich">Genehm.</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Nur Admin eintragen">Admin</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Halbe Tage erlaubt">Halbe</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300" title="Nur Einzeltag">1 Tag</th>
                    <th className="text-center py-3 px-2 font-medium text-gray-700 dark:text-gray-300">Aktiv</th>
                  </tr>
                </thead>
                <tbody>
                  {vacationTypes.map(type => (
                    <tr key={type.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={type.color}
                            onChange={(e) => handleColorChange(type.id, e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0"
                            title="Farbe ändern"
                          />
                          <span className="font-medium text-gray-900 dark:text-white">{type.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'affects_balance', type.affects_balance)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.affects_balance 
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.affects_balance ? 'Zieht vom Urlaubskonto ab' : 'Kein Abzug'}
                        >
                          {type.affects_balance ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'credits_target_hours', type.credits_target_hours)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.credits_target_hours 
                              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.credits_target_hours ? 'Soll-Stunden werden gutgeschrieben' : 'Keine Gutschrift'}
                        >
                          {type.credits_target_hours ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'requires_approval', type.requires_approval)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.requires_approval 
                              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.requires_approval ? 'Genehmigung erforderlich' : 'Keine Genehmigung nötig'}
                        >
                          {type.requires_approval ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'direct_entry_only', type.direct_entry_only)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.direct_entry_only 
                              ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.direct_entry_only ? 'Nur Admin kann eintragen' : 'Mitarbeiter kann beantragen'}
                        >
                          {type.direct_entry_only ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'allows_partial_day', type.allows_partial_day)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.allows_partial_day 
                              ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.allows_partial_day ? 'Stundenweise möglich' : 'Nur ganze Tage'}
                        >
                          {type.allows_partial_day ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'single_day_only', type.single_day_only)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.single_day_only 
                              ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' 
                              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                          }`}
                          title={type.single_day_only ? 'Nur einzelne Tage' : 'Zeiträume möglich'}
                        >
                          {type.single_day_only ? '✓' : '–'}
                        </button>
                      </td>
                      <td className="text-center py-3 px-2">
                        <button
                          onClick={() => handleTypeToggle(type.id, 'is_active', type.is_active)}
                          disabled={typesSaving[type.id]}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                            type.is_active 
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                          title={type.is_active ? 'Aktiv' : 'Deaktiviert'}
                        >
                          {type.is_active ? '✓' : '✗'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-500">ℹ️</span>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p className="font-medium mb-1">Hinweise zur Konfiguration:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li><strong>Genehmigung + Nicht Admin</strong> = Typ erscheint in "Urlaub beantragen"</li>
                    <li><strong>Nur Admin</strong> = Typ erscheint nur in "Abwesenheit eintragen"</li>
                    <li><strong>Soll gutschreiben</strong> = Arbeitsstunden werden bei Abwesenheit angerechnet</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 'entitlements':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Urlaubsansprüche</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Jahresansprüche für alle Mitarbeiter initialisieren
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={handleInitializeYear}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Jahr initialisieren
                </button>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Hinweis:</strong> Die Initialisierung erstellt Urlaubsansprüche für alle aktiven Mitarbeiter 
                mit aktivierter Urlaubsverwaltung. Bestehende Ansprüche werden nicht überschrieben.
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                Standard-Urlaubstage: <strong>{settingsForm.default_vacation_days}</strong> (änderbar unter "Allgemein")
              </p>
            </div>

            {/* Entitlements Table */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Mitarbeiter</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Anspruch</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Übertrag</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Verfügbar</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Genommen</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">Rest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        Keine Urlaubsansprüche für {selectedYear}. Klicken Sie auf "Jahr initialisieren".
                      </td>
                    </tr>
                  ) : (
                    balances.map(balance => (
                      <tr key={balance.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {balance.display_name}
                          {balance.roles && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({Array.isArray(balance.roles) ? balance.roles.join(', ') : balance.roles})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {balance.total_days}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-blue-600 dark:text-blue-400">
                          {balance.carried_over > 0 ? `+${balance.carried_over}` : balance.carried_over || 0}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-900 dark:text-white">
                          {balance.available_days || (parseFloat(balance.total_days || 0) + parseFloat(balance.carried_over || 0))}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-orange-600 dark:text-orange-400">
                          {balance.used_days || 0}
                        </td>
                        <td className={`px-4 py-3 text-center text-sm font-medium ${
                          balance.remaining_days < 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : balance.remaining_days < 5 
                              ? 'text-yellow-600 dark:text-yellow-400' 
                              : 'text-green-600 dark:text-green-400'
                        }`}>
                          {balance.remaining_days}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              Gesamt: <strong>{balances.length}</strong> Mitarbeiter für {selectedYear}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Allgemeine Einstellungen</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grundlegende Konfiguration der Urlaubsverwaltung
              </p>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Standard-Urlaubstage pro Jahr
                </label>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.default_vacation_days}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_vacation_days: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Wird bei der Initialisierung neuer Jahresansprüche verwendet
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Bundesland für Feiertage
                  </div>
                </label>
                <select
                  value={settingsForm.default_region}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_region: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {germanStates.map(state => (
                    <option key={state.code} value={state.code}>{state.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Bestimmt welche regionalen Feiertage generiert werden
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Einstellungen speichern
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex gap-6">
      {/* Left: Vertical Navigation */}
      <div className="w-48 flex-shrink-0">
        <nav className="space-y-1">
          {SECTIONS.map(section => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  onSectionChange(section.id);
                  clearMessages();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Content */}
      <div className="flex-1 min-w-0">
        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg dark:bg-red-900/30 dark:border-red-800 dark:text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">×</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded-lg dark:bg-green-900/30 dark:border-green-800 dark:text-green-400">
            {success}
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
}
