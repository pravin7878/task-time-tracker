export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

export const validateTimerTaskId = (id: unknown): ValidationResult<string> => {
  if (typeof id !== 'string' || !OBJECT_ID_REGEX.test(id)) {
    return {
      isValid: false,
      errors: { taskId: 'Invalid task ID format' },
    };
  }

  return {
    isValid: true,
    errors: {},
    value: id,
  };
};

export const validateStartStopTimerPayload = (body: unknown): ValidationResult<void> => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { isValid: true, errors: {} };
  }

  const payload = body as Record<string, unknown>;
  const prohibitedFields = ['userId', 'startedAt', 'endedAt', 'duration'];
  const violations = prohibitedFields.filter((field) => payload[field] !== undefined);

  if (violations.length > 0) {
    return {
      isValid: false,
      errors: {
        body: `Client cannot provide server-controlled fields: ${violations.join(', ')}`,
      },
    };
  }

  return { isValid: true, errors: {} };
};
