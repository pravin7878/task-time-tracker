import React from 'react';
import {
  FiEdit2,
  FiTrash2,
  FiCalendar,
  FiChevronDown,
  FiPlay,
  FiSquare,
} from 'react-icons/fi';
import { Task, TaskStatus } from '../../types/task.types';
import { TimeLog } from '../../types/timeLog.types';
import { LiveTimer, TaskTotalTracked } from '../timer/LiveTimer';

interface TaskCardProps {
  task: Task;
  activeTimer?: TimeLog | null;
  totalTrackedSeconds?: number;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (task: Task, newStatus: TaskStatus) => void;
  onStartTimer: (task: Task) => void;
  onStopTimer: (task: Task) => void;
  isUpdatingStatus?: boolean;
  isStartingTimer?: boolean;
  isStoppingTimer?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  activeTimer,
  totalTrackedSeconds = 0,
  onEdit,
  onDelete,
  onStatusChange,
  onStartTimer,
  onStopTimer,
  isUpdatingStatus = false,
  isStartingTimer = false,
  isStoppingTimer = false,
}) => {
  const isCurrentTimerRunning = activeTimer?.taskId === task.id;

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
    <div
      className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col justify-between h-full ${
        isCurrentTimerRunning
          ? 'border-blue-300 ring-2 ring-blue-100 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div>
        {/* Top Header: Single interactive status pill & Action buttons */}
        <div className="flex items-center justify-between gap-3 mb-3">
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
              <option
                value="pending"
                disabled={isCurrentTimerRunning}
                className="bg-white text-slate-800 disabled:text-slate-400"
                title={isCurrentTimerRunning ? 'Stop timer before setting status to Pending' : undefined}
              >
                Pending
              </option>
              <option value="in_progress" className="bg-white text-slate-800">
                In Progress
              </option>
              <option value="completed" className="bg-white text-slate-800">
                Completed
              </option>
            </select>
            <FiChevronDown className="w-3 h-3 text-current absolute right-2 pointer-events-none opacity-60" />
          </div>

          {/* Action Buttons */}
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

        {/* Task Title */}
        <h3 className="text-base font-semibold text-slate-900 leading-snug break-words">
          {task.title}
        </h3>

        {/* Description */}
        {task.description ? (
          <p className="mt-2 text-sm text-slate-600 leading-relaxed break-words line-clamp-3">
            {task.description}
          </p>
        ) : (
          <p className="mt-2 text-xs italic text-slate-400">
            No description provided.
          </p>
        )}

        {/* Total Tracked Time */}
        <div className="mt-3 pt-2.5 border-t border-slate-100/80">
          <TaskTotalTracked
            baseSeconds={totalTrackedSeconds}
            activeStartedAt={isCurrentTimerRunning ? activeTimer?.startedAt : null}
          />
        </div>
      </div>

      {/* Card Footer: Metadata and Timer Controls */}
      <div className="mt-5 pt-3 border-t border-slate-100">
        {isCurrentTimerRunning ? (
          /* Live running timer state */
          <div className="flex items-center justify-between gap-2">
            <LiveTimer startedAt={activeTimer.startedAt} />
            <button
              onClick={() => onStopTimer(task)}
              disabled={isStoppingTimer}
              aria-label={`Stop timer for ${task.title}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <FiSquare className="w-3 h-3 fill-current" />
              <span>{isStoppingTimer ? 'Stopping...' : 'Stop'}</span>
            </button>
          </div>
        ) : task.status === 'completed' ? (
          /* Completed task state: cannot start timer */
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <FiCalendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formattedDate}</span>
            </span>
            <span
              className="text-[11px] font-medium text-slate-400 italic bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60"
              title="Reopen task to Pending or In Progress to track time"
            >
              Reopen to track time
            </span>
          </div>
        ) : (
          /* Idle pending/in_progress state: can start timer */
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <FiCalendar className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{formattedDate}</span>
            </span>
            <button
              onClick={() => onStartTimer(task)}
              disabled={isStartingTimer}
              aria-label={`Start timer for ${task.title}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/80 transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <FiPlay className="w-3 h-3 fill-current" />
              <span>{isStartingTimer ? 'Starting...' : 'Start Timer'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
