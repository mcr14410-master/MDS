import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { Toaster } from './components/Toaster';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PartsPage from './pages/PartsPage';
import PartDetailPage from './pages/PartDetailPage';
import PartFormPage from './pages/PartFormPage';
import OperationDetailPage from './pages/OperationDetailPage';
import MachinesPage from './pages/MachinesPage';

// Components
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

function App() {
  const { initialize, loading } = useAuthStore();
  const { initializeTheme } = useThemeStore();

  useEffect(() => {
    initialize();
    initializeTheme();
  }, [initialize, initializeTheme]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">MDS wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes with Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout>
                <Outlet />
              </Layout>
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route path="/" element={<DashboardPage />} />
          
          {/* Parts Routes */}
          <Route 
            path="/parts" 
            element={
              <ProtectedRoute requiredPermission="part.read">
                <PartsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/parts/new" 
            element={
              <ProtectedRoute requiredPermission="part.create">
                <PartFormPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/parts/:id" 
            element={
              <ProtectedRoute requiredPermission="part.read">
                <PartDetailPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/parts/:id/edit" 
            element={
              <ProtectedRoute requiredPermission="part.update">
                <PartFormPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Operation Detail Route */}
          <Route 
            path="/parts/:partId/operations/:operationId" 
            element={
              <ProtectedRoute requiredPermission="part.read">
                <OperationDetailPage />
              </ProtectedRoute>
            } 
          />

          {/* Machines Routes */}
          <Route 
            path="/machines" 
            element={
              <ProtectedRoute requiredPermission="machine.read">
                <MachinesPage />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Catch-all redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
