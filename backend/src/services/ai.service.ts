import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';
import { createAppError, isAppError } from '../utils/errors';
import {
  TaskSuggestionData,
  MinimalGeminiClient,
} from '../types/ai.types';

const SYSTEM_INSTRUCTION = `You are a professional task management assistant.
Your goal is to accept a user's natural-language task input and generate an improved task title and structured description.

Rules:
1. Understand the user's original task and preserve their original intent completely.
2. Generate a concise, actionable title, preferably 3-8 words.
3. Generate a clear, structured description providing actionable context or steps based on the user's input.
4. Avoid inventing unnecessary facts or unstated assumptions.
5. You must NEVER generate or output: userId, taskId, status, timer information, time logs, authentication details, ownership information, or database fields.
6. Return ONLY a JSON object containing 'title' and 'description'.`;

const TASK_SUGGESTION_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A concise, actionable task title, preferably 3-8 words.',
    },
    description: {
      type: 'string',
      description: 'A clear, structured description of the task.',
    },
  },
  required: ['title', 'description'],
};

let defaultClientOverride: MinimalGeminiClient | null = null;

/**
 * For type-safe testing: allows injecting a mock Gemini client.
 */
export const setGeminiClientForTesting = (
  client: MinimalGeminiClient | null
): void => {
  defaultClientOverride = client;
};

/**
 * Lazy factory for creating the Gemini SDK client.
 * Does not require a valid API key at module import time.
 */
export const getGeminiClient = (): MinimalGeminiClient => {
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    throw createAppError('AI suggestion service is temporarily unavailable', 503);
  }
  return new GoogleGenAI({ apiKey }) as unknown as MinimalGeminiClient;
};

/**
 * Generates an improved task title and structured description using Gemini 3.6 Flash.
 * Pure functional service without application-layer classes.
 *
 * @param input Natural language task text provided by the authenticated user
 * @param clientOverride Optional injected Gemini client for type-safe automated tests
 */
export const generateTaskSuggestion = async (
  input: string,
  clientOverride?: MinimalGeminiClient
): Promise<TaskSuggestionData> => {
  const model = process.env.GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-3.6-flash';
  const client = clientOverride || defaultClientOverride || getGeminiClient();

  try {
    const response = await client.models.generateContent({
      model,
      contents: `Improve the following natural-language task input into a well-structured task title and description:\n\n"${input}"`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: TASK_SUGGESTION_SCHEMA,
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    const responseText = response.text;
    if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    const payload = parsed as Record<string, unknown>;

    if (
      typeof payload.title !== 'string' ||
      typeof payload.description !== 'string'
    ) {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    const trimmedTitle = payload.title.trim();
    const trimmedDescription = payload.description.trim();

    if (trimmedTitle.length === 0 || trimmedDescription.length === 0) {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    if (trimmedTitle.length > 200 || trimmedDescription.length > 2000) {
      throw createAppError('AI service returned an invalid or malformed response', 503);
    }

    return {
      title: trimmedTitle,
      description: trimmedDescription,
    };
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    // Log internal error for diagnostics without leaking credentials or raw stack to the client
    console.error('[ai.service] Gemini provider failure:', (error as Error)?.message || error);
    throw createAppError('AI suggestion service is temporarily unavailable', 503);
  }
};
