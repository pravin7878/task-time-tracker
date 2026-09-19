import { useQuery } from '@tanstack/react-query';
import { getTodaySummary } from '../services/summary.service';
import { DailySummaryData } from '../types/summary.types';

export const SUMMARY_QUERY_KEY = ['summary'] as const;
export const SUMMARY_TODAY_QUERY_KEY = (timezone: string) =>
  ['summary', 'today', timezone] as const;

/**
 * Hook to retrieve the daily summary for today based on the user's detected or specified IANA timezone.
 */
export const useDailySummary = (customTimezone?: string) => {
  const timezone =
    customTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  return useQuery<DailySummaryData, Error>({
    queryKey: SUMMARY_TODAY_QUERY_KEY(timezone),
    queryFn: () => getTodaySummary(timezone),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};
