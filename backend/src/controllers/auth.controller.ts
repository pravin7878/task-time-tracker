import { Request, Response, NextFunction } from 'express';
import {
  register as registerUser,
  login as loginUser,
  getCurrentUser,
} from '../services/auth.service';
import {
  validateRegisterInput,
  validateLoginInput,
} from '../validators/auth.validator';
import { setAuthCookie, clearAuthCookie } from '../utils/token';
import { createBadRequestError, createUnauthorizedError } from '../utils/errors';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = validateRegisterInput(req.body);

    if (!validation.isValid || !validation.value) {
      throw createBadRequestError('Validation failed', validation.errors);
    }

    const { user, token } = await registerUser(validation.value);

    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validation = validateLoginInput(req.body);

    if (!validation.isValid || !validation.value) {
      throw createBadRequestError('Validation failed', validation.errors);
    }

    const { user, token } = await loginUser(validation.value);

    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = (
  _req: Request,
  res: Response
): void => {
  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

export const me = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      throw createUnauthorizedError('Authentication required');
    }

    const user = await getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};