import { useEffect, useState } from 'react';
import { useMachineTypesStore } from '../../stores/machineTypesStore';
import { useControlTypesStore } from '../../stores/controlTypesStore';
import { toast } from '../Toaster';
import CustomFieldDefinitionsEditor from '../common/CustomFieldDefinitionsEditor';

const COLOR_OPTIONS = [
  { value: 'gray', label: 'Grau', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'blue', label: 'Blau', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  { value: 'green', label: 'Grün', classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  { value: 'yellow', label: 'Gelb', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  { value: 'red', label: 'Rot', classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  { value: 'purple', label: 'Lila', classes: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  { value: 'indigo', label: 'Indigo', classes: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
];

const getColorClasses = (color) =>
  COLOR_OPTIONS.find((c) => c.value === color)?.classes || COLOR_OPTIONS[0].classes;

export default function MachineMasterDataModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('types');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Stammdaten verwalten
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Maschinentypen und Steuerungen
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Schließen"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'types', label: 'Maschinentypen' },
              { id: 'controls', label: 'Steuerungen' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'types' ? <MachineTypesPanel /> : <ControlTypesPanel />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MACHINE TYPES PANEL
// ============================================================================
function MachineTypesPanel() {
  const { types, fetchTypes, createType, updateType, deleteType } = useMachineTypesStore();
  const [editing, setEditing] = useState(null); // type object or 'new'
  const [fieldsEditorFor, setFieldsEditorFor] = useState(null);

  useEffect(() => {
    fetchTypes().catch((e) => toast.error(e.message || 'Fehler beim Laden'));
  }, [fetchTypes]);

  const handleSaveType = async (data) => {
    try {
      if (editing && editing !== 'new' && editing.id) {
        await updateType(editing.id, data);
        toast.success('Maschinentyp aktualisiert');
      } else {
        await createType(data);
        toast.success('Maschinentyp erstellt');
      }
      setEditing(null);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Fehler beim Speichern');
    }
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Maschinentyp "${type.name}" wirklich löschen?`)) return;
    try {
      await deleteType(type.id);
      toast.success('Maschinentyp gelöscht');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Fehler beim Löschen');
    }
  };

  const handleSaveFields = async (id, definitions) => {
    try {
      await updateType(id, { custom_field_definitions: definitions });
      toast.success('Felder gespeichert');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Fehler beim Speichern');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {types.length} {types.length === 1 ? 'Maschinentyp' : 'Maschinentypen'}
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Typ
        </button>
      </div>

      {editing && (
        <TypeForm
          initial={editing === 'new' ? null : editing}
          onSave={handleSaveType}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[25%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Felder</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Maschinen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{type.sequence}</td>
                <td className="px-3 py-2 text-sm truncate">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getColorClasses(type.color)}`}>
                    {type.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                  {(type.custom_field_definitions?.length || 0)} Feld{type.custom_field_definitions?.length === 1 ? '' : 'er'}
                </td>
                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{type.machine_count || 0}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      type.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {type.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setFieldsEditorFor(type)}
                      className="px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Custom Fields bearbeiten"
                    >
                      Felder
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(type)}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(type)}
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Keine Maschinentypen vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {fieldsEditorFor && (
        <CustomFieldDefinitionsEditor
          category={fieldsEditorFor}
          entityLabel="Maschinentyp"
          onClose={() => setFieldsEditorFor(null)}
          onSave={handleSaveFields}
        />
      )}
    </div>
  );
}

function TypeForm({ initial, onSave, onCancel }) {
  const [data, setData] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    color: initial?.color || 'gray',
    sequence: initial?.sequence ?? 0,
    is_active: initial?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onSave({
      ...data,
      sequence: parseInt(data.sequence, 10) || 0,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Farbe</label>
          <select
            value={data.color}
            onChange={(e) => setData({ ...data, color: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reihenfolge</label>
          <input
            type="number"
            value={data.sequence}
            onChange={(e) => setData({ ...data, sequence: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={data.is_active}
            onChange={(e) => setData({ ...data, is_active: e.target.checked })}
            className="rounded"
          />
          Aktiv
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Speichern
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// CONTROL TYPES PANEL
// ============================================================================
function ControlTypesPanel() {
  const { types, fetchTypes, createType, updateType, deleteType } = useControlTypesStore();
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchTypes().catch((e) => toast.error(e.message || 'Fehler beim Laden'));
  }, [fetchTypes]);

  const handleSave = async (data) => {
    try {
      if (editing && editing !== 'new' && editing.id) {
        await updateType(editing.id, data);
        toast.success('Steuerung aktualisiert');
      } else {
        await createType(data);
        toast.success('Steuerung erstellt');
      }
      setEditing(null);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Fehler beim Speichern');
    }
  };

  const handleDelete = async (type) => {
    if (!window.confirm(`Steuerung "${type.name}" wirklich löschen?`)) return;
    try {
      await deleteType(type.id);
      toast.success('Steuerung gelöscht');
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Fehler beim Löschen');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {types.length} {types.length === 1 ? 'Steuerung' : 'Steuerungen'}
        </p>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neue Steuerung
        </button>
      </div>

      {editing && (
        <ControlForm
          initial={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-gray-700">
          <colgroup>
            <col className="w-[8%]" />
            <col className="w-[25%]" />
            <col className="w-[20%]" />
            <col className="w-[15%]" />
            <col className="w-[12%]" />
            <col className="w-[20%]" />
          </colgroup>
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Farbe</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Maschinen</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {types.map((type) => (
              <tr key={type.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">{type.sequence}</td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white truncate">{type.name}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getColorClasses(type.color)}`}>
                    {type.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{type.machine_count || 0}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      type.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {type.is_active ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(type)}
                      className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(type)}
                      className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Löschen
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Keine Steuerungen vorhanden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ControlForm({ initial, onSave, onCancel }) {
  const [data, setData] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    color: initial?.color || 'gray',
    sequence: initial?.sequence ?? 0,
    is_active: initial?.is_active ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!data.name.trim()) return;
    onSave({
      ...data,
      sequence: parseInt(data.sequence, 10) || 0,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            required
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Farbe</label>
          <select
            value={data.color}
            onChange={(e) => setData({ ...data, color: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COLOR_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reihenfolge</label>
          <input
            type="number"
            value={data.sequence}
            onChange={(e) => setData({ ...data, sequence: e.target.value })}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Beschreibung</label>
        <input
          type="text"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={data.is_active}
            onChange={(e) => setData({ ...data, is_active: e.target.checked })}
            className="rounded"
          />
          Aktiv
        </label>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Speichern
          </button>
        </div>
      </div>
    </form>
  );
}
