import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../services/task.service';
import {
  Task,
  TaskStatus,
  TaskFilterStatus,
  CreateTaskInput,
  UpdateTaskInput,
} from '../types/task.types';

export const TASKS_QUERY_KEY = ['tasks'] as const;

/**
 * Hook to retrieve tasks for the authenticated user,
 * with optional status filtering.
 */
export const useTasks = (statusFilter?: TaskFilterStatus) => {
  const effectiveStatus: TaskStatus | undefined =
    statusFilter && statusFilter !== 'all' ? statusFilter : undefined;

  const queryKey = effectiveStatus
    ? ([...TASKS_QUERY_KEY, { status: effectiveStatus }] as const)
    : TASKS_QUERY_KEY;

  return useQuery<Task[], Error>({
    queryKey,
    queryFn: () => getTasks(effectiveStatus),
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Hook to retrieve a single task by ID.
 */
export const useTask = (taskId: string | undefined) => {
  return useQuery<Task, Error>({
    queryKey: [...TASKS_QUERY_KEY, taskId],
    queryFn: () => {
      if (!taskId) throw new Error('Task ID is required');
      return getTaskById(taskId);
    },
    enabled: !!taskId,
    staleTime: 1000 * 30,
  });
};

/**
 * Hook to create a new task.
 */
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTaskInput) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};

/**
 * Hook to update an existing task.
 */
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      updateTask(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY, id] });
    },
  });
};

/**
 * Hook to delete a task.
 */
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
  });
};
