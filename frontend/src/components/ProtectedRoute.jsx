import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function ProtectedRoute({ children, requiredPermission = null }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permission if required
  if (requiredPermission) {
    const hasPermission = user.permissions?.includes(requiredPermission);
    if (!hasPermission) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
            <div className="text-red-600 text-5xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Keine Berechtigung</h2>
            <p className="text-gray-600 mb-6">
              Sie haben keine Berechtigung für diese Seite.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Zurück
            </button>
          </div>
        </div>
      );
    }
  }

  return children;
}
