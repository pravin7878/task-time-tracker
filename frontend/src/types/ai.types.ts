export interface TaskSuggestionRequest {
  input: string;
}

export interface TaskSuggestionData {
  title: string;
  description: string;
}

export interface TaskSuggestionResponse {
  success: boolean;
  data: TaskSuggestionData;
  message?: string;
}
