import React from 'react';
import { FiClock, FiCalendar } from 'react-icons/fi';

export const TimeLogsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Time Logs
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your tracked work sessions and session history.
        </p>
      </div>

      {/* Time Logs Content Shell */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
          <FiClock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Session History & Time Tracking
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Work sessions, duration totals, and historical logs recorded via the backend Time Tracking API will be presented here in later milestones.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 font-medium">
          <FiCalendar className="w-3.5 h-3.5" />
          Reverse Chronological Session Logs (Coming in Later Milestones)
        </div>
      </div>
    </div>
  );
};

export default TimeLogsPage;
