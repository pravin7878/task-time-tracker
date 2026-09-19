import React from 'react';
import { FiHome, FiCheckSquare, FiClock } from 'react-icons/fi';

export interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    path: '/app',
    icon: FiHome,
    end: true,
  },
  {
    name: 'Tasks',
    path: '/app/tasks',
    icon: FiCheckSquare,
  },
  {
    name: 'Time Logs',
    path: '/app/time-logs',
    icon: FiClock,
  },
];
