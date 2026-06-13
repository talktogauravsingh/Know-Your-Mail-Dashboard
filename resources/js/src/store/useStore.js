import { create } from 'zustand';
import api from '../lib/api.js';
import { mockTemplates } from '../lib/mockData';

export const useStore = create((set, get) => ({
  user: null,
  token: null,
  authInitialized: false,
  theme: localStorage.getItem('theme') || 'light',
  isLoading: false,
  billingSummary: null,
  billingPlans: [],
  billingHistory: [],
  billingLoading: false,
  billingCheckoutLoading: false,

  // Custom microservices state
  domains: [],
  domainsLoading: false,
  smtpCredentials: [],
  smtpCredentialsLoading: false,
  suppressions: [],
  suppressionsTotal: 0,
  suppressionsLoading: false,

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
    set({ authInitialized: true });
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

  logout: () => {
    get().clearAuth();
    api.post('/auth/logout').catch(() => {});
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

  toggleTheme: () => set((state) => {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    return { theme: newTheme };
  }),

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

  // Templates – fetch from API
  templates: mockTemplates,
  templatesLoading: false,
  fetchTemplates: async () => {
    set({ templatesLoading: true });
    try {
      const { data } = await api.get('/email-templates');
      set({ templates: data, templatesLoading: false });
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      set({ templatesLoading: false });
    }
  },
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
  updateTemplate: (id, updates) => set((state) => ({
    templates: state.templates.map((t) => (t.id === id ? { ...t, ...updates } : t))
  })),
  deleteTemplate: (id) => set((state) => ({
    templates: state.templates.filter((t) => t.id !== id)
  })),

  // SMTP
  smtpConfigurations: [],
  smtpConfigurationsLoading: true,
  fetchSmtpConfigurations: async () => {
    set({ smtpConfigurationsLoading: true });
    try {
      const { data } = await api.get('/smtp-configurations');
      // Convert backend snake_case to camelCase for frontend where needed,
      // or just keep them as snake_case. Let's map for consistency with UI.
      const mapped = data.map(config => ({
        id: config.id,
        provider: config.provider,
        host: config.host,
        port: config.port,
        username: config.username,
        fromName: config.from_name,
        fromAddress: config.from_address,
        isGlobal: config.is_global,
        status: config.status
      }));
      set({ smtpConfigurations: mapped, smtpConfigurationsLoading: false });
    } catch (error) {
      console.error('Failed to fetch SMTP configurations:', error);
      set({ smtpConfigurationsLoading: false });
    }
  },
  addSmtpConfiguration: async (config) => {
    try {
      const { data } = await api.post('/smtp-configurations', {
        provider: config.provider,
        host: config.host,
        port: config.port,
        encryption: config.encryption,
        username: config.username,
        password: config.password,
        from_name: config.fromName,
        from_address: config.fromAddress,
        is_global: false
      });
      get().fetchSmtpConfigurations();
      get().addToast('SMTP configuration added successfully', 'success');
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to add SMTP configuration', 'error');
    }
  },
  deleteSmtpConfiguration: async (id) => {
    try {
      await api.delete(`/smtp-configurations/${id}`);
      get().fetchSmtpConfigurations();
      get().addToast('SMTP configuration deleted successfully', 'success');
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to delete SMTP configuration', 'error');
    }
  },

  fetchBillingSummary: async () => {
    set({ billingLoading: true });
    try {
      const { data } = await api.get('/billing/summary');
      set({ billingSummary: data });
      return data;
    } catch (error) {
      console.error('Failed to fetch billing summary:', error);
      get().addToast(error.response?.data?.message || 'Failed to load billing summary', 'error');
      throw error;
    } finally {
      set({ billingLoading: false });
    }
  },
  fetchBillingPlans: async () => {
    try {
      const { data } = await api.get('/billing/plans');
      set({ billingPlans: data.plans || [] });
      return data.plans || [];
    } catch (error) {
      console.error('Failed to fetch billing plans:', error);
      get().addToast(error.response?.data?.message || 'Failed to load billing plans', 'error');
      throw error;
    }
  },
  fetchBillingHistory: async () => {
    try {
      const { data } = await api.get('/billing/history');
      set({ billingHistory: data || [] });
      return data || [];
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
      get().addToast(error.response?.data?.message || 'Failed to load billing history', 'error');
    }
  },
  createPaymentOrder: async ({ planKey, billingAction = 'new_plan', contactCount }) => {
    set({ billingCheckoutLoading: true });
    try {
      const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `billing-${Date.now()}`;
      const { data } = await api.post('/payments/orders', {
        plan_key: planKey,
        billing_action: billingAction,
        contact_count: contactCount,
      }, {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      });
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to create payment order', 'error');
      throw error;
    } finally {
      set({ billingCheckoutLoading: false });
    }
  },
  verifyPayment: async (payload) => {
    set({ billingCheckoutLoading: true });
    try {
      const { data } = await api.post('/payments/verify', payload);
      await get().fetchBillingSummary();
      get().addToast('Plan activated successfully', 'success');
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Payment verification failed', 'error');
      throw error;
    } finally {
      set({ billingCheckoutLoading: false });
    }
  },
  activateSmtpConfiguration: async (id) => {
    try {
      await api.post(`/smtp-configurations/${id}/activate`);
      get().fetchSmtpConfigurations();
      get().addToast('SMTP configuration activated successfully', 'success');
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to activate SMTP configuration', 'error');
    }
  },

  // Domains
  fetchDomains: async () => {
    set({ domainsLoading: true });
    try {
      const { data } = await api.get('/domains');
      set({ domains: data, domainsLoading: false });
    } catch (error) {
      get().addToast('Failed to fetch domains', 'error');
      set({ domainsLoading: false });
    }
  },
  addDomain: async (domainName) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/domains', { domain: domainName });
      get().fetchDomains();
      get().addToast('Domain registered successfully', 'success');
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to register domain', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteDomain: async (id) => {
    try {
      await api.delete(`/domains/${id}`);
      get().fetchDomains();
      get().addToast('Domain removed successfully', 'success');
    } catch (error) {
      get().addToast('Failed to remove domain', 'error');
    }
  },
  verifyDomain: async (id) => {
    try {
      const { data } = await api.post(`/domains/${id}/verify`);
      get().fetchDomains();
      if (data.status === 'verified') {
        get().addToast('Domain verified successfully!', 'success');
      } else {
        get().addToast('Domain DNS verification check completed.', 'success');
      }
      return data;
    } catch (error) {
      get().addToast('DNS verification check failed', 'error');
    }
  },
  provisionCloudflare: async (id, payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post(`/domains/${id}/cloudflare`, payload);
      get().fetchDomains();
      if (data.status === 'verified') {
        get().addToast('Cloudflare records added and domain verified successfully!', 'success');
      } else {
        get().addToast('Cloudflare records added successfully. Verifying...', 'success');
      }
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to provision Cloudflare DNS records', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // SMTP Credentials (Haraka Relay)
  fetchSmtpCredentials: async () => {
    set({ smtpCredentialsLoading: true });
    try {
      const { data } = await api.get('/smtp-credentials');
      set({ smtpCredentials: data, smtpCredentialsLoading: false });
    } catch (error) {
      get().addToast('Failed to fetch SMTP relay credentials', 'error');
      set({ smtpCredentialsLoading: false });
    }
  },
  addSmtpCredential: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/smtp-credentials', {
        username: payload.username,
        rateLimitPerHour: payload.rateLimit,
        domainId: payload.domainId || null
      });
      get().fetchSmtpCredentials();
      get().addToast('SMTP credential generated successfully', 'success');
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to generate SMTP credential', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  updateSmtpCredential: async (id, payload) => {
    try {
      await api.put(`/smtp-credentials/${id}`, payload);
      get().fetchSmtpCredentials();
      get().addToast('SMTP credential updated successfully', 'success');
    } catch (error) {
      get().addToast('Failed to update SMTP credential', 'error');
    }
  },
  deleteSmtpCredential: async (id) => {
    try {
      await api.delete(`/smtp-credentials/${id}`);
      get().fetchSmtpCredentials();
      get().addToast('SMTP credential revoked successfully', 'success');
    } catch (error) {
      get().addToast('Failed to revoke SMTP credential', 'error');
    }
  },
  testSmtpCredential: async (id, payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post(`/smtp-credentials/${id}/test-send`, payload);
      get().addToast(data.message || 'Test email sent successfully!', 'success');
      return data;
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to send test email', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  // Suppressions
  fetchSuppressions: async (params = {}) => {
    set({ suppressionsLoading: true });
    try {
      const { data } = await api.get('/suppressions', { params });
      set({
        suppressions: data.items,
        suppressionsTotal: data.total,
        suppressionsLoading: false
      });
    } catch (error) {
      get().addToast('Failed to fetch suppressions', 'error');
      set({ suppressionsLoading: false });
    }
  },
  addSuppression: async (payload) => {
    set({ isLoading: true });
    try {
      await api.post('/suppressions', payload);
      get().addToast('Email added to suppression list', 'success');
    } catch (error) {
      get().addToast(error.response?.data?.message || 'Failed to add suppression', 'error');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  deleteSuppression: async (id) => {
    try {
      await api.delete(`/suppressions/${id}`);
      get().addToast('Suppression removed successfully', 'success');
    } catch (error) {
      get().addToast('Failed to remove suppression', 'error');
    }
  },
}));
