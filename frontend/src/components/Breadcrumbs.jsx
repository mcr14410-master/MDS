import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../config/api';

// Route-zu-Label Mapping
const routeLabels = {
  '': 'Dashboard',
  'parts': 'Bauteile',
  'new': 'Neu',
  'edit': 'Bearbeiten',
  'operations': 'Operationen',
  'machines': 'Maschinen',
  'tools': 'Werkzeuge',
  'categories': 'Kategorien',
  'tool-number-lists': 'T-Nummern Listen',
  'measuring-equipment': 'Messmittel',
  'clamping-devices': 'Spannmittel',
  'fixtures': 'Vorrichtungen',
  'storage': 'Lagerorte',
  'suppliers': 'Lieferanten',
  'purchase-orders': 'Bestellungen',
  'qr': 'QR-Code',
};

// API-Endpunkte für dynamische Labels
const dynamicLabelEndpoints = {
  parts: '/parts',
  tools: '/tools',
  machines: '/machines',
  'measuring-equipment': '/measuring-equipment',
  'clamping-devices': '/clamping-devices',
  fixtures: '/fixtures',
  storage: '/storage-locations',
  suppliers: '/suppliers',
  'purchase-orders': '/purchase-orders',
  'tool-number-lists': '/tool-number-lists',
};

// Icon für Home
const HomeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

// Chevron Separator
const ChevronIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export default function Breadcrumbs() {
  const location = useLocation();
  const [dynamicLabels, setDynamicLabels] = useState({});

  // Pfad in Segmente aufteilen
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Dynamische Labels für IDs laden (z.B. Bauteil-Namen)
  useEffect(() => {
    const loadDynamicLabels = async () => {
      const newLabels = {};
      
      for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        const prevSegment = pathSegments[i - 1];
        
        // Prüfen ob es eine ID ist
        const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
                     /^\d+$/.test(segment);
        
        if (isId && prevSegment && dynamicLabelEndpoints[prevSegment]) {
          try {
            const response = await api.get(`${dynamicLabelEndpoints[prevSegment]}/${segment}`);
            const data = response.data.data || response.data;
            
            // Verschiedene Namensfelder versuchen
            const name = data.part_number || 
                        data.tool_number || 
                        data.name || 
                        data.equipment_number ||
                        data.device_number ||
                        data.fixture_number ||
                        data.list_name ||
                        data.order_number ||
                        data.company_name ||
                        `#${segment.slice(0, 8)}`;
            
            newLabels[segment] = name;
          } catch (error) {
            // Bei Fehler nur kurze ID anzeigen
            newLabels[segment] = `#${segment.slice(0, 8)}`;
          }
        }
      }
      
      if (Object.keys(newLabels).length > 0) {
        setDynamicLabels(prev => ({ ...prev, ...newLabels }));
      }
    };
    
    loadDynamicLabels();
  }, [location.pathname]);

  // Keine Breadcrumbs auf Dashboard
  if (pathSegments.length === 0) {
    return null;
  }

  // Breadcrumb-Items generieren
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    
    // Label ermitteln
    let label = routeLabels[segment];
    
    // Falls keine vordefinierte Route, prüfen ob es eine ID ist
    if (!label) {
      // Prüfen ob es eine UUID oder numerische ID ist
      const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
                   /^\d+$/.test(segment);
      
      if (isId) {
        // Dynamisches Label verwenden falls vorhanden, sonst "Details"
        label = dynamicLabels[segment] || 'Details';
      } else {
        // Segment als Label verwenden (capitalized)
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }
    }

    return {
      path,
      label,
      isLast,
    };
  });

  return (
    <nav className="flex items-center text-sm">
      {/* Home Link */}
      <Link
        to="/"
        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <HomeIcon />
      </Link>

      {/* Breadcrumb Items */}
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center">
          <span className="mx-2">
            <ChevronIcon />
          </span>
          
          {crumb.isLast ? (
            <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              to={crumb.path}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors truncate max-w-[150px]"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
