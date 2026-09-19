import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCurrentUser,
  login as loginService,
  register as registerService,
  logout as logoutService,
} from '../services/auth.service';
import { User, LoginFormData, RegisterFormData } from '../types/auth.types';

export const AUTH_QUERY_KEY = ['auth', 'me'];

export const useAuth = () => {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<User | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch (err: unknown) {
        // If 401 or no active session, user is simply unauthenticated
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnWindowFocus: true,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginFormData) => loginService(credentials),
    onSuccess: (newUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, newUser);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: Omit<RegisterFormData, 'confirmPassword'>) =>
      registerService(data),
    onSuccess: (newUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, newUser);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutService,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      queryClient.clear();
    },
  });

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    isError,
    error,
    refetchUser: refetch,

    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,

    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    registerError: registerMutation.error,

    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
  };
};
