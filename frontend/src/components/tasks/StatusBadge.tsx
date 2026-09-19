import React from 'react';
import { FiClock, FiCheckCircle } from 'react-icons/fi';
import { TaskStatus } from '../../types/task.types';

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap shrink-0 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
          <span>In Progress</span>
        </span>
      );

    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap shrink-0 ${className}`}
        >
          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
          <span>Completed</span>
        </span>
      );

    case 'pending':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap shrink-0 ${className}`}
        >
          <FiClock className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
          <span>Pending</span>
        </span>
      );
  }
};

export default StatusBadge;
