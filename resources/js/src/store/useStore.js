import { create } from 'zustand';
import api from '../lib/api.js';
import { mockTemplates } from '../lib/mockData';

export const useStore = create((set, get) => ({
  user: null,
  token: null,
  theme: 'light',
  isLoading: false,

  // Persistence helpers
  persistAuth: (user, token) => {
    localStorage.setItem('authUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    set({ user, token });
  },
  clearAuth: () => {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
    set({ user: null, token: null });
  },
  initAuth: async () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('authUser');
    if (token && userStr) {
      const user = JSON.parse(userStr);
      set({ user, token });
      // Validate
      try {
        await get().fetchUser();
      } catch {
        get().clearAuth();
      }
    }
  },

  // Auth
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', credentials);
      get().persistAuth(data.user, data.token);
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Login failed', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Register new user
  register: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', credentials);
      get().persistAuth(data.user, data.token);
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Registration failed', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    get().clearAuth();
  },
  fetchUser: async () => {
    try {
      const { data } = await api.get('/user');
      const token = get().token;
      get().persistAuth(data, token);
    } catch {
      get().clearAuth();
    }
  },

toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  // Toasts
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) => set((state) => ({ 
    toasts: state.toasts.filter(t => t.id !== id) 
  })),

  // Toast notifications
  toasts: [],
  addToast: (message, type = 'error') => {
    const id = Date.now();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },
  removeToast: (id) => set((state) => ({ 
    toasts: state.toasts.filter(toast => toast.id !== id) 
  })),
  
  // Campaigns - Replace mocks with API
  campaigns: [],
  currentCampaign: null,
  campaignsLoading: false,
  fetchCampaigns: async () => {
    set({ campaignsLoading: true });
    try {
      const { data } = await api.get('/campaigns');
      set({ campaigns: data.data || data }); // handle pagination
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      set({ campaignsLoading: false });
    }
  },
  fetchCampaignDetail: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/analysis/campaign/${id}`);
      set({ currentCampaign: data });
      return data;
    } catch (error) {
      console.error('Failed to fetch campaign detail:', error);
    } finally {
      set({ isLoading: false });
    }
  },
  createCampaign: async (campaignData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/campaigns', campaignData);
      get().fetchCampaigns(); // refresh list
      return data;
    } finally {
      set({ isLoading: false });
    }
  },
  updateCampaign: async (id, campaignData) => {
    set({ isLoading: true });
    try {
      const { data } = await api.patch(`/campaigns/${id}`, campaignData);
      get().fetchCampaigns(); // refresh list
      return data;
    } finally {
      set({ isLoading: false });
    }
  },

// Analytics/Dashboard
  dashboardData: null,
  dashboardLoading: false,
  fetchDashboard: async () => {
    set({ dashboardLoading: true });
    try {
      const { data } = await api.get('/analysis/dashboard');
      set({ dashboardData: data });
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      get().addToast('Failed to load dashboard data. Please refresh.', 'error');
    } finally {
      set({ dashboardLoading: false });
    }
  },

  // Templates (keep mock)
  templates: mockTemplates,
  setTemplates: (templates) => set({ templates }),

  // SMTP (keep mock for now)
  smtpConfigurations: [
    {
      id: '1',
      provider: 'AWS SES',
      host: 'email-smtp.us-east-1.amazonaws.com',
      port: 587,
      username: 'AKIAIOSFODNN7EXAMPLE',
      fromName: 'Marketing Team',
      fromAddress: 'marketing@emailtracker.io',
      isGlobal: false
    }
  ],
}));
