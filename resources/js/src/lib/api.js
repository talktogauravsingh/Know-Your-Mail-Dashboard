import axios from 'axios';
import { useStore } from '../store/useStore';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for auth token
api.interceptors.request.use((config) => {
  const store = useStore.getState();
  if (store.token) {
    config.headers.Authorization = `Bearer ${store.token}`;
  }
  return config;
});

// Response interceptor for errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const store = useStore.getState();
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      store.addToast('Session expired. Please login again.', 'error');
      store.clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

