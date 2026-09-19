export interface ValidationResult<T> {
  isValid: boolean;
  errors: Record<string, string>;
  value?: T;
}

export const MAX_INPUT_LENGTH = 1000;

export const validateTaskSuggestionInput = (
  body: unknown
): ValidationResult<{ input: string }> => {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      isValid: false,
      errors: { body: 'Request body must be a JSON object' },
    };
  }

  const payload = body as Record<string, unknown>;

  if (payload.input === undefined || payload.input === null) {
    errors.input = 'Task input is required';
  } else if (typeof payload.input !== 'string') {
    errors.input = 'Task input must be a string';
  } else {
    const trimmedInput = payload.input.trim();
    if (trimmedInput.length === 0) {
      errors.input = 'Task input cannot be empty';
    } else if (trimmedInput.length > MAX_INPUT_LENGTH) {
      errors.input = `Task input cannot exceed ${MAX_INPUT_LENGTH} characters`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      isValid: false,
      errors,
    };
  }

  return {
    isValid: true,
    errors: {},
    value: {
      input: (payload.input as string).trim(),
    },
  };
};
