// frontend/src/components/zerobot/ZerobotDiagram.jsx
/**
 * Diagramm-Komponenten für Zerobot-Positionsrechner
 * Zeigt Erklärungsbilder für die Eingabeparameter
 */

import { useState } from 'react';

// Info-Icon Button
export function InfoButton({ onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors ${className}`}
      title="Erklärung anzeigen"
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

// Modal für Diagramm-Anzeige
export function DiagramModal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// Kombiniertes Erklärungsdiagramm mit Tabs
export function ZerobotExplanationDiagram() {
  const [activeView, setActiveView] = useState('gripper');

  const diagrams = {
    gripper: {
      label: 'Greifer',
      src: '/images/zerobot/Greifer.png',
      alt: 'Greifer mit Lanze - Seitenansicht'
    },
    rackTop: {
      label: 'Rack (Draufsicht)',
      src: '/images/zerobot/Rack_draufsicht.png',
      alt: 'Rack X-Y Ebene - Draufsicht'
    },
    rackFront: {
      label: 'Rack (Vorderansicht)',
      src: '/images/zerobot/Rack_vorderansicht.png',
      alt: 'Rack X-Z Ebene - Vorderansicht'
    }
  };

  return (
    <div className="space-y-4">
      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-2">
        {Object.entries(diagrams).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActiveView(key)}
            className={`px-3 py-1.5 text-sm rounded-t-lg transition-colors ${
              activeView === key
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Diagram Image */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <img
          src={diagrams[activeView].src}
          alt={diagrams[activeView].alt}
          className="w-full h-auto max-h-[60vh] object-contain mx-auto"
        />
      </div>

      {/* Parameter-Legende */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">Eingabe-Parameter</h4>
          <ul className="space-y-1 text-gray-600 dark:text-gray-400">
            <li><span className="font-mono text-amber-600">TeilB</span> - Bauteil Breite (X-Richtung)</li>
            <li><span className="font-mono text-amber-600">TeilL</span> - Bauteil Länge (Y-Richtung)</li>
            <li><span className="font-mono text-purple-600">c</span> - Greiferspannlänge</li>
            <li><span className="font-mono text-purple-600">NumS</span> - Schraubenreihe Nr. (1-8)</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 dark:text-gray-300">Maschinen-Parameter</h4>
          <ul className="space-y-1 text-gray-600 dark:text-gray-400">
            <li><span className="font-mono text-emerald-600">e</span> - Anschlagpunkt Y</li>
            <li><span className="font-mono text-blue-600">WinkelB</span> - Winkelbreite</li>
            <li><span className="font-mono text-red-600">d</span> - Distanz/Winkelabstand</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ZerobotExplanationDiagram;
