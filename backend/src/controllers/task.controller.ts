import { Request, Response, NextFunction } from 'express';
import {
  createTask as createTaskService,
  getTasks as getTasksService,
  getTaskById as getTaskByIdService,
  updateTask as updateTaskService,
  deleteTask as deleteTaskService,
} from '../services/task.service';
import {
  validateTaskId,
  validateCreateTaskInput,
  validateUpdateTaskInput,
  validateTaskStatusQuery,
} from '../validators/task.validator';
import { createBadRequestError, createUnauthorizedError } from '../utils/errors';

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const validation = validateCreateTaskInput(req.body);
    if (!validation.isValid || !validation.value) {
      throw createBadRequestError('Validation failed', validation.errors);
    }

    const task = await createTaskService(req.user.id, validation.value);

    res.status(201).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const statusValidation = validateTaskStatusQuery(req.query.status);
    if (!statusValidation.isValid) {
      throw createBadRequestError('Validation failed', statusValidation.errors);
    }

    const tasks = await getTasksService(req.user.id, {
      status: statusValidation.value,
    });

    res.status(200).json({
      success: true,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTaskId(req.params.id);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    const task = await getTaskByIdService(req.user.id, idValidation.value);

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTaskId(req.params.id);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    const bodyValidation = validateUpdateTaskInput(req.body);
    if (!bodyValidation.isValid || !bodyValidation.value) {
      throw createBadRequestError('Validation failed', bodyValidation.errors);
    }

    const task = await updateTaskService(
      req.user.id,
      idValidation.value,
      bodyValidation.value
    );

    res.status(200).json({
      success: true,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const idValidation = validateTaskId(req.params.id);
    if (!idValidation.isValid || !idValidation.value) {
      throw createBadRequestError('Validation failed', idValidation.errors);
    }

    await deleteTaskService(req.user.id, idValidation.value);

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
