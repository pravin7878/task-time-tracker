import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types/auth.types';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Extracts user-friendly error messages and field-level validation errors from Axios responses.
 */
export const extractApiError = (
  error: unknown,
  fallbackMessage = 'An unexpected error occurred. Please try again.'
): { message: string; errors?: Record<string, string> } => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse>;
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      return {
        message: data.message || fallbackMessage,
        errors: data.errors,
      };
    }
    if (axiosError.code === 'ECONNABORTED') {
      return { message: 'Connection timed out. Please check your internet and try again.' };
    }
    if (!axiosError.response) {
      return { message: 'Unable to connect to the server. Please ensure the backend is running.' };
    }
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: fallbackMessage };
};

export default apiClient;
