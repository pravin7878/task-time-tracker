import { Request, Response, NextFunction } from 'express';
import { generateTaskSuggestion } from '../services/ai.service';
import { validateTaskSuggestionInput } from '../validators/ai.validator';
import { createBadRequestError, createUnauthorizedError } from '../utils/errors';

/**
 * Controller endpoint: POST /api/ai/task-suggestion
 * Suggests improved title and description using Gemini 3.6 Flash.
 *
 * Requirements:
 * - Requires authenticated user.
 * - Does NOT create or modify any Task document.
 * - Does NOT accept userId from request body.
 * - Suggestion only, no database storage.
 */
export const getTaskSuggestion = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const validation = validateTaskSuggestionInput(req.body);
    if (!validation.isValid || !validation.value) {
      throw createBadRequestError('Validation failed', validation.errors);
    }

    const suggestion = await generateTaskSuggestion(validation.value.input);

    res.status(200).json({
      success: true,
      data: {
        title: suggestion.title,
        description: suggestion.description,
      },
    });
  } catch (error) {
    next(error);
  }
};
