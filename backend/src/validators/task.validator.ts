import { CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../types/task.types';

export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;
const VALID_STATUSES: readonly TaskStatus[] = ['pending', 'in_progress', 'completed'] as const;

export const validateTaskId = (id: unknown): ValidationResult<string> => {
  if (typeof id !== 'string' || !OBJECT_ID_REGEX.test(id)) {
    return {
      isValid: false,
      errors: { id: 'Invalid task ID format' },
    };
  }

  return {
    isValid: true,
    errors: {},
    value: id,
  };
};

export const validateCreateTaskInput = (body: unknown): ValidationResult<CreateTaskDTO> => {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
    };
  }

  const payload = body as Record<string, unknown>;

  // Title validation
  if (payload.title === undefined || payload.title === null) {
    errors.title = 'Title is required';
  } else if (typeof payload.title !== 'string') {
    errors.title = 'Title must be a string';
  } else {
    const trimmedTitle = payload.title.trim();
    if (trimmedTitle.length === 0) {
      errors.title = 'Title cannot be empty';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Title cannot exceed 200 characters';
    }
  }

  // Description validation (optional)
  let trimmedDescription: string | undefined = undefined;
  if (payload.description !== undefined && payload.description !== null) {
    if (typeof payload.description !== 'string') {
      errors.description = 'Description must be a string';
    } else {
      trimmedDescription = payload.description.trim();
      if (trimmedDescription.length > 2000) {
        errors.description = 'Description cannot exceed 2000 characters';
      }
    }
  }

  // Status validation (optional, defaults to pending)
  let status: TaskStatus = 'pending';
  if (payload.status !== undefined && payload.status !== null) {
    if (typeof payload.status !== 'string' || !VALID_STATUSES.includes(payload.status as TaskStatus)) {
      errors.status = 'Status must be pending, in_progress, or completed';
    } else {
      status = payload.status as TaskStatus;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      title: (payload.title as string).trim(),
      description: trimmedDescription ?? '',
      status,
    },
  };
};

export const validateUpdateTaskInput = (body: unknown): ValidationResult<UpdateTaskDTO> => {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
    };
  }

  const payload = body as Record<string, unknown>;
  const allowedKeys = ['title', 'description', 'status'];
  const providedKeys = Object.keys(payload);

  if (providedKeys.length === 0) {
    return {
      isValid: false,
      errors: { body: 'At least one field (title, description, status) must be provided for update' },
    };
  }

  const invalidKeys = providedKeys.filter((key) => !allowedKeys.includes(key));
  if (invalidKeys.length > 0) {
    return {
      isValid: false,
      errors: { body: `Unexpected or unauthorized fields: ${invalidKeys.join(', ')}` },
    };
  }

  const result: UpdateTaskDTO = {};

  // Title validation (if provided)
  if (payload.title !== undefined) {
    if (typeof payload.title !== 'string') {
      errors.title = 'Title must be a string';
    } else {
      const trimmedTitle = payload.title.trim();
      if (trimmedTitle.length === 0) {
        errors.title = 'Title cannot be empty';
      } else if (trimmedTitle.length > 200) {
        errors.title = 'Title cannot exceed 200 characters';
      } else {
        result.title = trimmedTitle;
      }
    }
  }

  // Description validation (if provided)
  if (payload.description !== undefined) {
    if (typeof payload.description !== 'string') {
      errors.description = 'Description must be a string';
    } else {
      const trimmedDescription = payload.description.trim();
      if (trimmedDescription.length > 2000) {
        errors.description = 'Description cannot exceed 2000 characters';
      } else {
        result.description = trimmedDescription;
      }
    }
  }

  // Status validation (if provided)
  if (payload.status !== undefined) {
    if (typeof payload.status !== 'string' || !VALID_STATUSES.includes(payload.status as TaskStatus)) {
      errors.status = 'Status must be pending, in_progress, or completed';
    } else {
      result.status = payload.status as TaskStatus;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    value: result,
  };
};

export const validateTaskStatusQuery = (status: unknown): ValidationResult<TaskStatus | undefined> => {
  if (status === undefined || status === null || status === '') {
    return { isValid: true, errors: {}, value: undefined };
  }

  if (typeof status !== 'string' || !VALID_STATUSES.includes(status as TaskStatus)) {
    return {
      isValid: false,
      errors: { status: 'Status query parameter must be pending, in_progress, or completed' },
    };
  }

  return {
    isValid: true,
    errors: {},
    value: status as TaskStatus,
  };
};
