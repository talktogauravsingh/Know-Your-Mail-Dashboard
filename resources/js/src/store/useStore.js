import { create } from 'zustand';
import api from '../lib/api.js';
import { mockTemplates } from '../lib/mockData';

export const useStore = create((set, get) => ({
  user: null,
  theme: 'light',
  isLoading: false,

  // Auth
  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', credentials);
      set({ user: data.user });
      return data;
    } finally {
      set({ isLoading: false });
    }
  },
  logout: () => {
    api.post('/auth/logout').catch(() => {}); // fire and forget
    set({ user: null });
  },
  fetchUser: async () => {
    try {
      const { data } = await api.get('/user');
      set({ user: data });
    } catch {
      set({ user: null });
    }
  },

  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  // Campaigns - Replace mocks with API
  campaigns: [],
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
