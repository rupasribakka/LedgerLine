import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import CustomCursor from './components/motion/CustomCursor';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import OverviewPage from './pages/OverviewPage';
import AccountsPage from './pages/AccountsPage';
import AccountStatementPage from './pages/AccountStatementPage';
import MovePage from './pages/MovePage';
import AuditPage from './pages/AuditPage';
import AttackLabPage from './pages/AttackLabPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * ScrollToTop:
 * Automatically resets scroll position to top whenever pathname changes.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

/**
 * RootRoute:
 * - Everyone who is NOT logged in sees the Landing page.
 * - Any logged-in user opening "/" is redirected to "/app".
 */
function RootRoute() {
  const { user } = useAuth();
  return user ? <Navigate to="/app" replace /> : <LandingPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <AuthProvider>
          <CustomCursor />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes Under /app */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="overview" element={<Navigate to="/app" replace />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="accounts/:id" element={<AccountStatementPage />} />
              <Route
                path="move"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'holder']}>
                    <MovePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="audit"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'auditor']}>
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="attack-lab"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'holder']}>
                    <AttackLabPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Global Fallback 404 for Unknown Routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
