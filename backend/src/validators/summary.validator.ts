import { IANAZone } from 'luxon';

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  errors?: Record<string, string>;
}

export const validateSummaryTimezone = (
  rawTimezone: unknown
): ValidationResult<string> => {
  if (
    rawTimezone === undefined ||
    rawTimezone === null ||
    typeof rawTimezone !== 'string' ||
    rawTimezone.trim().length === 0
  ) {
    return {
      isValid: false,
      errors: {
        timezone: 'Timezone parameter is required',
      },
    };
  }

  const trimmed = rawTimezone.trim();

  if (!IANAZone.isValidZone(trimmed)) {
    return {
      isValid: false,
      errors: {
        timezone:
          "Invalid timezone parameter. Must be a valid IANA timezone identifier (e.g., 'Asia/Kolkata', 'America/New_York').",
      },
    };
  }

  return {
    isValid: true,
    value: trimmed,
  };
};
