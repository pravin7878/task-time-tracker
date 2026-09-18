import { Schema, model, Document } from 'mongoose';
import { ITask, TaskStatus } from '../types/task.types';

export interface TaskDocument extends Omit<ITask, '_id'>, Document {}

const VALID_STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed'];

const taskSchema = new Schema<TaskDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      minlength: [1, 'Task title cannot be empty'],
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Task description cannot exceed 2000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: VALID_STATUSES,
        message: 'Status must be pending, in_progress, or completed',
      },
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Optimize queries: newest tasks first and status filtering per user
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, status: 1 });

export const Task = model<TaskDocument>('Task', taskSchema);
