export interface TimeLogResponse {
  id: string;
  userId: string;
  taskId: string;
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimeLogsResponse {
  timeLogs: TimeLogResponse[];
  totalTimeSpentSeconds: number;
}

export interface ActiveTimerResponse {
  activeTimer: TimeLogResponse | null;
}
