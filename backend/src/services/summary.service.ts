import { DateTime } from 'luxon';
import { Task } from '../models/task.model';
import { TimeLog } from '../models/timeLog.model';
import { formatTaskResponse } from './task.service';
import {
  DailySummaryResponse,
  TaskWorkedOnSummary,
} from '../types/summary.types';

export interface DayBoundaries {
  dateStr: string;
  startOfDay: Date;
  startOfNextDay: Date;
}

/**
 * Computes calendar day boundaries in UTC for the requested IANA timezone.
 */
export const calculateDayBoundaries = (
  timezone: string,
  referenceInstant: Date = new Date()
): DayBoundaries => {
  const dt = DateTime.fromJSDate(referenceInstant).setZone(timezone);
  const dateStr = dt.toISODate()!;
  const startOfDay = dt.startOf('day').toJSDate();
  const startOfNextDay = dt.plus({ days: 1 }).startOf('day').toJSDate();

  return {
    dateStr,
    startOfDay,
    startOfNextDay,
  };
};

/**
 * Computes the authenticated user's daily summary for their local calendar day.
 * Accurately handles cross-midnight sessions and active timers without mutating stored records.
 */
export const getDailySummary = async (
  userId: string,
  timezone: string,
  referenceInstant: Date = new Date()
): Promise<DailySummaryResponse> => {
  // 1. Determine local calendar day boundaries
  const dayBoundaries = calculateDayBoundaries(timezone, referenceInstant);

  // 2. Fetch all tasks belonging strictly to the authenticated user
  const userTasks = await Task.find({ userId }).sort({ createdAt: -1 });

  const completedTasks = userTasks
    .filter((task) => task.status === 'completed')
    .map(formatTaskResponse);

  const inProgressTasks = userTasks
    .filter((task) => task.status === 'in_progress')
    .map(formatTaskResponse);

  const pendingTasks = userTasks
    .filter((task) => task.status === 'pending')
    .map(formatTaskResponse);

  // Map for fast task title lookup
  const taskMap = new Map(userTasks.map((task) => [task._id.toString(), task]));

  // 3. Query TimeLogs overlapping the user's local day
  const timeLogs = await TimeLog.find({
    userId,
    startedAt: { $lt: dayBoundaries.startOfNextDay },
    $or: [
      { endedAt: { $gt: dayBoundaries.startOfDay } },
      { endedAt: null },
    ],
  });

  // 4. Calculate exact overlap duration for each session
  let totalTrackedTime = 0;
  const taskTimeMap = new Map<string, number>();
  const activeTaskIds = new Set<string>();

  for (const log of timeLogs) {
    const sessionStart = log.startedAt;
    const sessionEnd = log.endedAt ?? referenceInstant;

    if (log.endedAt === null) {
      activeTaskIds.add(log.taskId.toString());
    }

    // Overlap interval with [startOfDay, startOfNextDay)
    const overlapStart = Math.max(
      sessionStart.getTime(),
      dayBoundaries.startOfDay.getTime()
    );
    const overlapEnd = Math.min(
      sessionEnd.getTime(),
      dayBoundaries.startOfNextDay.getTime()
    );

    if (overlapEnd > overlapStart) {
      const durationSeconds = Math.max(
        0,
        Math.floor((overlapEnd - overlapStart) / 1000)
      );
      totalTrackedTime += durationSeconds;

      const taskIdStr = log.taskId.toString();
      const currentTaskTime = taskTimeMap.get(taskIdStr) || 0;
      taskTimeMap.set(taskIdStr, currentTaskTime + durationSeconds);
    }
  }

  // Ensure active tasks with 0 elapsed seconds today are still represented in tasks worked on
  for (const activeTaskId of activeTaskIds) {
    if (!taskTimeMap.has(activeTaskId)) {
      taskTimeMap.set(activeTaskId, 0);
    }
  }

  // 5. Construct tasks worked on summary
  const tasksWorkedOn: TaskWorkedOnSummary[] = Array.from(
    taskTimeMap.entries()
  ).map(([taskId, timeSpentSeconds]) => {
    const task = taskMap.get(taskId);
    return {
      taskId,
      title: task ? task.title : 'Unknown Task',
      timeSpentSeconds,
    };
  });

  // Sort tasks worked on: highest time spent first
  tasksWorkedOn.sort((a, b) => b.timeSpentSeconds - a.timeSpentSeconds);

  return {
    date: dayBoundaries.dateStr,
    timezone,
    totalTrackedTime,
    tasksWorkedOn,
    completedTasks,
    pendingTasks,
    inProgressTasks,
  };
};
