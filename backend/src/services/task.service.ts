import { Task, TaskDocument } from '../models/task.model';
import { TimeLog } from '../models/timeLog.model';
import {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskResponse,
  TaskQueryFilter,
} from '../types/task.types';
import { createNotFoundError, createConflictError } from '../utils/errors';

const formatTaskResponse = (task: TaskDocument): TaskResponse => ({
  id: task._id.toString(),
  title: task.title,
  description: task.description || '',
  status: task.status,
  createdAt: task.createdAt.toISOString(),
  updatedAt: task.updatedAt.toISOString(),
});

export const createTask = async (
  userId: string,
  data: CreateTaskDTO
): Promise<TaskResponse> => {
  const newTask = await Task.create({
    userId,
    title: data.title,
    description: data.description || '',
    status: data.status || 'pending',
  });

  return formatTaskResponse(newTask);
};

export const getTasks = async (
  userId: string,
  filter?: TaskQueryFilter
): Promise<TaskResponse[]> => {
  const query: Record<string, unknown> = { userId };

  if (filter?.status) {
    query.status = filter.status;
  }

  const tasks = await Task.find(query).sort({ createdAt: -1 });
  return tasks.map(formatTaskResponse);
};

export const getTaskById = async (
  userId: string,
  taskId: string
): Promise<TaskResponse> => {
  const task = await Task.findOne({ _id: taskId, userId });

  if (!task) {
    throw createNotFoundError('Task not found');
  }

  return formatTaskResponse(task);
};

export const updateTask = async (
  userId: string,
  taskId: string,
  data: UpdateTaskDTO
): Promise<TaskResponse> => {
  const updatedTask = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updatedTask) {
    throw createNotFoundError('Task not found');
  }

  return formatTaskResponse(updatedTask);
};

export const deleteTask = async (
  userId: string,
  taskId: string
): Promise<void> => {
  // Verify task exists and belongs to the user
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw createNotFoundError('Task not found');
  }

  // Check for active timer session associated with this task
  const activeTimer = await TimeLog.findOne({
    taskId,
    userId,
    endedAt: null,
  });

  if (activeTimer) {
    throw createConflictError('Cannot delete a task while its timer is running.');
  }

  await Task.deleteOne({ _id: taskId, userId });
};
