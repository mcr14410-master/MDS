import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, AlertCircle, ArrowRight } from 'lucide-react';

/**
 * Scanner Input Page
 * Allows QR/Barcode scanning via USB scanner (keyboard emulation)
 * or manual code entry
 */
export default function ScannerPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [lastScans, setLastScans] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load last scans from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mds_last_scans');
    if (saved) {
      try {
        setLastScans(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const saveToHistory = (scannedCode) => {
    const newHistory = [
      { code: scannedCode, timestamp: new Date().toISOString() },
      ...lastScans.filter(s => s.code !== scannedCode)
    ].slice(0, 10);
    setLastScans(newHistory);
    localStorage.setItem('mds_last_scans', JSON.stringify(newHistory));
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setError(null);

    // Parse code format
    const match = trimmedCode.match(/^(ME|TM|SI|CD|FX):(.+)$/i);
    
    if (match) {
      saveToHistory(trimmedCode);
      // Navigate to QR handler which does the lookup
      navigate(`/qr/${encodeURIComponent(trimmedCode)}`);
    } else {
      setError('Ungültiges Format. Erwartet: ME:xxx, TM:xxx, CD:xxx, FX:xxx');
    }
  };

  const handleKeyDown = (e) => {
    // Clear error on new input
    if (error && e.key !== 'Enter') {
      setError(null);
    }
  };

  const getTypeLabel = (prefix) => {
    switch (prefix?.toUpperCase()) {
      case 'ME': return 'Messmittel';
      case 'TM': return 'Werkzeug';
      case 'CD': return 'Spannmittel';
      case 'FX': return 'Vorrichtung';
      case 'SI': return 'Lagerartikel';
      default: return 'Unbekannt';
    }
  };

  const getTypeColor = (prefix) => {
    switch (prefix?.toUpperCase()) {
      case 'ME': return 'text-blue-400';
      case 'TM': return 'text-green-400';
      case 'CD': return 'text-yellow-400';
      case 'FX': return 'text-purple-400';
      case 'SI': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        {/* Main Scanner Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center">
              <QrCode className="w-10 h-10 text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2">
            QR-Code Scanner
          </h1>
          
          <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
            Code scannen oder manuell eingeben
          </p>

          {/* Input Form */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ME:MM-0001"
                className={`w-full px-4 py-4 text-lg font-mono text-center rounded-xl border-2 
                  ${error 
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  } 
                  text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                  transition-colors`}
                autoComplete="off"
                autoFocus
              />
              
              {code && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 flex items-center gap-2 text-red-500 dark:text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Hint */}
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-500 text-center">
              Scanner tippt automatisch + Enter
            </p>
          </form>

          {/* Supported Formats */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
              Unterstützte Formate
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {['ME', 'TM', 'CD', 'FX'].map(prefix => (
                <span 
                  key={prefix}
                  className={`px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 ${getTypeColor(prefix)}`}
                >
                  {prefix}: {getTypeLabel(prefix)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        {lastScans.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Letzte Scans
            </h2>
            <div className="space-y-2">
              {lastScans.slice(0, 5).map((scan, idx) => {
                const match = scan.code.match(/^(ME|TM|SI|CD|FX):(.+)$/i);
                const prefix = match?.[1];
                const identifier = match?.[2];
                
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCode(scan.code);
                      navigate(`/qr/${encodeURIComponent(scan.code)}`);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${getTypeColor(prefix)}`}>
                        {prefix}
                      </span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {identifier}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(scan.timestamp).toLocaleTimeString('de-DE', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 w-full py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          ← Zurück
        </button>
      </div>
    </div>
  );
}
