import { Task } from '../models/task.model';
import { TimeLog, TimeLogDocument } from '../models/timeLog.model';
import {
  TimeLogResponse,
  TaskTimeLogsResponse,
} from '../types/timeLog.types';
import { createNotFoundError, createConflictError } from '../utils/errors';

export const formatTimeLogResponse = (log: TimeLogDocument): TimeLogResponse => ({
  id: log._id.toString(),
  userId: log.userId.toString(),
  taskId: log.taskId.toString(),
  startedAt: log.startedAt.toISOString(),
  endedAt: log.endedAt ? log.endedAt.toISOString() : null,
  duration: log.duration,
  createdAt: log.createdAt.toISOString(),
  updatedAt: log.updatedAt.toISOString(),
});

export const startTimer = async (
  userId: string,
  taskId: string
): Promise<TimeLogResponse> => {
  // 1. Verify task ownership
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw createNotFoundError('Task not found');
  }

  // 2. Application-level check for active timer
  const existingActiveTimer = await TimeLog.findOne({
    userId,
    endedAt: null,
  });

  if (existingActiveTimer) {
    throw createConflictError(
      'Another timer is already running. Stop it before starting a new timer.'
    );
  }

  // 3. Create TimeLog with server-authoritative timestamps & concurrency catch
  try {
    const newLog = await TimeLog.create({
      userId,
      taskId,
      startedAt: new Date(),
      endedAt: null,
      duration: null,
    });

    return formatTimeLogResponse(newLog);
  } catch (error: unknown) {
    // Catch database-level partial unique index conflict (code 11000)
    const errObj = error as Record<string, unknown>;
    if (errObj?.code === 11000) {
      throw createConflictError(
        'Another timer is already running. Stop it before starting a new timer.'
      );
    }
    throw error;
  }
};

export const stopTimer = async (
  userId: string,
  taskId: string
): Promise<TimeLogResponse> => {
  // 1. Verify task ownership
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw createNotFoundError('Task not found');
  }

  // 2. Find active timer for user and task
  const activeLog = await TimeLog.findOne({
    userId,
    taskId,
    endedAt: null,
  });

  if (!activeLog) {
    throw createNotFoundError('No active timer running for this task');
  }

  // 3. Generate server endedAt and calculate duration in integer seconds
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - activeLog.startedAt.getTime();
  const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));

  activeLog.endedAt = endedAt;
  activeLog.duration = durationSeconds;
  await activeLog.save();

  return formatTimeLogResponse(activeLog);
};

export const getActiveTimer = async (
  userId: string
): Promise<TimeLogResponse | null> => {
  const activeLog = await TimeLog.findOne({
    userId,
    endedAt: null,
  });

  return activeLog ? formatTimeLogResponse(activeLog) : null;
};

export const getTimeLogs = async (
  userId: string
): Promise<TimeLogResponse[]> => {
  const logs = await TimeLog.find({ userId }).sort({ startedAt: -1 });
  return logs.map(formatTimeLogResponse);
};

export const getTaskTimeLogs = async (
  userId: string,
  taskId: string
): Promise<TaskTimeLogsResponse> => {
  // Verify task ownership
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw createNotFoundError('Task not found');
  }

  const logs = await TimeLog.find({ userId, taskId }).sort({ startedAt: -1 });
  const totalTimeSpentSeconds = logs.reduce(
    (acc, curr) => acc + (curr.duration || 0),
    0
  );

  return {
    timeLogs: logs.map(formatTimeLogResponse),
    totalTimeSpentSeconds,
  };
};
