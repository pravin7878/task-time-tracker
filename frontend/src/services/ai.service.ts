import apiClient from '../lib/api';
import { TaskSuggestionData, TaskSuggestionResponse } from '../types/ai.types';

/**
 * Fetch an AI-generated task title and structured description suggestion
 * based on the user's natural language input.
 *
 * @param input Natural language task text (title + description)
 * @returns AI-suggested title and description
 */
export const getTaskSuggestion = async (input: string): Promise<TaskSuggestionData> => {
  const response = await apiClient.post<TaskSuggestionResponse>('/ai/task-suggestion', {
    input,
  });

  if (!response.data.data) {
    throw new Error('AI service did not return a valid suggestion.');
  }

  return response.data.data;
};
