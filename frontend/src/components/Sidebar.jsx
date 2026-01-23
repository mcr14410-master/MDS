import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useMaintenanceStore } from '../stores/maintenanceStore';

// Icons als SVG-Komponenten
const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Parts: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  Machine: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  Tools: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  TNumbers: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  ),
  Measuring: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Clamping: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Fixtures: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  ),
  Storage: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  Suppliers: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  Orders: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  ChevronDoubleLeft: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  ChevronDoubleRight: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
  Menu: () => (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Sun: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Moon: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  Profile: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Maintenance: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Wiki: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Einzelner Menüpunkt
function NavItem({ to, icon: Icon, label, isActive, collapsed }) {
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      } ${collapsed ? 'justify-center' : ''}`}
    >
      <Icon />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

// Collapsible Menü-Gruppe
function NavGroup({ title, icon: Icon, children, routes = [], collapsed }) {
  const location = useLocation();
  
  // Prüfe ob ein Kind aktiv ist
  const hasActiveChild = routes.some(route => 
    location.pathname === route || 
    location.pathname.startsWith(route + '/')
  );
  
  // State für Öffnen/Schließen - nur offen wenn Kind aktiv
  const [isOpen, setIsOpen] = useState(hasActiveChild);
  
  // Automatisch öffnen/schließen basierend auf aktiver Route
  useEffect(() => {
    setIsOpen(hasActiveChild);
  }, [location.pathname, hasActiveChild]);

  // Collapsed: Nur Icon mit Tooltip zeigen
  if (collapsed) {
    return (
      <div className="relative group">
        <button
          className={`w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasActiveChild
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Icon />
        </button>
        
        {/* Flyout Menu auf Hover */}
        <div className="absolute left-full top-0 hidden group-hover:block z-50">
          {/* Unsichtbare Brücke für Hover-Kontinuität */}
          <div className="absolute -left-2 top-0 w-2 h-full" />
          
          <div className="ml-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[180px]">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              {title}
            </div>
            <div className="py-1">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          hasActiveChild
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon />
          <span>{title}</span>
        </div>
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
          <Icons.ChevronDown />
        </span>
      </button>
      
      {isOpen && (
        <div className="ml-4 pl-4 border-l border-gray-200 dark:border-gray-700 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

// Sub-Menüpunkt (innerhalb einer Gruppe)
function NavSubItem({ to, label, badge, exact }) {
  const location = useLocation();
  
  // Exaktes Matching für bestimmte Routen, sonst startsWith
  const isActive = exact 
    ? location.pathname === to
    : location.pathname === to || 
      (location.pathname.startsWith(to + '/') && !to.endsWith('/'));

  return (
    <Link
      to={to}
      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500 text-white animate-pulse">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose, collapsed, onToggleCollapse, onLogout }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const { darkMode, toggleTheme } = useThemeStore();
  const { escalations, fetchEscalations } = useMaintenanceStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Offene Eskalationen zählen
  const openEscalationsCount = escalations.filter(e => e.status === 'open' || e.status === 'acknowledged').length;

  // Eskalationen einmal beim Start laden
  useEffect(() => {
    if (user?.permissions?.includes('maintenance.read')) {
      fetchEscalations();
    }
  }, [user]);

  const hasPermission = (permission) => {
    return user?.permissions?.includes(permission);
  };

  // Sidebar-Breite basierend auf collapsed state
  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full ${sidebarWidth} bg-white dark:bg-gray-800 shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'overflow-visible' : ''}`}
      >
        {/* Logo Header */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-12 px-4 border-b border-gray-200 dark:border-gray-700`}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-gray-900 dark:text-white">MDS</span>
            )}
          </Link>
          
          {/* Mobile Close Button */}
          {!collapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Icons.Close />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 ${collapsed ? 'px-2 overflow-visible' : 'px-3 overflow-y-auto'} py-4 space-y-2 h-[calc(100vh-8rem)]`}>
          {/* Dashboard */}
          <NavItem
            to="/"
            icon={Icons.Dashboard}
            label="Dashboard"
            isActive={location.pathname === '/'}
            collapsed={collapsed}
          />

          {/* Fertigung */}
          {(hasPermission('part.read') || hasPermission('machine.read')) && (
            <NavGroup 
              title="Fertigung" 
              icon={Icons.Parts} 
              routes={['/parts', '/machines', '/customers']}
              collapsed={collapsed}
            >
              {hasPermission('part.read') && (
                <>
                  <NavSubItem to="/customers" label="Kunden" />
                  <NavSubItem to="/parts" label="Bauteile" />
                </>
              )}
              {hasPermission('machine.read') && (
                <NavSubItem to="/machines" label="Maschinen" />
              )}
            </NavGroup>
          )}

          {/* Werkzeuge & Equipment */}
          {hasPermission('tools.view') && (
            <NavGroup 
              title="Werkzeuge & Equipment" 
              icon={Icons.Tools}
              routes={['/tools', '/tool-number-lists', '/measuring-equipment', '/clamping-devices', '/fixtures']}
              collapsed={collapsed}
            >
              <NavSubItem to="/tools" label="Werkzeuge" />
              <NavSubItem to="/tool-number-lists" label="T-Nummern Listen" />
              {hasPermission('measuring.view') && (
                <NavSubItem to="/measuring-equipment" label="Messmittel" />
              )}
              {hasPermission('storage.view') && (
                <>
                  <NavSubItem to="/clamping-devices" label="Spannmittel" />
                  <NavSubItem to="/fixtures" label="Vorrichtungen" />
                </>
              )}
            </NavGroup>
          )}

          {/* Lager & Einkauf */}
          {hasPermission('storage.view') && (
            <NavGroup 
              title="Lager & Einkauf" 
              icon={Icons.Storage}
              routes={['/storage', '/consumables', '/suppliers', '/purchase-orders']}
              collapsed={collapsed}
            >
              <NavSubItem to="/storage" label="Lagerorte" />
              <NavSubItem to="/consumables" label="Verbrauchsmaterial" />
              <NavSubItem to="/suppliers" label="Lieferanten" />
              <NavSubItem to="/purchase-orders" label="Bestellungen" />
            </NavGroup>
          )}

          {/* Wartung */}
          {hasPermission('maintenance.read') && (
            <NavGroup 
              title="Wartung" 
              icon={Icons.Maintenance}
              routes={['/maintenance', '/maintenance/plans', '/maintenance/tasks/my', '/maintenance/tasks', '/maintenance/escalations', '/maintenance/operating-hours', '/maintenance/machines']}
              collapsed={collapsed}
            >
              <NavSubItem to="/maintenance" label="Dashboard" exact />
              <NavSubItem to="/maintenance/tasks/my" label="Meine Aufgaben" />
              <NavSubItem to="/maintenance/tasks" label="Alle Aufgaben" exact />
              <NavSubItem to="/maintenance/plans" label="Wartungspläne" />
              <NavSubItem to="/maintenance/machines" label="Maschinen-Status" />
              <NavSubItem to="/maintenance/operating-hours" label="Betriebsstunden" />
              <NavSubItem to="/maintenance/escalations" label="Eskalationen" badge={openEscalationsCount} />
            </NavGroup>
          )}

          {/* Wiki */}
          {hasPermission('wiki.read') && (
            <NavItem 
              to="/wiki" 
              icon={Icons.Wiki} 
              label="Wiki" 
              isActive={location.pathname.startsWith('/wiki')}
              collapsed={collapsed}
            />
          )}

          {/* Urlaub & Arbeitszeit */}
          {hasPermission('vacations.read') && (
            <NavGroup 
              title="Urlaub & Arbeitszeit" 
              icon={Icons.Calendar}
              routes={['/vacations', '/vacations/calendar', '/vacations/my', '/vacations/admin']}
              collapsed={collapsed}
            >
              <NavSubItem to="/vacations/calendar" label="Kalender" />
              <NavSubItem to="/vacations/my" label="Mein Bereich" />
              {hasPermission('vacations.manage') && (
                <NavSubItem to="/vacations/admin" label="Verwaltung" />
              )}
            </NavGroup>
          )}

          {/* Kategorien (Admin-Bereich) */}
          {hasPermission('tools.view') && (
            <NavGroup 
              title="Stammdaten" 
              icon={Icons.Clamping}
              routes={['/tools/categories']}
              collapsed={collapsed}
            >
              <NavSubItem to="/tools/categories" label="Werkzeug-Kategorien" />
            </NavGroup>
          )}

          {/* Administration */}
          {hasPermission('user.read') && (
            <NavGroup 
              title="Administration" 
              icon={Icons.Users}
              routes={['/admin/users', '/admin/roles', '/admin/operation-types', '/profile']}
              collapsed={collapsed}
            >
              <NavSubItem to="/admin/users" label="Benutzer" />
              <NavSubItem to="/admin/roles" label="Rollen & Berechtigungen" />
              <NavSubItem to="/admin/operation-types" label="Operationstypen" />
              <NavSubItem to="/profile" label="Mein Profil" />
            </NavGroup>
          )}
          
          {/* Profil-Link für Nicht-Admins */}
          {!hasPermission('user.read') && (
            <NavItem
              to="/profile"
              icon={Icons.Profile}
              label="Mein Profil"
              isActive={location.pathname === '/profile'}
              collapsed={collapsed}
            />
          )}
        </nav>

        {/* Footer mit User, Theme Toggle & Collapse */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          
          {/* User-Bereich */}
          {!collapsed ? (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                {/* Avatar + User Info als Link */}
                <Link to="/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
                  <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-700 transition-colors">
                    <span className="text-white font-medium text-sm">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.roles?.join(', ') || 'Benutzer'}
                    </p>
                  </div>
                </Link>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Abmelden"
                >
                  <Icons.Logout />
                </button>
              </div>
            </div>
          ) : (
            /* Collapsed User Menu */
            <div className="relative group p-2 border-b border-gray-200 dark:border-gray-700">
              <button
                className="w-full flex items-center justify-center p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                title={user?.username}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-xs">
                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </button>
              
              {/* Flyout User Menu */}
              <div className="absolute left-full bottom-0 ml-2 hidden group-hover:block z-50">
                <div className="absolute -left-2 bottom-0 w-2 h-full" />
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px]">
                  <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.roles?.join(', ') || 'Benutzer'}
                    </p>
                  </div>
                  <Link
                    to="/profile"
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Icons.Profile />
                    Mein Profil
                  </Link>
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <Icons.Logout />
                    Abmelden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Theme Toggle & Collapse Row */}
          <div className={`flex items-center ${collapsed ? 'flex-col py-2 gap-2' : 'justify-between px-3 py-1'}`}>
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${collapsed ? 'justify-center' : ''}`}
              title={darkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {darkMode ? <Icons.Sun /> : <Icons.Moon />}
              {!collapsed && <span className="text-xs">{darkMode ? 'Light' : 'Dark'}</span>}
            </button>

            {/* Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex items-center gap-2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={collapsed ? 'Erweitern' : 'Minimieren'}
            >
              {collapsed ? <Icons.ChevronDoubleRight /> : <Icons.ChevronDoubleLeft />}
              {!collapsed && <span className="text-xs">Minimieren</span>}
            </button>
          </div>
          
          {/* Version */}
          {!collapsed && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-1.5 border-t border-gray-200 dark:border-gray-700">
              MDS v2.1.0
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

// Export für Mobile Toggle
export { Icons };
