import { Request, Response, NextFunction } from 'express';
import { AppError, isAppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isDev = env.NODE_ENV === 'development';

  // Known AppError
  if (isAppError(err)) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors && { errors: err.errors }),
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // Handle Mongoose duplicate key error (11000)
  const errObj = err as unknown as Record<string, unknown>;
  if (errObj.code === 11000) {
    const keyValue = errObj.keyValue as Record<string, unknown> | undefined;
    const field = keyValue ? Object.keys(keyValue)[0] : 'field';
    res.status(400).json({
      success: false,
      message: `Duplicate value entered for ${field}`,
      errors: { [field]: `${field} already exists` },
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'Invalid resource ID format',
    });
    return;
  }

  // Handle Body parser SyntaxError
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res.status(400).json({
      success: false,
      message: 'Malformed JSON payload',
    });
    return;
  }

  // Unhandled / 500 error
  console.error('[error] Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};
