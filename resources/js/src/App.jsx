import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Loader2 } from 'lucide-react';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import AppLayout from './layouts/AppLayout';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignAnalytics from './pages/CampaignAnalytics';
import TemplateBuilder from './pages/TemplateBuilder';
import Templates from './pages/Templates';
import Audience from './pages/Audience';
import BulkImport from './pages/BulkImport';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import TemplateDesigner from './pages/TemplateDesigner';
import Automations from './pages/Automations';
import AutomationBuilder from './pages/AutomationBuilder';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, authInitialized, initAuth } = useStore();
  
  useEffect(() => {
    if (!authInitialized) {
      initAuth();
    }
  }, [authInitialized, initAuth]);
  
  if (!authInitialized) {
    return <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

import { ToastList } from './components/ui/ToastList';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Protected Routes */}
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/new" element={<CreateCampaign />} />
          <Route path="/campaigns/:id/edit" element={<CreateCampaign />} />
          <Route path="/campaigns/:id" element={<CampaignAnalytics />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/templates/builder" element={<TemplateBuilder />} />
          <Route path="/audience" element={<Audience />} />
          <Route path="/bulk-import" element={<BulkImport />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/automations" element={<Automations />} />
          <Route path="/automations/new" element={<AutomationBuilder />} />
          <Route path="/automations/:id" element={<AutomationBuilder />} />
          <Route
            path="/templates/designer"
            element={<TemplateDesigner />}
          />
        </Route>
      </Routes>
      <ToastList />
    </BrowserRouter>
  );
}
