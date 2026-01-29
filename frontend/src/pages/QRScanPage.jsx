import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import { useStorageItemsStore } from '../stores/storageItemsStore';
import API_BASE_URL from '../config/api';

/**
 * QR Code Scan Handler Page
 * Handles various QR code formats:
 * - ME:{inventory_number} - Messmittel
 * - TM:{article_number} - Tool Master
 * - SI:{id} - Storage Item
 * - CD:{inventory_number} - Clamping Device (Spannmittel)
 * - FX:{inventory_number} - Fixture (Vorrichtung)
 * - Legacy: mds://storage-item/{id}
 * Redirects to the appropriate detail page after scanning
 */
export default function QRScanPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { scanQRCode, loading, error } = useStorageItemsStore();
  const [scanError, setScanError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    if (code) {
      handleScan();
    }
  }, [code]);

  const handleScan = async () => {
    setProcessing(true);
    setScanError(null);
    
    // Parse short format codes (ME:MM-0042, TM:12345, etc.)
    const shortFormatMatch = code.match(/^(ME|TM|SI|CD|FX):(.+)$/i);
    
    if (shortFormatMatch) {
      const [, prefix, identifier] = shortFormatMatch;
      const token = localStorage.getItem('token');
      
      try {
        switch (prefix.toUpperCase()) {
          case 'ME': {
            // Messmittel - lookup by inventory_number
            const response = await fetch(
              `${API_BASE_URL}/api/measuring-equipment?search=${encodeURIComponent(identifier)}&limit=1`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success && data.data.length > 0) {
              const found = data.data.find(e => e.inventory_number === identifier);
              if (found) {
                navigate(`/measuring-equipment/${found.id}`);
                return;
              }
            }
            setScanError(`Messmittel "${identifier}" nicht gefunden`);
            break;
          }
          case 'TM': {
            // Tool Master - lookup by article_number
            const response = await fetch(
              `${API_BASE_URL}/api/tools?search=${encodeURIComponent(identifier)}&limit=1`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success && data.data.length > 0) {
              const found = data.data.find(t => t.article_number === identifier);
              if (found) {
                navigate(`/tools/${found.id}`);
                return;
              }
            }
            setScanError(`Werkzeug "${identifier}" nicht gefunden`);
            break;
          }
          case 'SI': {
            // Storage Item - direct ID
            navigate(`/storage/items/${identifier}`);
            return;
          }
          case 'CD': {
            // Clamping Device - lookup by inventory_number
            const response = await fetch(
              `${API_BASE_URL}/api/clamping-devices?search=${encodeURIComponent(identifier)}&limit=1`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success && data.data.length > 0) {
              const found = data.data.find(c => c.inventory_number === identifier);
              if (found) {
                navigate(`/clamping-devices/${found.id}`);
                return;
              }
            }
            setScanError(`Spannmittel "${identifier}" nicht gefunden`);
            break;
          }
          case 'FX': {
            // Fixture - lookup by inventory_number
            const response = await fetch(
              `${API_BASE_URL}/api/fixtures?search=${encodeURIComponent(identifier)}&limit=1`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await response.json();
            if (data.success && data.data.length > 0) {
              const found = data.data.find(f => f.inventory_number === identifier);
              if (found) {
                navigate(`/fixtures/${found.id}`);
                return;
              }
            }
            setScanError(`Vorrichtung "${identifier}" nicht gefunden`);
            break;
          }
          default:
            setScanError(`Unbekanntes Präfix: ${prefix}`);
        }
      } catch (err) {
        setScanError(`Fehler beim Suchen: ${err.message}`);
      }
      setProcessing(false);
      return;
    }
    
    // Legacy format - use API scan
    const result = await scanQRCode(code);
    
    if (result.success) {
      const { entityType, storageItem } = result.data;
      
      if (entityType === 'storage_item' && storageItem) {
        // Redirect to storage item detail or tool detail page
        if (storageItem.tool_master_id) {
          navigate(`/tools/${storageItem.tool_master_id}`);
        } else if (storageItem.measuring_equipment_id) {
          navigate(`/measuring-equipment/${storageItem.measuring_equipment_id}`);
        } else {
          // If we have a dedicated storage items page
          navigate(`/storage/items/${storageItem.id}`);
        }
      } else {
        setScanError('Unbekannter QR-Code Typ');
      }
    } else {
      setScanError(result.error || 'QR-Code konnte nicht gescannt werden');
    }
    setProcessing(false);
  };

  if (loading || processing) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">QR-Code wird verarbeitet...</p>
          <p className="text-sm text-gray-500 mt-2">Code: {code}</p>
        </div>
      </div>
    );
  }

  if (scanError || error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              QR-Code Scan Fehler
            </h1>
            
            <p className="text-gray-400 text-center mb-6">
              {scanError || error}
            </p>
            
            <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-500 text-center">Code:</p>
              <p className="text-gray-300 text-center font-mono break-all">{code}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Zur Startseite
              </button>
              <button
                onClick={() => navigate(-1)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Zurück
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
