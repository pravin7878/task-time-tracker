import { TaskResponse } from './task.types';

export interface TaskWorkedOnSummary {
  taskId: string;
  title: string;
  timeSpentSeconds: number;
}

export interface DailySummaryResponse {
  date: string;
  timezone: string;
  totalTrackedTime: number;
  tasksWorkedOn: TaskWorkedOnSummary[];
  completedTasks: TaskResponse[];
  pendingTasks: TaskResponse[];
  inProgressTasks: TaskResponse[];
}
