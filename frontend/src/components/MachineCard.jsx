import { useAuthStore } from '../stores/authStore';

export default function MachineCard({ machine, onEdit, onDelete, getControlTypeColor }) {
  const { hasPermission } = useAuthStore();

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {machine.name}
              {!machine.is_active && (
                <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  Inaktiv
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {machine.manufacturer} {machine.model}
            </p>
          </div>
          
          {machine.control_type && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getControlTypeColor(machine.control_type)}`}>
              {machine.control_type}
            </span>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-3">
        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {machine.num_axes && (
            <div>
              <span className="text-gray-500">Achsen:</span>
              <span className="ml-2 font-medium text-gray-900">{machine.num_axes}</span>
            </div>
          )}
          
          {machine.tool_capacity && (
            <div>
              <span className="text-gray-500">Werkzeuge:</span>
              <span className="ml-2 font-medium text-gray-900">{machine.tool_capacity}</span>
            </div>
          )}

          {machine.workspace_x && (
            <div className="col-span-2">
              <span className="text-gray-500">Arbeitsraum:</span>
              <span className="ml-2 font-medium text-gray-900">
                {machine.workspace_x} × {machine.workspace_y || 0} × {machine.workspace_z || 0} mm
              </span>
            </div>
          )}

          {machine.spindle_power && (
            <div>
              <span className="text-gray-500">Spindelleistung:</span>
              <span className="ml-2 font-medium text-gray-900">{machine.spindle_power} kW</span>
            </div>
          )}

          {machine.max_rpm && (
            <div>
              <span className="text-gray-500">Max. Drehzahl:</span>
              <span className="ml-2 font-medium text-gray-900">{machine.max_rpm.toLocaleString()} U/min</span>
            </div>
          )}
        </div>

        {/* Location */}
        {machine.location && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{machine.location}</span>
            </div>
          </div>
        )}

        {/* Stats */}
        {(machine.operating_hours || machine.program_count) && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              {machine.operating_hours !== null && machine.operating_hours !== undefined && (
                <div className="text-gray-600">
                  <span className="font-medium text-gray-900">{machine.operating_hours.toLocaleString()}</span> Betriebsstunden
                </div>
              )}
              {machine.program_count !== null && machine.program_count !== undefined && (
                <div className="text-gray-600">
                  <span className="font-medium text-gray-900">{machine.program_count}</span> Programme
                </div>
              )}
            </div>
          </div>
        )}

        {/* Serial Number */}
        {machine.serial_number && (
          <div className="pt-2 text-xs text-gray-500">
            SN: {machine.serial_number}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
        {hasPermission('machine.update') && (
          <button
            onClick={() => onEdit(machine)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Bearbeiten
          </button>
        )}
        {hasPermission('machine.delete') && machine.is_active && (
          <button
            onClick={() => onDelete(machine.id, machine.name)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Deaktivieren
          </button>
        )}
      </div>
    </div>
  );
}
