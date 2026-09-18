import { Request, Response, NextFunction } from 'express';
import { getDailySummary as getDailySummaryService } from '../services/summary.service';
import { validateSummaryTimezone } from '../validators/summary.validator';
import { createBadRequestError, createUnauthorizedError } from '../utils/errors';

export const getTodaySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const timezoneValidation = validateSummaryTimezone(req.query.timezone);
    if (!timezoneValidation.isValid || !timezoneValidation.value) {
      throw createBadRequestError(
        'Validation failed',
        timezoneValidation.errors
      );
    }

    const summary = await getDailySummaryService(
      req.user.id,
      timezoneValidation.value
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};
