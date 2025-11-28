import { Edit, Trash2, Box, Package, AlertCircle, Ruler, Wrench, CheckCircle, AlertTriangle, XCircle, Lock, ExternalLink, Grip } from 'lucide-react';
import { useStorageStore } from '../../stores/storageStore';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../Toaster';
import { useNavigate } from 'react-router-dom';

export default function CompartmentCard({ compartment, items, itemsCount, onEdit }) {
  const { user } = useAuthStore();
  const { deleteCompartment } = useStorageStore();
  const navigate = useNavigate();

  // Separate items by type
  const tools = items.filter(item => item.item_type === 'tool' || item.item_type === 'insert' || item.item_type === 'accessory');
  const measuringEquipment = items.filter(item => item.item_type === 'measuring_equipment');
  const clampingDevices = items.filter(item => item.item_type === 'clamping_device');

  const handleDelete = async () => {
    if (itemsCount > 0) {
      toast.error(
        `Dieses Fach kann nicht gelöscht werden, da es noch ${itemsCount} Lagerartikel enthält. Bitte zuerst alle Artikel umlagern oder löschen.`
      );
      return;
    }

    if (!window.confirm(`Fach "${compartment.name}" wirklich löschen?`)) {
      return;
    }

    const result = await deleteCompartment(compartment.id);
    if (result.success) {
      toast.success('Fach erfolgreich gelöscht');
    } else {
      toast.error(result.error || 'Fehler beim Löschen');
    }
  };

  // Get calibration status badge for measuring equipment
  const getCalibrationBadge = (item) => {
    const status = item.equipment_calibration_status;
    const isCheckedOut = item.is_checked_out;
    const equipmentStatus = item.equipment_status;

    if (equipmentStatus === 'locked') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-600 text-gray-300 rounded" title="Gesperrt">
          <Lock className="w-3 h-3" />
        </span>
      );
    }

    if (isCheckedOut) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded" title={`Entnommen von ${item.checked_out_by_name}`}>
          <ExternalLink className="w-3 h-3" />
        </span>
      );
    }

    switch (status) {
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded" title="Kalibrierung OK">
            <CheckCircle className="w-3 h-3" />
          </span>
        );
      case 'due_soon':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded" title="Kalibrierung bald fällig">
            <AlertTriangle className="w-3 h-3" />
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded" title="Kalibrierung überfällig">
            <XCircle className="w-3 h-3" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            {/* Position Badge */}
            {compartment.position !== null && (
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 font-bold text-sm">{compartment.position}</span>
              </div>
            )}

            <div className="flex-1">
              <h3 className="font-semibold text-white text-lg">{compartment.name}</h3>
              {compartment.description && (
                <p className="text-sm text-gray-400 mt-1">{compartment.description}</p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Box className="w-3 h-3" />
                  ID: {compartment.id}
                </div>
                {!compartment.is_active && (
                  <span className="px-2 py-0.5 bg-gray-600 text-gray-300 rounded">Inaktiv</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            {user?.permissions?.includes('storage.edit') && (
              <button
                onClick={() => onEdit(compartment)}
                className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                title="Bearbeiten"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {user?.permissions?.includes('storage.delete') && (
              <button
                onClick={handleDelete}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                title="Löschen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Contents */}
        <div className="mt-3 pt-3 border-t border-gray-600 space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            {tools.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-orange-400" />
                <span>{tools.length} Werkzeug{tools.length !== 1 ? 'e' : ''}</span>
              </div>
            )}
            {measuringEquipment.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Ruler className="w-4 h-4 text-blue-400" />
                <span>{measuringEquipment.length} Messmittel</span>
              </div>
            )}
            {clampingDevices.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Grip className="w-4 h-4 text-purple-400" />
                <span>{clampingDevices.length} Spannmittel</span>
              </div>
            )}
            {itemsCount === 0 && (
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4" />
                <span>Leer</span>
              </div>
            )}
          </div>

          {/* Tools Preview */}
          {tools.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {tools.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded text-xs font-mono"
                  title={item.tool_name}
                >
                  {item.tool_number || item.article_number || `T${item.tool_master_id}`}
                </div>
              ))}
              {tools.length > 3 && (
                <div className="px-2 py-1 bg-gray-600 text-gray-400 rounded text-xs">
                  +{tools.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Measuring Equipment List */}
          {measuringEquipment.length > 0 && (
            <div className="space-y-1.5">
              {measuringEquipment.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => navigate(`/measuring-equipment/${item.measuring_equipment_id}`)}
                  title="Klicken für Details"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Ruler className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-300 flex-shrink-0">
                      {item.equipment_inventory_number}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {item.equipment_name}
                    </span>
                  </div>
                  <div className="flex-shrink-0">
                    {getCalibrationBadge(item)}
                  </div>
                </div>
              ))}
              {measuringEquipment.length > 4 && (
                <div className="text-xs text-gray-500 pl-2">
                  +{measuringEquipment.length - 4} weitere Messmittel
                </div>
              )}
            </div>
          )}

          {/* Clamping Devices List */}
          {clampingDevices.length > 0 && (
            <div className="space-y-1.5">
              {clampingDevices.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded cursor-pointer hover:bg-purple-500/20 transition-colors"
                  onClick={() => navigate(`/clamping-devices/${item.clamping_device_id}`)}
                  title="Klicken für Details"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Grip className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-purple-300 flex-shrink-0">
                      {item.clamping_device_inventory_number}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {item.clamping_device_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-300 font-medium">
                      {(item.quantity_new || 0) + (item.quantity_used || 0) + (item.quantity_reground || 0)} Stk.
                    </span>
                  </div>
                </div>
              ))}
              {clampingDevices.length > 4 && (
                <div className="text-xs text-gray-500 pl-2">
                  +{clampingDevices.length - 4} weitere Spannmittel
                </div>
              )}
            </div>
          )}

          {/* Low Stock Warning (for tools) */}
          {tools.some((item) => item.is_low_stock) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
              <AlertCircle className="w-3 h-3" />
              Niedrigbestand bei {tools.filter((item) => item.is_low_stock).length} Werkzeug(en)
            </div>
          )}

          {/* Calibration Warnings (for measuring equipment) */}
          {measuringEquipment.some((item) => item.equipment_calibration_status === 'overdue') && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              <XCircle className="w-3 h-3" />
              {measuringEquipment.filter((item) => item.equipment_calibration_status === 'overdue').length} Messmittel mit überfälliger Kalibrierung
            </div>
          )}

          {measuringEquipment.some((item) => item.equipment_calibration_status === 'due_soon') && 
           !measuringEquipment.some((item) => item.equipment_calibration_status === 'overdue') && (
            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              {measuringEquipment.filter((item) => item.equipment_calibration_status === 'due_soon').length} Messmittel mit bald fälliger Kalibrierung
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
