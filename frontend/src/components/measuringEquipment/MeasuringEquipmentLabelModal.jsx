import { useState } from 'react';
import { X, Printer, Download, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import API_BASE_URL from '../../config/api';

/**
 * Label Presets für Messmittel
 */
const LABEL_PRESETS = [
  {
    id: 'multi',
    name: 'Multi-Label',
    description: '4 Labels auf 103mm Rolle',
    size: '103 x 25 mm',
    preview: 'multi'
  },
  {
    id: 'qr-large',
    name: 'QR Groß',
    description: 'Nur QR-Code',
    size: '30 x 30 mm',
    preview: 'qr-large'
  },
  {
    id: 'qr-small',
    name: 'QR Klein',
    description: 'Nur QR-Code',
    size: '15 x 15 mm',
    preview: 'qr-small'
  },
  {
    id: 'compact',
    name: 'Kompakt',
    description: 'QR + Inv.Nr + Lagerort',
    size: '40 x 20 mm',
    preview: 'compact'
  },
  {
    id: 'full',
    name: 'Vollständig',
    description: 'Alle Informationen',
    size: '60 x 35 mm',
    preview: 'full'
  }
];

/**
 * MeasuringEquipmentLabelModal Component
 * Modal for selecting and printing labels with different presets
 */
export default function MeasuringEquipmentLabelModal({ equipment, onClose }) {
  const [selectedPreset, setSelectedPreset] = useState('multi');
  const [loading, setLoading] = useState(false);

  if (!equipment) return null;

  const qrContent = `ME:${equipment.inventory_number}`;
  
  // Location code helper
  const locationCode = equipment.compartment_code 
    ? `${equipment.location_code || ''}${equipment.compartment_code}`
    : (equipment.location_code || equipment.storage_location_name || '-');

  // Helper: Dezimalstellen nur wenn nötig
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '';
    const n = parseFloat(num);
    return Number.isInteger(n) ? n.toString() : n.toString().replace(/\.?0+$/, '');
  };

  // Spezifikation berechnen (wie im Backend)
  const getSpecification = () => {
    const eq = equipment;
    const category = eq.type_field_category;
    
    switch (category) {
      case 'measuring_instrument':
        if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
          return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
        }
        break;
      case 'gauge':
        if (eq.nominal_value) {
          return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
        }
        break;
      case 'thread_gauge':
        if (eq.thread_size) {
          const parts = [eq.thread_standard || '', eq.thread_size || ''].filter(Boolean).join('');
          const pitch = eq.thread_pitch ? `x${eq.thread_pitch}` : '';
          const tolerance = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
          return `${parts}${pitch}${tolerance}`.trim() || '-';
        }
        break;
      case 'gauge_block':
        if (eq.nominal_value) {
          const klass = eq.accuracy_class ? ` Kl.${eq.accuracy_class}` : '';
          return `${formatNumber(eq.nominal_value)} ${eq.unit || 'mm'}${klass}`;
        }
        break;
      case 'angle_gauge':
        if (eq.nominal_value) {
          const tol = eq.tolerance_class ? ` ${eq.tolerance_class}` : '';
          return `${formatNumber(eq.nominal_value)}°${tol}`;
        }
        break;
      case 'surface_tester':
        if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
          return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} µm`;
        }
        break;
    }
    
    // Fallback
    if (eq.measuring_range_min !== null && eq.measuring_range_max !== null) {
      return `${formatNumber(eq.measuring_range_min)}-${formatNumber(eq.measuring_range_max)} ${eq.unit || 'mm'}`;
    }
    if (eq.nominal_value) {
      return `Ø${formatNumber(eq.nominal_value)} ${eq.tolerance_class || ''}`.trim();
    }
    
    return '-';
  };

  const specification = getSpecification();

  const handlePrint = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/measuring-equipment/${equipment.id}/label?preset=${selectedPreset}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Label-Generierung fehlgeschlagen');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error generating label:', err);
      alert('Fehler beim Erstellen des Labels');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/measuring-equipment/${equipment.id}/label?preset=${selectedPreset}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (!response.ok) throw new Error('Label-Generierung fehlgeschlagen');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Label_${equipment.inventory_number}_${selectedPreset}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading label:', err);
      alert('Fehler beim Herunterladen des Labels');
    } finally {
      setLoading(false);
    }
  };

  // Preview component based on preset
  const renderPreview = () => {
    switch (selectedPreset) {
      case 'qr-large':
        return (
          <div className="bg-white p-4 rounded-lg inline-block">
            <QRCodeSVG value={qrContent} size={120} level="M" />
          </div>
        );
        
      case 'qr-small':
        return (
          <div className="bg-white p-2 rounded-lg inline-block">
            <QRCodeSVG value={qrContent} size={60} level="M" />
          </div>
        );
        
      case 'compact':
        return (
          <div className="bg-white p-3 rounded-lg inline-flex items-center gap-3" style={{ minWidth: '200px' }}>
            <QRCodeSVG value={qrContent} size={70} level="M" />
            <div className="text-center flex-1">
              <div className="font-bold text-lg text-gray-900">{equipment.inventory_number}</div>
              <div className="text-sm text-gray-600">{locationCode}</div>
            </div>
          </div>
        );
        
      case 'full':
        return (
          <div className="bg-white p-4 rounded-lg inline-block" style={{ minWidth: '280px' }}>
            <div className="flex gap-4">
              <QRCodeSVG value={qrContent} size={80} level="M" />
              <div className="flex-1 text-center">
                <div className="font-bold text-xl text-gray-900">{equipment.inventory_number}</div>
                <div className="font-semibold text-sm text-gray-700 mt-1">{equipment.type_name || '-'}</div>
                <div className="text-sm text-gray-600">{specification}</div>
              </div>
            </div>
            <div className="border-t border-gray-300 mt-3 pt-2 text-center text-sm text-gray-600">
              Lagerort: {locationCode}
            </div>
          </div>
        );
        
      case 'multi':
      default:
        return (
          <div className="bg-white p-2 rounded-lg inline-flex items-end gap-1" style={{ minWidth: '400px' }}>
            {/* QR groß */}
            <div className="border border-gray-300 p-1 rounded">
              <QRCodeSVG value={qrContent} size={70} level="M" />
            </div>
            {/* QR klein */}
            <div className="border border-gray-300 p-1 rounded self-center">
              <QRCodeSVG value={qrContent} size={40} level="M" />
            </div>
            {/* Typ + Spec */}
            <div className="border border-gray-300 p-2 rounded text-center flex-1 self-center">
              <div className="font-bold text-sm text-gray-900">{equipment.type_name || '-'}</div>
              <div className="text-xs text-gray-600">{specification}</div>
            </div>
            {/* Inv + Lager */}
            <div className="border border-gray-300 p-2 rounded text-center self-center">
              <div className="font-bold text-sm text-gray-900">{equipment.inventory_number}</div>
              <div className="text-xs text-gray-600">{locationCode}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Etikett drucken
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {equipment.inventory_number} - {equipment.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Label-Format wählen
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {LABEL_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    selectedPreset === preset.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className={`font-medium text-sm ${
                    selectedPreset === preset.id 
                      ? 'text-blue-700 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {preset.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {preset.size}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Vorschau
            </label>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center justify-center min-h-[180px]">
              {renderPreview()}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              QR-Code: {qrContent}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            PDF speichern
          </button>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {loading ? 'Lädt...' : 'Drucken'}
          </button>
        </div>
      </div>
    </div>
  );
}
