import { ApiResponse } from './auth.types';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export type TaskFilterStatus = 'all' | TaskStatus;

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
}

export type TasksApiResponse = ApiResponse<{ tasks: Task[] }>;
export type TaskApiResponse = ApiResponse<{ task: Task }>;
