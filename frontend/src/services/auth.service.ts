import apiClient from '../lib/api';
import {
  User,
  LoginFormData,
  RegisterFormData,
  ApiResponse,
  AuthData,
} from '../types/auth.types';

/**
 * Fetch the profile of the currently authenticated user.
 * Browser automatically includes the HTTP-only cookie.
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<ApiResponse<AuthData>>('/auth/me');
  if (!response.data.data?.user) {
    throw new Error('User data missing from authentication response');
  }
  return response.data.data.user;
};

/**
 * Log in with email and password.
 * Backend sets the HTTP-only cookie upon success.
 */
export const login = async (credentials: LoginFormData): Promise<User> => {
  const response = await apiClient.post<ApiResponse<AuthData>>(
    '/auth/login',
    credentials
  );
  if (!response.data.data?.user) {
    throw new Error('User data missing from login response');
  }
  return response.data.data.user;
};

/**
 * Register a new account.
 * Backend establishes the session and sets the HTTP-only cookie automatically.
 */
export const register = async (
  formData: Omit<RegisterFormData, 'confirmPassword'>
): Promise<User> => {
  const response = await apiClient.post<ApiResponse<AuthData>>(
    '/auth/register',
    {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
    }
  );
  if (!response.data.data?.user) {
    throw new Error('User data missing from registration response');
  }
  return response.data.data.user;
};

/**
 * Log out the current user and clear the HTTP-only session cookie.
 */
export const logout = async (): Promise<void> => {
  await apiClient.post<ApiResponse>('/auth/logout');
};
