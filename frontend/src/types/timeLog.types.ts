import { ApiResponse } from './auth.types';

export interface TimeLog {
  id: string;
  userId: string;
  taskId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTimerResponse = ApiResponse<{ activeTimer: TimeLog | null }>;
export type TimeLogResponse = ApiResponse<{ timeLog: TimeLog }>;
export type TimeLogsResponse = ApiResponse<{ timeLogs: TimeLog[] }>;
export type TaskTimeLogsResponse = ApiResponse<{
  timeLogs: TimeLog[];
  totalTimeSpentSeconds: number;
}>;
