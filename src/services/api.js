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

// User Profile endpoints
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (formData) => api.put('/users/profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Agency endpoints
export const agencyAPI = {
  getAll: (params) => api.get('/agencies', { params }),
  getById: (id) => api.get(`/agencies/${id}`),
  create: (formData) => api.post('/agencies', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/agencies/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/agencies/${id}`),
  getMyAgency: () => api.get('/agencies/user/my-agency'),
  createPackage: (formData) => api.post('/agencies/packages', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPackages: (agencyId) => api.get(`/agencies/${agencyId}/packages`),
  getMyPackages: () => api.get('/agencies/packages/my-packages'),
  deletePackage: (id) => api.delete(`/agencies/packages/${id}`),
};

// Taxi endpoints
export const taxiAPI = {
  getAll: (params) => api.get('/taxi', { params }),
  getById: (id) => api.get(`/taxi/${id}`),
  create: (data) => api.post('/taxi', data),
  update: (id, data) => api.put(`/taxi/${id}`, data),
  delete: (id) => api.delete(`/taxi/${id}`),
  getMyTaxi: () => api.get('/taxi/user/my-taxi'),
  addVehicle: (id, data) => api.post(`/taxi/${id}/add-vehicle`, data),
  addDriver: (id, data) => api.post(`/taxi/${id}/add-driver`, data),
};

// Booking endpoints
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  getMyBookings: () => api.get('/bookings'),
  updateStatus: (id, data) => api.put(`/bookings/${id}/status`, data),
};

// Review endpoints
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByProvider: (agencyOrProviderId) => api.get('/reviews', { params: { agencyOrProviderId } }),
};

export default api;