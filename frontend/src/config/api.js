// API Configuration
// Production: Relative URLs wenn nicht auf localhost
// Development: http://localhost:5000
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

const API_BASE_URL = isProduction 
  ? '' 
  : (import.meta.env.VITE_API_URL ?? 'http://localhost:5000');

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  
  // Users (Admin)
  USERS: `${API_BASE_URL}/api/users`,
  USER_PROFILE: `${API_BASE_URL}/api/users/profile`,
  
  // Roles & Permissions
  ROLES: `${API_BASE_URL}/api/roles`,
  PERMISSIONS: `${API_BASE_URL}/api/permissions`,
  ROLES_MATRIX: `${API_BASE_URL}/api/roles/matrix`,
  
  // Parts
  PARTS: `${API_BASE_URL}/api/parts`,
  PARTS_STATS: `${API_BASE_URL}/api/parts/stats`,
  
  // Operations
  OPERATIONS: `${API_BASE_URL}/api/operations`,
  
  // Programs
  PROGRAMS: `${API_BASE_URL}/api/programs`,
  
  // Machines
  MACHINES: `${API_BASE_URL}/api/machines`,
  
  // Setup Sheets
  SETUP_SHEETS: `${API_BASE_URL}/api/setup-sheets`,
  
  // Tool Lists
  TOOL_LISTS: `${API_BASE_URL}/api/programs`, // Base for /programs/:id/tools
  TOOLS: `${API_BASE_URL}/api/tools`,         // Base for /tools/:id
  
  // Inspection Plans
  INSPECTION_PLANS: `${API_BASE_URL}/api/operations`,           // Base for /operations/:id/inspection-plan
  INSPECTION_PLAN_ITEMS: `${API_BASE_URL}/api/inspection-plan-items`, // Base for /inspection-plan-items/:id
  
  // Suppliers
  SUPPLIERS: `${API_BASE_URL}/api/suppliers`,
  SUPPLIER_ITEMS: `${API_BASE_URL}/api/supplier-items`,

  // Health
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;
