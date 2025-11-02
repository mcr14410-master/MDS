// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  REGISTER: `${API_BASE_URL}/api/auth/register`,
  ME: `${API_BASE_URL}/api/auth/me`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
  
  // Parts
  PARTS: `${API_BASE_URL}/api/parts`,
  PARTS_STATS: `${API_BASE_URL}/api/parts/stats`,
  
  // Health
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;
