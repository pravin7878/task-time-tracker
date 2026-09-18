import { Schema, model, Document, Types } from 'mongoose';

export interface ITimeLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  taskId: Types.ObjectId;
  startedAt: Date;
  endedAt: Date | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeLogDocument extends Omit<ITimeLog, '_id'>, Document {}

const timeLogSchema = new Schema<TimeLogDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    startedAt: {
      type: Date,
      required: [true, 'Start timestamp is required'],
    },
    endedAt: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Ensure at the database level that a user can have AT MOST ONE active timer (endedAt: null)
timeLogSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: { endedAt: null },
    name: 'unique_active_timer_per_user',
  }
);

// Optimize time log queries: active timer lookup, task time logs, and user history
timeLogSchema.index({ userId: 1, endedAt: 1 });
timeLogSchema.index({ userId: 1, taskId: 1, startedAt: -1 });
timeLogSchema.index({ userId: 1, startedAt: -1 });

export const TimeLog = model<TimeLogDocument>('TimeLog', timeLogSchema);
