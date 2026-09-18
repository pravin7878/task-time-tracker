export interface AppError extends Error {
  statusCode: number;
  isAppError: true;
  errors?: Record<string, string>;
}

export const createAppError = (
  message: string,
  statusCode: number = 500,
  errors?: Record<string, string>
): AppError => {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isAppError = true;
  error.errors = errors;
  return error;
};

export const createBadRequestError = (
  message: string = 'Bad request',
  errors?: Record<string, string>
): AppError => {
  return createAppError(message, 400, errors);
};

export const createUnauthorizedError = (
  message: string = 'Unauthorized'
): AppError => {
  return createAppError(message, 401);
};

export const createForbiddenError = (
  message: string = 'Forbidden'
): AppError => {
  return createAppError(message, 403);
};

export const createNotFoundError = (
  message: string = 'Resource not found'
): AppError => {
  return createAppError(message, 404);
};

export const createConflictError = (
  message: string = 'Conflict'
): AppError => {
  return createAppError(message, 409);
};

export const isAppError = (err: unknown): err is AppError => {
  return typeof err === 'object' && err !== null && (err as AppError).isAppError === true;
};
