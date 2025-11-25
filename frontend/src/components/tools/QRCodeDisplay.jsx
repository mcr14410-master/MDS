import { useState, useRef, useEffect } from 'react';
import { QrCode, Download, Printer, X, Loader2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useStorageItemsStore } from '../../stores/storageItemsStore';

/**
 * QRCodeDisplay Component
 * Displays QR code with download and print functionality
 * Supports two print variants: QR only or QR with label
 */
export default function QRCodeDisplay({ storageItem, onClose }) {
  const { generateQRCode, qrCode, qrCodeLoading } = useStorageItemsStore();
  const [qrSize, setQrSize] = useState(256);
  const [printVariant, setPrintVariant] = useState('qr-only'); // 'qr-only' or 'with-label'
  const qrRef = useRef(null);

  useEffect(() => {
    if (storageItem?.id && !qrCode) {
      generateQRCode(storageItem.id);
    }
  }, [storageItem?.id]);

  const handleDownloadPNG = () => {
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();

    img.onload = () => {
      canvas.width = qrSize;
      canvas.height = qrSize;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, qrSize, qrSize);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qr-code-${storageItem.article_number || storageItem.id}.png`;
        link.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDownloadSVG = () => {
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-${storageItem.article_number || storageItem.id}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    
    let content = '';
    
    if (printVariant === 'qr-only') {
      // QR Code only - centered
      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR-Code ${storageItem.article_number || storageItem.id}</title>
          <style>
            @page { margin: 0; }
            body {
              margin: 0;
              padding: 20mm;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .qr-container {
              text-align: center;
            }
            @media print {
              body { padding: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            ${svgData}
          </div>
        </body>
        </html>
      `;
    } else {
      // QR Code with label
      const locationText = storageItem.location_name 
        ? `${storageItem.location_name} ${storageItem.compartment_name ? '→ ' + storageItem.compartment_name : ''}`
        : 'Kein Lagerort';

      content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR-Code ${storageItem.article_number || storageItem.id}</title>
          <style>
            @page { margin: 0; }
            body {
              margin: 0;
              padding: 20mm;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .label-container {
              border: 2px solid #000;
              padding: 10mm;
              text-align: center;
              background: white;
              max-width: 100mm;
            }
            .qr-code {
              margin: 5mm 0;
            }
            .tool-number {
              font-size: 18pt;
              font-weight: bold;
              margin: 5mm 0;
              border-bottom: 1px solid #666;
              padding-bottom: 3mm;
            }
            .tool-name {
              font-size: 12pt;
              margin: 3mm 0;
            }
            .location {
              font-size: 10pt;
              color: #666;
              margin: 3mm 0;
            }
            @media print {
              body { padding: 5mm; }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="tool-number">${storageItem.article_number || 'N/A'}</div>
            <div class="tool-name">${storageItem.tool_name || 'Unbenannt'}</div>
            <div class="qr-code">${svgData}</div>
            <div class="location">${locationText}</div>
          </div>
        </body>
        </html>
      `;
    }

    printWindow.document.write(content);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const handleRegenerate = () => {
    if (storageItem?.id) {
      generateQRCode(storageItem.id, true); // Force regenerate
    }
  };

  if (!storageItem) {
    return null;
  }

  const qrData = qrCode?.qrData || `mds://storage-item/${storageItem.id}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full p-6 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">QR-Code</h2>
            <p className="text-sm text-gray-400 mt-1">
              {storageItem.article_number} - {storageItem.tool_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {qrCodeLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : (
          <>
            {/* QR Code Display */}
            <div className="text-center space-y-4 mb-6">
              <div 
                ref={qrRef}
                className="bg-white p-8 rounded-lg inline-block shadow-lg"
              >
                <QRCodeSVG
                  value={qrData}
                  size={qrSize}
                  level="H"
                  includeMargin={true}
                />
              </div>
              
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  Scans: {qrCode?.scanCount || 0}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {qrData}
                </p>
              </div>
            </div>

            {/* Size Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                QR-Code Größe
              </label>
              <div className="flex gap-2">
                {[128, 192, 256, 384, 512].map(size => (
                  <button
                    key={size}
                    onClick={() => setQrSize(size)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      qrSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* Print Variant Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Druckvariante
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrintVariant('qr-only')}
                  className={`flex-1 px-4 py-2 rounded transition-colors ${
                    printVariant === 'qr-only'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Nur QR-Code
                </button>
                <button
                  onClick={() => setPrintVariant('with-label')}
                  className={`flex-1 px-4 py-2 rounded transition-colors ${
                    printVariant === 'with-label'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Mit Beschriftung
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownloadPNG}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                PNG
              </button>
              <button
                onClick={handleDownloadSVG}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <Download className="w-4 h-4" />
                SVG
              </button>
              <button
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                Drucken
              </button>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                title="QR-Code neu generieren"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
