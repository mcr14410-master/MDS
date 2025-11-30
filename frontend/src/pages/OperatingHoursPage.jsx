import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMaintenanceStore } from '../stores/maintenanceStore';
import { useMachinesStore } from '../stores/machinesStore';

function OperatingHoursPage() {
  const [searchParams] = useSearchParams();
  const initialMachineId = searchParams.get('machine') || '';
  
  const { 
    operatingHoursHistory,
    loading,
    error,
    fetchOperatingHoursHistory,
    recordOperatingHours
  } = useMaintenanceStore();
  
  const { machines, fetchMachines } = useMachinesStore();
  
  const [selectedMachine, setSelectedMachine] = useState(initialMachineId);
  const [hoursInput, setHoursInput] = useState('');
  const [notes, setNotes] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchMachines();
    fetchOperatingHoursHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');

    if (!selectedMachine || !hoursInput) {
      setSubmitError('Bitte Maschine und Betriebsstunden angeben');
      return;
    }

    const hours = parseFloat(hoursInput);
    if (isNaN(hours) || hours < 0) {
      setSubmitError('Ungültige Betriebsstunden');
      return;
    }

    try {
      await recordOperatingHours(selectedMachine, hours, notes || undefined);
      setSubmitSuccess('Betriebsstunden erfolgreich erfasst');
      setHoursInput('');
      setNotes('');
      fetchOperatingHoursHistory();
      fetchMachines(); // Aktualisiere Maschinen-Liste mit neuen Stunden
      setTimeout(() => setSubmitSuccess(''), 3000);
    } catch (err) {
      setSubmitError(err.message || 'Fehler beim Erfassen');
    }
  };

  const getSelectedMachineInfo = () => {
    if (!selectedMachine) return null;
    return machines.find(m => m.id === parseInt(selectedMachine));
  };

  const machineInfo = getSelectedMachineInfo();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Betriebsstunden erfassen
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Tägliche Erfassung der Maschinenlaufzeiten
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Erfassungs-Formular */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Neue Erfassung
          </h2>

          {submitError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-sm">
              {submitSuccess}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maschine *
              </label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Maschine auswählen...</option>
                {machines.filter(m => m.is_active).map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name} - {machine.location}
                  </option>
                ))}
              </select>
            </div>

            {machineInfo && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="text-sm text-blue-700 dark:text-blue-400">
                  <span className="font-medium">Aktueller Stand:</span>{' '}
                  {(machineInfo.operating_hours || machineInfo.current_operating_hours || 0).toLocaleString('de-DE')} Stunden
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Neuer Zählerstand (Stunden) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                placeholder={machineInfo ? `Aktuell: ${machineInfo.operating_hours || machineInfo.current_operating_hours || 0}` : 'z.B. 12500'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
              {machineInfo && hoursInput && parseFloat(hoursInput) > 0 && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Differenz: +{(parseFloat(hoursInput) - (machineInfo.operating_hours || machineInfo.current_operating_hours || 0)).toFixed(1)} Stunden
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notizen (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="z.B. Schichtende, Wartung durchgeführt..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Speichern...' : 'Betriebsstunden erfassen'}
            </button>
          </form>
        </div>

        {/* Aktuelle Stände */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Aktuelle Maschinenstände
          </h2>

          <div className="space-y-3">
            {machines.filter(m => m.is_active).map(machine => (
              <div 
                key={machine.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {machine.name}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {machine.location}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                    {machine.current_operating_hours?.toLocaleString('de-DE') || '0'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Stunden
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verlauf */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Letzte Erfassungen
          </h2>
        </div>

        {loading && !operatingHoursHistory.length ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Lade Verlauf...
          </div>
        ) : operatingHoursHistory.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Noch keine Erfassungen vorhanden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Datum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Maschine
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Vorher
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Nachher
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Differenz
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Erfasst von
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Notizen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {operatingHoursHistory.slice(0, 20).map(entry => (
                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(entry.recorded_at).toLocaleString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {entry.machine_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-500 dark:text-gray-400">
                      {entry.previous_hours?.toLocaleString('de-DE') || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono font-medium text-gray-900 dark:text-white">
                      {entry.new_hours?.toLocaleString('de-DE')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        +{((entry.new_hours || 0) - (entry.previous_hours || 0)).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.recorded_by_name || entry.username || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {entry.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatingHoursPage;
