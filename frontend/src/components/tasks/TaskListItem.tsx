import React from 'react';
import { FiEdit2, FiTrash2, FiCalendar, FiChevronDown } from 'react-icons/fi';
import { Task, TaskStatus } from '../../types/task.types';

interface TaskListItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  isUpdatingStatus?: boolean;
}

export const TaskListItem: React.FC<TaskListItemProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isUpdatingStatus = false,
}) => {
  const formattedDate = new Date(task.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleStatusSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as TaskStatus;
    if (nextStatus !== task.status) {
      onStatusChange(task, nextStatus);
    }
  };

  const statusStyles = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70',
  }[task.status];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left section: Title, description, date */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900 truncate">
            {task.title}
          </h3>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 shrink-0">
            <FiCalendar className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{formattedDate}</span>
          </span>
        </div>

        {task.description ? (
          <p className="mt-1 text-sm text-slate-600 line-clamp-1 break-words">
            {task.description}
          </p>
        ) : (
          <p className="mt-1 text-xs italic text-slate-400">
            No description provided.
          </p>
        )}

        <span className="inline-flex sm:hidden items-center gap-1 mt-2 text-xs text-slate-400">
          <FiCalendar className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Created {formattedDate}</span>
        </span>
      </div>

      {/* Right section: Status & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        {/* Single interactive status pill */}
        <div className="relative inline-flex items-center">
          {task.status === 'in_progress' && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse absolute left-2.5 pointer-events-none" />
          )}
          <select
            value={task.status}
            onChange={handleStatusSelect}
            disabled={isUpdatingStatus}
            aria-label={`Status: ${task.status}. Click to change.`}
            className={`appearance-none cursor-pointer text-xs font-medium border rounded-full py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 whitespace-nowrap transition-colors ${
              task.status === 'in_progress' ? 'pl-5 pr-6' : 'pl-3 pr-6'
            } ${statusStyles}`}
          >
            <option value="pending" className="bg-white text-slate-800">Pending</option>
            <option value="in_progress" className="bg-white text-slate-800">In Progress</option>
            <option value="completed" className="bg-white text-slate-800">Completed</option>
          </select>
          <FiChevronDown className="w-3 h-3 text-current absolute right-2 pointer-events-none opacity-60" />
        </div>

        {/* Edit and Delete Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(task)}
            aria-label={`Edit task "${task.title}"`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            title="Edit Task"
          >
            <FiEdit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(task)}
            aria-label={`Delete task "${task.title}"`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500"
            title="Delete Task"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskListItem;
