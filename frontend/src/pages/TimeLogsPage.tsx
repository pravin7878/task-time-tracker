import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiClock,
  FiCalendar,
  FiAlertCircle,
  FiRefreshCw,
  FiArrowRight,
} from 'react-icons/fi';
import { useTimeLogs } from '../hooks/useTimeTracking';
import { useTasks } from '../hooks/useTasks';
import { LiveTimer, formatReadableDuration } from '../components/timer/LiveTimer';

export const TimeLogsPage: React.FC = () => {
  const { data: rawLogs = [], isLoading, isError, error, refetch } = useTimeLogs();
  const { data: allTasks = [] } = useTasks('all');

  // Map tasks by ID for zero N+1 lookups
  const tasksMap = useMemo(() => {
    return new Map(allTasks.map((t) => [t.id, t]));
  }, [allTasks]);

  // Ensure newest-first sorting by startedAt descending
  const sortedLogs = useMemo(() => {
    return [...rawLogs].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [rawLogs]);

  // Helper formatting methods
  const formatDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Time Logs
            </h1>
            {!isLoading && !isError && (
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                {sortedLogs.length} {sortedLogs.length === 1 ? 'Session' : 'Sessions'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Review your tracked work sessions and history chronologically.
          </p>
        </div>

        <Link
          to="/app/tasks"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs w-fit"
        >
          <span>Go to Tasks</span>
          <FiArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
            >
              <div className="space-y-2 flex-1">
                <div className="w-1/3 h-4 bg-slate-200 rounded" />
                <div className="w-1/4 h-3 bg-slate-100 rounded" />
              </div>
              <div className="w-20 h-6 bg-slate-200 rounded-md" />
            </div>
          ))}
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
            Unable to load time logs
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {error?.message || 'A network error occurred while fetching your time logs.'}
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

      {/* Empty State */}
      {!isLoading && !isError && sortedLogs.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 shadow-xs text-center max-w-md mx-auto my-8">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FiClock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            No time logs yet
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Start tracking time on your tasks to view recorded sessions, durations, and chronological work logs here.
          </p>
          <Link
            to="/app/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shadow-xs"
          >
            <span>View Tasks</span>
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Session Logs: Desktop Table & Mobile Cards */}
      {!isLoading && !isError && sortedLogs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th scope="col" className="py-3.5 px-6">Task</th>
                  <th scope="col" className="py-3.5 px-6">Date</th>
                  <th scope="col" className="py-3.5 px-6">Time Interval</th>
                  <th scope="col" className="py-3.5 px-6">Duration</th>
                  <th scope="col" className="py-3.5 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {sortedLogs.map((log) => {
                  const task = tasksMap.get(log.taskId);
                  const isRunning = !log.endedAt;

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isRunning ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      {/* Task Name */}
                      <td className="py-4 px-6 font-medium text-slate-900 max-w-xs truncate">
                        {task?.title || (
                          <span className="text-slate-400 italic">Deleted Task</span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-6 whitespace-nowrap text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(log.startedAt)}</span>
                        </span>
                      </td>

                      {/* Time Interval */}
                      <td className="py-4 px-6 whitespace-nowrap text-slate-600 font-mono text-xs">
                        {formatTime(log.startedAt)} –{' '}
                        {log.endedAt ? formatTime(log.endedAt) : 'Now'}
                      </td>

                      {/* Duration */}
                      <td className="py-4 px-6 whitespace-nowrap font-medium text-slate-900 font-mono text-xs">
                        {isRunning ? (
                          <LiveTimer startedAt={log.startedAt} showIcon={false} />
                        ) : (
                          formatReadableDuration(log.duration)
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6 whitespace-nowrap text-right">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            Running
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card List View */}
          <div className="block md:hidden divide-y divide-slate-100">
            {sortedLogs.map((log) => {
              const task = tasksMap.get(log.taskId);
              const isRunning = !log.endedAt;

              return (
                <div
                  key={log.id}
                  className={`p-4 space-y-2.5 ${isRunning ? 'bg-blue-50/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">
                      {task?.title || (
                        <span className="text-slate-400 italic">Deleted Task</span>
                      )}
                    </h3>
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Running
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                        Completed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(log.startedAt)}</span>
                    </span>
                    <span className="font-mono text-slate-600">
                      {formatTime(log.startedAt)} – {log.endedAt ? formatTime(log.endedAt) : 'Now'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100/80">
                    <span className="text-slate-400">Duration</span>
                    <span className="font-mono font-medium text-slate-900">
                      {isRunning ? (
                        <LiveTimer startedAt={log.startedAt} showIcon={false} />
                      ) : (
                        formatReadableDuration(log.duration)
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeLogsPage;
