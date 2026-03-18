import { create } from "zustand";

import { authService } from "@/services/apiClient";
import type { LoginPayload, User } from "@/types/auth";
import { getAccessToken } from "@/utils/token";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  login: (payload: LoginPayload) => Promise<void>;
  fetchMe: () => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  initializeAuth: () => Promise<void>;
}

let initInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: getAccessToken(),
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });

    try {
      const loginData = await authService.login(payload);
      set({
        user: loginData.user,
        accessToken: loginData.accessToken,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
      throw error;
    }
  },

  fetchMe: async () => {
    set({ isLoading: true, error: null });

    try {
      const user = await authService.me();
      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch current user",
      });
      throw error;
    }
  },

  refreshSession: async () => {
    try {
      const accessToken = await authService.refresh();
      set({ accessToken, error: null });
    } catch (error) {
      set({
        accessToken: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Unexpected auth error",
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: null,
      });
    }
  },

  clearAuthError: () => set({ error: null }),

  initializeAuth: async () => {
    if (initInFlight) {
      return initInFlight;
    }

    const token = get().accessToken;

    if (!token) {
      set({ isInitialized: true, isAuthenticated: false, user: null });
      return;
    }

    initInFlight = (async () => {
      try {
        await get().fetchMe();
      } catch {
        // Handled in fetchMe.
      } finally {
        initInFlight = null;
      }
    })();

    return initInFlight;
  },
}));
