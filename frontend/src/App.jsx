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
import StorageLocationsPage from './pages/StorageLocationsPage';
import StorageLocationDetailPage from './pages/StorageLocationDetailPage';
import ToolCategoriesPage from './pages/ToolCategoriesPage';
import ToolsPage from './pages/ToolsPage';
import ToolDetailPage from './pages/ToolDetailPage';
import QRScanPage from './pages/QRScanPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import ToolNumberListsPage from './pages/ToolNumberListsPage';
import ToolNumberListDetailPage from './pages/ToolNumberListDetailPage';

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

          {/* Storage Routes */}
          <Route
            path="/storage"
            element={
              <ProtectedRoute requiredPermission="storage.view">
                <StorageLocationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/storage/:id"
            element={
              <ProtectedRoute requiredPermission="storage.view">
                <StorageLocationDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Tool Categories Routes */}
          <Route
            path="/tools/categories"
            element={
              <ProtectedRoute requiredPermission="tools.view">
                <ToolCategoriesPage />
              </ProtectedRoute>
            }
          />

          {/* Tools Master Routes */}
          <Route
            path="/tools"
            element={
              <ProtectedRoute requiredPermission="tools.view">
                <ToolsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/:id"
            element={
              <ProtectedRoute requiredPermission="tools.view">
                <ToolDetailPage />
              </ProtectedRoute>
            }
          />
		  <Route 
		    path="/qr/:code" 
		    element={
		  	<QRScanPage />
			} 
		  />	
		  <Route 
		    path="/suppliers" 
		    element={
		  	<SuppliersPage />
			} 
		   />
		  <Route 
		    path="/suppliers/:id" 
		    element={
		  	<SupplierDetailPage />
			} 
		   />
		  <Route 
		    path="/purchase-orders" 
		    element={
		  	<PurchaseOrdersPage />
			} 
		   />
		  <Route 
		    path="/purchase-orders/:id" 
		    element={
		  	<PurchaseOrderDetailPage />
			} 
		   />
		  
		  
		  {/* Tool Number Lists */}
		  <Route 
		    path="/tool-number-lists" 
		    element={
		  	<ProtectedRoute requiredPermission="tools.view">
		  	  <ToolNumberListsPage />
		  	</ProtectedRoute>
			} 
		   />
		  <Route 
		    path="/tool-number-lists/:id" 
		    element={
		  	<ProtectedRoute requiredPermission="tools.view">
		  	  <ToolNumberListDetailPage />
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
