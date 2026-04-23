/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Groups from './pages/admin/Groups';
import Events from './pages/admin/Events';
import NetworkMap from './pages/admin/NetworkMap';
import PalantirChat from './pages/admin/PalantirChat';
import Analytics from './pages/admin/Analytics';
import TelemetryAnalytics from './pages/admin/TelemetryAnalytics';
import CheckIn from './pages/admin/CheckIn';
import OnboardingSettings from './pages/admin/OnboardingSettings';
import SocialSynergy from './pages/admin/SocialSynergy';
import FeedMonitoring from './pages/admin/FeedMonitoring';

// Auth Guard Component
function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('vrag_admin_jwt');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* Admin Routes with Auth Guard */}
        <Route path="/admin" element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="groups" element={<Groups />} />
          <Route path="events" element={<Events />} />
          <Route path="network" element={<NetworkMap />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="telemetry" element={<TelemetryAnalytics />} />
          <Route path="chat" element={<PalantirChat />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="onboarding" element={<OnboardingSettings />} />
          <Route path="synergy" element={<SocialSynergy />} />
          <Route path="feed" element={<FeedMonitoring />} />
        </Route>
      </Routes>
    </Router>
  );
}


// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.