import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProtectedRoute from './routes/ProtectedRoute';
import PublicRoute from './routes/PublicRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import TimeLogsPage from './pages/TimeLogsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: true,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Guest / Public Routes (Redirect to /app if already logged in) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected Application Shell & Nested Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<DashboardPage />} />
              <Route path="/app/tasks" element={<TasksPage />} />
              <Route path="/app/time-logs" element={<TimeLogsPage />} />
            </Route>
          </Route>

          {/* Root Redirect to /app (which triggers ProtectedRoute check) */}
          <Route path="/" element={<Navigate to="/app" replace />} />

          {/* Catch-all unknown routes */}
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
