import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { usePartsStore } from '../stores/partsStore';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { stats, fetchStats } = usePartsStore();

  useEffect(() => {
    fetchStats();
  }, []);

  return (
      <div className="space-y-6">
        {/* Welcome */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Willkommen zurück, {user?.username}! 👋
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            MDS - Fertigungsdaten Management System
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Parts */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">📦</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Bauteile Gesamt
                    </dt>
                    <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {stats?.total_parts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Active Parts */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Aktiv
                    </dt>
                    <dd className="text-2xl font-semibold text-green-600 dark:text-green-400">
                      {stats?.active_parts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Draft Parts */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">📝</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Entwurf
                    </dt>
                    <dd className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                      {stats?.draft_parts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Customers */}
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-3xl">👥</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Kunden
                    </dt>
                    <dd className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                      {stats?.total_customers || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Schnellzugriff</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {user?.permissions?.includes('part.read') && (
              <Link
                to="/parts"
                className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
              >
                <div className="text-2xl mr-3">📦</div>
                <div>
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-300">Bauteile</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Alle Bauteile anzeigen</div>
                </div>
              </Link>
            )}

            {user?.permissions?.includes('part.create') && (
              <Link
                to="/parts/new"
                className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition"
              >
                <div className="text-2xl mr-3">➕</div>
                <div>
                  <div className="text-sm font-medium text-green-900 dark:text-green-300">Neues Bauteil</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Bauteil erstellen</div>
                </div>
              </Link>
            )}

            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mr-3">🚧</div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Weitere Features</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Coming soon...</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Benutzer-Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Rolle</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user?.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">E-Mail</p>
              <p className="text-base font-medium text-gray-900 dark:text-white">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Berechtigungen</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {user?.permissions?.slice(0, 5).map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                  >
                    {perm}
                  </span>
                ))}
                {user?.permissions?.length > 5 && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                    +{user.permissions.length - 5} mehr
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
     );
}
