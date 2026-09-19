import React, { useState, useEffect } from 'react';
import { FiClock } from 'react-icons/fi';

interface LiveTimerProps {
  startedAt: string | Date;
  className?: string;
  showIcon?: boolean;
}

/**
 * Formats integer seconds as HH:MM:SS.
 */
export const formatDuration = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ].join(':');
};

/**
 * Formats completed duration in human-readable form (e.g., "1h 24m 30s", "45s").
 */
export const formatReadableDuration = (totalSeconds: number | null): string => {
  if (totalSeconds === null || totalSeconds === undefined) return '0s';
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || hours > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
};

export const LiveTimer: React.FC<LiveTimerProps> = ({
  startedAt,
  className = '',
  showIcon = true,
}) => {
  const calculateElapsed = (): number => {
    const startMs = new Date(startedAt).getTime();
    if (isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  };

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(calculateElapsed);

  useEffect(() => {
    // Update immediately on prop change
    setElapsedSeconds(calculateElapsed());

    // Run 1s tick interval
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-sm font-semibold tracking-tight text-blue-700 ${className}`}
      aria-label={`Live timer: ${formatDuration(elapsedSeconds)}`}
    >
      {showIcon && (
        <span className="relative flex items-center justify-center">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping absolute opacity-75" />
          <span className="w-2 h-2 rounded-full bg-blue-600 relative" />
        </span>
      )}
      <FiClock className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
      <span>{formatDuration(elapsedSeconds)}</span>
    </span>
  );
};

interface TaskTotalTrackedProps {
  baseSeconds: number;
  activeStartedAt?: string | null;
  className?: string;
}

/**
 * Displays cumulative total tracked time for a task (HH:MM:SS),
 * dynamically adding the live ticking duration if a session is currently active.
 * Avoids N+1 requests and updates in real-time.
 */
export const TaskTotalTracked: React.FC<TaskTotalTrackedProps> = ({
  baseSeconds,
  activeStartedAt,
  className = '',
}) => {
  const getElapsed = (): number => {
    if (!activeStartedAt) return 0;
    const startMs = new Date(activeStartedAt).getTime();
    if (isNaN(startMs)) return 0;
    return Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  };

  const [liveSeconds, setLiveSeconds] = useState<number>(() => baseSeconds + getElapsed());

  useEffect(() => {
    if (!activeStartedAt) {
      setLiveSeconds(baseSeconds);
      return;
    }

    setLiveSeconds(baseSeconds + getElapsed());

    const interval = setInterval(() => {
      setLiveSeconds(baseSeconds + getElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [baseSeconds, activeStartedAt]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono ${className}`}
      title="Total time tracked on this task across all sessions"
    >
      <span aria-hidden="true">⏱</span>
      <span>Total tracked:</span>
      <span className="font-semibold text-slate-700">{formatDuration(liveSeconds)}</span>
    </span>
  );
};

export default LiveTimer;
