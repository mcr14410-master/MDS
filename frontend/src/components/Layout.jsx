import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Sidebar, { Icons } from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import GlobalSearch from './GlobalSearch';

const SIDEBAR_COLLAPSED_KEY = 'mds-sidebar-collapsed';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Sidebar-Zustand aus LocalStorage laden (nach Mount)
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (saved === 'true') {
      setSidebarCollapsed(true);
    }
  }, []);

  // Sidebar-Zustand in LocalStorage speichern
  const handleToggleCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newState));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Dynamisches Padding basierend auf Sidebar-Zustand
  const mainPadding = sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className={`${mainPadding} flex flex-col min-h-screen transition-all duration-300`}>
        {/* Schmaler Header - Breadcrumbs links, Suche rechts */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-10 px-4">
            {/* Left: Mobile Menu + Breadcrumbs */}
            <div className="flex items-center min-w-0 flex-1">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 mr-3 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Icons.Menu />
              </button>

              {/* Breadcrumbs */}
              <Breadcrumbs />
            </div>

            {/* Right: Scanner + Global Search */}
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <Link
                to="/scanner"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="QR-Scanner"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </Link>
              <GlobalSearch />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-1.5 px-6 text-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          MDS - Manufacturing Data System • © 2025
        </footer>
      </div>
    </div>
  );
}
