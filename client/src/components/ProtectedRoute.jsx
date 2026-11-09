import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = (user?.role || '').toLowerCase();
  const normalizedAllowed = allowedRoles ? allowedRoles.map((r) => r.toLowerCase()) : null;

  if (normalizedAllowed && (!role || !normalizedAllowed.includes(role))) {
    return <Navigate to="/app" replace />;
  }

  return children;
}
