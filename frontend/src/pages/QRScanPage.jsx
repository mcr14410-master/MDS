import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, QrCode, AlertCircle } from 'lucide-react';
import { useStorageItemsStore } from '../stores/storageItemsStore';

/**
 * QR Code Scan Handler Page
 * Handles mds://storage-item/{id} links
 * Redirects to the appropriate detail page after scanning
 */
export default function QRScanPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { scanQRCode, loading, error } = useStorageItemsStore();
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    if (code) {
      handleScan();
    }
  }, [code]);

  const handleScan = async () => {
    const result = await scanQRCode(code);
    
    if (result.success) {
      const { entityType, storageItem } = result.data;
      
      if (entityType === 'storage_item' && storageItem) {
        // Redirect to storage item detail or tool detail page
        if (storageItem.tool_master_id) {
          navigate(`/tools/${storageItem.tool_master_id}`);
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
  };

  if (loading) {
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
                onClick={() => navigate('/tools')}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Zu Werkzeugen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
