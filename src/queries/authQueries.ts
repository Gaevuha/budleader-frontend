"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ApiFetchError } from "@/services/api";
import { publishAuthEvent } from "@/services/authBroadcast";
import {
  changePasswordCSR,
  forgotPasswordCSR,
  getCurrentUserCSR,
  loginCSR,
  logoutAllCSR,
  logoutCSR,
  registerCSR,
  resetPasswordCSR,
  updateProfileCSR,
} from "@/services/apiClient";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateProfilePayload,
  User,
} from "@/types/auth";

export const USER_QUERY_KEY = ["me"] as const;

interface UseUserOptions {
  initialData?: User | null;
}

export function useUser(options: UseUserOptions = {}) {
  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: () => getCurrentUserCSR(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    initialData: options.initialData,
    placeholderData: options.initialData,
    retry: (failureCount, error) => {
      if (error instanceof ApiFetchError && error.status === 401) {
        return false;
      }

      return failureCount < 1;
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginCSR(payload),
    onSuccess: async () => {
      publishAuthEvent("login");
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerCSR(payload),
    onSuccess: async () => {
      publishAuthEvent("register");
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutCSR,
    onSuccess: async () => {
      publishAuthEvent("logout");
      queryClient.setQueryData(USER_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAllCSR,
    onSuccess: async () => {
      publishAuthEvent("logout-all");
      queryClient.setQueryData(USER_QUERY_KEY, null);
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => forgotPasswordCSR(payload),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfileCSR(payload),
    onSuccess: async (user) => {
      queryClient.setQueryData(USER_QUERY_KEY, user);
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordPayload) => changePasswordCSR(payload),
  });
}

export function useResetPassword(token: string) {
  return useMutation({
    mutationFn: (payload: ResetPasswordPayload) =>
      resetPasswordCSR(token, payload),
  });
}
