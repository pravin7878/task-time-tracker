import { Types } from 'mongoose';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface ITask {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskResponse {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: TaskStatus;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: TaskStatus;
}

export interface TaskQueryFilter {
  status?: TaskStatus;
}
