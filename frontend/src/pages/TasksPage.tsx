import React from 'react';
import { FiCheckSquare, FiPlus, FiFilter } from 'react-icons/fi';

export const TasksPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Tasks
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your tasks, set priorities, and track progress.
          </p>
        </div>

        {/* Action button shell */}
        <div className="flex items-center gap-3">
          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium opacity-60 cursor-not-allowed shadow-xs"
            title="Task creation will be enabled in Milestone 7"
          >
            <FiPlus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Task Content Shell */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <FiCheckSquare className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          Task Management
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
          Task CRUD operations, status management (pending, in_progress, completed), and natural language task input will be connected in Milestone 7.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-600 font-medium">
          <FiFilter className="w-3.5 h-3.5" />
          Filter by Status: All / Pending / In Progress / Completed (Coming Next)
        </div>
      </div>
    </div>
  );
};

export default TasksPage;
