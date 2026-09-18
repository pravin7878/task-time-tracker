import { Request, Response, NextFunction } from 'express';
import {
  startTimer as startTimerService,
  stopTimer as stopTimerService,
  getActiveTimer as getActiveTimerService,
  getTimeLogs as getTimeLogsService,
  getTaskTimeLogs as getTaskTimeLogsService,
} from '../services/timer.service';
import {
  validateTimerTaskId,
  validateStartStopTimerPayload,
} from '../validators/timer.validator';
import { createBadRequestError, createUnauthorizedError } from '../utils/errors';

export const startTimer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTimerTaskId(req.params.taskId);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    const payloadValidation = validateStartStopTimerPayload(req.body);
    if (!payloadValidation.isValid) {
      throw createBadRequestError('Validation failed', payloadValidation.errors);
    }

    const timeLog = await startTimerService(req.user.id, idValidation.value);

    res.status(201).json({
      success: true,
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const stopTimer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTimerTaskId(req.params.taskId);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    const payloadValidation = validateStartStopTimerPayload(req.body);
    if (!payloadValidation.isValid) {
      throw createBadRequestError('Validation failed', payloadValidation.errors);
    }

    const timeLog = await stopTimerService(req.user.id, idValidation.value);

    res.status(200).json({
      success: true,
      data: { timeLog },
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveTimer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const activeTimer = await getActiveTimerService(req.user.id);

    res.status(200).json({
      success: true,
      data: { activeTimer },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const timeLogs = await getTimeLogsService(req.user.id);

    res.status(200).json({
      success: true,
      data: { timeLogs },
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskTimeLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTimerTaskId(req.params.taskId);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    const result = await getTaskTimeLogsService(req.user.id, idValidation.value);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
