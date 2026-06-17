import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Agency endpoints (for later)
export const agencyAPI = {
  getAll: (params) => api.get('/agencies', { params }),
  getById: (id) => api.get(`/agencies/${id}`),
  create: (data) => api.post('/agencies', data),
  update: (id, data) => api.put(`/agencies/${id}`, data),
  delete: (id) => api.delete(`/agencies/${id}`),
};

// Taxi endpoints (for later)
export const taxiAPI = {
  getAll: (params) => api.get('/taxi', { params }),
  getById: (id) => api.get(`/taxi/${id}`),
  create: (data) => api.post('/taxi', data),
  update: (id, data) => api.put(`/taxi/${id}`, data),
  delete: (id) => api.delete(`/taxi/${id}`),
};

export default api;