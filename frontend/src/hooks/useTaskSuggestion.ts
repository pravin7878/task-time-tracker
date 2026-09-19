import { useMutation } from '@tanstack/react-query';
import { getTaskSuggestion } from '../services/ai.service';
import { TaskSuggestionData } from '../types/ai.types';

/**
 * Mutation hook to request an AI task suggestion.
 * Note: Does not invalidate any query caches because requesting
 * an AI suggestion does not mutate database/server state.
 */
export const useTaskSuggestion = () => {
  return useMutation<TaskSuggestionData, Error, string>({
    mutationFn: (input: string) => getTaskSuggestion(input),
  });
};
