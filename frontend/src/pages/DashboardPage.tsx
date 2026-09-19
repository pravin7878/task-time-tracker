import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckSquare, FiClock, FiActivity } from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Welcome Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="mt-2 text-slate-600 text-sm sm:text-base max-w-2xl">
          Track your tasks and the time you spend working on them.
        </p>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Tasks Navigation Card */}
        <div
          onClick={() => navigate('/app/tasks')}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FiCheckSquare className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            Tasks
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            View, create, and organize your tasks by status.
          </p>
        </div>

        {/* Time Logs Navigation Card */}
        <div
          onClick={() => navigate('/app/time-logs')}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-colors cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <FiClock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
            Time Logs
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Review tracked work sessions and history.
          </p>
        </div>
      </div>

      {/* Today's Activity Placeholder Shell */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <FiActivity className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Today's Activity
          </h3>
        </div>
        <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Your daily productivity summary and active timer will be shown here once connected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
