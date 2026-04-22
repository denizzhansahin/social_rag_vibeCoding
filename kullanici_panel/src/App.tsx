import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth, Role } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { TelemetryProvider } from './context/TelemetryContext';
import Login from './pages/Login';
import HomeFeed from './pages/HomeFeed';
import GroupFeed from './pages/GroupFeed';
import Events from './pages/Events';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import MentorDashboard from './pages/MentorDashboard';
import Onboarding from './pages/Onboarding';
import { AIChatPanel } from './components/Shared/AIChatPanel';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: Role[] }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if user hasn't completed it (except for onboarding route itself)
  if (!user.hasCompletedOnboarding && window.location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={['admin', 'mentor', 'teacher'].includes(user.role!) ? '/admin' : '/feed'} replace />;
  }

  return <>{children}</>;
}



function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute allowedRoles={['participant', 'admin', 'mentor', 'teacher']}><HomeFeed /></ProtectedRoute>} />
        <Route path="/group" element={<ProtectedRoute allowedRoles={['participant', 'admin', 'mentor', 'teacher']}><GroupFeed /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute allowedRoles={['participant', 'admin', 'mentor', 'teacher']}><Events /></ProtectedRoute>} />
        <Route path="/profile/:id" element={<ProtectedRoute allowedRoles={['participant', 'admin', 'mentor', 'teacher']}><Profile /></ProtectedRoute>} />
        <Route path="/mentor-dashboard" element={<ProtectedRoute allowedRoles={['mentor', 'teacher', 'admin']}><MentorDashboard /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <TelemetryProvider>
          <Router>
            <AppRoutes />
          </Router>
        </TelemetryProvider>
      </DataProvider>
    </AuthProvider>
  );
}
