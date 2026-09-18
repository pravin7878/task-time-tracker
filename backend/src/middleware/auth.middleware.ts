import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';
import { createUnauthorizedError } from '../utils/errors';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  let token: string | undefined = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(createUnauthorizedError('Authentication required'));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(createUnauthorizedError('Invalid or expired authentication token'));
  }

  req.user = {
    id: payload.userId,
    email: payload.email,
  };

  next();
};
