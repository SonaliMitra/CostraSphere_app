import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { auth } = useAuth();

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner size="w-10 h-10" />
      </div>
    );
  }

  if (!auth.isAuthenticated) return <Navigate to="/login" />;

  if (requiredRole && auth.profile && !requiredRole.includes(auth.profile.role)) {
    return <Navigate to="/dashboard" />;
  }

  return <>{children}</>;
};
