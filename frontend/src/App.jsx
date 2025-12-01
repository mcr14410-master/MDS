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
import MachineDetailPage from './pages/MachineDetailPage';
import StorageLocationsPage from './pages/StorageLocationsPage';
import StorageLocationDetailPage from './pages/StorageLocationDetailPage';
import ToolCategoriesPage from './pages/ToolCategoriesPage';
import ToolsPage from './pages/ToolsPage';
import ToolDetailPage from './pages/ToolDetailPage';
import QRScanPage from './pages/QRScanPage';
import SuppliersPage from './pages/SuppliersPage';
import SupplierDetailPage from './pages/SupplierDetailPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import ToolNumberListsPage from './pages/ToolNumberListsPage';
import ToolNumberListDetailPage from './pages/ToolNumberListDetailPage';
import MeasuringEquipmentPage from './pages/MeasuringEquipmentPage';
import MeasuringEquipmentDetailPage from './pages/MeasuringEquipmentDetailPage';
import ClampingDevicesPage from './pages/ClampingDevicesPage';
import ClampingDeviceDetailPage from './pages/ClampingDeviceDetailPage';
import FixturesPage from './pages/FixturesPage';
import FixtureDetailPage from './pages/FixtureDetailPage';
import ProfilePage from './pages/ProfilePage';
import UsersPage from './pages/admin/UsersPage';
import UserDetailPage from './pages/admin/UserDetailPage';
import RolesPage from './pages/admin/RolesPage';

// Maintenance Pages
import MaintenanceDashboardPage from './pages/MaintenanceDashboardPage';
import MaintenancePlansPage from './pages/MaintenancePlansPage';
import MaintenancePlanDetailPage from './pages/MaintenancePlanDetailPage';
import MaintenancePlanFormPage from './pages/MaintenancePlanFormPage';
import MyMaintenanceTasksPage from './pages/MyMaintenanceTasksPage';
import TaskExecutePage from './pages/TaskExecutePage';
import MaintenanceTaskDetailPage from './pages/MaintenanceTaskDetailPage';
import AllTasksPage from './pages/AllTasksPage';
import MaintenanceMachinesPage from './pages/MaintenanceMachinesPage';
import MachineMaintenanceStatsPage from './pages/MachineMaintenanceStatsPage';
import OperatingHoursPage from './pages/OperatingHoursPage';
import EscalationsPage from './pages/EscalationsPage';

// Wiki Pages
import WikiPage from './pages/WikiPage';
import WikiArticlePage from './pages/WikiArticlePage';

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
          <Route
            path="/machines/:id"
            element={
              <ProtectedRoute requiredPermission="machine.read">
                <MachineDetailPage />
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
		    path="/customers" 
		    element={
		  	<CustomersPage />
			} 
		   />
		  <Route 
		    path="/customers/:id" 
		    element={
		  	<CustomerDetailPage />
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
		   {/* Measuring Equipment Routes */}
		   <Route 
		     path="/measuring-equipment" 
		     element={
		       <ProtectedRoute requiredPermission="storage.view">
		         <MeasuringEquipmentPage />
		       </ProtectedRoute>
		     } 
		   />
		   <Route 
		     path="/measuring-equipment/:id" 
		     element={
		       <ProtectedRoute requiredPermission="storage.view">
		         <MeasuringEquipmentDetailPage />
		       </ProtectedRoute>
		     } 
		   />
			   {/* Clamping Devices Routes */}
			   <Route 
			     path="/clamping-devices" 
			     element={
			       <ProtectedRoute requiredPermission="storage.view">
			         <ClampingDevicesPage />
			       </ProtectedRoute>
			     } 
			   />
			   <Route 
			     path="/clamping-devices/:id" 
			     element={
			       <ProtectedRoute requiredPermission="storage.view">
			         <ClampingDeviceDetailPage />
			       </ProtectedRoute>
			     } 
			   />
			   {/* Fixtures Routes */}
			   <Route 
			     path="/fixtures" 
			     element={
			       <ProtectedRoute requiredPermission="storage.view">
			         <FixturesPage />
			       </ProtectedRoute>
			     } 
			   />
			   <Route 
			     path="/fixtures/:id" 
			     element={
			       <ProtectedRoute requiredPermission="storage.view">
			         <FixtureDetailPage />
			       </ProtectedRoute>
			     } 
			   />
				   
				   {/* Profile Route */}
				   <Route path="/profile" element={<ProfilePage />} />
				   
				   {/* Admin Routes */}
				   <Route 
				     path="/admin/users" 
				     element={
				       <ProtectedRoute requiredPermission="user.read">
				         <UsersPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/admin/users/:id" 
				     element={
				       <ProtectedRoute requiredPermission="user.read">
				         <UserDetailPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/admin/roles" 
				     element={
				       <ProtectedRoute requiredPermission="user.read">
				         <RolesPage />
				       </ProtectedRoute>
				     } 
				   />
				   {/* Maintenance Routes */}
				   <Route 
				     path="/maintenance" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MaintenanceDashboardPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/plans" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MaintenancePlansPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/plans/new" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.manage_plans">
				         <MaintenancePlanFormPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/plans/:id" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MaintenancePlanDetailPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/plans/:id/edit" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.manage_plans">
				         <MaintenancePlanFormPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/tasks/my" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MyMaintenanceTasksPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/tasks/:id/execute" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.complete">
				         <TaskExecutePage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/tasks/:id/details" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MaintenanceTaskDetailPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/tasks" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <AllTasksPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/machines" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MaintenanceMachinesPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/machines/:id/stats" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <MachineMaintenanceStatsPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/operating-hours" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <OperatingHoursPage />
				       </ProtectedRoute>
				     } 
				   />
				   <Route 
				     path="/maintenance/escalations" 
				     element={
				       <ProtectedRoute requiredPermission="maintenance.read">
				         <EscalationsPage />
				       </ProtectedRoute>
				     } 
				   />

           {/* Wiki Routes */}
           <Route 
             path="/wiki" 
             element={
               <ProtectedRoute requiredPermission="wiki.read">
                 <WikiPage />
               </ProtectedRoute>
             } 
           />
           <Route 
             path="/wiki/:id" 
             element={
               <ProtectedRoute requiredPermission="wiki.read">
                 <WikiArticlePage />
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
