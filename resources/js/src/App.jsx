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
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import CreateCampaign from './pages/CreateCampaign';
import CampaignAnalytics from './pages/CampaignAnalytics';
import Templates from './pages/Templates';
import Audience from './pages/Audience';
import Settings from './pages/Settings';

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, initAuth } = useStore();
  
  useEffect(() => {
    initAuth();
  }, [initAuth]);
  
  if (user === null) { // Wait for init
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
        <Route path="/" element={<Landing />} />
        
        <Route element={<AuthLayout />}>
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
          <Route path="/campaigns/:id" element={<CampaignAnalytics />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/audience" element={<Audience />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
      <ToastList />
    </BrowserRouter>
  );
}
