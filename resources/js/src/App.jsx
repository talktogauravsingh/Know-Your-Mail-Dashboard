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
import FounderDashboard from './pages/FounderDashboard';


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

function PermissionGate({ page, action = 'view', children }) {
  const { user } = useStore();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const perms = user.auth_permissions;
  if (!perms) {
    return children;
  }
  
  if (perms.isRoot === 1) {
    return children;
  }
  
  const list = perms.permissionList;
  if (!list) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const pageKey = Object.keys(list).find(key => {
    const pagePerms = list[key];
    const firstPerm = Object.values(pagePerms)[0];
    return firstPerm && firstPerm.pageName === page;
  });
  
  if (!pageKey) {
    return <Navigate to="/dashboard" replace />;
  }
  
  const pageActions = list[pageKey];
  const hasAccess = Object.values(pageActions).some(act => act.actionName === action || act.actionName === 'all');
  
  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

import { ToastList } from './components/ui/ToastList';

export default function App() {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Route>

        {/* Founder Standalone Route (bypasses app auth, protected on web server basic auth) */}
        <Route path="/founder" element={<FounderDashboard />} />


        {/* Protected Routes */}
        <Route 
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<PermissionGate page="Overview"><Dashboard /></PermissionGate>} />
          <Route path="/campaigns" element={<PermissionGate page="Campaigns"><Campaigns /></PermissionGate>} />
          <Route path="/campaigns/new" element={<PermissionGate page="Campaigns" action="create"><CreateCampaign /></PermissionGate>} />
          <Route path="/campaigns/:id/edit" element={<PermissionGate page="Campaigns" action="edit"><CreateCampaign /></PermissionGate>} />
          <Route path="/campaigns/:id" element={<PermissionGate page="Campaigns"><CampaignAnalytics /></PermissionGate>} />
          <Route path="/templates" element={<PermissionGate page="Templates"><Templates /></PermissionGate>} />
          <Route path="/templates/builder" element={<PermissionGate page="Templates" action="create"><TemplateBuilder /></PermissionGate>} />
          <Route path="/audience" element={<PermissionGate page="Audience"><Audience /></PermissionGate>} />
          <Route path="/bulk-import" element={<PermissionGate page="Global Import"><BulkImport /></PermissionGate>} />
          <Route path="/billing" element={<PermissionGate page="Billing & Plan"><Billing /></PermissionGate>} />
          <Route path="/settings" element={<PermissionGate page="Settings"><Settings /></PermissionGate>} />
          <Route path="/automations" element={<PermissionGate page="Automation"><Automations /></PermissionGate>} />
          <Route path="/automations/new" element={<PermissionGate page="Automation" action="create"><AutomationBuilder /></PermissionGate>} />
          <Route path="/automations/:id" element={<PermissionGate page="Automation" action="edit"><AutomationBuilder /></PermissionGate>} />
          <Route
            path="/templates/designer"
            element={<PermissionGate page="Templates"><TemplateDesigner /></PermissionGate>}
          />
        </Route>
      </Routes>
      <ToastList />
    </BrowserRouter>
  );
}
