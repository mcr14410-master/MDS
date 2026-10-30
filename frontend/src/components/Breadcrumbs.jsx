import { Link, matchPath, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from '../utils/axios';

// Route-zu-Label Mapping
const routeLabels = {
  '': 'Dashboard',
  'parts': 'Bauteile',
  'new': 'Neu',
  'edit': 'Bearbeiten',
  'operations': 'Operationen',
  'machines': 'Maschinen',
  'nc-programs': 'NC-Programme',
  'cmm-programs': 'Messprogramme',
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
  'changelog': 'Was ist neu',
  'customers': 'Kunden',
  'consumables': 'Verbrauchsmaterial',
  'zerobot': 'Zerobot Rechner',
  'scanner': 'Scanner',
  'wiki': 'Wiki',
  'profile': 'Mein Profil',
  'users': 'Benutzer',
  'roles': 'Rollen & Berechtigungen',
  'operation-types': 'Operationstypen',
  'cron-jobs': 'Automatische Aufgaben',
  'agents': 'Agenten',
  'maintenance': 'Wartung',
  'plans': 'Wartungspläne',
  'tasks': 'Alle Aufgaben',
  'escalations': 'Eskalationen',
  'operating-hours': 'Betriebsstunden',
  'execute': 'Durchführen',
  'details': 'Details',
  'stats': 'Statistik',
  'calendar': 'Kalender',
};

// Labels für ganze Pfade – gehen vor, wenn ein Segment je nach Bereich anders heißt (my, admin, machines)
const pathLabels = {
  '/vacations': 'Urlaub & Arbeitszeit',
  '/vacations/my': 'Mein Bereich',
  '/vacations/admin': 'Verwaltung',
  '/admin': 'Administration',
  '/maintenance/tasks/my': 'Meine Aufgaben',
  '/maintenance/machines': 'Maschinen-Status',
};

// Pfade ohne eigene Seite: als Text statt Link (ein Klick landete sonst über die Auffangroute auf dem Dashboard)
const pathsWithoutPage = ['/admin', '/qr', '/maintenance/tasks/:id', '/maintenance/machines/:id'];

// Pfade, deren Stufen anders dargestellt werden: Zeiterfassung eines Mitarbeiters liegt unter Urlaub & Arbeitszeit → Verwaltung
const pathCrumbs = {
  '/time-tracking': [
    { label: 'Urlaub & Arbeitszeit', path: '/vacations' },
    { label: 'Verwaltung', path: '/vacations/admin' },
  ],
  '/time-tracking/user': [],
  // „Alle Aufgaben“ nur als Seitenname; als Zwischenstufe (Meine Aufgaben, Aufgabe durchführen) neutral
  '/maintenance/tasks': [{ label: 'Aufgaben', path: '/maintenance/tasks' }],
};

// Namen für IDs: Endpoint (wie auf der Detailseite) und Feld, das die Detailseite als Titel zeigt
const userName = (d) => [d.first_name, d.last_name].filter(Boolean).join(' ') || d.username;
const dynamicLabelSources = {
  parts: { endpoint: '/api/parts', label: (d) => d.part_number },
  tools: { endpoint: '/api/tool-master', label: (d) => d.tool_name },
  machines: { endpoint: '/api/machines', label: (d) => d.name },
  'measuring-equipment': { endpoint: '/api/measuring-equipment', label: (d) => d.inventory_number },
  'clamping-devices': { endpoint: '/api/clamping-devices', label: (d) => d.name },
  fixtures: { endpoint: '/api/fixtures', label: (d) => d.fixture_number },
  storage: { endpoint: '/api/storage/locations', label: (d) => d.name },
  suppliers: { endpoint: '/api/suppliers', label: (d) => d.name },
  customers: { endpoint: '/api/customers', label: (d) => d.name },
  consumables: { endpoint: '/api/consumables', label: (d) => d.name },
  'purchase-orders': { endpoint: '/api/purchase-orders', label: (d) => d.order_number },
  'tool-number-lists': { endpoint: '/api/tool-number-lists', label: (d) => d.name },
  plans: { endpoint: '/api/maintenance/plans', label: (d) => d.title },
  tasks: { endpoint: '/api/maintenance/tasks', label: (d) => d.plan_title || d.title },
  users: { endpoint: '/api/users', label: userName },
  user: { endpoint: '/api/users', label: userName },
};

const isIdSegment = (segment) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) || /^\d+$/.test(segment);

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
        const source = dynamicLabelSources[pathSegments[i - 1]];

        if (isIdSegment(segment) && source) {
          // Schlüssel ist der Pfad, nicht die ID – /parts/1 und /machines/1 sind verschiedene Dinge
          const path = '/' + pathSegments.slice(0, i + 1).join('/');
          try {
            const response = await axios.get(`${source.endpoint}/${segment}`);
            // Antworten tragen das Objekt unter data, part (Bauteile) oder user (Benutzer)
            const data = response.data.data || response.data.part || response.data.user || response.data;
            newLabels[path] = source.label(data) || `#${segment.slice(0, 8)}`;
          } catch {
            // Bei Fehler (z. B. fehlendes Recht) nur kurze ID anzeigen
            newLabels[path] = `#${segment.slice(0, 8)}`;
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
  const breadcrumbs = pathSegments.flatMap((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;

    // Stufen, die anders dargestellt werden (nie für die letzte Stufe – die ist die aktuelle Seite)
    if (!isLast && pathCrumbs[path]) {
      return pathCrumbs[path].map((crumb) => ({ ...crumb, isLast: false, isLink: true }));
    }

    // Label ermitteln: ganzer Pfad vor Segment
    let label = pathLabels[path] || routeLabels[segment];

    // Falls keine vordefinierte Route, prüfen ob es eine ID ist
    if (!label) {
      if (isIdSegment(segment)) {
        // Dynamisches Label verwenden falls vorhanden, sonst "Details"
        label = dynamicLabels[path] || 'Details';
      } else {
        // Segment als Label verwenden (capitalized)
        label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      }
    }

    return [{
      path,
      label,
      isLast,
      isLink: !pathsWithoutPage.some((pattern) => matchPath(pattern, path)),
    }];
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
          ) : !crumb.isLink ? (
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
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
