import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Fehlerbehandlung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Fehler:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Bauteile
export const bauteilService = {
  getAll: () => api.get('/bauteile'),
  getById: (id) => api.get(`/bauteile/${id}`),
  getComplete: (id) => api.get(`/bauteile/${id}/complete`),
  search: (query) => api.get(`/bauteile/search?q=${query}`),
  create: (data) => api.post('/bauteile', data),
  update: (id, data) => api.put(`/bauteile/${id}`, data),
  delete: (id) => api.delete(`/bauteile/${id}`),
};

// NC-Programme
export const ncProgrammService = {
  getAll: () => api.get('/nc-programme'),
  getById: (id) => api.get(`/nc-programme/${id}`),
  create: (data) => api.post('/nc-programme', data),
  update: (id, data) => api.put(`/nc-programme/${id}`, data),
  delete: (id) => api.delete(`/nc-programme/${id}`),
};

// Werkzeuge
export const werkzeugService = {
  getAll: () => api.get('/werkzeuge'),
  getById: (id) => api.get(`/werkzeuge/${id}`),
  create: (data) => api.post('/werkzeuge', data),
  update: (id, data) => api.put(`/werkzeuge/${id}`, data),
  delete: (id) => api.delete(`/werkzeuge/${id}`),
};

export default api;
