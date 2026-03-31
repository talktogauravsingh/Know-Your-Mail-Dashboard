import { create } from 'zustand';
import { mockTemplates } from '../lib/mockData';

export const useStore = create((set) => ({
  user: null, // { name: 'Admin', email: 'admin@tracker.io' }
  theme: 'light',
  login: (userData) => set({ user: userData }),
  logout: () => set({ user: null }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  
  // Mock data state
  campaigns: [],
  setCampaigns: (campaigns) => set({ campaigns }),

  templates: mockTemplates,
  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => set((state) => ({
    templates: [...state.templates, { ...template, id: `t${Date.now()}` }]
  })),
  updateTemplate: (id, updatedTemplate) => set((state) => ({
    templates: state.templates.map(t => t.id === id ? { ...t, ...updatedTemplate } : t)
  })),
  deleteTemplate: (id) => set((state) => ({
    templates: state.templates.filter(t => t.id !== id)
  })),

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
  addSmtpConfiguration: (config) => set((state) => ({ 
    smtpConfigurations: [...state.smtpConfigurations, { ...config, id: Date.now().toString() }] 
  })),
  updateSmtpConfiguration: (id, updatedConfig) => set((state) => ({
    smtpConfigurations: state.smtpConfigurations.map(c => c.id === id ? { ...c, ...updatedConfig } : c)
  })),
  deleteSmtpConfiguration: (id) => set((state) => ({
    smtpConfigurations: state.smtpConfigurations.filter(c => c.id !== id)
  })),
}));
