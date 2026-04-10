"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AUTH_QUERY_KEY, useAuth } from "@/hooks/useAuth";
import { logout } from "@/services/authService";
import { publishAuthEvent } from "@/services/authBroadcast";
import {
  changePasswordCSR,
  forgotPasswordCSR,
  loginCSR,
  logoutAllCSR,
  resetCommerceRequestCache,
  resetCurrentUserRequestCache,
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

export const USER_QUERY_KEY = AUTH_QUERY_KEY;

interface UseUserOptions {
  initialData?: User | null;
}

export function useUser(options: UseUserOptions = {}) {
  return useAuth(options);
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginCSR(payload),
    onSuccess: async (data) => {
      resetCurrentUserRequestCache();
      resetCommerceRequestCache();
      queryClient.setQueryData(USER_QUERY_KEY, data.user);
      publishAuthEvent("login");
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerCSR(payload),
    onSuccess: async (data) => {
      resetCurrentUserRequestCache();
      resetCommerceRequestCache();
      queryClient.setQueryData(USER_QUERY_KEY, data.user);
      publishAuthEvent("register");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      resetCurrentUserRequestCache();
      resetCommerceRequestCache();
      publishAuthEvent("logout");
      await queryClient.cancelQueries();
      queryClient.clear();
    },
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutAllCSR,
    onSuccess: async () => {
      resetCurrentUserRequestCache();
      resetCommerceRequestCache();
      publishAuthEvent("logout-all");
      await queryClient.cancelQueries();
      queryClient.clear();
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
      resetCurrentUserRequestCache();
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
