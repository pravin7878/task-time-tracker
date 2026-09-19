import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/common/LoadingSpinner';

export const PublicRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Checking authentication status..." />;
  }

  if (isAuthenticated) {
    // If already authenticated, redirect to the application home
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
