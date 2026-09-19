import apiClient from '../lib/api';
import {
  TimeLog,
  ActiveTimerResponse,
  TimeLogResponse,
  TimeLogsResponse,
  TaskTimeLogsResponse,
} from '../types/timeLog.types';

/**
 * Start a timer session on a specific task.
 * Returns 409 Conflict if another timer is already running for the user.
 */
export const startTimer = async (taskId: string): Promise<TimeLog> => {
  const response = await apiClient.post<TimeLogResponse>(
    `/tasks/${taskId}/timer/start`,
    {}
  );
  if (!response.data.data?.timeLog) {
    throw new Error('No time log returned from timer start');
  }
  return response.data.data.timeLog;
};

/**
 * Stop the running timer session on a specific task.
 */
export const stopTimer = async (taskId: string): Promise<TimeLog> => {
  const response = await apiClient.post<TimeLogResponse>(
    `/tasks/${taskId}/timer/stop`,
    {}
  );
  if (!response.data.data?.timeLog) {
    throw new Error('No time log returned from timer stop');
  }
  return response.data.data.timeLog;
};

/**
 * Retrieve the currently active running timer for the authenticated user, or null if none.
 */
export const getActiveTimer = async (): Promise<TimeLog | null> => {
  const response = await apiClient.get<ActiveTimerResponse>('/timer/active');
  return response.data.data?.activeTimer ?? null;
};

/**
 * Retrieve all historical time logs for the authenticated user.
 */
export const getTimeLogs = async (): Promise<TimeLog[]> => {
  const response = await apiClient.get<TimeLogsResponse>('/time-logs');
  return response.data.data?.timeLogs ?? [];
};

/**
 * Retrieve all time logs and cumulative completed duration for a specific task.
 */
export const getTaskTimeLogs = async (
  taskId: string
): Promise<{ timeLogs: TimeLog[]; totalTimeSpentSeconds: number }> => {
  const response = await apiClient.get<TaskTimeLogsResponse>(
    `/tasks/${taskId}/time-logs`
  );
  return (
    response.data.data ?? {
      timeLogs: [],
      totalTimeSpentSeconds: 0,
    }
  );
};
