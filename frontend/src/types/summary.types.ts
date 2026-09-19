import { Task } from './task.types';
import { ApiResponse } from './auth.types';

export interface TaskWorkedOnSummary {
  taskId: string;
  title: string;
  timeSpentSeconds: number;
}

export interface DailySummaryData {
  date: string;
  timezone: string;
  totalTrackedTime: number; // in seconds
  tasksWorkedOn: TaskWorkedOnSummary[];
  completedTasks: Task[];
  pendingTasks: Task[];
  inProgressTasks: Task[];
}

export type DailySummaryResponse = ApiResponse<DailySummaryData>;
