export interface TaskSuggestionInput {
  input: string;
}

export interface TaskSuggestionData {
  title: string;
  description: string;
}

export interface TaskSuggestionResponse {
  success: boolean;
  data: TaskSuggestionData;
}

export interface GeminiGenerateContentResponse {
  text?: string | null;
}

export interface MinimalGeminiClient {
  models: {
    generateContent: (params: {
      model: string;
      contents: string;
      config?: {
        responseMimeType?: string;
        responseSchema?: Record<string, unknown>;
        systemInstruction?: string;
      };
    }) => Promise<GeminiGenerateContentResponse>;
  };
}
