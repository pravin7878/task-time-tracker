import React, { useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiClock,
  FiCheckCircle,
  FiPlayCircle,
  FiList,
  FiActivity,
  FiArrowRight,
  FiAlertCircle,
  FiRefreshCw,
  FiGlobe,
  FiCalendar,
} from 'react-icons/fi';
import { useAuth } from '../hooks/useAuth';
import { useDailySummary } from '../hooks/useDailySummary';
import { useActiveTimer } from '../hooks/useTimeTracking';
import { LiveTimer, formatReadableDuration } from '../components/timer/LiveTimer';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Daily Summary data hook (auto-detects browser timezone)
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
  } = useDailySummary();

  // Active timer hook
  const { data: activeTimer } = useActiveTimer();

  // Formatted date string (e.g., "Saturday, September 19, 2026")
  const formattedToday = useMemo(() => {
    if (!summary?.date) {
      return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    // Parse ISO date string
    const [year, month, day] = summary.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [summary?.date]);

  return (
    <div className="space-y-6">
      {/* Top Welcome & Context Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
              <FiCalendar className="w-4 h-4 text-indigo-500" />
              <span>{formattedToday}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <FiGlobe className="w-3 h-3 text-slate-400" />
              <span>{summary?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </span>
          </div>
        </div>

        <Link
          to="/app/tasks"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs w-fit shrink-0"
        >
          <span>Go to Tasks</span>
          <FiArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Active Running Session Alert (if timer is currently running) */}
      {activeTimer && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FiClock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Active Work Session Running
                </span>
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
              </div>
              <div className="mt-0.5">
                <LiveTimer startedAt={activeTimer.startedAt} showIcon={false} />
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/app/tasks')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <span>View Running Task</span>
            <FiArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                <div className="w-1/2 h-6 bg-slate-200 rounded" />
                <div className="w-3/4 h-3 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="w-1/4 h-5 bg-slate-200 rounded" />
            <div className="w-full h-16 bg-slate-100 rounded-xl" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && isError && (
        <div
          role="alert"
          className="bg-white rounded-2xl border border-rose-200 p-8 shadow-xs text-center max-w-md mx-auto"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Unable to load daily summary
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {error?.message || 'A network error occurred while fetching your daily summary.'}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Summary Content */}
      {!isLoading && !isError && summary && (
        <>
          {/* Productivity KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tracked Time */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tracked Today
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FiClock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                  {formatReadableDuration(summary.totalTrackedTime)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Across {summary.tasksWorkedOn.length} {summary.tasksWorkedOn.length === 1 ? 'task' : 'tasks'} today
                </p>
              </div>
            </div>

            {/* Completed Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Completed
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-emerald-700 tracking-tight">
                  {summary.completedTasks.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tasks marked completed
                </p>
              </div>
            </div>

            {/* In Progress Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  In Progress
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FiPlayCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-blue-700 tracking-tight">
                  {summary.inProgressTasks.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tasks currently in progress
                </p>
              </div>
            </div>

            {/* Pending Tasks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Pending
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FiList className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-amber-700 tracking-tight">
                  {summary.pendingTasks.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tasks awaiting work
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown Grid: Left = Tasks Worked On Today, Right = Quick Navigation & Status */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2/3 width): Tasks Worked On Today */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FiActivity className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Tasks Worked On Today
                    </h2>
                    <p className="text-xs text-slate-500">
                      Time spent per task during this calendar day
                    </p>
                  </div>
                </div>

                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {summary.tasksWorkedOn.length} {summary.tasksWorkedOn.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>

              {summary.tasksWorkedOn.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <FiClock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No time recorded today yet</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                    Start a timer on any task to track your work sessions and see live productivity breakdowns here.
                  </p>
                  <button
                    onClick={() => navigate('/app/tasks')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Go to Tasks</span>
                    <FiArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {summary.tasksWorkedOn.map((item) => {
                    const percentage = summary.totalTrackedTime > 0
                      ? Math.min(100, Math.round((item.timeSpentSeconds / summary.totalTrackedTime) * 100))
                      : 0;

                    return (
                      <div
                        key={item.taskId}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">
                            {item.title}
                          </h3>
                          <span className="font-mono text-xs font-semibold text-indigo-700 shrink-0">
                            {formatReadableDuration(item.timeSpentSeconds)}
                          </span>
                        </div>

                        {/* Progress Bar of Daily Share */}
                        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                            aria-label={`${percentage}% of today's tracked time`}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                          <span>{percentage}% of today's total time</span>
                          <button
                            onClick={() => navigate('/app/tasks')}
                            className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 transition-colors"
                          >
                            <span>View Task</span>
                            <FiArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column (1/3 width): Quick Overview & Navigation */}
            <div className="space-y-6">
              {/* Quick Navigation Cards */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Quick Actions
                </h3>

                <div
                  onClick={() => navigate('/app/tasks')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiCheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          Manage Tasks
                        </h4>
                        <p className="text-xs text-slate-500">
                          {summary.pendingTasks.length + summary.inProgressTasks.length} active tasks
                        </p>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>

                <div
                  onClick={() => navigate('/app/time-logs')}
                  className="p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FiClock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-emerald-600 transition-colors">
                          Session Logs
                        </h4>
                        <p className="text-xs text-slate-500">
                          View chronological history
                        </p>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </div>

              {/* Task Status Breakdown Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
                  Task Pipeline
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Completed
                    </span>
                    <span className="font-bold">{summary.completedTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50 text-blue-800 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      In Progress
                    </span>
                    <span className="font-bold">{summary.inProgressTasks.length}</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 text-amber-800 font-medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    <span className="font-bold">{summary.pendingTasks.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
