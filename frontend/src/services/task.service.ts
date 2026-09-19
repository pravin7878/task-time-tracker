import apiClient from '../lib/api';
import {
  Task,
  TaskStatus,
  CreateTaskInput,
  UpdateTaskInput,
  TasksApiResponse,
  TaskApiResponse,
} from '../types/task.types';
import { ApiResponse } from '../types/auth.types';

/**
 * Fetch all tasks belonging to the authenticated user.
 * Optionally filtered by status: 'pending' | 'in_progress' | 'completed'.
 */
export const getTasks = async (status?: TaskStatus): Promise<Task[]> => {
  const response = await apiClient.get<TasksApiResponse>('/tasks', {
    params: status ? { status } : undefined,
  });
  return response.data.data?.tasks ?? [];
};

/**
 * Fetch a single task by ID.
 * Returns 404 if the task doesn't exist or belongs to another user.
 */
export const getTaskById = async (id: string): Promise<Task> => {
  const response = await apiClient.get<TaskApiResponse>(`/tasks/${id}`);
  if (!response.data.data?.task) {
    throw new Error('Task not found in API response');
  }
  return response.data.data.task;
};

/**
 * Create a new task for the authenticated user.
 */
export const createTask = async (data: CreateTaskInput): Promise<Task> => {
  const response = await apiClient.post<TaskApiResponse>('/tasks', data);
  if (!response.data.data?.task) {
    throw new Error('Task creation failed; no task returned');
  }
  return response.data.data.task;
};

/**
 * Update an existing task's title, description, or status.
 */
export const updateTask = async (
  id: string,
  data: UpdateTaskInput
): Promise<Task> => {
  const response = await apiClient.patch<TaskApiResponse>(`/tasks/${id}`, data);
  if (!response.data.data?.task) {
    throw new Error('Task update failed; no task returned');
  }
  return response.data.data.task;
};

/**
 * Delete an existing task.
 * Returns 409 Conflict if an active timer is running on this task.
 */
export const deleteTask = async (id: string): Promise<void> => {
  await apiClient.delete<ApiResponse>(`/tasks/${id}`);
};
