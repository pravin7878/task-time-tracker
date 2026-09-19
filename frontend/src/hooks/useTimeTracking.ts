import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  startTimer,
  stopTimer,
  getActiveTimer,
  getTimeLogs,
  getTaskTimeLogs,
} from '../services/timeTracking.service';
import { updateTask } from '../services/task.service';
import { TimeLog } from '../types/timeLog.types';
import { TaskStatus } from '../types/task.types';
import { TASKS_QUERY_KEY } from './useTasks';

export const ACTIVE_TIMER_QUERY_KEY = ['timer', 'active'] as const;
export const TIME_LOGS_QUERY_KEY = ['timeLogs'] as const;

export interface StartTimerParams {
  taskId: string;
  currentStatus: TaskStatus;
}

export interface StartTimerResult {
  timeLog: TimeLog;
  statusUpdateFailed: boolean;
  statusError?: string;
}

/**
 * Hook to retrieve the authenticated user's currently active running timer.
 * Recovers live session state on page refresh directly from GET /api/timer/active.
 */
export const useActiveTimer = () => {
  return useQuery<TimeLog | null, Error>({
    queryKey: ACTIVE_TIMER_QUERY_KEY,
    queryFn: getActiveTimer,
    staleTime: 1000 * 10, // 10 seconds
    refetchOnWindowFocus: true,
  });
};

/**
 * Hook to retrieve all historical time logs for the user,
 * guaranteed newest-first sorting by startedAt descending.
 */
export const useTimeLogs = () => {
  return useQuery<TimeLog[], Error>({
    queryKey: TIME_LOGS_QUERY_KEY,
    queryFn: async () => {
      const logs = await getTimeLogs();
      // Guarantee newest-first ordering on the frontend
      return logs.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
    },
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to retrieve time logs and total duration for a specific task.
 */
export const useTaskTimeLogs = (taskId: string | undefined) => {
  return useQuery<{ timeLogs: TimeLog[]; totalTimeSpentSeconds: number }, Error>({
    queryKey: [...TIME_LOGS_QUERY_KEY, taskId],
    queryFn: () => {
      if (!taskId) throw new Error('Task ID is required');
      return getTaskTimeLogs(taskId);
    },
    enabled: !!taskId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to start a timer session.
 *
 * Implements the core business rule:
 * - If task is 'pending', successful timer start automatically transitions task to 'in_progress'.
 * - If task is already 'in_progress', timer starts and status remains 'in_progress'.
 * - If timer start succeeds but status update PATCH fails:
 *   The timer is KEPT RUNNING (not auto-stopped), state is refreshed, and a recoverable warning is returned.
 */
export const useStartTimer = () => {
  const queryClient = useQueryClient();

  return useMutation<StartTimerResult, Error, StartTimerParams>({
    mutationFn: async ({ taskId, currentStatus }) => {
      // 1. Start timer first (must succeed before attempting status transition)
      const startedLog = await startTimer(taskId);

      // 2. If task was pending, automatically update status to in_progress
      if (currentStatus === 'pending') {
        try {
          await updateTask(taskId, { status: 'in_progress' });
        } catch (statusErr: unknown) {
          // If PATCH fails, do NOT stop timer; keep timer running and report recoverable issue
          const errorMessage =
            statusErr instanceof Error
              ? statusErr.message
              : 'Failed to update task status to In Progress';
          return {
            timeLog: startedLog,
            statusUpdateFailed: true,
            statusError: errorMessage,
          };
        }
      }

      return {
        timeLog: startedLog,
        statusUpdateFailed: false,
      };
    },
    onSuccess: () => {
      // Invalidate active timer, tasks list, and time logs
      queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TIME_LOGS_QUERY_KEY });
    },
  });
};

/**
 * Hook to stop a running timer session.
 *
 * Implements product rule:
 * - Stopping a timer NEVER changes task status (does not mark task as completed).
 */
export const useStopTimer = () => {
  const queryClient = useQueryClient();

  return useMutation<TimeLog, Error, string>({
    mutationFn: (taskId: string) => stopTimer(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVE_TIMER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TIME_LOGS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};
