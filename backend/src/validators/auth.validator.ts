import { RegisterDTO, LoginDTO } from '../types/auth.types';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateRegisterInput = (body: unknown): ValidationResult<RegisterDTO> => {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
    };
  }

  const payload = body as Record<string, unknown>;

  // Name validation
  if (payload.name === undefined || payload.name === null) {
    errors.name = 'Name is required';
  } else if (typeof payload.name !== 'string') {
    errors.name = 'Name must be a string';
  } else {
    const trimmedName = payload.name.trim();
    if (trimmedName.length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    } else if (trimmedName.length > 60) {
      errors.name = 'Name cannot exceed 60 characters';
    }
  }

  // Email validation
  if (payload.email === undefined || payload.email === null) {
    errors.email = 'Email is required';
  } else if (typeof payload.email !== 'string') {
    errors.email = 'Email must be a string';
  } else {
    const trimmedEmail = payload.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    } else if (trimmedEmail.length > 254) {
      errors.email = 'Email address is too long';
    }
  }

  // Password validation
  if (payload.password === undefined || payload.password === null) {
    errors.password = 'Password is required';
  } else if (typeof payload.password !== 'string') {
    errors.password = 'Password must be a string';
  } else if (payload.password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  } else if (payload.password.length > 128) {
    errors.password = 'Password cannot exceed 128 characters';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      name: (payload.name as string).trim(),
      email: (payload.email as string).trim().toLowerCase(),
      password: payload.password as string,
    },
  };
};

export const validateLoginInput = (body: unknown): ValidationResult<LoginDTO> => {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
    };
  }

  const payload = body as Record<string, unknown>;

  // Email validation
  if (payload.email === undefined || payload.email === null) {
    errors.email = 'Email is required';
  } else if (typeof payload.email !== 'string') {
    errors.email = 'Email must be a string';
  } else {
    const trimmedEmail = payload.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address';
    }
  }

  // Password validation
  if (payload.password === undefined || payload.password === null) {
    errors.password = 'Password is required';
  } else if (typeof payload.password !== 'string') {
    errors.password = 'Password must be a string';
  } else if ((payload.password as string).length === 0) {
    errors.password = 'Password cannot be empty';
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      email: (payload.email as string).trim().toLowerCase(),
      password: payload.password as string,
    },
  };
};
