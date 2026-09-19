import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

export const HomePage: React.FC = () => {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-lg">
            Task & Time Tracker
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600 hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <FiLogOut className="w-4 h-4" />
              <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="mt-2 text-slate-600">
            Track your tasks and the time you spend working on them.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                navigate('/app/tasks');
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors"
            >
              Go to Tasks
            </button>
            <span className="text-xs text-slate-400">
              Authenticated Session
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
