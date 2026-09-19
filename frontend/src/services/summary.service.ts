import apiClient from '../lib/api';
import { DailySummaryData, DailySummaryResponse } from '../types/summary.types';

/**
 * Retrieve the daily productivity summary for the authenticated user for today.
 * @param timezone IANA timezone string (e.g., 'Asia/Kolkata', 'America/New_York')
 */
export const getTodaySummary = async (timezone: string): Promise<DailySummaryData> => {
  const response = await apiClient.get<DailySummaryResponse>('/summary/today', {
    params: { timezone },
  });

  if (!response.data.data) {
    throw new Error('No summary data returned from server');
  }

  return response.data.data;
};
